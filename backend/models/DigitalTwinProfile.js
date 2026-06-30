// backend/models/DigitalTwinProfile.js
// MediChain — Patient Digital Twin Profile Schema
// Stores virtual baseline physiological metrics for simulation.

const mongoose = require('mongoose');

const DigitalTwinProfileSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true,
    unique: true
  },
  patientWalletAddress: {
    type: String,
    trim: true,
    index: true
  },
  baselineMetrics: {
    age: { type: Number, default: 45 },
    gender: { type: String, default: 'M', enum: ['M', 'F'] },
    bloodPressure: { type: Number, default: 120 }, // Systolic
    diastolic_bp: { type: Number, default: 80 },  // Diastolic
    cholesterol: { type: Number, default: 200 },
    glucose: { type: Number, default: 100 },
    bmi: { type: Number, default: 24.5 },
    kidney_gfr: { type: Number, default: 90 },
    creatinine: { type: Number, default: 1.0 },
    liver_score: { type: Number, default: 0 },
    chronic_diseases: { type: Number, default: 1 },
    smoking: { type: Boolean, default: false },
    alcohol_use: { type: Boolean, default: false },
    family_history_cancer: { type: Boolean, default: false },
    physical_inactivity: { type: Boolean, default: false },
    chronic_inflammation: { type: Boolean, default: false }
  },
  simulationsCount: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update hook
DigitalTwinProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('DigitalTwinProfile', DigitalTwinProfileSchema);
