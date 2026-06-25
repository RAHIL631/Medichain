// frontend/src/components/cdss/SHAPWaterfall.jsx
// SHAP feature importance waterfall chart — shows which features
// pushed the disease prediction up or down from the baseline.

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '10px 14px',
      fontFamily: "'Inter', sans-serif",
      maxWidth: 260,
    }}>
      <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '12px', marginBottom: '4px' }}>
        {d.feature}
      </div>
      <div style={{ fontSize: '12px', marginBottom: '4px' }}>
        <span style={{ color: '#94a3b8' }}>Value: </span>
        <span style={{ color: '#7dd3fc' }}>{d.feature_value ?? 'N/A'}</span>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '4px' }}>
        <span style={{ color: '#94a3b8' }}>SHAP Impact: </span>
        <span style={{ color: d.shap_value >= 0 ? '#f87171' : '#34d399', fontWeight: 700 }}>
          {d.shap_value >= 0 ? '+' : ''}{(d.shap_value * 100).toFixed(1)}%
        </span>
      </div>
      {d.clinical_context && (
        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '6px', lineHeight: '1.4' }}>
          {d.clinical_context}
        </div>
      )}
    </div>
  );
};

export default function SHAPWaterfall({ featureImportance = [], disease = 'disease', loading = false }) {
  if (loading) {
    return (
      <div style={{ color: '#64748b', textAlign: 'center', padding: '40px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: '24px', marginBottom: '8px', animation: 'spin 1s linear infinite' }}>⚙️</div>
        Computing SHAP explanations…
      </div>
    );
  }

  if (!featureImportance || featureImportance.length === 0) {
    return (
      <div style={{ color: '#64748b', textAlign: 'center', padding: '40px', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔬</div>
        SHAP analysis not available. Run a disease prediction first.
      </div>
    );
  }

  // Sort by absolute SHAP value, take top 10
  const sorted = [...featureImportance]
    .sort((a, b) => Math.abs(b.shap_value || b.importance || 0) - Math.abs(a.shap_value || a.importance || 0))
    .slice(0, 10)
    .map(f => ({
      ...f,
      shap_value: f.shap_value || 0,
      displayName: f.feature?.length > 20 ? f.feature.substring(0, 19) + '…' : f.feature,
    }));

  const maxAbs = Math.max(...sorted.map(f => Math.abs(f.shap_value)), 0.01);
  const domain = [-maxAbs * 1.15, maxAbs * 1.15];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px' }}>
        Features pushing {disease} risk <span style={{ color: '#f87171' }}>↑ higher</span> or{' '}
        <span style={{ color: '#34d399' }}>↓ lower</span>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(220, sorted.length * 36 + 40)}>
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 0, right: 40, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />

          <XAxis
            type="number"
            domain={domain}
            tick={{ fontSize: 10, fill: '#475569' }}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
            tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          />

          <YAxis
            type="category"
            dataKey="displayName"
            width={140}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

          <ReferenceLine x={0} stroke="#475569" strokeDasharray="4 4" />

          <Bar dataKey="shap_value" radius={[0, 4, 4, 0]}>
            {sorted.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.shap_value >= 0 ? '#ef4444' : '#10b981'}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{
        display: 'flex', gap: '16px', justifyContent: 'center',
        marginTop: '8px', fontSize: '11px', color: '#64748b',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444' }} />
          Increases risk
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: '#10b981' }} />
          Decreases risk
        </div>
      </div>
    </div>
  );
}
