// frontend/src/components/prescription/SafetyCheckCard.jsx
// Card for individual safety check results (allergy / pregnancy / kidney / liver).

import React, { useState } from 'react';

const STATUS_CONFIG = {
  SAFE:              { color: '#16866a', bg: 'rgba(34,197,94,0.08)',   icon: '✅', label: 'Safe' },
  CLEAR:             { color: '#16866a', bg: 'rgba(34,197,94,0.08)',   icon: '✅', label: 'Clear' },
  NOT_APPLICABLE:    { color: '#68766e', bg: 'rgba(100,116,139,0.08)', icon: '—',  label: 'N/A' },
  USE_WITH_CAUTION:  { color: '#805B12', bg: '#FBF3DE', icon: '⚠️', label: 'Caution' },
  HIGH_RISK:         { color: '#b44736', bg: 'rgba(239,68,68,0.08)',   icon: '🔴', label: 'High Risk' },
  CONTRAINDICATED:   { color: '#b44736', bg: '#f8e5dd',  icon: '🚨', label: 'Contraindicated' },
  EXCEEDS_MAX:       { color: '#b44736', bg: 'rgba(239,68,68,0.08)',   icon: '🔴', label: 'Exceeds Max' },
  OVERDOSE:          { color: '#b44736', bg: '#f8e5dd',  icon: '🚨', label: 'Overdose' },
  DAILY_LIMIT_EXCEEDED: { color: '#805B12', bg: '#FBF3DE', icon: '⚠️', label: 'Daily Limit' },
  UNKNOWN:           { color: '#68766e', bg: 'rgba(100,116,139,0.08)', icon: '❓', label: 'Unknown' },
};

const SEVERITY_COLOR = {
  NONE: '#16866a', LOW: '#ebcb82', MODERATE: '#d97860',
  HIGH: '#b44736', CRITICAL: '#d97860', UNKNOWN: '#68766e',
};

function CheckRow({ result, showExtra }) {
  const [expanded, setExpanded] = useState(false);
  const status   = result.status || 'UNKNOWN';
  const severity = result.severity || 'NONE';
  const config   = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
  const sevColor = SEVERITY_COLOR[severity] || SEVERITY_COLOR.NONE;
  const isAlert  = ['CONTRAINDICATED', 'HIGH_RISK', 'EXCEEDS_MAX', 'OVERDOSE'].includes(status);

  return (
    <div style={{
      background: isAlert ? config.bg : '#FFFFFF',
      border: `1px solid ${isAlert ? config.color + '33' : '#E4E9E2'}`,
      borderRadius: '10px',
      padding: '12px 14px',
      transition: 'all 0.2s',
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: result.message ? 'pointer' : 'default' }}
        onClick={() => result.message && setExpanded(e => !e)}
      >
        {/* Status icon */}
        <span style={{ fontSize: '16px', flexShrink: 0 }}>{config.icon}</span>

        {/* Drug name */}
        <span style={{ flex: 1, color: '#26352E', fontSize: '13px', fontWeight: 600 }}>
          {result.drug}
        </span>

        {/* Extra info (GFR / liver score) */}
        {showExtra && result.patient_gfr !== undefined && (
          <span style={{ color: '#68766e', fontSize: '10px', flexShrink: 0 }}>
            GFR {result.patient_gfr} mL/min
          </span>
        )}
        {showExtra && result.liver_score !== undefined && (
          <span style={{ color: '#68766e', fontSize: '10px', flexShrink: 0 }}>
            Score {result.liver_score} ({result.liver_class || ''})
          </span>
        )}

        {/* Status badge */}
        <span style={{
          padding: '3px 10px',
          borderRadius: '20px',
          background: config.bg,
          border: `1px solid ${config.color}44`,
          color: config.color,
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.5px',
          flexShrink: 0,
        }}>
          {config.label}
        </span>

        {/* Severity dot */}
        <span style={{
          width: '8px', height: '8px',
          borderRadius: '50%',
          background: sevColor,
          flexShrink: 0,
          boxShadow: severity !== 'NONE' ? `0 0 6px ${sevColor}88` : 'none',
        }} />

        {/* Expand chevron */}
        {result.message && (
          <span style={{ color: '#68766e', fontSize: '11px', flexShrink: 0, transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        )}
      </div>

      {/* Expanded message */}
      {expanded && result.message && (
        <p style={{
          marginTop: '10px',
          paddingTop: '10px',
          borderTop: '1px solid #E4E9E2',
          color: '#68766E',
          fontSize: '12px',
          lineHeight: 1.5,
          margin: '10px 0 0',
        }}>
          {result.message}
        </p>
      )}
    </div>
  );
}

export default function SafetyCheckCard({ title, icon, results = [], showExtra = false }) {
  const flagCount = results.filter(r =>
    ['CONTRAINDICATED', 'HIGH_RISK', 'EXCEEDS_MAX', 'OVERDOSE', 'DAILY_LIMIT_EXCEEDED'].includes(r.status)
  ).length;
  const warnCount = results.filter(r => r.status === 'USE_WITH_CAUTION').length;

  const headerColor = flagCount > 0 ? '#d97860' : warnCount > 0 ? '#d97860' : '#16866a'; // eslint-disable-line no-unused-vars

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FAF8F1 0%, #E9F4EC 100%)',
      border: `1px solid ${flagCount > 0 ? '#D97860' : '#E4E9E2'}`,
      borderRadius: '14px',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid #E4E9E2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#FFFFFF',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>{icon}</span>
          <span style={{ color: '#26352E', fontWeight: 700, fontSize: '14px' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {flagCount > 0 && (
            <span style={{
              padding: '2px 10px', borderRadius: '20px',
              background: '#F8E5DD', border: '1px solid #D97860',
              color: '#8D3A2D', fontSize: '11px', fontWeight: 700,
            }}>
              {flagCount} Flag{flagCount > 1 ? 's' : ''}
            </span>
          )}
          {warnCount > 0 && (
            <span style={{
              padding: '2px 10px', borderRadius: '20px',
              background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)',
              color: '#8D3A2D', fontSize: '11px', fontWeight: 700,
            }}>
              {warnCount} Warning{warnCount > 1 ? 's' : ''}
            </span>
          )}
          {flagCount === 0 && warnCount === 0 && results.length > 0 && (
            <span style={{
              padding: '2px 10px', borderRadius: '20px',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              color: '#16866a', fontSize: '11px', fontWeight: 700,
            }}>All Clear</span>
          )}
        </div>
      </div>

      {/* Results list */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {results.length === 0 ? (
          <p style={{ color: '#68766e', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>
            No data available
          </p>
        ) : (
          results.map((result, i) => (
            <CheckRow key={i} result={result} showExtra={showExtra} />
          ))
        )}
      </div>
    </div>
  );
}
