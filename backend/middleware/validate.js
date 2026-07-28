// File: medichain/backend/middleware/validate.js
// Input validation middleware using express-validator v7.
// All validators are composable arrays — use with handleValidationErrors.

const { check, body, validationResult } = require('express-validator');

// ── Registration validation ───────────────────────────────────────────────────
const registerValidation = [
  check('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
    .trim()
    .escape(),                          // XSS: escape HTML entities
  check('email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail()
    .toLowerCase(),
  check('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[!@#$%^&*]/).withMessage('Password must contain a special character (!@#$%^&*)'),
  check('role')
    .isIn(['patient', 'doctor', 'hospital']).withMessage('Role must be patient, doctor, or hospital'),
  // Optional fields — validate only when present
  body('phone').optional({ checkFalsy: true }).isMobilePhone().withMessage('Invalid phone number'),
  body('dateOfBirth').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid date of birth'),
  body('bloodGroup').optional({ checkFalsy: true })
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).withMessage('Invalid blood group'),
];

// ── Login validation ──────────────────────────────────────────────────────────
const loginValidation = [
  check('email')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  check('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ max: 128 }).withMessage('Password too long'),
];

// ── Wallet address validation ─────────────────────────────────────────────────
const walletValidation = [
  check('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum wallet address (must be 0x + 40 hex chars)'),
];

// ── Profile update validation ─────────────────────────────────────────────────
const profileUpdateValidation = [
  body('name').optional({ checkFalsy: true })
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters').trim().escape(),
  body('phone').optional({ checkFalsy: true }).isMobilePhone().withMessage('Invalid phone number'),
  body('specialization').optional({ checkFalsy: true })
    .isLength({ max: 100 }).withMessage('Specialization too long').trim().escape(),
  body('hospitalName').optional({ checkFalsy: true })
    .isLength({ max: 200 }).withMessage('Hospital name too long').trim().escape(),
];

// ── Handle validation errors middleware ───────────────────────────────────────
/**
 * Collects express-validator results and responds 400 if any errors exist.
 * Uses `err.path` (express-validator v7) with `err.param` fallback for v6.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path || err.param,   // v7 uses .path, v6 uses .param
        message: err.msg,
      })),
    });
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  walletValidation,
  profileUpdateValidation,
  handleValidationErrors,
};
