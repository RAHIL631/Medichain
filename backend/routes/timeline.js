// medichain/backend/routes/timeline.js
// Health Timeline API — consolidates medical events into a unified, filterable timeline.
// Aggregates: MedicalRecords, PrescriptionReports, AuditLogs, and EnsembleReports
// into a single chronological timeline per patient.

const express = require('express');
const router  = express.Router();
const { query, validationResult } = require('express-validator');

const { protect, authorize } = require('../middleware/auth');
const MedicalRecord     = require('../models/MedicalRecord');
const PrescriptionReport = require('../models/PrescriptionReport');
const HealthRiskReport  = require('../models/HealthRiskReport');
const EnsembleReport    = require('../models/EnsembleReport');
const AdherenceLog      = require('../models/AdherenceLog');

const logger = (...args) => console.log('[TIMELINE]', ...args);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a medical record to a unified timeline event.
 */
function recordToEvent(record) {
  return {
    id:          `record_${record._id}`,
    eventType:   'medical_record',
    category:    record.recordType,
    title:       `${capitalise(record.recordType.replace(/_/g, ' '))} Uploaded`,
    description: record.notes || `${record.recordType} uploaded by doctor`,
    date:        record.createdAt,
    metadata: {
      fileName:      record.fileName,
      fileSize:      record.formattedFileSize,
      ipfsCID:       record.ipfsCID,
      ipfsURL:       record.ipfsURL,
      doctorId:      record.doctorId,
      aiSafetyScore: record.aiAnalysis?.safetyScore,
      aiSeverity:    record.aiAnalysis?.severity,
      medications:   record.medications,
    },
    blockchain: {
      txHash:      record.blockchainTxHash  || null,
      blockNumber: record.blockchainBlockNumber || null,
      confirmed:   Boolean(record.blockchainTxHash),
    },
    severity: mapAiSeverityToLevel(record.aiAnalysis?.severity),
    icon:     recordTypeIcon(record.recordType),
    color:    recordTypeColor(record.recordType),
  };
}

/**
 * Maps a prescription report to a timeline event.
 */
function prescriptionToEvent(report) {
  return {
    id:          `prescription_${report._id}`,
    eventType:   'prescription_analysis',
    category:    'prescription',
    title:       'Prescription Analyzed',
    description: `Safety score: ${report.safetyScore || 0}/100 — ${report.severity || 'UNKNOWN'}`,
    date:        report.createdAt,
    metadata: {
      safetyScore:   report.safetyScore,
      severity:      report.severity,
      medications:   report.medications,
      interactions:  report.interactions?.length || 0,
    },
    blockchain: { confirmed: false },
    severity:   mapAiSeverityToLevel(report.severity),
    icon:       '💊',
    color:      '#8b5cf6',
  };
}

/**
 * Maps a health risk report to a timeline event.
 */
function riskReportToEvent(report) {
  return {
    id:          `risk_${report._id}`,
    eventType:   'health_risk_assessment',
    category:    'ai_analysis',
    title:       'Health Risk Assessment',
    description: `Overall risk: ${report.overallRisk || 'Unknown'}`,
    date:        report.createdAt,
    metadata: {
      overallRisk:   report.overallRisk,
      topRisk:       report.topRiskDisease,
      predictions:   report.predictions,
    },
    blockchain: { confirmed: false },
    severity:   report.overallRisk === 'HIGH' ? 'high' : report.overallRisk === 'MODERATE' ? 'medium' : 'low',
    icon:       '🧬',
    color:      '#06b6d4',
  };
}

/**
 * Maps an ensemble predictor report to a timeline event.
 */
function ensembleToEvent(report) {
  return {
    id:          `ensemble_${report._id}`,
    eventType:   'ensemble_prediction',
    category:    'ai_analysis',
    title:       'Ensemble Disease Prediction',
    description: `Top prediction: ${report.topDisease || 'Unknown'}`,
    date:        report.createdAt,
    metadata:    report,
    blockchain:  { confirmed: false },
    severity:    'info',
    icon:        '🔬',
    color:       '#f59e0b',
  };
}

/**
 * Maps an adherence log entry to a timeline event.
 */
