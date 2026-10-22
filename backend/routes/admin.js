// medichain/backend/routes/admin.js
// Admin routes for data governance and platform health.

const express = require('express');
const router  = express.Router();
const axios = require('axios');
const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const { protect, authorize } = require('../middleware/auth');
const { getRedisClient } = require('../utils/cache');
const { testPinataConnection } = require('../utils/ipfs');

// Apply auth to all admin routes
router.use(protect);
router.use(authorize('admin'));

const timedCheck = async (fn, ms = 2000) => {
  const started = Date.now();
  const timeout = new Promise((resolve) => setTimeout(() => resolve({ __timeout: true }), ms));
  try {
    const result = await Promise.race([fn(), timeout]);
    const latencyMs = Date.now() - started;
    if (result && result.__timeout) {
      return { status: 'latency_warning', latencyMs: ms, detail: `No response within ${ms}ms` };
    }
    return { ...result, latencyMs };
  } catch (err) {
    return { status: 'offline', latencyMs: Date.now() - started, detail: err.message };
  }
};

// ── GET /api/admin/system-health ─────────────────────────────────────────────
/**
 * Live operational status for AI, IPFS, blockchain RPC, Redis, and MongoDB.
 */
router.get('/system-health', async (req, res) => {
  try {
    const database = await timedCheck(async () => ({
      status: mongoose.connection.readyState === 1 ? 'ok' : 'disconnected',
      detail: mongoose.connection.name || 'medichain',
    }), 500);

    const blockchain = await timedCheck(async () => {
      const blockchainService = require('../services/blockchainService');
      const health = await blockchainService.checkHealth();
      return {
        status: health?.status === 'UP' ? 'ok' : 'degraded',
        detail: health?.network || health?.message || 'RPC checked',
      };
    });

    const aiService = await timedCheck(async () => {
      const aiUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
      const aiRes = await axios.get(`${aiUrl}/health`, { timeout: 2000 });
      return {
        status: aiRes.status === 200 ? 'ok' : 'offline',
        detail: aiRes.data?.service || aiRes.data?.status || 'AI reachable',
      };
    });

    const ipfs = await timedCheck(async () => {
      const pinata = await testPinataConnection();
      return {
        status: pinata.authenticated ? 'ok' : 'degraded',
        mode: pinata.mode || 'pinata',
        detail: pinata.message,
      };
    });

    const redis = await timedCheck(async () => {
      const client = getRedisClient();
      if (!client || !client.isReady) {
        return { status: 'offline', detail: 'Redis optional — caching disabled' };
      }
      await client.ping();
      return { status: 'ok', detail: 'PONG' };
    });

    const services = { database, blockchain, aiService, ipfs, redis };
    const criticalOk = database.status === 'ok';
    const requiredServices = [database, blockchain, aiService, ipfs];
    const allRequiredHealthy = requiredServices.every(
      (service) => service.status === 'ok' || service.status === 'degraded'
    );

    return res.json({
      status: criticalOk ? (allRequiredHealthy ? 'healthy' : 'degraded') : 'unhealthy',
      services,
      checkedAt: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to collect system health', detail: err.message });
  }
});

// ── PATCH /api/admin/hospitals/:id/verify ────────────────────────────────────
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
