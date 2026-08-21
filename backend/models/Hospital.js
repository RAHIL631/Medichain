// medichain/backend/models/Hospital.js
// Hospital MongoDB model for the Hospital Recommendation Engine.
// Stores hospital metadata used by the weighted scoring algorithm.

const mongoose = require('mongoose');

const HospitalSchema = new mongoose.Schema({
  // ── Identity ────────────────────────────────────────────────────────────────
  name: {
    type:     String,
    required: [true, 'Hospital name is required'],
    trim:     true,
    index:    true,
  },
  imageUrl: {
    type: String,
    trim: true,
  },
  registrationNumber: {
    type:   String,
    trim:   true,
    unique: true,
    sparse: true,
  },
  type: {
    type:     String,
    required: true,
    enum:     ['government', 'private', 'trust', 'military', 'ayush'],
    index:    true,
  },
  tier: {
    type: String,
    enum: ['primary', 'secondary', 'tertiary', 'super_specialty'],
    default: 'secondary',
  },

  // ── Location ────────────────────────────────────────────────────────────────
  address: {
    street:   String,
    city:     { type: String, required: true, index: true },
    district: String,
    state:    { type: String, required: true },
    pincode:  String,
    country:  { type: String, default: 'India' },
  },
  coordinates: {
    // GeoJSON Point for geospatial queries
    type:        { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },

  // ── Contact ─────────────────────────────────────────────────────────────────
  phone:   { type: String, trim: true },
  email:   { type: String, trim: true, lowercase: true },
  website: { type: String, trim: true },

  // ── Medical Capabilities ────────────────────────────────────────────────────
  specializations: {
    type:  [String],
    // e.g. ['Cardiology', 'Neurology', 'Orthopedics', 'Oncology']
  },
  departments: [String],
  facilities: {
    // Key clinical capabilities
    icu:               { type: Boolean, default: false },
    iccu:              { type: Boolean, default: false },
    nicu:              { type: Boolean, default: false },
    emergencyRoom:     { type: Boolean, default: false },
    trauma:            { type: Boolean, default: false },
    bloodBank:         { type: Boolean, default: false },
    dialysis:          { type: Boolean, default: false },
    cathLab:           { type: Boolean, default: false },
    mri:               { type: Boolean, default: false },
    ct:                { type: Boolean, default: false },
    petScan:           { type: Boolean, default: false },
    roboticSurgery:    { type: Boolean, default: false },
    bonemarrowTransplant: { type: Boolean, default: false },
    organTransplant:   { type: Boolean, default: false },
    pharmacy24h:       { type: Boolean, default: true },
    ambulance:         { type: Boolean, default: true },
    telemedicine:      { type: Boolean, default: false },
  },
  totalBeds:       { type: Number, min: 0 },
  icuBeds:         { type: Number, min: 0, default: 0 },
  doctorCount:     { type: Number, min: 0, default: 0 },

  // ── Quality Metrics ─────────────────────────────────────────────────────────
  ratings: {
    overall:             { type: Number, min: 0, max: 5, default: 0 },
    doctorQuality:       { type: Number, min: 0, max: 5, default: 0 },
    infrastructure:      { type: Number, min: 0, max: 5, default: 0 },
    cleanliness:         { type: Number, min: 0, max: 5, default: 0 },
    waitTime:            { type: Number, min: 0, max: 5, default: 0 },
    patientCare:         { type: Number, min: 0, max: 5, default: 0 },
    reviewCount:         { type: Number, min: 0, default: 0 },
  },
  accreditations: [String], // e.g. ['NABH', 'JCI', 'ISO 9001']
  successRates: {
    cardiac:     { type: Number, min: 0, max: 100 },
    surgical:    { type: Number, min: 0, max: 100 },
    emergency:   { type: Number, min: 0, max: 100 },
    overall:     { type: Number, min: 0, max: 100 },
  },

  // ── Financial ───────────────────────────────────────────────────────────────
  acceptsInsurance: { type: Boolean, default: true },
  insuranceProviders: [String],
  averageCostPerDay: { type: Number, min: 0 },

  // ── Emergency ────────────────────────────────────────────────────────────────
  emergencyCapability: {
    type:    String,
    enum:    ['none', 'basic', 'advanced', 'level1_trauma', 'level2_trauma'],
    default: 'basic',
  },
  is24x7: { type: Boolean, default: false },
  averageResponseTimeMinutes: { type: Number, min: 0 },

  // ── Status ──────────────────────────────────────────────────────────────────
  isActive:   { type: Boolean, default: true, index: true },
  isVerified: { type: Boolean, default: false },
  lastVerifiedAt: { type: Date },

  // ── Timestamps ──────────────────────────────────────────────────────────────
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Geospatial index for location-based queries
HospitalSchema.index({ coordinates: '2dsphere' });
HospitalSchema.index({ 'address.city': 1, 'address.state': 1 });
HospitalSchema.index({ specializations: 1 });
HospitalSchema.index({ type: 1, isActive: 1 });
HospitalSchema.index({ 'ratings.overall': -1 });

// Pre-save: update updatedAt
HospitalSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

// Virtual: formatted address
HospitalSchema.virtual('fullAddress').get(function () {
  const a = this.address;
  return [a.street, a.city, a.district, a.state, a.pincode].filter(Boolean).join(', ');
});

HospitalSchema.set('toJSON',   { virtuals: true });
HospitalSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Hospital', HospitalSchema);
