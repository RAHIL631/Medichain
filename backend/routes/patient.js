// medichain/backend/routes/patient.js
// Patient-facing API routes — all require a valid JWT (protect middleware).
// Actual blockchain access-grant/revoke calls are made directly from the
// frontend to the smart contract; these routes handle the off-chain MongoDB layer.

const express       = require('express');
const router        = express.Router();
const multer        = require('multer');
const axios         = require('axios');
const { protect, authorize } = require('../middleware/auth');
const User          = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const blockchainService = require('../services/blockchainService');
const { uploadToIPFS, fetchFromIPFS } = require('../utils/ipfs');
const { validateFileMagicBytes } = require('../middleware/fileValidator');
const { encryptBuffer, decryptBuffer, isEncryptionConfigured } = require('../utils/encryption');
const { auditLog, AuditEvents } = require('../utils/auditLogger');
const {
  linkWalletWithSignature,
} = require('../services/walletLinkService');

// ── Multer config for patient uploads ─────────────────────────────────────────
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
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}. Use PDF, JPG, or PNG.`), false);
    }
  },
});

// Apply protect to EVERY route in this file — patient must be authenticated
router.use(protect);
// Apply role guard — only 'patient' accounts can hit these routes
router.use(authorize('patient'));

// ── GET /api/patient/records ──────────────────────────────────────────────────
/**
 * Returns all active medical records belonging to the logged-in patient.
 * Populates doctor details so the frontend can display name / specialization.
 */
router.get('/records', async (req, res) => {
  try {
    const page       = Math.max(1, parseInt(req.query.page)  || 1);
    const limit      = Math.min(100, parseInt(req.query.limit) || 20);
    const recordType = req.query.recordType;

    const filter = { patientId: req.user._id, isActive: true };
    if (recordType) filter.recordType = recordType;

    const [records, total] = await Promise.all([
      MedicalRecord
        .find(filter)
        .populate('doctorId', 'name specialization licenseNumber')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      MedicalRecord.countDocuments(filter),
    ]);

    return res.status(200).json({
      records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    });
  } catch (err) {
    console.error('[PATIENT] GET /records error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch records' });
  }
});

// ── GET /api/patient/stats ────────────────────────────────────────────────────
/**
 * Returns summary counts for the authenticated patient:
 *   - total active medical records
 *   - total active medical records
 */
router.get('/stats', async (req, res) => {
  try {
    const recordCount = await MedicalRecord.countDocuments({
      patientId: req.user._id,
      isActive: true,
    });

    return res.status(200).json({
      totalRecords: recordCount,
    });
  } catch (err) {
    console.error('[PATIENT] GET /stats error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch patient stats' });
  }
});

// ── POST /api/patient/upload-record ───────────────────────────────────────────
/**
 * Patient direct upload route:
 * Allows a patient to upload their own prescriptions, lab reports, or diagnostic files.
 * Persists to IPFS via Pinata + MongoDB MedicalRecord collection.
 */
router.post('/upload-record', upload.single('file'), validateFileMagicBytes, async (req, res) => {
  try {
    const { recordType, notes, description, medications } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'File is required (PDF, JPG, or PNG)' });
    }

    // Normalize recordType
    let normalizedRecordType = (recordType || 'prescription').toLowerCase().trim();
    if (normalizedRecordType === 'lab-report') normalizedRecordType = 'lab_report';
    if (normalizedRecordType === 'imaging')    normalizedRecordType = 'xray';
    if (normalizedRecordType === 'vaccination') normalizedRecordType = 'other';

    const validTypes = ['prescription', 'lab_report', 'diagnosis', 'xray', 'scan', 'other'];
    if (!validTypes.includes(normalizedRecordType)) {
      normalizedRecordType = 'other';
    }

    const patient = await User.findById(req.user._id);
    if (!patient) {
      return res.status(404).json({ error: 'Patient account not found' });
    }

    // Encrypt file buffer if encryption is configured
    let bufferToUpload = req.file.buffer;
    let encryptionMeta = null;
    let isEncrypted    = false;

    if (process.env.NODE_ENV === 'production' && !isEncryptionConfigured()) {
      return res.status(503).json({ error: 'Medical document encryption is not configured. Upload was not completed.' });
    }

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
      console.log('[PATIENT] 🔒 File encrypted with AES-256-GCM before upload');
    }

    // Upload to IPFS / Pinata
    const { cid, url: ipfsURL, size: ipfsSize } = await uploadToIPFS(
      bufferToUpload,
      req.file.originalname,
      {
        patientWalletAddress: patient.walletAddress || '',
        recordType:           normalizedRecordType,
        uploadedBy:           patient.walletAddress || patient._id.toString(),
        timestamp:            new Date().toISOString(),
        encrypted:            isEncrypted ? 'true' : 'false',
      }
    );
    console.log(`[PATIENT] IPFS ✅ CID: ${cid} Size: ${ipfsSize} bytes`);

    // Parse medications list
    const medicationList = medications
      ? (Array.isArray(medications) ? medications : medications.split(',').map((m) => m.trim()).filter(Boolean))
      : [];

    // Fallback wallet address placeholder if user hasn't linked wallet yet
    const patientWallet = patient.walletAddress || '0x0000000000000000000000000000000000000000';

    // Save to MongoDB
    const record = await MedicalRecord.create({
      patientId:            patient._id,
      patientWalletAddress: patientWallet,
      doctorId:             null,
      doctorWalletAddress:  null,
      ipfsCID:              cid,
      ipfsURL:              ipfsURL,
      recordType:           normalizedRecordType,
      fileName:             req.file.originalname,
      fileMimeType:         req.file.validatedMime || req.file.mimetype,
      fileSize:             req.file.size,
      notes:                notes || description || '',
      medications:          medicationList,
      isEncrypted:          isEncrypted,
      encryptionMeta:       encryptionMeta,
    });

    return res.status(201).json({
      success: true,
      message: 'Record uploaded to IPFS and saved successfully',
      record: {
        _id:                  record._id,
        ipfsCID:              record.ipfsCID,
        ipfsURL:              record.ipfsURL,
        recordType:           record.recordType,
        fileName:             record.fileName,
        fileSize:             record.fileSize,
        patientWalletAddress: record.patientWalletAddress,
        uploadedAt:           record.createdAt,
      },
    });

  } catch (err) {
    console.error('[PATIENT] upload-record error:', err.message);
    if (err.message?.includes('File type not allowed') || err.message?.includes('File too large')) {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Prescription storage service encountered an error: ' + err.message });
  }
});

// ── PATCH /api/patient/record/:recordId/txhash ────────────────────────────────
/**
 * Saves the Ethereum TX hash to the record after patient calls addRecord() on Sepolia.
 */
router.patch('/record/:recordId/txhash', async (req, res) => {
  try {
    const { txHash, blockNumber } = req.body;
    if (!txHash) {
      return res.status(400).json({ error: 'txHash is required' });
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return res.status(400).json({ error: 'Invalid transaction hash format' });
    }

    const record = await MedicalRecord.findOne({
      _id:       req.params.recordId,
      patientId: req.user._id,
    });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    if (record.blockchainTxHash) {
      return res.status(409).json({
        error:   'Transaction hash already set for this record',
        txHash:  record.blockchainTxHash,
      });
    }

    record.blockchainTxHash     = txHash;
    record.blockchainBlockNumber = blockNumber || null;
    await record.save();

    return res.status(200).json({ success: true, message: 'Transaction hash confirmed on record' });
  } catch (err) {
    console.error('[PATIENT] txhash error:', err.message);
    return res.status(500).json({ error: 'Failed to update transaction hash' });
  }
});

// ── GET /api/patient/records/:recordId ───────────────────────────────────────
/**
 * Returns a single medical record by ID.
 * Enforces ownership — patientId must match the logged-in user.
 */
router.get('/records/:recordId', async (req, res) => {
  try {
    const record = await MedicalRecord
      .findOne({ _id: req.params.recordId, patientId: req.user._id, isActive: true })
      .populate('doctorId', 'name specialization licenseNumber');

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    return res.status(200).json({ record });
  } catch (err) {
    console.error('[PATIENT] GET /records/:recordId error:', err.message);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Record not found' });
    return res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// ── GET /api/patient/records/:recordId/download ──────────────────────────────
/**
 * Proxies the file download from IPFS and decrypts it if encrypted.
 */
router.get('/records/:recordId/download', async (req, res) => {
  try {
    const record = await MedicalRecord
      .findOne({ _id: req.params.recordId, patientId: req.user._id, isActive: true })
      .select('+encryptionMeta.encryptedKey +encryptionMeta.authTag');

    if (!record) return res.status(404).json({ error: 'Record not found' });

    // Fetch ciphertext from IPFS Gateway
    const response = await axios.get(record.ipfsURL, { responseType: 'arraybuffer' });
    let fileBuffer = Buffer.from(response.data);

    // Decrypt if necessary
    if (record.isEncrypted && record.encryptionMeta) {
      try {
        fileBuffer = decryptBuffer(
          fileBuffer,
          record.encryptionMeta.encryptedKey,
          record.encryptionMeta.iv,
          record.encryptionMeta.authTag
        );
      } catch (decErr) {
        console.error('[PATIENT] Decryption failed:', decErr.message);
        return res.status(500).json({ error: 'Failed to decrypt file' });
      }
    }

    res.setHeader('Content-Type', record.fileMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${record.fileName}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    return res.send(fileBuffer);
  } catch (err) {
    console.error('[PATIENT] File download error:', err.message);
    return res.status(500).json({ error: 'Failed to download file' });
  }
});

// ── GET /api/patient/profile ──────────────────────────────────────────────────
/**
 * Returns the full patient profile document plus a count of their medical records.
 */
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -__v');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const recordCount = await MedicalRecord.countDocuments({
      patientId: req.user._id,
      isActive:  true,
    });

    return res.status(200).json({ user, recordCount });
  } catch (err) {
    console.error('[PATIENT] GET /profile error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── PUT /api/patient/profile ──────────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  try {
    const ALLOWED_FIELDS = ['bloodGroup', 'allergies', 'chronicConditions', 'phone', 'dateOfBirth'];
    const updates = {};
    ALLOWED_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      {
        returnDocument: 'after',
        runValidators: true,
        select:       '-password -__v',
      }
    );

    return res.status(200).json({ user: updatedUser });
  } catch (err) {
    console.error('[PATIENT] PUT /profile error:', err.message);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join('. ') });
    }
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ── POST /api/patient/link-wallet ─────────────────────────────────────────────
router.post('/link-wallet', async (req, res) => {
  try {
    const updated = await linkWalletWithSignature(req.user._id, req.body);
    auditLog(AuditEvents.WALLET_LINKED, req, {
      walletAddress: updated.walletAddress,
      walletVerified: true,
    });
    return res.status(200).json({
      success: true,
      message: 'Wallet ownership verified and linked successfully',
      walletAddress: updated.walletAddress,
      walletVerified: updated.walletVerified,
    });
  } catch (err) {
    console.error('[PATIENT] POST /link-wallet error:', err.message);
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    return res.status(500).json({ error: 'Failed to link wallet' });
  }
});

// ── POST /api/patient/confirm-registration ─────────────────────────────────────
router.post('/confirm-registration', async (req, res) => {
  try {
    if (req.user.walletVerified !== true || !req.user.walletAddress) {
      return res.status(403).json({ error: 'Verify a linked wallet before confirming blockchain registration' });
    }

    let isRegistered;
    try {
      isRegistered = await blockchainService.isPatientRegistered(req.user.walletAddress);
    } catch (err) {
      console.error('[PATIENT] Blockchain registration check unavailable:', err.message);
      return res.status(503).json({ error: 'Blockchain registration could not be verified. Please retry when the network is available.' });
    }
    if (!isRegistered) {
      return res.status(409).json({ error: 'The linked wallet is not registered as a patient on the configured contract' });
    }

    await User.findByIdAndUpdate(req.user._id, { isBlockchainRegistered: true });
    return res.status(200).json({ 
      success: true, 
      message: 'Blockchain registration confirmed in profile' 
    });
  } catch (err) {
    console.error('[PATIENT] POST /confirm-registration error:', err.message);
    return res.status(500).json({ error: 'Failed to confirm registration' });
  }
});

// ── POST /api/patient/grant-access ────────────────────────────────────────────
router.post('/grant-access', async (req, res) => {
  try {
    const { doctorWalletAddress } = req.body;
    if (!doctorWalletAddress) {
      return res.status(400).json({ error: 'doctorWalletAddress is required' });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(doctorWalletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }

    const doctor = await User.findOne({
      walletAddress: { $regex: new RegExp(`^${doctorWalletAddress.trim()}$`, 'i') },
      role:          { $in: ['doctor', 'hospital'] },
      walletVerified: true,
    }).select('name specialization role');

    if (!doctor) {
      return res.status(404).json({
        error: 'No verified doctor or hospital found with this wallet address',
      });
    }

    return res.status(200).json({
      doctorName:           doctor.name,
      doctorSpecialization: doctor.specialization || doctor.role,
      message:              'Doctor verified — proceed with blockchain grant',
    });
  } catch (err) {
    console.error('[PATIENT] POST /grant-access error:', err.message);
    return res.status(500).json({ error: 'Failed to verify doctor' });
  }
});

// ── GET /api/patient/medications ──────────────────────────────────────────────
router.get('/medications', async (req, res) => {
  try {
    const result = await MedicalRecord.aggregate([
      {
        $match: {
          patientId:  req.user._id,
          recordType: 'prescription',
          isActive:   true,
        },
      },
      {
        $unwind: '$medications',
      },
      {
        $group: {
          _id:         null,
          medications: { $addToSet: '$medications' },
        },
      },
      {
        $project: { _id: 0, medications: 1 },
      },
    ]);

    const medications = result.length > 0 ? result[0].medications : [];
    return res.status(200).json({ medications });
  } catch (err) {
    console.error('[PATIENT] GET /medications error:', err.message);
    return res.status(500).json({ error: 'Failed to aggregate medications' });
  }
});

// ── GET /api/patient/record/:recordId/download ────────────────────────────────
/**
 * Patient-facing route to retrieve and decrypt their own medical record.
 * Strict authorization enforced:
 *   1. Must be authenticated as patient
 *   2. Must be the owner of the record (record.patientId === req.user._id)
 *   3. Fetches encrypted ciphertext from IPFS gateways
 *   4. Decrypts using AES-256-GCM
 *   5. Logs audit trail event
 */
router.get('/record/:recordId/download', async (req, res) => {
  try {
    const record = await MedicalRecord.findOne({
      _id: req.params.recordId,
      patientId: req.user._id,
      isActive: true,
    }).select('+encryptionMeta.encryptedKey +encryptionMeta.authTag');

    if (!record) {
      return res.status(404).json({ error: 'Record not found or access denied' });
    }

    // Resiliently fetch ciphertext from IPFS Gateways with multi-gateway fallback
    let fileBuffer;
    try {
      fileBuffer = await fetchFromIPFS(record.ipfsURL || record.ipfsCID);
    } catch (ipfsErr) {
      console.error('[PATIENT] IPFS gateway retrieval failed:', ipfsErr.message);
      return res.status(502).json({
        error: 'Medical file temporarily unavailable from decentralized IPFS storage. Please try again shortly.',
      });
    }

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
        console.error('[PATIENT] Decryption failed:', decErr.message);
        return res.status(500).json({ error: 'Failed to decrypt medical file content' });
      }
    }

    auditLog(AuditEvents.RECORD_ACCESSED, req, {
      recordId: record._id,
      patientId: record.patientId,
      fileName: record.fileName,
      ipfsCID: record.ipfsCID,
      role: 'patient',
    });

    res.setHeader('Content-Type', record.fileMimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${record.fileName || 'record'}"`);
    res.setHeader('Content-Length', fileBuffer.length);
    return res.send(fileBuffer);

  } catch (err) {
    console.error('[PATIENT] Record download error:', err.message);
    if (err.name === 'CastError') return res.status(404).json({ error: 'Record not found' });
    return res.status(500).json({ error: 'Failed to retrieve file: ' + err.message });
  }
});

module.exports = router;
