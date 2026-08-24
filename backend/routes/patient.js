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
const { uploadToIPFS } = require('../utils/ipfs');
const { validateFileMagicBytes } = require('../middleware/fileValidator');
const { encryptBuffer, decryptBuffer, isEncryptionConfigured } = require('../utils/encryption');

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
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid Ethereum address format (must be 0x + 40 hex chars)',
      });
    }

    const existingUser = await User.findOne({ walletAddress, _id: { $ne: req.user._id } });
    if (existingUser) {
      return res.status(400).json({
        error: 'This wallet address is already linked to another MediChain account',
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      walletAddress,
      isWalletLinked: true,
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Wallet linked successfully',
      walletAddress 
    });
  } catch (err) {
    console.error('[PATIENT] POST /link-wallet error:', err.message);
    return res.status(500).json({ error: 'Failed to link wallet' });
  }
});

// ── POST /api/patient/confirm-registration ─────────────────────────────────────
router.post('/confirm-registration', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isBlockchainRegistered: true,
    });
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

module.exports = router;
