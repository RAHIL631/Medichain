// frontend/src/pages/AdherenceDashboard.jsx
// MediChain — AI Medication Adherence Prediction System Dashboard
// Implements inputs, scores, risk ratings, and notification channel referrers.

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';
import ShapExplanationView from '../components/cdss/ShapExplanationView';

export default function AdherenceDashboard() {
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';

  // Sub-tabs: 'assess' | 'history'
  const [activeTab, setActiveTab] = useState('assess');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form params
  const [patientId, setPatientId] = useState('');
  const [age, setAge] = useState(45);
  const [education, setEducation] = useState('Secondary');
  const [historyScore, setHistoryScore] = useState(85);
  const [missedMedicines, setMissedMedicines] = useState(2);
  const [chronicDiseases, setChronicDiseases] = useState(1);

  // Results
  const [currentReport, setCurrentReport] = useState(null);
  const [history, setHistory] = useState([]);

  // Prepopulate if patient
  useEffect(() => {
    if (isPatient && user) {
      if (user.dateOfBirth) {
        const calculatedAge = new Date().getFullYear() - new Date(user.dateOfBirth).getFullYear();
        setAge(calculatedAge);
      }
      setChronicDiseases(user.chronicConditions?.length || 1);
      fetchPatientLogs();
    }
  }, [isPatient, user]);

  const fetchPatientLogs = async () => {
    setLoading(true);
    try {
      const pId = isPatient ? user._id : patientId;
      if (!pId) return;

      const { data } = await api.get(`/adherence-sys/history?patientId=${pId}`);
      setHistory(data.reports || []);
      if (data.reports?.length > 0) {
        setCurrentReport(data.reports[0]);
      }
    } catch (err) {
      console.error(err);
      setError('Could not fetch assessment logs.');
    } finally {
      setLoading(false);
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
      education,
      history: Number(historyScore),
      missed_medicines: Number(missedMedicines),
      chronic_diseases: Number(chronicDiseases)
    };

    try {
      const { data } = await api.post('/adherence-sys/assess', payload);
      setCurrentReport(data.report);
      fetchPatientLogs();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Adherence assessment failed.');
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = (report) => {
    setCurrentReport(report);
    setActiveTab('assess');
  };

  // Sidebar mapping
  const navItems = isPatient ? [
    { label: 'Dashboard', path: '/patient-dashboard', icon: '🏠' },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: '🧠' },
    { label: '🩺 Health Scorer', path: '/health-risk', icon: '🩺' },
    { label: '🧬 Ensemble Predictor', path: '/ensemble-predict', icon: '🧬' }
  ] : [
    { label: 'Dashboard', path: '/doctor-dashboard', icon: '🏠' },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: '🧠' },
    { label: '🩺 Health Scorer', path: '/health-risk', icon: '🩺' },
    { label: '🧬 Ensemble Predictor', path: '/ensemble-predict', icon: '🧬' }
  ];

  return (
    <DashboardLayout role={isPatient ? 'Patient' : 'Doctor'} navItems={navItems}>
      <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2">
              🗓️ AI Medication Adherence Predictor
            </h1>
            <p className="text-text-secondary mt-1">
              Evaluates patient compliance patterns to predict non-adherence risks and recommend alert channels.
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
                {tab === 'assess' ? '🗓️ Run Scorer' : '📜 Compliance Log'}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: EVALUATION */}
        {activeTab === 'assess' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Params Form */}
            <div className="lg:col-span-1">
              <GlassCard>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span>👤</span> Patient Compliance Profile
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
                      <label className="block text-xs uppercase text-text-secondary mb-1">Education Level</label>
                      <select
                        value={education}
                        onChange={e => setEducation(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      >
                        <option value="Primary">Primary</option>
                        <option value="Secondary">Secondary</option>
                        <option value="Higher">Higher (University)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-text-secondary mb-1">Refills Compliance History (%)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={historyScore}
                      onChange={e => setHistoryScore(e.target.value)}
                      placeholder="e.g. 85%"
                      className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Missed Meds (30d)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        max={30}
                        value={missedMedicines}
                        onChange={e => setMissedMedicines(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-text-secondary mb-1">Chronic Diseases</label>
                      <input
                        type="number"
                        required
                        min={0}
                        max={10}
                        value={chronicDiseases}
                        onChange={e => setChronicDiseases(e.target.value)}
                        className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                      />
                    </div>
                  </div>

                  <FuturisticButton type="submit" disabled={loading} fullWidth>
                    {loading ? 'Evaluating Score...' : '🗓️ Evaluate Adherence'}
                  </FuturisticButton>
                </form>
              </GlassCard>
            </div>

            {/* Results Grid */}
            <div className="lg:col-span-2 space-y-6">
              {!currentReport && !loading && (
                <GlassCard className="flex flex-col items-center justify-center py-28 text-center">
                  <div style={{ fontSize: '56px', marginBottom: '16px' }}>🗓️</div>
                  <h3 className="text-xl font-bold text-white mb-2">Medication Adherence Predictor</h3>
                  <p className="text-sm text-text-secondary max-w-sm">
                    Enter patient parameters to analyze compliance risks, calculate adherence scores, and configure custom SMS, WhatsApp, and family notification recommendations.
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
                    RUNNING ADHERENCE PREDICTION ENGINE...
                  </p>
                </GlassCard>
              )}

              {currentReport && !loading && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Gauge score and status card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="md:col-span-1 flex flex-col justify-center items-center text-center">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">
                        Adherence Score
                      </h4>
                      <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
                          <circle cx="55" cy="55" r="45" fill="transparent" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                          <circle cx="55" cy="55" r="45" fill="transparent"
                            stroke={currentReport.risk === 'LOW' ? '#22c55e' : currentReport.risk === 'MEDIUM' ? '#eab308' : '#ef4444'}
                            strokeWidth="6"
                            strokeDasharray={2 * Math.PI * 45}
                            strokeDashoffset={2 * Math.PI * 45 * (1 - (currentReport.adherenceScore || 100) / 100)}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                          />
                        </svg>
                        <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span style={{ fontSize: '24px', fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>
                            {currentReport.adherenceScore}%
                          </span>
                        </div>
                      </div>
                    </GlassCard>

                    <GlassCard className="md:col-span-2 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">
                          Compliance Risk Rating
                        </h4>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          background: currentReport.risk === 'LOW' ? 'rgba(34,197,94,0.1)' : currentReport.risk === 'MEDIUM' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                          border: `1px solid ${currentReport.risk === 'LOW' ? 'rgba(34,197,94,0.3)' : currentReport.risk === 'MEDIUM' ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          marginBottom: '12px'
                        }}>
                          <span style={{
                            color: currentReport.risk === 'LOW' ? '#22c55e' : currentReport.risk === 'MEDIUM' ? '#eab308' : '#ef4444',
                            fontWeight: 800,
                            fontSize: '11px',
                            textTransform: 'uppercase'
                          }}>
                            {currentReport.risk} Risk of Non-Adherence
                          </span>
                        </div>
                        <p style={{ color: '#d1d5db', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>
                          The patient's compliance patterns indicate a <strong>{currentReport.adherenceScore}%</strong> overall medication adherence score. This score was evaluated by the custom trained RandomForest model.
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-medichain-border/30 text-xs">
                        <div>
                          <span style={{ display: 'block', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Missed Doses (30d)</span>
                          <span style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'white' }}>
                            {currentReport.patientProfile?.missedMedicines30d} Missed Doses
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Chronic Conditions</span>
                          <span style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'white' }}>
                            {currentReport.patientProfile?.chronicDiseases} Conditions
                          </span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Reminder Recommendation Channels */}
                  <GlassCard>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
                      🔔 Recommended Reminder Alert Channels
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { key: 'sms', label: 'SMS Alerts', desc: 'Standard cellular SMS reminder triggers.', icon: '💬' },
                        { key: 'whatsapp', label: 'WhatsApp Alerts', desc: 'Interactive WhatsApp messaging triggers.', icon: '📲' },
                        { key: 'family_alert', label: 'Family Notifications', desc: 'Urgent notifications sent to family wallets.', icon: '👨‍👩‍👧‍👦' }
                      ].map(ch => {
                        const active = currentReport.reminderRecommendation?.[ch.key];
                        return (
                          <div
                            key={ch.key}
                            style={{
                              padding: '16px',
                              borderRadius: '12px',
                              border: active ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(255,255,255,0.06)',
                              background: active ? 'rgba(6,182,212,0.05)' : 'rgba(255,255,255,0.01)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span style={{ fontSize: '24px' }}>{ch.icon}</span>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                color: active ? '#22c55e' : '#ef4444',
                                fontSize: '9px',
                                fontWeight: 700,
                                textTransform: 'uppercase'
                              }}>
                                {active ? 'RECOMMENDED' : 'NOT REQUIRED'}
                              </span>
                            </div>
                            <span style={{ color: 'white', fontWeight: 700, fontSize: '13px', marginTop: '6px' }}>{ch.label}</span>
                            <span style={{ color: '#6b7280', fontSize: '10px', lineHeight: 1.4 }}>{ch.desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>

                  {/* Contributing Factors */}
                  <GlassCard>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-3">
                      🔬 Compliance Factor Audits
                    </h4>
                    <ul className="space-y-2 m-0 p-0 pl-4 text-xs text-text-secondary list-disc">
                      {currentReport.contributingFactors?.map((fac, idx) => (
                        <li key={idx} style={{ lineHeight: 1.5 }}>{fac}</li>
                      ))}
                    </ul>
                  </GlassCard>

                  {/* SHAP Explanation View */}
                  {currentReport.shap_explanation && (
                    <ShapExplanationView
                      shapData={currentReport.shap_explanation}
                      title="Adherence Prediction Attribution Drivers"
                    />
                  )}

                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: COMPLIANCE LOG */}
        {activeTab === 'history' && (
          <GlassCard>
            <h3 className="text-lg font-bold text-white mb-6">📜 Historical Compliance Log</h3>
            
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
                          <h4 className="text-sm font-bold text-white">Compliance Check #{history.length - idx}</h4>
                          <div className="flex gap-4 mt-2 flex-wrap text-xs text-text-secondary">
                            <span>Missed: <strong>{rep.patientProfile?.missedMedicines30d} doses</strong></span>
                            <span>Conditions: <strong>{rep.patientProfile?.chronicDiseases}</strong></span>
                            <span>Risk: <strong style={{ color: rep.risk === 'LOW' ? '#22c55e' : rep.risk === 'MEDIUM' ? '#eab308' : '#ef4444' }}>{rep.risk}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: 'white', block: 'block' }}>
                              {rep.adherenceScore}%
                            </span>
                            <span style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase', block: 'block' }}>
                              Adherence
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
                            👁️ View Details
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
