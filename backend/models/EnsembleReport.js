// backend/models/EnsembleReport.js
// MediChain — Ensemble Disease Prediction Report Schema
// Stores the historical predictions from the XGBoost, LightGBM, CatBoost ensemble.

const mongoose = require('mongoose');

const EnsembleReportSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  topFive: {
    type: [mongoose.Schema.Types.Mixed],
    required: true
  },
  healthScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  allDiseases: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('EnsembleReport', EnsembleReportSchema);
