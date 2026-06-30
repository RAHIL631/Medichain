// frontend/src/components/prescription/InteractionMatrix.jsx
// N×N drug interaction matrix grid + conflict list.

import React, { useState } from 'react';

const SEV_STYLE = {
  NONE:     { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e',  label: '✓' },
  LOW:      { bg: 'rgba(234,179,8,0.15)',  color: '#eab308',  label: 'L' },
  MODERATE: { bg: 'rgba(249,115,22,0.15)', color: '#f97316',  label: 'M' },
  HIGH:     { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444',  label: 'H' },
  CRITICAL: { bg: 'rgba(168,85,247,0.2)',  color: '#a855f7',  label: '!' },
  UNKNOWN:  { bg: 'rgba(100,116,139,0.1)', color: '#64748b',  label: '?' },
};

function MatrixCell({ severity, tooltip, onClick }) {
  const s = SEV_STYLE[severity] || SEV_STYLE.NONE;
  return (
    <div
      title={tooltip}
      onClick={onClick}
      style={{
        width: '36px', height: '36px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: s.bg,
        border: `1px solid ${s.color}44`,
        borderRadius: '6px',
        color: s.color,
        fontWeight: 800,
        fontSize: '12px',
        cursor: severity !== 'NONE' ? 'pointer' : 'default',
        transition: 'transform 0.1s, box-shadow 0.1s',
        boxShadow: severity !== 'NONE' ? `0 0 8px ${s.color}22` : 'none',
      }}
      onMouseEnter={e => {
        if (severity !== 'NONE') {
          e.currentTarget.style.transform = 'scale(1.2)';
          e.currentTarget.style.boxShadow = `0 0 12px ${s.color}55`;
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = severity !== 'NONE' ? `0 0 8px ${s.color}22` : 'none';
      }}
    >
      {s.label}
    </div>
  );
}

export default function InteractionMatrix({ medications = [], interactions = {} }) {
  const [selected, setSelected] = useState(null);

  const conflicts   = interactions.conflicts || [];
  const matrix      = interactions.interaction_matrix || {};
  const severityCts = interactions.severity_counts || {};
  const combos      = interactions.combination_analysis || [];

  // Build a severity lookup: "Drug1 ↔ Drug2" → severity
  const pairSeverity = {};
  Object.entries(matrix).forEach(([key, val]) => {
    pairSeverity[key] = val.severity || 'NONE';
  });
  conflicts.forEach(c => {
    const key = `${c.drug1} ↔ ${c.drug2}`;
    pairSeverity[key] = c.severity || 'LOW';
  });

  const getSeverity = (d1, d2) => {
    const k1 = `${d1} ↔ ${d2}`;
    const k2 = `${d2} ↔ ${d1}`;
    return pairSeverity[k1] || pairSeverity[k2] || 'NONE';
  };

  if (!medications.length) {
    return (
      <p style={{ color: '#4b5563', textAlign: 'center', padding: '32px', fontSize: '13px' }}>
        No medications to display interaction matrix.
      </p>
    );
  }

  if (medications.length === 1) {
    return (
      <p style={{ color: '#4b5563', textAlign: 'center', padding: '32px', fontSize: '13px' }}>
        At least 2 medications required for interaction analysis.
      </p>
    );
  }

  const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'NONE'];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Summary counts */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {SEVERITY_ORDER.filter(s => s !== 'NONE').map(sev => (
          severityCts[sev] > 0 && (
            <div key={sev} style={{
              padding: '6px 14px', borderRadius: '20px',
              background: SEV_STYLE[sev].bg,
              border: `1px solid ${SEV_STYLE[sev].color}44`,
              color: SEV_STYLE[sev].color,
              fontSize: '12px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: SEV_STYLE[sev].color, display: 'inline-block' }} />
              {sev}: {severityCts[sev]}
            </div>
          )
        ))}
        {conflicts.length === 0 && (
          <div style={{
            padding: '6px 14px', borderRadius: '20px',
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            color: '#22c55e', fontSize: '12px', fontWeight: 700,
          }}>✅ No interactions detected</div>
        )}
      </div>

      {/* Matrix grid */}
      {medications.length <= 10 && (
        <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${medications.length}, 36px)`, gap: '4px', minWidth: 'max-content' }}>
            {/* Header row */}
            <div /> {/* empty top-left */}
            {medications.map((m, i) => (
              <div key={i} style={{
                color: '#6b7280', fontSize: '9px', fontWeight: 700,
                textAlign: 'center', padding: '2px', lineHeight: 1.2,
                whiteSpace: 'nowrap', overflow: 'hidden',
                textOverflow: 'ellipsis', maxWidth: '36px',
              }} title={typeof m === 'object' ? m.drug || m.name : m}>
                {(typeof m === 'object' ? m.drug || m.name : m).substring(0, 6)}
              </div>
            ))}

            {/* Data rows */}
            {medications.map((rowMed, rowIdx) => {
              const rowName = typeof rowMed === 'object' ? rowMed.drug || rowMed.name : rowMed;
              return (
                <React.Fragment key={rowIdx}>
                  <div style={{
                    color: '#9ca3af', fontSize: '10px', fontWeight: 600,
                    display: 'flex', alignItems: 'center',
                    paddingRight: '8px', overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }} title={rowName}>
                    {rowName.length > 14 ? rowName.substring(0, 14) + '…' : rowName}
                  </div>
                  {medications.map((colMed, colIdx) => {
                    const colName = typeof colMed === 'object' ? colMed.drug || colMed.name : colMed;
                    if (rowIdx === colIdx) {
                      return (
                        <div key={colIdx} style={{
                          width: '36px', height: '36px',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: '6px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#374151', fontSize: '14px',
                        }}>•</div>
                      );
                    }
                    const sev = getSeverity(rowName, colName);
                    const conflict = conflicts.find(c =>
                      (c.drug1 === rowName && c.drug2 === colName) ||
                      (c.drug1 === colName && c.drug2 === rowName)
                    );
                    return (
                      <MatrixCell
                        key={colIdx}
                        severity={sev}
                        tooltip={conflict ? `${sev}: ${conflict.description?.substring(0, 80)}…` : 'No interaction'}
                        onClick={() => conflict && setSelected(conflict)}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            {['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'NONE'].map(sev => (
              <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '14px', height: '14px',
                  borderRadius: '3px',
                  background: SEV_STYLE[sev].bg,
                  border: `1px solid ${SEV_STYLE[sev].color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '8px', color: SEV_STYLE[sev].color, fontWeight: 800,
                }}>{SEV_STYLE[sev].label}</div>
                <span style={{ color: '#6b7280', fontSize: '10px' }}>{sev}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected conflict detail */}
      {selected && (
        <div style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '13px' }}>
              {selected.drug1} ↔ {selected.drug2}
            </span>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '14px' }}
            >✕</button>
          </div>
          <p style={{ color: '#d1d5db', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
            {selected.description}
          </p>
        </div>
      )}

      {/* Conflict list */}
      {conflicts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 8px' }}>
            Detected Conflicts
          </h4>
          {conflicts.map((c, i) => {
            const s = SEV_STYLE[c.severity] || SEV_STYLE.UNKNOWN;
            return (
              <div key={i} style={{
                background: s.bg,
                border: `1px solid ${s.color}33`,
                borderRadius: '10px',
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ color: s.color, fontWeight: 700, fontSize: '13px' }}>
                    {c.drug1} ↔ {c.drug2}
                  </span>
                  <span style={{
                    padding: '2px 10px', borderRadius: '20px',
                    background: s.bg, border: `1px solid ${s.color}44`,
                    color: s.color, fontSize: '10px', fontWeight: 700,
                  }}>{c.severity}</span>
                </div>
                <p style={{ color: '#9ca3af', fontSize: '11px', lineHeight: 1.5, margin: 0 }}>
                  {c.description}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Combination analysis */}
      {combos.length > 0 && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h4 style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 8px' }}>
            Combination Warnings
          </h4>
          {combos.map((combo, i) => {
            const s = SEV_STYLE[combo.severity] || SEV_STYLE.UNKNOWN;
            return (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.02)', border: `1px solid ${s.color}33`,
                borderRadius: '10px', padding: '12px 14px',
                borderLeft: `3px solid ${s.color}`,
              }}>
                <div style={{ color: s.color, fontWeight: 700, fontSize: '12px', marginBottom: '4px' }}>
                  ⚡ {combo.name}
                </div>
                <p style={{ color: '#9ca3af', fontSize: '11px', lineHeight: 1.5, margin: 0 }}>
                  {combo.description}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
