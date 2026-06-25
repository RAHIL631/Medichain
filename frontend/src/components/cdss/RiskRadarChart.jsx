// frontend/src/components/cdss/RiskRadarChart.jsx
// 5-axis radar chart showing per-organ health risk scores.
// Built with Recharts RadarChart.

import React from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend
} from 'recharts';

const ORGAN_ICONS = {
  heart: '❤️',
  kidney: '🫘',
  liver: '🟤',
  diabetes: '🩸',
  stroke: '🧠',
};

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
      fontSize: '12px',
    }}>
      <div style={{ color: '#f1f5f9', fontWeight: 700, marginBottom: '4px' }}>
        {ORGAN_ICONS[d?.key] || '🏥'} {d?.organ}
      </div>
      <div style={{ color: '#7dd3fc' }}>
        Risk Score: <strong>{d?.value?.toFixed(1)}%</strong>
      </div>
      <div style={{ color: '#94a3b8', marginTop: '2px' }}>
        Level: {d?.risk_level}
      </div>
    </div>
  );
};

const CustomAngleAxis = ({ payload, x, y, cx, cy }) => {
  const key = payload?.value?.toLowerCase().replace(/\s+/g, '');
  const icon = ORGAN_ICONS[key] || '🏥';
  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#94a3b8"
        fontSize="11"
        fontFamily="Inter, sans-serif"
      >
        {icon} {payload?.value}
      </text>
    </g>
  );
};

export default function RiskRadarChart({ organRisks = {} }) {
  if (!organRisks || Object.keys(organRisks).length === 0) {
    return (
      <div style={{
        color: '#64748b', textAlign: 'center', padding: '40px',
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏥</div>
        No health risk data available yet. Run a health assessment first.
      </div>
    );
  }

  const data = Object.entries(organRisks).map(([key, organ]) => ({
    key,
    organ: organ.label || key,
    value: organ.risk_score || 0,
    risk_level: organ.risk_level,
    color: organ.color,
  }));

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <defs>
            <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <PolarGrid
            gridType="polygon"
            stroke="rgba(255,255,255,0.08)"
          />

          <PolarAngleAxis
            dataKey="organ"
            tick={<CustomAngleAxis />}
            tickLine={false}
          />

          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tickCount={5}
            tick={{ fontSize: 9, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
          />

          <Radar
            name="Risk Score"
            dataKey="value"
            stroke="#3b82f6"
            fill="url(#radarFill)"
            strokeWidth={2}
            dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#60a5fa' }}
          />

          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>

      {/* Risk level legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginTop: '8px' }}>
        {data.map((d) => (
          <div key={d.key} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', color: '#94a3b8',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: d.color || '#3b82f6',
            }} />
            <span>{ORGAN_ICONS[d.key]} {d.organ}</span>
            <span style={{
              color: d.color || '#3b82f6', fontWeight: 700,
              fontSize: '11px',
            }}>
              {d.value?.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
