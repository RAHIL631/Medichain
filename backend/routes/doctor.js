// medichain/backend/routes/doctor.js
// Doctor and Hospital-facing API routes.
// All routes require: protect (JWT) + authorize('doctor', 'hospital')
//
// UPLOAD FLOW:
//   Frontend → POST /api/doctor/upload-record (multipart)
//     → IPFS upload (Pinata)
//     → AI drug-interaction check (Python Flask at :5001)
//     → If HIGH severity detected → 422 BLOCK
//     → Else → Save to MongoDB → return record
//   Frontend → confirm TX on-chain (MetaMask)
//   Frontend → PATCH /api/doctor/record/:id/txhash (save TX hash to MongoDB)

const express       = require('express');
const router        = express.Router();
const multer        = require('multer');
const axios         = require('axios');

const { protect, authorize }    = require('../middleware/auth');
const User                      = require('../models/User');
const MedicalRecord             = require('../models/MedicalRecord');
const ConsentRecord             = require('../models/ConsentRecord');
const { uploadToIPFS }          = require('../utils/ipfs');
const { validateFileMagicBytes }= require('../middleware/fileValidator');
const { encryptBuffer, isEncryptionConfigured } = require('../utils/encryption');

// ── Multer config ─────────────────────────────────────────────────────────────
// Files are kept in memory (Buffer) — never touch disk — then streamed to IPFS.
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB hard cap
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true); // accept file
    } else {
      // Pass an error — multer will attach it to req and skip the handler
      cb(new Error(`File type not allowed: ${file.mimetype}. Use PDF, JPG, or PNG.`), false);
    }
  },
});

// ── Apply auth to every route in this file ────────────────────────────────────
router.use(protect);
router.use(authorize('doctor', 'hospital'));

// ── POST /api/doctor/upload-record ────────────────────────────────────────────
/**
 * Main upload route — does 5 things in sequence:
 *  1. Accept multipart: file + patientWalletAddress + recordType + notes + medications
 *  2. Validate file (multer handles size/type above)
 *  3. Upload file buffer to IPFS via Pinata → get { cid, url }
 *  4. Run AI drug-interaction check → block upload if HIGH severity conflict found
 *  5. Save MedicalRecord to MongoDB
 *
 * Form fields:
 *  - file             (binary)
 *  - patientWalletAddress (string, required)
 *  - recordType       (string, required — see enum in MedicalRecord model)
 *  - notes            (string, optional)
 *  - medications      (comma-separated string, e.g. "Metformin,Aspirin")
 */
