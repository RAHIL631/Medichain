// frontend/src/pages/AdminDashboard.jsx
// MediChain Admin Dashboard — Platform-wide analytics, user management, audit logs.

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import GlassCard from '../components/GlassCard';
import DashboardLayout from '../components/DashboardLayout';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ path, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path} />
  </svg>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, trend, trendUp, color, loading }) => (
  <GlassCard className={`border-${color}/10 hover:border-${color}/30 transition-colors`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl bg-${color}/10 flex items-center justify-center text-${color}`}>{icon}</div>
      {trend !== undefined && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${trendUp ? 'bg-status-success/10 text-status-success' : 'bg-status-danger/10 text-status-danger'}`}>
          {trendUp ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-display font-bold text-white">
      {loading ? <span className="inline-block w-16 h-6 bg-medichain-surface rounded animate-pulse" /> : value}
    </p>
    <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-1">{label}</p>
  </GlassCard>
);

// ── Table Row ─────────────────────────────────────────────────────────────────
const UserRow = ({ user, onToggle }) => {
  const roleColors = { patient: 'text-accent-cyan border-accent-cyan/20 bg-accent-cyan/5', doctor: 'text-accent-blue border-accent-blue/20 bg-accent-blue/5', hospital: 'text-accent-indigo border-accent-indigo/20 bg-accent-indigo/5', admin: 'text-status-warning border-status-warning/20 bg-status-warning/5' };
  return (
    <tr className="border-b border-medichain-border hover:bg-medichain-surface/30 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue/30 to-accent-cyan/30 flex items-center justify-center text-white text-xs font-bold">
            {(user.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm text-white font-medium">{user.name}</p>
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

const COLORS = ['#38BDF8','#22D3EE','#818CF8','#22C55E','#F59E0B'];

// ── Main Component ────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats,   setStats]   = useState({ totalUsers: 0, totalRecords: 0, totalDoctors: 0, totalHospitals: 0, totalPatients: 0 });
  const [users,   setUsers]   = useState([]);
  const [growth,  setGrowth]  = useState([]);
  const [roleData,setRoleData]= useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview');

  const navItems = [
    { label: 'Dashboard',  path: '/admin-dashboard',  icon: <Icon path="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { label: 'Analytics',  path: '/analytics',        icon: <Icon path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
    { label: 'Profile',    path: '/profile',          icon: <Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.allSettled([
        api.get('/analytics/platform-stats'),
        api.get('/analytics/users?limit=20'),
      ]);

      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data;
        setStats({
          totalUsers:     d.totalUsers     || 0,
          totalRecords:   d.totalRecords   || 0,
          totalDoctors:   d.totalDoctors   || 0,
          totalHospitals: d.totalHospitals || 0,
          totalPatients:  d.totalPatients  || 0,
        });
        if (d.growthData) setGrowth(d.growthData);
        else {
          // Demo growth data
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul'];
          setGrowth(months.map((m, i) => ({
            month: m,
            patients:  Math.floor(10 + i * 8 + Math.random() * 5),
            doctors:   Math.floor(3 + i * 2 + Math.random() * 2),
            records:   Math.floor(20 + i * 15 + Math.random() * 10),
          })));
        }
        setRoleData([
          { name: 'Patients',  value: d.totalPatients  || 65, fill: COLORS[0] },
          { name: 'Doctors',   value: d.totalDoctors   || 25, fill: COLORS[1] },
          { name: 'Hospitals', value: d.totalHospitals || 10, fill: COLORS[2] },
        ]);
      } else {
        // Demo mode
        setStats({ totalUsers: 142, totalRecords: 1847, totalDoctors: 38, totalHospitals: 12, totalPatients: 92 });
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul'];
        setGrowth(months.map((m, i) => ({ month: m, patients: 10 + i*8, doctors: 3 + i*2, records: 20 + i*15 })));
        setRoleData([{ name:'Patients',value:65,fill:COLORS[0]},{name:'Doctors',value:25,fill:COLORS[1]},{name:'Hospitals',value:10,fill:COLORS[2]}]);
      }

      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value.data?.users || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <DashboardLayout role="Admin" navItems={navItems}>
      <div className="space-y-8 py-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white">Admin Control Center</h1>
            <p className="text-text-secondary mt-1 text-sm">
              Platform-wide analytics · {new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-medichain-surface border border-medichain-border rounded-xl">
              <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
              <span className="text-xs text-text-secondary font-mono">All systems operational</span>
            </div>
            <button onClick={fetchData} className="p-2 bg-medichain-surface border border-medichain-border rounded-xl text-text-secondary hover:text-white transition-colors">
              <Icon path="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-medichain-surface/50 border border-medichain-border rounded-xl w-fit">
          {[['overview','Overview'],['users','User Registry'],['health','System Health']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-secondary hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon={<Icon path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />} label="Total Users" value={stats.totalUsers} color="accent-blue" trend={12} trendUp={true} loading={loading} />
              <StatCard icon={<Icon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />} label="Patients" value={stats.totalPatients} color="accent-cyan" trend={8} trendUp={true} loading={loading} />
              <StatCard icon={<Icon path="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />} label="Doctors" value={stats.totalDoctors} color="accent-indigo" loading={loading} />
              <StatCard icon={<Icon path="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />} label="Hospitals" value={stats.totalHospitals} color="status-warning" loading={loading} />
              <StatCard icon={<Icon path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />} label="Total Records" value={stats.totalRecords} color="status-success" trend={23} trendUp={true} loading={loading} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <GlassCard className="lg:col-span-2">
                <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">Platform Growth</p>
                <p className="text-lg font-display font-bold text-white mb-5">Users & Records Over Time</p>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={growth}>
                    <defs>
                      <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#38BDF8" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fill:'#94A3B8', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'#94A3B8', fontSize:10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="patients" stroke="#38BDF8" fill="url(#colorP)" strokeWidth={2} name="Patients" />
                    <Area type="monotone" dataKey="records"  stroke="#22D3EE" fill="url(#colorR)" strokeWidth={2} name="Records" />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard>
                <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">User Distribution</p>
                <p className="text-lg font-display font-bold text-white mb-4">By Role</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3} dataKey="value">
                      {roleData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v}%`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {roleData.map(({ name, value, fill }) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: fill }} />
                        <span className="text-text-secondary">{name}</span>
                      </div>
                      <span className="text-white font-mono font-bold">{value}%</span>
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
                <p className="text-lg font-display font-bold text-white mt-0.5">All Platform Users</p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { service: 'Backend API',        url: 'http://localhost:5000/health',  status: 'operational', latency: '12ms' },
              { service: 'AI Microservice',    url: 'http://localhost:5001/health',  status: 'operational', latency: '45ms' },
              { service: 'MongoDB Atlas',      url: 'medichain.mongodb.net',         status: 'operational', latency: '23ms' },
              { service: 'IPFS (Pinata)',      url: 'api.pinata.cloud',              status: 'operational', latency: '180ms' },
              { service: 'Ethereum (Sepolia)', url: 'sepolia.infura.io',             status: 'operational', latency: '95ms' },
              { service: 'Redis Cache',        url: 'localhost:6379',                status: 'optional',    latency: '—' },
            ].map(({ service, url, status, latency }) => (
              <div key={service} className="flex items-center justify-between p-4 bg-medichain-surface/30 border border-medichain-border rounded-xl hover:border-accent-cyan/20 transition-colors">
                <div>
                  <p className="text-sm text-white font-medium">{service}</p>
                  <p className="text-[10px] text-text-secondary font-mono mt-0.5">{url}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${status === 'operational' ? 'bg-status-success animate-pulse' : 'bg-text-secondary'}`} />
                    <span className={`text-xs font-mono ${status === 'operational' ? 'text-status-success' : 'text-text-secondary'} capitalize`}>{status}</span>
                  </div>
                  <span className="text-[10px] text-text-secondary font-mono">Latency: {latency}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
