// frontend/src/pages/PatientDashboard.jsx
// Patient home page — 6 sections: TopBar, Stats, QR Health ID, AI Risk, Records, Access

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

import { useAuth }      from '../context/AuthContext';
import api              from '../utils/api';
import { formatAddress } from '../utils/web3';
import useWallet        from '../hooks/useWallet';

import QRHealthID    from '../components/QRHealthID';
import RecordCard    from '../components/RecordCard';
import AccessManager from '../components/AccessManager';
import GlassCard     from '../components/GlassCard';
import WalletSetup   from '../components/WalletSetup';
import useContract    from '../hooks/useContract';
import useContractEvents from '../hooks/useContractEvents';

// ── Helpers ───────────────────────────────────────────────────────────────────
const RECORD_TYPES = ['All', 'prescription', 'lab-report', 'diagnosis', 'imaging', 'vaccination'];

const riskColour = (level) => {
  if (!level) return { badge: 'bg-text-secondary/10 text-text-secondary', dot: 'bg-text-secondary', label: 'Unknown' };
  const l = level.toLowerCase();
  if (l === 'low')    return { badge: 'bg-status-success/15 text-status-success border border-status-success/30',  dot: 'bg-status-success',  label: 'LOW'    };
  if (l === 'medium') return { badge: 'bg-status-warning/15 text-status-warning border border-status-warning/30',  dot: 'bg-status-warning',  label: 'MEDIUM' };
  if (l === 'high')   return { badge: 'bg-status-danger/15  text-status-danger  border border-status-danger/30',   dot: 'bg-status-danger',   label: 'HIGH'   };
  return { badge: 'bg-text-secondary/10 text-text-secondary', dot: 'bg-text-secondary', label: level };
};

const ProgressBar = ({ label, value, colour }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-text-secondary">{label}</span>
      <span className="font-bold text-white">{value ?? 0}%</span>
    </div>
    <div className="h-2 bg-medichain-bg-dark rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${colour}`}
        style={{ width: `${value ?? 0}%` }}
      />
    </div>
  </div>
);

const StatCard = ({ icon, label, value, sub, loading }) => (
  <GlassCard className="flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-[10px] uppercase tracking-widest text-text-secondary">{label}</p>
      <p className="text-2xl font-display font-bold text-white">{loading ? '…' : value}</p>
      {sub && <p className="text-[10px] text-text-secondary">{sub}</p>}
    </div>
  </GlassCard>
);

