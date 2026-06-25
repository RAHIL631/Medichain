// File: medichain/backend/tests/api.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server'); // Import the Express app (it exports `app`)
const User = require('../models/User');

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
});
