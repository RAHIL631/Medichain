// backend/routes/digitalTwin.js
// MediChain — Patient Digital Twin Routes
// Manages patient twin baseline profiles and simulation requests.

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const DigitalTwinProfile = require('../models/DigitalTwinProfile');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

// Protect all routes
router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/digital-twin/profile
// Fetches the digital twin profile. Creates one with default parameters if missing.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const patientId = req.query.patientId || (req.user.role === 'patient' ? req.user._id : null);
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    let profile = await DigitalTwinProfile.findOne({ patientId });
    
    if (!profile) {
      // Find patient details to populate defaults
      const patientUser = await User.findById(patientId);
      if (!patientUser) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const ageVal = patientUser.dateOfBirth ? (new Date().getFullYear() - new Date(patientUser.dateOfBirth).getFullYear()) : 45;

      profile = await DigitalTwinProfile.create({
        patientId,
        patientWalletAddress: patientUser.walletAddress || null,
        baselineMetrics: {
          age: ageVal,
          gender: 'M',
          bloodPressure: 120,
          diastolic_bp: 80,
          cholesterol: 200,
          glucose: 100,
          bmi: 24.5,
          kidney_gfr: 90,
          creatinine: 1.0,
          liver_score: 0,
          chronic_diseases: patientUser.chronicConditions?.length || 1,
          smoking: false,
          alcohol_use: false,
          family_history_cancer: false,
          physical_inactivity: false,
          chronic_inflammation: false
        }
      });
      console.log(`[DigitalTwin] Created default profile for patient: ${patientId}`);
    }

    return res.status(200).json({ success: true, profile });

  } catch (err) {
    console.error('[DigitalTwin] Profile fetch failed:', err);
    return res.status(500).json({ error: 'Failed to retrieve digital twin profile' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/digital-twin/profile
// Updates the baseline metrics of the patient's digital twin.
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  try {
    const patientId = req.body.patientId || (req.user.role === 'patient' ? req.user._id : null);
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const { metrics } = req.body;
    if (!metrics) {
      return res.status(400).json({ error: 'Metrics are required to update profile' });
    }

    let profile = await DigitalTwinProfile.findOne({ patientId });
    if (!profile) {
      return res.status(404).json({ error: 'Digital twin profile not found' });
    }

    // Merge baseline metrics
    profile.baselineMetrics = {
      ...profile.baselineMetrics,
      ...metrics
    };

    await profile.save();
    console.log(`[DigitalTwin] Profile updated successfully for patient: ${patientId}`);

    return res.status(200).json({ success: true, profile });

  } catch (err) {
    console.error('[DigitalTwin] Profile update failed:', err);
    return res.status(500).json({ error: 'Failed to update digital twin profile' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/digital-twin/simulate
// Runs simulations on the patient digital twin.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/simulate', async (req, res) => {
  try {
    const { patientId, drug, dosage_mg } = req.body;
    
    let targetPatientId = patientId || (req.user.role === 'patient' ? req.user._id : null);
    if (!targetPatientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const profile = await DigitalTwinProfile.findOne({ patientId: targetPatientId });
    if (!profile) {
      return res.status(404).json({ error: 'Digital twin profile not found. Load profile first.' });
    }

    // Prepare payload
    const payload = {
      baseline: profile.baselineMetrics,
      drug: drug || "",
      dosage_mg: Number(dosage_mg) || 0.0
    };

    console.log(`[DigitalTwin] Querying Flask simulation engine for drug=${drug}, dosage=${dosage_mg}mg`);
    
    let aiRes;
    try {
      aiRes = await axios.post(`${AI_SERVICE_URL}/cdss/digital-twin/simulate`, payload, { timeout: 15000 });
    } catch (err) {
      console.error(`[DigitalTwin] Flask simulate endpoint error:`, err.message);
      return res.status(502).json({ error: 'AI Simulation Service is offline or returned an error.' });
    }

    const simulationResult = aiRes.data;

    // Increment simulation counter
    profile.simulationsCount += 1;
    await profile.save();

    return res.status(200).json({
      success: true,
      simulation: simulationResult
    });

  } catch (err) {
    console.error('[DigitalTwin] Simulation process failed:', err);
    return res.status(500).json({ error: 'Simulation execution failed', details: err.message });
  }
});

module.exports = router;
