// medichain/backend/server.js
// MediChain Express API — entry point.
// dotenv MUST be the first line so all subsequent requires can read process.env.
require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp           = require('hpp');
const morgan        = require('morgan');

const connectDB = require('./config/db');
const { connectRedis } = require('./utils/cache');

// ── IPFS startup test ─────────────────────────────────────────────────────────
// Imported here so Pinata credentials are verified as soon as dotenv loads.
// testPinataConnection() is called inside the server.listen callback (non-blocking).
const { testPinataConnection } = require('./utils/ipfs');

// ── Route imports ─────────────────────────────────────────────────────────────
const authRoutes    = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const doctorRoutes  = require('./routes/doctor');
const aiRoutes      = require('./routes/ai');
const prescriptionRoutes = require('./routes/prescriptionValidator');
const healthRiskRoutes = require('./routes/healthRisk');
const ensemblePredictRoutes = require('./routes/ensemblePredict');
const adherenceSysRoutes = require('./routes/adherenceSys');
const digitalTwinRoutes = require('./routes/digitalTwin');
const analyticsRoutes = require('./routes/analytics');

// ── Connect to MongoDB & Redis ──────────────────────────────────────────────────
connectDB();
connectRedis();

const app = express();

// ══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE ORDER — order is critical for security
// ══════════════════════════════════════════════════════════════════════════════

// 1. Helmet — sets 14 security-related HTTP response headers in one call
//    e.g. X-Content-Type-Options, X-Frame-Options, HSTS, CSP, etc.
app.use(helmet());

// 2. Morgan — HTTP request logger (only log in development to avoid noise in prod)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// 3. CORS — allow requests from the configured frontend origin, or all in dev
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:3000',
  'http://localhost:3005',
  'http://localhost:3006'
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 4. Body parser — JSON with 10kb size limit to prevent large payload attacks
app.use(express.json({ limit: '10kb' }));

// 5. URL-encoded body parser (for form submissions)
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 6. Mongo sanitize — strips any keys starting with $ or containing . from
//    req.body, req.query, and req.params to prevent NoSQL injection attacks.
// Temporarily disabled: mongoSanitize() reassigns req.query which throws an error in Express 5
// app.use(mongoSanitize());

// 7. HPP — HTTP Parameter Pollution protection.
//    Prevents attackers from sending duplicate query params (e.g. ?role=patient&role=doctor)
//    by selecting the last value and removing duplicates.
// Temporarily disabled: hpp() reassigns req.query which throws an error in Express 5
// app.use(hpp());

// 8. General rate limiter — 100 requests per 15 minutes per IP
//    Applied to all /api/* routes globally.
const generalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              100,             // max requests per window per IP
  standardHeaders:  true,           // return RateLimit-* headers
  legacyHeaders:    false,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
});
app.use('/api', generalLimiter);

// 9. Auth-specific rate limiter — 10 requests per 15 minutes (stricter)
//     Prevents brute-force login and registration attempts.
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              process.env.NODE_ENV === 'production' ? 10 : 100, // relaxed for dev
  standardHeaders:  true,
  legacyHeaders:    false,
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes',
  },
});
app.use('/api/auth', authLimiter);

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

app.use('/api/auth',         authRoutes);
app.use('/api/patient',      patientRoutes);
app.use('/api/doctor',       doctorRoutes);
// /api/ai proxies to the Python Flask microservice on port 5001
app.use('/api/ai',           aiRoutes);
// /api/prescription — AI prescription validation pipeline
app.use('/api/prescription', prescriptionRoutes);
// /api/health-risk — AI health risk scoring and SHAP engine
app.use('/api/health-risk',  healthRiskRoutes);
// /api/ensemble-predict — AI XGBoost + LightGBM + CatBoost multi-model disease predictor
app.use('/api/ensemble-predict', ensemblePredictRoutes);
// /api/adherence-sys — AI Medication Adherence Predictor pipeline
app.use('/api/adherence-sys', adherenceSysRoutes);
// /api/digital-twin — Patient Digital Twin simulation engine routes
app.use('/api/digital-twin', digitalTwinRoutes);
// /api/analytics — Real-Time Platform Analytics
app.use('/api/analytics', analyticsRoutes);

// ── Health check endpoint ─────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.status(200).json({
    status:    'ok',
    service:   'MediChain API',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
  })
);

// ── 404 handler — catches any unmatched route ─────────────────────────────────
app.use((req, res) =>
  res.status(404).json({
    error: `Route ${req.method} ${req.originalUrl} not found`,
  })
);

// ══════════════════════════════════════════════════════════════════════════════
// GLOBAL ERROR HANDLER
// Must have exactly 4 parameters (err, req, res, next) to be recognised by Express.
// ══════════════════════════════════════════════════════════════════════════════
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('[SERVER ERROR]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  // Mongoose validation error (e.g. required field missing, enum mismatch)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: messages.join('. ') });
  }

  // MongoDB duplicate key error (e.g. duplicate email or walletAddress)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error: `Duplicate value: ${field} already exists`,
    });
  }

  // JWT errors — invalid signature, malformed token
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }

  // JWT token expired
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token invalid or expired' });
  }

  // Multer file size exceeded (thrown when file > limit set in multer config)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large — maximum size is 10 MB',
    });
  }

  // Multer unexpected field error
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field in form' });
  }

  // Default 500 — show message in dev, hide it in production
  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Unknown server error',
  });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`🚀  MediChain API running on http://localhost:${PORT}`);
    console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);

    // ── Pinata / IPFS startup health check ──────────────────────────────────
    // Run asynchronously — never blocks server startup or request handling.
    // Logs a clear ✅ or ❌ so developers know immediately if IPFS is broken.
    testPinataConnection()
      .then(({ authenticated, message }) => {
        if (authenticated) {
          console.log('📦  [IPFS] Pinata: ✅ Ready — uploads will succeed');
        } else {
          console.warn('📦  [IPFS] Pinata: ⚠️  NOT authenticated —', message);
          console.warn('         Set PINATA_JWT in backend/.env to enable IPFS uploads.');
          console.warn('         Get your JWT at: https://app.pinata.cloud/keys');
        }
      })
      .catch((err) => {
        // testPinataConnection() is designed to never throw — this is a safety net
        console.error('📦  [IPFS] Pinata check threw unexpectedly:', err.message);
      });
  });

  // Graceful shutdown — close DB connection on SIGTERM (Docker / PM2 stop)
  process.on('SIGTERM', () => {
    console.log('⚠️  SIGTERM received — shutting down gracefully');
    if (server) {
      server.close(() => {
        console.log('✅  HTTP server closed');
        process.exit(0);
      });
    }
  });
}

module.exports = app; // exported for supertest / Jest integration tests
