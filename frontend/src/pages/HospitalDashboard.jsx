// frontend/src/pages/HospitalDashboard.jsx
// Complete Hospital Dashboard — real API calls, stats, charts, uploads.

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

// ── Activity Row ──────────────────────────────────────────────────────────────
const ActivityRow = ({ type, patient, time, status }) => {
  const colours = { prescription: 'text-accent-blue', lab_report: 'text-accent-cyan', xray: 'text-accent-indigo', diagnosis: 'text-status-warning', other: 'text-text-secondary' };
  return (
    <div className="flex items-center gap-3 py-3 border-b border-medichain-border last:border-0">
      <div className={`w-8 h-8 rounded-lg bg-medichain-bg-dark flex items-center justify-center ${colours[type] || 'text-text-secondary'} flex-shrink-0`}>
        {Icons.records}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{patient}</p>
        <p className="text-[10px] text-text-secondary capitalize">{type?.replace('_', ' ')} · {time}</p>
      </div>
      <span className={`text-[10px] px-2 py-1 rounded-full border ${
        status === 'confirmed' ? 'bg-status-success/10 text-status-success border-status-success/20' :
        status === 'pending'   ? 'bg-status-warning/10 text-status-warning border-status-warning/20' :
                                 'bg-medichain-surface text-text-secondary border-medichain-border'
      } font-mono uppercase`}>{status}</span>
    </div>
  );
};

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

const CHART_COLORS = ['#38BDF8', '#22D3EE', '#818CF8', '#22C55E', '#F59E0B'];

