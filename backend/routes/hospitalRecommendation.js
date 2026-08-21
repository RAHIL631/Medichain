// medichain/backend/routes/hospitalRecommendation.js
// Hospital and Specialist Recommendation API.
// Uses the weighted scoring engine in hospitalRecommender.js.

const express = require('express');
const router  = express.Router();
const { body, query, validationResult } = require('express-validator');

const { protect, authorize } = require('../middleware/auth');
const { recommendHospitals, buildSpecialistRecommendation, DISEASE_SPECIALIZATION_MAP } = require('../services/hospitalRecommender');
const Hospital = require('../models/Hospital');

const logger = (...args) => console.log('[HOSPITAL-ROUTES]', ...args);

// ── Validation helper ─────────────────────────────────────────────────────────
function validateRequest(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  return null;
}

// ── POST /api/hospital-recommendation/recommend ───────────────────────────────
/**
 * @route   POST /api/hospital-recommendation/recommend
 * @desc    Get ranked hospital recommendations with weighted scoring and explainability
 * @body    { diseases, symptoms, age, gender, insurance, city, lat, lon, emergencyLevel, facilities }
 * @access  Private
 */
router.post('/recommend', protect, [
  body('diseases').optional().isArray(),
  body('emergencyLevel').optional().isIn(['routine', 'urgent', 'emergency']),
  body('age').optional().isInt({ min: 0, max: 130 }),
], async (req, res) => {
  const validationErr = validateRequest(req, res);
  if (validationErr) return;

  try {
    const {
      diseases        = [],
      symptoms        = [],
      age,
      gender,
      insurance,
      city,
      lat,
      lon,
      emergencyLevel  = 'routine',
      requiredFacilities = [],
    } = req.body;

    logger(`Recommendation request from user ${req.user._id} — diseases: ${diseases.join(', ')}`);

    const result = await recommendHospitals({
      diseases,
      symptoms,
      age,
      gender,
      insurance,
      city,
      patientLat:   lat  ? parseFloat(lat)  : null,
      patientLon:   lon  ? parseFloat(lon)  : null,
      emergencyLevel,
      requiredFacilities,
    });

    res.json(result);
  } catch (err) {
    logger('Recommendation error:', err.message);
    res.status(500).json({ error: 'Recommendation engine error', details: err.message });
  }
});

// ── POST /api/hospital-recommendation/specialist ──────────────────────────────
/**
 * @route   POST /api/hospital-recommendation/specialist
 * @desc    Get specialist recommendations for given diseases (with explanation)
 * @body    { diseases: string[] }
 * @access  Private
 */
router.post('/specialist', protect, [
  body('diseases').isArray({ min: 1 }).withMessage('diseases array is required'),
], async (req, res) => {
  const validationErr = validateRequest(req, res);
  if (validationErr) return;

  try {
    const { diseases } = req.body;

    // Build required specializations from diseases
    const uniqueSpecs = [];
    const seen = new Set();
    for (const d of diseases) {
      const key = d.toLowerCase().replace(/\s+/g, '_');
      const specs = DISEASE_SPECIALIZATION_MAP[key] || [];
      for (const s of specs) {
        if (!seen.has(s)) { seen.add(s); uniqueSpecs.push(s); }
      }
    }

    const recommendations = await buildSpecialistRecommendation(diseases, uniqueSpecs);

    res.json({
      diseases,
      specializations: uniqueSpecs,
      recommendations,
      disclaimer: 'Specialist recommendations are AI-generated. Always confirm with a primary care physician.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hospital-recommendation/hospitals ────────────────────────────────
/**
 * @route   GET /api/hospital-recommendation/hospitals
 * @desc    List all hospitals (with filtering by city, type, specialization)
 * @access  Private
 */
router.get('/hospitals', protect, async (req, res) => {
  try {
    const { city, type, specialization, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true };
    if (city)           filter['address.city']  = { $regex: new RegExp(city, 'i') };
    if (type)           filter.type             = type;
    if (specialization) filter.specializations  = { $in: [new RegExp(specialization, 'i')] };

    const [hospitals, total] = await Promise.all([
      Hospital.find(filter)
        .select('-__v')
        .sort({ 'ratings.overall': -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Hospital.countDocuments(filter),
    ]);

    res.json({
      hospitals,
      total,
      page:       Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/hospital-recommendation/hospitals/:id ───────────────────────────
/**
 * @route   GET /api/hospital-recommendation/hospitals/:id
 * @desc    Get single hospital details
 * @access  Private
 */
router.get('/hospitals/:id', protect, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).lean();
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ hospital });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/hospital-recommendation/hospitals ───────────────────────────────
/**
 * @route   POST /api/hospital-recommendation/hospitals
 * @desc    Create a hospital (admin only)
 * @access  Admin
 */
router.post('/hospitals', protect, authorize('admin'), [
  body('name').notEmpty().withMessage('Hospital name is required'),
  body('type').isIn(['government', 'private', 'trust', 'military', 'ayush']),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('coordinates.coordinates').isArray({ min: 2, max: 2 }).withMessage('coordinates [lon, lat] required'),
], async (req, res) => {
  const validationErr = validateRequest(req, res);
  if (validationErr) return;

  try {
    const hospital = new Hospital(req.body);
    await hospital.save();
    res.status(201).json({ hospital, message: 'Hospital created' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Hospital with this registration number already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/hospital-recommendation/hospitals/:id ───────────────────────────
/**
 * @route   PUT /api/hospital-recommendation/hospitals/:id
 * @desc    Update hospital details (admin only)
 * @access  Admin
 */
router.put('/hospitals/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { returnDocument: 'after', runValidators: true }
    );
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ hospital, message: 'Hospital updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
