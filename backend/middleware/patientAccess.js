const blockchainService = require('../services/blockchainService');
const { auditLog, AuditEvents } = require('../utils/auditLogger');

async function requirePatientAccess(req, res, patient) {
  const requester = req.user;
  const isPatientOwner = requester.role === 'patient' &&
    patient._id.toString() === requester._id.toString();

  if (isPatientOwner) return true;

  const canCheckOnChain =
    ['doctor', 'hospital'].includes(requester.role) &&
    patient.walletVerified === true &&
    requester.walletVerified === true &&
    Boolean(patient.walletAddress) &&
    Boolean(requester.walletAddress);

  if (!canCheckOnChain) {
    auditLog(AuditEvents.UNAUTHORIZED, req, {
      resourceType: 'PatientData',
      resourceId: patient._id.toString(),
      reason: 'Patient or healthcare requester wallet is not linked and verified',
    });
    res.status(403).json({
      error: 'Access denied: link and verify your healthcare wallet in your profile before requesting patient access.',
    });
    return false;
  }

  try {
    if (await blockchainService.hasAccess(patient.walletAddress, requester.walletAddress)) {
      return true;
    }
  } catch (err) {
    console.error('[ACCESS] On-chain authorization check unavailable:', err.message);
    res.status(503).json({
      error: 'Patient access could not be verified on the configured blockchain. Please retry when the network is available.',
    });
    return false;
  }

  auditLog(AuditEvents.UNAUTHORIZED, req, {
    resourceType: 'PatientData',
    resourceId: patient._id.toString(),
    reason: 'Patient has not granted active on-chain access to this healthcare wallet',
  });
  res.status(403).json({
    error: 'Patient consent is not active for your verified wallet. Ask the patient to register their wallet and grant you access on-chain.',
  });
  return false;
}

module.exports = { requirePatientAccess };
