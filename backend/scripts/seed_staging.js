// backend/scripts/seed_staging.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: '../.env' }); // Load .env from backend root

const User = require('../models/User');
const Hospital = require('../models/Hospital');

const seedStaging = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medichain');
    console.log('[SEED] Connected to MongoDB');

    // 1. Seed Hospital
    const existingHospital = await Hospital.findOne({ name: 'Staging Central Hospital' });
    let hospitalId;
    if (!existingHospital) {
      const hospital = await Hospital.create({
        name: 'Staging Central Hospital',
        type: 'private',
        address: { street: '123 Test Ave', city: 'Mumbai', state: 'MH', pincode: '400001' },
        coordinates: { type: 'Point', coordinates: [72.8777, 19.0760] }, // Long, Lat
        isVerified: true,
        lastVerifiedAt: new Date()
      });
      hospitalId = hospital._id;
      console.log('[SEED] Created Staging Hospital');
    } else {
      hospitalId = existingHospital._id;
    }

    // 2. Seed Doctor
    const docPass = await bcrypt.hash('DoctorPass123!', 10);
    const existingDoc = await User.findOne({ email: 'dr.test@staging.medichain.local' });
    if (!existingDoc) {
      await User.create({
        name: 'Dr. Staging Test',
        email: 'dr.test@staging.medichain.local',
        password: docPass,
        role: 'doctor',
        specialization: 'Cardiology',
        hospital: hospitalId,
        isEmailVerified: true
      });
      console.log('[SEED] Created Staging Doctor');
    }

    // 3. Seed Patient
    const patPass = await bcrypt.hash('PatientPass123!', 10);
    const existingPat = await User.findOne({ email: 'patient.test@staging.medichain.local' });
    if (!existingPat) {
      await User.create({
        name: 'John Staging Doe',
        email: 'patient.test@staging.medichain.local',
        password: patPass,
        role: 'patient',
        isEmailVerified: true
      });
      console.log('[SEED] Created Staging Patient');
    }

    console.log('[SEED] Staging Database Seeding Complete.');
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error:', err);
    process.exit(1);
  }
};

seedStaging();
