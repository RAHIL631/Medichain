// frontend/src/pages/HealthTimelinePage.jsx
// Health Timeline — Phase 8
// Unified, filterable health timeline aggregating all medical events.

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../components/GlassCard';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_FILTERS = [
  { value: '',                      label: 'All Events',          icon: '📋' },
  { value: 'medical_record',        label: 'Medical Records',      icon: '📁' },
  { value: 'prescription_analysis', label: 'Prescriptions',        icon: '💊' },
  { value: 'health_risk_assessment',label: 'Risk Assessments',     icon: '🧬' },
  { value: 'ensemble_prediction',   label: 'AI Predictions',       icon: '🤖' },
  { value: 'adherence_log',         label: 'Medication Logs',      icon: '⏰' },
];

const SEVERITY_COLORS = {
  high:   { bg: 'bg-red-500/15 border-red-500/30',    text: 'text-red-400',    dot: 'bg-red-500'    },
  medium: { bg: 'bg-orange-500/15 border-orange-500/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  low:    { bg: 'bg-green-500/15 border-green-500/30', text: 'text-green-400',  dot: 'bg-green-500'  },
  info:   { bg: 'bg-blue-500/15 border-blue-500/30',  text: 'text-blue-400',   dot: 'bg-blue-500'   },
};

function getSeverityStyle(severity) {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS.info;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE EVENT CARD
// ─────────────────────────────────────────────────────────────────────────────
function TimelineEvent({ event, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const s = getSeverityStyle(event.severity);

  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(event.date));

  return (
    <div className="flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        <div
          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 shadow-lg ${s.dot}`}
          style={{ boxShadow: `0 0 8px ${s.dot.includes('red') ? '#ef4444' : s.dot.includes('orange') ? '#f97316' : s.dot.includes('green') ? '#22c55e' : '#3b82f6'}60` }}
        />
        {!isLast && <div className="flex-1 w-px bg-slate-700/50 mt-1 min-h-[40px]" />}
      </div>

      {/* Content */}
      <div className={`flex-1 mb-6 rounded-xl border p-4 transition-all hover:border-slate-600 ${s.bg} cursor-pointer`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg flex-shrink-0">{event.icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white truncate">{event.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{event.description}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-slate-500">{formattedDate}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 inline-block uppercase ${s.bg} ${s.text}`}>
              {event.severity}
            </span>
          </div>
        </div>

        {/* Blockchain badge */}
        {event.blockchain?.confirmed && (
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5">
              ⛓ Blockchain Verified
            </span>
          </div>
        )}

        {/* Expanded metadata */}
        {expanded && event.metadata && (
          <div className="mt-3 pt-3 border-t border-slate-700/30">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(event.metadata).slice(0, 8).map(([key, val]) => {
                if (!val || key === '_id' || typeof val === 'object') return null;
                return (
                  <div key={key}>
                    <span className="text-[10px] text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                    <span className="text-[10px] text-slate-300">{String(val)}</span>
                  </div>
                );
              })}
            </div>
            {event.blockchain?.txHash && (
              <div className="mt-2">
                <span className="text-[10px] text-slate-500">Tx Hash: </span>
                <span className="text-[10px] text-cyan-400 font-mono break-all">
                  {event.blockchain.txHash.slice(0, 20)}…
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function HealthTimelinePage() {
  const { user } = useAuth(); // eslint-disable-line no-unused-vars

  const [events,   setEvents]   = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [category, setCategory] = useState('');
  const [from,     setFrom]     = useState('');
  const [to,       setTo]       = useState('');
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const LIMIT = 20;

  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (from)     params.append('from', from);
      if (to)       params.append('to', to);
      params.append('page',  page);
      params.append('limit', LIMIT);

      const res = await api.get(`/timeline?${params.toString()}`);
      setEvents(res.data.events || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
      setSummary(res.data.summary);
    } catch (err) {
      if (err.response?.status === 404) {
        setEvents([]);
        setTotal(0);
      } else {
        setError(err.response?.data?.error || 'Failed to load timeline');
      }
    } finally {
      setLoading(false);
    }
  }, [category, from, to, page]);

  useEffect(() => { fetchTimeline(); }, [fetchTimeline]);

  const handleFilterChange = (cat) => {
    setCategory(cat);
    setPage(1);
  };

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const dateKey = new Date(event.date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(event);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-medichain-bg-dark text-white">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-cyan-900/30 via-slate-900 to-green-900/20 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📅</span>
            <div>
              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-3 py-0.5 uppercase tracking-widest">
                Health Timeline
              </span>
              <h1 className="text-3xl font-black text-white">Medical History</h1>
              <p className="text-slate-400 text-sm">All your health events in one unified timeline</p>
            </div>
          </div>

          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2.5">
                <div className="text-xl font-black text-cyan-400">{summary.totalEvents}</div>
                <div className="text-[10px] text-slate-500">Total Events</div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2.5">
                <div className="text-xl font-black text-green-400">{summary.blockchainConfirmed}</div>
                <div className="text-[10px] text-slate-500">Blockchain Verified</div>
              </div>
              {Object.entries(summary.categoryCounts || {}).slice(0, 2).map(([cat, count]) => (
                <div key={cat} className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2.5">
                  <div className="text-xl font-black text-purple-400">{count}</div>
                  <div className="text-[10px] text-slate-500 capitalize truncate">{cat.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6">
        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <div className="space-y-4 mb-6">
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleFilterChange(f.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium whitespace-nowrap transition-all ${
                  category === f.value
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-slate-400 whitespace-nowrap">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label className="text-xs text-slate-400 whitespace-nowrap">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            {(from || to || category) && (
              <button
                onClick={() => { setCategory(''); setFrom(''); setTo(''); setPage(1); }}
                className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-700 hover:border-slate-500"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-4">
            ⚠️ {error}
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading timeline…</p>
            </div>
          </div>
        )}

        {/* ── Empty State ──────────────────────────────────────────────────── */}
        {!loading && events.length === 0 && !error && (
          <GlassCard className="text-center py-16">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-lg font-bold text-white mb-2">No Events Found</h3>
            <p className="text-slate-400 text-sm mb-4">
              {category || from || to
                ? 'No events match your current filters. Try adjusting them.'
                : 'Your health timeline is empty. Start by uploading a medical record or prescription.'}
            </p>
            <Link
              to="/records"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold text-sm"
            >
              📁 Upload Medical Records →
            </Link>
          </GlassCard>
        )}

        {/* ── Timeline Events ───────────────────────────────────────────────── */}
        {!loading && events.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-slate-700/50" />
                  <span className="text-xs font-semibold text-slate-400 bg-slate-800/50 border border-slate-700/50 rounded-full px-3 py-1">
                    📅 {date}
                  </span>
                  <div className="h-px flex-1 bg-slate-700/50" />
                </div>

                {/* Events for this date */}
                <div>
                  {dateEvents.map((event, i) => (
                    <TimelineEvent
                      key={event.id}
                      event={event}
                      isLast={i === dateEvents.length - 1 && date === Object.keys(groupedEvents)[Object.keys(groupedEvents).length - 1]}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-xs font-medium text-slate-400 border border-slate-700 rounded-lg disabled:opacity-40 hover:border-slate-600 transition-colors"
                >
                  ← Previous
                </button>
                <div className="text-xs text-slate-400">
                  Page {page} of {totalPages} · {total} total events
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-xs font-medium text-slate-400 border border-slate-700 rounded-lg disabled:opacity-40 hover:border-slate-600 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/enterprise-dashboard', icon: '🧠', label: 'AI Dashboard' },
            { to: '/records',              icon: '📁', label: 'Records' },
            { to: '/ai-assistant',         icon: '🤖', label: 'AI Assistant' },
            { to: '/predictive-analytics', icon: '📈', label: 'Predictions' },
          ].map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1.5 p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:border-slate-600 transition-colors text-center"
            >
              <span className="text-xl">{icon}</span>
              <span className="text-[11px] text-slate-400">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
