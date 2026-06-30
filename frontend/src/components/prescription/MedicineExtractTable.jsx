// frontend/src/components/prescription/MedicineExtractTable.jsx
// Displays OCR-extracted medicines with dose, frequency, indication, and flag badges.

import React from 'react';

const SEV_STYLE = {
  NONE:     { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)',  color: '#22c55e' },
  LOW:      { bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.3)',  color: '#eab308' },
  MODERATE: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', color: '#f97316' },
  HIGH:     { bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  color: '#ef4444' },
  CRITICAL: { bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)', color: '#a855f7' },
  UNKNOWN:  { bg: 'rgba(100,116,139,0.1)',border: 'rgba(100,116,139,0.3)',color: '#64748b' },
};

function Badge({ text, severity = 'NONE', small = false }) {
  const s = SEV_STYLE[severity] || SEV_STYLE.NONE;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: small ? '2px 8px' : '3px 10px',
      borderRadius: '20px',
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
      fontSize: small ? '10px' : '11px',
      fontWeight: 700,
      letterSpacing: '0.3px',
      whiteSpace: 'nowrap',
    }}>
      {text}
    </span>
  );
}

export default function MedicineExtractTable({ medications = [], detectedDiseases = [], overdoseAlerts = [], duplicates = [] }) {
  if (!medications.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#4b5563', fontSize: '14px' }}>
        No medications extracted. Upload a prescription image or enter medicines manually.
      </div>
    );
  }

  // Build lookup maps
  const indicationMap = {};
  detectedDiseases.forEach(dd => {
    const key = (dd.suggested_by || '').toLowerCase();
    indicationMap[key] = indicationMap[key] || [];
    indicationMap[key].push(dd.indication);
  });

  const overdoseMap = {};
  overdoseAlerts.forEach(od => {
    overdoseMap[(od.drug || '').toLowerCase()] = od;
  });

  const duplicateSet = new Set();
  duplicates.forEach(d => {
    (d.drugs || []).forEach(drug => duplicateSet.add(drug.toLowerCase()));
  });

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        fontFamily: "'Inter', sans-serif",
        fontSize: '13px',
      }}>
        <thead>
          <tr style={{ background: 'rgba(6,182,212,0.08)' }}>
            {['#', 'Drug Name', 'Dose', 'Frequency', 'Likely Indication', 'Flags'].map((h, i) => (
              <th key={i} style={{
                padding: '10px 14px',
                textAlign: 'left',
                color: '#06b6d4',
                fontWeight: 700,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                borderBottom: '1px solid rgba(6,182,212,0.2)',
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {medications.map((med, i) => {
            const isStructured = typeof med === 'object';
            const drugName = isStructured ? (med.drug || med.name || '') : med;
            const dose      = isStructured ? (med.dose || '—') : '—';
            const freq      = isStructured ? (med.frequency || '—') : '—';
            const key       = drugName.toLowerCase();
            const indications = indicationMap[key] || [];
            const od          = overdoseMap[key];
            const isDuplicate = duplicateSet.has(key);
            const isEven      = i % 2 === 0;

            const flags = [];
            if (isDuplicate) flags.push(<Badge key="dup" text="DUPLICATE" severity="MODERATE" small />);
            if (od && od.severity && od.severity !== 'NONE') {
              flags.push(<Badge key="od" text={`OVERDOSE: ${od.severity}`} severity={od.severity} small />);
            }

            return (
              <tr key={i} style={{
                background: isEven ? 'rgba(255,255,255,0.02)' : 'transparent',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(6,182,212,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = isEven ? 'rgba(255,255,255,0.02)' : 'transparent'}
              >
                <td style={{ padding: '10px 14px', color: '#4b5563', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '12px' }}>
                  {i + 1}
                </td>
                <td style={{ padding: '10px 14px', color: '#f9fafb', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {drugName}
                </td>
                <td style={{ padding: '10px 14px', color: '#d1d5db', borderBottom: '1px solid rgba(255,255,255,0.04)', fontFamily: 'monospace', fontSize: '12px' }}>
                  {dose}
                </td>
                <td style={{ padding: '10px 14px', color: '#d1d5db', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {freq}
                </td>
                <td style={{ padding: '10px 14px', color: '#9ca3af', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '11px' }}>
                  {indications.length > 0 ? indications.slice(0, 2).join(', ') : <span style={{ color: '#374151' }}>—</span>}
                </td>
                <td style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {flags.length > 0 ? flags : <span style={{ color: '#374151', fontSize: '11px' }}>None</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
