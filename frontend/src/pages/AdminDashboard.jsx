// frontend/src/pages/AdminDashboard.jsx
// MediChain Admin Dashboard — Platform-wide analytics, user management, audit logs.

import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import GlassCard from '../components/GlassCard';
import DashboardLayout from '../components/DashboardLayout';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ path, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path} />
  </svg>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color, loading }) => (
  <GlassCard className={`border-${color}/10 hover:border-${color}/30 transition-colors`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center text-${color}`}>{icon}</div>
    </div>
    <p className="text-2xl font-display font-bold text-hc-text">
      {loading ? <span className="inline-block w-16 h-6 bg-medichain-surface rounded animate-pulse" /> : value}
    </p>
    <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-1">{label}</p>
  </GlassCard>
);

// ── Table Row ─────────────────────────────────────────────────────────────────
const UserRow = ({ user, onToggle }) => {
  const roleColors = { patient: 'text-accent-emerald-dark border-accent-emerald-dark/20 bg-accent-emerald-dark/5', doctor: 'text-accent-emerald border-accent-emerald/20 bg-accent-emerald/5', hospital: 'text-accent-terracotta border-accent-terracotta/20 bg-accent-terracotta/5', admin: 'text-status-warning border-status-warning/20 bg-status-warning/5' };
  return (
    <tr className="border-b border-medichain-border hover:bg-medichain-surface/30 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-emerald/30 to-accent-emerald-dark/30 flex items-center justify-center text-hc-text text-xs font-bold">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm text-hc-text font-medium">{user.name}</p>
            <p className="text-[10px] text-text-secondary">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`text-[10px] px-2 py-1 rounded-full border capitalize font-mono ${roleColors[user.role] || ''}`}>
          {user.role}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${user.isWalletLinked ? 'bg-status-success' : 'bg-text-secondary'}`} />
          <span className="text-xs text-text-secondary">{user.isWalletLinked ? 'Linked' : 'Not linked'}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-xs text-text-secondary font-mono">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
      </td>
      <td className="py-3 px-4">
        <span className={`text-[10px] px-2 py-1 rounded-full border ${user.isBlockchainRegistered ? 'bg-status-success/10 text-status-success border-status-success/20' : 'bg-medichain-surface text-text-secondary border-medichain-border'}`}>
          {user.isBlockchainRegistered ? '✓ On-chain' : 'Off-chain'}
        </span>
      </td>
    </tr>
  );
};

// ── Tooltip ───────────────────────────────────────────────────────────────────
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

const COLORS = ['#16866a','#16866a','#d97860','#16866a','#ebcb82'];

// ── Main Component ────────────────────────────────────────────────────────────
const statusStyles = {
  ok: 'bg-status-success/10 text-status-success border-status-success/20',
  healthy: 'bg-status-success/10 text-status-success border-status-success/20',
  degraded: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  latency_warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  offline: 'bg-status-danger/10 text-status-danger border-status-danger/20',
  disconnected: 'bg-status-danger/10 text-status-danger border-status-danger/20',
  unhealthy: 'bg-status-danger/10 text-status-danger border-status-danger/20',
};

