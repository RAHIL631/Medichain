// frontend/src/components/MedicalTimeline.jsx
// Medical Timeline — Chronological view of a patient's health records.

import React, { useState, useEffect } from 'react';
import api from '../utils/api';

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  prescription:  { color: 'accent-blue',   icon: '💊', label: 'Prescription'  },
  lab_report:    { color: 'accent-cyan',   icon: '🔬', label: 'Lab Report'    },
  diagnosis:     { color: 'accent-indigo', icon: '🩺', label: 'Diagnosis'     },
  xray:          { color: 'status-warning',icon: '🩻', label: 'X-Ray / Scan'  },
  scan:          { color: 'status-warning',icon: '🩻', label: 'Scan'          },
  other:         { color: 'text-secondary',icon: '📄', label: 'Other'         },
};

const SEVERITY_CONFIG = {
  SAFE:     { bg: 'bg-status-success/10', text: 'text-status-success', border: 'border-status-success/20' },
  LOW:      { bg: 'bg-accent-blue/10',    text: 'text-accent-blue',    border: 'border-accent-blue/20'    },
  MODERATE: { bg: 'bg-status-warning/10', text: 'text-status-warning', border: 'border-status-warning/20' },
  HIGH:     { bg: 'bg-status-danger/10',  text: 'text-status-danger',  border: 'border-status-danger/20'  },
  CRITICAL: { bg: 'bg-red-500/10',        text: 'text-red-400',        border: 'border-red-500/20'        },
};

// ── Timeline Item ─────────────────────────────────────────────────────────────
const TimelineItem = ({ record, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const type = TYPE_CONFIG[record.recordType] || TYPE_CONFIG.other;
  const sev  = record.aiAnalysis?.severity ? SEVERITY_CONFIG[record.aiAnalysis.severity] : null;

  const date = new Date(record.createdAt);
  const formattedDate = date.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const formattedTime = date.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

  return (
    <div className="flex gap-4">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-${type.color}/10 border border-${type.color}/20 flex-shrink-0 z-10`}>
          {type.icon}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gradient-to-b from-medichain-border to-transparent mt-2" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div
          className="bg-medichain-surface/30 border border-medichain-border rounded-xl p-4 hover:border-accent-cyan/20 transition-colors cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border bg-${type.color}/5 text-${type.color} border-${type.color}/20 font-mono uppercase`}>
                  {type.label}
                </span>
                {sev && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${sev.bg} ${sev.text} ${sev.border} font-mono`}>
                    {record.aiAnalysis?.severity}
                  </span>
                )}
                {record.blockchainTxHash && (
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-status-success/10 text-status-success border border-status-success/20 font-mono">
                    ⛓ On-chain
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-white truncate">{record.fileName}</p>
              {record.doctorId?.name && (
                <p className="text-xs text-text-secondary mt-0.5">Dr. {record.doctorId.name}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] text-text-secondary font-mono">{formattedDate}</p>
              <p className="text-[9px] text-text-secondary font-mono opacity-70">{formattedTime}</p>
            </div>
          </div>

          {/* Expandable details */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-medichain-border space-y-3">
              {record.notes && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">Doctor Notes</p>
                  <p className="text-sm text-white/80 leading-relaxed">{record.notes}</p>
                </div>
              )}

              {record.aiAnalysis?.safetyScore !== undefined && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">AI Safety Score</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-medichain-bg-dark rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-status-danger via-status-warning to-status-success transition-all duration-500"
                        style={{ width: `${record.aiAnalysis.safetyScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white font-mono w-10 text-right">
                      {record.aiAnalysis.safetyScore}
                    </span>
                  </div>
                </div>
              )}

              {record.medications?.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-2">Medications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {record.medications.map((med) => (
                      <span key={med} className="text-[10px] px-2 py-1 rounded-full bg-medichain-bg-dark border border-medichain-border text-text-secondary font-mono">
                        {med}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {record.ipfsURL && (
                <a href={record.ipfsURL} target="_blank" rel="noopener noreferrer"
                   className="inline-flex items-center gap-1.5 text-xs text-accent-cyan hover:underline mt-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                  View on IPFS
                </a>
              )}
            </div>
          )}

          {/* Expand indicator */}
          <div className="flex justify-center mt-2">
            <svg className={`w-4 h-4 text-text-secondary transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                 fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Year Group ────────────────────────────────────────────────────────────────
const YearGroup = ({ year, records }) => {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 mb-4 group"
      >
        <span className="text-xs font-black uppercase tracking-widest text-text-secondary group-hover:text-white transition-colors">
          {year}
        </span>
        <div className="flex-1 h-px bg-medichain-border group-hover:bg-medichain-border/80" />
        <span className="text-[10px] text-text-secondary font-mono">{records.length} records</span>
        <svg className={`w-3 h-3 text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`}
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
      {open && (
        <div>
          {records.map((record, i) => (
            <TimelineItem key={record._id} record={record} isLast={i === records.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const MedicalTimeline = ({ patientId, className = '' }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = patientId ? `/doctor/patient/${patientId}/records` : '/patient/records';
        const { data } = await api.get(url);
        setRecords(data.records || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, [patientId]);

  const filtered = filter === 'all'
    ? records
    : records.filter(r => r.recordType === filter);

  // Group by year
  const byYear = filtered.reduce((acc, record) => {
    const year = new Date(record.createdAt).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(record);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => b - a);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-medichain-surface animate-pulse flex-shrink-0" />
            <div className="flex-1 h-24 bg-medichain-surface/30 border border-medichain-border rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-status-danger text-sm">{error}</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-medichain-surface border border-medichain-border flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </div>
        <p className="text-text-secondary text-sm">No medical records found</p>
        <p className="text-text-secondary/60 text-xs mt-1">Records will appear here as they are uploaded</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['all','prescription','lab_report','diagnosis','xray','other'].map(f => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase transition-all ${
              filter === f
                ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                : 'bg-medichain-surface text-text-secondary border border-medichain-border hover:border-accent-cyan/20 hover:text-white'
            }`}
          >
            {f === 'all' ? 'All' : TYPE_CONFIG[f]?.label || f}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-text-secondary self-center font-mono">
          {filtered.length} / {records.length} records
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {years.map(year => (
          <YearGroup key={year} year={year} records={byYear[year]} />
        ))}
      </div>
    </div>
  );
};

export default MedicalTimeline;
