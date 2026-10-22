// frontend/src/pages/PredictiveAnalyticsPage.jsx
// Predictive Analytics — Phase 11
// Visual dashboard for 6 clinical prediction models.

import React, { useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CONDITIONS = [
  { value: 'heart_disease', label: '❤️ Heart Disease' },
  { value: 'diabetes',      label: '🩸 Diabetes' },
  { value: 'hypertension',  label: '💉 Hypertension' },
  { value: 'kidney_disease',label: '🫘 Kidney Disease' },
  { value: 'liver_disease', label: '🫀 Liver Disease' },
  { value: 'stroke',        label: '🧠 Stroke' },
  { value: 'cancer',        label: '🔴 Cancer' },
];

const LEVEL_COLORS = {
  CRITICAL: '#b44736', HIGH: '#b44736', MODERATE: '#ebcb82', LOW: '#16866a',
};

function getLevelColor(level) {
  return LEVEL_COLORS[level] || '#68766e';
}

// ─────────────────────────────────────────────────────────────────────────────
// RISK GAUGE
// ─────────────────────────────────────────────────────────────────────────────
function RiskGauge({ value, label, level, icon }) {
  const color = getLevelColor(level);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#ffffff" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg">{icon}</span>
          <span className="text-xs font-black" style={{ color }}>{value.toFixed(0)}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[11px] font-semibold text-hc-text">{label}</p>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ color, background: `${color}20`, border: `1px solid ${color}40` }}
        >
          {level}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESSION CHART
// ─────────────────────────────────────────────────────────────────────────────
function ProgressionChart({ progressions }) {
  if (!progressions?.length) return null;

  const colors = ['#16866a', '#ebcb82', '#d97860', '#16866a', '#b44736'];
  const data = progressions[0]?.timeline?.map((t, i) => {
    const entry = { month: `M${t.month}` };
    progressions.forEach((p, pi) => {
      entry[p.condition] = p.timeline[i]?.risk;
    });
    return entry;
  }) || [];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" />
        <XAxis dataKey="month" tick={{ fill: '#68766e', fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#68766e', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#faf8f1', border: '1px solid #e9f4ec', borderRadius: 8 }}
          formatter={(v, name) => [`${v?.toFixed(1)}%`, name]}
        />
        {progressions.map((p, i) => (
          <Line
            key={p.condition}
            type="monotone"
            dataKey={p.condition}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={false}
            name={p.condition}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function PredictiveAnalyticsPage() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    conditions:             [],
    adherenceScore:         75,
    recentHospitalizations: 0,
    smokingStatus:          false,
    alcoholUse:             false,
    exerciseFrequency:      'moderate',
    socialSupport:          'moderate',
  });

  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const handleConditionToggle = (val) => {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.includes(val)
        ? f.conditions.filter((c) => c !== val)
        : [...f.conditions, val],
    }));
  };

  const handleAnalyze = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/ai/cdss/predictive-analytics', {
        ...form,
        age:    user?.age,
        gender: user?.gender,
      });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate predictive analytics.');
    } finally {
      setLoading(false);
    }
  }, [form, user]);

  const predictions = results?.predictions;

  const barData = predictions ? [
    { name: 'Readmission\n30d',  value: predictions.readmission30Day?.probability || 0,  level: predictions.readmission30Day?.level },
    { name: 'ER Visit\n90d',     value: predictions.emergencyRisk90Day?.probability || 0, level: predictions.emergencyRisk90Day?.level },
    { name: 'Mortality\nRisk',   value: predictions.mortalityRisk?.probability || 0,      level: predictions.mortalityRisk?.level },
    { name: 'Treatment\nSuccess',value: predictions.treatmentSuccess?.probability || 0,    level: predictions.treatmentSuccess?.level },
  ] : [];

  return (
    <div className="min-h-screen bg-medichain-bg-ivory text-hc-text">
      {/* Header */}
      <div className="bg-gradient-to-r from-hc-emerald-soft via-white to-hc-terracotta-soft border-b border-hc-border">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="text-4xl">📈</div>
            <div>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-3 py-0.5 uppercase tracking-widest">
                6 Prediction Models
              </span>
              <h1 className="text-3xl font-black text-hc-text">Predictive Analytics</h1>
              <p className="text-hc-text-light text-sm">Clinical outcome predictions using AI scoring models</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <GlassCard className="lg:col-span-1 h-fit">
            <h2 className="text-sm font-bold text-hc-text mb-4">⚙️ Patient Parameters</h2>
            <form onSubmit={handleAnalyze} className="space-y-4">
              {/* Conditions */}
              <div>
                <label className="text-[11px] font-semibold text-hc-text-light uppercase tracking-wide mb-2 block">
                  Current Conditions
                </label>
                <div className="space-y-1.5">
                  {CONDITIONS.map((c) => (
                    <label key={c.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      form.conditions.includes(c.value)
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'border-hc-border text-hc-text-light hover:border-hc-border'
                    }`}>
                      <input
                        type="checkbox"
                        checked={form.conditions.includes(c.value)}
                        onChange={() => handleConditionToggle(c.value)}
                        className="accent-terracotta-500"
                      />
                      <span className="text-xs">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Adherence Slider */}
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[11px] font-semibold text-hc-text-light uppercase tracking-wide">
                    Medication Adherence
                  </label>
                  <span className="text-xs font-bold text-emerald-400">{form.adherenceScore}%</span>
                </div>
                <input
                  type="range" min="0" max="100" step="5"
                  value={form.adherenceScore}
                  onChange={(e) => setForm((f) => ({ ...f, adherenceScore: Number(e.target.value) }))}
                  className="w-full accent-terracotta-500"
                />
              </div>

              {/* Recent Hospitalizations */}
              <div>
                <label className="text-[11px] font-semibold text-hc-text-light uppercase tracking-wide mb-1 block">
                  Recent Hospitalizations (past year)
                </label>
                <select
                  value={form.recentHospitalizations}
                  onChange={(e) => setForm((f) => ({ ...f, recentHospitalizations: Number(e.target.value) }))}
                  className="w-full bg-hc-surface border border-hc-border text-hc-text text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/50"
                >
                  {[0,1,2,3,4,5].map((n) => <option key={n} value={n}>{n === 0 ? 'None' : n}</option>)}
                </select>
              </div>

              {/* Exercise */}
              <div>
                <label className="text-[11px] font-semibold text-hc-text-light uppercase tracking-wide mb-1 block">
                  Exercise Frequency
                </label>
                <select
                  value={form.exerciseFrequency}
                  onChange={(e) => setForm((f) => ({ ...f, exerciseFrequency: e.target.value }))}
                  className="w-full bg-hc-surface border border-hc-border text-hc-text text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="high">High — Daily</option>
                  <option value="moderate">Moderate — 3–5x/week</option>
                  <option value="low">Low — Rarely</option>
                </select>
              </div>

              {/* Social Support */}
              <div>
                <label className="text-[11px] font-semibold text-hc-text-light uppercase tracking-wide mb-1 block">
                  Social Support
                </label>
                <select
                  value={form.socialSupport}
                  onChange={(e) => setForm((f) => ({ ...f, socialSupport: e.target.value }))}
                  className="w-full bg-hc-surface border border-hc-border text-hc-text text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="high">Strong</option>
                  <option value="moderate">Moderate</option>
                  <option value="low">Limited</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                {[
                  { key: 'smokingStatus', label: '🚬 Smoker' },
                  { key: 'alcoholUse',    label: '🍺 Regular Alcohol Use' },
                ].map(({ key, label }) => (
                  <label key={key} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                    form[key] ? 'bg-red-500/10 border-red-500/30' : 'border-hc-border'
                  }`}>
                    <span className="text-xs text-hc-text-muted">{label}</span>
                    <div
                      onClick={() => setForm((f) => ({ ...f, [key]: !f[key] }))}
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${form[key] ? 'bg-red-500' : 'bg-hc-emerald-soft'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                  </label>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-orange-600 text-hc-text font-bold rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/25 transition-shadow flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing…
                  </>
                ) : '📈 Generate Predictions'}
              </button>
            </form>
          </GlassCard>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-hc-danger text-sm">
                ⚠️ {error}
              </div>
            )}

            {!results && !loading && (
              <GlassCard className="text-center py-16">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-lg font-bold text-hc-text mb-2">Ready to Analyze</h3>
                <p className="text-hc-text-light text-sm">Configure your patient parameters and click Generate Predictions</p>
              </GlassCard>
            )}

            {loading && (
              <GlassCard className="py-16 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-hc-text-muted">Running 6 prediction models…</p>
              </GlassCard>
            )}

            {results && !loading && (
              <>
                {/* Risk Stratification */}
                {results.riskStratification && (
                  <GlassCard>
                    <h3 className="text-sm font-bold text-hc-text mb-3">⚡ Overall Risk Stratification</h3>
                    <div className="flex items-center gap-4">
                      <div
                        className="text-4xl font-black"
                        style={{ color: getLevelColor(results.riskStratification.overall) }}
                      >
                        {results.riskStratification.overall}
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-hc-surface rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${results.riskStratification.averageRisk}%`,
                              background: getLevelColor(results.riskStratification.overall),
                            }}
                          />
                        </div>
                        <p className="text-xs text-hc-text-light">Average risk: {results.riskStratification.averageRisk}%</p>
                      </div>
                    </div>
                    <div className="mt-3 bg-hc-surface/50 rounded-lg px-4 py-3 text-sm text-hc-text-muted border border-hc-border">
                      → {results.riskStratification.priorityAction}
                    </div>
                  </GlassCard>
                )}

                {/* Risk Gauges */}
                {predictions && (
                  <GlassCard>
                    <h3 className="text-sm font-bold text-hc-text mb-4">📊 Prediction Gauges</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <RiskGauge icon="🏥" label="Readmission 30d" value={predictions.readmission30Day?.probability || 0} level={predictions.readmission30Day?.level} />
                      <RiskGauge icon="🚑" label="ER Visit 90d"    value={predictions.emergencyRisk90Day?.probability || 0} level={predictions.emergencyRisk90Day?.level} />
                      <RiskGauge icon="⚕️" label="Mortality Risk"  value={predictions.mortalityRisk?.probability || 0} level={predictions.mortalityRisk?.level} />
                      <RiskGauge icon="✅" label="Treatment Success" value={predictions.treatmentSuccess?.probability || 0} level={predictions.treatmentSuccess?.level} />
                    </div>
                  </GlassCard>
                )}

                {/* Bar Chart */}
                <GlassCard>
                  <h3 className="text-sm font-bold text-hc-text mb-4">📊 Risk Comparison</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={barData} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" />
                      <XAxis dataKey="name" tick={{ fill: '#68766e', fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#68766e', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ background: '#faf8f1', border: '1px solid #e9f4ec', borderRadius: 8 }}
                        formatter={(v, _, props) => [`${v.toFixed(1)}% — ${props.payload.level}`, 'Risk']}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {barData.map((entry, i) => (
                          <Cell key={i} fill={getLevelColor(entry.level)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GlassCard>

                {/* LOS */}
                {predictions?.expectedLOS && (
                  <GlassCard>
                    <h3 className="text-sm font-bold text-hc-text mb-3">🛏 Expected Length of Stay (if admitted)</h3>
                    <div className="flex items-center gap-4">
                      <div className="text-4xl font-black text-emerald-400">{predictions.expectedLOS.estimatedDays}d</div>
                      <div>
                        <p className="text-sm text-hc-text-muted">{predictions.expectedLOS.description}</p>
                        {predictions.expectedLOS.icuLikely && (
                          <p className="text-xs text-orange-400 mt-1">⚠️ ICU admission may be required</p>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Disease Progression */}
                {predictions?.diseaseProgression?.length > 0 && (
                  <GlassCard>
                    <h3 className="text-sm font-bold text-hc-text mb-4">📉 Disease Progression (12-month)</h3>
                    <ProgressionChart progressions={predictions.diseaseProgression} />
                    <div className="mt-3 space-y-2">
                      {predictions.diseaseProgression.map((p) => (
                        <div key={p.condition} className="flex items-center justify-between text-xs">
                          <span className="text-hc-text-muted">{p.condition}</span>
                          <span className={`font-bold ${p.controlled ? 'text-green-400' : 'text-orange-400'}`}>
                            {p.progression} {p.controlled ? '✅' : '⚠️'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                {/* Risk Trend */}
                {results.trendData && (
                  <GlassCard>
                    <h3 className="text-sm font-bold text-hc-text mb-4">📈 12-Month Risk Trend</h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={results.trendData.riskTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" />
                        <XAxis dataKey="label" tick={{ fill: '#68766e', fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#68766e', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#faf8f1', border: '1px solid #e9f4ec', borderRadius: 8 }} />
                        <Line type="monotone" dataKey="riskScore" stroke="#d97860" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-hc-text-muted mt-2">Projection: <span className="text-orange-400">{results.trendData.projection}</span></p>
                  </GlassCard>
                )}

                {/* Actionable Insights */}
                {results.actionableInsights?.length > 0 && (
                  <GlassCard>
                    <h3 className="text-sm font-bold text-hc-text mb-3">💡 Actionable Insights</h3>
                    <div className="space-y-3">
                      {results.actionableInsights.map((ins, i) => (
                        <div key={i} className={`rounded-xl p-3 border ${
                          ins.type === 'warning' ? 'bg-orange-500/5 border-orange-500/20' :
                          ins.type === 'success' ? 'bg-green-500/5 border-green-500/20' :
                          'bg-emerald-500/5 border-emerald-500/20'
                        }`}>
                          <p className="text-xs font-bold text-hc-text">{ins.title}</p>
                          <p className="text-xs text-hc-text-light mt-0.5">{ins.message}</p>
                          <p className="text-xs text-emerald-300 mt-1">→ {ins.action}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}

                <p className="text-[10px] text-hc-text-muted text-center pb-4">{results.disclaimer}</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
