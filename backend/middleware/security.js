// File: medichain/backend/middleware/security.js


const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');

// 1. Helmet config (CSP, COEP off for IPFS)
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
});

// 2. General rate limiter
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: "Too many requests" },
  standardHeaders: true
});

// 3. Auth rate limiter (stricter)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many auth attempts — try again in 15 minutes" }
});

// 4. MongoDB injection sanitizer
const mongoSanitizeMiddleware = mongoSanitize();

// 5. XSS sanitizer
const xssMiddleware = xss();

// 6. HPP (parameter pollution) with whitelist
const hppMiddleware = hpp({ whitelist: ['recordType', 'role'] });

// 7. Request logger (dev vs prod)
const requestLogger = process.env.NODE_ENV === 'production'
  ? morgan('combined')
  : morgan('dev');

module.exports = {
  helmetConfig,
  generalRateLimit,
  authRateLimit,
  mongoSanitizeMiddleware,
  xssMiddleware,
  hppMiddleware,
  requestLogger
};
