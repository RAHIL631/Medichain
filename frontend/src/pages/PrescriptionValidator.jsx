// frontend/src/pages/PrescriptionValidator.jsx
// MediChain — AI Prescription Validation Dashboard
//
// 3-phase flow:
//   Phase 1: UPLOAD — drag-drop file + patient context form
//   Phase 2: PROCESSING — animated pipeline progress
//   Phase 3: RESULTS — 7-tab dashboard with full validation data
//
// Route: /prescription-validator (doctor + hospital roles)
//
import React, { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import useWallet from '../hooks/useWallet';

import ValidationPipeline  from '../components/prescription/ValidationPipeline';
import MedicineExtractTable from '../components/prescription/MedicineExtractTable';
import SafetyCheckCard     from '../components/prescription/SafetyCheckCard';
import InteractionMatrix   from '../components/prescription/InteractionMatrix';
import BlockchainProof     from '../components/prescription/BlockchainProof';

// Re-use existing SafetyScoreGauge from CDSS module
import SafetyScoreGauge from '../components/cdss/SafetyScoreGauge';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',    label: '📊 Overview',      title: 'Prescription Overview' },
  { id: 'medicines',   label: '💊 Medicines',      title: 'Extracted Medicines' },
  { id: 'safety',      label: '🛡️ Safety Checks',  title: 'Safety Check Results' },
  { id: 'interactions',label: '⚡ Interactions',    title: 'Drug Interactions' },
  { id: 'overdose',    label: '⚖️ Overdose',        title: 'Overdose Assessment' },
  { id: 'blockchain',  label: '🔗 Blockchain',      title: 'Blockchain Proof' },
  { id: 'report',      label: '📄 PDF Report',      title: 'Download Report' },
];

const SEV_STYLE = {
  SAFE:     { bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)',   color: '#22c55e',  label: '🟢 SAFE' },
  LOW:      { bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.25)',   color: '#eab308',  label: '🟡 LOW RISK' },
  MODERATE: { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.25)',  color: '#f97316',  label: '🟠 MODERATE' },
  HIGH:     { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)',   color: '#ef4444',  label: '🔴 HIGH RISK' },
  CRITICAL: { bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.25)',  color: '#a855f7',  label: '🚨 CRITICAL' },
  UNKNOWN:  { bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)',  color: '#64748b',  label: '⬜ UNKNOWN' },
};

