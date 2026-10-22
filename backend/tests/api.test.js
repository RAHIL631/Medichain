// File: medichain/backend/tests/api.test.js

const request = require('supertest');
const mongoose = require('mongoose');
const axios = require('axios');
const { Wallet } = require('ethers');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server'); // Import the Express app (it exports `app`)
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const ConsentRecord = require('../models/ConsentRecord');
const blockchainService = require('../services/blockchainService');

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
let accessSpy;
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

describe('Signed wallet ownership verification', () => {
  let token;

  beforeEach(async () => {
    const response = await request(app).post('/api/auth/register').send(patientCreds);
    token = response.body.token;
  });

  it('links a wallet only after a valid, one-time signature', async () => {
    const wallet = Wallet.createRandom();
    const challenge = await request(app)
      .post('/api/auth/wallet/challenge')
      .set('Authorization', `Bearer ${token}`)
      .send({ walletAddress: wallet.address });
    expect(challenge.statusCode).toBe(200);

    const signature = await wallet.signMessage(challenge.body.message);
    const link = await request(app)
      .patch('/api/auth/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ walletAddress: wallet.address, nonce: challenge.body.nonce, signature });
    expect(link.statusCode).toBe(200);
    expect(link.body.walletVerified).toBe(true);

    const linkedUser = await User.findOne({ email: patientCreds.email });
    expect(linkedUser.walletAddress).toBe(wallet.address.toLowerCase());
    expect(linkedUser.walletVerified).toBe(true);

    const replay = await request(app)
      .patch('/api/auth/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ walletAddress: wallet.address, nonce: challenge.body.nonce, signature });
    expect(replay.statusCode).toBe(400);
  });

  it('rejects unsigned linking and a signature from another wallet', async () => {
    const wallet = Wallet.createRandom();
    const otherWallet = Wallet.createRandom();
    const challenge = await request(app)
      .post('/api/auth/wallet/challenge')
      .set('Authorization', `Bearer ${token}`)
      .send({ walletAddress: wallet.address });

    const unsigned = await request(app)
      .patch('/api/auth/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ walletAddress: wallet.address });
    expect(unsigned.statusCode).toBe(400);

    const signature = await otherWallet.signMessage(challenge.body.message);
    const rejected = await request(app)
      .patch('/api/auth/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ walletAddress: wallet.address, nonce: challenge.body.nonce, signature });
    expect(rejected.statusCode).toBe(403);
    expect((await User.findOne({ email: patientCreds.email })).walletVerified).toBe(false);
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

  it('returns the requested patient record page and its total in one response', async () => {
    const patient = await User.findOne({ email: patientCreds.email });
    await MedicalRecord.insertMany(Array.from({ length: 7 }, (_, index) => ({
      patientId: patient._id,
      patientWalletAddress: '0x1111111111111111111111111111111111111111',
      ipfsCID: `synthetic-patient-dashboard-${index}`,
      ipfsURL: `https://gateway.example.test/ipfs/synthetic-patient-dashboard-${index}`,
      recordType: 'lab_report',
      fileName: `synthetic-report-${index}.pdf`,
      fileMimeType: 'application/pdf',
      fileSize: 100 + index,
      isActive: true,
      createdAt: new Date(Date.now() - index * 1000),
    })));

    const res = await request(app)
      .get('/api/patient/records?limit=5')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.records).toHaveLength(5);
    expect(res.body.total).toBe(7);
    expect(res.body.totalPages).toBe(2);
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

  it("POST /api/patient/link-wallet rejects an unsigned wallet claim", async () => {
    const walletAddress = '0x1234567890123456789012345678901234567890';
    const res = await request(app)
      .post('/api/patient/link-wallet')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ walletAddress });

    expect(res.statusCode).toBe(400);
    expect(res.body.walletAddress).toBeUndefined();
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
  beforeEach(() => {
    accessSpy = jest.spyOn(blockchainService, 'hasAccess').mockResolvedValue(false);
  });

  afterEach(() => {
    accessSpy.mockRestore();
  });

  beforeEach(async () => {
    // 1. Create Patient with wallet
    const pRes = await request(app).post('/api/auth/register').send(patientCreds);
    patientToken = pRes.body.token;
    
    await request(app)
      .post('/api/patient/link-wallet')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ walletAddress: '0x1111111111111111111111111111111111111111' });

    await User.findOneAndUpdate(
      { email: patientCreds.email },
      { walletAddress: '0x1111111111111111111111111111111111111111', isWalletLinked: true, walletVerified: true }
    );

    // 2. Create Doctor
    const dRes = await request(app).post('/api/auth/register').send(doctorCreds);
    doctorToken = dRes.body.token;
    await User.findOneAndUpdate(
      { email: doctorCreds.email },
      { walletAddress: '0x2222222222222222222222222222222222222222', isWalletLinked: true, walletVerified: true }
    );
  });

  it("GET /api/doctor/patient/:walletAddress requires active on-chain access", async () => {
    // Valid wallet
    const resValid = await request(app)
      .get('/api/doctor/patient/0x1111111111111111111111111111111111111111')
      .set('Authorization', `Bearer ${doctorToken}`);
    
    expect(resValid.statusCode).toBe(403);
    expect(resValid.body.name).toBeUndefined();

    accessSpy.mockResolvedValue(true);
    const resAuthorized = await request(app)
      .get('/api/doctor/patient/0x1111111111111111111111111111111111111111')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(resAuthorized.statusCode).toBe(200);
    expect(resAuthorized.body.patient.name).toBe(patientCreds.name);

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

  it('fails closed when the on-chain authorization provider is unavailable', async () => {
    accessSpy.mockRejectedValue(new Error('RPC unavailable'));
    const res = await request(app)
      .get('/api/doctor/patient/0x1111111111111111111111111111111111111111')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(503);
    expect(res.body.patient).toBeUndefined();
  });

  it('requires chain access across timeline and patient-linked AI endpoints', async () => {
    const patient = await User.findOne({ email: patientCreds.email });
    const auth = `Bearer ${doctorToken}`;
    const responses = await Promise.all([
      request(app).get(`/api/timeline?patientId=${patient._id}`).set('Authorization', auth),
      request(app).get(`/api/timeline/stats?patientId=${patient._id}`).set('Authorization', auth),
      request(app).get(`/api/health-risk/history?patientId=${patient._id}`).set('Authorization', auth),
      request(app).get(`/api/ensemble-predict/history?patientId=${patient._id}`).set('Authorization', auth),
      request(app).get(`/api/adherence-sys/history?patientId=${patient._id}`).set('Authorization', auth),
      request(app).get(`/api/digital-twin/profile?patientId=${patient._id}`).set('Authorization', auth),
    ]);

    expect(responses.map((response) => response.statusCode)).toEqual([403, 403, 403, 403, 403, 403]);
  });

  it('denies CDSS updates to a patient record without active on-chain access', async () => {
    const patient = await User.findOne({ email: patientCreds.email });
    const doctor = await User.findOne({ email: doctorCreds.email });
    const record = await MedicalRecord.create({
      patientId: patient._id,
      patientWalletAddress: patient.walletAddress,
      doctorId: doctor._id,
      doctorWalletAddress: doctor.walletAddress,
      ipfsCID: 'bafybeigdyrzt5syntheticcidforcdssauthorization',
      ipfsURL: 'https://gateway.example.test/ipfs/bafybeigdyrzt5syntheticcidforcdssauthorization',
      recordType: 'prescription',
      fileName: 'synthetic-prescription.pdf',
      fileMimeType: 'application/pdf',
      fileSize: 12,
      isActive: true,
    });
    const originalAiAnalysis = record.aiAnalysis.toObject();
    const auth = `Bearer ${doctorToken}`;
    const responses = await Promise.all([
      request(app).post('/api/ai/cdss/analyze').set('Authorization', auth)
        .send({ recordId: record._id, medications: ['SyntheticMedication'] }),
      request(app).post('/api/ai/cdss/dosage-safety/batch').set('Authorization', auth)
        .send({ recordId: record._id, medications: ['SyntheticMedication'] }),
    ]);

    expect(responses.map((response) => response.statusCode)).toEqual([403, 403]);
    const unchangedRecord = await MedicalRecord.findById(record._id);
    expect(unchangedRecord.aiAnalysis.toObject()).toEqual(originalAiAnalysis);
  });

  it('serves persisted analytics and restricts the account registry to administrators', async () => {
    const patient = await User.findOne({ email: patientCreds.email });
    const doctor = await User.findOne({ email: doctorCreds.email });
    await MedicalRecord.create({
      patientId: patient._id,
      patientWalletAddress: patient.walletAddress,
      doctorId: doctor._id,
      doctorWalletAddress: doctor.walletAddress,
      ipfsCID: 'bafybeigdyrzt5syntheticanalyticsrecord',
      ipfsURL: 'https://gateway.example.test/ipfs/bafybeigdyrzt5syntheticanalyticsrecord',
      recordType: 'prescription',
      fileName: 'synthetic-prescription.pdf',
      fileMimeType: 'application/pdf',
      fileSize: 12,
      blockchainTxHash: `0x${'a'.repeat(64)}`,
      medications: ['SyntheticMedication'],
      aiAnalysis: { analyzedAt: new Date() },
      isActive: true,
    });
    const auth = `Bearer ${doctorToken}`;
    const [summary, scopedStats, userRegistry, platformStats] = await Promise.all([
      request(app).get('/api/analytics/summary').set('Authorization', auth),
      request(app).get('/api/analytics/stats').set('Authorization', auth),
      request(app).get('/api/analytics/users').set('Authorization', auth),
      request(app).get('/api/analytics/platform-stats').set('Authorization', auth),
    ]);

    expect(summary.statusCode).toBe(200);
    expect(summary.body.data.platformStats.totalRecords).toBe(1);
    expect(summary.body.data.blockchainStats.recordsWithTransactionHash).toBe(1);
    expect(summary.body.data.aiStats.storedPrescriptionAnalyses).toBe(1);
    expect(summary.body.data.recordActivity.reduce((sum, entry) => sum + entry.records, 0)).toBe(1);
    expect(summary.body.data.diseaseTrends).toEqual([]);
    expect(scopedStats.statusCode).toBe(200);
    expect(scopedStats.body.totalRecords).toBe(1);
    expect(scopedStats.body.uniquePatients).toBe(1);
    expect(userRegistry.statusCode).toBe(403);
    expect(platformStats.statusCode).toBe(403);
  });

  it('does not upload a record or create implicit consent without a chain grant', async () => {
    const res = await request(app)
      .post('/api/doctor/upload-record')
      .set('Authorization', `Bearer ${doctorToken}`)
      .field('patientWalletAddress', '0x1111111111111111111111111111111111111111')
      .field('recordType', 'lab_report')
      .attach('file', Buffer.from('%PDF-1.4\nSynthetic report\n%%EOF'), {
        filename: 'synthetic-report.pdf',
        contentType: 'application/pdf',
      });

    expect(res.statusCode).toBe(403);
    expect(await MedicalRecord.countDocuments()).toBe(0);
    expect(await ConsentRecord.countDocuments()).toBe(0);
  });

  it('does not exempt the original uploader from current on-chain access checks', async () => {
    const patient = await User.findOne({ email: patientCreds.email });
    const doctor = await User.findOne({ email: doctorCreds.email });
    const record = await MedicalRecord.create({
      patientId: patient._id,
      patientWalletAddress: patient.walletAddress,
      doctorId: doctor._id,
      doctorWalletAddress: doctor.walletAddress,
      ipfsCID: 'bafybeigdyrzt5syntheticcidforauthorizationcheck',
      ipfsURL: 'https://gateway.example.test/ipfs/bafybeigdyrzt5syntheticcidforauthorizationcheck',
      recordType: 'lab_report',
      fileName: 'synthetic.pdf',
      fileMimeType: 'application/pdf',
      fileSize: 12,
      isActive: true,
    });
    const res = await request(app)
      .get(`/api/doctor/record/${record._id}/download`)
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.statusCode).toBe(403);
  });

  it('POST /api/doctor/upload-record rejects prescription when CDSS is unavailable', async () => {
    accessSpy.mockResolvedValue(true);
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
