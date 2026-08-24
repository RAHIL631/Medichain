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
const cdssEngine = require('../services/cdssEngine');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const AI_TIMEOUT_DEFAULT = 15000;
const AI_TIMEOUT_LONG = 30000; // OCR + SHAP can take longer

// Simple logging helper
const log = (msg) => console.log(`[AI-PROXY] ${new Date().toISOString()}: ${msg}`);

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT CLINICAL CONTEXT MANAGEMENT (CDSS & EHR)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/ai/cdss/patient-context
 * @desc    Get patient clinical parameters for CDSS
 * @access  Private
 */
router.get('/cdss/patient-context', protect, async (req, res) => {
    try {
        const userDoc = await User.findById(req.user._id)
            .select('name dateOfBirth allergies chronicConditions clinicalContext role');

        if (!userDoc) {
            return res.status(404).json({ error: 'User not found' });
        }

        const calculatedAge = userDoc.dateOfBirth
            ? new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear()
            : 45;

        const ctx = userDoc.clinicalContext || {};
        const context = {
            age:               ctx.age || calculatedAge,
            weight:            ctx.weightKg || 70,
            weightKg:          ctx.weightKg || 70,
            gfr:               ctx.kidneyGfr || 90,
            kidney_gfr:        ctx.kidneyGfr || 90,
            liverScore:        ctx.liverScore || 0,
            liver_score:       ctx.liverScore || 0,
            liverClass:        ctx.liverClass || 'A',
            isPregnant:        Boolean(ctx.isPregnant),
            pregnancy:         ctx.isPregnant ? 'yes' : 'no',
            pregnancyStatus:   ctx.pregnancyStatus || (ctx.isPregnant ? 'pregnant' : 'not_pregnant'),
            allergies:         ctx.allergies?.length ? ctx.allergies : (userDoc.allergies || []),
            chronicConditions: ctx.chronicConditions?.length ? ctx.chronicConditions : (userDoc.chronicConditions || []),
            lastUpdated:       ctx.lastUpdated || userDoc.updatedAt || new Date()
        };

        return res.json({ success: true, context });
    } catch (err) {
        console.error('[CDSS] GET patient-context error:', err.message);
        return res.status(500).json({ error: 'Failed to retrieve patient clinical context' });
    }
});

/**
 * @route   POST /api/ai/cdss/patient-context
 * @desc    Save/update patient clinical parameters with boundary validation
 * @access  Private
 */
