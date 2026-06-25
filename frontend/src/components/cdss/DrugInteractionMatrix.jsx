// frontend/src/components/cdss/DrugInteractionMatrix.jsx
// Interactive N×N drug interaction heatmap grid.
// Each cell shows severity color for a drug pair on hover.

import React, { useState } from 'react';

const SEVERITY_COLORS = {
  CRITICAL: { bg: '#7e22ce', text: '#f3e8ff', label: 'CRITICAL' },
  HIGH:     { bg: '#dc2626', text: '#fef2f2', label: 'HIGH' },
  MODERATE: { bg: '#ea580c', text: '#fff7ed', label: 'MODERATE' },
  LOW:      { bg: '#ca8a04', text: '#fefce8', label: 'LOW' },
  NONE:     { bg: '#1e3a5f', text: '#bfdbfe', label: 'NONE' },
  UNKNOWN:  { bg: '#334155', text: '#94a3b8', label: '?' },
};

export default function DrugInteractionMatrix({ medications = [], interactionMatrix = {}, conflicts = [] }) {
  const [tooltip, setTooltip] = useState(null);

  if (!medications || medications.length < 2) {
    return (
      <div style={{
        color: '#64748b', textAlign: 'center', padding: '32px',
        fontFamily: "'Inter', sans-serif", fontSize: '14px'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>💊</div>
        Add at least 2 medications to see the interaction matrix
      </div>
    );
  }

  // Build lookup: "drug1 ↔ drug2" → result
  const lookup = {};
  for (const [key, val] of Object.entries(interactionMatrix)) {
    lookup[key] = val;
    // Also store reverse
    const parts = key.split(' ↔ ');
    if (parts.length === 2) {
      lookup[`${parts[1]} ↔ ${parts[0]}`] = val;
    }
  }

  function getCellData(d1, d2) {
    if (d1 === d2) return { self: true };
    const key = `${d1} ↔ ${d2}`;
    return lookup[key] || { severity: 'NONE', conflict: false };
  }

  const cellSize = Math.max(52, Math.min(80, 420 / medications.length));

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", position: 'relative', overflowX: 'auto' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {Object.entries(SEVERITY_COLORS).filter(([k]) => k !== 'UNKNOWN').map(([sev, conf]) => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: conf.bg, border: `1px solid ${conf.bg}88` }} />
            {conf.label}
          </div>
        ))}
      </div>

      {/* Matrix grid */}
      <div style={{ display: 'inline-block' }}>
        {/* Column headers */}
        <div style={{ display: 'flex', marginLeft: `${cellSize + 8}px` }}>
          {medications.map((drug, ci) => (
            <div key={ci} style={{
              width: cellSize,
              textAlign: 'center',
              fontSize: '10px',
              color: '#94a3b8',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 2px',
              marginBottom: '4px',
            }} title={drug}>
              {drug.length > 9 ? drug.substring(0, 8) + '…' : drug}
            </div>
          ))}
        </div>

        {/* Rows */}
        {medications.map((rowDrug, ri) => (
          <div key={ri} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            {/* Row label */}
            <div style={{
              width: cellSize,
              fontSize: '10px',
              color: '#94a3b8',
              textAlign: 'right',
              paddingRight: '8px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }} title={rowDrug}>
              {rowDrug.length > 9 ? rowDrug.substring(0, 8) + '…' : rowDrug}
            </div>

            {/* Cells */}
            {medications.map((colDrug, ci) => {
              const cell = getCellData(rowDrug, colDrug);
              if (cell.self) {
                return (
                  <div key={ci} style={{
                    width: cellSize - 4,
                    height: cellSize - 4,
                    margin: '2px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #1e40af22, #0f172a)',
                    border: '1px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                    fontSize: '18px',
                  }}>
                    ╲
                  </div>
                );
              }

              const sev = (cell.severity || 'NONE').toUpperCase();
              const conf = SEVERITY_COLORS[sev] || SEVERITY_COLORS.UNKNOWN;
              const hasConflict = cell.conflict;

              return (
                <div
                  key={ci}
                  onMouseEnter={(e) => setTooltip({
                    x: e.clientX, y: e.clientY,
                    drug1: rowDrug, drug2: colDrug,
                    severity: sev,
                    description: cell.description || 'No interaction detected',
                    source: cell.source || ''
                  })}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    width: cellSize - 4,
                    height: cellSize - 4,
                    margin: '2px',
                    borderRadius: '6px',
                    background: hasConflict ? conf.bg + 'cc' : 'rgba(30, 41, 59, 0.5)',
                    border: `1px solid ${hasConflict ? conf.bg : '#1e3a5f'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontSize: '12px',
                    color: hasConflict ? conf.text : '#334155',
                    fontWeight: hasConflict ? 700 : 400,
                    boxShadow: hasConflict ? `0 2px 12px ${conf.bg}66` : 'none',
                  }}
                >
                  {hasConflict ? sev.substring(0, 3) : '✓'}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: Math.min(tooltip.x + 12, window.innerWidth - 280),
          top: tooltip.y + 12,
          background: '#0f172a',
          border: `1px solid ${SEVERITY_COLORS[tooltip.severity]?.bg || '#334155'}`,
          borderRadius: '10px',
          padding: '12px 16px',
          width: 260,
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}>
          <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '6px', fontSize: '13px' }}>
            {tooltip.drug1} ↔ {tooltip.drug2}
          </div>
          <div style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            background: (SEVERITY_COLORS[tooltip.severity]?.bg || '#334155') + '33',
            color: SEVERITY_COLORS[tooltip.severity]?.bg || '#94a3b8',
            fontSize: '11px',
            fontWeight: 700,
            marginBottom: '8px',
          }}>
            {tooltip.severity}
          </div>
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0, lineHeight: '1.5' }}>
            {tooltip.description}
          </p>
          {tooltip.source && (
            <div style={{ color: '#475569', fontSize: '10px', marginTop: '6px' }}>
              Source: {tooltip.source}
            </div>
          )}
        </div>
      )}

      {/* Conflict summary */}
      {conflicts.length > 0 && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#fca5a5',
        }}>
          <strong>⚡ {conflicts.length} interaction{conflicts.length > 1 ? 's' : ''} detected</strong>
          {' — hover over colored cells for details'}
        </div>
      )}
    </div>
  );
}
