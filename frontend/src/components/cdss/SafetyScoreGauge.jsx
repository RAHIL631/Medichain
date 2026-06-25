// frontend/src/components/cdss/SafetyScoreGauge.jsx
// Animated circular gauge showing prescription safety score (0–100).
// Uses SVG arc with color interpolation based on severity.

import React, { useEffect, useState } from 'react';

const SEVERITY_COLORS = {
  SAFE:     { from: '#10b981', to: '#059669', label: 'SAFE' },
  LOW:      { from: '#f59e0b', to: '#d97706', label: 'LOW RISK' },
  MODERATE: { from: '#f97316', to: '#ea580c', label: 'MODERATE' },
  HIGH:     { from: '#ef4444', to: '#dc2626', label: 'HIGH RISK' },
  CRITICAL: { from: '#a855f7', to: '#9333ea', label: 'CRITICAL' },
  UNKNOWN:  { from: '#64748b', to: '#475569', label: 'UNKNOWN' },
};

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startAngle, endAngle) {
  const s = polarToCartesian(cx, cy, r, startAngle);
  const e = polarToCartesian(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function SafetyScoreGauge({ score, severity = 'UNKNOWN', size = 200 }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (score === undefined || score === null) return;
    let start = 0;
    const end = score;
    const duration = 1200;
    const step = 16;
    const increment = (end - start) / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [score]);

  const config = SEVERITY_COLORS[severity] || SEVERITY_COLORS.UNKNOWN;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const strokeWidth = size * 0.07;

  // Arc goes from -135° to 135° (270° sweep)
  const START_ANGLE = -135;
  const SWEEP = 270;
  const trackEnd = START_ANGLE + SWEEP;
  const fillAngle = START_ANGLE + (SWEEP * (animatedScore / 100));

  const trackPath = arcPath(cx, cy, r, START_ANGLE, trackEnd);
  const fillPath = animatedScore > 0 ? arcPath(cx, cy, r, START_ANGLE, fillAngle) : null;

  const gradId = `gauge-grad-${severity}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Inter', sans-serif",
    }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={config.from} />
            <stop offset="100%" stopColor={config.to}   />
          </linearGradient>
        </defs>

        {/* Track */}
        <path
          d={trackPath}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Fill */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${config.from}88)`, transition: 'all 0.05s linear' }}
          />
        )}

        {/* Score text */}
        <text
          x={cx}
          y={cy - size * 0.03}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={size * 0.22}
          fontWeight="800"
          fontFamily="Inter, sans-serif"
        >
          {score !== undefined && score !== null ? Math.round(animatedScore) : '—'}
        </text>

        <text
          x={cx}
          y={cy + size * 0.13}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize={size * 0.07}
          fontFamily="Inter, sans-serif"
        >
          / 100
        </text>
      </svg>

      {/* Severity label */}
      <div style={{
        marginTop: '-8px',
        padding: '4px 14px',
        borderRadius: '20px',
        background: config.from + '22',
        border: `1px solid ${config.from}66`,
        color: config.from,
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '1px',
      }}>
        {config.label}
      </div>

      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '6px' }}>
        Prescription Safety Score
      </div>
    </div>
  );
}
