// medichain/backend/routes/auth.js
// Public authentication routes: register, login, me, logout, refresh, wallet.
// All routes are mounted at /api/auth in server.js.

const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');
const { auditLog, AuditEvents } = require('../utils/auditLogger');
const {
  registerValidation,
  loginValidation,
  walletValidation,
  handleValidationErrors,
} = require('../middleware/validate');

// ── Helper: generate a signed JWT ─────────────────────────────────────────────
/**
 * Signs a JWT containing the user's Mongo _id and role.
 * The role is embedded so that protect/authorize can act without a DB hit
 * on every single request (though protect still verifies the user exists).
 */
/**
 * Signs a short-lived access JWT (24h).
 */
const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

/**
 * Signs a long-lived refresh JWT (30d).
 * Stored client-side — used only to obtain new access tokens.
 */
const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '30d' }
  );

// Backward-compatible alias (existing code uses generateToken)
const generateToken = generateAccessToken;

// ── Helper: safe user shape for API responses ─────────────────────────────────
// Strips password and internal fields; never sends sensitive data to the client.
const safeUser = (user) => ({
  _id:                    user._id,
  name:                   user.name,
  email:                  user.email,
  role:                   user.role,
  walletAddress:          user.walletAddress   || null,
  isWalletLinked:         user.isWalletLinked  || false,
  isBlockchainRegistered: user.isBlockchainRegistered || false,
  // Patient fields (only populated when role === 'patient')
  bloodGroup:             user.bloodGroup      || null,
  dateOfBirth:            user.dateOfBirth     || null,
  allergies:              user.allergies       || [],
  // Doctor fields
  specialization:         user.specialization  || null,
  hospitalName:           user.hospitalName    || null,
  licenseNumber:          user.licenseNumber   || null,
  yearsExperience:        user.yearsExperience || null,
  createdAt:              user.createdAt,
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
/**
 * Creates a new user account.
 * The password is hashed automatically by the pre-save hook in User.js.
 *
 * Body: { name, email, password, role, bloodGroup?, allergies?,
 *         dateOfBirth?, specialization?, hospitalName?, licenseNumber?,
 *         yearsExperience? }
 */
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      name, email, password, role,
      // Patient-specific
      bloodGroup, allergies, chronicConditions, dateOfBirth, phone,
      // Doctor / Hospital-specific
      specialization, hospitalName, licenseNumber, yearsExperience,
    } = req.body;

    // 1. Check for duplicate email — return 400 (not 409) per spec
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 2. Build user document — only include role-specific fields that are present
    const userData = {
      name,
      email,
      password,    // hashed by pre-save hook
      role,
    };

    if (role === 'patient') {
      if (bloodGroup)         userData.bloodGroup         = bloodGroup;
      if (allergies)          userData.allergies          = allergies;
      if (chronicConditions)  userData.chronicConditions  = chronicConditions;
      if (dateOfBirth)        userData.dateOfBirth        = dateOfBirth;
      if (phone)              userData.phone              = phone;
    }

    if (role === 'doctor' || role === 'hospital') {
      if (specialization)   userData.specialization  = specialization;
      if (hospitalName)     userData.hospitalName    = hospitalName;
      if (licenseNumber)    userData.licenseNumber   = licenseNumber;
      if (yearsExperience)  userData.yearsExperience = yearsExperience;
    }

    // 3. Persist — Mongoose runs validators + pre-save hooks here
    const user  = await User.create(userData);
    const token = generateToken(user);

    return res.status(201).json({
      token,
      user: safeUser(user),
    });

    auditLog(AuditEvents.REGISTER, req, { email: userData.email, role: userData.role });

    return res.status(201).json({
      token,
      refreshToken: generateRefreshToken(user),
      user: safeUser(user),
    });

  } catch (err) {
    console.error('[AUTH] Register error:', err.message);

    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join('. ') });
    }

    // Never expose stack traces — even in development via the API
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Server error during registration'
        : `Registration failed: ${err.message}`,
    });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
/**
 * Authenticates a user with email + password.
 * Returns a fresh JWT and a sanitised user profile.
 *
 * Body: { email, password }
 */
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // 1. Fetch user — must explicitly select password because select:false is set
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select('+password');

    // 2. Use generic "Invalid credentials" for both "not found" and "wrong password"
    //    to prevent user enumeration attacks.
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Compare candidate password against the stored bcrypt hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 4. Issue tokens and respond
    const token        = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    auditLog(AuditEvents.LOGIN_SUCCESS, req, { userId: user._id.toString(), role: user.role });

    return res.status(200).json({
      token,
      refreshToken,
      user: safeUser(user),
    });

  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
/**
 * Returns the full profile of the currently authenticated user.
 * The protect middleware already looked up the user from the DB and
 * attached it to req.user — no additional query needed here.
 *
 * Headers: Authorization: Bearer <token>
 */
router.get('/me', protect, (req, res) => {
  // req.user is the full Mongoose document (password excluded by protect)
  return res.status(200).json({ user: safeUser(req.user) });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
/**
 * Logout is handled client-side (delete the JWT from localStorage / state).
 * This endpoint exists so the frontend has a consistent API to call,
 * and so future server-side token revocation (e.g. a blocklist) can be
 * plugged in here without changing the frontend.
 *
 * Headers: Authorization: Bearer <token>  (optional)
 */
router.post('/logout', (req, res) => {
  auditLog(AuditEvents.LOGOUT, req);
  return res.status(200).json({ message: 'Logged out' });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
/**
 * Issues a new access token given a valid refresh token.
 * Body: { refreshToken }
 */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    const decoded = jwt.verify(refreshToken, secret);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });

    const newToken = generateAccessToken(user);
    return res.status(200).json({ token: newToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ── PATCH /api/auth/blockchain-registered ─────────────────────────────────────
/**
 * Marks the logged-in user as blockchain-registered.
 * Called after patient calls registerPatient() on the smart contract.
 */
router.patch('/blockchain-registered', protect, async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { isBlockchainRegistered: true },
      { new: true }
    );
    return res.status(200).json({
      message: 'Blockchain registration confirmed',
      isBlockchainRegistered: updated.isBlockchainRegistered,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Could not update blockchain status' });
  }
});

// ── PATCH /api/auth/wallet ────────────────────────────────────────────────────
/**
 * Links or updates a MetaMask wallet address to the logged-in user account.
 * Called after the patient signs a message in the frontend to prove ownership.
 *
 * Body: { walletAddress }
 */
router.patch('/wallet', protect, walletValidation, handleValidationErrors, async (req, res) => {
  try {
    const { walletAddress } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { walletAddress, isWalletLinked: true },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message:       'Wallet linked successfully',
      walletAddress: updated.walletAddress,
      isWalletLinked: updated.isWalletLinked,
    });

  } catch (err) {
    console.error('[AUTH] Wallet link error:', err.message);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Wallet address already linked to another account' });
    }
    return res.status(500).json({ error: 'Could not link wallet' });
  }
});

module.exports = router;
