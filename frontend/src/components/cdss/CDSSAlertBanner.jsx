// frontend/src/components/cdss/CDSSAlertBanner.jsx
// Contextual alert banner shown after prescription CDSS analysis.
// Displays severity level, safety score, and primary clinical recommendation.

import React, { useState } from 'react';

const SEVERITY_CONFIG = {
  SAFE: {
    bg: 'linear-gradient(135deg, #065f46, #047857)',
    border: '#10b981',
    icon: '✅',
    label: 'SAFE',
    textColor: '#6ee7b7',
  },
  LOW: {
    bg: 'linear-gradient(135deg, #713f12, #92400e)',
    border: '#f59e0b',
    icon: '🟡',
    label: 'LOW RISK',
    textColor: '#fcd34d',
  },
  MODERATE: {
    bg: 'linear-gradient(135deg, #7c2d12, #9a3412)',
    border: '#f97316',
    icon: '⚠️',
    label: 'MODERATE RISK',
    textColor: '#fdba74',
  },
  HIGH: {
    bg: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
    border: '#ef4444',
    icon: '🔴',
    label: 'HIGH RISK',
    textColor: '#fca5a5',
  },
  CRITICAL: {
    bg: 'linear-gradient(135deg, #4a044e, #701a75)',
    border: '#e879f9',
    icon: '🚨',
    label: 'CRITICAL',
    textColor: '#f0abfc',
  },
  UNKNOWN: {
    bg: 'linear-gradient(135deg, #1e293b, #334155)',
    border: '#64748b',
    icon: 'ℹ️',
    label: 'ANALYSIS PENDING',
    textColor: '#94a3b8',
  },
};

export default function CDSSAlertBanner({ analysis, onDismiss }) {
  const [expanded, setExpanded] = useState(false);

  if (!analysis) return null;

  const severity = analysis.severity || 'UNKNOWN';
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.UNKNOWN;
  const score = analysis.safety_score;
  const conflicts = analysis.interaction_analysis?.conflicts || [];
  const recs = analysis.recommendations || [];

  return (
    <div style={{
      background: config.bg,
      border: `1px solid ${config.border}`,
      borderLeft: `4px solid ${config.border}`,
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '16px',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>{config.icon}</span>
          <div>
            <div style={{ color: config.textColor, fontWeight: 700, fontSize: '13px', letterSpacing: '1px' }}>
              AI PRESCRIPTION ANALYSIS — {config.label}
            </div>
            {score !== undefined && (
              <div style={{ color: '#e2e8f0', fontSize: '12px', marginTop: '2px' }}>
                Safety Score: <strong style={{ color: config.textColor }}>{score}/100</strong>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: `1px solid ${config.border}`,
              color: config.textColor,
              borderRadius: '6px',
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {expanded ? 'Less ▲' : 'Details ▼'}
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Clinical explanation */}
      {analysis.clinical_explanation && (
        <p style={{
          color: '#cbd5e1',
          fontSize: '13px',
          margin: '8px 0 0',
          lineHeight: '1.6',
          borderTop: `1px solid rgba(255,255,255,0.1)`,
          paddingTop: '8px',
        }}>
          {analysis.clinical_explanation}
        </p>
      )}

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid rgba(255,255,255,0.1)` }}>

          {/* Drug conflicts */}
          {conflicts.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: config.textColor, fontWeight: 600, fontSize: '12px', letterSpacing: '0.5px', marginBottom: '6px' }}>
                ⚡ DRUG INTERACTIONS ({conflicts.length})
              </div>
              {conflicts.map((c, i) => (
                <div key={i} style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  fontSize: '12px',
                  color: '#e2e8f0',
                }}>
                  <span style={{ color: config.textColor, fontWeight: 600 }}>
                    {c.drug1} ↔ {c.drug2}
                  </span>
                  <span style={{
                    marginLeft: '8px',
                    background: config.border + '33',
                    color: config.textColor,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}>
                    {c.severity}
                  </span>
                  <div style={{ color: '#94a3b8', marginTop: '3px' }}>{c.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {recs.length > 0 && (
            <div>
              <div style={{ color: '#7dd3fc', fontWeight: 600, fontSize: '12px', letterSpacing: '0.5px', marginBottom: '6px' }}>
                💡 CLINICAL RECOMMENDATIONS
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1', fontSize: '12px' }}>
                {recs.map((r, i) => (
                  <li key={i} style={{ marginBottom: '4px', lineHeight: '1.5' }}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
