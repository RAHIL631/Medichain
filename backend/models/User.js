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
      values:  ['patient', 'doctor', 'hospital', 'admin'],
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

  // ── Unique Patient Identifier (MC-PAT-YYYY-XXXXXX) ─────────────────────────
  patientId: {
    type:   String,
    unique: true,
    sparse: true,
    trim:   true,
    index:  true,
    validate: {
      validator: (v) => !v || /^MC-PAT-\d{4}-[A-Z0-9]{6}$/i.test(v),
      message:   'Patient ID must follow format MC-PAT-YYYY-XXXXXX (e.g. MC-PAT-2026-000001)',
    },
  },

  dateOfBirth: {
    type: Date,
  },

  phone: {
    type: String,
    trim: true,
  },

  // ── Clinical Context (CDSS & EHR Health Parameters) ─────────────────────────
  clinicalContext: {
    age:               { type: Number, min: 0, max: 120 },
    weightKg:          { type: Number, min: 1, max: 500 },
    kidneyGfr:         { type: Number, min: 0, max: 200 },
    liverScore:        { type: Number, default: 0 },
    liverClass:        { type: String, enum: ['A', 'B', 'C'], default: 'A' },
    isPregnant:        { type: Boolean, default: false },
    pregnancyStatus:   { type: String, default: 'not_pregnant' },
    allergies:         { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    lastUpdated:       { type: Date, default: Date.now },
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

  // ── Account Security ────────────────────────────────────────────────────────
  // Brute-force lockout: track failed login attempts
  loginAttempts: {
    type:    Number,
    default: 0,
    select:  false,
  },
  lockUntil: {
    type:   Date,
    select: false,
  },

  // Email verification & OTP
  isEmailVerified: {
    type:    Boolean,
    default: false,
  },
  otpVerifyAttempts: {
    type:    Number,
    default: 0,
    select:  false,
  },
  otpLockUntil: {
    type:   Date,
    select: false,
  },
  emailVerifyToken: {
    type:   String,
    select: false,
  },
  emailVerifyExpires: {
    type:   Date,
    select: false,
  },

  // Password reset
  passwordResetToken: {
    type:   String,
    select: false,
  },
  passwordResetExpires: {
    type:   Date,
    select: false,
  },

  // Soft-delete / suspension
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

// ── Pre-save Hook: auto-generate unique Patient ID for patients ───────────────
function createPatientIdString() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `MC-PAT-${year}-${randomSuffix}`;
}

UserSchema.pre('save', async function () {
  if (this.role === 'patient' && !this.patientId) {
    let candidate = createPatientIdString();
    let isTaken = await mongoose.models.User?.findOne({ patientId: candidate });
    while (isTaken) {
      candidate = createPatientIdString();
      isTaken = await mongoose.models.User?.findOne({ patientId: candidate });
    }
    this.patientId = candidate;
  }
});

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

// ── Virtual: isLocked ─────────────────────────────────────────────────────────
UserSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── Instance Method: incrementLoginAttempts ───────────────────────────────────
// Call on each failed login. After MAX_ATTEMPTS, locks for LOCK_DURATION.
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
const LOCK_DURATION_MS   = parseInt(process.env.LOCK_DURATION_MINS || '15') * 60 * 1000;

UserSchema.methods.incrementLoginAttempts = async function () {
  // If a previous lock has expired, reset the counter first
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set:   { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  // Lock the account if this attempt hits the threshold
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCK_DURATION_MS) };
  }
  return this.updateOne(updates);
};

// ── Instance Method: resetLoginAttempts ───────────────────────────────────────
// Call on successful login to clear the counter and any lock.
UserSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set:   { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
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

// ── Static Method: findByPatientId ───────────────────────────────────────────
// Usage:  const user = await User.findByPatientId('MC-PAT-2026-000001');
UserSchema.statics.findByPatientId = function (patientId) {
  if (!patientId || typeof patientId !== 'string') return null;
  return this.findOne({
    patientId: { $regex: new RegExp(`^${patientId.trim()}$`, 'i') },
    role: 'patient',
  });
};

// ── Static Method: ensurePatientId (Migration helper for older users) ─────────
UserSchema.statics.ensurePatientId = async function (user) {
  if (!user || user.role !== 'patient' || user.patientId) return user?.patientId;
  
  let candidate = createPatientIdString();
  let isTaken = await this.findOne({ patientId: candidate });
  while (isTaken) {
    candidate = createPatientIdString();
    isTaken = await this.findOne({ patientId: candidate });
  }
  
  await this.findByIdAndUpdate(user._id, { patientId: candidate });
  user.patientId = candidate;
  return candidate;
};

module.exports = mongoose.model('User', UserSchema);
