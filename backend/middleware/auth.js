// medichain/backend/middleware/auth.js
// JWT Bearer token verification and role-based access control middleware.
// Includes server-side token blocklist check for true server-side logout.

const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { isTokenBlocked } = require('../services/tokenBlocklist');

// ── protect ───────────────────────────────────────────────────────────────────
/**
 * Extracts and verifies the JWT from the Authorization header.
 * Checks the token against the server-side blocklist (for logout).
 * Attaches the full Mongoose user document to req.user.
 *
 * Usage:  router.get('/profile', protect, handler)
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Ensure header exists and uses Bearer scheme
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify token signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Check token blocklist (server-side revocation for logout)
    const blocked = await isTokenBlocked(token);
    if (blocked) {
      return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
    }

    // 4. Confirm the user still exists and is active
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ error: 'Account suspended. Please contact support.' });
    }

    // 5. Attach user document and raw token
    req.user  = user;
    req.token = token;

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
};

// ── authorize ─────────────────────────────────────────────────────────────────
/**
 * Role-based access control guard. Must be used AFTER protect.
 *
 * Usage:  router.post('/upload', protect, authorize('doctor', 'hospital'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied: insufficient permissions',
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
