// backend/routes/healthRisk.js
// MediChain — Health Risk Scorer API Router
// Proxies to Flask CDSS endpoints, saves reports in MongoDB, and serves history/trends.

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const HealthRiskReport = require('../models/HealthRiskReport');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// Protect all routes
router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/health-risk/assess
// Runs AI risk and explainability pipelines, saves report, returns result.
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

    // 2. Prepare payload for AI Flask service
    const payload = {
      age: age || (patientUser.dateOfBirth ? (new Date().getFullYear() - new Date(patientUser.dateOfBirth).getFullYear()) : 45),
      gender: gender || 'M',
      smoking: !!smoking,
      alcohol_use: !!alcohol_use,
      family_history_cancer: !!family_history_cancer,
      bmi: Number(bmi) || 25,
      physical_inactivity: !!physical_inactivity,
      chronic_inflammation: !!chronic_inflammation,
      kidney_gfr: Number(kidney_gfr) || 90,
      liver_score: Number(liver_score) || 0,
      chronicConditions: chronicConditions || patientUser.chronicConditions || []
    };

    // 3. Request predictions & explanations from Flask CDSS
    console.log(`[HealthRisk] Requesting AI scoring for patient ${targetPatientId}`);
    
    let riskRes, explainRes;
    try {
      riskRes = await axios.post(`${AI_SERVICE_URL}/cdss/risks`, payload, { timeout: 15000 });
    } catch (err) {
      console.error(`[HealthRisk] Flask risks endpoint error:`, err.message);
      return res.status(502).json({ error: 'AI Risk Service is offline or returned an error.' });
    }

    try {
      explainRes = await axios.post(`${AI_SERVICE_URL}/cdss/explain`, payload, { timeout: 15000 });
    } catch (err) {
      console.warn(`[HealthRisk] Flask explainer endpoint error:`, err.message);
      explainRes = { data: { explanations: {} } };
    }

    const risks = riskRes.data;
    const explanations = explainRes.data.explanations || {};

    // 4. Save assessment to MongoDB
    const report = await HealthRiskReport.create({
      patientId: targetPatientId,
      patientWalletAddress: patientUser.walletAddress || null,
      doctorId: req.user.role !== 'patient' ? req.user._id : null,
      doctorWalletAddress: req.user.walletAddress || null,
      patientProfile: payload,
      organRisks: risks.organ_risks || {},
      overallRisk: risks.overall_risk || 'UNKNOWN',
      overallRiskScore: risks.overall_risk_score || 0,
      overallHealthScore: risks.overall_health_score || 100,
      predictionsRanked: risks.predictions_ranked || [],
      urgentFlags: risks.urgent_flags || [],
      monitoringSchedule: risks.monitoring_schedule || {},
      lifestyleRecommendations: risks.lifestyle_recommendations || [],
      explanations: explanations
    });

    console.log(`[HealthRisk] Assessment saved successfully: ${report._id}`);

    return res.status(201).json({
      success: true,
      report
    });

  } catch (err) {
    console.error('[HealthRisk] Assessment failed:', err);
    return res.status(500).json({ error: 'Assessment failed', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health-risk/history
// Returns paginated list of health risk assessments for a specific patient.
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

    const reports = await HealthRiskReport.find({ patientId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await HealthRiskReport.countDocuments({ patientId });

    return res.status(200).json({
      reports,
      page,
      totalPages: Math.ceil(total / limit),
      total
    });

  } catch (err) {
    console.error('[HealthRisk] History fetch failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve assessment history' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/health-risk/trends
// Returns health scores over time to render historical trend graphs.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/trends', async (req, res) => {
  try {
    const patientId = req.query.patientId || (req.user.role === 'patient' ? req.user._id : null);
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Get trend logs ordered ascending by date (for rendering graphs left-to-right)
    const assessments = await HealthRiskReport.find({ patientId })
      .select('overallHealthScore overallRiskScore createdAt')
      .sort({ createdAt: 1 });

    const trends = assessments.map(a => ({
      date: a.createdAt,
      healthScore: a.overallHealthScore,
      riskScore: a.overallRiskScore
    }));

    return res.status(200).json({ trends });

  } catch (err) {
    console.error('[HealthRisk] Trends fetch failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve health trends' });
  }
});

module.exports = router;
