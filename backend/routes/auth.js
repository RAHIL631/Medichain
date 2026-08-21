// medichain/backend/routes/auth.js
// Public authentication routes: register, login, logout, refresh, verify-email, forgot-password, reset-password, wallet.
// All routes are mounted at /api/auth in server.js.

const express  = require('express');
const router   = express.Router();
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');

const User     = require('../models/User');
const { protect }   = require('../middleware/auth');
const { auditLog, AuditEvents } = require('../utils/auditLogger');
const {
  registerValidation,
  loginValidation,
  walletValidation,
  handleValidationErrors,
} = require('../middleware/validate');
const { sendVerificationEmail, sendPasswordResetEmail, sendSecurityAlert } = require('../services/emailService');
const { blockToken, isTokenBlocked } = require('../services/tokenBlocklist');

// ── Token generators ──────────────────────────────────────────────────────────

/** Signs a short-lived access JWT (24h). */
const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

/** Signs a long-lived refresh JWT (30d). */
const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh',
    { expiresIn: '30d' }
  );

// Backward-compatible alias
const generateToken = generateAccessToken;

// ── Safe user shape for API responses ────────────────────────────────────────
const safeUser = (user) => ({
  _id:                    user._id,
  name:                   user.name,
  email:                  user.email,
  role:                   user.role,
  isEmailVerified:        user.isEmailVerified || false,
  isActive:               user.isActive !== false,
  walletAddress:          user.walletAddress   || null,
  isWalletLinked:         user.isWalletLinked  || false,
  isBlockchainRegistered: user.isBlockchainRegistered || false,
  // Patient fields
  bloodGroup:             user.bloodGroup      || null,
  dateOfBirth:            user.dateOfBirth     || null,
  allergies:              user.allergies       || [],
  chronicConditions:      user.chronicConditions || [],
  // Doctor fields
  specialization:         user.specialization  || null,
  hospitalName:           user.hospitalName    || null,
  licenseNumber:          user.licenseNumber   || null,
  yearsExperience:        user.yearsExperience || null,
  createdAt:              user.createdAt,
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
/**
 * Creates a new user account and sends email verification.
 */
router.post('/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const {
      name, email, password, role,
      bloodGroup, allergies, chronicConditions, dateOfBirth, phone,
      specialization, hospitalName, licenseNumber, yearsExperience,
    } = req.body;

    // 1. Check for duplicate email
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // 2. Build user document
    const userData = { name, email, password, role };

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

    // 3. Generate email verification token (raw → hashed for storage)
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    userData.emailVerifyToken   = hashedToken;
    userData.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    userData.isEmailVerified    = false;

    // 4. Persist user
    const user         = await User.create(userData);
    const token        = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // 5. Send verification email (non-blocking — don't fail registration on email error)
    sendVerificationEmail(user.email, user.name, rawToken).catch((err) => {
      console.error('[AUTH] Failed to send verification email:', err.message);
    });

    auditLog(AuditEvents.REGISTER, req, { email: userData.email, role: userData.role });

    return res.status(201).json({
      token,
      refreshToken,
      user: safeUser(user),
      message: 'Account created. Please check your email to verify your address.',
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
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Server error during registration'
        : `Registration failed: ${err.message}`,
    });
  }
});

// ── GET /api/auth/verify-email ────────────────────────────────────────────────
/**
 * Verifies a user's email address using the token from the email link.
 * Query: ?token=<raw_token>
 */
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token is required' });

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerifyToken:   hashedToken,
      emailVerifyExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        error: 'Verification token is invalid or has expired. Please request a new verification email.',
      });
    }

    // Mark as verified and clear token fields
    user.isEmailVerified    = true;
    user.emailVerifyToken   = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    auditLog(AuditEvents.EMAIL_VERIFIED || 'EMAIL_VERIFIED', req, { userId: user._id.toString() });

    return res.status(200).json({
      message: 'Email verified successfully. You can now log in.',
      isEmailVerified: true,
    });

  } catch (err) {
    console.error('[AUTH] Email verify error:', err.message);
    return res.status(500).json({ error: 'Server error during email verification' });
  }
});

// ── POST /api/auth/resend-verification ───────────────────────────────────────
/**
 * Resends the email verification link.
 * Body: { email }
 */
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always respond with 200 to prevent email enumeration
    if (!user || user.isEmailVerified) {
      return res.status(200).json({ message: 'If that email exists and is unverified, a new link has been sent.' });
    }

    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.emailVerifyToken   = hashedToken;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    sendVerificationEmail(user.email, user.name, rawToken).catch(console.error);

    return res.status(200).json({ message: 'If that email exists and is unverified, a new link has been sent.' });

  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