function StatPill({ label, value, highlight = false }) {
  return (
    <div style={{
      padding: '12px 18px',
      borderRadius: '12px',
      background: highlight ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.03)',
      border: highlight ? '1px solid rgba(168,85,247,0.25)' : '1px solid rgba(255,255,255,0.07)',
      textAlign: 'center',
      minWidth: '90px',
    }}>
      <div style={{
        fontSize: '24px',
        fontWeight: 800,
        color: highlight ? '#a855f7' : '#f9fafb',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
    </div>
  );
}

// ── Simulated pipeline step timing (ms between steps) ────────────────────────
const STEP_DELAYS = [400, 300, 300, 400, 600, 300, 300, 400, 400, 300];

// ── Main Component ────────────────────────────────────────────────────────────
const PrescriptionValidator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { account, connected } = useWallet();

  // Phase: 'upload' | 'processing' | 'results'
  const [phase, setPhase] = useState('upload');
  const [activeTab, setActiveTab] = useState('overview');

  // Upload form state
  const [file, setFile]         = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [patientCtx, setPatientCtx] = useState({
    age: '', weight_kg: '', kidney_gfr: 90, liver_score: 0,
    pregnant: false, allergies: '',
  });
  const [medications, setMedications] = useState('');
  const fileRef = useRef(null);

  // Processing state
  const [currentStep, setCurrentStep] = useState(-1);
  const [processError, setProcessError] = useState(null);

  // Results state
  const [result, setResult]     = useState(null);
  const [reportId, setReportId] = useState(null);
  const [txHash, setTxHash]     = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // ── File drop ────────────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  // ── Submission ────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!file && !medications.trim()) {
      alert('Please upload a prescription image/PDF or enter medications manually.');
      return;
    }

    setPhase('processing');
    setCurrentStep(0);
    setProcessError(null);

    // Animate pipeline steps
    let step = 0;
    const advanceStep = () => {
      step++;
      if (step < 10) {
        setCurrentStep(step);
        setTimeout(advanceStep, STEP_DELAYS[step] || 400);
      }
    };
    setTimeout(advanceStep, STEP_DELAYS[0]);

    try {
      const form = new FormData();
      if (file) form.append('file', file);

      // Build patient context
      const patientPayload = {
        age:         parseInt(patientCtx.age)       || 45,
        weight_kg:   parseFloat(patientCtx.weight_kg) || 70,
        kidney_gfr:  parseFloat(patientCtx.kidney_gfr) || 90,
        liver_score: parseInt(patientCtx.liver_score) || 0,
        pregnant:    patientCtx.pregnant || false,
        allergies:   patientCtx.allergies
          ? patientCtx.allergies.split(',').map(a => a.trim()).filter(Boolean)
          : [],
      };
      form.append('patient', JSON.stringify(patientPayload));

      if (medications.trim()) {
        form.append('medications', medications);
      }

      const { data } = await api.post('/prescription/validate', form, {
        timeout: 60000,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setCurrentStep(10); // complete
      setResult(data.validationResult);
      setReportId(data.reportId);

      setTimeout(() => setPhase('results'), 600);

    } catch (err) {
      console.error('[PrescriptionValidator]', err);
      setProcessError(
        err.response?.data?.error || err.response?.data?.message ||
        err.message || 'Validation failed — please try again.'
      );
    }
  };

  // ── Blockchain anchor callback ────────────────────────────────────────────
  const handleAnchor = async ({ txHash: tx, blockNumber, reportId: rid }) => {
    try {
      await api.patch(`/prescription/${rid || reportId}/txhash`, {
        txHash: tx,
        blockNumber,
      });
      setTxHash(tx);
    } catch (err) {
      console.error('[PrescriptionValidator] TX save error:', err);
    }
  };

  // ── PDF download ──────────────────────────────────────────────────────────
  const handleDownloadPdf = async () => {
    if (!reportId) return;
    setPdfLoading(true);
    try {
      const res = await api.post(`/prescription/${reportId}/pdf`, {}, {
        responseType: 'blob',
        timeout: 30000,
      });
      const url  = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `MediChain_Prescription_Report_${new Date().toISOString().slice(0,10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setPdfLoading(false);
    }
  };

  const reset = () => {
    setPhase('upload'); setResult(null); setReportId(null);
    setTxHash(null); setFile(null); setCurrentStep(-1); setProcessError(null);
    setMedications(''); setActiveTab('overview');
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const severity    = result?.severity || 'UNKNOWN';
  const sevStyle    = SEV_STYLE[severity] || SEV_STYLE.UNKNOWN;
  const safetyScore = result?.safety_score ?? null;
  const summary     = result?.summary || {};
  const medications_ = result?.ocr?.medications || [];
  const structured   = result?.ocr?.structured_medications || [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #060b14 0%, #0a0f1e 50%, #0d1117 100%)',
      fontFamily: "'Inter', sans-serif",
    }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: 'rgba(6,11,20,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 24px',
        height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/doctor-dashboard" style={{
            color: '#4b5563', fontSize: '12px', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'color 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = '#06b6d4'}
            onMouseLeave={e => e.currentTarget.style.color = '#4b5563'}
          >
            ← Dashboard
          </Link>
          <span style={{ color: '#374151' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px',
            }}>Rx</div>
            <span style={{ color: '#f9fafb', fontWeight: 700, fontSize: '15px' }}>
              AI Prescription Validator
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {phase === 'results' && (
            <button
              onClick={reset}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(6,182,212,0.1)',
                border: '1px solid rgba(6,182,212,0.25)',
                color: '#06b6d4',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              + New Validation
            </button>
          )}
          <div style={{
            width: '32px', height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '12px',
          }}>
            {user?.name?.[0] || 'D'}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* PHASE 1: UPLOAD                                                 */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {phase === 'upload' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', alignItems: 'start' }}>

            {/* Left: File upload + medications */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Page header */}
              <div>
                <h1 style={{ color: '#f9fafb', fontSize: '26px', fontWeight: 800, margin: '0 0 8px', lineHeight: 1.2 }}>
                  AI Prescription Validation
                </h1>
                <p style={{ color: '#6b7280', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                  Upload a prescription image or PDF. Our AI will extract medicines, run 10 safety checks,
                  calculate a prescription safety score, and generate a PDF report — anchored on blockchain.
                </p>
              </div>

              {/* Drag-drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${dragOver ? '#06b6d4' : file ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: dragOver
                    ? 'rgba(6,182,212,0.04)'
                    : file
                    ? 'rgba(34,197,94,0.04)'
                    : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.25s',
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                {file ? (
                  <>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>
                      {file.type === 'application/pdf' ? '📄' : '🖼️'}
                    </div>
                    <p style={{ color: '#22c55e', fontWeight: 700, fontSize: '15px', margin: '0 0 4px' }}>
                      {file.name}
                    </p>
                    <p style={{ color: '#4b5563', fontSize: '12px', margin: '0 0 10px' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); setFile(null); }}
                      style={{
                        padding: '4px 12px', borderRadius: '6px',
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        color: '#ef4444', fontSize: '11px', cursor: 'pointer',
                      }}
                    >Remove</button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                    <p style={{ color: '#9ca3af', fontWeight: 600, fontSize: '15px', margin: '0 0 6px' }}>
                      Drop prescription here or click to upload
                    </p>
                    <p style={{ color: '#4b5563', fontSize: '12px', margin: 0 }}>
                      PDF, JPG, PNG, WebP — up to 10MB
                    </p>
                  </>
                )}
              </div>

              {/* Manual medication input */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px',
                padding: '18px 20px',
              }}>
                <label style={{
                  display: 'block', color: '#9ca3af', fontSize: '11px',
                  textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px', fontWeight: 700,
                }}>
                  Or enter medications manually (comma-separated)
                </label>
                <textarea
                  value={medications}
                  onChange={e => setMedications(e.target.value)}
                  placeholder="e.g. Metformin 500mg twice daily, Atorvastatin 40mg once daily, Lisinopril 10mg"
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#f9fafb',
                    fontSize: '13px',
                    padding: '10px 12px',
                    resize: 'vertical',
                    outline: 'none',
                    fontFamily: "'Inter', sans-serif",
                    lineHeight: 1.5,
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <p style={{ color: '#374151', fontSize: '10px', margin: '6px 0 0' }}>
                  Include dose and frequency if known for overdose analysis.
                </p>
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                style={{
                  padding: '14px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.3px',
                  boxShadow: '0 4px 20px rgba(6,182,212,0.3)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 28px rgba(6,182,212,0.5)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(6,182,212,0.3)'}
              >
                🚀 Run AI Prescription Validation
              </button>
            </div>

            {/* Right: Patient context form */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px',
              padding: '22px',
              position: 'sticky',
              top: '76px',
            }}>
              <h3 style={{ color: '#f9fafb', fontSize: '14px', fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👤 Patient Context
              </h3>
              <p style={{ color: '#4b5563', fontSize: '11px', margin: '0 0 16px', lineHeight: 1.4 }}>
                Provide patient details for personalized safety checks. Required for kidney, liver, allergy, and pregnancy assessments.
              </p>

              {[
                { key: 'age',        label: 'Age (years)',               type: 'number', placeholder: '45',   hint: 'For Beers Criteria check' },
                { key: 'weight_kg',  label: 'Weight (kg)',               type: 'number', placeholder: '70',   hint: 'For dose-weight adjustment' },
                { key: 'kidney_gfr', label: 'Kidney GFR (mL/min)',       type: 'number', placeholder: '90',   hint: '<30 = severe impairment' },
                { key: 'liver_score',label: 'Liver Score (Child-Pugh)',   type: 'number', placeholder: '0',    hint: '0–6 = A, 7–9 = B, 10–15 = C' },
                { key: 'allergies',  label: 'Known Allergies',           type: 'text',   placeholder: 'Penicillin, Aspirin', hint: 'Comma-separated' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: '14px' }}>
                  <label style={{
                    display: 'block', color: '#6b7280', fontSize: '10px',
                    textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '5px', fontWeight: 700,
                  }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={patientCtx[field.key]}
                    onChange={e => setPatientCtx(p => ({ ...p, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    min={0}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '8px',
                      color: '#f9fafb',
                      fontSize: '13px',
                      padding: '8px 10px',
                      outline: 'none',
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(6,182,212,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                  {field.hint && (
                    <p style={{ color: '#374151', fontSize: '10px', margin: '3px 0 0' }}>{field.hint}</p>
                  )}
                </div>
              ))}

              {/* Pregnant toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 600 }}>Pregnant Patient</span>
                <div
                  onClick={() => setPatientCtx(p => ({ ...p, pregnant: !p.pregnant }))}
                  style={{
                    width: '44px', height: '24px',
                    borderRadius: '12px',
                    background: patientCtx.pregnant ? '#06b6d4' : 'rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: 'all 0.25s',
                    position: 'relative',
                    border: `1px solid ${patientCtx.pregnant ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  }}
                >
                  <div style={{
                    position: 'absolute', top: '3px',
                    left: patientCtx.pregnant ? '22px' : '3px',
                    width: '16px', height: '16px',
                    borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.25s',
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* PHASE 2: PROCESSING                                             */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {phase === 'processing' && (
          <div style={{ maxWidth: '560px', margin: '0 auto', paddingTop: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h2 style={{ color: '#f9fafb', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
                Running AI Validation Pipeline
              </h2>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
                {file ? `Analysing: ${file.name}` : 'Analysing entered medications…'}
              </p>
            </div>
            <ValidationPipeline
              currentStep={currentStep}
              isComplete={currentStep >= 10 && !processError}
              error={processError}
            />
            {processError && (
              <button
                onClick={reset}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Try Again
              </button>
            )}
          </div>
        )}

        {/* ──────────────────────────────────────────────────────────────── */}
        {/* PHASE 3: RESULTS                                                */}
        {/* ──────────────────────────────────────────────────────────────── */}
        {phase === 'results' && result && (
          <div>
            {/* Hero score row */}
            <div style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'center',
              padding: '24px 28px',
              borderRadius: '18px',
              background: `linear-gradient(135deg, #0d1117 0%, #111827 100%)`,
              border: `1px solid ${sevStyle.border}`,
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}>
              {/* Gauge */}
              <SafetyScoreGauge score={safetyScore} severity={severity} size={160} />

              {/* Info column */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '6px 16px', borderRadius: '20px',
                  background: sevStyle.bg, border: `1px solid ${sevStyle.border}`,
                  marginBottom: '10px',
                }}>
                  <span style={{ color: sevStyle.color, fontWeight: 800, fontSize: '15px' }}>
                    {sevStyle.label}
                  </span>
                </div>
                <p style={{ color: '#d1d5db', fontSize: '13px', lineHeight: 1.6, margin: '0 0 16px' }}>
                  {result.clinical_explanation}
                </p>
                {/* Summary stats */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <StatPill label="Medicines"    value={summary.total_medications || 0} />
                  <StatPill label="Diseases"     value={summary.detected_diseases || 0} />
                  <StatPill label="Interactions" value={summary.interaction_conflicts || 0}
                    highlight={summary.interaction_conflicts > 0} />
                  <StatPill label="Allergy Flags" value={summary.allergy_flags || 0}
                    highlight={summary.allergy_flags > 0} />
                  <StatPill label="Duplicates"   value={summary.duplicate_classes || 0}
                    highlight={summary.duplicate_classes > 0} />
                </div>
              </div>

              {/* Top recommendations */}
              {result.recommendations?.length > 0 && (
                <div style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  maxWidth: '280px',
                  minWidth: '220px',
                }}>
                  <p style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 8px', fontWeight: 700 }}>
                    Top Recommendations
                  </p>
                  {result.recommendations.slice(0, 3).map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ color: '#06b6d4', flexShrink: 0, marginTop: '1px' }}>›</span>
                      <p style={{ color: '#9ca3af', fontSize: '11px', lineHeight: 1.4, margin: 0 }}>{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tab bar */}
            <div style={{
              display: 'flex', gap: '4px', flexWrap: 'wrap',
              marginBottom: '20px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
              padding: '6px',
            }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: activeTab === tab.id
                      ? 'linear-gradient(135deg, #06b6d4, #3b82f6)'
                      : 'transparent',
                    color: activeTab === tab.id ? 'white' : '#6b7280',
                    fontSize: '12px',
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#d1d5db'; }}
                  onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.color = '#6b7280'; }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px',
              padding: '24px',
              minHeight: '360px',
            }}>
              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* OCR info */}
                  <div>
                    <h3 style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 12px' }}>
                      OCR Extraction
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{
                        padding: '8px 14px', borderRadius: '8px',
                        background: result.ocr?.available ? 'rgba(34,197,94,0.08)' : 'rgba(100,116,139,0.08)',
                        border: `1px solid ${result.ocr?.available ? 'rgba(34,197,94,0.2)' : 'rgba(100,116,139,0.2)'}`,
                        color: result.ocr?.available ? '#22c55e' : '#64748b',
                        fontSize: '12px', fontWeight: 600,
                      }}>
                        {result.ocr?.available ? '✅ OCR Active' : '⬜ OCR Unavailable / Overridden'}
                      </div>
                      {result.ocr?.confidence > 0 && (
                        <div style={{
                          padding: '8px 14px', borderRadius: '8px',
                          background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                          color: '#06b6d4', fontSize: '12px', fontWeight: 600,
                        }}>
                          Confidence: {(result.ocr.confidence * 100).toFixed(0)}%
                        </div>
                      )}
                      {result.ocr?.doctor_name && (
                        <div style={{
                          padding: '8px 14px', borderRadius: '8px',
                          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                          color: '#9ca3af', fontSize: '12px',
                        }}>
                          Dr: {result.ocr.doctor_name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detected diseases */}
                  {result.detected_diseases?.length > 0 && (
                    <div>
                      <h3 style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 12px' }}>
                        Likely Clinical Indications
                      </h3>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {result.detected_diseases.map((dd, i) => (
                          <div key={i} style={{
                            padding: '5px 12px', borderRadius: '20px',
                            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                            color: '#818cf8', fontSize: '12px', fontWeight: 600,
                          }}>
                            {dd.indication}
                            <span style={{ color: '#4b5563', fontSize: '10px', marginLeft: '6px' }}>
                              ({dd.suggested_by})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Score breakdown */}
                  {result.score_breakdown?.deductions?.length > 0 && (
                    <div>
                      <h3 style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 12px' }}>
                        Score Breakdown
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                          <span style={{ color: '#9ca3af', fontSize: '12px' }}>Starting score</span>
                          <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '12px' }}>100</span>
                        </div>
                        {result.score_breakdown.deductions.map((d, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }}>
                            <span style={{ color: '#6b7280', fontSize: '12px' }}>{d.reason}</span>
                            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '12px' }}>−{d.deduction}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '6px', background: sevStyle.bg, border: `1px solid ${sevStyle.border}`, marginTop: '4px' }}>
                          <span style={{ color: sevStyle.color, fontWeight: 700, fontSize: '13px' }}>Final Safety Score</span>
                          <span style={{ color: sevStyle.color, fontWeight: 800, fontSize: '13px' }}>{safetyScore}/100</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations?.length > 0 && (
                    <div>
                      <h3 style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 12px' }}>
                        Clinical Recommendations
                      </h3>
                      {result.recommendations.map((rec, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: '10px', alignItems: 'flex-start',
                          padding: '10px 12px', marginBottom: '6px',
                          borderRadius: '8px',
                          background: i === 0 && rec.includes('CRITICAL')
                            ? 'rgba(168,85,247,0.06)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${i === 0 && rec.includes('CRITICAL')
                            ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)'}`,
                        }}>
                          <span style={{ color: '#06b6d4', flexShrink: 0 }}>{i + 1}.</span>
                          <span style={{ color: '#d1d5db', fontSize: '13px', lineHeight: 1.5 }}>{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MEDICINES */}
              {activeTab === 'medicines' && (
                <MedicineExtractTable
                  medications={structured.length > 0 ? structured : medications_.map(m => ({ drug: m }))}
                  detectedDiseases={result.detected_diseases || []}
                  overdoseAlerts={result.overdose_alerts || []}
                  duplicates={result.duplicate_medicines || []}
                />
              )}

              {/* SAFETY CHECKS */}
              {activeTab === 'safety' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <SafetyCheckCard
                    title="Allergy Check"
                    icon="🧪"
                    results={result.allergy_check || []}
                  />
                  <SafetyCheckCard
                    title="Pregnancy Safety"
                    icon="🤰"
                    results={result.pregnancy_safety || []}
                  />
                  <SafetyCheckCard
                    title="Kidney Safety"
                    icon="🫘"
                    results={result.kidney_safety || []}
                    showExtra
                  />
                  <SafetyCheckCard
                    title="Liver Safety"
                    icon="🫀"
                    results={result.liver_safety || []}
                    showExtra
                  />
                  {result.duplicate_medicines?.length > 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <h3 style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 12px' }}>
                        Therapeutic Duplications
                      </h3>
                      {result.duplicate_medicines.map((dup, i) => (
                        <div key={i} style={{
                          padding: '12px 16px', marginBottom: '8px', borderRadius: '10px',
                          background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)',
                        }}>
                          <div style={{ color: '#f97316', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                            🔁 {dup.class}
                          </div>
                          <p style={{ color: '#9ca3af', fontSize: '12px', margin: 0 }}>{dup.message}</p>
                          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                            {dup.drugs?.map((d, j) => (
                              <span key={j} style={{
                                padding: '2px 10px', borderRadius: '20px',
                                background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
                                color: '#f97316', fontSize: '11px', fontWeight: 600,
                              }}>{d}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* INTERACTIONS */}
              {activeTab === 'interactions' && (
                <InteractionMatrix
                  medications={structured.length > 0 ? structured : medications_.map(m => ({ drug: m }))}
                  interactions={{
                    conflicts:           result.interactions?.conflicts || [],
                    severity_counts:     result.interactions?.severity_counts || {},
                    interaction_matrix:  {},
                    combination_analysis:result.interactions?.combination_analysis || [],
                  }}
                />
              )}

              {/* OVERDOSE */}
              {activeTab === 'overdose' && (
                <div>
                  {(result.overdose_alerts || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#4b5563' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                      <p style={{ fontSize: '14px' }}>No overdose concerns detected.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {result.overdose_alerts.map((od, i) => {
                        const isAlert = od.severity && od.severity !== 'NONE';
                        const sevColors = {
                          CRITICAL: '#a855f7', HIGH: '#ef4444', MODERATE: '#f97316',
                          SAFE: '#22c55e', NONE: '#22c55e', UNKNOWN: '#64748b',
                        };
                        const c = sevColors[od.severity] || '#64748b';
                        return (
                          <div key={i} style={{
                            padding: '14px 18px',
                            borderRadius: '12px',
                            background: `rgba(${isAlert ? '239,68,68' : '34,197,94'},0.05)`,
                            border: `1px solid ${c}33`,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ color: '#f9fafb', fontWeight: 700, fontSize: '14px' }}>{od.drug}</span>
                              <span style={{
                                padding: '3px 12px', borderRadius: '20px',
                                background: `${c}22`, border: `1px solid ${c}44`,
                                color: c, fontSize: '11px', fontWeight: 700,
                              }}>{od.status || od.severity}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '8px', marginBottom: '8px' }}>
                              {od.prescribed_dose_mg != null && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                                  <div style={{ color: '#4b5563', fontSize: '10px' }}>Prescribed</div>
                                  <div style={{ color: c, fontWeight: 700, fontFamily: 'monospace' }}>{od.prescribed_dose_mg} mg</div>
                                </div>
                              )}
                              {od.max_safe_dose_mg != null && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                                  <div style={{ color: '#4b5563', fontSize: '10px' }}>Max Safe</div>
                                  <div style={{ color: '#22c55e', fontWeight: 700, fontFamily: 'monospace' }}>{od.max_safe_dose_mg} mg</div>
                                </div>
                              )}
                              {od.frequency && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px' }}>
                                  <div style={{ color: '#4b5563', fontSize: '10px' }}>Frequency</div>
                                  <div style={{ color: '#9ca3af', fontSize: '12px' }}>{od.frequency}</div>
                                </div>
                              )}
                            </div>
                            {od.message && (
                              <p style={{ color: '#6b7280', fontSize: '12px', lineHeight: 1.4, margin: 0 }}>{od.message}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* BLOCKCHAIN */}
              {activeTab === 'blockchain' && (
                <BlockchainProof
                  reportHash={result.report_hash}
                  txHash={txHash || result.blockchain_tx_hash}
                  blockNumber={result.blockchain_block_number}
                  safetyScore={safetyScore}
                  severity={severity}
                  patientAddress={result.patient_profile?.wallet_address || null}
                  reportId={reportId}
                  onAnchor={handleAnchor}
                />
              )}

              {/* PDF REPORT */}
              {activeTab === 'report' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '280px', gap: '20px' }}>
                  <div style={{ fontSize: '56px' }}>📄</div>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ color: '#f9fafb', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
                      Download PDF Report
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '13px', maxWidth: '400px', lineHeight: 1.5 }}>
                      Generate a professional clinical PDF with all validation results, safety checks,
                      drug interaction analysis, recommendations, and blockchain proof.
                    </p>
                  </div>

                  {/* Preview stats */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px',
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '12px', padding: '16px',
                  }}>
                    {[
                      { label: 'Pages', value: '~4–6' },
                      { label: 'Sections', value: '10' },
                      { label: 'Format', value: 'A4 PDF' },
                      { label: 'Signed', value: 'AI Hash' },
                    ].map((item, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ color: '#06b6d4', fontWeight: 700, fontSize: '15px' }}>{item.value}</div>
                        <div style={{ color: '#4b5563', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleDownloadPdf}
                    disabled={pdfLoading || !reportId}
                    style={{
                      padding: '14px 32px',
                      borderRadius: '12px',
                      border: 'none',
                      background: pdfLoading ? 'rgba(6,182,212,0.3)' : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                      color: 'white',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: pdfLoading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 4px 20px rgba(6,182,212,0.3)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      transition: 'all 0.2s',
                    }}
                  >
                    {pdfLoading ? (
                      <>
                        <div style={{
                          width: '16px', height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }} />
                        Generating PDF…
                      </>
                    ) : (
                      '⬇️ Download PDF Report'
                    )}
                  </button>

                  <p style={{ color: '#374151', fontSize: '11px' }}>
                    Requires reportlab installed in the AI service. See{' '}
                    <code style={{ color: '#4b5563' }}>pip install reportlab</code>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default PrescriptionValidator;
