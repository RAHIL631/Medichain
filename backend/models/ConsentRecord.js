// medichain/backend/models/ConsentRecord.js
// Patient consent management — tracks who has been granted access to what data.
// Consent records are created when a patient grants access to a doctor or hospital.
// Revocation creates a new record with status: 'revoked' (preserves audit trail).

const mongoose = require('mongoose');

const ConsentRecordSchema = new mongoose.Schema({
  // ── Parties ───────────────────────────────────────────────────────────────
  patientId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: [true, 'Patient ID is required'],
    index:    true,
  },
  granteeId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: [true, 'Grantee ID is required'],
    index:    true,
  },
  granteeRole: {
    type: String,
    enum: ['doctor', 'hospital', 'admin'],
    required: true,
  },

  // ── Consent Scope ─────────────────────────────────────────────────────────
  scope: {
    type:    [String],
    default: ['read_records'],
    // Possible values: 'read_records' | 'write_records' | 'ai_analysis' | 'emergency'
  },

  // ── Duration ──────────────────────────────────────────────────────────────
  status: {
    type:    String,
    enum:    ['active', 'revoked', 'expired'],
    default: 'active',
    index:   true,
  },
  expiresAt: {
    type:  Date,
  },

  // ── Blockchain Proof ──────────────────────────────────────────────────────
  // Transaction hash from the smart contract grantDoctorAccess / grantTimedAccess call
  blockchainTxHash: {
    type: String,
    trim: true,
  },

  // ── Revocation ────────────────────────────────────────────────────────────
  revokedAt: {
    type: Date,
  },
  revocationReason: {
    type: String,
    trim: true,
  },

  // ── Metadata ──────────────────────────────────────────────────────────────
  ipAddress: {
    type: String,
    trim: true,
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500,
  },

  // ── Timestamps ─────────────────────────────────────────────────────────────
  createdAt: {
    type:    Date,
    default: Date.now,
    index:   true,
  },
  updatedAt: {
    type:    Date,
    default: Date.now,
  },
});

// Compound indexes
ConsentRecordSchema.index({ patientId: 1, granteeId: 1, status: 1 });
ConsentRecordSchema.index({ patientId: 1, status: 1, createdAt: -1 });

// Auto-expire consents
ConsentRecordSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { status: 'active' } }
);

// Pre-save: update updatedAt
ConsentRecordSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

// Static: check if a grantee has active consent for a patient
ConsentRecordSchema.statics.hasActiveConsent = async function (patientId, granteeId) {
  const now = new Date();
  const record = await this.findOne({
    patientId,
    granteeId,
    status: 'active',
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
  });
  return Boolean(record);
};

module.exports = mongoose.model('ConsentRecord', ConsentRecordSchema);
