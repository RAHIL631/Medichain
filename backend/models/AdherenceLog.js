// backend/models/AdherenceLog.js
// MongoDB schema for tracking medication pickup/refill events per patient.
// This data feeds the AI adherence prediction model.

const mongoose = require('mongoose');

const AdherenceLogSchema = new mongoose.Schema({

  // ── Ownership ──────────────────────────────────────────────────────────────

  patientId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: [true, 'Patient ID is required'],
    index:    true,
  },

  // Associated medical record (prescription) if applicable
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'MedicalRecord',
    index: true,
  },

  // ── Event Details ──────────────────────────────────────────────────────────

  // Type of adherence event
  eventType: {
    type:     String,
    required: true,
    enum: {
      values:  ['refill_collected', 'refill_missed', 'dose_taken', 'dose_missed', 'prescription_started', 'prescription_discontinued'],
      message: '{VALUE} is not a valid event type',
    },
  },

  // Drug name involved
  medication: {
    type:  String,
    trim:  true,
  },

  // ── Refill Tracking ────────────────────────────────────────────────────────

  // Date the refill was due
  refillDueDate: {
    type: Date,
  },

  // Actual date refill was collected
  refillCollectedDate: {
    type: Date,
  },

  // Days late (positive = late, negative = early, 0 = on-time)
  refillDelayDays: {
    type:    Number,
    default: 0,
  },

  // ── Dose Tracking ──────────────────────────────────────────────────────────

  // Number of doses missed in this reporting period
  missedDoses: {
    type:    Number,
    default: 0,
    min:     0,
  },

  // Total doses in the reporting period
  totalDoses: {
    type:    Number,
    default: 30,
    min:     1,
  },

  // Adherence rate for this period (0–1)
  adherenceRate: {
    type:    Number,
    min:     0,
    max:     1,
  },

  // ── Context ────────────────────────────────────────────────────────────────

  // Notes from pharmacist/doctor/patient
  notes: {
    type:      String,
    maxlength: 300,
    trim:      true,
  },

  // Source of this record
  source: {
    type:    String,
    enum:    ['patient_reported', 'pharmacy_system', 'doctor_recorded', 'auto_detected'],
    default: 'doctor_recorded',
  },

  // ── Timestamps ─────────────────────────────────────────────────────────────
  reportingPeriodStart: { type: Date },
  reportingPeriodEnd:   { type: Date },
  createdAt: { type: Date, default: Date.now },

}, { versionKey: false });

// ── Indexes ───────────────────────────────────────────────────────────────────
AdherenceLogSchema.index({ patientId: 1, createdAt: -1 });
AdherenceLogSchema.index({ patientId: 1, medication: 1, createdAt: -1 });

// ── Virtual: adherencePercent ─────────────────────────────────────────────────
AdherenceLogSchema.virtual('adherencePercent').get(function () {
  if (!this.totalDoses) return 0;
  const rate = (this.totalDoses - (this.missedDoses || 0)) / this.totalDoses;
  return Math.round(rate * 100);
});

AdherenceLogSchema.set('toJSON', { virtuals: true });

// ── Pre-save: compute adherenceRate automatically ─────────────────────────────
AdherenceLogSchema.pre('save', function () {
  if (this.totalDoses > 0) {
    this.adherenceRate = Math.max(0, (this.totalDoses - (this.missedDoses || 0)) / this.totalDoses);
  }
  if (this.refillDueDate && this.refillCollectedDate) {
    const due = new Date(this.refillDueDate);
    const collected = new Date(this.refillCollectedDate);
    this.refillDelayDays = Math.round((collected - due) / (1000 * 60 * 60 * 24));
  }
});

module.exports = mongoose.model('AdherenceLog', AdherenceLogSchema);
