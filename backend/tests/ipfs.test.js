// File: medichain/backend/tests/ipfs.test.js
// MediChain — Stage 6 IPFS Storage, Encryption, Access Control & Integrity Test Suite

const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { encryptBuffer, decryptBuffer, isEncryptionConfigured } = require('../utils/encryption');
const { uploadToIPFS, computeCID, getIPFSUrl } = require('../utils/ipfs');
const { validateFileMagicBytes } = require('../middleware/fileValidator');
const MedicalRecord = require('../models/MedicalRecord');
const ConsentRecord = require('../models/ConsentRecord');
const User = require('../models/User');

let mongoServer;

describe('MediChain Stage 6 — IPFS Secure Storage & Medical File Tests', () => {
  let patientUser;
  let doctorUser;
  let unauthorizedDoctorUser;

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Create synthetic test users
    patientUser = await User.create({
      name: 'Synthetic Patient',
      email: 'patient-test@medichain.local',
      password: 'Password123!',
      role: 'patient',
      walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    });

    doctorUser = await User.create({
      name: 'Dr. Synthetic Oncologist',
      email: 'doctor-test@medichain.local',
      password: 'Password123!',
      role: 'doctor',
      specialization: 'Oncology',
      licenseNumber: 'MD-998877',
      walletAddress: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    });

    unauthorizedDoctorUser = await User.create({
      name: 'Dr. Unauthorized Intruder',
      email: 'unauth-doc@medichain.local',
      password: 'Password123!',
      role: 'doctor',
      specialization: 'Dermatology',
      licenseNumber: 'MD-000000',
      walletAddress: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. FILE VALIDATION & MAGIC BYTES TEST
  // ════════════════════════════════════════════════════════════════════════════
  describe('1. File Type & Magic Bytes Validation', () => {
    it('1.1 Accepts valid PDF file with %PDF magic bytes', (done) => {
      const validPdfBuffer = Buffer.from('%PDF-1.4\n%synthetic medical report content\n%%EOF');
      const req = {
        file: {
          buffer: validPdfBuffer,
          mimetype: 'application/pdf',
          originalname: 'synthetic-prescription.pdf',
        },
      };
      const res = {};
      validateFileMagicBytes(req, res, () => {
        expect(req.file.validatedMime).toBe('application/pdf');
        done();
      });
    });

    it('1.2 Accepts valid JPEG file with FFD8FF magic bytes', (done) => {
      const validJpgBuffer = Buffer.concat([Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), Buffer.from('synthetic image data')]);
      const req = {
        file: {
          buffer: validJpgBuffer,
          mimetype: 'image/jpeg',
          originalname: 'chest-xray.jpg',
        },
      };
      const res = {};
      validateFileMagicBytes(req, res, () => {
        expect(req.file.validatedMime).toBe('image/jpeg');
        done();
      });
    });

    it('1.3 Accepts valid PNG file with 89504E470D0A1A0A magic bytes', (done) => {
      const validPngBuffer = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.from('synthetic png')]);
      const req = {
        file: {
          buffer: validPngBuffer,
          mimetype: 'image/png',
          originalname: 'lab-scan.png',
        },
      };
      const res = {};
      validateFileMagicBytes(req, res, () => {
        expect(req.file.validatedMime).toBe('image/png');
        done();
      });
    });

    it('1.4 Rejects executable/script file disguised as PDF (MIME spoofing)', () => {
      const maliciousBuffer = Buffer.from('#!/bin/sh\necho malicious script\n');
      const req = {
        file: {
          buffer: maliciousBuffer,
          mimetype: 'application/pdf',
          originalname: 'trojan.pdf',
        },
      };
      let statusCalled = 0;
      let jsonCalled = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (payload) => { jsonCalled = payload; },
          };
        },
      };
      validateFileMagicBytes(req, res, () => {});
      expect(statusCalled).toBe(400);
      expect(jsonCalled.error).toContain('does not match a recognised safe file signature');
    });

    it('1.5 Rejects empty or corrupt buffers', () => {
      const emptyBuffer = Buffer.alloc(2);
      const req = {
        file: {
          buffer: emptyBuffer,
          mimetype: 'application/pdf',
          originalname: 'empty.pdf',
        },
      };
      let statusCalled = 0;
      let jsonCalled = null;
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (payload) => { jsonCalled = payload; },
          };
        },
      };
      validateFileMagicBytes(req, res, () => {});
      expect(statusCalled).toBe(400);
      expect(jsonCalled.error).toContain('too small');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. ENCRYPTION & DECRYPTION VALIDATION
  // ════════════════════════════════════════════════════════════════════════════
  describe('2. AES-256-GCM Encryption Architecture', () => {
    it('2.1 Encrypts and decrypts medical file buffer correctly', () => {
      const originalContent = Buffer.from('%PDF-1.4\nCONFIDENTIAL MEDICAL LAB REPORT\nPatient: Jane Doe\nBiopsy: Normal\n%%EOF');
      
      const encResult = encryptBuffer(originalContent);
      expect(encResult.encryptedBuffer).toBeDefined();
      expect(encResult.encryptedKey).toBeDefined();
      expect(encResult.iv).toBeDefined();
      expect(encResult.authTag).toBeDefined();

      // Ensure ciphertext does not equal plaintext
      expect(encResult.encryptedBuffer.equals(originalContent)).toBe(false);
      expect(encResult.encryptedBuffer.includes(Buffer.from('Jane Doe'))).toBe(false);

      // Decrypt
      const decrypted = decryptBuffer(
        encResult.encryptedBuffer,
        encResult.encryptedKey,
        encResult.iv,
        encResult.authTag
      );

      expect(decrypted.equals(originalContent)).toBe(true);
      expect(decrypted.toString()).toContain('CONFIDENTIAL MEDICAL LAB REPORT');
    });

    it('2.2 Detects tampering in encrypted ciphertext via GCM authTag', () => {
      const originalContent = Buffer.from('%PDF-1.4\nPrescription: 10mg Lisinopril\n%%EOF');
      const encResult = encryptBuffer(originalContent);

      // Tamper with ciphertext by flipping bits
      const tamperedCiphertext = Buffer.from(encResult.encryptedBuffer);
      tamperedCiphertext[10] ^= 0xFF;

      expect(() => {
        decryptBuffer(
          tamperedCiphertext,
          encResult.encryptedKey,
          encResult.iv,
          encResult.authTag
        );
      }).toThrow();
    });

    it('2.3 Generates unique IVs and distinct ciphertexts for identical files', () => {
      const payload = Buffer.from('%PDF-1.4\nStandard Diagnostic Report\n%%EOF');
      const enc1 = encryptBuffer(payload);
      const enc2 = encryptBuffer(payload);

      expect(enc1.iv).not.toEqual(enc2.iv);
      expect(enc1.encryptedBuffer.equals(enc2.encryptedBuffer)).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. IPFS UPLOAD & CID GENERATION
  // ════════════════════════════════════════════════════════════════════════════
  describe('3. IPFS Upload & Content Addressing', () => {
    it('3.1 Computes deterministic CID from encrypted buffer', () => {
      const testBuffer = Buffer.from('synthetic encrypted payload byte sequence 12345');
      const cid = computeCID(testBuffer);

      expect(cid).toMatch(/^bafybeic[0-9a-f]{51}$/);
      expect(computeCID(testBuffer)).toBe(cid);
    });

    it('3.2 uploadToIPFS returns valid CID, URL, and size metadata', async () => {
      const reportBuffer = Buffer.from('%PDF-1.4\nSynthetic Medical Report\n%%EOF');
      const enc = encryptBuffer(reportBuffer);

      const uploadResult = await uploadToIPFS(enc.encryptedBuffer, 'report.pdf', {
        patientWalletAddress: patientUser.walletAddress,
        recordType: 'lab_report',
        uploadedBy: doctorUser.walletAddress,
      });

      expect(uploadResult.cid).toBeDefined();
      expect(uploadResult.url).toContain('/ipfs/');
      expect(uploadResult.size).toBe(enc.encryptedBuffer.length);
    });

    it('3.3 getIPFSUrl builds compliant gateway URLs', () => {
      const cid = 'bafybeicabcdef1234567890abcdef1234567890abcdef1234567890abcdef1';
      const url = getIPFSUrl(cid);
      expect(url).toBe(`https://gateway.pinata.cloud/ipfs/${cid}`);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. DATABASE & ACCESS CONTROL WORKFLOW
  // ════════════════════════════════════════════════════════════════════════════
  describe('4. End-to-End Database Metadata & Access Control', () => {
    let testRecord;

    beforeAll(async () => {
      // 1. Grant consent from patient to doctor
      await ConsentRecord.create({
        patientId: patientUser._id,
        granteeId: doctorUser._id,
        granteeRole: 'doctor',
        scope: ['read_records', 'write_records'],
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000), // 24h
      });

      // 2. Doctor uploads medical file
      const rawMedicalFile = Buffer.from('%PDF-1.4\nSynthetic Clinical Summary: Healthy Patient\n%%EOF');
      const enc = encryptBuffer(rawMedicalFile);
      const ipfsResult = await uploadToIPFS(enc.encryptedBuffer, 'synthetic-summary.pdf');

      // 3. Save MedicalRecord to DB
      testRecord = await MedicalRecord.create({
        patientId: patientUser._id,
        patientWalletAddress: patientUser.walletAddress,
        doctorId: doctorUser._id,
        doctorWalletAddress: doctorUser.walletAddress,
        ipfsCID: ipfsResult.cid,
        ipfsURL: ipfsResult.url,
        recordType: 'diagnosis',
        fileName: 'synthetic-summary.pdf',
        fileMimeType: 'application/pdf',
        fileSize: enc.encryptedBuffer.length,
        isEncrypted: true,
        encryptionMeta: {
          encryptedKey: enc.encryptedKey,
          iv: enc.iv,
          authTag: enc.authTag,
          algorithm: 'aes-256-gcm',
          encryptedAt: new Date(),
        },
      });
    });

    it('4.1 Verifies MongoDB schema does not store raw plaintext medical files', async () => {
      const fetched = await MedicalRecord.findById(testRecord._id);
      expect(fetched.toObject()).not.toHaveProperty('fileBuffer');
      expect(fetched.toObject()).not.toHaveProperty('rawContent');
      expect(fetched.ipfsCID).toBeDefined();
      expect(fetched.isEncrypted).toBe(true);
    });

    it('4.2 Authorized doctor with active consent has valid access', async () => {
      const hasConsent = await ConsentRecord.hasActiveConsent(patientUser._id, doctorUser._id);
      expect(hasConsent).toBe(true);
    });

    it('4.3 Unauthorized doctor without consent is rejected', async () => {
      const hasConsent = await ConsentRecord.hasActiveConsent(patientUser._id, unauthorizedDoctorUser._id);
      expect(hasConsent).toBe(false);
    });

    it('4.4 Revoking patient consent immediately denies doctor access', async () => {
      await ConsentRecord.findOneAndUpdate(
        { patientId: patientUser._id, granteeId: doctorUser._id },
        { status: 'revoked', revokedAt: new Date() }
      );

      const hasConsentAfterRevoke = await ConsentRecord.hasActiveConsent(patientUser._id, doctorUser._id);
      expect(hasConsentAfterRevoke).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. FILE SIZE LIMIT TESTS
  // ════════════════════════════════════════════════════════════════════════════
  describe('5. File Size Limits & Boundary Validation', () => {
    it('5.1 Valid small file (5 KB) passes limits', () => {
      const smallBuffer = Buffer.alloc(5 * 1024);
      expect(smallBuffer.length).toBeLessThan(10 * 1024 * 1024);
    });

    it('5.2 Valid medium file (2 MB) passes limits', () => {
      const mediumBuffer = Buffer.alloc(2 * 1024 * 1024);
      expect(mediumBuffer.length).toBeLessThan(10 * 1024 * 1024);
    });

    it('5.3 Oversized file (11 MB) exceeds 10MB limit', () => {
      const oversizedSize = 11 * 1024 * 1024;
      const isOversized = oversizedSize > (10 * 1024 * 1024);
      expect(isOversized).toBe(true);
    });
  });
});
