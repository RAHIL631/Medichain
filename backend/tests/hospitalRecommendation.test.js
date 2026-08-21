// backend/tests/hospitalRecommendation.test.js
// Unit test for weighted scoring recommender service.

const assert = require('assert');
const { calculateHospitalScore, recommendHospitals } = require('../services/hospitalRecommender');

describe('Hospital Recommendation Service', () => {
  const mockHospital = {
    _id: 'hosp1',
    name: 'Tata Memorial Hospital',
    type: 'government',
    tier: 'super_specialty',
    address: { city: 'Mumbai', state: 'Maharashtra' },
    coordinates: { coordinates: [72.8331, 19.0077] },
    specializations: ['Oncology', 'Radiation Oncology'],
    facilities: { icu: true, emergencyRoom: true, mri: true, ct: true },
    ratings: { overall: 4.7, doctorQuality: 4.9, reviewCount: 3000 },
    accreditations: ['NABH', 'JCI'],
    successRates: { surgical: 92, overall: 89 },
    emergencyCapability: 'advanced',
    is24x7: true,
  };

  it('should calculate a score between 0 and 100', () => {
    const result = calculateHospitalScore(mockHospital, {
      diseases: ['cancer'],
      patientLat: 19.0000,
      patientLon: 72.8000,
      emergencyLevel: 'urgent',
    });

    assert(typeof result.score === 'number', 'score must be a number');
    assert(result.score >= 0 && result.score <= 100, 'score must be between 0 and 100');
    assert(result.breakdown, 'breakdown object must be present');
    assert(Array.isArray(result.explanation), 'explanation array must be present');
  });

  it('should return mock recommendations when DB is empty', async () => {
    const res = await recommendHospitals({ diseases: ['heart_disease'], city: 'Mumbai' });
    assert(res.recommendations, 'recommendations must exist');
    assert(Array.isArray(res.recommendations.topOverall), 'topOverall must be an array');
    assert(res.summary.totalHospitalsEvaluated > 0, 'total hospitals evaluated > 0');
  });
});
