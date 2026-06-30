// frontend/src/pages/DigitalTwinDashboard.jsx
// MediChain — AI Patient Digital Twin Dashboard
// Features anatomical SVG visualizers, medication simulators, and progression line charts.

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ChartTooltip, Legend as ChartLegend,
  LineChart, Line
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';

const ORGAN_NODES = {
  brain:     { label: 'Neurological (Stroke)', cx: 100, cy: 30, color: '#eab308', key: 'Neurological' },
  heart:     { label: 'Cardiovascular',        cx: 100, cy: 75, color: '#ef4444', key: 'Cardiovascular' },
  endocrine: { label: 'Endocrine (Diabetes)',  cx: 100, cy: 110, color: '#f97316', key: 'Endocrine' },
  liver:     { label: 'Hepatic (Liver)',       cx: 90,  cy: 125, color: '#10b981', key: 'Hepatic' },
  kidney:    { label: 'Renal (Kidney)',        cx: 110, cy: 135, color: '#3b82f6', key: 'Renal' }
};

export default function DigitalTwinDashboard() {
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';

  // Sub-tabs: 'visualizer' | 'baseline'
  const [activeSubTab, setActiveSubTab] = useState('visualizer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Patient Twin Baseline Profile
  const [patientId, setPatientId] = useState('');
  const [age, setAge] = useState(45);
  const [gender, setGender] = useState('M');
  const [bp, setBp] = useState(120);
  const [diastolicBp, setDiastolicBp] = useState(80);
  const [glucose, setGlucose] = useState(100);
  const [cholesterol, setCholesterol] = useState(200);
  const [bmi, setBmi] = useState(24.5);
  const [gfr, setGfr] = useState(90);
  const [creatinine, setCreatinine] = useState(1.0);
  const [liverScore, setLiverScore] = useState(0);
  const [chronicDiseases, setChronicDiseases] = useState(1);
  const [smoking, setSmoking] = useState(false);
  const [alcoholUse, setAlcoholUse] = useState(false);
  const [familyHistoryCancer, setFamilyHistoryCancer] = useState(false);

  // Simulation Controls
  const [selectedDrug, setSelectedDrug] = useState('Lisinopril');
  const [selectedDosage, setSelectedDosage] = useState(10); // mg

  // Results
  const [simResults, setSimResults] = useState(null);
  const [selectedOrganNode, setSelectedOrganNode] = useState('heart');

  // Prepopulate baseline
  useEffect(() => {
    if (isPatient && user) {
      fetchProfile();
    }
  }, [isPatient, user]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const pId = isPatient ? user._id : patientId;
      if (!pId) return;

      const { data } = await api.get(`/digital-twin/profile?patientId=${pId}`);
      if (data.profile) {
        const m = data.profile.baselineMetrics || {};
        setAge(m.age || 45);
        setGender(m.gender || 'M');
        setBp(m.bloodPressure || 120);
        setDiastolicBp(m.diastolic_bp || 80);
        setGlucose(m.glucose || 100);
        setCholesterol(m.cholesterol || 200);
        setBmi(m.bmi || 24.5);
        setGfr(m.kidney_gfr || 90);
        setCreatinine(m.creatinine || 1.0);
        setLiverScore(m.liver_score || 0);
        setChronicDiseases(m.chronic_diseases || 1);
        setSmoking(!!m.smoking);
        setAlcoholUse(!!m.alcohol_use);
        setFamilyHistoryCancer(!!m.family_history_cancer);

        // Run default simulation with no drug to populate charts
        await runSimulationCall(m, "None", 0);
      }
    } catch (err) {
      console.error(err);
      setError('Could not load patient digital twin profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBaseline = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      patientId: isPatient ? user._id : patientId,
      metrics: {
        age: Number(age),
        gender,
        bloodPressure: Number(bp),
        diastolic_bp: Number(diastolicBp),
        glucose: Number(glucose),
        cholesterol: Number(cholesterol),
        bmi: Number(bmi),
        kidney_gfr: Number(gfr),
        creatinine: Number(creatinine),
        liver_score: Number(liverScore),
        chronic_diseases: Number(chronicDiseases),
        smoking,
        alcohol_use: alcoholUse,
        family_history_cancer: familyHistoryCancer
      }
    };

    try {
      await api.put('/digital-twin/profile', payload);
      await fetchProfile();
      setActiveSubTab('visualizer');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Profile update failed.');
    } finally {
      setLoading(false);
    }
  };

  const runSimulationCall = async (baselineObj, drug, dosage) => {
    const payload = {
      patientId: isPatient ? user._id : patientId,
      drug,
      dosage_mg: dosage
    };

    try {
      const { data } = await api.post('/digital-twin/simulate', payload);
      setSimResults(data.simulation);
    } catch (err) {
      setError('Medication simulation failed.');
    }
  };

  const triggerSimulation = async () => {
    setLoading(true);
    setError('');
    const baseObj = {
      age, gender, bloodPressure: bp, diastolic_bp: diastolicBp, glucose, cholesterol, bmi, kidney_gfr: gfr, creatinine, liver_score: liverScore, chronic_diseases: chronicDiseases, smoking, alcohol_use: alcoholUse, family_history_cancer: familyHistoryCancer
    };
    await runSimulationCall(baseObj, selectedDrug, selectedDosage);
    setLoading(false);
  };

  const activeNodeInfo = ORGAN_NODES[selectedOrganNode];
  const activeOrganRisks = simResults?.organ_risk_comparison?.find(o => o.organ === activeNodeInfo?.key) || { baseline: 10, simulated: 10 };

  // Nav Items
  const navItems = isPatient ? [
    { label: 'Dashboard', path: '/patient-dashboard', icon: '🏠' },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: '🧠' },
    { label: '🩺 Health Scorer', path: '/health-risk', icon: '🩺' },
    { label: '🧬 Ensemble Predictor', path: '/ensemble-predict', icon: '🧬' },
    { label: '🗓️ Adherence Predictor', path: '/adherence-prediction', icon: '🗓️' }
  ] : [
    { label: 'Dashboard', path: '/doctor-dashboard', icon: '🏠' },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: '🧠' },
    { label: '🩺 Health Scorer', path: '/health-risk', icon: '🩺' },
    { label: '🧬 Ensemble Predictor', path: '/ensemble-predict', icon: '🧬' },
    { label: '🗓️ Adherence Predictor', path: '/adherence-prediction', icon: '🗓️' }
  ];

  // Trajectory chart payload (Year 0, 1, 3, 5)
  const diseaseKeysMapping = {
    'heart': 'heartDisease',
    'endocrine': 'diabetes',
    'brain': 'stroke',
    'kidney': 'chronic_kidney_disease'
  };

  const trajectoryData = [0, 1, 3, 5].map((val, idx) => {
    const dk = diseaseKeysMapping[selectedOrganNode] || 'heartDisease';
    return {
      year: `Yr ${val}`,
      Baseline: simResults?.trajectories?.baseline?.[idx]?.[dk] || 10,
      Simulated: simResults?.trajectories?.simulated?.[idx]?.[dk] || 10
    };
  });

  return (
    <DashboardLayout role={isPatient ? 'Patient' : 'Doctor'} navItems={navItems}>
      <div className="space-y-6" style={{ fontFamily: "'Inter', sans-serif" }}>

        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2">
              👥 AI Patient Digital Twin Simulator
            </h1>
            <p className="text-text-secondary mt-1">
              Virtual organ visualization, treatment prognosis simulations, and multi-year progression pathways.
            </p>
          </div>
          <div className="flex gap-2">
            {['visualizer', 'baseline'].map(tab => (
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
                  textTransform: 'uppercase'
                }}
              >
                {tab === 'visualizer' ? '👥 Twin Visualizer' : '⚙️ Configure Baseline'}
              </button>
            ))}
          </div>
        </div>

        {/* Errors */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-500 text-sm font-semibold">
            ❌ {error}
          </div>
        )}

        {/* TAB 1: TWIN VISUALIZER */}
        {activeSubTab === 'visualizer' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Visual Anatomical Silhouette Column */}
            <div className="lg:col-span-1 flex justify-center">
              <GlassCard className="w-full max-w-[340px] flex flex-col items-center py-6 relative">
                <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">
                  Anatomical Node Monitor
                </h4>
                
                {/* SVG Silhouette */}
                <svg viewBox="0 0 200 300" width="100%" height="320" className="relative z-10">
                  {/* Body Outline Shape */}
                  <path
                    d="M 100 10 C 90 10, 85 20, 85 30 C 85 40, 90 48, 100 48 C 110 48, 115 40, 115 30 C 115 20, 110 10, 100 10 Z 
                       M 90 52 C 70 55, 60 70, 50 110 C 45 130, 42 160, 42 180 C 42 195, 48 195, 48 180 C 50 150, 55 120, 70 95 C 70 120, 75 180, 70 240 C 68 260, 65 285, 65 295 C 65 298, 70 298, 72 295 C 80 270, 85 240, 92 205 C 95 190, 105 190, 108 205 C 115 240, 120 270, 128 295 C 130 298, 135 298, 135 295 C 135 285, 132 260, 130 240 C 125 180, 130 120, 130 95 C 145 120, 150 150, 152 180 C 152 195, 158 195, 158 180 C 158 160, 155 130, 150 110 C 140 70, 130 55, 110 52"
                    fill="rgba(255,255,255,0.03)"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="1.5"
                  />

                  {/* Organ Node Circles with glowing effects */}
                  {Object.entries(ORGAN_NODES).map(([key, item]) => {
                    const active = selectedOrganNode === key;
                    return (
                      <g key={key} onClick={() => setSelectedOrganNode(key)} className="cursor-pointer group">
                        {/* Glow halo */}
                        <circle
                          cx={item.cx} cy={item.cy}
                          r={active ? "12" : "7"}
                          fill={item.color}
                          opacity={active ? "0.45" : "0.15"}
                          className="transition-all duration-300 group-hover:opacity-40 animate-pulse"
                        />
                        {/* Center core */}
                        <circle
                          cx={item.cx} cy={item.cy}
                          r={active ? "5" : "3.5"}
                          fill={item.color}
                          stroke="white"
                          strokeWidth={active ? "1.5" : "0"}
                          className="transition-all duration-300"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Node info selector brief */}
                <div className="mt-4 text-center z-10">
                  <span className="text-[10px] text-text-secondary uppercase block mb-1">Target Organ Selected</span>
                  <span className="text-sm font-bold text-white block">
                    {activeNodeInfo?.label}
                  </span>
                  <span className="text-xs text-text-secondary mt-1 block">
                    Baseline: <strong className="text-white">{activeOrganRisks.baseline}%</strong> | Simulated: <strong style={{ color: activeNodeInfo?.color }}>{activeOrganRisks.simulated}%</strong>
                  </span>
                </div>
              </GlassCard>
            </div>

            {/* Treatment simulation & prognosis Column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Simulation Controller */}
              <GlassCard>
                <h3 className="text-sm font-bold uppercase tracking-widest text-accent-cyan mb-4">
                  💊 Medication Prototyping Panel
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-xs uppercase text-text-secondary mb-1">Select Medication</label>
                    <select
                      value={selectedDrug}
                      onChange={e => setSelectedDrug(e.target.value)}
                      className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                    >
                      <option value="Lisinopril">Lisinopril (Blood Pressure)</option>
                      <option value="Metformin">Metformin (Glucose Control)</option>
                      <option value="Atorvastatin">Atorvastatin (Lipids/Statin)</option>
                      <option value="Furosemide">Furosemide (Fluid/BP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-text-secondary mb-1">Dosage (mg)</label>
                    <input
                      type="number"
                      value={selectedDosage}
                      onChange={e => setSelectedDosage(e.target.value)}
                      className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                    />
                  </div>

                  <div>
                    <FuturisticButton onClick={triggerSimulation} disabled={loading} fullWidth>
                      {loading ? 'Calculating prognosis...' : '🧬 Simulate Treatment'}
                    </FuturisticButton>
                  </div>
                </div>
              </GlassCard>

              {/* Simulation results overview */}
              {simResults && (
                <div className="space-y-6 animate-fade-in">
                  
                  {/* Before vs After risks comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard className="md:col-span-2">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
                        📊 Baseline vs Simulated Risk Comparison (%)
                      </h4>
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={simResults.organ_risk_comparison || []} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="organ" stroke="#64748b" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 9 }} />
                          <ChartTooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                          <ChartLegend />
                          <Bar dataKey="baseline" fill="#475569" name="Baseline Risk" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="simulated" fill="#06b6d4" name="Simulated Risk" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </GlassCard>

                    {/* Prognosis indicators */}
                    <GlassCard className="md:col-span-1 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                        Prognosis Indicators
                      </h4>
                      
                      <div className="space-y-3">
                        <div>
                          <span className="block text-[10px] text-text-secondary uppercase">Recovery Outcome Probability</span>
                          <span className="text-2xl font-bold text-green-500 font-mono">
                            {simResults.treatment_outcomes?.recovery_probability}%
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-text-secondary uppercase">Side Effects Likelihood</span>
                          <span className="text-2xl font-bold text-yellow-500 font-mono">
                            {simResults.treatment_outcomes?.side_effect_probability}%
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-text-secondary uppercase">Compliance Rating</span>
                          <span className="text-2xl font-bold text-cyan-400 font-mono">
                            {simResults.treatment_outcomes?.predicted_adherence}%
                          </span>
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Future risk progression timeline chart */}
                  <GlassCard>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-accent-indigo mb-4">
                      📈 {activeNodeInfo?.label} Progression Trajectory (1-5 Years)
                    </h4>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={trajectoryData} margin={{ top: 10, right: 30, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <ChartTooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                        <ChartLegend />
                        <Line type="monotone" dataKey="Baseline" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} name="Baseline Trajectory" />
                        <Line type="monotone" dataKey="Simulated" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} name="Post-Treatment Trajectory" />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-text-secondary italic text-center mt-3 max-w-lg mx-auto">
                      Projections show disease development. Simulated trajectories reflect dampening vectors based on daily intake of {simResults.active_simulated_drug} {simResults.active_simulated_dosage}mg.
                    </p>
                  </GlassCard>

                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PROFILE FORM */}
        {activeTab === 'baseline' && (
          <GlassCard className="max-w-2xl mx-auto">
            <h3 className="text-lg font-bold text-white mb-6">⚙️ Configure Digital Twin Baseline Profile</h3>
            
            <form onSubmit={handleUpdateBaseline} className="space-y-6">
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
                    onBlur={() => patientId && fetchProfile()}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase text-text-secondary mb-1">Blood Pressure (Sys)</label>
                  <input
                    type="number"
                    required
                    value={bp}
                    onChange={e => setBp(e.target.value)}
                    className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-text-secondary mb-1">Blood Pressure (Dia)</label>
                  <input
                    type="number"
                    required
                    value={diastolicBp}
                    onChange={e => setDiastolicBp(e.target.value)}
                    className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-text-secondary mb-1">Cholesterol (Total)</label>
                  <input
                    type="number"
                    required
                    value={cholesterol}
                    onChange={e => setCholesterol(e.target.value)}
                    className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase text-text-secondary mb-1">Fasting Glucose</label>
                  <input
                    type="number"
                    required
                    value={glucose}
                    onChange={e => setGlucose(e.target.value)}
                    className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-text-secondary mb-1">Kidney GFR</label>
                  <input
                    type="number"
                    required
                    value={gfr}
                    onChange={e => setGfr(e.target.value)}
                    className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-text-secondary mb-1">Serum Creatinine</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={creatinine}
                    onChange={e => setCreatinine(e.target.value)}
                    className="w-full bg-medichain-bg-dark border border-medichain-border rounded-lg px-3 py-2 text-sm text-white focus:border-accent-cyan outline-none"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                {[
                  { state: smoking, set: setSmoking, label: 'Tobacco Smoker' },
                  { state: alcoholUse, set: setAlcoholUse, label: 'Alcohol Usage' },
                  { state: familyHistoryCancer, set: setFamilyHistoryCancer, label: 'Cancer Family History' }
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

              <FuturisticButton type="submit" disabled={loading} fullWidth>
                {loading ? 'Saving configuration...' : '💾 Save Virtual Profile'}
              </FuturisticButton>
            </form>
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
