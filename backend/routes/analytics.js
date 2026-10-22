// MediChain analytics backed by persisted application records.

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { cacheRoute } = require('../utils/cache');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');

router.use(protect);

router.get('/summary', cacheRoute(60), async (req, res) => {
  try {
    const activityStart = new Date();
    activityStart.setUTCHours(0, 0, 0, 0);
    activityStart.setUTCDate(activityStart.getUTCDate() - 29);
    const [totalPatients, totalDoctors, totalHospitals, totalRecords, anchoredRecords, analyzedPrescriptions, recordsWithCid, fileSizes, activity] = await Promise.all([
      User.countDocuments({ role: 'patient', isActive: true }),
      User.countDocuments({ role: 'doctor', isActive: true }),
      User.countDocuments({ role: 'hospital', isActive: true }),
      MedicalRecord.countDocuments({ isActive: true }),
      MedicalRecord.countDocuments({ isActive: true, blockchainTxHash: { $exists: true, $ne: null } }),
      MedicalRecord.countDocuments({ isActive: true, 'aiAnalysis.analyzedAt': { $ne: null } }),
      MedicalRecord.countDocuments({ isActive: true, ipfsCID: { $exists: true, $ne: '' } }),
      MedicalRecord.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, bytes: { $sum: { $ifNull: ['$fileSize', 0] } } } },
      ]),
      MedicalRecord.aggregate([
        {
          $match: {
            isActive: true,
            createdAt: { $gte: activityStart },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            records: { $sum: 1 },
          },
        },
      ]),
    ]);

    const activityByDate = new Map(activity.map(({ _id, records }) => [_id, records]));
    const recordActivity = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(activityStart);
      date.setUTCDate(date.getUTCDate() + index);
      const key = date.toISOString().slice(0, 10);
      return { date: key, records: activityByDate.get(key) || 0 };
    });

    return res.status(200).json({
      success: true,
      data: {
        platformStats: { totalPatients, totalDoctors, totalHospitals, totalRecords },
        blockchainStats: {
          recordsWithTransactionHash: anchoredRecords,
          networkStatus: 'Not checked',
        },
        ipfsStats: {
          recordsWithCid,
          recordedFileBytes: fileSizes[0]?.bytes || 0,
          gatewayStatus: 'Not checked',
        },
        aiStats: {
          storedPrescriptionAnalyses: analyzedPrescriptions,
          modelAccuracy: null,
        },
        recordActivity,
        diseaseTrends: [],
        medicineTrends: [],
      },
    });
  } catch (err) {
    console.error('[Analytics] /summary error:', err);
    return res.status(500).json({ error: 'Failed to retrieve analytics summary' });
  }
});

router.get('/stats', authorize('doctor', 'hospital'), async (req, res) => {
  try {
    const recordFilter = { doctorId: req.user._id, isActive: true };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [totalRecords, todayUploads, pendingSync, patientIds, typeAgg, weeklyUploads] = await Promise.all([
      MedicalRecord.countDocuments(recordFilter),
      MedicalRecord.countDocuments({ ...recordFilter, createdAt: { $gte: today } }),
      MedicalRecord.countDocuments({ ...recordFilter, $or: [{ blockchainTxHash: null }, { blockchainTxHash: { $exists: false } }] }),
      MedicalRecord.distinct('patientId', recordFilter),
      MedicalRecord.aggregate([
        { $match: recordFilter },
        { $group: { _id: '$recordType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Promise.all(Array.from({ length: 7 }, async (_, index) => {
        const start = new Date(today);
        start.setDate(start.getDate() - (6 - index));
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const [count, day] = await Promise.all([
          MedicalRecord.countDocuments({ ...recordFilter, createdAt: { $gte: start, $lt: end } }),
          Promise.resolve(start.toLocaleDateString('en-US', { weekday: 'short' })),
        ]);
        return { day, uploads: count };
      })),
    ]);
    const typeTotal = typeAgg.reduce((sum, item) => sum + item.count, 0);
    const typeBreakdown = typeAgg.map(({ _id, count }) => ({
      name: _id || 'other',
      value: typeTotal ? Math.round((count / typeTotal) * 100) : 0,
    }));

    return res.status(200).json({
      totalRecords,
      todayUploads,
      pendingSync,
      uniquePatients: patientIds.length,
      weeklyUploads,
      typeBreakdown,
    });
  } catch (err) {
    console.error('[Analytics] /stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

router.get('/platform-stats', authorize('admin'), cacheRoute(60), async (req, res) => {
  try {
    const [totalPatients, totalDoctors, totalHospitals, totalAdmins, totalRecords, totalUsers] = await Promise.all([
      User.countDocuments({ role: 'patient', isActive: true }),
      User.countDocuments({ role: 'doctor', isActive: true }),
      User.countDocuments({ role: 'hospital', isActive: true }),
      User.countDocuments({ role: 'admin', isActive: true }),
      MedicalRecord.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const growthData = await Promise.all(Array.from({ length: 7 }, async (_, index) => {
      const start = new Date(now.getFullYear(), now.getMonth() - (6 - index), 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const [patients, doctors, records] = await Promise.all([
        User.countDocuments({ role: 'patient', isActive: true, createdAt: { $gte: start, $lt: end } }),
        User.countDocuments({ role: 'doctor', isActive: true, createdAt: { $gte: start, $lt: end } }),
        MedicalRecord.countDocuments({ isActive: true, createdAt: { $gte: start, $lt: end } }),
      ]);
      return { month: months[start.getMonth()], patients, doctors, records };
    }));

    return res.status(200).json({
      totalUsers,
      totalPatients,
      totalDoctors,
      totalHospitals,
      totalAdmins,
      totalRecords,
      growthData,
    });
  } catch (err) {
    console.error('[Analytics] /platform-stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve platform stats' });
  }
});

router.get('/users', authorize('admin'), async (req, res) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const role = req.query.role;
    const query = { isActive: true, ...(role ? { role } : {}) };
    const [users, total] = await Promise.all([
      User.find(query)
        .select('name email role walletAddress isWalletLinked isBlockchainRegistered createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(query),
    ]);

    return res.status(200).json({ users, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('[Analytics] /users error:', err);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

module.exports = router;
