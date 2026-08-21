// medichain/backend/models/AuditLog.js
// Audit trail — immutable log of every protected API call.
// Inserted by auditLog.js middleware; never updated or deleted.

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // ── Actor ──────────────────────────────────────────────────────────────────
  userId: {
    type:  mongoose.Schema.Types.ObjectId,
    ref:   'User',
    index: true,
  },
  userRole: {
    type: String,
    enum: ['patient', 'doctor', 'hospital', 'admin', 'anonymous'],
  },
  userEmail: {
    type: String,
    trim: true,
  },

  // ── Request ────────────────────────────────────────────────────────────────
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    required: true,
  },
  path: {
    type:     String,
    required: true,
    trim:     true,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  userAgent: {
    type:    String,
    trim:    true,
    maxlength: 500,
  },

  // ── Response ───────────────────────────────────────────────────────────────
  statusCode: {
    type: Number,
  },
  responseTimeMs: {
    type: Number,
    min:  0,
  },

  // ── Context ────────────────────────────────────────────────────────────────
  action: {
    type: String, // e.g. 'LOGIN', 'UPLOAD_RECORD', 'GRANT_ACCESS', 'PREDICT'
    trim: true,
  },
  resourceType: {
    type: String, // e.g. 'MedicalRecord', 'User', 'Prescription'
    trim: true,
  },
  resourceId: {
    type: String,
    trim: true,
  },
  success: {
    type:    Boolean,
    default: true,
  },
  errorMessage: {
    type:    String,
    trim:    true,
    default: null,
  },

  // ── Timestamps ─────────────────────────────────────────────────────────────
  createdAt: {
    type:    Date,
    default: Date.now,
  },
});

// TTL index — auto-delete audit logs older than 365 days (configurable)
AuditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: parseInt(process.env.AUDIT_LOG_TTL_DAYS || '365') * 86400 }
);

// Compound indexes for common query patterns
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ path: 1, method: 1, createdAt: -1 });
AuditLogSchema.index({ success: 1, createdAt: -1 });

// Prevent updates — audit logs are immutable
AuditLogSchema.pre('save', function (next) {
  if (!this.isNew) {
    return next(new Error('AuditLog records are immutable'));
  }
  next();
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
