// frontend/src/components/prescription/ValidationPipeline.jsx
// Animated step-by-step pipeline progress indicator for prescription validation.

import React from 'react';

const STEPS = [
  { id: 'ocr',       icon: '📷', label: 'OCR Extraction',         desc: 'Reading prescription text & medicines' },
  { id: 'disease',   icon: '🧬', label: 'Disease Detection',       desc: 'Mapping drugs to clinical indications' },
  { id: 'duplicate', icon: '🔁', label: 'Duplicate Check',         desc: 'Detecting therapeutic duplications' },
  { id: 'overdose',  icon: '⚖️', label: 'Overdose Assessment',     desc: 'Comparing doses to safe thresholds' },
  { id: 'interact',  icon: '⚡', label: 'Interaction Analysis',     desc: 'N×N pairwise drug interaction matrix' },
  { id: 'allergy',   icon: '🌡️', label: 'Allergy Check',           desc: 'Checking against patient allergy list' },
  { id: 'pregnancy', icon: '🤰', label: 'Pregnancy Safety',        desc: 'Screening teratogenic compounds' },
  { id: 'kidney',    icon: '🫘', label: 'Kidney Safety',           desc: 'Assessing renally-cleared drugs vs GFR' },
  { id: 'liver',     icon: '🫀', label: 'Liver Safety',            desc: 'Evaluating hepatic metabolism risk' },
  { id: 'score',     icon: '📊', label: 'Safety Score',            desc: 'Computing aggregate safety score 0–100' },
];

export default function ValidationPipeline({ currentStep, isComplete, error }) {
  // currentStep: 0-based index of the step currently running (-1 = not started)
  // isComplete: boolean
  // error: string or null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0d1117 0%, #111827 100%)',
      border: '1px solid rgba(6,182,212,0.15)',
      borderRadius: '16px',
      padding: '28px 24px',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        {error ? (
          <>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>❌</div>
            <p style={{ color: '#ef4444', fontWeight: 700, fontSize: '15px', margin: 0 }}>Validation Failed</p>
            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>{error}</p>
          </>
        ) : isComplete ? (
          <>
            <div style={{ fontSize: '36px', marginBottom: '8px', animation: 'none' }}>✅</div>
            <p style={{ color: '#22c55e', fontWeight: 700, fontSize: '15px', margin: 0 }}>Validation Complete</p>
          </>
        ) : (
          <>
            <div style={{
              width: '40px', height: '40px',
              border: '3px solid rgba(6,182,212,0.3)',
              borderTop: '3px solid #06b6d4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ color: '#06b6d4', fontWeight: 700, fontSize: '15px', margin: 0 }}>
              Running AI Validation Pipeline…
            </p>
            <p style={{ color: '#6b7280', fontSize: '11px', marginTop: '4px' }}>
              {currentStep >= 0 && currentStep < STEPS.length
                ? `Step ${currentStep + 1} of ${STEPS.length}: ${STEPS[currentStep].label}`
                : 'Initialising…'}
            </p>
          </>
        )}
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {STEPS.map((step, idx) => {
          const isDone    = isComplete || idx < currentStep;
          const isRunning = !isComplete && idx === currentStep;
          const isPending = !isComplete && idx > currentStep;

          return (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: isRunning
                  ? 'rgba(6,182,212,0.08)'
                  : isDone
                  ? 'rgba(34,197,94,0.05)'
                  : 'transparent',
                border: isRunning
                  ? '1px solid rgba(6,182,212,0.3)'
                  : isDone
                  ? '1px solid rgba(34,197,94,0.15)'
                  : '1px solid transparent',
                transition: 'all 0.3s ease',
                opacity: isPending ? 0.35 : 1,
              }}
            >
              {/* Status indicator */}
              <div style={{
                width: '26px', height: '26px',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontSize: '13px',
                background: isDone
                  ? 'rgba(34,197,94,0.2)'
                  : isRunning
                  ? 'rgba(6,182,212,0.15)'
                  : 'rgba(255,255,255,0.05)',
                border: isDone
                  ? '1px solid rgba(34,197,94,0.4)'
                  : isRunning
                  ? '1px solid rgba(6,182,212,0.4)'
                  : '1px solid rgba(255,255,255,0.1)',
              }}>
                {isDone ? '✓' : isRunning ? (
                  <div style={{
                    width: '10px', height: '10px',
                    borderRadius: '50%',
                    background: '#06b6d4',
                    animation: 'pulse 1s ease-in-out infinite',
                  }} />
                ) : `${idx + 1}`}
              </div>

              {/* Icon + label */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px' }}>{step.icon}</span>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: isRunning ? 700 : 500,
                    color: isDone
                      ? '#22c55e'
                      : isRunning
                      ? '#06b6d4'
                      : '#6b7280',
                  }}>
                    {step.label}
                  </span>
                </div>
                {(isRunning || isDone) && (
                  <p style={{
                    fontSize: '10px',
                    color: '#4b5563',
                    margin: '2px 0 0',
                    lineHeight: 1.3,
                  }}>
                    {step.desc}
                  </p>
                )}
              </div>

              {/* Running shimmer bar */}
              {isRunning && (
                <div style={{
                  width: '60px', height: '4px',
                  borderRadius: '2px',
                  background: 'rgba(6,182,212,0.2)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}>
                  <div style={{
                    height: '100%',
                    width: '40%',
                    background: '#06b6d4',
                    borderRadius: '2px',
                    animation: 'shimmer 1.2s ease-in-out infinite',
                  }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.4; transform:scale(0.9); } 50% { opacity:1; transform:scale(1.1); } }
        @keyframes shimmer { 0% { transform:translateX(-150%); } 100% { transform:translateX(350%); } }
      `}</style>
    </div>
  );
}
