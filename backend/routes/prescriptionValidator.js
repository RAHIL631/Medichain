// backend/routes/prescriptionValidator.js
// MediChain — Prescription Validation API Routes
//
// POST /api/prescription/validate
//   - Accepts: multipart file + patient context JSON
//   - Calls: Python Flask /cdss/validate-prescription
//   - Saves: PrescriptionReport document to MongoDB
//   - Returns: Full validation JSON + reportId
//
// POST /api/prescription/:reportId/pdf
//   - Generates PDF for an existing report and returns binary
//
// PATCH /api/prescription/:reportId/txhash
//   - Saves blockchain TX hash after on-chain anchoring
//
// GET /api/prescription/reports
//   - Returns paginated list of reports for the authenticated user
//
// GET /api/prescription/reports/:reportId
//   - Returns full report detail

const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const axios    = require('axios');
const crypto   = require('crypto');

const { protect }          = require('../middleware/auth');
const User                 = require('../models/User');
const PrescriptionReport   = require('../models/PrescriptionReport');

const AI_URL     = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const AI_TIMEOUT = 45000; // 45s — OCR + all checks can be slow

const log = (msg) => console.log(`[PRESC-VALIDATOR] ${new Date().toISOString()}: ${msg}`);

// ── Multer: memory storage, up to 10MB ────────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
});

