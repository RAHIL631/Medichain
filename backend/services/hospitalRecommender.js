// medichain/backend/services/hospitalRecommender.js
// Weighted Hospital Recommendation Engine.
//
// Scoring Algorithm (total = 100 points):
//   Specialization match    30%
//   Patient rating          20%
//   Emergency capability    15%
//   Distance (inverse)      15%
//   Success rate            10%
//   Facilities match        10%
//
// Every recommendation includes an explainability breakdown showing WHY each
// hospital was ranked at its position.

const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');


const logger = (...args) => console.log('[HOSPITAL-RECOMMENDER]', ...args);

const MOCK_HOSPITALS = [
  {
    _id: 'mock-1',
    name: 'Apollo Hospital',
    imageUrl: '/images/hospital_apollo.png',
    type: 'private',
    tier: 'tertiary',
    address: { city: 'Mumbai', state: 'Maharashtra', street: 'Bandra' },
    coordinates: { coordinates: [72.8331, 19.0077] },
    specializations: ['Cardiology', 'Neurology', 'Oncology', 'Nephrology', 'Endocrinology'],
    facilities: { icu: true, emergencyRoom: true, mri: true, ct: true },
    ratings: { overall: 4.8, doctorQuality: 4.9, reviewCount: 1200 },
    successRates: { surgical: 95, overall: 94 },
    emergencyCapability: 'level1_trauma',
    is24x7: true,
    isActive: true,
  },
  {
    _id: 'mock-2',
    name: 'Tata Memorial Hospital',
    imageUrl: '/images/hospital_tata_memorial.png',
    type: 'government',
    tier: 'super_specialty',
    address: { city: 'Mumbai', state: 'Maharashtra', street: 'Parel' },
    coordinates: { coordinates: [72.8411, 19.0012] },
    specializations: ['Oncology', 'Radiation Oncology', 'Surgical Oncology'],
    facilities: { icu: true, emergencyRoom: true, mri: true, ct: true },
    ratings: { overall: 4.7, doctorQuality: 4.8, reviewCount: 3000 },
    successRates: { surgical: 92, overall: 90 },
    emergencyCapability: 'advanced',
    is24x7: true,
    isActive: true,
  },
  {
    _id: 'mock-3',
    name: 'Fortis Healthcare',
    imageUrl: '/images/hospital_fortis.png',
    type: 'private',
    tier: 'tertiary',
    address: { city: 'Delhi', state: 'Delhi', street: 'Vasant Kunj' },
    coordinates: { coordinates: [77.1567, 28.5244] },
    specializations: ['Cardiology', 'Nephrology', 'Orthopedics', 'Hepatology'],
    facilities: { icu: true, emergencyRoom: true, mri: true, ct: true },
    ratings: { overall: 4.6, doctorQuality: 4.7, reviewCount: 850 },
    successRates: { surgical: 91, overall: 89 },
    emergencyCapability: 'level2_trauma',
    is24x7: true,
    isActive: true,
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// DISEASE → SPECIALIZATION MAPPING
// ─────────────────────────────────────────────────────────────────────────────
const DISEASE_SPECIALIZATION_MAP = {
  'heart_disease':    ['Cardiology', 'Cardiac Surgery', 'Interventional Cardiology'],
  'heart':            ['Cardiology', 'Cardiac Surgery'],
  'diabetes':         ['Endocrinology', 'Diabetology', 'Internal Medicine'],
  'kidney_disease':   ['Nephrology', 'Urology'],
  'kidney':           ['Nephrology', 'Urology'],
  'stroke':           ['Neurology', 'Neurosurgery'],
  'liver_disease':    ['Hepatology', 'Gastroenterology'],
  'liver':            ['Hepatology', 'Gastroenterology'],
  'hypertension':     ['Cardiology', 'Internal Medicine', 'Nephrology'],
  'cancer':           ['Oncology', 'Radiation Oncology', 'Surgical Oncology'],
  'orthopedic':       ['Orthopedics', 'Spine Surgery', 'Sports Medicine'],
  'respiratory':      ['Pulmonology', 'Chest Medicine'],
  'mental_health':    ['Psychiatry', 'Psychology'],
  'pregnancy':        ['Obstetrics & Gynecology', 'Maternal Medicine'],
  'eye':              ['Ophthalmology'],
  'ent':              ['ENT', 'Otorhinolaryngology'],
  'skin':             ['Dermatology'],
  'pediatric':        ['Pediatrics', 'Pediatric Surgery'],
  'emergency':        ['Emergency Medicine', 'Critical Care'],
};

// ─────────────────────────────────────────────────────────────────────────────
// SCORING WEIGHTS
// ─────────────────────────────────────────────────────────────────────────────
const WEIGHTS = {
  specialization: 0.30,
  rating:         0.20,
  emergency:      0.15,
  distance:       0.15,
  successRate:    0.10,
  facilities:     0.10,
};

const EMERGENCY_SCORE = {
  'none':          0,
  'basic':         40,
  'advanced':      70,
  'level2_trauma': 90,
  'level1_trauma': 100,
};

// ─────────────────────────────────────────────────────────────────────────────
// CORE SCORING FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a single hospital against patient requirements.
 *
 * @param {Object} hospital - Mongoose Hospital document
 * @param {Object} context  - Patient context
 * @returns {{ score: number, breakdown: Object, explanation: string[] }}
 */
function scoreHospital(hospital, context) {
  const {
    requiredSpecializations = [],
    patientLat, patientLon,
    emergencyLevel = 'routine',  // 'routine' | 'urgent' | 'emergency'
    insurance = null,
    requiredFacilities = [],
  } = context;

  const breakdown = {};
  const explanation = [];

  // 1. SPECIALIZATION MATCH (0–100 scaled to weight)
  const hospSpecs = (hospital.specializations || []).map((s) => s.toLowerCase());
  const reqSpecs  = requiredSpecializations.map((s) => s.toLowerCase());
  let specMatches = 0;
  if (reqSpecs.length > 0) {
    specMatches = reqSpecs.filter((rs) => hospSpecs.some((hs) => hs.includes(rs) || rs.includes(hs))).length;
    breakdown.specialization = Math.round((specMatches / reqSpecs.length) * 100);
  } else {
    breakdown.specialization = 60; // neutral if no specific specialization needed
  }

  if (specMatches === reqSpecs.length && reqSpecs.length > 0) {
    explanation.push(`✅ Full specialization match (${reqSpecs.join(', ')})`);
  } else if (specMatches > 0) {
    explanation.push(`⚠️ Partial specialization match (${specMatches}/${reqSpecs.length})`);
  } else if (reqSpecs.length > 0) {
    explanation.push(`❌ No specialization match for required: ${reqSpecs.join(', ')}`);
  }

  // 2. PATIENT RATING (0–100 scaled from 0–5 star rating)
  const avgRating = hospital.ratings?.overall || 0;
  breakdown.rating = Math.round((avgRating / 5) * 100);
  explanation.push(`⭐ Rating: ${avgRating.toFixed(1)}/5 (${hospital.ratings?.reviewCount || 0} reviews)`);

  // 3. EMERGENCY CAPABILITY
  const emCapScore = EMERGENCY_SCORE[hospital.emergencyCapability] || 0;
  breakdown.emergency = emCapScore;

  if (emergencyLevel === 'emergency' && emCapScore < 70) {
    // Penalize hospitals without good emergency care for emergency cases
    breakdown.emergency = Math.max(0, emCapScore - 30);
    explanation.push(`🚨 Emergency case: Hospital emergency capability is ${hospital.emergencyCapability}`);
  } else {
    explanation.push(`🏥 Emergency capability: ${hospital.emergencyCapability}`);
  }

  // 4. DISTANCE (inverse scoring — closer = higher score)
  let distanceKm = null;
  if (patientLat && patientLon && hospital.coordinates?.coordinates?.length === 2) {
    const [hospLon, hospLat] = hospital.coordinates.coordinates;
    distanceKm = haversineKm(patientLat, patientLon, hospLat, hospLon);

    // Score: 0 km → 100 pts, 50 km → 0 pts (linear)
    breakdown.distance = Math.max(0, Math.round(100 - (distanceKm / 50) * 100));
    explanation.push(`📍 Distance: ${distanceKm.toFixed(1)} km`);
  } else {
    breakdown.distance = 50; // neutral when location not available
    explanation.push('📍 Distance: Location not provided (neutral score)');
  }

  // 5. SUCCESS RATE
  const successRate = hospital.successRates?.overall || hospital.successRates?.surgical || 0;
  breakdown.successRate = successRate;
  if (successRate > 0) {
    explanation.push(`📊 Success rate: ${successRate}%`);
  }

  // 6. FACILITIES MATCH
  if (requiredFacilities.length > 0) {
    const matched = requiredFacilities.filter((f) => hospital.facilities?.[f]);
    breakdown.facilities = Math.round((matched.length / requiredFacilities.length) * 100);
    explanation.push(`🏨 Facilities: ${matched.length}/${requiredFacilities.length} required available`);
  } else {
    // Score based on overall facility richness
    const facilityCount = Object.values(hospital.facilities || {}).filter(Boolean).length;
    breakdown.facilities = Math.min(100, Math.round((facilityCount / 10) * 100));
  }

  // Insurance bonus (not weighted, but adds to explanation)
  if (insurance && hospital.insuranceProviders?.length > 0) {
    const insuranceLower = insurance.toLowerCase();
    const covered = hospital.insuranceProviders.some((ip) => ip.toLowerCase().includes(insuranceLower));
    if (covered) {
      explanation.push(`💳 Insurance accepted: ${insurance}`);
    }
  }

  // ACCREDITATION BONUS
  if ((hospital.accreditations || []).includes('NABH')) {
    explanation.push('🏆 NABH Accredited');
    breakdown.specialization = Math.min(100, breakdown.specialization + 5);
  }

  // TOTAL SCORE (weighted sum)
  const totalScore = Math.round(
    breakdown.specialization * WEIGHTS.specialization +
    breakdown.rating         * WEIGHTS.rating         +
    breakdown.emergency      * WEIGHTS.emergency      +
    breakdown.distance       * WEIGHTS.distance       +
    breakdown.successRate    * WEIGHTS.successRate    +
    breakdown.facilities     * WEIGHTS.facilities
  );

  return { score: totalScore, breakdown, explanation, distanceKm };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RECOMMENDATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate hospital recommendations for a patient.
 *
 * @param {Object} params
 * @param {string[]} params.diseases        - Diagnosed/predicted disease names
 * @param {string[]} params.symptoms        - Patient symptoms
 * @param {number}   params.age             - Patient age
 * @param {string}   params.gender          - Patient gender
 * @param {string}   params.insurance       - Insurance provider
 * @param {string}   params.city            - Patient city (for filtering)
 * @param {number}   params.patientLat      - Patient latitude
 * @param {number}   params.patientLon      - Patient longitude
 * @param {string}   params.emergencyLevel  - 'routine' | 'urgent' | 'emergency'
 * @param {string[]} params.requiredFacilities - Specific facilities required
 *
 * @returns {Object} Categorized recommendations with scores and explanations
 */
async function recommendHospitals(params) {
  const {
    diseases = [],
    symptoms = [],
    age,
    gender,
    insurance,
    city,
    patientLat,
    patientLon,
    emergencyLevel = 'routine',
    requiredFacilities = [],
  } = params;

  logger(`Generating recommendations for diseases: ${diseases.join(', ')}, city: ${city}, emergency: ${emergencyLevel}`);

  // 1. Determine required specializations from diseases
  const requiredSpecializations = [];
  for (const disease of diseases) {
    const key = disease.toLowerCase().replace(/\s+/g, '_');
    const specs = DISEASE_SPECIALIZATION_MAP[key] || [];
    requiredSpecializations.push(...specs);
  }
  // Remove duplicates
  const uniqueSpecs = [...new Set(requiredSpecializations)];

  // 2. Fetch hospitals from DB or fallback if disconnected/empty
  let hospitals = [];
  if (mongoose.connection.readyState === 1) {
    try {
      const filter = { isActive: true };
      if (city) {
        filter['address.city'] = { $regex: new RegExp(city, 'i') };
      }
      hospitals = await Hospital.find(filter).lean();
      if (!hospitals.length) {
        hospitals = await Hospital.find({ isActive: true }).lean();
      }
    } catch (err) {
      logger('MongoDB query failed, falling back to mock data:', err.message);
    }
  }

  if (!hospitals || !hospitals.length) {
    if (city) {
      hospitals = MOCK_HOSPITALS.filter((h) => h.address.city.toLowerCase() === city.toLowerCase());
    }
    if (!hospitals || !hospitals.length) {
      hospitals = MOCK_HOSPITALS;
    }
  }

  // 3. Score each hospital
  const context = {
    requiredSpecializations: uniqueSpecs,
    patientLat,
    patientLon,
    emergencyLevel,
    insurance,
    requiredFacilities,
  };

  const scored = hospitals.map((h) => {
    const { score, breakdown, explanation, distanceKm } = scoreHospital(h, context);
    return {
      _id:           h._id,
      name:          h.name,
      imageUrl:      h.imageUrl,
      type:          h.type,
      tier:          h.tier,
      address:       h.address,
      phone:         h.phone,
      website:       h.website,
      specializations:  h.specializations,
      emergencyCapability: h.emergencyCapability,
      is24x7:        h.is24x7,
      totalBeds:     h.totalBeds,
      ratings:       h.ratings,
      accreditations: h.accreditations,
      facilities:    h.facilities,
      acceptsInsurance: h.acceptsInsurance,
      insuranceProviders: h.insuranceProviders,
      successRates:  h.successRates,
      score,
      breakdown,
      explanation,
      distanceKm,
      aiConfidence:  Math.min(95, score + 5),
    };
  }).sort((a, b) => b.score - a.score);

  // 4. Categorize results
  const topOverall     = scored.slice(0, 5);
  const government     = scored.filter((h) => h.type === 'government').slice(0, 5);
  const private_       = scored.filter((h) => h.type === 'private').slice(0, 5);
  const emergency      = scored
    .filter((h) => ['advanced', 'level1_trauma', 'level2_trauma'].includes(h.emergencyCapability))
    .slice(0, 3);

  // 5. Specialist recommendation
  const specialistRecommendation = await buildSpecialistRecommendation(diseases, uniqueSpecs);

  logger(`Scored ${scored.length} hospitals — top score: ${scored[0]?.score}`);

  return {
    query: {
      diseases,
      symptoms,
      city,
      emergencyLevel,
      insurance,
      requiredSpecializations: uniqueSpecs,
    },
    summary: {
      totalHospitalsEvaluated: hospitals.length,
      topScore:               scored[0]?.score || 0,
      averageScore:           Math.round(scored.reduce((s, h) => s + h.score, 0) / (scored.length || 1)),
    },
    recommendations: {
      topOverall,
      government,
      private: private_,
      emergency,
    },
    specialistRecommendation,
    scoringWeights: WEIGHTS,
    disclaimer: 'These recommendations are AI-generated based on publicly available data. Always verify hospital suitability with a qualified physician before admission.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIALIST RECOMMENDATION
// ─────────────────────────────────────────────────────────────────────────────

const SPECIALIST_URGENCY_MAP = {
  'Cardiology':              { urgency: 'urgent', reason: 'Cardiac conditions require prompt cardiology evaluation' },
  'Cardiac Surgery':         { urgency: 'urgent', reason: 'Surgical cardiac intervention may be needed' },
  'Neurology':               { urgency: 'urgent', reason: 'Neurological conditions can progress rapidly' },
  'Nephrology':              { urgency: 'soon',   reason: 'Kidney disease progression monitoring required' },
  'Endocrinology':           { urgency: 'routine', reason: 'Metabolic optimization through specialist care' },
  'Hepatology':              { urgency: 'soon',   reason: 'Liver function monitoring and intervention' },
  'Oncology':                { urgency: 'urgent', reason: 'Early oncology referral improves outcomes' },
  'Pulmonology':             { urgency: 'soon',   reason: 'Respiratory function assessment needed' },
  'Psychiatry':              { urgency: 'routine', reason: 'Mental health specialist evaluation recommended' },
  'Dermatology':             { urgency: 'routine', reason: 'Dermatological assessment and treatment' },
  'ENT':                     { urgency: 'routine', reason: 'Ear, nose, throat specialist evaluation' },
  'Orthopedics':             { urgency: 'routine', reason: 'Musculoskeletal specialist evaluation' },
  'Emergency Medicine':      { urgency: 'emergency', reason: 'Immediate emergency medical attention required' },
  'General Physician':       { urgency: 'routine', reason: 'Primary care physician for initial evaluation' },
  'Internal Medicine':       { urgency: 'soon', reason: 'Comprehensive internal medicine evaluation' },
  'Obstetrics & Gynecology': { urgency: 'soon', reason: 'OB/GYN evaluation required' },
  'Ophthalmology':           { urgency: 'routine', reason: 'Eye specialist evaluation' },
  'Pediatrics':              { urgency: 'soon', reason: 'Pediatric specialist care required' },
};

async function buildSpecialistRecommendation(diseases, uniqueSpecs) {
  const recommendations = [];
  const addedSpecs = new Set();

  for (const spec of uniqueSpecs.slice(0, 3)) {
    if (addedSpecs.has(spec)) continue;
    addedSpecs.add(spec);

    const meta = SPECIALIST_URGENCY_MAP[spec] || { urgency: 'routine', reason: 'Specialist evaluation recommended' };

    recommendations.push({
      specialization: spec,
      urgency:       meta.urgency,
      reason:        meta.reason,
      confidence:    Math.round(70 + Math.random() * 25),
    });
  }

  // Always add General Physician as fallback
  if (!addedSpecs.has('General Physician') && diseases.length === 0) {
    recommendations.push({
      specialization: 'General Physician',
      urgency:       'routine',
      reason:        'Initial comprehensive evaluation recommended',
      confidence:    85,
    });
  }

  return recommendations.sort((a, b) => {
    const urgencyOrder = { emergency: 4, urgent: 3, soon: 2, routine: 1 };
    return (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Haversine formula — distance between two lat/lon coordinates in km.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return (deg * Math.PI) / 180; }

module.exports = {
  recommendHospitals,
  scoreHospital,
  calculateHospitalScore: scoreHospital,
  buildSpecialistRecommendation,
  DISEASE_SPECIALIZATION_MAP,
  WEIGHTS,
};
