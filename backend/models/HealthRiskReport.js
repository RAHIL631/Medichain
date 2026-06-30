// backend/models/HealthRiskReport.js
// MediChain — Health Risk Scoring Report Model
// Stores the historical health risk scores and clinical indicators for patients.

const mongoose = require('mongoose');

const HealthRiskReportSchema = new mongoose.Schema({
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
    gender: { type: String, default: 'M' },
    smoking: { type: Boolean, default: false },
    alcohol_use: { type: Boolean, default: false },
    family_history_cancer: { type: Boolean, default: false },
    bmi: { type: Number, default: 25 },
    physical_inactivity: { type: Boolean, default: false },
    chronic_inflammation: { type: Boolean, default: false },
    kidney_gfr: { type: Number, default: 90 },
    liver_score: { type: Number, default: 0 },
    chronicConditions: { type: [String], default: [] }
  },
  organRisks: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  overallRisk: {
    type: String,
    required: true,
    enum: ['VERY HIGH', 'HIGH', 'MODERATE', 'LOW', 'MINIMAL', 'UNKNOWN']
  },
  overallRiskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  overallHealthScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  predictionsRanked: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  urgentFlags: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  monitoringSchedule: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  lifestyleRecommendations: {
    type: [String],
    default: []
  },
  explanations: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('HealthRiskReport', HealthRiskReportSchema);
