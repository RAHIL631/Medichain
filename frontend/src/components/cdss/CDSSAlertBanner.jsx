// frontend/src/components/cdss/CDSSAlertBanner.jsx
// Contextual alert banner shown after prescription CDSS analysis.
// Displays severity level, safety score, and primary clinical recommendation.

import React, { useState } from 'react';

const SEVERITY_CONFIG = {
  SAFE: {
    bg: 'linear-gradient(135deg, #E9F4EC, #B9D8C5)',
    border: '#16866a',
    icon: '✅',
    label: 'SAFE',
    textColor: '#0F6852',
  },
  LOW: {
    bg: 'linear-gradient(135deg, #FBF3DE, #EBCB82)',
    border: '#805B12',
    icon: '🟡',
    label: 'LOW RISK',
    textColor: '#805B12',
  },
  MODERATE: {
    bg: 'linear-gradient(135deg, #F8E5DD, #F8E5DD)',
    border: '#B44736',
    icon: '⚠️',
    label: 'MODERATE RISK',
    textColor: '#8D3A2D',
  },
  HIGH: {
    bg: 'linear-gradient(135deg, #F8E5DD, #F8E5DD)',
    border: '#b44736',
    icon: '🔴',
    label: 'HIGH RISK',
    textColor: '#8D3A2D',
  },
  CRITICAL: {
    bg: 'linear-gradient(135deg, #F8E5DD, #F8E5DD)',
    border: '#B44736',
    icon: '🚨',
    label: 'CRITICAL',
    textColor: '#8D3A2D',
  },
  UNKNOWN: {
    bg: 'linear-gradient(135deg, #ffffff, #e9f4ec)',
    border: '#68766e',
    icon: 'ℹ️',
    label: 'ANALYSIS PENDING',
    textColor: '#68766e',
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
      boxShadow: '0 4px 16px rgba(38,53,46,0.08)',
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
              <div style={{ color: '#26352e', fontSize: '12px', marginTop: '2px' }}>
                Safety Score: <strong style={{ color: config.textColor }}>{score}/100</strong>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: '#FFFFFF',
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
                color: '#68766e',
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
          color: '#68766e',
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
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E4E9E2' }}>

          {/* Drug conflicts */}
          {conflicts.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ color: config.textColor, fontWeight: 600, fontSize: '12px', letterSpacing: '0.5px', marginBottom: '6px' }}>
                ⚡ DRUG INTERACTIONS ({conflicts.length})
              </div>
              {conflicts.map((c, i) => (
                <div key={i} style={{
                  background: '#FFFFFF',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  marginBottom: '6px',
                  fontSize: '12px',
                  color: '#26352e',
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
                  <div style={{ color: '#68766e', marginTop: '3px' }}>{c.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {recs.length > 0 && (
            <div>
              <div style={{ color: '#0F6852', fontWeight: 600, fontSize: '12px', letterSpacing: '0.5px', marginBottom: '6px' }}>
                💡 CLINICAL RECOMMENDATIONS
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', color: '#68766e', fontSize: '12px' }}>
                {recs.map((r, i) => (
                  <li key={i} style={{ marginBottom: '4px', lineHeight: '1.5' }}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Clinical Disclaimer */}
          <div style={{
            marginTop: '12px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: '11px',
            color: '#68766e',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>⚕️</span>
            <span>Clinical Notice: Algorithmic decision support. Not a replacement for professional clinical judgment. Licensed medical practitioners must verify all drug interactions and dosages.</span>
          </div>
        </div>
      )}
    </div>
  );
}
