// frontend/src/pages/HospitalRecommendationPage.jsx
// Hospital Recommendation Engine — Phase 5
// Lets users find top-ranked hospitals based on their medical conditions,
// location, and preferences using the weighted scoring engine.

import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import GlassCard from '../components/GlassCard';
import { useAuth } from '../context/AuthContext';
import { getHospitalImage } from '../utils/images';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DISEASE_OPTIONS = [
  { value: 'heart_disease', label: '❤️ Heart Disease' },
  { value: 'diabetes',      label: '🩸 Diabetes' },
  { value: 'kidney_disease',label: '🫘 Kidney Disease' },
  { value: 'stroke',        label: '🧠 Stroke' },
  { value: 'liver_disease', label: '🫀 Liver Disease' },
  { value: 'cancer',        label: '🔴 Cancer' },
  { value: 'hypertension',  label: '💉 Hypertension' },
  { value: 'respiratory',   label: '🫁 Respiratory' },
  { value: 'orthopedic',    label: '🦴 Orthopedic' },
  { value: 'mental_health', label: '🧠 Mental Health' },
  { value: 'pediatric',     label: '👶 Pediatric' },
  { value: 'pregnancy',     label: '🤱 Pregnancy / OB' },
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Bhopal', 'Kochi', 'Coimbatore', 'Vadodara',
];

const EMERGENCY_OPTIONS = [
  { value: 'routine',   label: '🟢 Routine — Scheduled visit' },
  { value: 'urgent',    label: '🟡 Urgent — Within 24–48 hours' },
  { value: 'emergency', label: '🔴 Emergency — Immediate care needed' },
];

const TYPE_LABELS = {
  government: '🏛️ Government',
  private:    '🏥 Private',
  trust:      '🤝 Trust',
  military:   '🎖️ Military',
  ayush:      '🌿 AYUSH',
};

const EMERGENCY_CAP_LABELS = {
  none:          '❌ No Emergency',
  basic:         '🟡 Basic Emergency',
  advanced:      '🟢 Advanced Emergency',
  level2_trauma: '🔵 Level 2 Trauma Centre',
  level1_trauma: '🔴 Level 1 Trauma Centre',
};

