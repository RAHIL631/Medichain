// File: medichain/backend/tests/api.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const axios = require('axios');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server'); // Import the Express app (it exports `app`)
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');

let mongoServer;

// ── Database Setup ────────────────────────────────────────────────────────────

// Connect to in-memory MongoDB before all tests
beforeAll(async () => {
  // Disconnect from the dev DB if the server.js automatically connected to it
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// Clear collections before each test suite
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Disconnect after all tests are done
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
  // Let open handles like the rate-limiter timer close
  await new Promise(resolve => setTimeout(resolve, 500)); 
});

describe('Production email fallback', () => {
  it('does not log verification codes when SMTP is not configured', async () => {
    const envNames = ['NODE_ENV', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_PASSWORD'];
    const originalEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    let isolatedEmailService;
    jest.isolateModules(() => {
      isolatedEmailService = require('../services/emailService');
    });
    envNames.slice(1).forEach((name) => delete process.env[name]);
    process.env.NODE_ENV = 'production';

    try {
      await expect(isolatedEmailService.sendVerificationEmail('synthetic@example.test', 'Synthetic User', '123456'))
        .rejects.toThrow(/email delivery is not configured/i);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
      envNames.forEach((name) => {
        if (originalEnv[name] === undefined) delete process.env[name];
        else process.env[name] = originalEnv[name];
      });
    }
  });
});

// ── Shared Variables ──────────────────────────────────────────────────────────
let patientToken = '';
let doctorToken = '';
let patientId = '';
const patientCreds = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'Password123!',
  role: 'patient'
};
const doctorCreds = {
  name: 'Jane Smith',
  email: 'doctor@example.com',
  password: 'Password123!',
  role: 'doctor',
  specialization: 'Cardiology',
  licenseNumber: 'MD-12345'
};

// ══════════════════════════════════════════════════════════════════════════════
// 1. AUTHENTICATION (Register & Login)
// ══════════════════════════════════════════════════════════════════════════════

describe("POST /api/auth/register", () => {
  it("should register patient with all required fields", async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(patientCreds);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('_id');
    expect(res.body.user.email).toBe(patientCreds.email);
    expect(res.body.user.role).toBe('patient');
    
    // Save for later tests
    patientToken = res.body.token;
    patientId = res.body.user._id;
  });

  it("should register doctor with specialization field", async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(doctorCreds);

    expect(res.statusCode).toBe(201);
    expect(res.body.user.role).toBe('doctor');
    expect(res.body.user.specialization).toBe('Cardiology');
  });

  it("should reject duplicate email", async () => {
    // First registration
    await request(app).post('/api/auth/register').send(patientCreds);
    
    // Second registration with same email
    const res = await request(app).post('/api/auth/register').send(patientCreds);
    expect(res.statusCode).toBe(400); // Route manually returns 400 for existing email
  });

  it("should reject missing required fields", async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'NoEmail' }); // missing email, password

    expect(res.statusCode).toBe(400);
    // Express validator should return an array of errors
    expect(res.body.errors).toBeDefined(); 
  });

  it("should reject invalid email format", async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...patientCreds, email: 'not-an-email' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("should hash the password (stored hash !== plain password)", async () => {
    await request(app).post('/api/auth/register').send(patientCreds);
    
    // Fetch directly from DB
    const userInDb = await User.findOne({ email: patientCreds.email }).select('+password');
    expect(userInDb).toBeDefined();
    expect(userInDb.password).not.toBe(patientCreds.password); // Should be a bcrypt hash
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    // Create the patient user before each login test
    await request(app).post('/api/auth/register').send(patientCreds);
  });

  it("should login with correct credentials", async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: patientCreds.email,
        password: patientCreds.password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe(patientCreds.email);
    patientToken = res.body.token; // update token
  });

  it("should reject wrong password", async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: patientCreds.email,
        password: 'WrongPassword999!'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Invalid credentials/i);
  });

  it("should reject non-existent email", async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@example.com',
        password: 'Password123!'
      });

    expect(res.statusCode).toBe(401);
  });

  it("should not return password field in response", async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: patientCreds.email,
        password: patientCreds.password
      });

    expect(res.body.user).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
  });
});