router.post('/cdss/patient-context', protect, async (req, res) => {
    try {
        const {
            age,
            weight,
            weightKg,
            gfr,
            kidney_gfr,
            liverScore,
            liver_score,
            liverClass,
            isPregnant,
            pregnant,
            pregnancyStatus,
            allergies = [],
            chronicConditions = []
        } = req.body;

        // Boundary Validation
        const validAge = Math.min(120, Math.max(0, parseInt(age) || 45));
        const validWeight = Math.min(500, Math.max(1, parseFloat(weightKg || weight) || 70));
        const validGfr = Math.min(200, Math.max(0, parseInt(kidney_gfr || gfr) || 90));
        const validLiverScore = parseInt(liverScore ?? liver_score ?? 0) || 0;
        const validLiverClass = ['A', 'B', 'C'].includes((liverClass || '').toUpperCase())
            ? liverClass.toUpperCase()
            : (validLiverScore >= 10 ? 'C' : validLiverScore >= 5 ? 'B' : 'A');
        
        const validPregnant = Boolean(isPregnant || pregnant === true || pregnant === 'yes' || pregnancyStatus === 'pregnant');
        const validPregnancyStatus = pregnancyStatus || (validPregnant ? 'pregnant' : 'not_pregnant');

        const cleanAllergies = Array.isArray(allergies)
            ? allergies.map(a => String(a).trim()).filter(Boolean)
            : [];
        const cleanConditions = Array.isArray(chronicConditions)
            ? chronicConditions.map(c => String(c).trim()).filter(Boolean)
            : [];

        const updatedContext = {
            age: validAge,
            weightKg: validWeight,
            kidneyGfr: validGfr,
            liverScore: validLiverScore,
            liverClass: validLiverClass,
            isPregnant: validPregnant,
            pregnancyStatus: validPregnancyStatus,
            allergies: cleanAllergies,
            chronicConditions: cleanConditions,
            lastUpdated: new Date()
        };

        await User.findByIdAndUpdate(req.user._id, {
            clinicalContext: updatedContext,
            allergies: cleanAllergies,
            chronicConditions: cleanConditions
        });

        log(`Patient clinical context updated for user ${req.user._id}`);

        return res.json({
            success: true,
            message: 'Patient clinical context saved successfully',
            context: {
                ...updatedContext,
                weight: validWeight,
                gfr: validGfr,
                kidney_gfr: validGfr,
                pregnancy: validPregnant ? 'yes' : 'no'
            },
            lastUpdated: updatedContext.lastUpdated
        });

    } catch (err) {
        console.error('[CDSS] POST patient-context error:', err.message);
        return res.status(500).json({ error: 'Failed to update patient clinical context' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL DECISION SUPPORT ANALYSIS PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/ai/cdss/analyze
 * @desc    Full prescription safety analysis using deterministic rules + live RxNorm
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

        // Enrich patient context from MongoDB
        let patientProfile = { ...clientPatient };
        const userDoc = await User.findById(req.user._id)
            .select('dateOfBirth allergies chronicConditions clinicalContext role');

        if (userDoc) {
            const ctx = userDoc.clinicalContext || {};
            if (userDoc.dateOfBirth && !patientProfile.age) {
                patientProfile.age = new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear();
            }
            if (!patientProfile.age && ctx.age) patientProfile.age = ctx.age;
            if (!patientProfile.weight && ctx.weightKg) patientProfile.weight = ctx.weightKg;
            if (!patientProfile.gfr && ctx.kidneyGfr) patientProfile.gfr = ctx.kidneyGfr;
            if (patientProfile.liverScore === undefined && ctx.liverScore !== undefined) {
                patientProfile.liverScore = ctx.liverScore;
                patientProfile.liverClass = ctx.liverClass;
            }
            if (patientProfile.pregnant === undefined && ctx.isPregnant !== undefined) {
                patientProfile.pregnant = ctx.isPregnant;
            }
            if (userDoc.allergies?.length > 0 && !patientProfile.allergies?.length) {
                patientProfile.allergies = userDoc.allergies;
            }
            if (userDoc.chronicConditions?.length > 0 && !patientProfile.chronicConditions?.length) {
                patientProfile.chronicConditions = userDoc.chronicConditions;
            }
        }

        // Execute deterministic CDSS engine with live RxNorm
        const analysis = await cdssEngine.analyzePrescription({
            medications,
            dosages,
            patient: patientProfile
        });

        // Optionally persist analysis to MedicalRecord
        if (recordId && analysis.safety_score !== undefined) {
            try {
                await MedicalRecord.findByIdAndUpdate(recordId, {
                    'aiAnalysis.safetyScore':              analysis.safety_score,
                    'aiAnalysis.severity':                 analysis.severity,
                    'aiAnalysis.interactions':             analysis.interaction_analysis?.conflicts || [],
                    'aiAnalysis.dosageWarnings':           analysis.dosage_analysis || [],
                    'aiAnalysis.clinicalExplanation':      analysis.clinical_explanation,
                    'aiAnalysis.recommendations':          analysis.recommendations || [],
                    'aiAnalysis.analyzedAt':               new Date(),
                }, { new: false });
            } catch (saveErr) {
                console.warn('[AI-PROXY] Failed to save CDSS analysis to record:', saveErr.message);
            }
        }

        return res.json(analysis);

    } catch (err) {
        console.error('[CDSS] CDSS analyze error:', err.message);
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/clinical-analysis
 * @desc    Alias route for CDSS Clinical Analysis
 * @access  Private
 */
router.post('/clinical-analysis', protect, async (req, res) => {
    try {
        const { medications = [], dosages = [], patient = {} } = req.body;
        const analysis = await cdssEngine.analyzePrescription({ medications, dosages, patient });
        return res.json(analysis);
    } catch (err) {
        console.error('[CDSS] clinical-analysis error:', err.message);
        return res.status(500).json({ error: 'Clinical analysis engine error' });
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

// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE AI PLATFORM ROUTES (Phase 2–11)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/ai/cdss/clinical-intelligence
 * @desc    Unified Clinical Intelligence Report (Phase 2)
 *          Orchestrates disease risk, emergency score, specialist recs, follow-up
 * @access  Private
 */
router.post('/cdss/clinical-intelligence', protect, async (req, res) => {
    try {
        const payload = {
            ...req.body,
            age: req.body.age || (req.user.dateOfBirth
                ? new Date().getFullYear() - new Date(req.user.dateOfBirth).getFullYear()
                : undefined),
            gender: req.body.gender || req.user.gender,
        };

        const response = await axios.post(
            `${AI_URL}/cdss/clinical-intelligence`,
            payload,
            { timeout: AI_TIMEOUT_LONG }
        );
        log(`Clinical intelligence report generated for user ${req.user._id}`);
        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/cdss/predictive-analytics
 * @desc    Predict readmission, mortality, emergency visit, LOS, treatment success (Phase 11)
 * @access  Private
 */
router.post('/cdss/predictive-analytics', protect, async (req, res) => {
    try {
        const payload = {
            ...req.body,
            age: req.body.age || (req.user.dateOfBirth
                ? new Date().getFullYear() - new Date(req.user.dateOfBirth).getFullYear()
                : undefined),
            gender: req.body.gender || req.user.gender,
        };

        const response = await axios.post(
            `${AI_URL}/cdss/predictive-analytics`,
            payload,
            { timeout: AI_TIMEOUT_LONG }
        );
        log(`Predictive analytics completed for user ${req.user._id}`);
        res.json(response.data);
    } catch (err) {
        handleAiError(err, res);
    }
});

/**
 * @route   POST /api/ai/assistant/explain-disease
 * @desc    Explain a disease in plain English (Phase 9)
 * @access  Private
 */
router.post('/assistant/explain-disease', protect, async (req, res) => {
    try {
        const response = await axios.post(
            `${AI_URL}/cdss/assistant/explain-disease`,
            req.body,
            { timeout: AI_TIMEOUT_DEFAULT }
        );
        res.json(response.data);
    } catch (err) { handleAiError(err, res); }
});

/**
 * @route   POST /api/ai/assistant/explain-term
 * @desc    Explain a medical term (Phase 9)
 * @access  Private
 */
router.post('/assistant/explain-term', protect, async (req, res) => {
    try {
        const response = await axios.post(
            `${AI_URL}/cdss/assistant/explain-term`,
            req.body,
            { timeout: AI_TIMEOUT_DEFAULT }
        );
        res.json(response.data);
    } catch (err) { handleAiError(err, res); }
});

/**
 * @route   POST /api/ai/assistant/explain-drug
 * @desc    Explain a medication (Phase 9)
 * @access  Private
 */
router.post('/assistant/explain-drug', protect, async (req, res) => {
    try {
        const response = await axios.post(
            `${AI_URL}/cdss/assistant/explain-drug`,
            req.body,
            { timeout: AI_TIMEOUT_DEFAULT }
        );
        res.json(response.data);
    } catch (err) { handleAiError(err, res); }
});

/**
 * @route   POST /api/ai/assistant/explain-lab
 * @desc    Explain a lab test result (Phase 9)
 * @access  Private
 */
router.post('/assistant/explain-lab', protect, async (req, res) => {
    try {
        const response = await axios.post(
            `${AI_URL}/cdss/assistant/explain-lab`,
            req.body,
            { timeout: AI_TIMEOUT_DEFAULT }
        );
        res.json(response.data);
    } catch (err) { handleAiError(err, res); }
});

/**
 * @route   POST /api/ai/assistant/explain-prediction
 * @desc    Explain an AI risk prediction in plain English (Phase 9)
 * @access  Private
 */
router.post('/assistant/explain-prediction', protect, async (req, res) => {
    try {
        const response = await axios.post(
            `${AI_URL}/cdss/assistant/explain-prediction`,
            req.body,
            { timeout: AI_TIMEOUT_DEFAULT }
        );
        res.json(response.data);
    } catch (err) { handleAiError(err, res); }
});

/**
 * @route   POST /api/ai/assistant/summarize
 * @desc    Generate a patient health summary in plain English (Phase 9)
 * @access  Private
 */
router.post('/assistant/summarize', protect, async (req, res) => {
    try {
        // Enrich with user's actual records if not provided
        const payload = { ...req.body };

        if (!payload.recentRecords) {
            const MedicalRecord = require('../models/MedicalRecord');
            const records = await MedicalRecord
                .find({ patientId: req.user._id, isActive: true })
                .select('recordType createdAt')
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();
            payload.recentRecords = records;
        }

        const response = await axios.post(
            `${AI_URL}/cdss/assistant/summarize`,
            payload,
            { timeout: AI_TIMEOUT_DEFAULT }
        );
        res.json(response.data);
    } catch (err) { handleAiError(err, res); }
});

module.exports = router;