const ServiceHealthCard = ({ name, service }) => {
  const status = service?.status || 'offline';
  const style = statusStyles[status] || statusStyles.offline;
  return (
    <div className={`rounded-xl border p-4 ${style}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-hc-text">{name}</p>
        <span className="text-[10px] uppercase tracking-widest font-mono px-2 py-1 rounded-full border border-current/20">
          {status.replace('_', ' ')}
        </span>
      </div>
      <p className="mt-2 text-xs text-text-secondary break-words">
        {service?.detail || 'No detail available'}
      </p>
      <p className="mt-3 text-[10px] font-mono text-text-secondary">
        {typeof service?.latencyMs === 'number' ? `${service.latencyMs} ms` : '—'}
        {service?.mode ? ` · ${service.mode}` : ''}
      </p>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats,   setStats]   = useState({ totalUsers: 0, totalRecords: 0, totalDoctors: 0, totalHospitals: 0, totalPatients: 0 });
  const [users,   setUsers]   = useState([]);
  const [growth,  setGrowth]  = useState([]);
  const [roleData,setRoleData]= useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab,     setTab]     = useState('overview');
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');

  const navItems = [
    { label: 'Dashboard',  path: '/admin-dashboard',  icon: <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { label: 'Analytics',  path: '/analytics',        icon: <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
    { label: 'Profile',    path: '/profile',          icon: <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
  ];

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError('');
    try {
      const res = await api.get('/admin/system-health');
      setHealth(res.data);
    } catch (err) {
      setHealth(null);
      setHealthError(err.response?.data?.error || err.message || 'System health unavailable');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [statsRes, usersRes] = await Promise.allSettled([
      api.get('/analytics/platform-stats'),
      api.get('/analytics/users?limit=20'),
    ]);

    if (statsRes.status === 'fulfilled') {
      const data = statsRes.value.data;
      setStats({
        totalUsers: data.totalUsers ?? 0,
        totalRecords: data.totalRecords ?? 0,
        totalDoctors: data.totalDoctors ?? 0,
        totalHospitals: data.totalHospitals ?? 0,
        totalPatients: data.totalPatients ?? 0,
      });
      setGrowth(Array.isArray(data.growthData) ? data.growthData : []);
      const roleTotal = (data.totalPatients || 0) + (data.totalDoctors || 0) + (data.totalHospitals || 0) + (data.totalAdmins || 0);
      setRoleData(roleTotal ? [
        { name: 'Patients', value: (data.totalPatients / roleTotal) * 100, fill: COLORS[0] },
        { name: 'Doctors', value: (data.totalDoctors / roleTotal) * 100, fill: COLORS[1] },
        { name: 'Hospitals', value: (data.totalHospitals / roleTotal) * 100, fill: COLORS[2] },
        { name: 'Administrators', value: ((data.totalAdmins || 0) / roleTotal) * 100, fill: COLORS[3] },
      ] : []);
    } else {
      setError('Platform metrics could not be loaded.');
      setStats({ totalUsers: 0, totalRecords: 0, totalDoctors: 0, totalHospitals: 0, totalPatients: 0 });
      setGrowth([]);
      setRoleData([]);
    }

    if (usersRes.status === 'fulfilled') {
      setUsers(usersRes.value.data?.users || []);
    } else {
      setUsers([]);
      setError((current) => current ? `${current} User registry is unavailable.` : 'User registry is unavailable.');
    }
    setLoading(false);
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout role="Admin" navItems={navItems}>
      <div className="space-y-8 py-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-hc-text">Admin Control Center</h1>
            <p className="text-text-secondary mt-1 text-sm">
              Database-backed platform metrics · {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 border rounded-xl ${statusStyles[health?.status] || 'bg-medichain-surface border-medichain-border text-text-secondary'}`}>
              <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' || health?.status === 'ok' ? 'bg-status-success' : health?.status === 'degraded' ? 'bg-status-warning' : health ? 'bg-status-danger' : 'bg-text-secondary'}`} />
              <span className="text-xs font-mono">
                {healthLoading ? 'Checking services…' : health?.status ? `System ${health.status}` : 'Service health unknown'}
              </span>
            </div>
            <button onClick={fetchData} className="p-2 bg-medichain-surface border border-medichain-border rounded-xl text-text-secondary hover:text-hc-text transition-colors">
              <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="p-4 bg-status-danger/10 border border-status-danger/20 rounded-xl text-status-danger text-sm">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-medichain-surface/50 border border-medichain-border rounded-xl w-fit">
          {[['overview','Overview'],['users','User Registry'],['health','System Health']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-accent-emerald-dark/20 text-accent-emerald-dark' : 'text-text-secondary hover:text-hc-text'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon={<Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />} label="Total Users" value={stats.totalUsers} color="accent-emerald" loading={loading} />
              <StatCard icon={<Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />} label="Patients" value={stats.totalPatients} color="accent-emerald-dark" loading={loading} />
              <StatCard icon={<Icon path="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />} label="Doctors" value={stats.totalDoctors} color="accent-terracotta" loading={loading} />
              <StatCard icon={<Icon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />} label="Hospitals" value={stats.totalHospitals} color="status-warning" loading={loading} />
              <StatCard icon={<Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />} label="Total Records" value={stats.totalRecords} color="status-success" trend={23} trendUp={true} loading={loading} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <GlassCard className="lg:col-span-2">
                <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">Platform Growth</p>
                <p className="text-lg font-display font-bold text-hc-text mb-5">Users & Records Over Time</p>
                {growth.length > 0 ? <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={growth}>
                    <defs>
                      <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16866a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16866a" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16866a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16866a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E9E2" />
                    <XAxis dataKey="month" tick={{ fill:'#68766e', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'#68766e', fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="patients" stroke="#16866a" fill="url(#colorP)" strokeWidth={2} name="Patients" />
                    <Area type="monotone" dataKey="records"  stroke="#16866a" fill="url(#colorR)" strokeWidth={2} name="Records" />
                  </AreaChart>
                </ResponsiveContainer> : <p className="py-12 text-center text-sm text-text-secondary">No monthly activity is available yet.</p>}
              </GlassCard>

              <GlassCard>
                <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">User Distribution</p>
                <p className="text-lg font-display font-bold text-hc-text mb-4">By Role</p>
                {roleData.length > 0 ? <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3} dataKey="value">
                      {roleData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                  </PieChart>
                </ResponsiveContainer> : <p className="py-12 text-center text-sm text-text-secondary">No registered accounts are available.</p>}
                <div className="space-y-2 mt-2">
                  {roleData.map(({ name, value, fill }) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: fill }} />
                        <span className="text-text-secondary">{name}</span>
                      </div>
                      <span className="text-hc-text font-mono font-bold">{value.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </>
        )}

        {tab === 'users' && (
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm uppercase tracking-widest text-text-secondary">User Registry</p>
                <p className="text-lg font-display font-bold text-hc-text mt-0.5">All Platform Users</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-accent-emerald-dark/10 text-accent-emerald-dark border border-accent-emerald-dark/20">
                {users.length} shown
              </span>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-medichain-surface rounded animate-pulse" />)}</div>
            ) : users.length === 0 ? (
              <p className="text-text-secondary text-sm text-center py-8">No users found or API unavailable in admin role</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-medichain-border">
                      {['User','Role','Wallet','Joined','Blockchain'].map(h => (
                        <th key={h} className="py-3 px-4 text-[10px] uppercase tracking-widest text-text-secondary">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => <UserRow key={u._id} user={u} />)}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        )}

        {tab === 'health' && (
          <GlassCard>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-display font-bold text-hc-text">Service health</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Live latency checks for MongoDB, blockchain RPC, AI, IPFS, and Redis.
                </p>
              </div>
              <button
                onClick={fetchHealth}
                className="px-4 py-2 text-sm rounded-xl border border-medichain-border bg-medichain-surface text-hc-text hover:border-accent-emerald-dark/40 transition-colors"
              >
                {healthLoading ? 'Refreshing…' : 'Refresh checks'}
              </button>
            </div>

            {healthError && (
              <div role="alert" className="mb-4 p-3 rounded-xl border border-status-danger/20 bg-status-danger/10 text-status-danger text-sm">
                {healthError}
              </div>
            )}

            {healthLoading && !health ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-medichain-surface rounded-xl animate-pulse" />)}
              </div>
            ) : health?.services ? (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-text-secondary font-mono">
                  <span className={`px-2 py-1 rounded-full border ${statusStyles[health.status] || ''}`}>
                    Overall: {health.status}
                  </span>
                  <span>Checked {health.checkedAt ? new Date(health.checkedAt).toLocaleString() : '—'}</span>
                  <span>Uptime {health.uptimeSeconds ?? 0}s</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <ServiceHealthCard name="MongoDB" service={health.services.database} />
                  <ServiceHealthCard name="Blockchain RPC" service={health.services.blockchain} />
                  <ServiceHealthCard name="AI Microservice" service={health.services.aiService} />
                  <ServiceHealthCard name="IPFS / Pinata" service={health.services.ipfs} />
                  <ServiceHealthCard name="Redis Cache" service={health.services.redis} />
                </div>
              </>
            ) : (
              <p className="text-sm text-text-secondary text-center py-8">No health data yet. Refresh to run live checks.</p>
            )}
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
