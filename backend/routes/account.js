// medichain/backend/routes/account.js
// Patient data rights endpoints: export, account deletion.
// Mounted at /api/account in server.js

'use strict';

const express       = require('express');
const router        = express.Router();
const User          = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const ConsentRecord = require('../models/ConsentRecord');
const AuditLog      = require('../models/AuditLog');
const { protect }   = require('../middleware/auth');
const { auditLog }  = require('../utils/auditLogger');
const { blockToken } = require('../services/tokenBlocklist');

// Apply auth to all routes
router.use(protect);

// ── GET /api/account/export ───────────────────────────────────────────────────
/**
 * Export all personal data for the authenticated user (GDPR/DPDPA right of access).
 * Returns a JSON snapshot of all stored data.
 *
 * @access  Any authenticated user
 */
router.get('/export', async (req, res) => {
  try {
    const userId = req.user._id;

    const [user, records, consents, auditLogs] = await Promise.all([
      // Full profile (excluding sensitive fields)
      User.findById(userId).select(
        '-password -emailVerifyToken -emailVerifyExpires -passwordResetToken -passwordResetExpires -loginAttempts -lockUntil'
      ).lean(),

      // Medical records
      MedicalRecord.find({ patientId: userId })
        .select('-__v')
        .populate('doctorId', 'name email specialization')
        .lean(),

      // Consent grants
      ConsentRecord.find({ patientId: userId })
        .populate('granteeId', 'name email role')
        .lean(),

      // Own audit trail (last 90 days)
      AuditLog.find({
        userId,
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      }).select('-__v').lean(),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedFor: req.user.email,
      notice: 'This is all personal data MediChain holds for your account as of the export date.',
      profile:    user,
      medicalRecords: records,
      consentRecords: consents,
      auditTrail: auditLogs,
      blockchainNote:
        'Some data (IPFS CIDs, wallet addresses) is also anchored to the Ethereum blockchain and cannot be deleted from the chain.',
    };

    auditLog('DATA_EXPORT', req, { userId: userId.toString() });

    return res.status(200).json(exportData);
  } catch (err) {
    console.error('[ACCOUNT] Export error:', err.message);
    return res.status(500).json({ error: 'Failed to export account data' });
  }
});

// ── DELETE /api/account ───────────────────────────────────────────────────────
/**
 * Soft-delete the authenticated user's account (GDPR/DPDPA right of erasure).
 *
 * What happens:
 *  - User profile: isActive = false, sensitive fields cleared, email anonymised
 *  - Medical records: isActive = false (soft-delete, preserves blockchain references)
 *  - Consent records: revoked
 *  - Auth tokens: blocklisted
 *
 * What CANNOT be erased:
 *  - Blockchain-anchored CIDs (immutable by design)
 *  - Audit logs (legally required retention)
 *  - IPFS files (require separate Pinata unpin — handled asynchronously)
 *
 * Body: { password, confirmDelete: "DELETE MY ACCOUNT" }
 * @access  Patient, Doctor, Hospital (own account only)
 */
router.delete('/', async (req, res) => {
  try {
    const { password, confirmDelete } = req.body;

    // Require explicit confirmation string to prevent accidental deletion
    if (confirmDelete !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        error: 'To confirm deletion, send confirmDelete: "DELETE MY ACCOUNT"',
      });
    }

    // Re-fetch with password for verification
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Verify password before deletion
    if (password) {
      const valid = await user.comparePassword(password);
      if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    } else {
      return res.status(400).json({ error: 'Password is required to delete account' });
    }

    const userId = user._id;

    // Soft-delete operations in parallel
    await Promise.all([
      // Anonymise and deactivate user account
      User.findByIdAndUpdate(userId, {
        isActive:   false,
        name:       `Deleted User ${userId.toString().slice(-6)}`,
        email:      `deleted_${userId}@medichain.deleted`,
        walletAddress:          null,
        isWalletLinked:         false,
        isBlockchainRegistered: false,
        bloodGroup:             null,
        allergies:              [],
        chronicConditions:      [],
        dateOfBirth:            null,
        phone:                  null,
        updatedAt:              new Date(),
      }),

      // Soft-delete all medical records
      MedicalRecord.updateMany(
        { patientId: userId },
        { isActive: false, updatedAt: new Date() }
      ),

      // Revoke all active consents
      ConsentRecord.updateMany(
        { patientId: userId, status: 'active' },
        { status: 'revoked', revokedAt: new Date(), revocationReason: 'Account deleted' }
      ),
    ]);

    // Blocklist the current access token
    const authHeader = req.headers['authorization'] || '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (accessToken) {
      await blockToken(accessToken, 86400).catch(() => {});
    }

    // Log the deletion
    auditLog('ACCOUNT_DELETED', req, { userId: userId.toString() });

    return res.status(200).json({
      message: 'Account deleted successfully. Your data has been anonymised.',
      note: 'Data anchored to the blockchain cannot be removed (immutable by design). Audit logs are retained for the legal retention period.',
    });

  } catch (err) {
    console.error('[ACCOUNT] Delete error:', err.message);
    return res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ── GET /api/account/consents ─────────────────────────────────────────────────
/**
 * List all active consent grants for the authenticated patient.
 */
router.get('/consents', async (req, res) => {
  try {
    const consents = await ConsentRecord.find({
      patientId: req.user._id,
      status: 'active',
    })
      .populate('granteeId', 'name email role specialization hospitalName')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ consents });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch consents' });
  }
});

module.exports = router;
