const blockchainService = require('../services/blockchainService');
const { auditLog, AuditEvents } = require('../utils/auditLogger');

async function requirePatientAccess(req, res, patient) {
  const requester = req.user;
  const isPatientOwner = requester.role === 'patient' &&
    patient._id.toString() === requester._id.toString();

  if (isPatientOwner) return true;

  if (
    !['doctor', 'hospital'].includes(requester.role) ||
    requester.walletVerified !== true ||
    !requester.walletAddress
  ) {
    auditLog(AuditEvents.UNAUTHORIZED, req, {
      resourceType: 'PatientData',
      resourceId: patient._id.toString(),
      reason: 'Healthcare requester wallet is not linked and verified',
    });
    res.status(403).json({
      error: 'Your healthcare wallet is not linked and verified. Link and verify this wallet in your profile before requesting patient access.',
    });
    return false;
  }

  if (patient.walletVerified !== true || !patient.walletAddress) {
    auditLog(AuditEvents.UNAUTHORIZED, req, {
      resourceType: 'PatientData',
      resourceId: patient._id.toString(),
      reason: 'Patient wallet is not linked and verified',
    });
    res.status(403).json({
      error: 'This patient has not linked and verified a wallet. Ask the patient to verify their wallet in their profile, register it on-chain, and grant your verified wallet access.',
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
