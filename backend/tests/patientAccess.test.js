jest.mock('../services/blockchainService', () => ({
  hasAccess: jest.fn(),
}));

jest.mock('../utils/auditLogger', () => ({
  auditLog: jest.fn(),
  AuditEvents: { UNAUTHORIZED: 'UNAUTHORIZED' },
}));

const blockchainService = require('../services/blockchainService');
const { auditLog } = require('../utils/auditLogger');
const { requirePatientAccess } = require('../middleware/patientAccess');

const patient = {
  _id: { toString: () => 'patient-id' },
  walletAddress: '0x1111111111111111111111111111111111111111',
  walletVerified: true,
};
const doctor = {
  _id: { toString: () => 'doctor-id' },
  role: 'doctor',
  walletAddress: '0x2222222222222222222222222222222222222222',
  walletVerified: true,
};

const createResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('allows patient owner access without requiring doctor consent', async () => {
  const req = { user: { role: 'patient', _id: patient._id } };
  const res = createResponse();

  await expect(requirePatientAccess(req, res, patient)).resolves.toBe(true);
  expect(blockchainService.hasAccess).not.toHaveBeenCalled();
});

test('denies unverified requester wallet with a doctor-specific message without querying the chain', async () => {
  const req = { user: { ...doctor, walletVerified: false } };
  const res = createResponse();

  await expect(requirePatientAccess(req, res, patient)).resolves.toBe(false);
  expect(blockchainService.hasAccess).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.stringContaining('Your healthcare wallet is not linked and verified'),
  }));
});

test('denies an unverified patient wallet with patient-specific next steps', async () => {
  const unverifiedPatient = { ...patient, walletVerified: false };
  const req = { user: doctor };
  const res = createResponse();

  await expect(requirePatientAccess(req, res, unverifiedPatient)).resolves.toBe(false);
  expect(blockchainService.hasAccess).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.stringContaining('This patient has not linked and verified a wallet'),
  }));
});

test('requires active on-chain patient consent for the verified doctor wallet', async () => {
  blockchainService.hasAccess.mockResolvedValue(false);
  const req = { user: doctor };
  const res = createResponse();

  await expect(requirePatientAccess(req, res, patient)).resolves.toBe(false);
  expect(blockchainService.hasAccess).toHaveBeenCalledWith(
    patient.walletAddress,
    doctor.walletAddress
  );
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.stringContaining('Patient consent is not active'),
  }));
  expect(auditLog).toHaveBeenCalled();
});

test('allows access only when the chain confirms patient consent', async () => {
  blockchainService.hasAccess.mockResolvedValue(true);
  const req = { user: doctor };
  const res = createResponse();

  await expect(requirePatientAccess(req, res, patient)).resolves.toBe(true);
  expect(res.status).not.toHaveBeenCalled();
});

test('reports chain failures as unavailable rather than treating them as consent', async () => {
  blockchainService.hasAccess.mockRejectedValue(new Error('RPC unavailable'));
  const req = { user: doctor };
  const res = createResponse();

  await expect(requirePatientAccess(req, res, patient)).resolves.toBe(false);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
    error: expect.stringContaining('could not be verified'),
  }));
});