router.post('/upload-record', upload.single('file'), validateFileMagicBytes, async (req, res) => {
  try {
    // ── 1. Validate required form fields ──────────────────────────────────────
    const { patientWalletAddress, recordType, notes, medications } = req.body;

    if (!patientWalletAddress) {
      return res.status(400).json({ error: 'patientWalletAddress is required' });
    }

    // Normalize recordType
    let normalizedRecordType = (recordType || 'prescription').toLowerCase().trim();
    if (normalizedRecordType === 'lab-report') normalizedRecordType = 'lab_report';
    if (normalizedRecordType === 'imaging')    normalizedRecordType = 'xray';
    if (normalizedRecordType === 'vaccination') normalizedRecordType = 'other';

    const validTypes = ['prescription', 'lab_report', 'diagnosis', 'xray', 'scan', 'other'];
    if (!validTypes.includes(normalizedRecordType)) {
      return res.status(400).json({
        error: `recordType must be one of: ${validTypes.join(', ')}`,
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Validate Ethereum address format for patient
    if (!/^0x[a-fA-F0-9]{40}$/.test(patientWalletAddress)) {
      return res.status(400).json({ error: 'Invalid patient wallet address format' });
    }

    // ── 2. Look up the patient and the uploading doctor in MongoDB ─────────────
    // Case-insensitive regex match for wallet address
    const patient = await User.findOne({
      walletAddress: { $regex: new RegExp(`^${patientWalletAddress.trim()}$`, 'i') },
      role:          'patient',
    }).select('_id name walletAddress');

    if (!patient) {
      return res.status(404).json({
        error: 'No patient found with this wallet address. Verify the address or have the patient register first.',
      });
    }

    // ── CONSENT VERIFICATION ───────────────────────────────────────────────
    // Check if patient has granted active consent to this doctor
    const hasConsent = await ConsentRecord.hasActiveConsent(patient._id, req.user._id);
    if (!hasConsent) {
      return res.status(403).json({
        error: 'Access denied: patient has not granted consent for you to upload records. ' +
               'The patient must authorize your doctor address first via the Access Manager.',
      });
    }

    // Reload doctor to get walletAddress (req.user comes from protect middleware)
    const doctor = await User.findById(req.user._id).select('walletAddress name');

    // ── 3. Encrypt file buffer & Upload to IPFS via Pinata ──────────────────
    let bufferToUpload = req.file.buffer;
    let encryptionMeta = null;
    let isEncrypted    = false;

    if (isEncryptionConfigured()) {
      const encResult = encryptBuffer(req.file.buffer);
      bufferToUpload  = encResult.encryptedBuffer;
      isEncrypted     = true;
      encryptionMeta  = {
        encryptedKey: encResult.encryptedKey,
        iv:           encResult.iv,
        authTag:      encResult.authTag,
        algorithm:    'aes-256-gcm',
        encryptedAt:  new Date(),
      };
      console.log('[DOCTOR] 🔒 File encrypted with AES-256-GCM before upload');
    } else {
      console.warn('[DOCTOR] ⚠️ ENCRYPTION_MASTER_KEY missing! Uploading unencrypted file to IPFS.');
    }

    // uploadToIPFS pins the file AND stores searchable metadata on Pinata
    const { cid, url: ipfsURL, size: ipfsSize } = await uploadToIPFS(
      bufferToUpload,
      req.file.originalname,
      {
        patientWalletAddress: patient.walletAddress,
        recordType,
        uploadedBy:  doctor?.walletAddress || req.user._id.toString(),
        timestamp:   new Date().toISOString(),
        encrypted:   isEncrypted ? 'true' : 'false',
      }
    );
    console.log(`[DOCTOR] IPFS ✅  CID: ${cid}  Size: ${ipfsSize} bytes`);

    // Parse comma-separated medications field into an array
    const medicationList = medications
      ? medications.split(',').map((m) => m.trim()).filter(Boolean)
      : [];

    // ── 4. AI-CDSS Full Prescription Analysis ──────────────────────────
    // Runs: multi-drug interaction matrix + dosage safety + safety scoring (0–100)
    // Only run for prescriptions with medications listed.
    let cdssAnalysis = null;

    if (medicationList.length > 0 && recordType === 'prescription') {
      try {
        // Build patient profile from DB
        const patientFullDoc = await User.findById(patient._id)
          .select('dateOfBirth allergies chronicConditions');

        const patientAge = patientFullDoc?.dateOfBirth
          ? new Date().getFullYear() - new Date(patientFullDoc.dateOfBirth).getFullYear()
          : 45;

        const cdssPayload = {
          medications: medicationList,
          dosages:     [],  // No explicit doses in form — extended via OCR or future form fields
          patient: {
            age:              patientAge,
            allergies:        patientFullDoc?.allergies || [],
            chronicConditions: patientFullDoc?.chronicConditions || [],
            kidney_gfr:       90,  // Default; updated if patient profile has labs
            liver_score:      0,
            pregnant:         false,
          }
        };

        // If image/PDF, send file for OCR extraction too
        if (['image/jpeg','image/jpg','image/png','application/pdf'].includes(req.file.mimetype)) {
          cdssPayload.file_base64 = req.file.buffer.toString('base64');
          cdssPayload.mime_type   = req.file.mimetype;
        }

        const aiResponse = await axios.post(
          `${process.env.AI_SERVICE_URL || 'http://localhost:5001'}/cdss/analyze`,
          cdssPayload,
          { timeout: 30000 }  // Allow longer for OCR + SHAP
        );

        cdssAnalysis = aiResponse.data;
        const severity = cdssAnalysis.severity || 'UNKNOWN';

        console.log(`[DOCTOR] CDSS Analysis: score=${cdssAnalysis.safety_score} severity=${severity}`);

        // Block upload on CRITICAL or HIGH severity
        if (['CRITICAL', 'HIGH'].includes(severity)) {
          const conflicts = cdssAnalysis.interaction_analysis?.conflicts || [];
          const dosageIssues = (cdssAnalysis.dosage_analysis || []).filter(d => !d.safe);

          return res.status(422).json({
            error:       `Upload blocked — ${severity} severity prescription safety issue detected`,
            severity,
            safety_score:        cdssAnalysis.safety_score,
            clinical_explanation: cdssAnalysis.clinical_explanation,
            conflicts,
            dosage_warnings:     dosageIssues,
            recommendations:     cdssAnalysis.recommendations || [],
            medications:         medicationList,
          });
        }

        // Log non-blocking issues
        if (cdssAnalysis.interaction_analysis?.conflicts?.length > 0) {
          console.warn(`[DOCTOR] CDSS: ${cdssAnalysis.interaction_analysis.conflicts.length} interaction(s) detected (non-blocking)`);
        }

      } catch (aiErr) {
        // AI service offline → log and continue (never block upload due to AI unavailability)
        console.warn('[DOCTOR] CDSS analysis unavailable — skipping:', aiErr.message);
      }
    }

    // ── 5. Save MedicalRecord to MongoDB ────────────────────────────────
    const record = await MedicalRecord.create({
      patientId:            patient._id,
      patientWalletAddress: patient.walletAddress,
      doctorId:             req.user._id,
      doctorWalletAddress:  doctor?.walletAddress || null,
      ipfsCID:              cid,
      ipfsURL:              ipfsURL,
      recordType:           recordType,
      fileName:             req.file.originalname,
      // If we use validatedMime, it ensures accuracy over whatever header was sent
      fileMimeType:         req.file.validatedMime || req.file.mimetype,
      fileSize:             req.file.size,
      notes:                notes || '',
      medications:          medicationList,
      
      // Encryption data
      isEncrypted,
      ...(encryptionMeta && { encryptionMeta }),
      // AI Analysis — stored inline if CDSS ran successfully
      ...(cdssAnalysis && {
        aiAnalysis: {
          safetyScore:          cdssAnalysis.safety_score,
          severity:             cdssAnalysis.severity,
          interactions:         cdssAnalysis.interaction_analysis?.conflicts || [],
          dosageWarnings:       (cdssAnalysis.dosage_analysis || []).filter(d => !d.safe),
          clinicalExplanation:  cdssAnalysis.clinical_explanation,
          recommendations:      cdssAnalysis.recommendations || [],
          ocrExtracted:         cdssAnalysis.ocr_extracted || false,
          extractedMedications: cdssAnalysis.ocr?.medications || [],
          shapValues:           cdssAnalysis.shap_explanation || null,
          scoreBreakdown:       cdssAnalysis.score_breakdown || null,
          analyzedAt:           new Date(),
        }
      }),
    });

    // Return everything the frontend needs
    return res.status(201).json({
      success: true,
      record: {
        _id:                  record._id,
        ipfsCID:              record.ipfsCID,
        ipfsURL:              record.ipfsURL,
        recordType:           record.recordType,
        fileName:             record.fileName,
        fileSize:             record.fileSize,
        patientWalletAddress: record.patientWalletAddress,  // ← needed for contract call
        doctorWalletAddress:  record.doctorWalletAddress,
        uploadedAt:           record.createdAt,
      },
    });

  } catch (err) {
    console.error('[DOCTOR] upload-record error:', err.message);

    // Multer file-type/size errors come through as generic Errors
    if (err.message?.includes('File type not allowed') || err.message?.includes('File too large')) {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// ── PATCH /api/doctor/record/:recordId/txhash ─────────────────────────────────
/**
 * Called from the frontend AFTER the MetaMask blockchain transaction is confirmed.
 * Saves the Ethereum TX hash and block number to the MongoDB record so the
 * patient's RecordCard can show the "On-Chain ✓" link to Etherscan.
 *
 * Body: { txHash: "0x...", blockNumber: 12345678 }
 */
router.patch('/record/:recordId/txhash', async (req, res) => {
  try {
    const { txHash, blockNumber } = req.body;

    if (!txHash) {
      return res.status(400).json({ error: 'txHash is required' });
    }

    // Validate Ethereum TX hash format: 0x + 64 hex chars
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({ error: 'Invalid transaction hash format' });
    }

    // Find the record — only the doctor who uploaded it can set the TX hash
    const record = await MedicalRecord.findOne({
      _id:      req.params.recordId,
      doctorId: req.user._id,
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found or access denied' });
    }

    // Prevent overwriting an already-confirmed TX hash
    if (record.blockchainTxHash) {
      return res.status(409).json({
        error:   'Transaction hash already set for this record',
        txHash:  record.blockchainTxHash,
      });
    }

    // Save the blockchain proof to the record
    record.blockchainTxHash     = txHash;
    record.blockchainBlockNumber = blockNumber || null;
    await record.save();

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[DOCTOR] txhash update error:', err.message);
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'Record not found' });
    }
    return res.status(500).json({ error: 'Failed to update transaction hash' });
  }
});

// ── GET /api/doctor/record/:recordId/download ─────────────────────────────────
/**
 * Doctor-facing route to retrieve and decrypt a patient's medical record.
 * Strict authorization enforced:
 *   1. Must be authenticated as doctor or hospital
 *   2. Must have active ConsentRecord from the patient OR be the original uploader
 *   3. Fetches encrypted ciphertext from IPFS gateway
 *   4. Decrypts using AES-256-GCM with stored key bundle
 *   5. Logs audit trail event
 */
const { decryptBuffer } = require('../utils/encryption');
const { auditLog, AuditEvents } = require('../utils/auditLogger');

router.get('/record/:recordId/download', async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({
      _id: req.params.recordId,
      isActive: true,
    }).select('+encryptionMeta.encryptedKey +encryptionMeta.authTag');

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Check authorization: doctor must either be the uploader or have active patient consent
    const isUploader = record.doctorId && record.doctorId.toString() === req.user._id.toString();
    let isAuthorizedDoctor = isUploader;

    if (!isAuthorizedDoctor) {
      isAuthorizedDoctor = await ConsentRecord.hasActiveConsent(record.patientId, req.user._id);
    }

    if (!isAuthorizedDoctor) {
      auditLog(AuditEvents.UNAUTHORIZED, req, {
        recordId: req.params.recordId,
        patientId: record.patientId,
        reason: 'Missing active patient consent',
      });
      return res.status(403).json({
        error: 'Access denied: You do not have active patient consent to access this medical file',
      });
    }

    // Fetch ciphertext from IPFS Gateway
    const response = await axios.get(record.ipfsURL, { responseType: 'arraybuffer' });
    let fileBuffer = Buffer.from(response.data);

    // Decrypt if encrypted
    if (record.isEncrypted && record.encryptionMeta) {
      try {
        fileBuffer = decryptBuffer(
          fileBuffer,
          record.encryptionMeta.encryptedKey,
          record.encryptionMeta.iv,
          record.encryptionMeta.authTag
        );
      } catch (decErr) {
        console.error('[DOCTOR] Decryption failed:', decErr.message);
        return res.status(500).json({ error: 'Failed to decrypt file content' });
      }
    }

    auditLog(AuditEvents.RECORD_ACCESSED, req, {
      recordId: record._id,
      patientId: record.patientId,
      fileName: record.fileName,
      ipfsCID: record.ipfsCID,
    });

    res.setHeader('Content-Type', record.fileMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${record.fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    return res.send(fileBuffer);

  } catch (err) {
    console.error('[DOCTOR] Record download error:', err.message);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Record not found' });
    return res.status(500).json({ error: 'Failed to retrieve file: ' + err.message });
  }
});

// ── GET /api/doctor/patient/:walletAddress ────────────────────────────────────
/**
 * Called when a doctor scans a patient's QR Health ID.
 * The QR code encodes the patient's wallet address.
 * Returns a safe patient summary + their active record count.
 *
 * Note: The actual ACCESS CHECK is performed on the smart contract in the
 * frontend — this route only returns publicly-safe profile data.
 */
router.get('/patient/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Find the patient by their on-chain wallet address (case-insensitive)
    const patient = await User.findOne({
      walletAddress: { $regex: new RegExp(`^${walletAddress.trim()}$`, 'i') },
      role: 'patient',
    }).select('name bloodGroup allergies chronicConditions walletAddress');

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found with this wallet address' });
    }

    // Count active medical records for this patient
    const recordCount = await MedicalRecord.countDocuments({
      patientId: patient._id,
      isActive:  true,
    });

    const summary = {
      _id:               patient._id,
      name:              patient.name,
      walletAddress:     patient.walletAddress,
      bloodGroup:        patient.bloodGroup        || 'Unknown',
      allergies:         patient.allergies         || [],
      chronicConditions: patient.chronicConditions || [],
      recordCount,
    };

    return res.status(200).json({
      ...summary,
      patient: summary,
    });

  } catch (err) {
    console.error('[DOCTOR] GET /patient/:wallet error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch patient details' });
  }
});

// ── GET /api/doctor/patients ──────────────────────────────────────────────────
/**
 * Paginated list of all registered patients — for the Doctor's PatientRegistry page.
 * Query params: ?page=1&limit=20
 */
router.get('/patients', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      User.find({ role: 'patient' })
        .select('name email walletAddress bloodGroup isWalletLinked createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments({ role: 'patient' }),
    ]);

    return res.status(200).json({
      patients,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    });

  } catch (err) {
    console.error('[DOCTOR] GET /patients error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

module.exports = router;
