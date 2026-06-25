// File: medichain/backend/middleware/validate.js

const { check, validationResult } = require('express-validator');


const { check, validationResult } = require('express-validator');

// Registration validation
const registerValidation = [
  check('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters')
    .trim(),
  check('email')
    .isEmail().withMessage('Invalid email')
    .normalizeEmail(),
  check('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter'),
  check('role')
    .isIn(['patient', 'doctor', 'hospital']).withMessage('Invalid role')
];

// Login validation
const loginValidation = [
  check('email')
    .isEmail().withMessage('Invalid email'),
  check('password')
    .notEmpty().withMessage('Password is required')
];

// Wallet address validation
const walletValidation = [
  check('walletAddress')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('Invalid Ethereum wallet address')
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  walletValidation,
  handleValidationErrors
};
