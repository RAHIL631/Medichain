// frontend/src/pages/HospitalDashboard.jsx
// Complete Hospital Dashboard — real API calls, stats, charts, uploads, with real hospital & diagnostic photography.

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import GlassCard from '../components/GlassCard';
import DashboardLayout from '../components/DashboardLayout';
import { getHospitalImage, HOSPITAL_IMAGES } from '../utils/images';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ── SVG Icons (inline to avoid external dep) ─────────────────────────────────
const Icons = {
  records:    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>,
  patients:   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>,
  upload:     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>,
  scanner:    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>,
  ai:         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
  dashboard:  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>,
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, sub, color = 'accent-cyan', loading }) => (
  <GlassCard className="flex items-center gap-4 hover:border-accent-cyan/20 transition-colors">
    <div className={`w-12 h-12 rounded-xl bg-${color}/10 border border-${color}/20 flex items-center justify-center text-${color} flex-shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-widest text-text-secondary">{label}</p>
      <p className="text-2xl font-display font-bold text-white mt-0.5">
        {loading ? <span className="inline-block w-16 h-6 bg-medichain-surface rounded animate-pulse" /> : value}
      </p>
      {sub && <p className="text-[10px] text-text-secondary mt-0.5">{sub}</p>}
    </div>
  </GlassCard>
);

// ── Chart tooltip styling ─────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-medichain-surface border border-medichain-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const HospitalDashboard = () => {
  const { user } = useAuth();

  const [stats, setStats]           = useState({ records: 0, patientsServed: 0, pendingSync: 0, todayUploads: 0 });
  const [chartData, setChartData]   = useState([]);
  const [typeData, setTypeData]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const navItems = [
    { label: 'Dashboard',       path: '/hospital-dashboard',    icon: Icons.dashboard },
    { label: 'Upload Report',   path: '/upload-report',         icon: Icons.upload },
    { label: 'Scan QR',         path: '/scan',                  icon: Icons.scanner },
    { label: 'Patient Registry',path: '/registry',              icon: Icons.patients },
    { label: 'AI Insights',     path: '/ai-dashboard',          icon: Icons.ai },
    { label: 'Analytics',       path: '/analytics',             icon: Icons.records },
  ];

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data } = await api.get('/analytics/stats');
      setStats({
        records: data.totalRecords ?? 0,
        patientsServed: data.uniquePatients ?? 0,
        pendingSync: data.pendingSync ?? 0,
        todayUploads: data.todayUploads ?? 0,
      });
      setChartData(Array.isArray(data.weeklyUploads) ? data.weeklyUploads : []);
      const colors = ['#38BDF8', '#22D3EE', '#818CF8', '#22C55E', '#F59E0B', '#EC4899'];
      setTypeData(Array.isArray(data.typeBreakdown)
        ? data.typeBreakdown.map((entry, index) => ({ ...entry, fill: colors[index % colors.length] }))
        : []);

    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout role="Hospital" navItems={navItems}>
      <div className="space-y-8 py-6">

        {/* ── Hospital Image Banner ────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden border border-medichain-border/60 shadow-lg">
          <img
            src={getHospitalImage({ name: user?.name || '', type: 'private' })}
            alt={user?.name || 'Hospital'}
            className="w-full h-48 sm:h-56 object-cover"
            onError={(e) => { e.target.src = HOSPITAL_IMAGES.default; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-medichain-bg-dark/95 via-medichain-bg-dark/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-medichain-bg-dark/90 via-transparent to-transparent" />
          <div className="absolute inset-0 p-6 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-xs font-mono text-slate-300 uppercase tracking-wider font-bold">Hospital workspace</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-white">{user?.name || 'Hospital account'}</h1>
                <p className="text-text-secondary mt-1 text-xs sm:text-sm">Workspace metrics are limited to records uploaded by this account.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-black/70 transition-all text-xs font-semibold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Refresh
                </button>
                <Link to="/upload-report" className="px-5 py-2.5 bg-gradient-to-r from-accent-blue to-accent-cyan rounded-xl text-white text-xs font-bold hover:opacity-90 transition-opacity shadow-lg shadow-accent-cyan/20">
                  + Upload Diagnostic Report
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Error Banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-status-danger/10 border border-status-danger/20 rounded-xl text-status-danger text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error} — Metrics may be unavailable.
          </div>
        )}

        {/* ── Stat Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Icons.records}  label="Uploaded Records"       value={stats.records}        sub="Active records"  color="accent-cyan"     loading={loading} />
          <StatCard icon={Icons.patients} label="Patients Served"        value={stats.patientsServed} sub="Unique Accounts" color="accent-blue"     loading={loading} />
          <StatCard icon={Icons.upload}   label="Today's Uploads"        value={stats.todayUploads}   sub="Last 24 hours"  color="accent-indigo"   loading={loading} />
          <StatCard icon={Icons.records}  label="Pending TX Hash"        value={stats.pendingSync}    sub="Saved records only" color="status-warning" loading={loading} />
        </div>

        {/* ── Charts Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly upload chart */}
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-text-secondary">Weekly Record Uploads</p>
                <p className="text-lg font-display font-bold text-white mt-0.5">Saved records from this account</p>
              </div>
              <span className="text-xs text-text-secondary">Based on record timestamps</span>
            </div>
            {chartData.length ? <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="uploads" fill="url(#barGrad)" radius={[4,4,0,0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer> : <p className="py-12 text-center text-sm text-text-secondary">No record activity is available for this account yet.</p>}
          </GlassCard>

          {/* Record type pie chart */}
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">Record Type Distribution</p>
            <p className="text-lg font-display font-bold text-white mb-4">By Category</p>
            {typeData.length ? <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {typeData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}%`, n]} />
              </PieChart>
            </ResponsiveContainer> : <p className="py-12 text-center text-sm text-text-secondary">No record types are available yet.</p>}
            <div className="space-y-1.5 mt-2">
              {typeData.map(({ name, value, fill }) => (
                <div key={name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: fill }} />
                    <span className="text-text-secondary">{name}</span>
                  </div>
                  <span className="text-white font-mono">{value}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* ── Recent Activity & Quick Actions ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Patient details are intentionally not listed outside an access-checked workflow. */}
          <GlassCard>
            <p className="text-sm font-display font-bold text-white">Patient record access</p>
            <p className="mt-2 text-sm text-text-secondary">
              Patient identifiers and record details are shown only after current on-chain access is verified.
            </p>
            <Link to="/scan" className="text-accent-cyan text-xs hover:underline mt-4 inline-block font-semibold">Identify a patient by QR or ID →</Link>
          </GlassCard>

          {/* Quick Actions & Network Status */}
          <div className="space-y-4">
            <GlassCard className="border-accent-cyan/20 bg-accent-cyan/5">
              <p className="text-xs uppercase tracking-widest text-text-secondary mb-4 font-bold">Facility Workflows</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Upload Lab Report',  path: '/upload-report',        icon: Icons.upload,   color: 'bg-accent-cyan' },
                  { label: 'Scan Patient QR',    path: '/scan',                 icon: Icons.scanner,  color: 'bg-accent-blue' },
                  { label: 'Patient Registry',   path: '/registry',             icon: Icons.patients, color: 'bg-accent-indigo' },
                  { label: 'AI Health Audits',   path: '/ai-dashboard',         icon: Icons.ai,       color: 'bg-status-warning' },
                  { label: 'Throughput Trends',  path: '/analytics',            icon: Icons.records,  color: 'bg-status-success' },
                  { label: 'Facility Profile',   path: '/profile',              icon: Icons.dashboard, color: 'bg-medichain-surface' },
                ].map(({ label, path, icon, color }) => (
                  <Link key={path} to={path} className="flex flex-col items-center gap-2 p-3 bg-medichain-bg-dark/60 border border-medichain-border rounded-xl hover:border-accent-cyan/30 hover:-translate-y-0.5 transition-all group">
                    <div className={`w-8 h-8 rounded-lg ${color}/20 flex items-center justify-center text-white group-hover:scale-110 transition-transform`}>
                      {icon}
                    </div>
                    <span className="text-[10px] text-text-secondary text-center leading-tight group-hover:text-white transition-colors">{label}</span>
                  </Link>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <p className="text-xs uppercase tracking-widest text-text-secondary mb-4 font-bold">External service status</p>
              <p className="text-sm text-text-secondary">
                Blockchain, IPFS, AI, and database health are not checked by this dashboard.
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HospitalDashboard;
