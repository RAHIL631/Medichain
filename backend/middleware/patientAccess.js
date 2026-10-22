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

  if (canCheckOnChain) {
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
  }

  auditLog(AuditEvents.UNAUTHORIZED, req, {
    resourceType: 'PatientData',
    resourceId: patient._id.toString(),
    reason: 'No verified wallet identity or active on-chain access',
  });
  res.status(403).json({
    error: 'Access denied: link and verify your wallet, then obtain active patient access on-chain.',
  });
  return false;
}

module.exports = { requirePatientAccess };
