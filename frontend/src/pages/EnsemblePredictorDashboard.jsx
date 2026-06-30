// frontend/src/pages/EnsemblePredictorDashboard.jsx
// MediChain — Upgraded AI Multi-Model Ensemble Disease Predictor Dashboard
// Features XGBoost + LightGBM + CatBoost probabilities, confidence intervals, and specialist maps.

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ChartTooltip, Legend as ChartLegend
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import ShapExplanationView from '../components/cdss/ShapExplanationView';

const PRIORITY_BADGES = {
  'CRITICAL': { bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.3)',  color: '#a855f7', label: '🚨 Critical Priority' },
  'HIGH':     { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)',   color: '#ef4444', label: '🔴 High Priority' },
  'MEDIUM':   { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)',  color: '#f97316', label: '🟠 Medium' },
  'LOW':      { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',   color: '#22c55e', label: '🟢 Low' }
};

const EMERGENCY_BADGES = {
  'CRITICAL': { bg: 'rgba(168,85,247,0.15)', border: '#a855f7', color: '#a855f7', label: 'EMERGENCY: IMMEDIATE ACTION' },
  'URGENT':   { bg: 'rgba(239,68,68,0.15)',   border: '#ef4444', color: '#ef4444', label: 'URGENT OUTPATIENT REVIEW' },
  'ROUTINE':  { bg: 'rgba(255,255,255,0.03)', border: '#4b5563', color: '#9ca3af', label: 'ROUTINE CLINICAL CARE' }
};

export default function EnsemblePredictorDashboard() {
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';

  // Sub-tabs: 'assess' | 'history'
  const [activeTab, setActiveTab] = useState('assess');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form params
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
  const [tsh, setTsh] = useState(1.8);
  const [freeT4, setFreeT4] = useState(1.2);
  const [chronicConditions, setChronicConditions] = useState([]);

  // Results
  const [currentReport, setCurrentReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedEnsembleShapDisease, setSelectedEnsembleShapDisease] = useState('');

  // Prepopulate if user is patient
  useEffect(() => {
    if (isPatient && user) {
      if (user.dateOfBirth) {
        const calculatedAge = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
        setAge(calculatedAge);
      }
      setChronicConditions(user.chronicConditions || []);
      fetchPatientLogs();
    }
  }, [isPatient, user]);

  const fetchPatientLogs = async () => {
    setLoading(true);
    try {
      const pId = isPatient ? user._id : patientId;
      if (!pId) return;

      const { data } = await api.get(`/ensemble-predict/history?patientId=${pId}`);
      setHistory(data.reports || []);
      if (data.reports?.length > 0) {
        setCurrentReport(data.reports[0]);
        setSelectedEnsembleShapDisease(data.reports[0].topFive?.[0]?.disease_key || '');
      }
    } catch (err) {
      console.error(err);
      setError('Could not fetch assessment logs.');
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

  const handleSubmit = async (e) => {
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
      tsh: Number(tsh),
      free_t4: Number(freeT4),
      chronicConditions
    };

    try {
      const { data } = await api.post('/ensemble-predict/assess', payload);
      setCurrentReport(data.report);
      setSelectedEnsembleShapDisease(data.report.topFive?.[0]?.disease_key || '');
      fetchPatientLogs();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Ensemble assessment failed.');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = (report) => {
    setCurrentReport(report);
    setSelectedEnsembleShapDisease(report.topFive?.[0]?.disease_key || '');
    setActiveTab('assess');
  };

  // Nav Items mapping
  const navItems = isPatient ? [
    { label: 'Dashboard', path: '/patient-dashboard', icon: '🏠' },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: '🧠' },
    { label: '🩺 Health Scorer', path: '/health-risk', icon: '🩺' }
  ] : [
    { label: 'Dashboard', path: '/doctor-dashboard', icon: '🏠' },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: '🧠' },
    { label: '🩺 Health Scorer', path: '/health-risk', icon: '🩺' }
  ];

  // Recharts bar chart payload
  const modelComparisonData = currentReport?.topFive?.map(d => ({
    name: d.disease,
    XGBoost: d.model_breakdown?.xgboost || 10,
    LightGBM: d.model_breakdown?.lightgbm || 10,
    CatBoost: d.model_breakdown?.catboost || 10,
    Ensemble: d.probability || 10
  })) || [];

  return (
    <DashboardLayout role={isPatient ? 'Patient' : 'Doctor'} navItems={navItems}>
      <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2">
              🧬 Upgraded AI Ensemble Predictor (XGBoost + LightGBM + CatBoost)
            </h1>
            <p className="text-text-secondary mt-1">
              Top 5 disease risk scoring engine with multi-model probability breakdowns and recommended tests.
            </p>
          </div>
          <div className="flex gap-2">
            {['assess', 'history'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === tab ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === tab ? 'white' : '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'uppercase'
                }}
              >
                {tab === 'assess' ? '🧬 Run Ensemble' : '📜 Assessment Log'}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB 1: RUN ASSESSMENTS ── */}
        {activeTab === 'assess' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Inputs Card */}
            <div className="lg:col-span-1 space-y-6">
              <GlassCard>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>👤</span> Clinical Parameters
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                        onBlur={() => patientId && fetchPatientLogs()}
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">TSH Level</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={tsh}
                        onChange={e => setTsh(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Free T4</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={freeT4}
                        onChange={e => setFreeT4(e.target.value)}
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
                      { state: smoking, set: setSmoking, label: 'Smoking Status' },
                      { state: alcoholUse, set: setAlcoholUse, label: 'Alcohol Usage' },
                      { state: familyHistoryCancer, set: setFamilyHistoryCancer, label: 'Cancer Family History' },
                      { state: physicalInactivity, set: setPhysicalInactivity, label: 'Physical Inactivity' },
                      { state: chronicInflammation, set: setChronicInflammation, label: 'Chronic Inflammation' }
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

                  {/* Pre-existing */}
                  <div className="pt-2">
                    <label className="block text-xs uppercase text-text-secondary mb-2">Comorbidities</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['heart', 'diabetes', 'stroke', 'asthma', 'thyroid', 'occupational'].map(cond => {
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
                    {loading ? 'Evaluating Ensemble...' : '🧬 Assess Risks'}
                  </FuturisticButton>
                </form>
              </GlassCard>
            </div>

            {/* Results Card */}
            <div className="lg:col-span-2 space-y-6">
              {!currentReport && !loading && (
                <GlassCard className="flex flex-col items-center justify-center py-28 text-center">
                  <div style={{ fontSize: '56px', marginBottom: '16px' }}>🧬</div>
                  <h3 className="text-xl font-bold text-white mb-2">Ensemble Predictive Engine</h3>
                  <p className="text-sm text-text-secondary max-w-sm">
                    Assess patient profiles using a parallel model ensemble (XGBoost, LightGBM, CatBoost) to map and rank the top five disease risks.
                  </p>
                </GlassCard>
              )}

              {loading && (
                <GlassCard className="flex flex-col items-center justify-center py-28 text-center">
                  <div style={{
                    width: '44px', height: '44px',
                    border: '3px solid rgba(6,182,212,0.2)',
                    borderTop: '3px solid #06b6d4',
                    borderRadius: '50%',
                    animation: 'spin 1.2s linear infinite',
                    marginBottom: '16px'
                  }} />
                  <p style={{ color: '#06b6d4', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px', animation: 'pulse 1s infinite' }}>
                    AGGREGATING ENSEMBLE KERNEL PREDICTIONS...
                  </p>
                </GlassCard>
              )}

              {currentReport && !loading && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Health index card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="md:col-span-1 flex flex-col justify-center items-center text-center">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">
                        Ensemble Health Index
                      </h4>
                      <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="55" cy="55" r="45" fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                          <circle cx="55" cy="55" r="45" fill="transparent"
                            stroke="#06b6d4"
                            strokeWidth="6"
                            strokeDasharray={2 * Math.PI * 45}
                            strokeDashoffset={2 * Math.PI * 45 * (1 - (currentReport.healthScore || 100) / 100)}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                          />
                        </svg>
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '24px', fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>
                            {currentReport.healthScore}%
                          </span>
                        </div>
                      </div>
                    </GlassCard>

                    {/* Quick description */}
                    <GlassCard className="md:col-span-2 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">
                          Diagnostic Assessment Briefing
                        </h4>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', marginBottom: '12px' }}>
                          <span style={{ color: '#06b6d4', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>
                            Ensemble Evaluated Successfully
                          </span>
                        </div>
                        <p style={{ color: '#d1d5db', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                          Below are the ranked top 5 diseases evaluated by the XGBoost, LightGBM, and CatBoost ensemble classifiers. Check individual model probabilities and follow-up clinical tests.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-medichain-border/30">
                        <div>
                          <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Highest Risk Model</span>
                          <span style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#ef4444' }}>
                            {currentReport.topFive?.[0]?.disease || 'None'} ({currentReport.topFive?.[0]?.probability}%)
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' }}>Urgent Actions Required</span>
                          <span style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'white' }}>
                            {currentReport.topFive?.filter(t => t.emergency_level === 'CRITICAL' || t.emergency_level === 'URGENT').length || 0} Recommended
                          </span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Top 5 Diseases Progress Bars */}
                  <GlassCard>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-text-primary mb-4">
                      📊 Ranked Top Five Disease Risks
                    </h4>
                    <div className="space-y-4">
                      {currentReport.topFive?.map((disease, idx) => {
                        const pb = PRIORITY_BADGES[disease.treatment_priority] || PRIORITY_BADGES.LOW;
                        return (
                          <div key={idx} style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                              <span style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>
                                {disease.icon} {disease.disease}
                              </span>
                              <div className="flex gap-1.5 items-center">
                                <span style={{ padding: '2px 8px', borderRadius: '20px', background: pb.bg, border: `1px solid ${pb.border}`, color: pb.color, fontSize: '10px', fontWeight: 700 }}>
                                  {pb.label}
                                </span>
                                <span style={{ color: '#9ca3af', fontSize: '10px' }}>
                                  CI: {disease.confidence_interval?.[0]}% - {disease.confidence_interval?.[1]}% (95%)
                                </span>
                              </div>
                            </div>

                            {/* Bar */}
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span style={{ color: '#6b7280' }}>Probability: <strong>{disease.probability}%</strong></span>
                                <span style={{ color: '#06b6d4', fontWeight: 700 }}>{disease.confidence} CONFIDENCE</span>
                              </div>
                              <div style={{ height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${disease.probability}%`,
                                  height: '100%',
                                  background: `linear-gradient(to right, ${pb.color}, #3b82f6)`,
                                  borderRadius: '4px',
                                  transition: 'width 1s ease-out'
                                }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>

                  {/* Model comparison bar chart */}
                  <GlassCard>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-accent-cyan mb-6">
                      📊 XGBoost vs LightGBM vs CatBoost Probability Comparison
                    </h4>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={modelComparisonData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9 }} />
                        <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <ChartTooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                        <ChartLegend />
                        <Bar dataKey="XGBoost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="LightGBM" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="CatBoost" fill="#a855f7" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Ensemble" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </GlassCard>

                  {/* Interactive SHAP Explainer */}
                  <div className="space-y-4">
                    <GlassCard>
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-accent-cyan">
                          🧠 Select Disease Explainer
                        </h4>
                        <div className="flex gap-1 flex-wrap">
                          {currentReport.topFive?.map(disease => (
                            <button
                              key={disease.disease_key}
                              type="button"
                              onClick={() => setSelectedEnsembleShapDisease(disease.disease_key)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: selectedEnsembleShapDisease === disease.disease_key ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.06)',
                                background: selectedEnsembleShapDisease === disease.disease_key ? 'rgba(6,182,212,0.1)' : 'transparent',
                                color: selectedEnsembleShapDisease === disease.disease_key ? '#06b6d4' : '#6b7280',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                              }}
                            >
                              {disease.icon} {disease.disease}
                            </button>
                          ))}
                        </div>
                      </div>
                    </GlassCard>

                    {currentReport.topFive?.find(d => d.disease_key === selectedEnsembleShapDisease)?.shap_explanation ? (
                      <ShapExplanationView
                        shapData={currentReport.topFive.find(d => d.disease_key === selectedEnsembleShapDisease).shap_explanation}
                        title={`${currentReport.topFive.find(d => d.disease_key === selectedEnsembleShapDisease).disease} Risk Drivers`}
                      />
                    ) : (
                      <GlassCard>
                        <p className="text-xs text-text-secondary italic text-center py-6">
                          Select a disease to view feature attribution analysis.
                        </p>
                      </GlassCard>
                    )}
                  </div>

                  {/* Clinical Recommendations Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentReport.topFive?.slice(0, 4).map((disease, idx) => {
                      const eb = EMERGENCY_BADGES[disease.emergency_level] || EMERGENCY_BADGES.ROUTINE;
                      return (
                        <GlassCard key={idx}>
                          <div className="flex justify-between items-start border-b border-medichain-border/30 pb-3 mb-4 flex-wrap gap-2">
                            <div>
                              <span style={{ fontSize: '9px', textTransform: 'uppercase', color: '#6b7280', display: 'block' }}>Disease Risk</span>
                              <h4 style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>
                                {disease.icon} {disease.disease}
                              </h4>
                            </div>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', border: `1px solid ${eb.border}66`, background: eb.bg, color: eb.color, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>
                              {eb.label}
                            </span>
                          </div>

                          <div className="space-y-3">
                            <div>
                              <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '2px' }}>Suggested Specialist</span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>👨‍⚕️ {disease.suggested_specialist}</span>
                            </div>
                            
                            <div>
                              <span style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Recommended Tests Screen</span>
                              <div className="flex flex-wrap gap-1.5">
                                {disease.recommended_tests?.map((test, ti) => (
                                  <span key={ti} className="px-2 py-0.5 bg-accent-cyan/10 border border-accent-cyan/20 rounded text-[10px] text-accent-cyan font-bold uppercase">
                                    {test}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: HISTORICAL LOGS ── */}
        {activeTab === 'history' && (
          <GlassCard>
            <h3 className="text-lg font-bold text-white mb-6">📜 Historical Ensemble Assessments</h3>
            
            {history.length === 0 ? (
              <div className="text-center py-20 text-text-secondary italic">
                No logs recorded yet.
              </div>
            ) : (
              <div className="relative border-l border-medichain-border/30 ml-4 pl-6 space-y-6">
                {history.map((rep, idx) => {
                  const dateStr = new Date(rep.createdAt).toLocaleString();
                  return (
                    <div key={rep._id} className="relative group">
                      <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-medichain-bg-dark flex items-center justify-center bg-accent-cyan" />
                      <div className="p-4 bg-medichain-bg-dark/40 border border-medichain-border/30 rounded-xl hover:border-accent-cyan/30 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <span className="text-[10px] text-text-secondary font-mono block mb-1">{dateStr}</span>
                          <h4 className="text-sm font-bold text-white">Ensemble Run #{history.length - idx}</h4>
                          <div className="flex gap-3 mt-2 flex-wrap text-xs text-text-secondary">
                            {rep.topFive?.slice(0, 3).map((t, ti) => (
                              <span key={ti}>{t.icon} {t.disease}: <strong>{t.probability}%</strong></span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: 'white', block: 'block' }}>
                              {rep.healthScore}%
                            </span>
                            <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', block: 'block' }}>
                              Health Index
                            </span>
                          </div>
                          
                          <button
                            onClick={() => loadProfile(rep)}
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
