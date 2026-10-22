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
function ScoreBar({ value, color = '#16866a' }) {
  return (
    <div className="relative h-2 bg-hc-surface rounded-full overflow-hidden">
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
    government: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    private:    'text-orange-400 bg-orange-500/10 border-orange-500/20',
    trust:      'text-green-400 bg-green-500/10 border-green-500/20',
    military:   'text-hc-warning bg-yellow-500/10 border-yellow-500/20',
    ayush:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  const scoreColor = hospital.score >= 75 ? '#16866a' : hospital.score >= 55 ? '#ebcb82' : '#b44736';

  return (
    <GlassCard className="relative overflow-hidden">
      {/* Rank badge */}
      <div
        className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-hc-text"
        style={{ background: rank <= 3 ? `linear-gradient(135deg, ${rank === 1 ? '#ebcb82' : rank === 2 ? '#68766e' : '#d97860'}, ${rank === 1 ? '#805b12' : rank === 2 ? '#68766e' : '#805b12'})` : '#ffffff' }}
      >
        #{rank}
      </div>

      {/* Real Hospital Image Banner — always shown */}
      <div className="w-full h-36 rounded-xl overflow-hidden mb-3 border border-emerald-500/20 relative group">
        <img
          src={hospital.imageUrl || getHospitalImage(hospital)}
          alt={hospital.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-hc-surface/90 via-hc-surface/20 to-transparent" />
        <div className="absolute bottom-2 left-3 text-[11px] font-semibold text-hc-text flex items-center gap-1.5 drop-shadow">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Verified Medical Center
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/20 border border-emerald-500/20 flex items-center justify-center text-xl flex-shrink-0">
          🏥
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-bold text-hc-text text-sm leading-tight">{hospital.name}</h3>
          <p className="text-[11px] text-hc-text-light mt-0.5">
            {hospital.address?.city}, {hospital.address?.state}
            {hospital.distanceKm && <span className="ml-1 text-emerald-400">· {hospital.distanceKm.toFixed(1)} km</span>}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${typeColor[hospital.type] || 'text-hc-text-muted bg-hc-bg-alt border-hc-border'}`}>
              {TYPE_LABELS[hospital.type] || hospital.type}
            </span>
            {hospital.tier && (
              <span className="text-[10px] text-hc-text-light bg-hc-surface border border-hc-border rounded-full px-2 py-0.5 capitalize">
                {hospital.tier.replace('_', ' ')}
              </span>
            )}
            {(hospital.accreditations || []).map((a) => (
              <span key={a} className="text-[10px] text-hc-warning bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">
                🏆 {a}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* AI Score */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-hc-text-light font-medium">AI Match Score</span>
          <span className="text-base font-black" style={{ color: scoreColor }}>{hospital.score}/100</span>
        </div>
        <ScoreBar value={hospital.score} color={scoreColor} />
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-4">
        {Object.entries(hospital.breakdown || {}).map(([key, val]) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] text-hc-text-muted capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <span className="text-[10px] text-hc-text-light">{val}</span>
            </div>
            <ScoreBar value={val} color="#e9f4ec" />
          </div>
        ))}
      </div>

      {/* Key Facts */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center bg-hc-surface/50 rounded-lg p-2">
          <div className="text-xs font-bold text-hc-text">{hospital.ratings?.overall?.toFixed(1) || 'N/A'}/5</div>
          <div className="text-[10px] text-hc-text-muted">Rating ({hospital.ratings?.reviewCount || 0} reviews)</div>
        </div>
        <div className="text-center bg-hc-surface/50 rounded-lg p-2">
          <div className="text-xs font-bold text-hc-text">{hospital.totalBeds || '—'}</div>
          <div className="text-[10px] text-hc-text-muted">Total Beds</div>
        </div>
      </div>

      {/* Emergency + 24/7 */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-[10px] text-hc-text-muted bg-hc-surface/50 border border-hc-border/50 rounded-lg px-2 py-1">
          {EMERGENCY_CAP_LABELS[hospital.emergencyCapability] || hospital.emergencyCapability}
        </span>
        {hospital.is24x7 && (
          <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-1">
            ⏰ 24×7
          </span>
        )}
        {hospital.acceptsInsurance && (
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1">
            💳 Insurance
          </span>
        )}
      </div>

      {/* Specializations */}
      {(hospital.specializations || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {hospital.specializations.slice(0, expanded ? undefined : 3).map((s) => (
            <span key={s} className="text-[10px] bg-emerald-500/5 text-emerald-400 border border-emerald-500/15 rounded-md px-2 py-0.5">
              {s}
            </span>
          ))}
          {!expanded && hospital.specializations.length > 3 && (
            <span className="text-[10px] text-hc-text-muted">+{hospital.specializations.length - 3} more</span>
          )}
        </div>
      )}

      {/* Expand: AI Explanation */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-xs text-emerald-400 hover:text-emerald-300 py-2 border-t border-hc-border/50 mt-1"
      >
        {expanded ? '▲ Show less' : '▼ Show AI explanation'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {(hospital.explanation || []).map((e, i) => (
            <div key={i} className="text-[11px] text-hc-text-muted flex items-start gap-2">
              <span className="text-sm">{e.split(' ')[0]}</span>
              <span>{e.split(' ').slice(1).join(' ')}</span>
            </div>
          ))}
          {hospital.phone && (
            <div className="pt-2 border-t border-hc-border">
              <a href={`tel:${hospital.phone}`} className="text-xs text-emerald-400 hover:underline">
                📞 {hospital.phone}
              </a>
            </div>
          )}
          {hospital.website && (
            <a href={hospital.website} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline block">
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
    emergency: 'bg-red-500/10 border-red-500/30 text-hc-danger',
    urgent:    'bg-orange-500/10 border-orange-500/30 text-orange-400',
    soon:      'bg-yellow-500/10 border-yellow-500/30 text-hc-warning',
    routine:   'bg-green-500/10 border-green-500/30 text-green-400',
  };

  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-emerald-500/20 border border-orange-500/20 flex items-center justify-center text-xl flex-shrink-0">
          👨‍⚕️
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-hc-text text-sm">{rec.specialist}</h4>
          <p className="text-xs text-hc-text-light mt-0.5">{rec.reason}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${urgencyColors[rec.urgency] || urgencyColors.routine}`}>
              {rec.urgency}
            </span>
            <div className="flex items-center gap-1.5 flex-1">
              <div className="flex-1 h-1.5 bg-hc-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full"
                  style={{ width: `${rec.confidence || 80}%` }}
                />
              </div>
              <span className="text-[10px] text-hc-text-light">{rec.confidence || 80}%</span>
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
    <div className="min-h-screen bg-medichain-bg-ivory text-hc-text">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-hc-emerald-soft via-white to-hc-emerald-soft" />
        <div className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-3xl">🏥</div>
            <div>
              <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-3 py-0.5 uppercase tracking-widest">
                AI-Powered
              </span>
              <h1 className="text-3xl font-black text-hc-text">Hospital Recommendation Engine</h1>
              <p className="text-hc-text-light text-sm">Weighted multi-factor scoring across {results?.summary?.totalHospitalsEvaluated || '50+'} hospitals</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Search Form ───────────────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <GlassCard>
              <h2 className="text-base font-bold text-hc-text mb-4 flex items-center gap-2">
                🔍 Find Hospitals
              </h2>

              <form onSubmit={handleSearch} className="space-y-4">
                {/* Conditions */}
                <div>
                  <label className="text-xs font-semibold text-hc-text-muted uppercase tracking-wide mb-2 block">
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
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-hc-surface/50 border-hc-border text-hc-text-light hover:border-hc-border'
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="text-xs font-semibold text-hc-text-muted uppercase tracking-wide mb-2 block">
                    City
                  </label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full bg-hc-surface border border-hc-border text-hc-text text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">All cities</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Emergency Level */}
                <div>
                  <label className="text-xs font-semibold text-hc-text-muted uppercase tracking-wide mb-2 block">
                    Urgency Level
                  </label>
                  <div className="space-y-1.5">
                    {EMERGENCY_OPTIONS.map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        form.emergencyLevel === opt.value
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'border-hc-border hover:border-hc-border'
                      }`}>
                        <input
                          type="radio"
                          name="emergencyLevel"
                          value={opt.value}
                          checked={form.emergencyLevel === opt.value}
                          onChange={(e) => setForm((f) => ({ ...f, emergencyLevel: e.target.value }))}
                          className="accent-emerald-dark-500"
                        />
                        <span className="text-xs text-hc-text-muted">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Insurance */}
                <div>
                  <label className="text-xs font-semibold text-hc-text-muted uppercase tracking-wide mb-2 block">
                    Insurance Provider (optional)
                  </label>
                  <input
                    type="text"
                    value={form.insurance}
                    onChange={(e) => setForm((f) => ({ ...f, insurance: e.target.value }))}
                    placeholder="e.g. Star Health"
                    className="w-full bg-hc-surface border border-hc-border text-hc-text text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500/50 placeholder:text-hc-text-muted"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-hc-text font-bold rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/25 transition-shadow flex items-center justify-center gap-2"
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
              <div className="mt-4 pt-4 border-t border-hc-border">
                <p className="text-[10px] text-hc-text-muted font-semibold uppercase tracking-wide mb-2">Scoring Algorithm</p>
                {[
                  { label: 'Specialization Match', pct: '30%' },
                  { label: 'Patient Rating',         pct: '20%' },
                  { label: 'Emergency Capability',   pct: '15%' },
                  { label: 'Distance',               pct: '15%' },
                  { label: 'Success Rate',           pct: '10%' },
                  { label: 'Facilities',             pct: '10%' },
                ].map(({ label, pct }) => (
                  <div key={label} className="flex justify-between items-center py-0.5">
                    <span className="text-[10px] text-hc-text-muted">{label}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">{pct}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* ── Results ───────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-hc-danger text-sm">
                ⚠️ {error}
              </div>
            )}

            {!results && !loading && (
              <GlassCard className="text-center py-12">
                <div className="text-5xl mb-4">🏥</div>
                <h3 className="text-lg font-bold text-hc-text mb-2">Find Your Best Hospital Match</h3>
                <p className="text-hc-text-light text-sm max-w-xs mx-auto">
                  Select your medical condition and city, then click "Get Recommendations" to get AI-ranked hospitals.
                </p>
              </GlassCard>
            )}

            {loading && (
              <GlassCard className="py-12 flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-hc-text">Scoring hospitals…</p>
                  <p className="text-xs text-hc-text-light mt-1">Analyzing specializations, ratings, distance, and capabilities</p>
                </div>
              </GlassCard>
            )}

            {results && !loading && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <GlassCard className="text-center py-3">
                    <div className="text-xl font-black text-emerald-400">{results.summary?.totalHospitalsEvaluated}</div>
                    <div className="text-[10px] text-hc-text-muted">Hospitals Scored</div>
                  </GlassCard>
                  <GlassCard className="text-center py-3">
                    <div className="text-xl font-black text-green-400">{results.summary?.topScore}</div>
                    <div className="text-[10px] text-hc-text-muted">Top Match Score</div>
                  </GlassCard>
                  <GlassCard className="text-center py-3">
                    <div className="text-xl font-black text-orange-400">{results.specialistRecommendation?.length || 0}</div>
                    <div className="text-[10px] text-hc-text-muted">Specialists Recommended</div>
                  </GlassCard>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-hc-surface/50 rounded-xl p-1 border border-hc-border/50 overflow-x-auto">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        activeTab === t.id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-hc-text-light hover:text-hc-text'
                      }`}
                    >
                      {t.label}
                      {t.count > 0 && (
                        <span className="bg-hc-emerald-soft text-hc-text-muted rounded-full text-[9px] px-1.5 py-0.5">
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
                        <p className="text-hc-text-light">No hospitals found in this category for your filters</p>
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
                        <p className="text-hc-text-light">No specialist recommendations generated</p>
                      </GlassCard>
                    )}
                    <Link
                      to="/ai-assistant"
                      className="block text-center text-xs text-emerald-400 hover:text-emerald-300 mt-4"
                    >
                      Ask the AI Assistant to explain these specializations →
                    </Link>
                  </div>
                )}

                {/* Disclaimer */}
                <p className="text-[10px] text-hc-text-muted text-center pt-2">
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
