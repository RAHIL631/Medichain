// backend/scripts/seedDemoUsers.js
// Creates verified demo accounts for local / in-memory MongoDB demos.

const User = require('../models/User');
const Hospital = require('../models/Hospital');

const DEMO_PASSWORD = 'DemoPass123!';

const DEMO_USERS = [
  {
    name: 'Demo Patient',
    email: 'patient@medichain.local',
    password: DEMO_PASSWORD,
    role: 'patient',
    isEmailVerified: true,
    bloodGroup: 'O+',
    allergies: ['Penicillin'],
    chronicConditions: ['Hypertension'],
  },
  {
    name: 'Dr. Demo Cardiologist',
    email: 'doctor@medichain.local',
    password: DEMO_PASSWORD,
    role: 'doctor',
    isEmailVerified: true,
    specialization: 'Cardiology',
    hospitalName: 'MediChain Demo Hospital',
    licenseNumber: 'MED-DEMO-001',
    yearsExperience: 8,
  },
  {
    name: 'Demo Hospital Admin',
    email: 'hospital@medichain.local',
    password: DEMO_PASSWORD,
    role: 'hospital',
    isEmailVerified: true,
    hospitalName: 'MediChain Demo Hospital',
    licenseNumber: 'HOSP-DEMO-001',
  },
  {
    name: 'System Admin',
    email: 'admin@medichain.local',
    password: DEMO_PASSWORD,
    role: 'admin',
    isEmailVerified: true,
  },
];

async function seedDemoUsers() {
  let created = 0;
  for (const user of DEMO_USERS) {
    const exists = await User.findOne({ email: user.email });
    if (exists) continue;
    await User.create(user);
    created += 1;
  }

  const hospitalExists = await Hospital.findOne({ name: 'MediChain Demo Hospital' });
  if (!hospitalExists) {
    await Hospital.create({
      name: 'MediChain Demo Hospital',
      type: 'private',
      address: { street: '1 Health Ave', city: 'Mumbai', state: 'MH', pincode: '400001' },
      coordinates: { type: 'Point', coordinates: [72.8777, 19.076] },
      specializations: ['Cardiology', 'General Medicine', 'Emergency'],
      isVerified: true,
      lastVerifiedAt: new Date(),
    });
  }

  console.log(`🌱  Demo users ready (${created} created). Login: *@medichain.local / ${DEMO_PASSWORD}`);
  return { created, password: DEMO_PASSWORD };
}

module.exports = { seedDemoUsers, DEMO_PASSWORD, DEMO_USERS };

if (require.main === module) {
  require('dotenv').config();
  const mongoose = require('mongoose');
  (async () => {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    await seedDemoUsers();
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
