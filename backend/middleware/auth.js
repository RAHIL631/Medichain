// medichain/backend/middleware/auth.js
// JWT Bearer token verification and role-based access control middleware.
// Used as route guards across all protected API endpoints.

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── protect ───────────────────────────────────────────────────────────────────
/**
 * Extracts and verifies the JWT from the Authorization header.
 * On success, attaches the full Mongoose user document to req.user
 * and the raw token string to req.token.
 *
 * Usage:  router.get('/profile', protect, handler)
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Ensure header exists and uses Bearer scheme
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // Extract the token portion

  try {
    // 2. Verify token signature and expiry against the server secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id: <userId>, role: <role>, iat: <issued>, exp: <expiry> }

    // 3. Confirm the user still exists in the database.
    //    This catches cases where an account is deleted after a token is issued.
    //    Password is explicitly excluded (-password) even if select:false is bypassed.
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    // 4. Attach the user document and raw token for use in downstream handlers
    req.user  = user;
    req.token = token;

    next();
  } catch (err) {
    // jwt.verify throws JsonWebTokenError or TokenExpiredError
    return res.status(401).json({ error: 'Token invalid or expired' });
  }
};

// ── authorize ─────────────────────────────────────────────────────────────────
/**
 * Role-based access control guard. Must be used AFTER protect.
 * Pass one or more allowed role strings as arguments.
 *
 * Usage:  router.post('/upload', protect, authorize('doctor', 'hospital'), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // req.user is guaranteed to exist here (set by protect above)
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied: insufficient permissions',
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