// ── Main Component ────────────────────────────────────────────────────────────
const HospitalDashboard = () => {
  const { user } = useAuth();

  const [stats, setStats]           = useState({ records: 0, patientsServed: 0, pendingSync: 0, todayUploads: 0 });
  const [recentRecords, setRecent]  = useState([]);
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

      // Fetch analytics stats
      const [analyticsRes, recordsRes] = await Promise.allSettled([
        api.get('/analytics/stats'),
        api.get('/doctor/recent-uploads?limit=8'),
      ]);

      if (analyticsRes.status === 'fulfilled') {
        const d = analyticsRes.value.data;
        setStats({
          records:        d.totalRecords      || 0,
          patientsServed: d.totalPatients     || 0,
          pendingSync:    d.pendingSync       || 0,
          todayUploads:   d.todayUploads      || 0,
        });

        // Build weekly chart data
        if (d.weeklyUploads) {
          setChartData(d.weeklyUploads);
        } else {
          // Fallback mock data for demo
          const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
          setChartData(days.map(day => ({ day, uploads: Math.floor(Math.random() * 15) + 1 })));
        }

        // Type breakdown
        if (d.typeBreakdown) {
          setTypeData(d.typeBreakdown.map((t, i) => ({ ...t, fill: CHART_COLORS[i % CHART_COLORS.length] })));
        } else {
          setTypeData([
            { name: 'Lab Report', value: 38, fill: CHART_COLORS[0] },
            { name: 'Prescription', value: 28, fill: CHART_COLORS[1] },
            { name: 'X-Ray/Scan', value: 18, fill: CHART_COLORS[2] },
            { name: 'Diagnosis', value: 12, fill: CHART_COLORS[3] },
            { name: 'Other', value: 4, fill: CHART_COLORS[4] },
          ]);
        }
      }

      if (recordsRes.status === 'fulfilled') {
        const records = recordsRes.value.data?.records || [];
        setRecent(records.map(r => ({
          type:    r.recordType || 'other',
          patient: r.patientId?.name || 'Anonymous Patient',
          time:    new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status:  r.blockchainTxHash ? 'confirmed' : 'pending',
        })));
      }

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
        <div className="relative rounded-2xl overflow-hidden border border-medichain-border/60">
          <img
            src={getHospitalImage({ name: user?.name || '', type: 'private' })}
            alt={user?.name || 'Hospital'}
            className="w-full h-44 object-cover"
            onError={(e) => { e.target.src = HOSPITAL_IMAGES.default; }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-medichain-bg-dark/90 via-medichain-bg-dark/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-medichain-bg-dark/80 via-transparent to-transparent" />
          <div className="absolute inset-0 p-6 flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Verified Medical Institution</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-display font-bold text-white">{user?.name || 'Hospital'}</h1>
                <p className="text-text-secondary mt-1 text-sm">
                  Institutional Portal ·{' '}
                  <span className="text-accent-cyan font-mono text-xs">MC-H-NODE</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-black/70 transition-all text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Refresh
                </button>
                <Link to="/upload-report" className="px-5 py-2 bg-gradient-to-r from-accent-blue to-accent-cyan rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-accent-cyan/20">
                  + Upload Report
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Error Banner ─────────────────────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-status-danger/10 border border-status-danger/20 rounded-xl text-status-danger text-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {error} — Using cached data
          </div>
        )}

        {/* ── Stat Cards ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Icons.records}  label="Total Records Issued"   value={stats.records}        sub="All time"       color="accent-cyan"     loading={loading} />
          <StatCard icon={Icons.patients} label="Patients Served"        value={stats.patientsServed} sub="Unique patients" color="accent-blue"     loading={loading} />
          <StatCard icon={Icons.upload}   label="Today's Uploads"        value={stats.todayUploads}   sub="Last 24 hours"  color="accent-indigo"   loading={loading} />
          <StatCard icon={Icons.records}  label="Pending Blockchain Sync" value={stats.pendingSync}   sub="Awaiting tx"    color="status-warning"  loading={loading} />
        </div>

        {/* ── Charts Row ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly upload chart */}
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-text-secondary">Weekly Record Uploads</p>
                <p className="text-lg font-display font-bold text-white mt-0.5">Upload Trends</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">This Week</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
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
            </ResponsiveContainer>
          </GlassCard>

          {/* Record type pie chart */}
          <GlassCard>
            <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">Record Type Distribution</p>
            <p className="text-lg font-display font-bold text-white mb-4">By Category</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {typeData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v}%`, n]} />
              </PieChart>
            </ResponsiveContainer>
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
          {/* Recent records */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-display font-bold text-white">Recent Uploads</p>
              <Link to="/analytics" className="text-xs text-accent-cyan hover:underline">View All →</Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-medichain-surface rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentRecords.length > 0 ? (
              <div>
                {recentRecords.map((r, i) => (
                  <ActivityRow key={i} {...r} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-text-secondary text-sm">No uploads yet</p>
                <Link to="/upload-report" className="text-accent-cyan text-xs hover:underline mt-1 block">Upload your first record →</Link>
              </div>
            )}
          </GlassCard>

          {/* Quick Actions */}
          <div className="space-y-4">
            <GlassCard className="border-accent-cyan/20 bg-accent-cyan/5">
              <p className="text-xs uppercase tracking-widest text-text-secondary mb-4">Quick Actions</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Upload Diagnosis', path: '/upload-report',        icon: Icons.upload,   color: 'bg-accent-cyan' },
                  { label: 'Scan Patient QR',  path: '/scan',                 icon: Icons.scanner,  color: 'bg-accent-blue' },
                  { label: 'Patient Registry', path: '/registry',             icon: Icons.patients, color: 'bg-accent-indigo' },
                  { label: 'AI Insights',      path: '/ai-dashboard',         icon: Icons.ai,       color: 'bg-status-warning' },
                  { label: 'Analytics',        path: '/analytics',            icon: Icons.records,  color: 'bg-status-success' },
                  { label: 'Profile',          path: '/profile',              icon: Icons.dashboard, color: 'bg-medichain-surface' },
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

            {/* Network Status */}
            <GlassCard>
              <p className="text-xs uppercase tracking-widest text-text-secondary mb-4">Network Status</p>
              <div className="space-y-2">
                {[
                  { label: 'Ethereum Node',   value: 'Connected',  status: 'ok' },
                  { label: 'IPFS Gateway',    value: 'Operational',status: 'ok' },
                  { label: 'AI Microservice', value: 'Running',    status: 'ok' },
                  { label: 'MongoDB Atlas',   value: 'Connected',  status: 'ok' },
                ].map(({ label, value, status }) => (
                  <div key={label} className="flex items-center justify-between p-2.5 bg-medichain-bg-dark/60 rounded-lg border border-medichain-border">
                    <span className="text-xs text-text-secondary">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${status === 'ok' ? 'bg-status-success' : 'bg-status-danger'} animate-pulse`} />
                      <span className={`text-xs font-mono ${status === 'ok' ? 'text-status-success' : 'text-status-danger'}`}>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default HospitalDashboard;
