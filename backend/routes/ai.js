// backend/routes/ai.js
// Proxy routes to the Python Flask AI microservice.
// Routes enrich requests with MongoDB data before forwarding to the AI engine.
//
// EXISTING (backward-compatible):
//   POST /api/ai/predict       — disease risk prediction
//   POST /api/ai/check-drugs   — drug interaction check
//   GET  /api/ai/health        — health check
//
// NEW CDSS Routes:
//   POST /api/ai/cdss/analyze          — full prescription analysis pipeline
//   POST /api/ai/cdss/interactions     — multi-drug interaction matrix
//   POST /api/ai/cdss/dosage           — dosage safety check
//   POST /api/ai/cdss/score            — prescription safety score (0-100)
//   POST /api/ai/cdss/risks            — 5-organ patient health risks
//   POST /api/ai/cdss/predict-diseases — XGBoost ranked disease probabilities
//   POST /api/ai/cdss/adherence        — medication adherence prediction
//   POST /api/ai/cdss/ocr-extract      — OCR prescription extraction
//   POST /api/ai/cdss/explain          — SHAP explainability

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth');
const MedicalRecord = require('../models/MedicalRecord');
const AdherenceLog = require('../models/AdherenceLog');
const User = require('../models/User');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const AI_TIMEOUT_DEFAULT = 15000;
const AI_TIMEOUT_LONG = 30000; // OCR + SHAP can take longer

// Simple logging helper
const log = (msg) => console.log(`[AI-PROXY] ${new Date().toISOString()}: ${msg}`);

// ─────────────────────────────────────────────────────────────────────────────
// EXISTING ROUTES (PRESERVED — backward compatible)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/ai/predict
 * @desc    Forward prediction request to AI service with enriched patient data
 * @access  Private
 */
