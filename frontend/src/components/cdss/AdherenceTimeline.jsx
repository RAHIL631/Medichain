// frontend/src/components/cdss/AdherenceTimeline.jsx
// Medication adherence trend line chart with refill prediction marker.

import React from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div style={{
      background: '#faf8f1',
      border: '1px solid #e9f4ec',
      borderRadius: '8px',
      padding: '10px 14px',
      fontFamily: "'Inter', sans-serif",
      fontSize: '12px',
    }}>
      <div style={{ color: '#68766e', marginBottom: '4px' }}>{label}</div>
      <div style={{ color: val >= 80 ? '#0F6852' : val >= 60 ? '#805B12' : '#B44736', fontWeight: 700 }}>
        Adherence: {val?.toFixed(0)}%
      </div>
    </div>
  );
};

export default function AdherenceTimeline({ adherenceData = null, predictedDate = null }) {
  // Build mock trend data from adherenceData or placeholder
  const trendData = adherenceData?.history_trend || [];

  // Always add current score as last point and prediction as future point
  const currentScore = adherenceData?.adherence_score;
  const displayData = trendData.length > 0 ? trendData : [
    { month: '6 months ago', score: null },
    { month: '5 months ago', score: null },
    { month: '4 months ago', score: null },
    { month: '3 months ago', score: null },
    { month: '2 months ago', score: null },
    { month: 'Last month',   score: null },
    { month: 'Now',          score: currentScore },
    { month: 'Predicted',    score: null, predicted: true },
  ];

  const hasData = displayData.some(d => d.score !== null);

  const riskColor = currentScore >= 80 ? '#16866a'
    : currentScore >= 60 ? '#805B12'
    : currentScore >= 40 ? '#B44736'
    : '#b44736';

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {!hasData ? (
        <div style={{ color: '#68766e', textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📅</div>
          No adherence history yet. Data builds over time from prescription refills.
        </div>
      ) : (
        <>
          {/* Score display */}
          {currentScore !== undefined && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              marginBottom: '20px', padding: '16px',
              background: riskColor + '15',
              border: `1px solid ${riskColor}44`,
              borderRadius: '10px',
            }}>
              <div style={{
                fontSize: '42px', fontWeight: 800, color: riskColor,
                fontFamily: 'Inter, sans-serif',
              }}>
                {Math.round(currentScore)}%
              </div>
              <div>
                <div style={{ color: riskColor, fontWeight: 700, fontSize: '14px' }}>
                  {adherenceData?.category_label || 'Adherence Score'}
                </div>
                {predictedDate && (
                  <div style={{ color: '#68766e', fontSize: '12px', marginTop: '4px' }}>
                    🗓️ Predicted next refill: <strong style={{ color: '#b9d8c5' }}>{predictedDate}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chart */}
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="adherenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={riskColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={riskColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E9E2" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#68766e' }}
                tickLine={false}
                axisLine={{ stroke: '#e9f4ec' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#68766e' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={80} stroke="#16866a44" strokeDasharray="6 3" label={{ value: 'Good', fill: '#16866a', fontSize: 10 }} />
              <ReferenceLine y={60} stroke="#ebcb8244" strokeDasharray="6 3" label={{ value: 'Fair', fill: '#ebcb82', fontSize: 10 }} />
              <Area
                type="monotone"
                dataKey="score"
                stroke={riskColor}
                strokeWidth={2.5}
                fill="url(#adherenceGrad)"
                dot={{ r: 4, fill: riskColor, strokeWidth: 0 }}
                connectNulls={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </>
      )}

      {/* Factors */}
      {adherenceData?.contributing_factors?.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ color: '#805B12', fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>
            ⚡ Adherence Risk Factors
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px', color: '#68766e', fontSize: '12px' }}>
            {adherenceData.contributing_factors.map((f, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Interventions */}
      {adherenceData?.recommended_interventions?.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ color: '#b9d8c5', fontWeight: 600, fontSize: '12px', marginBottom: '8px' }}>
            💡 Recommended Interventions
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px', color: '#68766e', fontSize: '12px' }}>
            {adherenceData.recommended_interventions.map((r, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
