// frontend/src/components/cdss/ShapExplanationView.jsx
// MediChain — Interactive Explainable AI (SHAP) Visualizer
// Renders SVG-based Waterfall and Decision plots for model risk predictions.

import React, { useState } from 'react';

export default function ShapExplanationView({ shapData, title = "Model Prediction Explanation" }) {
  const [plotType, setPlotType] = useState('waterfall'); // 'waterfall' | 'decision'

  if (!shapData || !shapData.feature_importance || shapData.feature_importance.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary italic">
        No SHAP attribution details available.
      </div>
    );
  }

  const { base_value, prediction_value, feature_importance } = shapData;

  // Render Waterfall Plot (Horizontal transition)
  const renderWaterfall = () => {
    // Map SHAP values to visual coordinates
    // Let's assume the X-axis ranges from 0 to 1 (probability 0% to 100%)
    let currentVal = base_value;

    return (
      <div className="space-y-4">
        {/* Baseline indicator */}
        <div className="flex justify-between text-xs text-text-secondary border-b border-medichain-border/30 pb-2">
          <span>Expected Base Output: <strong>{roundPct(base_value)}%</strong></span>
          <span>Final Predicted Risk: <strong className="text-white">{roundPct(prediction_value)}%</strong></span>
        </div>

        {/* Horizontal bars */}
        <div className="space-y-3">
          {feature_importance.map((item, idx) => {
            const start = currentVal;
            const end = currentVal + item.shap_value;
            currentVal = end; // advance accumulator

            const isPositive = item.shap_value >= 0;
            const widthPct = Math.abs(item.shap_value) * 100;
            const leftPct = Math.min(start, end) * 100;

            return (
              <div key={idx} className="relative space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-text-secondary">
                    <strong className="text-white">{item.feature}</strong> ({item.feature_value})
                  </span>
                  <span style={{ color: isPositive ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                    {isPositive ? '+' : ''}{roundPct(item.shap_value)}%
                  </span>
                </div>

                <div className="h-5 bg-black/30 rounded relative overflow-hidden flex items-center">
                  {/* Accumulator Track */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      height: '100%',
                      background: isPositive 
                        ? 'linear-gradient(to right, rgba(239,68,68,0.3), rgba(239,68,68,0.7))'
                        : 'linear-gradient(to right, rgba(34,197,94,0.3), rgba(34,197,94,0.7))',
                      borderLeft: isPositive ? '2px solid #ef4444' : 'none',
                      borderRight: !isPositive ? '2px solid #22c55e' : 'none',
                    }}
                  />
                  {/* Current flow marker */}
                  <span className="z-10 pl-2 text-[9px] font-mono text-white/50">
                    Flow: {roundPct(start)}% → {roundPct(end)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Decision Plot (Vertical path progression)
  const renderDecision = () => {
    // Width and height of SVG viewport
    const width = 400;
    const height = 280;
    const paddingLeft = 140;
    const paddingRight = 30;
    const plotWidth = width - paddingLeft - paddingRight;

    // Map probability to X coordinate
    const getX = (prob) => {
      // Clamp between 0 and 1
      const clamped = Math.max(0, Math.min(1, prob));
      return paddingLeft + clamped * plotWidth;
    };

    // Construct path segments
    let currentVal = base_value;
    const points = [{ x: getX(base_value), y: height - 20 }];
    const stepHeight = (height - 40) / feature_importance.length;

    feature_importance.forEach((item, idx) => {
      currentVal += item.shap_value;
      points.push({
        x: getX(currentVal),
        y: height - 20 - (idx + 1) * stepHeight
      });
    });

    // Path string
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between text-xs text-text-secondary mb-2">
          <span>Expected Base: {roundPct(base_value)}%</span>
          <span>Decision Path Progression</span>
          <span>Final: {roundPct(prediction_value)}%</span>
        </div>

        <div className="bg-black/20 p-2 rounded-xl flex justify-center">
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="max-w-[450px]">
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((val, idx) => {
              const xCoord = getX(val);
              return (
                <g key={idx}>
                  <line
                    x1={xCoord} y1={10} x2={xCoord} y2={height - 20}
                    stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3"
                  />
                  <text
                    x={xCoord} y={height - 5}
                    fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle"
                  >
                    {Math.round(val * 100)}%
                  </text>
                </g>
              );
            })}

            {/* expected value line */}
            <line
              x1={getX(base_value)} y1={10}
              x2={getX(base_value)} y2={height - 20}
              stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,4"
            />
            <text
              x={getX(base_value) + 5} y={15}
              fill="#3b82f6" fontSize="7" fontWeight="bold"
            >
              Base ({roundPct(base_value)}%)
            </text>

            {/* Feature labels (Vertical alignment) */}
            {feature_importance.map((item, idx) => {
              const yCoord = height - 20 - (idx + 0.5) * stepHeight;
              return (
                <g key={idx}>
                  {/* Label */}
                  <text
                    x={10} y={yCoord + 3}
                    fill="white" fontSize="9" fontWeight="bold"
                  >
                    {item.feature.length > 20 ? item.feature.substring(0, 18) + '..' : item.feature}
                  </text>
                  {/* Horizontal indicator */}
                  <line
                    x1={10} y1={yCoord + 6} x2={paddingLeft - 10} y2={yCoord + 6}
                    stroke="rgba(255,255,255,0.05)"
                  />
                </g>
              );
            })}

            {/* Decision Path */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#pathGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Point Markers */}
            {points.map((p, idx) => (
              <circle
                key={idx}
                cx={p.x} cy={p.y} r="4"
                fill={idx === points.length - 1 ? '#06b6d4' : 'white'}
                stroke={idx === points.length - 1 ? 'white' : 'rgba(0,0,0,0.5)'}
                strokeWidth="1"
              />
            ))}

            {/* Definitions */}
            <defs>
              <linearGradient id="pathGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    );
  };

  const roundPct = (num) => Math.round(num * 1000) / 10;

  return (
    <GlassCard>
      <div className="flex justify-between items-center mb-6 border-b border-medichain-border/30 pb-3 flex-wrap gap-2">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🧠</span> {title}
        </h4>
        <div className="flex bg-black/40 rounded-lg p-0.5 border border-medichain-border/30">
          {[
            { key: 'waterfall', label: 'Waterfall' },
            { key: 'decision', label: 'Decision Plot' }
          ].map(opt => (
            <button
              key={opt.key}
              onClick={() => setPlotType(opt.key)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: plotType === opt.key ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: plotType === opt.key ? '#06b6d4' : '#6b7280',
                fontSize: '10px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {plotType === 'waterfall' ? renderWaterfall() : renderDecision()}
    </GlassCard>
  );
}
