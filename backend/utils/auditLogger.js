// backend/utils/auditLogger.js
// MediChain — Audit Logging Utility
// Records security-relevant events to console and can be extended to MongoDB.

const AuditEvents = {
  LOGIN_SUCCESS:     'AUTH_LOGIN_SUCCESS',
  LOGIN_FAILURE:     'AUTH_LOGIN_FAILURE',
  LOGOUT:            'AUTH_LOGOUT',
  REGISTER:          'AUTH_REGISTER',
  WALLET_LINKED:     'AUTH_WALLET_LINKED',
  RECORD_CREATED:    'RECORD_CREATED',
  RECORD_ACCESSED:   'RECORD_ACCESSED',
  RECORD_DEACTIVATED:'RECORD_DEACTIVATED',
  ACCESS_GRANTED:    'ACCESS_GRANTED',
  ACCESS_REVOKED:    'ACCESS_REVOKED',
  UNAUTHORIZED:      'SECURITY_UNAUTHORIZED',
  RATE_LIMITED:      'SECURITY_RATE_LIMITED',
  VALIDATION_FAILED: 'SECURITY_VALIDATION_FAILED',
};

/**
 * Creates a structured audit log entry.
 * @param {string}  event   - One of AuditEvents constants
 * @param {object}  req     - Express request object (for IP, user-agent, userId)
 * @param {object}  details - Additional contextual data (never include passwords)
 */
const auditLog = (event, req, details = {}) => {
  const entry = {
    event,
    timestamp:  new Date().toISOString(),
    ip:         req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent:  req?.headers?.['user-agent']?.substring(0, 200) || 'unknown',
    userId:     req?.user?._id?.toString() || null,
    userRole:   req?.user?.role || null,
    method:     req?.method || null,
    path:       req?.path || null,
    ...details,
  };

  // Strip any sensitive fields that might accidentally be passed in
  delete entry.password;
  delete entry.token;
  delete entry.secret;

  // In production, replace console.log with a proper logger (e.g. Winston, Pino)
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[AUDIT] ${event}`, JSON.stringify(entry));
  }

  // TODO: Persist to MongoDB AuditLog collection for compliance
  // AuditLog.create(entry).catch(err => console.error('[AUDIT] Failed to persist:', err));

  return entry;
};

module.exports = { auditLog, AuditEvents };