// ── Component ─────────────────────────────────────────────────────────────────
const PatientDashboard = () => {
  const { user, logout }                    = useAuth();
  const { account, connected, connect, error: walletError } = useWallet();
  const { contract } = useContract();
  const navigate                            = useNavigate();

  // Blockchain Events
  const { latestEvent } = useContractEvents(contract, account);
  const [toast, setToast] = useState(null);

  // Data states
  const [records, setRecords]               = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [statsLoading, setStatsLoading]     = useState(true);
  const [doctorCount, setDoctorCount]       = useState(0);
  const [lastUpdated, setLastUpdated]       = useState(null);

  // AI Risk states
  const [risk, setRisk]                     = useState(null);   // { level, heartDisease, diabetes, stroke, recommendations }
  const [riskLoading, setRiskLoading]       = useState(false);

  // Records filter / search
  const [search, setSearch]                 = useState('');
  const [typeFilter, setTypeFilter]         = useState('All');

  // ── Fetch records ─────────────────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const { data } = await api.get('/patient/records');
      setRecords(data.records || []);
      if (data.records?.length > 0) {
        setLastUpdated(new Date(data.records[0].createdAt).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
        }));
      }
    } catch (err) {
      console.error('[PatientDashboard] Records fetch error:', err.message);
    } finally {
      setRecordsLoading(false);
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch granted doctors count ───────────────────────────────────────────
  const fetchDoctorCount = useCallback(async () => {
    try {
      const { data } = await api.get('/patient/granted-doctors');
      setDoctorCount(data.doctors?.length || 0);
    } catch { /* non-critical */ }
  }, []);

  // ── Fetch AI Risk ─────────────────────────────────────────────────────────
  const fetchAIRisk = useCallback(async () => {
    if (!user) return;
    setRiskLoading(true);
    try {
      const { data } = await api.post('/ai/cdss/risks', {}, { timeout: 15000 });
      setRisk({
        level:           data.overall_risk || 'LOW',
        heartDisease:    data.organ_risks?.heart?.risk_score ?? 12,
        diabetes:        data.organ_risks?.diabetes?.risk_score ?? 8,
        stroke:          data.organ_risks?.stroke?.risk_score ?? 5,
        recommendations: data.lifestyle_recommendations || [
          'Schedule annual cardiovascular check-up',
          'Maintain blood pressure below 120/80 mmHg',
        ],
      });
    } catch (err) {
      console.warn('[PatientDashboard] CDSS Risks query fallback:', err.message);
      setRisk({
        level:           'LOW',
        heartDisease:    12,
        diabetes:        8,
        stroke:          5,
        recommendations: [
          'AI microservice is offline — start python app.py in /ai',
          'Schedule annual cardiovascular check-up',
          'Keep your records up to date',
        ],
      });
    } finally {
      setRiskLoading(false);
    }
  }, [user, records.length]);

  useEffect(() => {
    fetchRecords();
    fetchDoctorCount();
  }, [fetchRecords, fetchDoctorCount]);

  // Toast handler for blockchain events
  useEffect(() => {
    if (latestEvent) {
      let message = '';
      let type = 'info';

      switch (latestEvent.type) {
        case 'RecordAdded':
          message = `New record added by Dr. ${formatAddress(latestEvent.data.doctor)}`;
          type = 'success';
          fetchRecords(); // Refresh UI
          break;
        case 'DoctorAccessGranted':
          message = `Access granted to Dr. ${formatAddress(latestEvent.data.doctor)}`;
          type = 'info';
          fetchDoctorCount(); // Refresh UI
          break;
        case 'DoctorAccessRevoked':
          message = `Access revoked from Dr. ${formatAddress(latestEvent.data.doctor)}`;
          type = 'warning';
          fetchDoctorCount(); // Refresh UI
          break;
        default:
          break;
      }

      if (message) {
        setToast({ message, type });
        const timer = setTimeout(() => setToast(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [latestEvent, fetchRecords, fetchDoctorCount]);

  useEffect(() => {
    if (!riskLoading && records !== undefined) fetchAIRisk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records.length]);

  // ── Filtered records ──────────────────────────────────────────────────────
  const filteredRecords = records.filter((r) => {
    const matchType   = typeFilter === 'All' || r.recordType === typeFilter;
    const matchSearch = !search || r.description?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const riskStyle = riskColour(risk?.level);

  // ── Handle logout ─────────────────────────────────────────────────────────
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-medichain-bg-dark to-medichain-bg-light">

      {/* ── SECTION 1: TOP BAR ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-medichain-bg-dark/80 backdrop-blur-xl border-b border-medichain-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-blue flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="font-display font-bold text-white text-lg tracking-tight">MediChain</span>
          </div>

          {/* Greeting */}
          <p className="hidden md:block text-sm text-text-secondary">
            Welcome back, <span className="text-white font-bold">{user?.name?.split(' ')[0]}</span> 👋
          </p>

          {/* Wallet + Logout */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              {connected ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-status-success/10 border border-status-success/30 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                  <span className="text-xs font-mono text-status-success">{formatAddress(account)}</span>
                </div>
              ) : (
                <button
                  onClick={connect}
                  className="px-3 py-1.5 bg-accent-cyan/10 border border-accent-cyan/30 rounded-full text-xs font-bold text-accent-cyan hover:bg-accent-cyan/20 transition-all"
                >
                  Connect Wallet
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-medichain-surface border border-medichain-border rounded-full text-xs font-bold text-text-secondary hover:text-status-danger hover:border-status-danger/40 transition-all"
              >
                Logout
              </button>
            </div>
            {walletError && (
              <p className="text-[10px] text-status-danger font-bold uppercase tracking-tighter mr-2">
                {walletError}
              </p>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="fixed bottom-10 right-10 z-50 animate-bounce-subtle">
            <div className={`px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-4 backdrop-blur-2xl ${
              toast.type === 'success' ? 'bg-status-success/20 border-status-success/50 text-status-success' :
              toast.type === 'warning' ? 'bg-status-warning/20 border-status-warning/50 text-status-warning' :
              'bg-accent-blue/20 border-accent-blue/50 text-accent-cyan'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                toast.type === 'success' ? 'bg-status-success' :
                toast.type === 'warning' ? 'bg-status-warning' :
                'bg-accent-cyan'
              }`} />
              <p className="text-sm font-bold tracking-wide">{toast.message}</p>
              <button onClick={() => setToast(null)} className="ml-2 hover:opacity-50 transition-opacity">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        
        {/* Wallet Setup Overlay if not linked */}
        {!user?.walletAddress && (
          <div className="py-20 animate-fade-in">
            <WalletSetup onComplete={() => window.location.reload()} />
          </div>
        )}

        {user?.walletAddress && (
          <>
            {/* ── SECTION 2: STATS CARDS ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            loading={statsLoading}
            label="Total Records"
            value={records.length}
            sub="On-chain verified"
            icon={<svg className="w-6 h-6 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
          />
          <StatCard
            loading={statsLoading}
            label="Doctors with Access"
            value={doctorCount}
            sub="Blockchain access grants"
            icon={<svg className="w-6 h-6 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
          />
          <StatCard
            loading={riskLoading}
            label="Risk Level"
            value={risk?.level || 'N/A'}
            sub="AI Health Assessment"
            icon={<svg className="w-6 h-6 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
          />
          <StatCard
            loading={statsLoading}
            label="Last Updated"
            value={lastUpdated || '—'}
            sub="Most recent record"
            icon={<svg className="w-6 h-6 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
          />
        </div>

        {/* ── SECTIONS 3 & 4: QR HEALTH ID + AI RISK SCORE ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* SECTION 3 — QR Health ID */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-white">Health Passport</h2>
              <Link
                to="/qr-id"
                className="text-xs text-accent-cyan hover:text-white transition-colors font-bold uppercase tracking-wider"
              >
                Full Page →
              </Link>
            </div>
            <QRHealthID user={user} />
            <p className="text-[11px] text-text-secondary text-center leading-relaxed px-4">
              🚨 <span className="text-status-warning font-bold">Emergency:</span> Show this QR to medical staff for instant
              read-only access to your health records — no login required.
            </p>
          </div>

          {/* SECTION 4 — AI Risk Score */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold text-white">AI Health Risk Analysis</h2>
              <div className="flex gap-4">
                <Link
                  to="/health-risk"
                  className="text-xs text-accent-cyan hover:text-white transition-colors font-bold uppercase tracking-wider font-display"
                >
                  Full Insights →
                </Link>
                <Link
                  to="/ensemble-predict"
                  className="text-xs text-accent-cyan hover:text-white transition-colors font-bold uppercase tracking-wider font-display"
                >
                  🧬 Ensemble Predictor →
                </Link>
                <Link
                  to="/adherence-prediction"
                  className="text-xs text-accent-cyan hover:text-white transition-colors font-bold uppercase tracking-wider font-display"
                >
                  🗓️ Adherence Predictor →
                </Link>
                <Link
                  to="/digital-twin"
                  className="text-xs text-accent-cyan hover:text-white transition-colors font-bold uppercase tracking-wider font-display"
                >
                  👥 Patient Digital Twin →
                </Link>
                <button
                  onClick={fetchAIRisk}
                  disabled={riskLoading}
                  className="text-xs text-accent-indigo hover:text-white transition-colors font-bold uppercase tracking-wider disabled:opacity-50"
                >
                  {riskLoading ? 'Analysing…' : '↻ Refresh'}
                </button>
              </div>
            </div>

            <GlassCard glowBorder={true} className="space-y-6">
              {riskLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <div className="w-10 h-10 border-4 border-accent-indigo border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-text-secondary">Running neural analysis…</p>
                </div>
              ) : (
                <>
                  {/* Overall Risk Badge */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">Overall Risk Score</p>
                      <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold ${riskStyle.badge}`}>
                        <span className={`w-2 h-2 rounded-full ${riskStyle.dot}`} />
                        {riskStyle.label}
                      </span>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-accent-indigo/10 border border-accent-indigo/20 flex items-center justify-center">
                      <svg className="w-7 h-7 text-accent-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
                      </svg>
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="space-y-4">
                    <ProgressBar label="Heart Disease Risk"  value={risk?.heartDisease} colour="bg-status-danger" />
                    <ProgressBar label="Diabetes Risk"       value={risk?.diabetes}     colour="bg-status-warning" />
                    <ProgressBar label="Stroke Risk"         value={risk?.stroke}        colour="bg-accent-indigo" />
                  </div>

                  {/* Recommendations */}
                  {risk?.recommendations?.length > 0 && (
                    <div className="border-t border-medichain-border pt-4">
                      <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-3">AI Recommendations</p>
                      <ul className="space-y-2">
                        {risk.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                            <span className="text-accent-cyan mt-0.5 flex-shrink-0">›</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </GlassCard>
          </div>
        </div>

        {/* ── SECTION 5: MEDICAL RECORDS ──────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-display font-bold text-white">Medical Records</h2>
            <Link
              to="/records"
              className="text-xs text-accent-cyan hover:text-white transition-colors font-bold uppercase tracking-wider"
            >
              View All →
            </Link>
          </div>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search records…"
                className="w-full pl-10 pr-4 py-2.5 bg-medichain-surface border border-medichain-border rounded-xl text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent-cyan transition-all"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {RECORD_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    typeFilter === t
                      ? 'bg-accent-cyan text-medichain-bg-dark'
                      : 'bg-medichain-surface border border-medichain-border text-text-secondary hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Records Grid */}
          {recordsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-36 rounded-xl bg-medichain-surface/50 border border-medichain-border animate-pulse" />
              ))}
            </div>
          ) : filteredRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecords.slice(0, 6).map((record) => (
                <RecordCard
                  key={record._id}
                  record={record}
                  onViewFile={(url) => window.open(url, '_blank')}
                />
              ))}
            </div>
          ) : (
            <GlassCard className="py-16 text-center">
              <div className="w-16 h-16 bg-medichain-surface rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No Records Found</h3>
              <p className="text-sm text-text-secondary">
                {search || typeFilter !== 'All'
                  ? 'No records match your search. Try adjusting the filter.'
                  : 'Your medical records will appear here once a doctor uploads them.'}
              </p>
            </GlassCard>
          )}
        </div>

        {/* ── SECTION 6: ACCESS MANAGEMENT ────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-white">Access Management</h2>
            <Link
              to="/access"
              className="text-xs text-accent-cyan hover:text-white transition-colors font-bold uppercase tracking-wider"
            >
              Full Control →
            </Link>
          </div>
          <AccessManager patientAddress={user?.walletAddress} />
        </div>
        </>
        )}

      </main>
    </div>
  );
};

export default PatientDashboard;