// ── Auth on all routes ────────────────────────────────────────────────────────
router.use(protect);


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/prescription/validate
// ─────────────────────────────────────────────────────────────────────────────
router.post('/validate', upload.single('file'), async (req, res) => {
  try {
    // ── 1. Parse patient context ───────────────────────────────────────────
    let patient = {};
    try {
      const raw = req.body.patient;
      patient = raw ? JSON.parse(raw) : {};
    } catch { patient = {}; }

    // Enrich patient from MongoDB user record
    const userDoc = await User.findById(req.user._id)
      .select('dateOfBirth allergies chronicConditions');

    if (userDoc) {
      if (userDoc.dateOfBirth && !patient.age) {
        patient.age = new Date().getFullYear() - new Date(userDoc.dateOfBirth).getFullYear();
      }
      if (userDoc.allergies?.length > 0 && !patient.allergies?.length) {
        patient.allergies = userDoc.allergies;
      }
    }

    // Defaults for optional patient fields
    patient.kidney_gfr  = patient.kidney_gfr  ?? 90;
    patient.liver_score = patient.liver_score  ?? 0;
    patient.pregnant    = patient.pregnant     ?? false;
    patient.weight_kg   = patient.weight_kg    ?? 70;
    patient.allergies   = patient.allergies    ?? [];

    // ── 2. Parse medications override ─────────────────────────────────────
    const medicationsRaw = req.body.medications || '';
    const medications = medicationsRaw
      ? medicationsRaw.split(',').map(m => m.trim()).filter(Boolean)
      : [];

    // ── 3. Build FormData for Flask microservice ───────────────────────────
    const FormData = require('form-data');
    const form     = new FormData();

    form.append('patient', JSON.stringify(patient));

    if (medications.length > 0) {
      form.append('medications', medications.join(','));
    }

    if (req.file) {
      form.append('file', req.file.buffer, {
        filename:    req.file.originalname,
        contentType: req.file.mimetype,
      });
    }

    if (!req.file && medications.length === 0) {
      return res.status(400).json({
        error: 'Either a prescription file or a medications list is required',
      });
    }

    log(`Validation request: user=${req.user._id}, file=${req.file?.originalname || 'none'}, meds=${medications.length}`);

    // ── 4. Call Flask /cdss/validate-prescription ─────────────────────────
    const aiResponse = await axios.post(
      `${AI_URL}/cdss/validate-prescription`,
      form,
      {
        headers: form.getHeaders(),
        timeout: AI_TIMEOUT,
        maxContentLength: Infinity,
        maxBodyLength:    Infinity,
      }
    );

    const validationResult = aiResponse.data;
    log(`Validation done: score=${validationResult.safety_score}, severity=${validationResult.severity}`);

    // ── 5. Compute/verify report hash ─────────────────────────────────────
    const reportHash = validationResult.report_hash ||
      crypto.createHash('sha256')
        .update(JSON.stringify(validationResult, Object.keys(validationResult).sort()))
        .digest('hex');

    // ── 6. Save to MongoDB ────────────────────────────────────────────────
    const report = await PrescriptionReport.create({
      patientId:    req.user.role === 'patient' ? req.user._id : null,
      doctorId:     req.user.role !== 'patient' ? req.user._id : null,
      doctorWalletAddress: req.user.walletAddress || null,

      sourceFileName: req.file?.originalname || null,
      sourceFileMime: req.file?.mimetype || null,
      sourceFileSize: req.file?.size || null,

      ocrResult: {
        available:             validationResult.ocr?.available || false,
        medications:           validationResult.ocr?.medications || [],
        dosages:               validationResult.ocr?.dosages || [],
        frequencies:           validationResult.ocr?.frequencies || [],
        confidence:            validationResult.ocr?.confidence || 0,
        doctorName:            validationResult.ocr?.doctor_name || null,
        prescriptionDate:      validationResult.ocr?.prescription_date || null,
        structuredMedications: validationResult.ocr?.structured_medications || [],
        rawText:               validationResult.ocr?.raw_text || null,
      },

      detectedDiseases:  validationResult.detected_diseases || [],
      duplicateMedicines:validationResult.duplicate_medicines || [],
      overdoseAlerts:    validationResult.overdose_alerts || [],

      interactions: {
        conflicts:               validationResult.interactions?.conflicts || [],
        severityCounts:          validationResult.interactions?.severity_counts || {},
        overallScore:            validationResult.interactions?.overall_score || 0,
        combinationAnalysis:     validationResult.interactions?.combination_analysis || [],
        safeToPrescribe:         validationResult.interactions?.safe_to_prescribe !== false,
        patientContraindications:validationResult.interactions?.patient_contraindications || [],
      },

      allergyCheck:    validationResult.allergy_check || [],
      pregnancySafety: validationResult.pregnancy_safety || [],
      kidneySafety:    validationResult.kidney_safety || [],
      liverSafety:     validationResult.liver_safety || [],

      safetyScore:         validationResult.safety_score,
      severity:            validationResult.severity || 'UNKNOWN',
      severityColor:       validationResult.severity_color || null,
      clinicalExplanation: validationResult.clinical_explanation || null,
      recommendations:     validationResult.recommendations || [],
      scoreBreakdown:      validationResult.score_breakdown || null,
      summary:             validationResult.summary || {},
      patientProfile:      patient,

      reportHash,
      validatedAt: new Date(validationResult.validated_at || Date.now()),
    });

    log(`Report saved: ${report._id}`);

    return res.status(201).json({
      success:          true,
      reportId:         report._id,
      reportHash,
      validationResult: {
        ...validationResult,
        report_hash: reportHash,
        _id: report._id,
      },
    });

  } catch (err) {
    console.error('[PRESC-VALIDATOR] validate error:', err.message);

    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'AI service offline',
        message: 'The MediChain AI engine is unreachable. Please start the Python Flask server.',
      });
    }
    if (err.message?.includes('File type')) {
      return res.status(400).json({ error: err.message });
    }
    const status = err.response?.status || 500;
    const message = err.response?.data?.error || err.message;
    return res.status(status).json({ error: 'Prescription validation failed', message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/prescription/:reportId/pdf
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:reportId/pdf', async (req, res) => {
  try {
    const report = await PrescriptionReport.findOne({
      _id: req.params.reportId,
      $or: [{ patientId: req.user._id }, { doctorId: req.user._id }],
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found or access denied' });
    }

    // Build a validation result object from stored report
    const validationResult = {
      validated_at:        report.validatedAt?.toISOString() || new Date().toISOString(),
      patient_profile:     report.patientProfile || {},
      ocr:                 {
        available:             report.ocrResult?.available || false,
        medications:           report.ocrResult?.medications || [],
        dosages:               report.ocrResult?.dosages || [],
        frequencies:           report.ocrResult?.frequencies || [],
        confidence:            report.ocrResult?.confidence || 0,
        doctor_name:           report.ocrResult?.doctorName,
        prescription_date:     report.ocrResult?.prescriptionDate,
        structured_medications:report.ocrResult?.structuredMedications || [],
        raw_text:              '',
      },
      detected_diseases:   report.detectedDiseases || [],
      duplicate_medicines: report.duplicateMedicines || [],
      overdose_alerts:     report.overdoseAlerts || [],
      interactions:        {
        conflicts:               report.interactions?.conflicts || [],
        severity_counts:         report.interactions?.severityCounts || {},
        overall_score:           report.interactions?.overallScore || 0,
        combination_analysis:    report.interactions?.combinationAnalysis || [],
        safe_to_prescribe:       report.interactions?.safeToPrescribe !== false,
        patient_contraindications: report.interactions?.patientContraindications || [],
      },
      allergy_check:       report.allergyCheck || [],
      pregnancy_safety:    report.pregnancySafety || [],
      kidney_safety:       report.kidneySafety || [],
      liver_safety:        report.liverSafety || [],
      safety_score:        report.safetyScore,
      severity:            report.severity,
      severity_color:      report.severityColor,
      clinical_explanation:report.clinicalExplanation,
      recommendations:     report.recommendations || [],
      score_breakdown:     report.scoreBreakdown || {},
      summary:             report.summary || {},
      report_hash:         report.reportHash,
      blockchain_tx_hash:  report.blockchainTxHash || '',
      blockchain_block_number: report.blockchainBlockNumber || '',
    };

    // Ask the Flask service to render the PDF
    const response = await axios.post(
      `${AI_URL}/cdss/validate-prescription/pdf-from-result`,
      validationResult,
      {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="prescription_report_${report._id}.pdf"`);
    res.setHeader('Content-Length', response.data.byteLength);
    return res.send(Buffer.from(response.data));

  } catch (err) {
    console.error('[PRESC-VALIDATOR] PDF generation error:', err.message);
    return res.status(500).json({ error: 'PDF generation failed', message: err.message });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/prescription/:reportId/txhash
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:reportId/txhash', async (req, res) => {
  try {
    const { txHash, blockNumber } = req.body;

    if (!txHash) return res.status(400).json({ error: 'txHash is required' });
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({ error: 'Invalid transaction hash format' });
    }

    const report = await PrescriptionReport.findOne({
      _id: req.params.reportId,
      $or: [{ patientId: req.user._id }, { doctorId: req.user._id }],
    });

    if (!report) return res.status(404).json({ error: 'Report not found or access denied' });
    if (report.blockchainTxHash) {
      return res.status(409).json({ error: 'TX hash already set', txHash: report.blockchainTxHash });
    }

    report.blockchainTxHash      = txHash;
    report.blockchainBlockNumber = blockNumber || null;
    await report.save();

    log(`TX hash saved for report ${report._id}: ${txHash}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[PRESC-VALIDATOR] txhash error:', err.message);
    return res.status(500).json({ error: 'Failed to update TX hash' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescription/reports
// ─────────────────────────────────────────────────────────────────────────────
router.get('/reports', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const query = {
      $or: [{ patientId: req.user._id }, { doctorId: req.user._id }],
      isActive: true,
    };

    const [reports, total] = await Promise.all([
      PrescriptionReport.find(query)
        .select('safetyScore severity sourceFileName reportHash blockchainTxHash createdAt summary patientProfile')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PrescriptionReport.countDocuments(query),
    ]);

    return res.status(200).json({
      reports,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error('[PRESC-VALIDATOR] GET /reports error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/prescription/reports/:reportId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/reports/:reportId', async (req, res) => {
  try {
    const report = await PrescriptionReport.findOne({
      _id: req.params.reportId,
      $or: [{ patientId: req.user._id }, { doctorId: req.user._id }],
      isActive: true,
    });

    if (!report) return res.status(404).json({ error: 'Report not found or access denied' });
    return res.status(200).json({ report });

  } catch (err) {
    console.error('[PRESC-VALIDATOR] GET /reports/:id error:', err.message);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Report not found' });
    return res.status(500).json({ error: 'Failed to fetch report' });
  }
});


module.exports = router;
