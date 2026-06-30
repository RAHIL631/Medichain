// frontend/src/pages/HealthRiskDashboard.jsx
// MediChain — AI Health Risk Scoring Dashboard
// Shows Overall Health Score, 6 organ systems, trend charts, SHAP analysis, and recommendation schedules.

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as ChartTooltip, Legend as ChartLegend
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import RiskRadarChart from '../components/cdss/RiskRadarChart';
import ShapExplanationView from '../components/cdss/ShapExplanationView';

const ORGAN_DETAILS = {
  heart:    { label: 'Cardiovascular', icon: '❤️', color: '#ef4444' },
  diabetes: { label: 'Endocrine (Diabetes)', icon: '🩸', color: '#f97316' },
  stroke:   { label: 'Neurological (Stroke)', icon: '🧠', color: '#eab308' },
  kidney:   { label: 'Renal (Kidney)', icon: '🫘', color: '#3b82f6' },
  liver:    { label: 'Hepatic (Liver)', icon: '🟤', color: '#10b981' },
  cancer:   { label: 'Oncology (Cancer)', icon: '🎗️', color: '#a855f7' }
};

const RISK_LABELS = {
  'VERY HIGH': { color: '#ef4444', label: 'Very High Risk' },
  'HIGH':      { color: '#f97316', label: 'High Risk' },
  'MODERATE':  { color: '#eab308', label: 'Moderate Risk' },
  'LOW':       { color: '#22c55e', label: 'Low Risk' },
  'MINIMAL':   { color: '#10b981', label: 'Minimal Risk' }
};

