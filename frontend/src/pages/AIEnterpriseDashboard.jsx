// frontend/src/pages/AIEnterpriseDashboard.jsx
// AI Enterprise Dashboard — Phase 10
// Unified command center for all AI intelligence modules.
// Shows disease risks, emergency score, specialists, predictions, timeline.

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import GlassCard from '../components/GlassCard';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const RISK_COLOR = {
  'VERY HIGH': { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-400', dot: 'bg-red-500', hex: '#ef4444' },
  'HIGH':      { bg: 'bg-orange-500/15 border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500', hex: '#f97316' },
  'MODERATE':  { bg: 'bg-yellow-500/15 border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500', hex: '#eab308' },
  'LOW':       { bg: 'bg-green-500/15 border-green-500/30', text: 'text-green-400', dot: 'bg-green-500', hex: '#22c55e' },
  'MINIMAL':   { bg: 'bg-slate-500/15 border-slate-500/30', text: 'text-slate-400', dot: 'bg-slate-500', hex: '#64748b' },
  'CRITICAL':  { bg: 'bg-red-600/20 border-red-600/40', text: 'text-red-300', dot: 'bg-red-600', hex: '#dc2626' },
};

const EMERGENCY_COLORS = {
  CRITICAL: '#dc2626', HIGH: '#ef4444', MODERATE: '#f97316', LOW: '#22c55e',
};

function getRiskColor(level) {
  return RISK_COLOR[level] || RISK_COLOR['MINIMAL'];
}

function HealthScoreMeter({ score }) {
  const angle = (score / 100) * 180 - 90;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f97316' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-20">
        <svg viewBox="0 0 140 80" className="w-full h-full">
          {/* Background arc */}
          <path d="M 10 70 A 60 60 0 0 1 130 70" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
          {/* Score arc */}
          <path
            d="M 10 70 A 60 60 0 0 1 130 70"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 188} 188`}
          />
          {/* Needle */}
          <line
            x1="70" y1="70"
            x2={70 + 50 * Math.cos(((angle) * Math.PI) / 180)}
            y2={70 + 50 * Math.sin(((angle) * Math.PI) / 180)}
            stroke="white" strokeWidth="2" strokeLinecap="round"
          />
          <circle cx="70" cy="70" r="4" fill="white" />
        </svg>
      </div>
      <div className="text-center">
        <div className="text-3xl font-black" style={{ color }}>{score}</div>
        <div className="text-xs text-slate-400 uppercase tracking-widest">Health Score</div>
      </div>
    </div>
  );
}

function RiskRadarChart({ diseaseRisks }) {
  const data = (diseaseRisks || []).slice(0, 6).map((r) => ({
    subject: r.disease.replace(' Disease', '').replace(' (General)', ''),
    probability: r.probability,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
        <Radar
          name="Risk %" dataKey="probability"
          stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2}
          dot={{ fill: '#22d3ee', r: 3 }}
        />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v) => [`${v}%`, 'Risk']}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function TrendChart({ trendData }) {
  if (!trendData?.riskTrend) return null;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={trendData.riskTrend}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          formatter={(v) => [`${v}%`, 'Risk Score']}
        />
        <Line type="monotone" dataKey="riskScore" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ReadmissionBarChart({ predictions }) {
  if (!predictions) return null;
  const data = [
    { name: 'Readmission\n30d', value: predictions.readmission30Day?.probability || 0, color: '#ef4444' },
    { name: 'Emergency\n90d', value: predictions.emergencyRisk90Day?.probability || 0, color: '#f97316' },
    { name: 'Treatment\nSuccess', value: predictions.treatmentSuccess?.probability || 0, color: '#22c55e' },
    { name: 'Mortality\nRisk', value: predictions.mortalityRisk?.probability || 0, color: '#dc2626' },
  ];

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} />
        <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          formatter={(v) => [`${v.toFixed(1)}%`, 'Probability']}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((entry, idx) => (
            <rect key={idx} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'cyan', loading }) {
  const colorMap = {
    cyan:   'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    green:  'bg-green-500/10 border-green-500/20 text-green-400',
    orange: 'bg-orange-500/10 border-orange-500/20 text-orange-400',
    red:    'bg-red-500/10 border-red-500/20 text-red-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  };

  return (
    <GlassCard className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 text-xl ${colorMap[color] || colorMap.cyan}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-xl font-bold text-white truncate">{loading ? '…' : value}</p>
        {sub && <p className="text-[10px] text-slate-500 truncate">{sub}</p>}
      </div>
    </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AIEnterpriseDashboard() {
  const { user } = useAuth();

  const [intelligence, setIntelligence] = useState(null);
  const [analytics,    setAnalytics]    = useState(null);
  const [records,      setRecords]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [activeTab,    setActiveTab]    = useState('overview');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [intRes, recRes] = await Promise.allSettled([
        api.post('/ai/cdss/clinical-intelligence', {
          age:             user?.age,
          gender:          user?.gender,
          medicalHistory:  user?.medicalHistory || [],
          currentMedications: user?.currentMedications || [],
          symptoms:        [],
          vitals:          {},
          labValues:       {},
          lifestyle:       {},
        }),
        api.get('/patient/records?limit=5'),
      ]);

      if (intRes.status === 'fulfilled') setIntelligence(intRes.value.data);
      if (recRes.status === 'fulfilled') setRecords(recRes.value.data.records || []);

      // Fetch predictive analytics
      if (intRes.status === 'fulfilled') {
        try {
          const anaRes = await api.post('/ai/cdss/predictive-analytics', {
            age:       user?.age,
            gender:    user?.gender,
            conditions: (intRes.value.data?.diseaseRisks || [])
              .filter((r) => r.riskLevel !== 'MINIMAL')
              .map((r) => r.key),
            adherenceScore: 75,
          });
          setAnalytics(anaRes.data);
        } catch (_) {}
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load AI Enterprise Dashboard');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const topRisk  = intelligence?.diseaseRisks?.[0];
  const emRisk   = intelligence?.emergencyRisk;
  const specRecs = intelligence?.specialistRecommendations || [];
  const followUp = intelligence?.followUpRecommendation;
  const summary  = intelligence?.healthSummary;

  const tabs = [
    { id: 'overview',    label: '🧠 Overview'     },
    { id: 'predictions', label: '📊 Predictions'  },
    { id: 'specialists', label: '👨‍⚕️ Specialists' },
    { id: 'timeline',    label: '📅 Timeline'     },
  ];

  return (
    <div className="min-h-screen bg-medichain-bg-dark text-white">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-slate-900 to-purple-900/30" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full px-3 py-0.5 uppercase tracking-widest font-medium">
                  AI Intelligence Platform
                </span>
              </div>
              <h1 className="text-3xl font-black text-white">Enterprise AI Dashboard</h1>
              <p className="text-slate-400 mt-1">Real-time clinical intelligence for <span className="text-cyan-400 font-semibold">{user?.name}</span></p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchDashboard}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl text-sm font-medium transition-colors"
              >
                🔄 Refresh
              </button>
              <Link
                to="/predictive-analytics"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-sm font-bold shadow-lg hover:shadow-cyan-500/25 transition-shadow"
              >
                📈 Full Analytics
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50 w-fit">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === t.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── OVERVIEW TAB ────────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard
                icon="💚" label="Health Score" loading={loading}
                value={summary?.healthScore ?? '—'}
                sub="AI composite score"
                color={summary?.healthScore >= 70 ? 'green' : summary?.healthScore >= 50 ? 'orange' : 'red'}
              />
              <StatCard
                icon="🚨" label="Emergency Risk" loading={loading}
                value={emRisk?.level || '—'}
                sub={`Score: ${emRisk?.score || 0}/100`}
                color={emRisk?.level === 'CRITICAL' ? 'red' : emRisk?.level === 'HIGH' ? 'orange' : 'green'}
              />
              <StatCard
                icon="🧬" label="Top Disease Risk" loading={loading}
                value={topRisk?.riskLevel || '—'}
                sub={topRisk?.disease || 'No elevated risk'}
                color={topRisk?.riskLevel === 'VERY HIGH' ? 'red' : topRisk?.riskLevel === 'HIGH' ? 'orange' : 'green'}
              />
              <StatCard
                icon="📋" label="Medical Records" loading={loading}
                value={records.length}
                sub="On file"
                color="cyan"
              />
              <StatCard
                icon="👨‍⚕️" label="Recommended" loading={loading}
                value={specRecs[0]?.specialist || '—'}
                sub={specRecs[0]?.urgency || ''}
                color="purple"
              />
              <StatCard
                icon="📅" label="Follow-up" loading={loading}
                value={followUp?.recommendedIn || '—'}
                sub={followUp?.urgency || ''}
                color={followUp?.urgency === 'urgent' ? 'orange' : 'green'}
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Health Score + Risk Radar */}
              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  🎯 Health Overview
                </h3>
                {loading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <HealthScoreMeter score={summary?.healthScore || 75} />
                    <div className="space-y-2">
                      {(intelligence?.diseaseRisks || []).slice(0, 4).map((risk) => {
                        const c = getRiskColor(risk.riskLevel);
                        return (
                          <div key={risk.key} className="flex items-center justify-between">
                            <span className="text-xs text-slate-400">{risk.disease.replace(' Disease', '').replace(' (General)', '')}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text}`}>
                              {risk.probability}% · {risk.riskLevel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Risk Radar Chart */}
              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  📡 Disease Risk Radar
                </h3>
                {loading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <RiskRadarChart diseaseRisks={intelligence?.diseaseRisks} />
                )}
              </GlassCard>

              {/* Emergency Risk + Alerts */}
              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  🚨 Emergency Risk Assessment
                </h3>
                {loading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : emRisk ? (
                  <div className="space-y-4">
                    {/* Score gauge */}
                    <div className="text-center">
                      <div
                        className="text-5xl font-black mb-1"
                        style={{ color: EMERGENCY_COLORS[emRisk.level] || '#22c55e' }}
                      >
                        {emRisk.score}
                      </div>
                      <div className="text-xs text-slate-400">/ 100 Emergency Score</div>
                      <div
                        className="mt-2 text-xs font-bold px-3 py-1 rounded-full border inline-block"
                        style={{
                          color: EMERGENCY_COLORS[emRisk.level],
                          borderColor: `${EMERGENCY_COLORS[emRisk.level]}40`,
                          background: `${EMERGENCY_COLORS[emRisk.level]}15`,
                        }}
                      >
                        {emRisk.level}
                      </div>
                    </div>

                    {/* Warnings */}
                    {(emRisk.warnings || []).length > 0 && (
                      <div className="space-y-1">
                        {emRisk.warnings.slice(0, 3).map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-orange-300">
                            <span>⚠️</span>
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action */}
                    <div className="text-xs text-slate-300 bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                      {emRisk.action}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">No emergency risk data available</p>
                )}
              </GlassCard>
            </div>

            {/* Health Summary */}
            {summary?.text && (
              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  📝 AI Health Summary
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">{summary.text}</p>
                {(summary.topRisks || []).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {summary.topRisks.map((r) => (
                      <span key={r} className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full px-3 py-1">
                        ⚠️ {r}
                      </span>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            {/* Recent Records */}
            {records.length > 0 && (
              <GlassCard>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  📁 Recent Medical Records
                </h3>
                <div className="space-y-2">
                  {records.slice(0, 5).map((r) => (
                    <div key={r._id} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {r.recordType === 'prescription' ? '💊' : r.recordType === 'lab-report' ? '🧪' : r.recordType === 'diagnosis' ? '🩺' : '📄'}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-white capitalize">{r.recordType?.replace(/-/g, ' ')}</p>
                          <p className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {r.blockchainTxHash && (
                        <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full px-2 py-0.5">
                          ⛓ Verified
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <Link to="/records" className="block text-center mt-3 text-xs text-cyan-400 hover:text-cyan-300">
                  View all records →
                </Link>
              </GlassCard>
            )}
          </div>
        )}

        {/* ── PREDICTIONS TAB ──────────────────────────────────────────────────── */}
        {activeTab === 'predictions' && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {analytics?.predictions && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key: 'readmission30Day', label: '30-Day Readmission', icon: '🏥' },
                      { key: 'mortalityRisk',     label: 'Mortality Risk',      icon: '⚕️' },
                      { key: 'emergencyRisk90Day', label: '90-Day ER Visit',    icon: '🚑' },
                      { key: 'treatmentSuccess',   label: 'Treatment Success',  icon: '✅' },
                    ].map(({ key, label, icon }) => {
                      const pred = analytics.predictions[key];
                      if (!pred) return null;
                      const c = getRiskColor(pred.level);
                      return (
                        <GlassCard key={key}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{icon}</span>
                            <h4 className="text-sm font-semibold text-white">{label}</h4>
                          </div>
                          <div className={`text-3xl font-black mb-2 ${c.text}`}>
                            {pred.probability}%
                          </div>
                          <div className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border mb-2 ${c.bg} ${c.text}`}>
                            {pred.level}
                          </div>
                          <p className="text-xs text-slate-400">{pred.description}</p>
                          {pred.factors?.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {pred.factors.slice(0, 3).map((f, i) => (
                                <div key={i} className="text-xs text-slate-500 flex items-center gap-1">
                                  <span>•</span> {f}
                                </div>
                              ))}
                            </div>
                          )}
                        </GlassCard>
                      );
                    })}
                    {/* LOS */}
                    {analytics.predictions.expectedLOS && (
                      <GlassCard>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">🛏</span>
                          <h4 className="text-sm font-semibold text-white">Expected Length of Stay</h4>
                        </div>
                        <div className="text-3xl font-black text-cyan-400 mb-1">
                          {analytics.predictions.expectedLOS.estimatedDays} days
                        </div>
                        <p className="text-xs text-slate-400">
                          Range: {analytics.predictions.expectedLOS.range.min}–{analytics.predictions.expectedLOS.range.max} days
                        </p>
                        {analytics.predictions.expectedLOS.icuLikely && (
                          <div className="mt-2 text-xs text-orange-400">⚠️ ICU admission may be needed</div>
                        )}
                      </GlassCard>
                    )}
                  </div>
                )}

                {/* Prediction Bar Chart */}
                {analytics?.predictions && (
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-white mb-4">📊 Risk Probability Comparison</h3>
                    <ReadmissionBarChart predictions={analytics.predictions} />
                  </GlassCard>
                )}

                {/* Risk Trend */}
                {analytics?.trendData && (
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-white mb-4">📈 12-Month Risk Trend</h3>
                    <TrendChart trendData={analytics.trendData} />
                    <p className="text-xs text-slate-500 mt-2">
                      Projection: <span className="text-cyan-400">{analytics.trendData.projection}</span>
                    </p>
                  </GlassCard>
                )}

                {/* Actionable Insights */}
                {analytics?.actionableInsights?.length > 0 && (
                  <GlassCard>
                    <h3 className="text-sm font-semibold text-white mb-4">💡 Actionable Insights</h3>
                    <div className="space-y-3">
                      {analytics.actionableInsights.map((ins, i) => {
                        const icons = { warning: '⚠️', action: '🎯', info: 'ℹ️', success: '✅' };
                        const colors = {
                          warning: 'border-orange-500/30 bg-orange-500/5',
                          action:  'border-cyan-500/30 bg-cyan-500/5',
                          info:    'border-blue-500/30 bg-blue-500/5',
                          success: 'border-green-500/30 bg-green-500/5',
                        };
                        return (
                          <div key={i} className={`rounded-xl p-4 border ${colors[ins.type] || colors.info}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span>{icons[ins.type] || 'ℹ️'}</span>
                              <span className="text-sm font-semibold text-white">{ins.title}</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-2">{ins.message}</p>
                            <p className="text-xs text-cyan-300">→ {ins.action}</p>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SPECIALISTS TAB ───────────────────────────────────────────────────── */}
        {activeTab === 'specialists' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <GlassCard key={i}>
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-slate-700 rounded w-3/4" />
                      <div className="h-3 bg-slate-800 rounded w-1/2" />
                      <div className="h-8 bg-slate-800 rounded" />
                    </div>
                  </GlassCard>
                ))
              ) : specRecs.length > 0 ? (
                specRecs.map((rec, i) => {
                  const urgencyColors = {
                    emergency: 'text-red-400 bg-red-500/10 border-red-500/30',
                    urgent:    'text-orange-400 bg-orange-500/10 border-orange-500/30',
                    soon:      'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
                    routine:   'text-green-400 bg-green-500/10 border-green-500/30',
                  };
                  return (
                    <GlassCard key={i} className="relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-8 -mt-8" />
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-3xl">👨‍⚕️</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase ${urgencyColors[rec.urgency] || urgencyColors.routine}`}>
                          {rec.urgency}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mb-2">{rec.specialist}</h4>
                      <p className="text-xs text-slate-400 mb-3">{rec.reason}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                            style={{ width: `${rec.confidence || 80}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{rec.confidence || 80}%</span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1">AI Confidence</p>
                    </GlassCard>
                  );
                })
              ) : (
                <GlassCard className="col-span-3 text-center py-8">
                  <p className="text-slate-400">No specialist recommendations generated</p>
                </GlassCard>
              )}
            </div>

            {/* Follow-up Card */}
            {followUp && (
              <GlassCard className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-500/20">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">📅</div>
                  <div>
                    <h3 className="text-base font-bold text-white mb-1">Recommended Follow-up</h3>
                    <p className="text-sm text-slate-300">{followUp.notes}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-cyan-400 font-semibold">📆 {followUp.nextDate}</span>
                      <span className="text-xs text-slate-400">with {followUp.withSpecialist}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Hospital Recommendation CTA */}
            <GlassCard className="text-center py-6">
              <div className="text-4xl mb-3">🏥</div>
              <h3 className="text-base font-bold text-white mb-2">Find the Right Hospital</h3>
              <p className="text-sm text-slate-400 mb-4">Get AI-ranked hospital recommendations based on your specific conditions and location</p>
              <Link
                to="/hospital-recommendation"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-cyan-500/25 transition-shadow"
              >
                🏥 Hospital Recommendation Engine →
              </Link>
            </GlassCard>
          </div>
        )}

        {/* ── TIMELINE TAB ─────────────────────────────────────────────────────── */}
        {activeTab === 'timeline' && (
          <GlassCard className="text-center py-12">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-white mb-2">Interactive Health Timeline</h3>
            <p className="text-slate-400 mb-6">View your complete medical history as an interactive, filterable timeline</p>
            <Link
              to="/health-timeline"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-xl font-bold"
            >
              Open Health Timeline →
            </Link>
          </GlassCard>
        )}

        {/* Disclaimer */}
        <div className="text-center text-xs text-slate-600 pb-4 border-t border-slate-800 pt-4">
          {intelligence?.disclaimer || 'AI-generated insights are for informational purposes only. Always consult a qualified physician.'}
        </div>
      </div>
    </div>
  );
}
