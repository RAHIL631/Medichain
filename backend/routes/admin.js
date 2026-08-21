// medichain/backend/routes/admin.js
// Admin routes for data governance.

const express = require('express');
const router  = express.Router();
const Hospital = require('../models/Hospital');
const { protect, authorize } = require('../middleware/auth');

// Apply auth to all admin routes
router.use(protect);
// Assume 'admin' is a valid role, or this could be restricted by other means.
router.use(authorize('admin'));

// ── PATCH /api/admin/hospitals/:id/verify ────────────────────────────────────
/**
 * Mark hospital data as verified.
 */
router.patch('/hospitals/:id/verify', async (req, res) => {
  try {
    const hospital = await Hospital.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, lastVerifiedAt: new Date() },
      { new: true }
    );
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ message: 'Hospital verified', hospital });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/admin/hospitals/stale ───────────────────────────────────────────
/**
 * Find hospitals whose data hasn't been verified in >90 days.
 */
router.get('/hospitals/stale', async (req, res) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const staleHospitals = await Hospital.find({
      $or: [
        { lastVerifiedAt: { $lt: ninetyDaysAgo } },
        { isVerified: false }
      ]
    });
    res.json({ count: staleHospitals.length, hospitals: staleHospitals });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