export default function HealthRiskDashboard() {
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';

  // State
  const [activeSubTab, setActiveSubTab] = useState('assess'); // 'assess' | 'trends' | 'history'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form parameters
  const [patientId, setPatientId] = useState('');
  const [age, setAge] = useState(45);
  const [gender, setGender] = useState('M');
  const [smoking, setSmoking] = useState(false);
  const [alcoholUse, setAlcoholUse] = useState(false);
  const [familyHistoryCancer, setFamilyHistoryCancer] = useState(false);
  const [bmi, setBmi] = useState(24.5);
  const [physicalInactivity, setPhysicalInactivity] = useState(false);
  const [chronicInflammation, setChronicInflammation] = useState(false);
  const [kidneyGfr, setKidneyGfr] = useState(90);
  const [liverScore, setLiverScore] = useState(0);
  const [chronicConditions, setChronicConditions] = useState([]);
  
  // Results
  const [currentReport, setCurrentReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [trends, setTrends] = useState([]);
  
  // Active SHAP explainer disease choice
  const [selectedExplainerDisease, setSelectedExplainerDisease] = useState('heart');

  // Prepopulate if user is patient
  useEffect(() => {
    if (isPatient && user) {
      if (user.dateOfBirth) {
        const calculatedAge = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
        setAge(calculatedAge);
      }
      setChronicConditions(user.chronicConditions || []);
      fetchOwnAssessmentData();
    }
  }, [isPatient, user]);

  const fetchOwnAssessmentData = async () => {
    setLoading(true);
    try {
      const [histRes, trendRes] = await Promise.all([
        api.get('/health-risk/history'),
        api.get('/health-risk/trends')
      ]);
      setHistory(histRes.data.reports || []);
      setTrends(trendRes.data.trends || []);
      if (histRes.data.reports?.length > 0) {
        setCurrentReport(histRes.data.reports[0]);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch historical assessments.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCondition = (cond) => {
    if (chronicConditions.includes(cond)) {
      setChronicConditions(chronicConditions.filter(c => c !== cond));
    } else {
      setChronicConditions([...chronicConditions, cond]);
    }
  };

  const handleAssess = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCurrentReport(null);

    const payload = {
      patientId: isPatient ? user._id : patientId,
      age: Number(age),
      gender,
      smoking,
      alcohol_use: alcoholUse,
      family_history_cancer: familyHistoryCancer,
      bmi: Number(bmi),
      physical_inactivity: physicalInactivity,
      chronic_inflammation: chronicInflammation,
      kidney_gfr: Number(kidneyGfr),
      liver_score: Number(liverScore),
      chronicConditions
    };

    try {
      const { data } = await api.post('/health-risk/assess', payload);
      setCurrentReport(data.report);
      // Refresh history & trends list
      if (isPatient) {
        fetchOwnAssessmentData();
      } else {
        const [histRes, trendRes] = await Promise.all([
          api.get(`/health-risk/history?patientId=${patientId}`),
          api.get(`/health-risk/trends?patientId=${patientId}`)
        ]);
        setHistory(histRes.data.reports || []);
        setTrends(trendRes.data.trends || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Health risk scoring failed.');
    } finally {
      setLoading(false);
    }
  };

  const loadPatientFromHistory = async (pId) => {
    setLoading(true);
    try {
      const [histRes, trendRes] = await Promise.all([
        api.get(`/health-risk/history?patientId=${pId}`),
        api.get(`/health-risk/trends?patientId=${pId}`)
      ]);
      setHistory(histRes.data.reports || []);
      setTrends(trendRes.data.trends || []);
      if (histRes.data.reports?.length > 0) {
        setCurrentReport(histRes.data.reports[0]);
      }
    } catch (err) {
      setError('Could not retrieve logs for this patient.');
    } finally {
      setLoading(false);
    }
  };

  // Nav Items mapping
  const navItems = isPatient ? [
    { label: 'Dashboard', path: '/patient-dashboard', icon: '🏠' },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: '🧠' },
    { label: '🔬 Rx Validator', path: '/prescription-validator', icon: '🔬' }
  ] : [
    { label: 'Dashboard', path: '/doctor-dashboard', icon: '🏠' },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: '🧠' },
    { label: '🔬 Rx Validator', path: '/prescription-validator', icon: '🔬' }
  ];

  // SHAP explainer records
  const shapExpList = currentReport?.explanations?.[selectedExplainerDisease]?.feature_importance || [];
  const explanationText = currentReport?.explanations?.[selectedExplainerDisease]?.explanation_text || '';

  return (
    <DashboardLayout role={isPatient ? 'Patient' : 'Doctor'} navItems={navItems}>
      <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2">
              🩺 AI Health Risk Scorer & SHAP Explainer
            </h1>
            <p className="text-text-secondary mt-1">
              Multi-organ risk indices, predictive health scores, and Explainable AI (XAI) feature-attribution mapping.
            </p>
          </div>
          <div className="flex gap-2">
            {['assess', 'trends', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeSubTab === tab ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.05)',
                  color: activeSubTab === tab ? 'white' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {tab === 'assess' ? '🩺 New Assessment' : tab === 'trends' ? '📈 Trend Analytics' : '📜 History Log'}
              </button>
            ))}
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '10px',
            padding: '14px 18px',
            color: '#ef4444',
            fontSize: '13px',
            fontWeight: 600
          }}>
            ❌ {error}
          </div>
        )}

        {/* ── SUBTAB 1: ASSESS ── */}
        {activeSubTab === 'assess' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Form Column */}
            <div className="lg:col-span-1 space-y-6">
              <GlassCard>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>📝</span> Patient Health Context
                </h3>
                
                <form onSubmit={handleAssess} className="space-y-4">
                  {!isPatient && (
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Patient MongoDB ID</label>
                      <input
                        type="text"
                        required
                        value={patientId}
                        onChange={e => setPatientId(e.target.value)}
                        placeholder="e.g. 648fdf..."
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                        onBlur={() => patientId && loadPatientFromHistory(patientId)}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Age</label>
                      <input
                        type="number"
                        required
                        value={age}
                        onChange={e => setAge(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Gender</label>
                      <select
                        value={gender}
                        onChange={e => setGender(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">BMI</label>
                      <input
                        type="number"
                        step="0.1"
                        required
                        value={bmi}
                        onChange={e => setBmi(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Kidney GFR</label>
                      <input
                        type="number"
                        required
                        value={kidneyGfr}
                        onChange={e => setKidneyGfr(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-text-secondary mb-1">Liver Child-Pugh Score</label>
                    <select
                      value={liverScore}
                      onChange={e => setLiverScore(e.target.value)}
                      className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                    >
                      <option value={0}>Class A (Normal)</option>
                      <option value={7}>Class B (Moderate)</option>
                      <option value={10}>Class C (Severe)</option>
                    </select>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3 pt-2">
                    {[
                      { state: smoking, set: setSmoking, label: '🚬 Tobacco Smoker' },
                      { state: alcoholUse, set: setAlcoholUse, label: '🍺 Alcohol Use' },
                      { state: familyHistoryCancer, set: setFamilyHistoryCancer, label: '🎗️ Cancer Family History' },
                      { state: physicalInactivity, set: setPhysicalInactivity, label: '🛋️ Physical Inactivity' },
                      { state: chronicInflammation, set: setChronicInflammation, label: '🔥 Chronic Inflammation' }
                    ].map((tog, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-xs text-text-secondary font-semibold">{tog.label}</span>
                        <div
                          onClick={() => tog.set(!tog.state)}
                          style={{
                            width: '40px', height: '20px',
                            borderRadius: '10px',
                            background: tog.state ? '#06b6d4' : 'rgba(255,255,255,0.1)',
                            cursor: 'pointer',
                            transition: 'all 0.25s',
                            position: 'relative',
                            border: `1px solid ${tog.state ? 'rgba(6,182,212,0.5)' : 'rgba(255,255,255,0.1)'}`
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: '2px',
                            left: tog.state ? '22px' : '2px',
                            width: '14px', height: '14px',
                            borderRadius: '50%',
                            background: 'white',
                            transition: 'left 0.25s'
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chronic Conditions */}
                  <div className="pt-2">
                    <label className="block text-xs uppercase text-text-secondary mb-2">Pre-existing Conditions</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['heart', 'diabetes', 'stroke', 'hypertension', 'copd', 'asthma'].map(cond => {
                        const active = chronicConditions.includes(cond);
                        return (
                          <button
                            key={cond}
                            type="button"
                            onClick={() => handleToggleCondition(cond)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              border: active ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.08)',
                              background: active ? 'rgba(6,182,212,0.1)' : 'transparent',
                              color: active ? '#06b6d4' : '#6b7280',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textTransform: 'capitalize'
                            }}
                          >
                            {cond}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <FuturisticButton type="submit" disabled={loading} fullWidth>
                    {loading ? 'Running AI Diagnostics...' : '🧬 Calculate Health Score'}
                  </FuturisticButton>
                </form>
              </GlassCard>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-2 space-y-6">
              {!currentReport && !loading && (
                <GlassCard className="flex flex-col items-center justify-center py-24 text-center">
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🩺</div>
                  <h3 className="text-xl font-bold text-white mb-2">Predictive Health Assessment</h3>
                  <p className="text-sm text-text-secondary max-w-sm">
                    Enter patient parameters on the left and trigger calculation to view the diagnostic dashboard, SHAP feature waterfall mapping, and clinical schedules.
                  </p>
                </GlassCard>
              )}

              {loading && (
                <GlassCard className="flex flex-col items-center justify-center py-24 text-center">
                  <div style={{
                    width: '40px', height: '40px',
                    border: '3px solid rgba(6,182,212,0.3)',
                    borderTop: '3px solid #06b6d4',
                    borderRadius: '50%',
                    animation: 'spin 1.2s linear infinite',
                    marginBottom: '16px'
                  }} />
                  <p style={{ color: '#06b6d4', fontWeight: 700, fontSize: '14px', letterSpacing: '1px', textTransform: 'uppercase', animation: 'pulse 1s infinite' }}>
                    RUNNING MULTI-ORGAN PREDICTORS & SHAP KERNELS...
                  </p>
                </GlassCard>
              )}

              {currentReport && !loading && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Gauge chart & Overall Risk */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Gauge Card */}
                    <GlassCard className="md:col-span-1 flex flex-col justify-center items-center text-center">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">
                        Overall Health Score
                      </h4>
                      {/* Custom CSS Gauge */}
                      <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                          <circle cx="60" cy="60" r="50" fill="transparent"
                            stroke="url(#healthScoreGrad)"
                            strokeWidth="8"
                            strokeDasharray={2 * Math.PI * 50}
                            strokeDashoffset={2 * Math.PI * 50 * (1 - (currentReport.overallHealthScore || 100) / 100)}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                          />
                          <defs>
                            <linearGradient id="healthScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#06b6d4" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '28px', fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>
                            {currentReport.overallHealthScore}%
                          </span>
                          <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginTop: '2px' }}>
                            Optimal
                          </span>
                        </div>
                      </div>
                      <div style={{ marginTop: '14px', fontSize: '11px', color: '#94a3b8' }}>
                        Risk index: <strong>{currentReport.overallRiskScore}%</strong>
                      </div>
                    </GlassCard>

                    {/* Overall Risk Profile */}
                    <GlassCard className="md:col-span-2 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">
                          AI Diagnostic Summary
                        </h4>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: `${RISK_LABELS[currentReport.overallRisk]?.color}22`, border: `1px solid ${RISK_LABELS[currentReport.overallRisk]?.color}44`, marginBottom: '12px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: RISK_LABELS[currentReport.overallRisk]?.color }} />
                          <span style={{ color: RISK_LABELS[currentReport.overallRisk]?.color, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase' }}>
                            {RISK_LABELS[currentReport.overallRisk]?.label || currentReport.overallRisk}
                          </span>
                        </div>
                        <p style={{ color: '#d1d5db', fontSize: '13px', lineHeight: 1.5, margin: 0 }}>
                          The patient's overall health score is calculated at <strong>{currentReport.overallHealthScore}/100</strong>, reflecting a highest single-organ risk model probability of <strong>{currentReport.overallRiskScore}%</strong>. Feature-attribution explanations below map key clinical drivers.
                        </p>
                      </div>
                      {/* Micro stats */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-medichain-border/30">
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: 'white' }}>6</span>
                          <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Organs Checked</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: currentReport.urgentFlags?.length > 0 ? '#ef4444' : 'white' }}>
                            {currentReport.urgentFlags?.length || 0}
                          </span>
                          <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>Clinical Flags</span>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '16px', fontWeight: 800, color: 'white' }}>
                            {Object.values(currentReport.organRisks || {}).filter(o => o.risk_score > 50).length}
                          </span>
                          <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>High Risk Organs</span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Radar Chart Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary mb-3">
                        🕸️ 6-Organ Health Risk Radar
                      </h4>
                      <RiskRadarChart organRisks={currentReport.organRisks} />
                    </GlassCard>

                    {/* Urgent Flags Card */}
                    <GlassCard className="md:col-span-1">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-status-danger mb-4">
                        ⚠️ Clinical Urgency Flags
                      </h4>
                      <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
                        {(!currentReport.urgentFlags || currentReport.urgentFlags.length === 0) ? (
                          <div className="text-center py-10 text-xs text-text-secondary italic">
                            ✅ No urgent clinical warnings.
                          </div>
                        ) : (
                          currentReport.urgentFlags.map((flag, idx) => (
                            <div key={idx} style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              background: `${flag.color || '#ef4444'}10`,
                              border: `1px solid ${flag.color || '#ef4444'}30`,
                              borderLeft: `3px solid ${flag.color || '#ef4444'}`
                            }}>
                              <span style={{ display: 'block', color: 'white', fontWeight: 700, fontSize: '12px' }}>
                                {flag.flag}
                              </span>
                              <span style={{ display: 'block', color: '#94a3b8', fontSize: '10px', marginTop: '3px', lineHeight: 1.3 }}>
                                {flag.action}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </GlassCard>
                  </div>

                  {/* SHAP Explainer Card */}
                  <div className="space-y-4">
                    <GlassCard>
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-accent-cyan">
                          🧠 Select Disease Explainer
                        </h4>
                        <div className="flex gap-1 flex-wrap">
                          {Object.keys(ORGAN_DETAILS).map(disease => (
                            <button
                              key={disease}
                              onClick={() => setSelectedExplainerDisease(disease)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: selectedExplainerDisease === disease ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                background: selectedExplainerDisease === disease ? 'rgba(6,182,212,0.1)' : 'transparent',
                                color: selectedExplainerDisease === disease ? '#06b6d4' : '#6b7280',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                              }}
                            >
                              {ORGAN_DETAILS[disease].icon} {disease}
                            </button>
                          ))}
                        </div>
                      </div>
                    </GlassCard>

                    {currentReport.explanations?.[selectedExplainerDisease] ? (
                      <ShapExplanationView
                        shapData={currentReport.explanations[selectedExplainerDisease]}
                        title={`${ORGAN_DETAILS[selectedExplainerDisease]?.label} Risk Attribution`}
                      />
                    ) : (
                      <GlassCard>
                        <p className="text-xs text-text-secondary italic text-center py-6">
                          No explanations generated for {selectedExplainerDisease}.
                        </p>
                      </GlassCard>
                    )}
                  </div>

                  {/* Recommendation Schedules */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Monitoring */}
                    <GlassCard>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-accent-indigo mb-4">
                        📅 Clinical Monitoring Schedule
                      </h4>
                      <div className="divide-y divide-medichain-border/30">
                        {Object.entries(currentReport.monitoringSchedule || {}).map(([key, val]) => (
                          <div key={key} className="flex justify-between py-2 text-xs">
                            <span className="text-text-secondary capitalize">{key.replace('_', ' ')}</span>
                            <span className="font-bold text-accent-cyan">{val}</span>
                          </div>
                        ))}
                      </div>
                    </GlassCard>

                    {/* Recommendations */}
                    <GlassCard>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary mb-4">
                        🏃 Evidence-based Lifestyle Guidelines
                      </h4>
                      <ul style={{ paddingLeft: '14px', listStyleType: 'disc', margin: 0 }} className="space-y-2 text-xs text-text-secondary leading-relaxed">
                        {currentReport.lifestyleRecommendations?.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </GlassCard>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SUBTAB 2: TRENDS ── */}
        {activeSubTab === 'trends' && (
          <GlassCard>
            <h3 className="text-lg font-bold text-white mb-6">📉 Historical Health Score Trends</h3>
            {trends.length === 0 ? (
              <div className="text-center py-20 text-text-secondary italic">
                No trend logs available yet. Run health risk assessments to track changes over time.
              </div>
            ) : (
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trends.map(t => ({
                    date: new Date(t.date).toLocaleDateString(),
                    HealthScore: t.healthScore,
                    RiskScore: t.riskScore
                  }))} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <ChartTooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                    <ChartLegend />
                    <Line type="monotone" dataKey="HealthScore" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="RiskScore" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 4" dot={{ r: 3, fill: '#ef4444' }} />
                  </LineChart>
                </ResponsiveContainer>
                
                <p className="text-xs text-text-secondary leading-relaxed max-w-xl mx-auto text-center italic">
                  This chart shows the patient's calculated overall Health Score (solid blue line) and overall Risk Score (dashed red line) compiled across all evaluations.
                </p>
              </div>
            )}
          </GlassCard>
        )}

        {/* ── SUBTAB 3: HISTORY LOG (TIMELINE) ── */}
        {activeSubTab === 'history' && (
          <GlassCard>
            <h3 className="text-lg font-bold text-white mb-6">📜 Diagnostic Assessment Logs</h3>
            
            {history.length === 0 ? (
              <div className="text-center py-20 text-text-secondary italic">
                No logs recorded yet.
              </div>
            ) : (
              <div className="relative border-l border-medichain-border/30 ml-4 pl-6 space-y-8">
                {history.map((rep, idx) => {
                  const dateStr = new Date(rep.createdAt).toLocaleString();
                  const badge = RISK_LABELS[rep.overallRisk] || RISK_LABELS.LOW;
                  
                  return (
                    <div key={rep._id} className="relative group">
                      {/* Icon connector */}
                      <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-medichain-bg-dark flex items-center justify-center"
                        style={{ background: badge.color }}
                      />
                      
                      <div className="p-4 bg-medichain-bg-dark/40 border border-medichain-border/30 rounded-xl hover:border-accent-cyan/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <span className="text-[10px] text-text-secondary font-mono block mb-1">{dateStr}</span>
                          <h4 className="text-sm font-bold text-white">Assessment #{history.length - idx}</h4>
                          <div className="flex gap-4 mt-2 flex-wrap text-xs text-text-secondary">
                            <span>Age: <strong>{rep.patientProfile?.age}</strong></span>
                            <span>BMI: <strong>{rep.patientProfile?.bmi}</strong></span>
                            <span>GFR: <strong>{rep.patientProfile?.kidney_gfr}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: 'white', block: 'block' }}>
                              {rep.overallHealthScore}%
                            </span>
                            <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', block: 'block' }}>
                              Health Score
                            </span>
                          </div>
                          
                          <button
                            onClick={() => {
                              setCurrentReport(rep);
                              setActiveSubTab('assess');
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(6,182,212,0.3)',
                              background: 'transparent',
                              color: '#06b6d4',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            👁️ Load Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        )}

      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </DashboardLayout>
  );
}
