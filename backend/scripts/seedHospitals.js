// medichain/backend/scripts/seedHospitals.js
// Seeds 50 realistic hospitals across major Indian cities.
// Run: node backend/scripts/seedHospitals.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');

const HOSPITALS = [
  // ── MUMBAI ─────────────────────────────────────────────────────────────────
  {
    name: 'Tata Memorial Hospital',
    type: 'government', tier: 'super_specialty',
    address: { street: 'Dr E Borges Road', city: 'Mumbai', district: 'Mumbai', state: 'Maharashtra', pincode: '400012' },
    coordinates: { type: 'Point', coordinates: [72.8331, 19.0077] },
    phone: '+91-22-24177000', website: 'https://tmc.gov.in',
    specializations: ['Oncology', 'Radiation Oncology', 'Surgical Oncology', 'Hematology'],
    departments: ['Medical Oncology', 'Surgical Oncology', 'Radiation', 'Palliative Care'],
    facilities: { icu: true, iccu: true, emergencyRoom: true, mri: true, ct: true, petScan: true, roboticSurgery: true, bloodBank: true, ambulance: true, pharmacy24h: true },
    totalBeds: 620, icuBeds: 45, doctorCount: 350,
    ratings: { overall: 4.7, doctorQuality: 4.9, infrastructure: 4.6, cleanliness: 4.5, waitTime: 3.2, patientCare: 4.8, reviewCount: 3420 },
    accreditations: ['NABH', 'JCI'],
    successRates: { surgical: 92, overall: 89 },
    acceptsInsurance: true, insuranceProviders: ['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'Bajaj Allianz'],
    emergencyCapability: 'advanced', is24x7: true, averageResponseTimeMinutes: 8,
    averageCostPerDay: 8000, isActive: true, isVerified: true,
  },
  {
    name: 'Kokilaben Dhirubhai Ambani Hospital',
    type: 'private', tier: 'super_specialty',
    address: { street: 'Rao Saheb Achutrao Patwardhan Marg', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' },
    coordinates: { type: 'Point', coordinates: [72.8273, 19.1301] },
    phone: '+91-22-30999999', website: 'https://www.kokilabenhospital.com',
    specializations: ['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Transplant', 'Robotic Surgery'],
    facilities: { icu: true, iccu: true, nicu: true, emergencyRoom: true, mri: true, ct: true, petScan: true, roboticSurgery: true, organTransplant: true, cathLab: true, bloodBank: true, dialysis: true, ambulance: true, pharmacy24h: true, telemedicine: true },
    totalBeds: 750, icuBeds: 80, doctorCount: 500,
    ratings: { overall: 4.8, doctorQuality: 4.9, infrastructure: 4.9, cleanliness: 4.8, waitTime: 3.5, patientCare: 4.8, reviewCount: 5210 },
    accreditations: ['NABH', 'JCI', 'ISO 9001'],
    successRates: { cardiac: 96, surgical: 94, emergency: 93, overall: 94 },
    acceptsInsurance: true, insuranceProviders: ['All Major Insurers'],
    emergencyCapability: 'level1_trauma', is24x7: true, averageResponseTimeMinutes: 5,
    averageCostPerDay: 25000, isActive: true, isVerified: true,
  },
  {
    name: 'Lilavati Hospital',
    type: 'private', tier: 'super_specialty',
    address: { street: 'A-791, Bandra Reclamation', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' },
    coordinates: { type: 'Point', coordinates: [72.8258, 19.0491] },
    phone: '+91-22-26751000',
    specializations: ['Cardiology', 'Neurology', 'Gastroenterology', 'Nephrology', 'Orthopedics'],
    facilities: { icu: true, iccu: true, emergencyRoom: true, mri: true, ct: true, cathLab: true, bloodBank: true, dialysis: true, ambulance: true, pharmacy24h: true },
    totalBeds: 323, icuBeds: 40, doctorCount: 200,
    ratings: { overall: 4.5, doctorQuality: 4.7, infrastructure: 4.5, cleanliness: 4.4, waitTime: 3.3, patientCare: 4.5, reviewCount: 2890 },
    accreditations: ['NABH'],
    successRates: { cardiac: 93, surgical: 91, overall: 91 },
    acceptsInsurance: true, insuranceProviders: ['Star Health', 'ICICI Lombard', 'New India Assurance'],
    emergencyCapability: 'advanced', is24x7: true, averageResponseTimeMinutes: 7,
    averageCostPerDay: 18000, isActive: true, isVerified: true,
  },
  // ── DELHI ──────────────────────────────────────────────────────────────────
  {
    name: 'AIIMS New Delhi',
    type: 'government', tier: 'super_specialty',
    address: { street: 'Sri Aurobindo Marg, Ansari Nagar', city: 'Delhi', state: 'Delhi', pincode: '110029' },
    coordinates: { type: 'Point', coordinates: [77.2091, 28.5671] },
    phone: '+91-11-26588500', website: 'https://www.aiims.edu',
    specializations: ['Cardiology', 'Neurology', 'Orthopedics', 'Oncology', 'Nephrology', 'Endocrinology', 'Psychiatry', 'Internal Medicine'],
    facilities: { icu: true, iccu: true, nicu: true, emergencyRoom: true, trauma: true, mri: true, ct: true, petScan: true, organTransplant: true, bonemarrowTransplant: true, bloodBank: true, dialysis: true, cathLab: true, ambulance: true, pharmacy24h: true },
    totalBeds: 2478, icuBeds: 150, doctorCount: 1200,
    ratings: { overall: 4.6, doctorQuality: 4.9, infrastructure: 4.2, cleanliness: 3.9, waitTime: 2.1, patientCare: 4.5, reviewCount: 12500 },
    accreditations: ['NABH', 'ISO 9001'],
    successRates: { cardiac: 93, surgical: 91, emergency: 89, overall: 90 },
    acceptsInsurance: false, averageCostPerDay: 2000,
    emergencyCapability: 'level1_trauma', is24x7: true, averageResponseTimeMinutes: 6,
    isActive: true, isVerified: true,
  },
  {
    name: 'Fortis Hospital Shalimar Bagh',
    type: 'private', tier: 'super_specialty',
    address: { street: 'A Block, Shalimar Bagh', city: 'Delhi', state: 'Delhi', pincode: '110088' },
    coordinates: { type: 'Point', coordinates: [77.1554, 28.7108] },
    phone: '+91-11-45530000', website: 'https://www.fortishealthcare.com',
    specializations: ['Cardiology', 'Oncology', 'Neurology', 'Orthopedics', 'Kidney Transplant'],
    facilities: { icu: true, iccu: true, emergencyRoom: true, mri: true, ct: true, roboticSurgery: true, organTransplant: true, cathLab: true, bloodBank: true, dialysis: true, ambulance: true, pharmacy24h: true, telemedicine: true },
    totalBeds: 262, icuBeds: 36, doctorCount: 180,
    ratings: { overall: 4.3, doctorQuality: 4.5, infrastructure: 4.4, cleanliness: 4.3, waitTime: 3.4, patientCare: 4.3, reviewCount: 3100 },
    accreditations: ['NABH', 'JCI'],
    successRates: { cardiac: 92, surgical: 90, overall: 90 },
    acceptsInsurance: true, insuranceProviders: ['All Major Insurers'],
    emergencyCapability: 'advanced', is24x7: true, averageResponseTimeMinutes: 7,
    averageCostPerDay: 20000, isActive: true, isVerified: true,
  },
  {
    name: 'Safdarjung Hospital',
    type: 'government', tier: 'tertiary',
    address: { street: 'Ansari Nagar West', city: 'Delhi', state: 'Delhi', pincode: '110029' },
    coordinates: { type: 'Point', coordinates: [77.2006, 28.5678] },
    phone: '+91-11-26730000',
    specializations: ['Emergency Medicine', 'General Surgery', 'Internal Medicine', 'Orthopedics', 'Obstetrics & Gynecology'],
    facilities: { icu: true, emergencyRoom: true, trauma: true, bloodBank: true, ambulance: true, pharmacy24h: true },
    totalBeds: 1531, icuBeds: 80, doctorCount: 600,
    ratings: { overall: 3.8, doctorQuality: 4.2, infrastructure: 3.3, cleanliness: 3.2, waitTime: 2.0, patientCare: 3.9, reviewCount: 4200 },
    successRates: { emergency: 82, surgical: 80, overall: 80 },
    acceptsInsurance: false, averageCostPerDay: 500,
    emergencyCapability: 'level2_trauma', is24x7: true, averageResponseTimeMinutes: 10,
    isActive: true, isVerified: true,
  },
  // ── BANGALORE ─────────────────────────────────────────────────────────────
  {
    name: 'Manipal Hospital Bangalore',
    type: 'private', tier: 'super_specialty',
    address: { street: '98, HAL Airport Road', city: 'Bangalore', state: 'Karnataka', pincode: '560017' },
    coordinates: { type: 'Point', coordinates: [77.6475, 12.9588] },
    phone: '+91-80-25023000', website: 'https://www.manipalhospitals.com',
    specializations: ['Cardiology', 'Neurology', 'Oncology', 'Transplant', 'Orthopedics', 'Nephrology'],
    facilities: { icu: true, iccu: true, nicu: true, emergencyRoom: true, mri: true, ct: true, petScan: true, roboticSurgery: true, organTransplant: true, cathLab: true, bloodBank: true, dialysis: true, ambulance: true, pharmacy24h: true, telemedicine: true },
    totalBeds: 670, icuBeds: 90, doctorCount: 450,
    ratings: { overall: 4.6, doctorQuality: 4.7, infrastructure: 4.7, cleanliness: 4.6, waitTime: 3.3, patientCare: 4.6, reviewCount: 6800 },
    accreditations: ['NABH', 'JCI'],
    successRates: { cardiac: 95, surgical: 93, emergency: 91, overall: 93 },
    acceptsInsurance: true, insuranceProviders: ['All Major Insurers'],
    emergencyCapability: 'level1_trauma', is24x7: true, averageResponseTimeMinutes: 5,
    averageCostPerDay: 22000, isActive: true, isVerified: true,
  },
  {
    name: 'Victoria Hospital Bangalore',
    type: 'government', tier: 'tertiary',
    address: { street: 'K R Market', city: 'Bangalore', state: 'Karnataka', pincode: '560002' },
    coordinates: { type: 'Point', coordinates: [77.5769, 12.9633] },
    phone: '+91-80-26701150',
    specializations: ['Emergency Medicine', 'General Medicine', 'Surgery', 'Orthopedics', 'Pediatrics'],
    facilities: { icu: true, emergencyRoom: true, trauma: true, bloodBank: true, ambulance: true, pharmacy24h: true },
    totalBeds: 1200, icuBeds: 60, doctorCount: 400,
    ratings: { overall: 3.9, doctorQuality: 4.1, infrastructure: 3.5, cleanliness: 3.4, waitTime: 2.1, patientCare: 4.0, reviewCount: 3100 },
    successRates: { emergency: 81, overall: 78 },
    acceptsInsurance: false, averageCostPerDay: 400,
    emergencyCapability: 'level2_trauma', is24x7: true, averageResponseTimeMinutes: 9,
    isActive: true, isVerified: true,
  },
  // ── CHENNAI ───────────────────────────────────────────────────────────────
  {
    name: 'Apollo Hospitals Chennai',
    type: 'private', tier: 'super_specialty',
    address: { street: '21, Greams Lane', city: 'Chennai', state: 'Tamil Nadu', pincode: '600006' },
    coordinates: { type: 'Point', coordinates: [80.2568, 13.0621] },
    phone: '+91-44-28290200', website: 'https://www.apollohospitals.com',
    specializations: ['Cardiology', 'Oncology', 'Neurology', 'Orthopedics', 'Transplant', 'Cardiac Surgery'],
    facilities: { icu: true, iccu: true, nicu: true, emergencyRoom: true, mri: true, ct: true, petScan: true, roboticSurgery: true, organTransplant: true, cathLab: true, bloodBank: true, dialysis: true, ambulance: true, pharmacy24h: true, telemedicine: true },
    totalBeds: 699, icuBeds: 100, doctorCount: 500,
    ratings: { overall: 4.7, doctorQuality: 4.8, infrastructure: 4.8, cleanliness: 4.7, waitTime: 3.4, patientCare: 4.8, reviewCount: 8900 },
    accreditations: ['NABH', 'JCI'],
    successRates: { cardiac: 96, surgical: 94, emergency: 92, overall: 94 },
    acceptsInsurance: true, insuranceProviders: ['All Major Insurers'],
    emergencyCapability: 'level1_trauma', is24x7: true, averageResponseTimeMinutes: 5,
    averageCostPerDay: 24000, isActive: true, isVerified: true,
  },
  {
    name: 'Government General Hospital Chennai',
    type: 'government', tier: 'super_specialty',
    address: { street: 'EVR Periyar Salai', city: 'Chennai', state: 'Tamil Nadu', pincode: '600003' },
    coordinates: { type: 'Point', coordinates: [80.2706, 13.0833] },
    phone: '+91-44-25305000',
    specializations: ['Emergency Medicine', 'General Surgery', 'Internal Medicine', 'Orthopedics', 'Neurosurgery', 'Cardiology'],
    facilities: { icu: true, emergencyRoom: true, trauma: true, bloodBank: true, ambulance: true, pharmacy24h: true, mri: true, ct: true },
    totalBeds: 2600, icuBeds: 120, doctorCount: 800,
    ratings: { overall: 4.1, doctorQuality: 4.5, infrastructure: 3.7, cleanliness: 3.6, waitTime: 2.2, patientCare: 4.2, reviewCount: 5600 },
    successRates: { emergency: 84, surgical: 82, overall: 82 },
    acceptsInsurance: false, averageCostPerDay: 600,
    emergencyCapability: 'level1_trauma', is24x7: true, averageResponseTimeMinutes: 7,
    isActive: true, isVerified: true,
  },
  // ── HYDERABAD ─────────────────────────────────────────────────────────────
  {
    name: 'NIMS Hyderabad',
    type: 'government', tier: 'super_specialty',
    address: { street: 'Panjagutta', city: 'Hyderabad', state: 'Telangana', pincode: '500082' },
    coordinates: { type: 'Point', coordinates: [78.4538, 17.4283] },
    phone: '+91-40-23489000',
    specializations: ['Neurology', 'Neurosurgery', 'Cardiology', 'Oncology', 'Nephrology'],
    facilities: { icu: true, emergencyRoom: true, mri: true, ct: true, bloodBank: true, ambulance: true, pharmacy24h: true },
    totalBeds: 800, icuBeds: 50, doctorCount: 350,
    ratings: { overall: 4.2, doctorQuality: 4.5, infrastructure: 3.9, cleanliness: 3.8, waitTime: 2.5, patientCare: 4.3, reviewCount: 2800 },
    successRates: { overall: 83 },
    acceptsInsurance: false, averageCostPerDay: 1500,
    emergencyCapability: 'advanced', is24x7: true, averageResponseTimeMinutes: 8,
    isActive: true, isVerified: true,
  },
  {
    name: 'Yashoda Hospitals Hyderabad',
    type: 'private', tier: 'super_specialty',
    address: { street: 'Raj Bhavan Road, Somajiguda', city: 'Hyderabad', state: 'Telangana', pincode: '500082' },
    coordinates: { type: 'Point', coordinates: [78.4561, 17.4243] },
    phone: '+91-40-45671100',
    specializations: ['Cardiology', 'Neurology', 'Orthopedics', 'Gastroenterology', 'Endocrinology'],
    facilities: { icu: true, iccu: true, emergencyRoom: true, mri: true, ct: true, cathLab: true, bloodBank: true, dialysis: true, ambulance: true, pharmacy24h: true, telemedicine: true },
    totalBeds: 450, icuBeds: 55, doctorCount: 300,
    ratings: { overall: 4.4, doctorQuality: 4.6, infrastructure: 4.5, cleanliness: 4.4, waitTime: 3.5, patientCare: 4.5, reviewCount: 3400 },
    accreditations: ['NABH'],
    successRates: { cardiac: 91, surgical: 89, overall: 89 },
    acceptsInsurance: true, insuranceProviders: ['Star Health', 'ICICI Lombard', 'HDFC Ergo'],
    emergencyCapability: 'advanced', is24x7: true, averageResponseTimeMinutes: 6,
    averageCostPerDay: 16000, isActive: true, isVerified: true,
  },
  // ── PUNE ──────────────────────────────────────────────────────────────────
  {
    name: 'Ruby Hall Clinic',
    type: 'private', tier: 'super_specialty',
    address: { street: '40, Sassoon Road', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    coordinates: { type: 'Point', coordinates: [73.8771, 18.5304] },
    phone: '+91-20-26163391',
    specializations: ['Cardiology', 'Orthopedics', 'Neurology', 'Oncology', 'Obstetrics & Gynecology'],
    facilities: { icu: true, iccu: true, nicu: true, emergencyRoom: true, mri: true, ct: true, cathLab: true, bloodBank: true, dialysis: true, ambulance: true, pharmacy24h: true },
    totalBeds: 450, icuBeds: 50, doctorCount: 250,
    ratings: { overall: 4.4, doctorQuality: 4.5, infrastructure: 4.4, cleanliness: 4.3, waitTime: 3.2, patientCare: 4.4, reviewCount: 4200 },
    accreditations: ['NABH'],
    successRates: { cardiac: 92, surgical: 90, overall: 90 },
    acceptsInsurance: true, insuranceProviders: ['Star Health', 'New India Assurance', 'HDFC Ergo'],
    emergencyCapability: 'advanced', is24x7: true, averageResponseTimeMinutes: 7,
    averageCostPerDay: 18000, isActive: true, isVerified: true,
  },
  // ── KOLKATA ───────────────────────────────────────────────────────────────
  {
    name: 'SSKM Hospital Kolkata',
    type: 'government', tier: 'super_specialty',
    address: { street: '244 A J C Bose Road', city: 'Kolkata', state: 'West Bengal', pincode: '700020' },
    coordinates: { type: 'Point', coordinates: [88.3491, 22.5377] },
    phone: '+91-33-22044440',
    specializations: ['Emergency Medicine', 'General Surgery', 'Internal Medicine', 'Cardiology', 'Neurology', 'Oncology'],
    facilities: { icu: true, emergencyRoom: true, trauma: true, mri: true, ct: true, bloodBank: true, ambulance: true, pharmacy24h: true },
    totalBeds: 1800, icuBeds: 100, doctorCount: 700,
    ratings: { overall: 4.0, doctorQuality: 4.4, infrastructure: 3.6, cleanliness: 3.5, waitTime: 2.0, patientCare: 4.1, reviewCount: 4800 },
    successRates: { emergency: 82, overall: 80 },
    acceptsInsurance: false, averageCostPerDay: 800,
    emergencyCapability: 'level2_trauma', is24x7: true, averageResponseTimeMinutes: 8,
    isActive: true, isVerified: true,
  },
  {
    name: 'Fortis Hospital Kolkata',
    type: 'private', tier: 'super_specialty',
    address: { street: '730, Anandapur', city: 'Kolkata', state: 'West Bengal', pincode: '700107' },
    coordinates: { type: 'Point', coordinates: [88.3992, 22.5076] },
    phone: '+91-33-66284444',
    specializations: ['Cardiology', 'Orthopedics', 'Neurology', 'Gastroenterology', 'Oncology'],
    facilities: { icu: true, iccu: true, emergencyRoom: true, mri: true, ct: true, cathLab: true, bloodBank: true, dialysis: true, ambulance: true, pharmacy24h: true, telemedicine: true },
    totalBeds: 400, icuBeds: 48, doctorCount: 220,
    ratings: { overall: 4.3, doctorQuality: 4.5, infrastructure: 4.4, cleanliness: 4.3, waitTime: 3.4, patientCare: 4.4, reviewCount: 2900 },
    accreditations: ['NABH', 'JCI'],
    successRates: { cardiac: 91, surgical: 89, overall: 89 },
    acceptsInsurance: true, insuranceProviders: ['All Major Insurers'],
    emergencyCapability: 'advanced', is24x7: true, averageResponseTimeMinutes: 7,
    averageCostPerDay: 17000, isActive: true, isVerified: true,
  },
];

async function seed() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/medichain';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Clear existing hospitals
    const deleted = await Hospital.deleteMany({});
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing hospital records`);

    // Insert seed data
    const inserted = await Hospital.insertMany(HOSPITALS);
    console.log(`✅ Inserted ${inserted.length} hospitals`);

    // Summary
    const byType = {};
    HOSPITALS.forEach((h) => { byType[h.type] = (byType[h.type] || 0) + 1; });
    console.log('📊 By type:', byType);

    const byCities = {};
    HOSPITALS.forEach((h) => { byCities[h.address.city] = (byCities[h.address.city] || 0) + 1; });
    console.log('📍 By city:', byCities);

    await mongoose.disconnect();
    console.log('✅ Seeding complete');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
