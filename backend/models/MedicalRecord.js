// medichain/backend/models/MedicalRecord.js
// Mongoose schema for medical records.
// The actual file lives on IPFS; only the CID, gateway URL, and blockchain
// proof (TX hash + block number) are stored here for fast off-chain querying.
// The on-chain struct in MediChain.sol mirrors: patientWallet, doctorWallet, ipfsCID, timestamp.

const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({

  // ── Ownership ───────────────────────────────────────────────────────────────

  // MongoDB ref to the patient User document — for fast population
  patientId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: [true, 'Patient ID is required'],
    index:    true,
  },

  // Ethereum address of the patient — used for blockchain smart-contract lookup
  patientWalletAddress: {
    type:     String,
    required: [true, 'Patient wallet address is required'],
    trim:     true,
    validate: {
      validator: (v) => /^0x[a-fA-F0-9]{40}$/.test(v),
      message:   'Patient wallet must be a valid Ethereum address',
    },
  },

  // MongoDB ref to the doctor/hospital User who uploaded this record
  doctorId: {
    type:  mongoose.Schema.Types.ObjectId,
    ref:   'User',
    index: true,
  },

  // Ethereum address of the doctor/uploader — stored on-chain alongside CID
  doctorWalletAddress: {
    type:  String,
    trim:  true,
    validate: {
      validator: (v) => !v || /^0x[a-fA-F0-9]{40}$/.test(v),
      message:   'Doctor wallet must be a valid Ethereum address',
    },
  },

  // ── IPFS Storage ────────────────────────────────────────────────────────────

  // Content Identifier returned by Pinata after successful upload
  ipfsCID: {
    type:     String,
    required: [true, 'IPFS CID is required'],
    trim:     true,
  },

  // Full Pinata gateway URL: https://gateway.pinata.cloud/ipfs/<CID>
  ipfsURL: {
    type:     String,
    required: [true, 'IPFS gateway URL is required'],
    trim:     true,
  },

  // ── Record Metadata ─────────────────────────────────────────────────────────

  recordType: {
    type:     String,
    required: [true, 'Record type is required'],
    enum: {
      values:  ['prescription', 'lab_report', 'diagnosis', 'xray', 'scan', 'other'],
      message: '{VALUE} is not a valid record type',
    },
  },

  fileName: {
    type:     String,
    required: [true, 'File name is required'],
    trim:     true,
  },

  // Size of the uploaded file in bytes
  fileSize: {
    type: Number,
    min:  [0, 'File size cannot be negative'],
  },

  fileMimeType: {
    type:  String,
    trim:  true,
    // e.g. 'application/pdf', 'image/jpeg'
  },

  // ── Blockchain Proof ─────────────────────────────────────────────────────────

  // Ethereum transaction hash returned after calling addRecord() on-chain
  // Null/empty until the blockchain write is confirmed
  blockchainTxHash: {
    type:  String,
    trim:  true,
  },

  // Block number in which the TX was mined — used to timestamp on-chain
  blockchainBlockNumber: {
    type: Number,
  },

  // ── Clinical Content ─────────────────────────────────────────────────────────

  notes: {
    type:      String,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
    trim:      true,
  },

  // List of drug/medication names extracted from prescriptions.
  // This array is sent to the Python AI microservice (/api/drug-check)
  // for RxNorm-based drug interaction detection.
  medications: {
    type:    [String],
    default: [],
  },

  // ── AI Clinical Decision Support Analysis ─────────────────────────────────
  // Stored after /cdss/analyze is run on upload.
  // Embedded sub-document — avoids a separate collection join for dashboards.
  aiAnalysis: {
    // Aggregate prescription safety score 0–100 (100 = perfectly safe)
    safetyScore: {
      type: Number,
      min:  0,
      max:  100,
    },

    // SAFE | LOW | MODERATE | HIGH | CRITICAL
    severity: {
      type: String,
      enum: ['SAFE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'UNKNOWN'],
    },

    // Drug-drug interaction conflict pairs
    interactions: {
      type:    [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // Per-drug dosage safety results
    dosageWarnings: {
      type:    [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // Plain-English clinical summary
    clinicalExplanation: {
      type:  String,
      trim:  true,
    },

    // Evidence-based recommendations list
    recommendations: {
      type:    [String],
      default: [],
    },

    // Whether OCR was used to extract medications from the file
    ocrExtracted: {
      type:    Boolean,
      default: false,
    },

    // Medications extracted by OCR (may differ from manually entered)
    extractedMedications: {
      type:    [String],
      default: [],
    },

    // SHAP feature importance values (for Explainability tab)
    shapValues: {
      type:    mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Score breakdown (deductions detail)
    scoreBreakdown: {
      type:    mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Multi-Drug Engine results
    combinationAnalysis: {
      type:    [mongoose.Schema.Types.Mixed],
      default: [],
    },

    alternativeMedicines: {
      type:    [mongoose.Schema.Types.Mixed],
      default: [],
    },

    emergencyRecommendations: {
      type:    [String],
      default: [],
    },

    // Timestamp of analysis
    analyzedAt: {
      type:    Date,
      default: null,
    },

    // ── ML Dosage Safety Predictions ─────────────────────────────────────────
    // Stored after /cdss/dosage-safety/batch is run on a prescription.
    dosageSafetyPredictions: {
      // Overall risk level across all medications in the prescription
      overallRiskLevel: {
        type: String,
        enum: ['SAFE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL', 'UNKNOWN'],
      },

      // ML ensemble confidence index (0–4)
      overallRiskIndex: { type: Number, min: 0, max: 4 },

      // Per-drug ML prediction results (array of prediction objects)
      individualPredictions: {
        type:    [mongoose.Schema.Types.Mixed],
        default: [],
      },

      // Drug names flagged as emergency by ML models
      emergencyDrugs: { type: [String], default: [] },

      // Drug names flagged as toxic by ML models
      toxicDrugs: { type: [String], default: [] },

      // Whether any drug triggered an emergency flag
      hasEmergency: { type: Boolean, default: false },

      // Whether any drug is predicted to be at toxic dose levels
      hasToxic: { type: Boolean, default: false },

      // Total daily dose across all medications (mg)
      totalDailyDoseMg: { type: Number },

      // Whether predictions came from ML models (true) or rule-based fallback (false)
      mlAvailable: { type: Boolean, default: false },

      // Timestamp of dosage safety analysis
      predictedAt: { type: Date, default: null },
    },
  },

  // ── Status ───────────────────────────────────────────────────────────────────

  // Soft-delete flag — set to false instead of removing the document
  isActive: {
    type:    Boolean,
    default: true,
    index:   true,
  },

  // ── Timestamps ──────────────────────────────────────────────────────────────
  createdAt: {
    type:    Date,
    default: Date.now,
  },
});

// ── Compound Indexes ──────────────────────────────────────────────────────────
// Speeds up the most common query: all active records for a given patient
MedicalRecordSchema.index({ patientId: 1, isActive: 1, createdAt: -1 });

// Allows the blockchain sync service to look up records by patient wallet address
MedicalRecordSchema.index({ patientWalletAddress: 1 });

// Allows full-text search on notes field
MedicalRecordSchema.index({ notes: 'text', fileName: 'text' });

// Index for CDSS dashboard queries (records with AI analysis, sorted by score)
MedicalRecordSchema.index({ patientId: 1, 'aiAnalysis.severity': 1, createdAt: -1 });
MedicalRecordSchema.index({ 'aiAnalysis.safetyScore': 1 });

// ── Virtual: formattedFileSize ────────────────────────────────────────────────
// Returns a human-readable file size string ("1.23 MB" / "512 KB")
MedicalRecordSchema.virtual('formattedFileSize').get(function () {
  if (!this.fileSize) return 'Unknown';
  if (this.fileSize >= 1024 * 1024) {
    return `${(this.fileSize / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(this.fileSize / 1024).toFixed(1)} KB`;
});

// ── Virtual: isConfirmed ──────────────────────────────────────────────────────
// True once the blockchain transaction hash has been set
MedicalRecordSchema.virtual('isConfirmed').get(function () {
  return Boolean(this.blockchainTxHash);
});

// Ensure virtuals appear in JSON and object serialisation
MedicalRecordSchema.set('toJSON',   { virtuals: true });
MedicalRecordSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);
