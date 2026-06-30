// frontend/src/pages/AnalyticsDashboard.jsx
// MediChain — Real-Time Platform Analytics Dashboard
// Displays Live AI, Blockchain, IPFS, Patient, Disease, and Medicine trends.

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend as ChartLegend
} from 'recharts';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import GlassCard from '../components/GlassCard';

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
    
    // Auto-refresh every 60 seconds to simulate real-time monitoring
    const interval = setInterval(() => {
      fetchAnalytics(true); // silent refresh
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/analytics/summary');
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error(err);
      if (!silent) setError('Failed to load real-time analytics.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Nav Items
  const navItems = isPatient ? [
    { label: 'Dashboard', path: '/patient-dashboard', icon: '🏠' },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: '🧠' },
    { label: '🩺 Health Scorer', path: '/health-risk', icon: '🩺' },
    { label: '🧬 Ensemble Predictor', path: '/ensemble-predict', icon: '🧬' },
    { label: '🗓️ Adherence Predictor', path: '/adherence-prediction', icon: '🗓️' },
    { label: '👥 Patient Digital Twin', path: '/digital-twin', icon: '👥' },
    { label: '📊 Live Analytics', path: '/analytics', icon: '📊' }
  ] : [
    { label: 'Dashboard', path: '/doctor-dashboard', icon: '🏠' },
    { label: 'AI CDSS', path: '/ai-dashboard', icon: '🧠' },
    { label: '🩺 Health Scorer', path: '/health-risk', icon: '🩺' },
    { label: '🧬 Ensemble Predictor', path: '/ensemble-predict', icon: '🧬' },
    { label: '🗓️ Adherence Predictor', path: '/adherence-prediction', icon: '🗓️' },
    { label: '👥 Patient Digital Twin', path: '/digital-twin', icon: '👥' },
    { label: '📊 Live Analytics', path: '/analytics', icon: '📊' }
  ];

  if (loading && !analytics) {
    return (
      <DashboardLayout role={isPatient ? 'Patient' : 'Doctor'} navItems={navItems}>
        <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
          <div style={{
            width: '50px', height: '50px',
            border: '4px solid rgba(6,182,212,0.2)',
            borderTop: '4px solid #06b6d4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p className="mt-4 text-accent-cyan font-bold tracking-widest uppercase text-xs animate-pulse">
            Booting Telemetry Link...
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role={isPatient ? 'Patient' : 'Doctor'} navItems={navItems}>
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-500">
          ❌ {error}
        </div>
      </DashboardLayout>
    );
  }

  const { blockchainStats, ipfsStats, transactionChart, diseaseTrends, medicineTrends, platformStats, aiStats } = analytics;

  return (
    <DashboardLayout role={isPatient ? 'Patient' : 'Doctor'} navItems={navItems}>
      <div className="space-y-6 animate-fade-in" style={{ fontFamily: "'Inter', sans-serif" }}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2">
              📊 MediChain Global Telemetry
            </h1>
            <p className="text-text-secondary mt-1">
              Real-time analytics monitor for Blockchain operations, IPFS storage, AI diagnostics, and hospital nodes.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-full text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Live Feed Active
            </span>
          </div>
        </div>

        {/* ── KPI SCORECARDS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="flex flex-col justify-between py-4">
            <span className="text-[10px] text-text-secondary uppercase tracking-widest mb-1 block">Total Patients</span>
            <span className="text-2xl font-bold text-white">{platformStats.totalPatients.toLocaleString()}</span>
            <span className="text-[10px] text-accent-cyan mt-1">+12% this month</span>
          </GlassCard>
          <GlassCard className="flex flex-col justify-between py-4">
            <span className="text-[10px] text-text-secondary uppercase tracking-widest mb-1 block">Total Transactions</span>
            <span className="text-2xl font-bold text-white">{blockchainStats.totalTransactions.toLocaleString()}</span>
            <span className="text-[10px] text-accent-cyan mt-1">On-chain EMR logs</span>
          </GlassCard>
          <GlassCard className="flex flex-col justify-between py-4">
            <span className="text-[10px] text-text-secondary uppercase tracking-widest mb-1 block">AI Predictions Run</span>
            <span className="text-2xl font-bold text-white">{aiStats.totalPredictionsRun.toLocaleString()}</span>
            <span className="text-[10px] text-accent-cyan mt-1">~{aiStats.avgModelAccuracy} accuracy</span>
          </GlassCard>
          <GlassCard className="flex flex-col justify-between py-4">
            <span className="text-[10px] text-text-secondary uppercase tracking-widest mb-1 block">Active Hospitals</span>
            <span className="text-2xl font-bold text-white">{platformStats.totalHospitals.toLocaleString()}</span>
            <span className="text-[10px] text-accent-cyan mt-1">Network nodes live</span>
          </GlassCard>
        </div>

        {/* ── TRANSACTION VELOCITY CHART ── */}
        <GlassCard>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white">
              📈 Blockchain Daily Transaction Velocity (30 Days)
            </h4>
            <span className="text-[10px] text-text-secondary">Network: Polygon zkEVM</span>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={transactionChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} minTickGap={20} />
              <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
              <ChartTooltip 
                contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#06b6d4', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="transactions" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorTx)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* ── DISEASE TRENDS & MEDICINE STATISTICS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Disease Prevalence Pie Chart */}
          <GlassCard>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-6">
              🦠 AI Disease Prevalence Distribution
            </h4>
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={diseaseTrends}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5}
                    dataKey="prevalence"
                  >
                    {diseaseTrends.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-1/2 flex flex-col justify-center space-y-2">
                {diseaseTrends.map(item => (
                  <div key={item.name} className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-2 text-text-secondary">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.fill }}></span>
                      {item.name}
                    </span>
                    <strong className="text-white">{item.prevalence}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          {/* Medicine Prescriptions Bar Chart */}
          <GlassCard>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">
              💊 Top Prescribed Medications
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart layout="vertical" data={medicineTrends} margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#cbd5e1' }} />
                <ChartTooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                  {medicineTrends.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

        </div>

        {/* ── INFRASTRUCTURE NODES STATUS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard>
            <h4 className="text-xs font-bold uppercase tracking-widest text-accent-indigo mb-4 flex items-center gap-2">
              ⛓️ Blockchain Infrastructure Status
            </h4>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <span className="block text-[10px] text-text-secondary uppercase">Latest Block</span>
                <span className="font-mono text-white">#{blockchainStats.latestBlock.toLocaleString()}</span>
              </div>
              <div>
                <span className="block text-[10px] text-text-secondary uppercase">Avg Block Time</span>
                <span className="font-mono text-white">{blockchainStats.avgBlockTime}</span>
              </div>
              <div>
                <span className="block text-[10px] text-text-secondary uppercase">Network Gas Price</span>
                <span className="font-mono text-white">{blockchainStats.gasPrice}</span>
              </div>
              <div>
                <span className="block text-[10px] text-text-secondary uppercase">Active Relay Nodes</span>
                <span className="font-mono text-white">{blockchainStats.activeNodes}</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h4 className="text-xs font-bold uppercase tracking-widest text-accent-cyan mb-4 flex items-center gap-2">
              📦 IPFS Storage Network
            </h4>
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <span className="block text-[10px] text-text-secondary uppercase">Total Files Pinned</span>
                <span className="font-mono text-white">{ipfsStats.totalFilesPinned.toLocaleString()} Docs</span>
              </div>
              <div>
                <span className="block text-[10px] text-text-secondary uppercase">Storage Consumed</span>
                <span className="font-mono text-white">{ipfsStats.storageUsed}</span>
              </div>
              <div>
                <span className="block text-[10px] text-text-secondary uppercase">Gateway Latency</span>
                <span className="font-mono text-green-400">{ipfsStats.gatewayResponseTime}</span>
              </div>
              <div>
                <span className="block text-[10px] text-text-secondary uppercase">Encryption</span>
                <span className="font-mono text-white">{ipfsStats.encryptionProtocol}</span>
              </div>
            </div>
          </GlassCard>
        </div>

      </div>
      <style>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </DashboardLayout>
  );
}
