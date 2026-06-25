// medichain/backend/models/User.js
// Unified Mongoose schema for Patient, Doctor, and Hospital users.
// Role-specific fields are optional and validated in application logic.

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const SALT_ROUNDS = 12;

const UserSchema = new mongoose.Schema({

  // ── Core Identity ───────────────────────────────────────────────────────────
  name: {
    type:      String,
    required:  [true, 'Name is required'],
    trim:      true,
    minlength: [2, 'Name must be at least 2 characters'],
  },

  email: {
    type:      String,
    required:  [true, 'Email is required'],
    unique:    true,
    lowercase: true,
    trim:      true,
    // Lowercase before testing — Mongoose applies setters after validators
    validate: {
      validator: (v) => /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(
        (v || '').toLowerCase().trim()
      ),
      message: (props) => `${props.value} is not a valid email address`,
    },
  },

  password: {
    type:      String,
    required:  [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select:    false, // Never returned in query results by default
  },

  role: {
    type:     String,
    required: [true, 'Role is required'],
    enum:     {
      values:  ['patient', 'doctor', 'hospital'],
      message: '{VALUE} is not a valid role',
    },
  },

  // ── Blockchain / Wallet ─────────────────────────────────────────────────────
  walletAddress: {
    type:   String,
    trim:   true,
    unique: true,
    sparse: true, // Allows multiple null values (wallet not yet linked)
    // Ethereum address format: 0x + 40 hex chars
    validate: {
      validator: (v) => !v || /^0x[a-fA-F0-9]{40}$/.test(v),
      message:   'Wallet address must be a valid Ethereum address (0x…)',
    },
  },

  isWalletLinked: {
    type:    Boolean,
    default: false,
  },

  // True after patient has called registerPatient() on the smart contract
  isBlockchainRegistered: {
    type:    Boolean,
    default: false,
  },

  // ── Patient-Only Fields ─────────────────────────────────────────────────────
  bloodGroup: {
    type: String,
    enum: {
      values:  ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      message: '{VALUE} is not a recognised blood group',
    },
  },

  allergies: {
    type:    [String],
    default: [],
  },

  chronicConditions: {
    type:    [String],
    default: [],
  },

  dateOfBirth: {
    type: Date,
  },

  phone: {
    type: String,
    trim: true,
  },

  // ── Doctor-Only Fields ──────────────────────────────────────────────────────
  specialization: {
    type: String,
    trim: true,
  },

  hospitalName: {
    type: String,
    trim: true,
  },

  licenseNumber: {
    type:   String,
    trim:   true,
    sparse: true, // Unique but only among docs that have this field
  },

  yearsExperience: {
    type: Number,
    min:  [0, 'Experience cannot be negative'],
  },

  // ── Timestamps ──────────────────────────────────────────────────────────────
  createdAt: {
    type:    Date,
    default: Date.now,
  },

  updatedAt: {
    type:    Date,
    default: Date.now,
  },
});

// ── Indexes ──────────────────────────────────────────────────────────────────
// NOTE: email and walletAddress already have unique:true on their field definitions,
// which implicitly creates an index. Adding schema.index() for them again causes
// Mongoose duplicate-index warnings — so only define the extras here.
UserSchema.index({ role: 1 });

// ── Pre-save Hook: hash password when it is new or modified ───────────────────
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt    = await bcrypt.genSalt(SALT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Pre-save Hook: update the updatedAt timestamp on every save ───────────────
UserSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

// ── Instance Method: comparePassword ─────────────────────────────────────────
// Usage:  const ok = await user.comparePassword(req.body.password);
UserSchema.methods.comparePassword = async function (candidatePassword) {
  // 'this.password' may not be selected — callers must use .select('+password')
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance Method: toJSON ───────────────────────────────────────────────────
// Strip sensitive fields when the document is serialised (e.g., in API responses)
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

// ── Static Method: findByWallet ───────────────────────────────────────────────
// Usage:  const user = await User.findByWallet('0xAbC...');
UserSchema.statics.findByWallet = function (walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

module.exports = mongoose.model('User', UserSchema);
