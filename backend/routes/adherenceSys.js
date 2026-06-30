// backend/routes/adherenceSys.js
// MediChain — Medication Adherence Scoring Router
// Connects React frontend inputs to the Flask AI service, handles MongoDB persistence.

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const AdherenceAssessment = require('../models/AdherenceAssessment');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// Protect all routes
router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/adherence-sys/assess
// Runs AI adherence predictions via Flask, saves to MongoDB, returns result.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/assess', async (req, res) => {
  try {
    const {
      patientId,
      age,
      education,
      history,
      missed_medicines,
      chronic_diseases
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
      education: education || 'Secondary',
      history: Number(history) || 85,
      missed_medicines: Number(missed_medicines) || 2,
      chronic_diseases: Number(chronic_diseases) || 1
    };

    // 3. Request predictions from Flask AI adherence service
    console.log(`[AdherenceSys] Requesting AI scoring for patient ${targetPatientId}`);
    
    let aiRes;
    try {
      aiRes = await axios.post(`${AI_SERVICE_URL}/cdss/adherence-sys/predict`, payload, { timeout: 15000 });
    } catch (err) {
      console.error(`[AdherenceSys] Flask predict endpoint error:`, err.message);
      return res.status(502).json({ error: 'AI Adherence service is offline or returned an error.' });
    }

    const scores = aiRes.data;

    // 4. Save to MongoDB
    const report = await AdherenceAssessment.create({
      patientId: targetPatientId,
      patientWalletAddress: patientUser.walletAddress || null,
      doctorId: req.user.role !== 'patient' ? req.user._id : null,
      doctorWalletAddress: req.user.walletAddress || null,
      patientProfile: scores.patient_context || payload,
      adherenceScore: scores.adherence_score || 100,
      risk: scores.risk || 'LOW',
      reminderRecommendation: scores.reminder_recommendation || { sms: false, whatsapp: false, family_alert: false },
      contributingFactors: scores.contributing_factors || [],
      shap_explanation: scores.shap_explanation || {}
    });

    console.log(`[AdherenceSys] Adherence report saved successfully: ${report._id}`);

    return res.status(201).json({
      success: true,
      report
    });

  } catch (err) {
    console.error('[AdherenceSys] Assessment failed:', err);
    return res.status(500).json({ error: 'Adherence assessment failed', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/adherence-sys/history
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

    const reports = await AdherenceAssessment.find({ patientId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await AdherenceAssessment.countDocuments({ patientId });

    return res.status(200).json({
      reports,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });

  } catch (err) {
    console.error('[AdherenceSys] History fetch failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve assessment history' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/adherence-sys/trends
// Returns health scores over time to render historical trend graphs.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/trends', async (req, res) => {
  try {
    const patientId = req.query.patientId || (req.user.role === 'patient' ? req.user._id : null);
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const assessments = await AdherenceAssessment.find({ patientId })
      .select('adherenceScore createdAt')
      .sort({ createdAt: 1 });

    const trends = assessments.map(a => ({
      date: a.createdAt,
      healthScore: a.adherenceScore
    }));

    return res.status(200).json({ trends });

  } catch (err) {
    console.error('[AdherenceSys] Trends fetch failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve trends' });
  }
});

module.exports = router;
