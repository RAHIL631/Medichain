// medichain/backend/routes/patient.js
// Patient-facing API routes — all require a valid JWT (protect middleware).
// Actual blockchain access-grant/revoke calls are made directly from the
// frontend to the smart contract; these routes handle the off-chain MongoDB layer.

const express       = require('express');
const router        = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User          = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');

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
    const records = await MedicalRecord
      .find({ patientId: req.user._id, isActive: true })
      // Populate doctor details from the User collection
      .populate('doctorId', 'name specialization licenseNumber')
      .sort({ createdAt: -1 }); // newest first

    return res.status(200).json({ records });
  } catch (err) {
    console.error('[PATIENT] GET /records error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch records' });
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
    // Handle malformed MongoDB ObjectId
    if (err.name === 'CastError') {
      return res.status(404).json({ error: 'Record not found' });
    }
    return res.status(500).json({ error: 'Failed to fetch record' });
  }
});

// ── GET /api/patient/profile ──────────────────────────────────────────────────
/**
 * Returns the full patient profile document plus a count of their medical records.
 */
router.get('/profile', async (req, res) => {
  try {
    // req.user is already populated by the protect middleware (no password)
    const user = await User.findById(req.user._id).select('-password -__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count only active records for this patient
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
/**
 * Updates allowed patient profile fields only.
 * Sensitive fields (email, password, role, walletAddress) are explicitly blocked.
 */
router.put('/profile', async (req, res) => {
  try {
    // Whitelist of updatable fields — nothing sensitive can be changed here
    const ALLOWED_FIELDS = ['bloodGroup', 'allergies', 'chronicConditions', 'phone', 'dateOfBirth'];

    const updates = {};
    ALLOWED_FIELDS.forEach((field) => {
      // Only include fields that were actually sent in the request body
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
        new:          true,  // return the updated document
        runValidators: true, // enforce schema validators (e.g. bloodGroup enum)
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
/**
 * Links a MetaMask wallet address to the patient's account.
 * Body: { walletAddress: "0x..." }
 */
router.post('/link-wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid Ethereum address format (must be 0x + 40 hex chars)',
      });
    }

    // Check this wallet isn't already linked to another user
    const existingUser = await User.findOne({ walletAddress, _id: { $ne: req.user._id } });
    if (existingUser) {
      return res.status(400).json({
        error: 'This wallet address is already linked to another MediChain account',
      });
    }

    // Update the user record
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
/**
 * Marks the patient as registered on the blockchain in MongoDB.
 * Should be called AFTER contract.registerPatient() succeeds.
 */
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
/**
 * Verifies a doctor exists in the system before the frontend calls grantDoctorAccess()
 * on the smart contract. Does NOT write to the blockchain — that happens in the frontend.
 * Body: { doctorWalletAddress: "0x..." }
 */
router.post('/grant-access', async (req, res) => {
  try {
    const { doctorWalletAddress } = req.body;

    if (!doctorWalletAddress) {
      return res.status(400).json({ error: 'doctorWalletAddress is required' });
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(doctorWalletAddress)) {
      return res.status(400).json({ error: 'Invalid Ethereum address format' });
    }

    // Look up the doctor in MongoDB by their linked wallet address
    const doctor = await User.findOne({
      walletAddress: doctorWalletAddress,
      role:          { $in: ['doctor', 'hospital'] },
    }).select('name specialization role');

    if (!doctor) {
      return res.status(404).json({
        error: 'No verified doctor or hospital found with this wallet address',
      });
    }

    // Return doctor details so the frontend can show a confirmation before blockchain tx
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
/**
 * Aggregates all medication names from this patient's active prescription records.
 * This list is sent to the Python AI microservice at /api/drug-check
 * to detect harmful drug-drug interactions via the RxNorm API.
 */
router.get('/medications', async (req, res) => {
  try {
    // Use MongoDB aggregation to flatten the medications arrays across all prescriptions
    const result = await MedicalRecord.aggregate([
      {
        // Only look at this patient's active prescriptions
        $match: {
          patientId:  req.user._id,
          recordType: 'prescription',
          isActive:   true,
        },
      },
      {
        // Deconstruct the medications array into individual documents
        $unwind: '$medications',
      },
      {
        // Group all medication strings into a single deduplicated set
        $group: {
          _id:         null,
          medications: { $addToSet: '$medications' }, // $addToSet removes duplicates
        },
      },
      {
        // Remove the _id field from the output
        $project: { _id: 0, medications: 1 },
      },
    ]);

    // result is [] if no prescriptions exist — handle gracefully
    const medications = result.length > 0 ? result[0].medications : [];

    return res.status(200).json({ medications });
  } catch (err) {
    console.error('[PATIENT] GET /medications error:', err.message);
    return res.status(500).json({ error: 'Failed to aggregate medications' });
  }
});

module.exports = router;
