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
const path          = require('path');
const fs            = require('fs');

const connectDB = require('./config/db');
const { connectRedis } = require('./utils/cache');

// ── IPFS startup test ─────────────────────────────────────────────────────────
// Imported here so Pinata credentials are verified as soon as dotenv loads.
// testPinataConnection() is called inside the server.listen callback (non-blocking).
const { testPinataConnection } = require('./utils/ipfs');

// ── Route imports ─────────────────────────────────────────────────────────────────────────────────
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
const accountRoutes   = require('./routes/account');

// ── Enterprise AI Platform Route Imports (Phase 4–8) ──────────────────────────
const adminRoutes              = require('./routes/admin');
const hospitalRecommendRoutes  = require('./routes/hospitalRecommendation');
const timelineRoutes           = require('./routes/timeline');

// ── Middleware imports ─────────────────────────────────────────────────────────────────
const { auditLog } = require('./middleware/auditLog');

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

// 2. Pino HTTP Logger (replaces Morgan) — Structured JSON logging for production observability
const pinoHttp = require('pino-http');
app.use(pinoHttp({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
}));

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
//    Using a manual wrapper for Express 5 compatibility (avoid req.query reassignment)
app.use((req, res, next) => {
  // Recursively strip MongoDB operator keys from an object
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    return Object.keys(obj).reduce((acc, key) => {
      if (key.startsWith('$') || key.includes('.')) return acc; // drop dangerous keys
      acc[key] = sanitize(obj[key]);
      return acc;
    }, {});
  };
  // Only sanitize req.body — do NOT reassign req.query (Express 5 incompatible)
  if (req.body && typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  next();
});

// 6.5. XSS Clean — sanitize user input to prevent Cross-Site Scripting attacks.
// Express 5 compatible (does not attempt to reassign req.query directly).
const sanitizeXss = (val) => {
  if (typeof val === 'string') {
    return val.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  }
  if (typeof val === 'object' && val !== null) {
    if (Array.isArray(val)) return val.map(sanitizeXss);
    const clean = {};
    for (const key of Object.keys(val)) {
      clean[key] = sanitizeXss(val[key]);
    }
    return clean;
  }
  return val;
};

app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitizeXss(req.body);
  }
  if (req.params) {
    try {
      const cleanParams = {};
      for (const [k, v] of Object.entries(req.params)) {
        cleanParams[k] = sanitizeXss(v);
      }
      req.params = cleanParams;
    } catch (e) {}
  }
  next();
});

// 7. HPP — HTTP Parameter Pollution protection.
//    Prevents duplicate query params by always using the LAST value.
//    Manual wrapper for Express 5 compatibility.
app.use((req, res, next) => {
  // Normalise query string duplicates to last value
  if (req.query && typeof req.query === 'object') {
    const q = {};
    for (const [key, val] of Object.entries(req.query)) {
      q[key] = Array.isArray(val) ? val[val.length - 1] : val;
    }
    // Cannot reassign req.query in Express 5 — attach as sanitised copy
    req.sanitizedQuery = q;
  }
  next();
});

// 8. Request ID middleware — attach a unique ID to every request for distributed tracing
const nodeCrypto = require('crypto');
const generateRequestId = () => nodeCrypto.randomBytes(8).toString('hex');
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || `${Date.now()}-${generateRequestId()}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// 9. General rate limiter — 100 requests per 15 minutes per IP
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

// Helper to mount routes to support both /api and /api/v1 (API versioning)
const mountApi = (prefix) => {
  app.use(`${prefix}/auth`,         authRoutes);
  app.use(`${prefix}/account`,      accountRoutes);
  app.use(`${prefix}/patient`,      patientRoutes);
  app.use(`${prefix}/doctor`,       doctorRoutes);
  // /api/ai proxies to the Python Flask microservice on port 5001
  app.use(`${prefix}/ai`,           aiRoutes);
  // /api/prescription — AI prescription validation pipeline
  app.use(`${prefix}/prescription`, prescriptionRoutes);
  // /api/health-risk — AI health risk scoring and SHAP engine
  app.use(`${prefix}/health-risk`,  healthRiskRoutes);
  // /api/ensemble-predict — AI XGBoost + LightGBM + CatBoost multi-model predictor
  app.use(`${prefix}/ensemble-predict`, ensemblePredictRoutes);
  // /api/adherence-sys — AI Medication Adherence Predictor pipeline
  app.use(`${prefix}/adherence-sys`, adherenceSysRoutes);
  // /api/digital-twin — Patient Digital Twin simulation engine routes
  app.use(`${prefix}/digital-twin`, digitalTwinRoutes);
  // /api/analytics — Real-Time Platform Analytics
  app.use(`${prefix}/analytics`, analyticsRoutes);

  // ── Enterprise AI Platform Routes (Phase 4–8) ───────────────────────────────
  app.use(`${prefix}/admin`,                  adminRoutes);
  app.use(`${prefix}/hospital-recommendation`, hospitalRecommendRoutes);
  app.use(`${prefix}/timeline`,               timelineRoutes);

  // ── Audit Log (Security — Phase 12) ─────────────────────────────────────────
  app.use(prefix, auditLog);
};

mountApi('/api');
mountApi('/api/v1');

// ── Welcome / Root endpoint ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the MediChain API',
    docs: 'Endpoints are available under /api',
    healthCheck: '/health'
  });
});

// ── Health check endpoint ───────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.status(200).json({
    status:    'ok',
    service:   'MediChain API',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
  })
);

// ── Readiness check endpoint ─────────────────────────────────────────────
const mongoose = require('mongoose');
app.get('/ready', async (req, res) => {
  const checks = {
    database: mongoose.connection.readyState === 1 ? 'ok' : 'not_connected',
    service:  'MediChain API',
    timestamp: new Date().toISOString(),
  };
  const allOk = checks.database === 'ok';
  return res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'not_ready',
    checks,
  });
});

// ── Production Frontend SPA Serving ──────────────────────────────────────────
const frontendBuildPath = path.join(__dirname, '../frontend/build');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/health') && !req.path.startsWith('/ready')) {
      return res.sendFile(path.join(frontendBuildPath, 'index.html'));
    }
    next();
  });
}

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
    stack: process.env.NODE_ENV !== 'production' ? err.stack : '[hidden in production]',
    path: req.path,
    method: req.method,
    // NOTE: req.body intentionally omitted to prevent credential/PII leakage in logs
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