/**
 * Authenticates a user with email + password.
 * Enforces account lockout after MAX_LOGIN_ATTEMPTS failed attempts.
 */
router.post('/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // 1. Fetch user with password + lockout fields
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select('+password +loginAttempts +lockUntil');

    // Generic error prevents user enumeration
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 2. Check account lockout
    if (user.isLocked) {
      const waitMins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        error: `Account temporarily locked due to too many failed login attempts. Please try again in ${waitMins} minute(s).`,
        lockedUntil: user.lockUntil,
      });
    }

    // 3. Check if account is suspended
    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account suspended. Please contact support.' });
    }

    // 4. Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Increment failure counter (may lock account)
      await user.incrementLoginAttempts();
      auditLog(AuditEvents.LOGIN_FAILED || 'LOGIN_FAILED', req, { email });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 5. Successful login — reset lockout counter
    await user.resetLoginAttempts();

    // 6. Issue tokens
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
router.get('/me', protect, (req, res) => {
  return res.status(200).json({ user: safeUser(req.user) });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
/**
 * Server-side token revocation via blocklist + client-side cleanup.
 * Body: { refreshToken? } — optional, also blocks the refresh token
 */
router.post('/logout', protect, async (req, res) => {
  try {
    // Extract the raw access token from the Authorization header
    const authHeader = req.headers['authorization'] || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Remaining lifetime of access token (24h - elapsed)
    const ACCESS_TOKEN_TTL = 24 * 60 * 60; // 86400 seconds
    const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30d seconds

    const blockPromises = [];

    if (accessToken) {
      blockPromises.push(blockToken(accessToken, ACCESS_TOKEN_TTL));
    }
    if (req.body?.refreshToken) {
      blockPromises.push(blockToken(req.body.refreshToken, REFRESH_TOKEN_TTL));
    }

    await Promise.allSettled(blockPromises);

    auditLog(AuditEvents.LOGOUT, req);
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    return res.status(200).json({ message: 'Logged out' }); // always succeed
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
/**
 * Issues a new access token given a valid (non-blocklisted) refresh token.
 * Body: { refreshToken }
 */
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  try {
    // Check blocklist
    const blocked = await isTokenBlocked(refreshToken);
    if (blocked) return res.status(401).json({ error: 'Token has been revoked' });

    const secret  = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    const decoded = jwt.verify(refreshToken, secret);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user || user.isActive === false) return res.status(401).json({ error: 'User not found' });

    const newToken = generateAccessToken(user);
    return res.status(200).json({ token: newToken });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
/**
 * Initiates password reset — sends a reset link to the user's email.
 * Body: { email }
 * Always returns 200 to prevent email enumeration.
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always 200 — do not reveal whether email exists
    if (!user) {
      return res.status(200).json({ message: 'If an account exists with that email, a reset link has been sent.' });
    }

    // Generate reset token
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetToken   = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    sendPasswordResetEmail(user.email, user.name, rawToken).catch((err) => {
      console.error('[AUTH] Failed to send reset email:', err.message);
    });

    return res.status(200).json({ message: 'If an account exists with that email, a reset link has been sent.' });

  } catch (err) {
    console.error('[AUTH] Forgot password error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
/**
 * Resets a user's password using the token from the reset email.
 * Body: { token, newPassword }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and newPassword are required' });
    }

    // Password strength check
    const strongPwd = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(newPassword);
    if (!strongPwd) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and contain an uppercase letter, number, and special character',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        error: 'Password reset token is invalid or has expired. Please request a new one.',
      });
    }

    // Set new password (pre-save hook will hash it)
    user.password             = newPassword;
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    // Reset lockout on password change
    user.loginAttempts        = 0;
    user.lockUntil            = undefined;
    await user.save();

    // Notify user of password change
    sendSecurityAlert(user.email, user.name, 'Your MediChain password was successfully changed.').catch(console.error);

    auditLog('PASSWORD_RESET', req, { userId: user._id.toString() });

    return res.status(200).json({ message: 'Password reset successfully. You can now log in with your new password.' });

  } catch (err) {
    console.error('[AUTH] Reset password error:', err.message);
    return res.status(500).json({ error: 'Server error during password reset' });
  }
});

// ── PATCH /api/auth/blockchain-registered ─────────────────────────────────────
router.patch('/blockchain-registered', protect, async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { isBlockchainRegistered: true },
      { returnDocument: 'after' }
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
router.patch('/wallet', protect, walletValidation, handleValidationErrors, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { walletAddress, isWalletLinked: true },
      { returnDocument: 'after', runValidators: true }
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