describe("GET /api/auth/me", () => {
  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send(patientCreds);
    patientToken = res.body.token;
  });

  it("should return user profile with valid token", async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe(patientCreds.email);
  });

  it("should return 401 with no token", async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it("should return 401 with invalid token", async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer invalid-fake-token`);

    expect(res.statusCode).toBe(401);
  });

  it("should return 401 with expired token", async () => {
    // Manually signing a token that expired yesterday
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign({ id: patientId }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '-1d' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.statusCode).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. PATIENT ROUTES (Protected)
// ══════════════════════════════════════════════════════════════════════════════

describe("Patient Routes (protected)", () => {
  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send(patientCreds);
    patientToken = res.body.token;
  });

  it("GET /api/patient/records → 200, empty array for new patient", async () => {
    const res = await request(app)
      .get('/api/patient/records')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.records)).toBe(true);
    expect(res.body.records.length).toBe(0);
  });

  it("GET /api/patient/profile → 200, full profile", async () => {
    const res = await request(app)
      .get('/api/patient/profile')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe(patientCreds.name);
  });

  it("PUT /api/patient/profile → 200, bloodGroup updated", async () => {
    const res = await request(app)
      .put('/api/patient/profile')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ bloodGroup: 'O+' });

    expect(res.statusCode).toBe(200);
    expect(res.body.user.bloodGroup).toBe('O+');
  });

  it("POST /api/patient/link-wallet → 200, wallet saved", async () => {
    const walletAddress = '0x1234567890123456789012345678901234567890';
    const res = await request(app)
      .post('/api/patient/link-wallet')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ walletAddress });

    expect(res.statusCode).toBe(200);
    expect(res.body.walletAddress).toBe(walletAddress.toLowerCase()); // assuming backend lowercases it
  });

  it("POST /api/patient/link-wallet with invalid address → 400", async () => {
    const res = await request(app)
      .post('/api/patient/link-wallet')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ walletAddress: 'not-an-eth-address' });

    expect(res.statusCode).toBe(400);
  });

  it('POST /api/patient/upload-record rejects production uploads without encryption configuration', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalMasterKey = process.env.ENCRYPTION_MASTER_KEY;
    process.env.NODE_ENV = 'production';
    delete process.env.ENCRYPTION_MASTER_KEY;

    try {
      const res = await request(app)
        .post('/api/patient/upload-record')
        .set('Authorization', `Bearer ${patientToken}`)
        .attach('file', Buffer.from('%PDF-1.4\nSynthetic record\n%%EOF'), {
          filename: 'synthetic.pdf',
          contentType: 'application/pdf',
        });

      expect(res.statusCode).toBe(503);
      expect(res.body.error).toMatch(/encryption is not configured/i);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      if (originalMasterKey === undefined) delete process.env.ENCRYPTION_MASTER_KEY;
      else process.env.ENCRYPTION_MASTER_KEY = originalMasterKey;
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. DOCTOR ROUTES (Protected & RBAC)
// ══════════════════════════════════════════════════════════════════════════════

describe("Doctor Routes (protected)", () => {
  beforeEach(async () => {
    // 1. Create Patient with wallet
    const pRes = await request(app).post('/api/auth/register').send(patientCreds);
    patientToken = pRes.body.token;
    
    await request(app)
      .post('/api/patient/link-wallet')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ walletAddress: '0x1111111111111111111111111111111111111111' });

    // 2. Create Doctor
    const dRes = await request(app).post('/api/auth/register').send(doctorCreds);
    doctorToken = dRes.body.token;
  });

  it("GET /api/doctor/patient/:walletAddress → 200 if wallet exists, 404 if not", async () => {
    // Valid wallet
    const resValid = await request(app)
      .get('/api/doctor/patient/0x1111111111111111111111111111111111111111')
      .set('Authorization', `Bearer ${doctorToken}`);
    
    expect(resValid.statusCode).toBe(200);
    expect(resValid.body.name).toBe(patientCreds.name);

    // Invalid/non-existent wallet
    const resInvalid = await request(app)
      .get('/api/doctor/patient/0x9999999999999999999999999999999999999999')
      .set('Authorization', `Bearer ${doctorToken}`);
      
    expect(resInvalid.statusCode).toBe(404);
  });

  it("POST /api/doctor/upload-record with no auth → 401", async () => {
    const res = await request(app)
      .post('/api/doctor/upload-record')
      .send({ patientId: 'some-id', recordType: 'prescription' });

    expect(res.statusCode).toBe(401);
  });

  it("POST /api/doctor/upload-record with patient role → 403", async () => {
    const res = await request(app)
      .post('/api/doctor/upload-record')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ patientId: 'some-id', recordType: 'prescription' });

    // Assuming your role middleware returns 403 Forbidden for wrong roles
    expect(res.statusCode).toBe(403);
  });

  it('POST /api/doctor/upload-record rejects prescription when CDSS is unavailable', async () => {
    const postSpy = jest.spyOn(axios, 'post').mockRejectedValue(new Error('AI service unavailable'));

    try {
      const res = await request(app)
        .post('/api/doctor/upload-record')
        .set('Authorization', `Bearer ${doctorToken}`)
        .field('patientWalletAddress', '0x1111111111111111111111111111111111111111')
        .field('recordType', 'prescription')
        .field('medications', 'SyntheticMedication')
        .attach('file', Buffer.from('%PDF-1.4\nSynthetic prescription\n%%EOF'), {
          filename: 'synthetic-prescription.pdf',
          contentType: 'application/pdf',
        });

      expect(res.statusCode).toBe(503);
      expect(res.body.error).toMatch(/prescription was not uploaded/i);
      expect(await MedicalRecord.countDocuments()).toBe(0);
    } finally {
      postSpy.mockRestore();
    }
  });
});
