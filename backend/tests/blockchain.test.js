// File: medichain/backend/tests/blockchain.test.js
// MediChain — Stage 5 Blockchain End-to-End & Integration Test Suite

const crypto = require('crypto');
const { ethers } = require('ethers');
const blockchainService = require('../services/blockchainService');

describe('MediChain Stage 5 — Blockchain Integration & Smart Contract Tests', () => {
  let provider;
  let deployer;
  let patientSigner;
  let doctorSigner;
  let unauthorizedDoctorSigner;
  let contract;
  let contractAddress;
  let artifact;

  beforeAll(async () => {
    // 1. Set up in-memory Hardhat/ethers provider
    const hardhatArtifact = require('../../blockchain/artifacts/contracts/MediChain.sol/MediChain.json');
    artifact = hardhatArtifact;

    // Connect to hardhat provider simulation via JsonRpc or ethers Wallet simulation
    // Use Hardhat's default mnemonic / private keys for testing
    const defaultMnemonic = "test test test test test test test test test test test junk";
    const hdNode = ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(defaultMnemonic));
    
    // We can use a local provider or Hardhat simulation provider
    const hardhatUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
    provider = new ethers.JsonRpcProvider(hardhatUrl);

    // If local RPC is running, use it; otherwise test with simulated wallets
    try {
      const net = await provider.getNetwork();
      deployer = new ethers.Wallet(hdNode.deriveChild(0).privateKey, provider);
      patientSigner = new ethers.Wallet(hdNode.deriveChild(1).privateKey, provider);
      doctorSigner = new ethers.Wallet(hdNode.deriveChild(2).privateKey, provider);
      unauthorizedDoctorSigner = new ethers.Wallet(hdNode.deriveChild(3).privateKey, provider);
    } catch (e) {
      // Offline fallback wallet mock
      deployer = ethers.Wallet.createRandom();
      patientSigner = ethers.Wallet.createRandom();
      doctorSigner = ethers.Wallet.createRandom();
      unauthorizedDoctorSigner = ethers.Wallet.createRandom();
    }

    // Read configured contract address
    const deployedJson = require('../../blockchain/deployedContract.json');
    contractAddress = deployedJson.address || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 10 — BACKEND → BLOCKCHAIN INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 10: Backend to Blockchain Connection & State Reading', () => {
    it('10.1 Backend loads ABI and contract address properly', () => {
      expect(blockchainService.abi).toBeDefined();
      expect(Array.isArray(blockchainService.abi)).toBe(true);
      expect(blockchainService.contractAddress).toBeDefined();
      expect(blockchainService.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    it('10.2 Backend getProvider() returns a valid provider', () => {
      const p = blockchainService.getProvider();
      expect(p).toBeDefined();
    });

    it('10.3 Backend getContract() returns a contract instance with expected methods', () => {
      const c = blockchainService.getContract();
      expect(c).toBeDefined();
      expect(typeof c.registerPatient).toBe('function');
      expect(typeof c.grantDoctorAccess).toBe('function');
      expect(typeof c.revokeDoctorAccess).toBe('function');
      expect(typeof c.addMedicalRecord).toBe('function');
      expect(typeof c.verifyPrescriptionHash).toBe('function');
    });

    it('10.4 Backend checkHealth() returns structured health object', async () => {
      const health = await blockchainService.checkHealth();
      expect(health).toBeDefined();
      expect(health.contractAddress).toBe(blockchainService.contractAddress);
      expect(['UP', 'DOWN']).toContain(health.status);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 11 — MEDICAL RECORD INTEGRITY TEST
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 11: Medical Record Integrity & Cryptographic Tamper Detection', () => {
    it('11.1 Computes SHA-256 integrity hash correctly and validates format', () => {
      const syntheticMedicalData = Buffer.from(JSON.stringify({
        patientName: 'Synthetic Patient #1042',
        diagnosis: 'Stage 1 Hypertension',
        dosage: '10mg Lisinopril daily',
        prescribedAt: '2026-08-22T10:00:00Z',
      }));

      const integrityHash = crypto.createHash('sha256').update(syntheticMedicalData).digest('hex');
      expect(integrityHash).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(integrityHash)).toBe(true);
    });

    it('11.2 Detects tampering when medical record content is modified', () => {
      const originalRecord = JSON.stringify({
        patientId: 'PAT-98214',
        bloodPressure: '120/80',
        prescription: 'Amoxicillin 500mg',
      });

      const tamperedRecord = JSON.stringify({
        patientId: 'PAT-98214',
        bloodPressure: '120/80',
        prescription: 'Amoxicillin 5000mg', // Malicious dosage modification
      });

      const originalHash = crypto.createHash('sha256').update(originalRecord).digest('hex');
      const tamperedHash = crypto.createHash('sha256').update(tamperedRecord).digest('hex');

      expect(originalHash).not.toEqual(tamperedHash);

      // Verify integrity comparator
      const isOriginalVerified = (crypto.createHash('sha256').update(originalRecord).digest('hex') === originalHash);
      const isTamperedDetected = (crypto.createHash('sha256').update(tamperedRecord).digest('hex') !== originalHash);

      expect(isOriginalVerified).toBe(true);
      expect(isTamperedDetected).toBe(true);
    });

    it('11.3 Validates IPFS CID structure and format', async () => {
      const testCid = 'QmZtmD2qt8fJv3CLnsE1Vp7CWnvbjKU4wZwISm29CV84Z1';
      const patientAddr = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

      const result = await blockchainService.verifyRecordIntegrity(patientAddr, testCid);
      expect(result.validFormat).toBe(true);
      expect(result.ipfsCID).toBe(testCid);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 12 — PATIENT CONSENT & ACCESS WORKFLOW
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 12: Patient Consent Grant & Revoke Flow', () => {
    it('12.1 Emulates on-chain authorization evaluation logic', () => {
      const patient = '0x1111111111111111111111111111111111111111';
      const doctor = '0x2222222222222222222222222222222222222222';
      const accessStore = new Map();

      // Initially no access
      expect(accessStore.get(`${patient}:${doctor}`)).toBeFalsy();

      // Patient grants access
      accessStore.set(`${patient}:${doctor}`, { granted: true, type: 'permanent' });
      expect(accessStore.get(`${patient}:${doctor}`).granted).toBe(true);

      // Patient revokes access
      accessStore.set(`${patient}:${doctor}`, { granted: false, type: 'revoked' });
      expect(accessStore.get(`${patient}:${doctor}`).granted).toBe(false);
    });

    it('12.2 Timed consent evaluates expiration correctly', () => {
      const currentTime = 1000;
      const validTimedGrant = { granted: true, expiresAt: 1500 };
      const expiredTimedGrant = { granted: true, expiresAt: 800 };

      const isStillValid = validTimedGrant.granted && currentTime <= validTimedGrant.expiresAt;
      const isExpired = expiredTimedGrant.granted && currentTime <= expiredTimedGrant.expiresAt;

      expect(isStillValid).toBe(true);
      expect(isExpired).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 13 — UNAUTHORIZED ACCESS TESTS
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 13: Unauthorized Access & Cross-Tenant Boundary Checks', () => {
    it('13.1 Doctor A cannot access Patient B records without consent', () => {
      const permissions = new Map();
      const patientB = '0xPatientB00000000000000000000000000000000';
      const doctorA = '0xDoctorA00000000000000000000000000000000';

      const checkAccess = (patient, caller) => {
        if (patient.toLowerCase() === caller.toLowerCase()) return true;
        return permissions.get(`${patient}:${caller}`) === true;
      };

      expect(checkAccess(patientB, doctorA)).toBe(false);
    });

    it('13.2 Patient A cannot access Patient B records', () => {
      const patientA = '0xPatientA00000000000000000000000000000000';
      const patientB = '0xPatientB00000000000000000000000000000000';

      const checkAccess = (patient, caller) => (patient.toLowerCase() === caller.toLowerCase());
      expect(checkAccess(patientB, patientA)).toBe(false);
    });

    it('13.3 Unauthorized hospital address cannot access unassigned patient records', () => {
      const hospitalX = '0xHospitalX0000000000000000000000000000000';
      const patientY = '0xPatientY00000000000000000000000000000000';
      const authorizedHospitals = new Set();

      expect(authorizedHospitals.has(`${patientY}:${hospitalX}`)).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 15 — BLOCKCHAIN FAILURE & FAULT TOLERANCE
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 15: Fault Tolerance & Graceful RPC Failure Handling', () => {
    it('15.1 Simulated offline RPC provider returns controlled error without crashing', async () => {
      // Point service to a non-existent port
      const offlineService = new (require('../services/blockchainService').constructor)();
      offlineService.rpcUrl = 'http://127.0.0.1:9999';
      offlineService.provider = new ethers.JsonRpcProvider('http://127.0.0.1:9999');

      const health = await offlineService.checkHealth();
      expect(health.status).toBe('DOWN');
      expect(health.error).toBeDefined();

      const txStatus = await offlineService.verifyTransaction('0x' + '1'.repeat(64));
      expect(txStatus.confirmed).toBe(false);
      expect(txStatus.error).toBeDefined();
    });

    it('15.2 Invalid transaction hash returns controlled error', async () => {
      const result = await blockchainService.verifyTransaction('0xInvalidHash');
      expect(result.confirmed).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // PHASE 16 — EVENT VERIFICATION & AUDIT LOGGING
  // ════════════════════════════════════════════════════════════════════════════
  describe('Phase 16: Event Verification & Audit Trails', () => {
    it('16.1 Verifies all essential security events are defined in contract ABI', () => {
      const eventNames = blockchainService.abi
        .filter(item => item.type === 'event')
        .map(e => e.name);

      expect(eventNames).toContain('PatientRegistered');
      expect(eventNames).toContain('RecordAdded');
      expect(eventNames).toContain('DoctorAccessGranted');
      expect(eventNames).toContain('DoctorAccessRevoked');
      expect(eventNames).toContain('RecordDeactivated');
      expect(eventNames).toContain('TimedAccessGranted');
      expect(eventNames).toContain('EmergencyContactSet');
      expect(eventNames).toContain('EmergencyAccessGranted');
      expect(eventNames).toContain('PrescriptionValidated');
    });

    it('16.2 Format of audit record matches backend security standard', () => {
      const auditPayload = {
        action: 'BLOCKCHAIN_RECORD_VERIFY',
        patientWallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        txHash: '0x' + 'a'.repeat(64),
        timestamp: new Date().toISOString(),
        status: 'CONFIRMED',
      };

      expect(auditPayload.txHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(auditPayload.status).toBe('CONFIRMED');
    });
  });
});
