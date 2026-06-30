// backend/routes/ensemblePredict.js
// MediChain — Multi-Model Ensemble Predictor Routes
// Handles routing for XGBoost + LightGBM + CatBoost predictions.

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const EnsembleReport = require('../models/EnsembleReport');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// Protect all routes
router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ensemble-predict/assess
// Runs Multi-Model predictions via Flask, saves to MongoDB, returns result.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/assess', async (req, res) => {
  try {
    const {
      patientId,
      age,
      gender,
      smoking,
      alcohol_use,
      family_history_cancer,
      bmi,
      physical_inactivity,
      chronic_inflammation,
      kidney_gfr,
      liver_score,
      chronicConditions
    } = req.body;

    // 1. Resolve patient ID and details
    let targetPatientId = patientId;
    if (req.user.role === 'patient') {
      targetPatientId = req.user._id;
    }

    if (!targetPatientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const patientUser = await User.findById(targetPatientId);
    if (!patientUser) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // 2. Prepare payload for Flask
    const payload = {
      age: age || (patientUser.dateOfBirth ? (new Date().getFullYear() - new Date(patientUser.dateOfBirth).getFullYear()) : 45),
      gender: gender || 'M',
      smoking: !!smoking,
      alcohol_use: !!alcohol_use,
      family_history_cancer: !!family_history_cancer,
      bmi: Number(bmi) || 24.5,
      physical_inactivity: !!physical_inactivity,
      chronic_inflammation: !!chronic_inflammation,
      kidney_gfr: Number(kidney_gfr) || 90,
      liver_score: Number(liver_score) || 0,
      chronicConditions: chronicConditions || patientUser.chronicConditions || []
    };

    // 3. Query Flask AI ensemble predictor
    console.log(`[EnsemblePredict] Scoring patient ${targetPatientId} on XGBoost+LGBM+CatBoost`);
    
    let aiRes;
    try {
      aiRes = await axios.post(`${AI_SERVICE_URL}/cdss/ensemble/predict`, payload, { timeout: 15000 });
    } catch (err) {
      console.error(`[EnsemblePredict] Flask ensemble predict endpoint error:`, err.message);
      return res.status(502).json({ error: 'AI Ensemble Predictor Service is offline or returned an error.' });
    }

    const predictionData = aiRes.data;

    // 4. Save to MongoDB
    const report = await EnsembleReport.create({
      patientId: targetPatientId,
      patientWalletAddress: patientUser.walletAddress || null,
      doctorId: req.user.role !== 'patient' ? req.user._id : null,
      doctorWalletAddress: req.user.walletAddress || null,
      patientProfile: predictionData.patient_context || payload,
      topFive: predictionData.top_five || [],
      healthScore: predictionData.health_score || 100,
      allDiseases: predictionData.all_diseases || []
    });

    console.log(`[EnsemblePredict] Ensemble report saved successfully: ${report._id}`);

    return res.status(201).json({
      success: true,
      report
    });

  } catch (err) {
    console.error('[EnsemblePredict] Assessment failed:', err);
    return res.status(500).json({ error: 'Ensemble assessment failed', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ensemble-predict/history
// Returns paginated past reports.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const patientId = req.query.patientId || (req.user.role === 'patient' ? req.user._id : null);
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const reports = await EnsembleReport.find({ patientId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await EnsembleReport.countDocuments({ patientId });

    return res.status(200).json({
      reports,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });

  } catch (err) {
    console.error('[EnsemblePredict] History fetch failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve history logs' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ensemble-predict/trends
// Returns health score trends over time for trend line charts.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/trends', async (req, res) => {
  try {
    const patientId = req.query.patientId || (req.user.role === 'patient' ? req.user._id : null);
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const assessments = await EnsembleReport.find({ patientId })
      .select('healthScore createdAt')
      .sort({ createdAt: 1 });

    const trends = assessments.map(a => ({
      date: a.createdAt,
      healthScore: a.healthScore
    }));

    return res.status(200).json({ trends });

  } catch (err) {
    console.error('[EnsemblePredict] Trends fetch failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve trends' });
  }
});

module.exports = router;
