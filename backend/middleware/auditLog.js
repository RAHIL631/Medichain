// medichain/backend/middleware/auditLog.js
// Audit trail middleware — logs every API call to AuditLog collection.
// OWASP A09:2021 - Security Logging and Monitoring Failures mitigation.
//
// Usage (applied globally in server.js after auth middleware):
//   app.use('/api', auditLog);
//
// Or per-route:
//   router.post('/sensitive', protect, auditAction('UPLOAD_RECORD', 'MedicalRecord'), handler);

const AuditLog = require('../models/AuditLog');

const logger = (...args) => console.log('[AUDIT]', ...args);

// ── Global Middleware: log every /api/* request ────────────────────────────────
/**
 * Records every HTTP request touching /api/* to the AuditLog collection.
 * Runs AFTER the route handler (uses res.on('finish')) so statusCode is available.
 * Non-blocking — failures do NOT interrupt request handling.
 */
const auditLog = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', async () => {
    try {
      const responseTimeMs = Date.now() - startTime;

      // Determine action label from method + path pattern
      const action = inferAction(req.method, req.path);

      await AuditLog.create({
        userId:          req.user?._id    || null,
        userRole:        req.user?.role   || 'anonymous',
        userEmail:       req.user?.email  || null,
        method:          req.method,
        path:            req.path,
        ipAddress:       req.ip || req.connection?.remoteAddress,
        userAgent:       (req.headers['user-agent'] || '').substring(0, 500),
        statusCode:      res.statusCode,
        responseTimeMs,
        action,
        success:         res.statusCode < 400,
        errorMessage:    res.statusCode >= 400 ? res.locals.errorMessage : null,
      });
    } catch (err) {
      // Audit failures must NEVER break the application — log only
      logger('Failed to write audit log:', err.message);
    }
  });

  next();
};

// ── Per-Route Decorator: enriched audit entry ─────────────────────────────────
/**
 * Creates a route-specific middleware that adds action/resourceType/resourceId
 * to the request context. Use AFTER protect middleware.
 *
 * Usage:
 *   router.post('/upload', protect, auditAction('UPLOAD_RECORD', 'MedicalRecord'), handler)
 */
const auditAction = (action, resourceType = null) => {
  return (req, res, next) => {
    req.auditAction       = action;
    req.auditResourceType = resourceType;
    req.auditResourceId   = req.params?.id || req.body?.recordId || null;
    next();
  };
};

// ── Helpers ────────────────────────────────────────────────────────────────────
/**
 * Infer a human-readable action label from HTTP method and path.
 * Used as a fallback when auditAction() decorator is not applied.
 */
function inferAction(method, path) {
  const p = path.toLowerCase();

  if (p.includes('/auth/login'))          return 'LOGIN';
  if (p.includes('/auth/register'))       return 'REGISTER';
  if (p.includes('/auth/logout'))         return 'LOGOUT';
  if (p.includes('/predict'))             return 'AI_PREDICT';
  if (p.includes('/check-drugs'))         return 'DRUG_CHECK';
  if (p.includes('/cdss'))               return 'CDSS_ANALYSIS';
  if (p.includes('/prescription'))        return 'PRESCRIPTION_OP';
  if (p.includes('/records') && method === 'POST')  return 'UPLOAD_RECORD';
  if (p.includes('/records') && method === 'GET')   return 'VIEW_RECORDS';
  if (p.includes('/access'))              return 'ACCESS_MANAGEMENT';
  if (p.includes('/qr'))                 return 'QR_ACCESS';
  if (p.includes('/hospital'))            return 'HOSPITAL_OP';
  if (p.includes('/analytics'))           return 'ANALYTICS_VIEW';

  // Generic fallback
  const methodMap = { GET: 'READ', POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };
  return methodMap[method] || method;
}

/**
 * Admin-only route to fetch audit logs for a specific user.
 * Attach to /api/admin/audit-logs route.
 */
const getAuditLogs = async (req, res) => {
  try {
    const { userId, path, from, to, limit = 100, page = 1 } = req.query;

    const filter = {};
    if (userId)      filter.userId      = userId;
    if (path)        filter.path        = { $regex: path, $options: 'i' };
    if (from || to)  filter.createdAt   = {};
    if (from)        filter.createdAt.$gte = new Date(from);
    if (to)          filter.createdAt.$lte = new Date(to);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('userId', 'name email role'),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page:       Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs', details: err.message });
  }
};

module.exports = { auditLog, auditAction, getAuditLogs };
