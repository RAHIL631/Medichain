// backend/models/AdherenceAssessment.js
// MediChain — Medication Adherence Assessment Report Model

const mongoose = require('mongoose');

const AdherenceAssessmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true
  },
  patientWalletAddress: {
    type: String,
    trim: true,
    index: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  doctorWalletAddress: {
    type: String,
    trim: true
  },
  patientProfile: {
    age: { type: Number, required: true },
    education: { type: String, required: true },
    historyScore: { type: Number, required: true },
    missedMedicines30d: { type: Number, required: true },
    chronicDiseases: { type: Number, required: true }
  },
  adherenceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  risk: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH']
  },
  reminderRecommendation: {
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    family_alert: { type: Boolean, default: false }
  },
  contributingFactors: {
    type: [String],
    default: []
  },
  shap_explanation: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('AdherenceAssessment', AdherenceAssessmentSchema);