function adherenceToEvent(log) {
  return {
    id:          `adherence_${log._id}`,
    eventType:   'adherence_log',
    category:    'medication',
    title:       `Medication ${log.taken ? 'Taken' : 'Missed'}`,
    description: `${log.medicationName || 'Medication'} — ${log.taken ? '✅ Taken' : '❌ Missed'}`,
    date:        log.scheduledAt || log.createdAt,
    metadata: {
      medicationName: log.medicationName,
      taken:          log.taken,
      reason:         log.missedReason,
    },
    blockchain: { confirmed: false },
    severity:   log.taken ? 'low' : 'medium',
    icon:       log.taken ? '✅' : '⚠️',
    color:      log.taken ? '#10b981' : '#f59e0b',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function capitalise(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function mapAiSeverityToLevel(severity) {
  if (!severity) return 'info';
  const s = severity.toUpperCase();
  if (s === 'CRITICAL' || s === 'HIGH') return 'high';
  if (s === 'MODERATE')                 return 'medium';
  if (s === 'LOW' || s === 'SAFE')      return 'low';
  return 'info';
}

function recordTypeIcon(type) {
  const icons = {
    prescription: '💊', lab_report: '🧪', diagnosis: '🩺',
    xray: '🫁', scan: '📷', other: '📄',
  };
  return icons[type] || '📄';
}

function recordTypeColor(type) {
  const colors = {
    prescription: '#8b5cf6', lab_report: '#06b6d4', diagnosis: '#f43f5e',
    xray: '#64748b', scan: '#64748b', other: '#94a3b8',
  };
  return colors[type] || '#94a3b8';
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: GET /api/timeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/timeline
 * @desc    Get unified health timeline for the authenticated patient.
 *          Doctors/hospitals can pass ?patientId= to view a patient's timeline.
 * @query   { patientId, category, from, to, limit, page }
 * @access  Private
 */
router.get('/', protect, [
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('page').optional().isInt({ min: 1 }),
  query('category').optional().isIn(['medical_record', 'prescription_analysis', 'health_risk_assessment', 'ensemble_prediction', 'adherence_log', 'ai_analysis']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

  try {
    const {
      patientId: qPatientId,
      category,
      from,
      to,
      limit = 50,
      page  = 1,
    } = req.query;

    // Determine target patient
    let targetPatientId;
    if (req.user.role === 'patient') {
      targetPatientId = req.user._id;
    } else if (['doctor', 'hospital', 'admin'].includes(req.user.role)) {
      if (!qPatientId) return res.status(400).json({ error: 'patientId is required for doctor/hospital/admin' });
      targetPatientId = qPatientId;
    }

    logger(`Timeline requested for patient ${targetPatientId} by ${req.user.role} ${req.user._id}`);

    // Date filter
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to)   dateFilter.$lte = new Date(to);
    const createdAtFilter = Object.keys(dateFilter).length ? { createdAt: dateFilter } : {};

    // Fetch all event types in parallel
    const [records, prescriptions, riskReports, ensembleReports, adherenceLogs] = await Promise.all([
      MedicalRecord.find({ patientId: targetPatientId, isActive: true, ...createdAtFilter })
        .select('recordType fileName fileSize ipfsCID ipfsURL notes medications aiAnalysis blockchainTxHash blockchainBlockNumber createdAt doctorId')
        .lean(),

      PrescriptionReport.find({ patientId: targetPatientId, ...createdAtFilter })
        .select('safetyScore severity medications interactions createdAt')
        .lean().catch(() => []),

      HealthRiskReport.find({ patientId: targetPatientId, ...createdAtFilter })
        .select('overallRisk topRiskDisease predictions createdAt')
        .lean().catch(() => []),

      EnsembleReport.find({ patientId: targetPatientId, ...createdAtFilter })
        .select('topDisease predictions createdAt')
        .lean().catch(() => []),

      AdherenceLog.find({ patientId: targetPatientId, ...createdAtFilter })
        .select('medicationName taken missedReason scheduledAt createdAt')
        .lean().catch(() => []),
    ]);

    // Convert to unified timeline events
    let events = [
      ...records.map(recordToEvent),
      ...prescriptions.map(prescriptionToEvent),
      ...riskReports.map(riskReportToEvent),
      ...ensembleReports.map(ensembleToEvent),
      ...adherenceLogs.map(adherenceToEvent),
    ];

    // Filter by category if specified
    if (category) {
      events = events.filter((e) => e.eventType === category || e.category === category);
    }

    // Sort by date descending
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Pagination
    const total   = events.length;
    const start   = (page - 1) * limit;
    const paged   = events.slice(start, start + Number(limit));

    // Build summary statistics
    const categoryCounts = events.reduce((acc, e) => {
      acc[e.eventType] = (acc[e.eventType] || 0) + 1;
      return acc;
    }, {});

    const blockchainConfirmed = events.filter((e) => e.blockchain?.confirmed).length;

    res.json({
      events:   paged,
      total,
      page:     Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      summary: {
        totalEvents:        total,
        blockchainConfirmed,
        categoryCounts,
        earliestEvent:      events[events.length - 1]?.date,
        latestEvent:        events[0]?.date,
      },
    });
  } catch (err) {
    logger('Timeline error:', err.message);
    res.status(500).json({ error: 'Failed to build timeline', details: err.message });
  }
});

/**
 * @route   GET /api/timeline/stats
 * @desc    Get high-level timeline statistics for a patient
 * @access  Private
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const patientId = req.user.role === 'patient' ? req.user._id : req.query.patientId;
    if (!patientId) return res.status(400).json({ error: 'patientId required' });

    const [recordCount, prescriptionCount, riskCount] = await Promise.all([
      MedicalRecord.countDocuments({ patientId, isActive: true }),
      PrescriptionReport.countDocuments({ patientId }).catch(() => 0),
      HealthRiskReport.countDocuments({ patientId }).catch(() => 0),
    ]);

    const lastRecord = await MedicalRecord.findOne({ patientId, isActive: true })
      .sort({ createdAt: -1 })
      .select('recordType createdAt')
      .lean();

    res.json({
      counts: {
        medicalRecords:  recordCount,
        prescriptions:   prescriptionCount,
        riskAssessments: riskCount,
        total:           recordCount + prescriptionCount + riskCount,
      },
      lastEvent: lastRecord ? {
        type: lastRecord.recordType,
        date: lastRecord.createdAt,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