router.post('/predict', protect, async (req, res) => {
    try {
        const patientData = { ...req.body };

        if (req.user.dateOfBirth) {
            const birthYear = new Date(req.user.dateOfBirth).getFullYear();
            patientData.age = new Date().getFullYear() - birthYear;
        }

        log(`Prediction request for user: ${req.user._id}`);

        const response = await axios.post(`${AI_URL}/predict`, patientData, {
            timeout: AI_TIMEOUT_DEFAULT,
            headers: { 'Content-Type': 'application/json' }
        });

        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/check-drugs
 * @desc    Check drug interactions enriched with patient's existing medications from DB
 * @access  Private
 */
router.post('/check-drugs', protect, async (req, res) => {
    try {
        const { newDrug, currentMedications: providedMeds = [] } = req.body;

        if (!newDrug) {
            return res.status(400).json({ error: 'newDrug name is required' });
        }

        const records = await MedicalRecord.find({
            patientId: req.user._id,
            isActive: true
        });

        const dbMeds = records.reduce((acc, record) => {
            if (record.medications && Array.isArray(record.medications)) {
                return acc.concat(record.medications);
            }
            return acc;
        }, []);

        const allCurrentMeds = [...new Set([...dbMeds, ...providedMeds])];

        const response = await axios.post(`${AI_URL}/check-drugs`, {
            newDrug,
            currentMedications: allCurrentMeds
        }, { timeout: AI_TIMEOUT_DEFAULT });

        res.json({ ...response.data, checkedAgainstCount: allCurrentMeds.length });
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   GET /api/ai/health
 * @access  Public
 */
router.get('/health', async (req, res) => {
    try {
        const response = await axios.get(`${AI_URL}/health`, { timeout: 5000 });
        res.json({ nodeProxy: 'ok', aiService: response.data });
    } catch (err) {
        res.status(503).json({ nodeProxy: 'ok', aiService: 'offline', error: 'AI service unreachable' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW CDSS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/ai/cdss/analyze
 * @desc    Full prescription safety pipeline — called automatically on prescription upload.
 *          Enriches the request with patient profile from MongoDB, calls Flask /cdss/analyze,
 *          and optionally saves the analysis result back to the MedicalRecord document.
 * @access  Private
 */
router.post('/cdss/analyze', protect, async (req, res) => {
    try {
        const {
            medications = [],
            dosages = [],
            patient: clientPatient = {},
            recordId,
            file_base64,
            mime_type
        } = req.body;

        // ── Enrich patient data from MongoDB ───────────────────────────────
        let patientProfile = { ...clientPatient };

        // Get patient user record for age, allergies, conditions
        const userDoc = await User.findById(req.user._id)
            .select('dateOfBirth allergies chronicConditions role');

        if (userDoc) {
            if (userDoc.dateOfBirth && !patientProfile.age) {
                patientProfile.age = new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear();
            }
            if (userDoc.allergies?.length > 0 && !patientProfile.allergies?.length) {
                patientProfile.allergies = userDoc.allergies;
            }
            if (userDoc.chronicConditions?.length > 0 && !patientProfile.chronicConditions?.length) {
                patientProfile.chronicConditions = userDoc.chronicConditions;
            }
        }

        // ── Forward to Flask CDSS analyze ─────────────────────────────────
        const payload = {
            medications,
            dosages,
            patient: patientProfile,
            ...(file_base64 && { file_base64 }),
            ...(mime_type && { mime_type }),
        };

        log(`CDSS analyze: ${medications.length} meds for user ${req.user._id}`);

        const aiResponse = await axios.post(`${AI_URL}/cdss/analyze`, payload, {
            timeout: AI_TIMEOUT_LONG
        });

        const analysis = aiResponse.data;

        // ── Optionally persist analysis to MedicalRecord ───────────────────
        if (recordId && analysis.safety_score !== undefined) {
            try {
                await MedicalRecord.findByIdAndUpdate(recordId, {
                    'aiAnalysis.safetyScore':              analysis.safety_score,
                    'aiAnalysis.severity':                 analysis.severity,
                    'aiAnalysis.interactions':             analysis.interaction_analysis?.conflicts || [],
                    'aiAnalysis.dosageWarnings':           analysis.dosage_analysis || [],
                    'aiAnalysis.clinicalExplanation':      analysis.clinical_explanation,
                    'aiAnalysis.recommendations':          analysis.recommendations || [],
                    'aiAnalysis.ocrExtracted':             analysis.ocr_extracted || false,
                    'aiAnalysis.extractedMedications':     analysis.ocr?.medications || [],
                    'aiAnalysis.shapValues':               analysis.shap_explanation || null,
                    'aiAnalysis.scoreBreakdown':           analysis.score_breakdown || null,
                    'aiAnalysis.combinationAnalysis':      analysis.combination_analysis || [],
                    'aiAnalysis.alternativeMedicines':     analysis.alternative_medicines || [],
                    'aiAnalysis.emergencyRecommendations': analysis.emergency_recommendations || [],
                    'aiAnalysis.analyzedAt':               new Date(),
                }, { new: false });
                log(`CDSS analysis saved to record ${recordId}`);
            } catch (saveErr) {
                console.warn('[AI-PROXY] Failed to save CDSS analysis to record:', saveErr.message);
            }
        }

        return res.json(analysis);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/interactions
 * @desc    Multi-drug interaction matrix for N medications
 * @access  Private
 */
router.post('/cdss/interactions', protect, async (req, res) => {
    try {
        const response = await axios.post(`${AI_URL}/cdss/interactions`, req.body, {
            timeout: AI_TIMEOUT_DEFAULT
        });
        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/dosage
 * @desc    Per-drug dosage safety checks with patient-specific adjustments
 * @access  Private
 */
router.post('/cdss/dosage', protect, async (req, res) => {
    try {
        // Enrich patient data from DB
        const body = { ...req.body };
        if (!body.patient) body.patient = {};

        const userDoc = await User.findById(req.user._id)
            .select('dateOfBirth allergies chronicConditions');

        if (userDoc) {
            if (userDoc.dateOfBirth && !body.patient.age) {
                body.patient.age = new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear();
            }
            if (userDoc.allergies && !body.patient.allergies?.length) {
                body.patient.allergies = userDoc.allergies;
            }
        }

        const response = await axios.post(`${AI_URL}/cdss/dosage`, body, {
            timeout: AI_TIMEOUT_DEFAULT
        });
        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/score
 * @desc    Prescription safety score (0–100) with severity and recommendations
 * @access  Private
 */
router.post('/cdss/score', protect, async (req, res) => {
    try {
        const response = await axios.post(`${AI_URL}/cdss/score`, req.body, {
            timeout: AI_TIMEOUT_DEFAULT
        });
        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/dosage-safety
 * @desc    ML-powered single medication dosage safety prediction
 *          Returns risk level, max safe dose, accumulation risk, emergency advice, etc.
 * @access  Private
 */
router.post('/cdss/dosage-safety', protect, async (req, res) => {
    try {
        const body = { ...req.body };
        if (!body.patient) body.patient = {};

        // Enrich patient data from MongoDB
        const userDoc = await User.findById(req.user._id)
            .select('dateOfBirth allergies chronicConditions');

        if (userDoc) {
            if (userDoc.dateOfBirth && !body.patient.age) {
                body.patient.age = new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear();
            }
            if (userDoc.allergies && !body.patient.allergies?.length) {
                body.patient.allergies = userDoc.allergies;
            }
        }

        const response = await axios.post(`${AI_URL}/cdss/dosage-safety`, body, {
            timeout: AI_TIMEOUT_DEFAULT
        });
        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/dosage-safety/batch
 * @desc    ML-powered batch dosage safety prediction for a full prescription.
 *          Optionally persists results to the MedicalRecord document if recordId is provided.
 * @access  Private
 */
router.post('/cdss/dosage-safety/batch', protect, async (req, res) => {
    try {
        const { medications = [], patient: clientPatient = {}, recordId } = req.body;

        if (!medications.length) {
            return res.status(400).json({ error: 'medications array is required' });
        }

        // Enrich patient data from MongoDB
        let patientProfile = { ...clientPatient };
        const userDoc = await User.findById(req.user._id)
            .select('dateOfBirth allergies chronicConditions');

        if (userDoc) {
            if (userDoc.dateOfBirth && !patientProfile.age) {
                patientProfile.age = new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear();
            }
            if (userDoc.allergies?.length > 0 && !patientProfile.allergies?.length) {
                patientProfile.allergies = userDoc.allergies;
            }
        }

        log(`Dosage-safety batch: ${medications.length} meds for user ${req.user._id}`);

        const aiResponse = await axios.post(`${AI_URL}/cdss/dosage-safety/batch`, {
            medications,
            patient: patientProfile,
        }, { timeout: AI_TIMEOUT_LONG });

        const prediction = aiResponse.data;

        // Persist to MedicalRecord if recordId provided
        if (recordId) {
            try {
                await MedicalRecord.findByIdAndUpdate(recordId, {
                    'aiAnalysis.dosageSafetyPredictions': {
                        overallRiskLevel:       prediction.overall_risk_level,
                        overallRiskIndex:       prediction.overall_risk_index,
                        individualPredictions:  prediction.individual_predictions || [],
                        emergencyDrugs:         prediction.emergency_drugs || [],
                        toxicDrugs:             prediction.toxic_drugs || [],
                        hasEmergency:           prediction.has_emergency || false,
                        hasToxic:               prediction.has_toxic || false,
                        totalDailyDoseMg:       prediction.total_daily_dose_mg,
                        mlAvailable:            prediction.ml_available || false,
                        predictedAt:            new Date(),
                    },
                }, { new: false });
                log(`Dosage safety predictions saved to record ${recordId}`);
            } catch (saveErr) {
                console.warn('[AI-PROXY] Failed to persist dosage safety predictions:', saveErr.message);
            }
        }

        return res.json(prediction);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   GET /api/ai/cdss/dosage-safety/status
 * @desc    Check whether the dosage safety ML models are loaded in the Python service
 * @access  Private
 */
router.get('/cdss/dosage-safety/status', protect, async (req, res) => {
    try {
        const response = await axios.get(`${AI_URL}/cdss/dosage-safety/status`, {
            timeout: 5000
        });
        res.json(response.data);
    } catch (err) {
        res.status(503).json({ ml_ready: false, error: 'Dosage safety status check failed' });
    }
});

/**
 * @route   POST /api/ai/cdss/risks
 * @desc    5-organ health risk profile for a patient
 *          Automatically enriches from MongoDB if patientId provided.
 * @access  Private
 */
router.post('/cdss/risks', protect, async (req, res) => {
    try {
        const body = { ...req.body };

        // Enrich with stored patient profile
        const userDoc = await User.findById(req.user._id)
            .select('dateOfBirth allergies chronicConditions bloodGroup');

        if (userDoc) {
            if (userDoc.dateOfBirth && !body.age) {
                body.age = new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear();
            }
            if (userDoc.chronicConditions) body.chronicConditions = userDoc.chronicConditions;
        }

        const response = await axios.post(`${AI_URL}/cdss/risks`, body, {
            timeout: AI_TIMEOUT_DEFAULT
        });
        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/predict-diseases
 * @desc    XGBoost ranked disease probabilities
 * @access  Private
 */
router.post('/cdss/predict-diseases', protect, async (req, res) => {
    try {
        const body = { ...req.body };

        const userDoc = await User.findById(req.user._id)
            .select('dateOfBirth chronicConditions');

        if (userDoc?.dateOfBirth && !body.age) {
            body.age = new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear();
        }
        if (userDoc?.chronicConditions) body.chronicConditions = userDoc.chronicConditions;

        const response = await axios.post(`${AI_URL}/cdss/predict-diseases`, body, {
            timeout: AI_TIMEOUT_DEFAULT
        });
        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/adherence
 * @desc    Medication adherence prediction with historical data from AdherenceLog
 * @access  Private
 */
router.post('/cdss/adherence', protect, async (req, res) => {
    try {
        const { patient: clientPatient = {}, history: clientHistory } = req.body;

        // Build patient profile
        const userDoc = await User.findById(req.user._id)
            .select('dateOfBirth chronicConditions');

        const patientProfile = { ...clientPatient };
        if (userDoc?.dateOfBirth && !patientProfile.age) {
            patientProfile.age = new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear();
        }
        if (userDoc?.chronicConditions) {
            patientProfile.chronicConditions = userDoc.chronicConditions;
        }

        // Load adherence history from DB if not provided
        let history = clientHistory;
        if (!history || history.length === 0) {
            const logs = await AdherenceLog.find({ patientId: req.user._id })
                .sort({ createdAt: -1 })
                .limit(50)
                .select('refillDelayDays missedDoses totalDoses createdAt medication');

            history = logs.map(l => ({
                refill_delay_days: l.refillDelayDays || 0,
                missed_doses:      l.missedDoses || 0,
                total_doses:       l.totalDoses || 30,
                refill_date:       l.createdAt?.toISOString().split('T')[0],
                medication:        l.medication
            }));
        }

        // Count active prescriptions from medical records
        const prescriptionCount = await MedicalRecord.countDocuments({
            patientId: req.user._id,
            recordType: 'prescription',
            isActive: true
        });
        patientProfile.prescriptionCount = prescriptionCount;

        const response = await axios.post(`${AI_URL}/cdss/adherence`, {
            patient: patientProfile,
            history
        }, { timeout: AI_TIMEOUT_DEFAULT });

        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/ocr-extract
 * @desc    OCR-based prescription extraction (proxies to Flask)
 * @access  Private
 */
router.post('/cdss/ocr-extract', protect, async (req, res) => {
    try {
        const response = await axios.post(`${AI_URL}/cdss/ocr-extract`, req.body, {
            timeout: AI_TIMEOUT_LONG
        });
        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/explain
 * @desc    SHAP explainability for disease predictions
 * @access  Private
 */
router.post('/cdss/explain', protect, async (req, res) => {
    try {
        // Enrich with patient profile
        const body = { ...req.body };
        const userDoc = await User.findById(req.user._id)
            .select('dateOfBirth chronicConditions');

        if (userDoc?.dateOfBirth && !body.age) {
            body.age = new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear();
        }
        if (userDoc?.chronicConditions) body.chronicConditions = userDoc.chronicConditions;

        const response = await axios.post(`${AI_URL}/cdss/explain`, body, {
            timeout: AI_TIMEOUT_LONG
        });
        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/adherence-log
 * @desc    Record a medication adherence event (refill, missed dose, etc.)
 * @access  Private
 */
router.post('/cdss/adherence-log', protect, async (req, res) => {
    try {
        const {
            eventType, medication, refillDueDate, refillCollectedDate,
            missedDoses, totalDoses, notes, recordId, source
        } = req.body;

        if (!eventType) {
            return res.status(400).json({ error: 'eventType is required' });
        }

        const logEntry = await AdherenceLog.create({
            patientId:           req.user._id,
            recordId:            recordId || null,
            eventType,
            medication:          medication || null,
            refillDueDate:       refillDueDate || null,
            refillCollectedDate: refillCollectedDate || null,
            missedDoses:         missedDoses || 0,
            totalDoses:          totalDoses || 30,
            notes:               notes || null,
            source:              source || 'patient_reported'
        });

        return res.status(201).json({ success: true, log: logEntry });
    } catch (err) {
        console.error('[AI-PROXY] Adherence log error:', err.message);
        return res.status(500).json({ error: 'Failed to log adherence event' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const handleAiError = (err, res) => {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return res.status(503).json({
            error: 'AI service offline',
            message: 'The MediChain AI engine is currently unreachable.',
            fallback: true
        });
    }
    const status = err.response ? err.response.status : 500;
    const message = err.response ? err.response.data?.error : err.message;
    return res.status(status).json({ error: 'AI service error', message, fallback: true });
};

module.exports = router;
