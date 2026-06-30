// backend/models/PrescriptionReport.js
// MediChain — Mongoose schema for AI Prescription Validation Reports.
// Each document stores the full result of one prescription validation run,
// including all 10 check results, the safety score, PDF CID, and blockchain proof.

const mongoose = require('mongoose');

const PrescriptionReportSchema = new mongoose.Schema({

  // ── Ownership ────────────────────────────────────────────────────────────────
  patientId: {
    type:  mongoose.Schema.Types.ObjectId,
    ref:   'User',
    index: true,
  },
  patientWalletAddress: {
    type: String,
    trim: true,
    validate: {
      validator: (v) => !v || /^0x[a-fA-F0-9]{40}$/.test(v),
      message: 'Invalid Ethereum address',
    },
  },
  doctorId: {
    type:  mongoose.Schema.Types.ObjectId,
    ref:   'User',
    index: true,
  },
  doctorWalletAddress: {
    type: String,
    trim: true,
  },

  // ── Source File ──────────────────────────────────────────────────────────────
  sourceFileName: { type: String, trim: true },
  sourceFileMime: { type: String, trim: true },
  sourceFileSize: { type: Number },

  // ── OCR Extraction Results ───────────────────────────────────────────────────
  ocrResult: {
    available:     { type: Boolean, default: false },
    medications:   { type: [String], default: [] },
    dosages:       { type: [String], default: [] },
    frequencies:   { type: [String], default: [] },
    confidence:    { type: Number, min: 0, max: 1 },
    doctorName:    { type: String, trim: true },
    prescriptionDate: { type: String, trim: true },
    structuredMedications: { type: [mongoose.Schema.Types.Mixed], default: [] },
    rawText:       { type: String },
  },

  // ── Detected Diseases / Indications ─────────────────────────────────────────
  detectedDiseases: { type: [mongoose.Schema.Types.Mixed], default: [] },

  // ── Duplicate Medicines ──────────────────────────────────────────────────────
  duplicateMedicines: { type: [mongoose.Schema.Types.Mixed], default: [] },

  // ── Overdose Alerts ──────────────────────────────────────────────────────────
  overdoseAlerts: { type: [mongoose.Schema.Types.Mixed], default: [] },

  // ── Drug Interaction Analysis ────────────────────────────────────────────────
  interactions: {
    conflicts:            { type: [mongoose.Schema.Types.Mixed], default: [] },
    severityCounts:       { type: mongoose.Schema.Types.Mixed, default: {} },
    overallScore:         { type: Number },
    combinationAnalysis:  { type: [mongoose.Schema.Types.Mixed], default: [] },
    safeToPrescribe:      { type: Boolean, default: true },
    patientContraindications: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },

  // ── Safety Checks ────────────────────────────────────────────────────────────
  allergyCheck:     { type: [mongoose.Schema.Types.Mixed], default: [] },
  pregnancySafety:  { type: [mongoose.Schema.Types.Mixed], default: [] },
  kidneySafety:     { type: [mongoose.Schema.Types.Mixed], default: [] },
  liverSafety:      { type: [mongoose.Schema.Types.Mixed], default: [] },

  // ── Safety Score ─────────────────────────────────────────────────────────────
  safetyScore:    { type: Number, min: 0, max: 100 },
  severity:       { type: String, enum: ['SAFE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'UNKNOWN'] },
  severityColor:  { type: String },
  clinicalExplanation: { type: String },
  recommendations: { type: [String], default: [] },
  scoreBreakdown:  { type: mongoose.Schema.Types.Mixed, default: null },

  // ── Summary Counts ───────────────────────────────────────────────────────────
  summary: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Patient Profile Used ─────────────────────────────────────────────────────
  patientProfile: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── PDF Report ───────────────────────────────────────────────────────────────
  pdfReportCID: { type: String, trim: true },
  pdfReportURL: { type: String, trim: true },

  // ── Integrity / Blockchain ───────────────────────────────────────────────────
  // SHA-256 hash of the full validation JSON — anchored on blockchain
  reportHash: { type: String, trim: true, index: true },

  // Ethereum TX hash after anchoring on-chain
  blockchainTxHash:     { type: String, trim: true },
  blockchainBlockNumber:{ type: Number },

  // ── Status ───────────────────────────────────────────────────────────────────
  isActive: { type: Boolean, default: true, index: true },

  // ── Timestamps ───────────────────────────────────────────────────────────────
  validatedAt: { type: Date, default: Date.now },
  createdAt:   { type: Date, default: Date.now },
});

// ── Indexes ────────────────────────────────────────────────────────────────────
PrescriptionReportSchema.index({ patientId: 1, createdAt: -1 });
PrescriptionReportSchema.index({ doctorId: 1, createdAt: -1 });
PrescriptionReportSchema.index({ safetyScore: 1 });
PrescriptionReportSchema.index({ severity: 1, createdAt: -1 });

// ── Virtuals ───────────────────────────────────────────────────────────────────
PrescriptionReportSchema.virtual('isBlockchainAnchored').get(function () {
  return Boolean(this.blockchainTxHash);
});

PrescriptionReportSchema.virtual('hasPdfReport').get(function () {
  return Boolean(this.pdfReportCID);
});

PrescriptionReportSchema.set('toJSON',   { virtuals: true });
PrescriptionReportSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PrescriptionReport', PrescriptionReportSchema);