// ─────────────────────────────────────────────────────────────────────────────
// SCORE BAR
// ─────────────────────────────────────────────────────────────────────────────
function ScoreBar({ value, color = '#22d3ee' }) {
  return (
    <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
      <div
        className="absolute h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, background: color }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOSPITAL CARD
// ─────────────────────────────────────────────────────────────────────────────
function HospitalCard({ hospital, rank }) {
  const [expanded, setExpanded] = useState(false);

  const typeColor = {
    government: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    private:    'text-purple-400 bg-purple-500/10 border-purple-500/20',
    trust:      'text-green-400 bg-green-500/10 border-green-500/20',
    military:   'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    ayush:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  const scoreColor = hospital.score >= 75 ? '#22c55e' : hospital.score >= 55 ? '#f59e0b' : '#ef4444';

  return (
    <GlassCard className="relative overflow-hidden">
      {/* Rank badge */}
      <div
        className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white"
        style={{ background: rank <= 3 ? `linear-gradient(135deg, ${rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : '#cd7c54'}, ${rank === 1 ? '#d97706' : rank === 2 ? '#64748b' : '#b45309'})` : '#1e293b' }}
      >
        #{rank}
      </div>

      {/* Real Hospital Image Banner — always shown */}
      <div className="w-full h-36 rounded-xl overflow-hidden mb-3 border border-cyan-500/20 relative group">
        <img
          src={hospital.imageUrl || getHospitalImage(hospital)}
          alt={hospital.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
        <div className="absolute bottom-2 left-3 text-[11px] font-semibold text-white flex items-center gap-1.5 drop-shadow">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Verified Medical Center
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center text-xl flex-shrink-0">
          🏥
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-bold text-white text-sm leading-tight">{hospital.name}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {hospital.address?.city}, {hospital.address?.state}
            {hospital.distanceKm && <span className="ml-1 text-cyan-400">· {hospital.distanceKm.toFixed(1)} km</span>}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeColor[hospital.type] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'}`}>
              {TYPE_LABELS[hospital.type] || hospital.type}
            </span>
            {hospital.tier && (
              <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 capitalize">
                {hospital.tier.replace('_', ' ')}
              </span>
            )}
            {(hospital.accreditations || []).map((a) => (
              <span key={a} className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">
                🏆 {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* AI Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-slate-400 font-medium">AI Match Score</span>
          <span className="text-base font-black" style={{ color: scoreColor }}>{hospital.score}/100</span>
        </div>
        <ScoreBar value={hospital.score} color={scoreColor} />
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4">
        {Object.entries(hospital.breakdown || {}).map(([key, val]) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="text-[10px] text-slate-400">{val}</span>
            </div>
            <ScoreBar value={val} color="#334155" />
          </div>
        ))}
      </div>

      {/* Key Facts */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center bg-slate-800/50 rounded-lg p-2">
          <div className="text-xs font-bold text-white">{hospital.ratings?.overall?.toFixed(1) || 'N/A'}/5</div>
          <div className="text-[10px] text-slate-500">Rating ({hospital.ratings?.reviewCount || 0} reviews)</div>
        </div>
        <div className="text-center bg-slate-800/50 rounded-lg p-2">
          <div className="text-xs font-bold text-white">{hospital.totalBeds || '—'}</div>
          <div className="text-[10px] text-slate-500">Total Beds</div>
        </div>
      </div>

      {/* Emergency + 24/7 */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-[10px] text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-1">
          {EMERGENCY_CAP_LABELS[hospital.emergencyCapability] || hospital.emergencyCapability}
        </span>
        {hospital.is24x7 && (
          <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-1">
            ⏰ 24×7
          </span>
        )}
        {hospital.acceptsInsurance && (
          <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-1">
            💳 Insurance
          </span>
        )}
      </div>

      {/* Specializations */}
      {(hospital.specializations || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {hospital.specializations.slice(0, expanded ? undefined : 3).map((s) => (
            <span key={s} className="text-[10px] bg-cyan-500/5 text-cyan-400 border border-cyan-500/15 rounded-md px-2 py-0.5">
              {s}
            </span>
          ))}
          {!expanded && hospital.specializations.length > 3 && (
            <span className="text-[10px] text-slate-500">+{hospital.specializations.length - 3} more</span>
          )}
        </div>
      )}

      {/* Expand: AI Explanation */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-xs text-cyan-400 hover:text-cyan-300 py-2 border-t border-slate-700/50 mt-1"
      >
        {expanded ? '▲ Show less' : '▼ Show AI explanation'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {(hospital.explanation || []).map((e, i) => (
            <div key={i} className="text-[11px] text-slate-300 flex items-start gap-2">
              <span className="text-sm">{e.split(' ')[0]}</span>
              <span>{e.split(' ').slice(1).join(' ')}</span>
            </div>
          ))}
          {hospital.phone && (
            <div className="pt-2 border-t border-slate-800">
              <a href={`tel:${hospital.phone}`} className="text-xs text-cyan-400 hover:underline">
                📞 {hospital.phone}
              </a>
            </div>
          )}
          {hospital.website && (
            <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline block">
              🌐 Visit Website
            </a>
          )}
        </div>
      )}
    </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECIALIST CARD
// ─────────────────────────────────────────────────────────────────────────────
function SpecialistCard({ rec, index }) {
  const urgencyColors = {
    emergency: 'bg-red-500/10 border-red-500/30 text-red-400',
    urgent:    'bg-orange-500/10 border-orange-500/30 text-orange-400',
    soon:      'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    routine:   'bg-green-500/10 border-green-500/30 text-green-400',
  };

  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center text-xl flex-shrink-0">
          👨‍⚕️
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-white text-sm">{rec.specialist}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{rec.reason}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${urgencyColors[rec.urgency] || urgencyColors.routine}`}>
              {rec.urgency}
            </span>
            <div className="flex items-center gap-1.5 flex-1">
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                  style={{ width: `${rec.confidence || 80}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">{rec.confidence || 80}%</span>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function HospitalRecommendationPage() {
  const { user } = useAuth(); // eslint-disable-line no-unused-vars

  const [form, setForm] = useState({
    diseases:       [],
    city:           '',
    emergencyLevel: 'routine',
    insurance:      '',
    lat:            '',
    lon:            '',
  });

  const [results,  setResults]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [activeTab, setActiveTab] = useState('overall');

  const handleDiseasesChange = (val) => {
    setForm((f) => ({
      ...f,
      diseases: f.diseases.includes(val)
        ? f.diseases.filter((d) => d !== val)
        : [...f.diseases, val],
    }));
  };

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/hospital-recommendation/recommend', {
        ...form,
        lat: form.lat ? parseFloat(form.lat) : undefined,
        lon: form.lon ? parseFloat(form.lon) : undefined,
      });
      setResults(res.data);
      setActiveTab('overall');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form]);

  const tabs = [
    { id: 'overall',     label: '🏆 Top Overall',    count: results?.recommendations?.topOverall?.length },
    { id: 'government',  label: '🏛️ Government',     count: results?.recommendations?.government?.length },
    { id: 'private',     label: '🏥 Private',         count: results?.recommendations?.private?.length },
    { id: 'emergency',   label: '🚑 Emergency',       count: results?.recommendations?.emergency?.length },
    { id: 'specialists', label: '👨‍⚕️ Specialists',   count: results?.specialistRecommendation?.length },
  ];

  const currentHospitals = results?.recommendations?.[
    activeTab === 'overall'    ? 'topOverall' :
    activeTab === 'government' ? 'government'  :
    activeTab === 'private'    ? 'private'     :
    activeTab === 'emergency'  ? 'emergency'   : null
  ];

  return (
    <div className="min-h-screen bg-medichain-bg-dark text-white">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-slate-900 to-cyan-900/20" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">🏥</div>
            <div>
              <span className="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full px-3 py-0.5 uppercase tracking-widest">
                AI-Powered
              </span>
              <h1 className="text-3xl font-black text-white">Hospital Recommendation Engine</h1>
              <p className="text-slate-400 text-sm">Weighted multi-factor scoring across {results?.summary?.totalHospitalsEvaluated || '50+'} hospitals</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Search Form ───────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <GlassCard>
              <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                🔍 Find Hospitals
              </h2>

              <form onSubmit={handleSearch} className="space-y-4">
                {/* Conditions */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2 block">
                    Medical Conditions
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {DISEASE_OPTIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => handleDiseasesChange(d.value)}
                        className={`text-[11px] px-2 py-1.5 rounded-lg border text-left transition-all ${
                          form.diseases.includes(d.value)
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2 block">
                    City
                  </label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="">All cities</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Emergency Level */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2 block">
                    Urgency Level
                  </label>
                  <div className="space-y-1.5">
                    {EMERGENCY_OPTIONS.map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        form.emergencyLevel === opt.value
                          ? 'bg-cyan-500/10 border-cyan-500/30'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}>
                        <input
                          type="radio"
                          name="emergencyLevel"
                          value={opt.value}
                          checked={form.emergencyLevel === opt.value}
                          onChange={(e) => setForm((f) => ({ ...f, emergencyLevel: e.target.value }))}
                          className="accent-cyan-500"
                        />
                        <span className="text-xs text-slate-300">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Insurance */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide mb-2 block">
                    Insurance Provider (optional)
                  </label>
                  <input
                    type="text"
                    value={form.insurance}
                    onChange={(e) => setForm((f) => ({ ...f, insurance: e.target.value }))}
                    placeholder="e.g. Star Health"
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500/50 placeholder:text-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-cyan-500/25 transition-shadow flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scoring hospitals…
                    </>
                  ) : '🏥 Get Recommendations'}
                </button>
              </form>

              {/* Scoring breakdown legend */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2">Scoring Algorithm</p>
                {[
                  { label: 'Specialization Match', pct: '30%' },
                  { label: 'Patient Rating',         pct: '20%' },
                  { label: 'Emergency Capability',   pct: '15%' },
                  { label: 'Distance',               pct: '15%' },
                  { label: 'Success Rate',           pct: '10%' },
                  { label: 'Facilities',             pct: '10%' },
                ].map(({ label, pct }) => (
                  <div key={label} className="flex justify-between items-center py-0.5">
                    <span className="text-[10px] text-slate-500">{label}</span>
                    <span className="text-[10px] text-cyan-400 font-bold">{pct}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* ── Results ───────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            {!results && !loading && (
              <GlassCard className="text-center py-12">
                <div className="text-5xl mb-4">🏥</div>
                <h3 className="text-lg font-bold text-white mb-2">Find Your Best Hospital Match</h3>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">
                  Select your medical condition and city, then click "Get Recommendations" to get AI-ranked hospitals.
                </p>
              </GlassCard>
            )}

            {loading && (
              <GlassCard className="py-12 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Scoring hospitals…</p>
                  <p className="text-xs text-slate-400 mt-1">Analyzing specializations, ratings, distance, and capabilities</p>
                </div>
              </GlassCard>
            )}

            {results && !loading && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <GlassCard className="text-center py-3">
                    <div className="text-xl font-black text-cyan-400">{results.summary?.totalHospitalsEvaluated}</div>
                    <div className="text-[10px] text-slate-500">Hospitals Scored</div>
                  </GlassCard>
                  <GlassCard className="text-center py-3">
                    <div className="text-xl font-black text-green-400">{results.summary?.topScore}</div>
                    <div className="text-[10px] text-slate-500">Top Match Score</div>
                  </GlassCard>
                  <GlassCard className="text-center py-3">
                    <div className="text-xl font-black text-purple-400">{results.specialistRecommendation?.length || 0}</div>
                    <div className="text-[10px] text-slate-500">Specialists Recommended</div>
                  </GlassCard>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 border border-slate-700/50 overflow-x-auto">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        activeTab === t.id
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                      {t.count > 0 && (
                        <span className="bg-slate-700 text-slate-300 rounded-full text-[9px] px-1.5 py-0.5">
                          {t.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Hospital Cards */}
                {activeTab !== 'specialists' && (
                  <div className="space-y-4">
                    {(currentHospitals || []).length > 0 ? (
                      currentHospitals.map((h, i) => (
                        <HospitalCard key={h._id || i} hospital={h} rank={i + 1} />
                      ))
                    ) : (
                      <GlassCard className="text-center py-8">
                        <p className="text-slate-400">No hospitals found in this category for your filters</p>
                      </GlassCard>
                    )}
                  </div>
                )}

                {/* Specialist Cards */}
                {activeTab === 'specialists' && (
                  <div className="space-y-3">
                    {(results.specialistRecommendation || []).length > 0 ? (
                      results.specialistRecommendation.map((rec, i) => (
                        <SpecialistCard key={i} rec={rec} index={i} />
                      ))
                    ) : (
                      <GlassCard className="text-center py-8">
                        <p className="text-slate-400">No specialist recommendations generated</p>
                      </GlassCard>
                    )}
                    <Link
                      to="/ai-assistant"
                      className="block text-center text-xs text-cyan-400 hover:text-cyan-300 mt-4"
                    >
                      Ask the AI Assistant to explain these specializations →
                    </Link>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-[10px] text-slate-600 text-center pt-2">
                  {results.disclaimer}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
