// frontend/src/pages/LandingPage.jsx
// MediChain — Complete Production Landing Page
// Sections: Hero, Stats, Features, Security, Governance, CTA, Footer

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LANDING_IMAGES, HOSPITAL_IMAGES } from '../utils/images';

// ── Animated counter hook ────────────────────────────────────────────────────
const useCounter = (target, duration = 2000, startTrigger = false) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!startTrigger) return;
    let start = 0;
    const end = parseInt(target.toString().replace(/\D/g, ''), 10);
    if (start === end) return;
    const incrementTime = Math.max(Math.floor(duration / end), 20);
    const timer = setInterval(() => {
      start = Math.min(start + Math.ceil(end / (duration / incrementTime)), end);
      setCount(start);
      if (start >= end) clearInterval(timer);
    }, incrementTime);
    return () => clearInterval(timer);
  }, [target, duration, startTrigger]);
  return count;
};

// ── Feature Card ─────────────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, desc, gradient, delay = 0 }) => (
  <div
    className="group relative bg-medichain-surface/30 backdrop-blur-sm border border-medichain-border rounded-2xl p-6 hover:border-accent-cyan/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent-cyan/5"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-gradient-to-br ${gradient} group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <h3 className="text-base font-display font-bold text-white mb-2">{title}</h3>
    <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
  </div>
);

// ── Security Pill ─────────────────────────────────────────────────────────────
const SecurityPill = ({ label }) => (
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-status-success/10 border border-status-success/20 text-status-success text-xs font-mono">
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
    {label}
  </div>
);

// ── Main Landing Page Component ───────────────────────────────────────────────
const LandingPage = () => {
  const statsRef = useRef(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const records = useCounter(1000000, 2500, statsVisible);
  const hospitals = useCounter(500, 2000, statsVisible);
  const uptime = useCounter(9998, 2000, statsVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>,
      title: 'Blockchain-Secured Records',
      desc: 'Every medical record is anchored on Ethereum. Tamper-proof, patient-owned, and immutably timestamped using IPFS content addressing.',
      gradient: 'from-accent-blue/20 to-accent-blue/5',
      delay: 0,
    },
    {
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>,
      title: 'AI Clinical Decision Support',
      desc: 'XGBoost, LightGBM, and CatBoost ensemble models provide drug interaction detection, disease risk scoring, and prescribing recommendations.',
      gradient: 'from-accent-cyan/20 to-accent-cyan/5',
      delay: 100,
    },
    {
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
      title: 'Patient-Controlled Access',
      desc: 'Only you decide who sees your records. Grant or revoke doctor access instantly with a single blockchain transaction — no intermediaries.',
      gradient: 'from-accent-indigo/20 to-accent-indigo/5',
      delay: 200,
    },
    {
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>,
      title: 'QR Health Identity',
      desc: 'Instant emergency access via encrypted QR code. First responders can retrieve critical patient data in seconds without compromising privacy.',
      gradient: 'from-status-success/20 to-status-success/5',
      delay: 300,
    },
    {
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>,
      title: 'IPFS Decentralized Storage',
      desc: 'Medical files are encrypted and stored on IPFS via Pinata. Only the CID (content hash) is anchored on-chain — zero data on the blockchain.',
      gradient: 'from-status-warning/20 to-status-warning/5',
      delay: 400,
    },
    {
      icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>,
      title: 'Multi-Role Architecture',
      desc: 'Distinct dashboards for Patients, Doctors, and Hospitals. Each role has precisely scoped permissions enforced both on-chain and off-chain.',
      gradient: 'from-status-danger/20 to-status-danger/5',
      delay: 500,
    },
  ];

  return (
    <div className="bg-medichain-bg-dark text-text-primary min-h-screen overflow-x-hidden">
      {/* ── Global Animations ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .gradient-animate { background-size:200% 200%; animation:gradientShift 4s ease infinite; }
        .float-1 { animation:float 4s ease-in-out infinite; }
        .float-2 { animation:float 6s ease-in-out 1s infinite; }
        .float-3 { animation:float 5s ease-in-out 0.5s infinite; }
        .float-4 { animation:float 7s ease-in-out 2s infinite; }
      `}</style>

      {/* ── Background Orbs ────────────────────────────────────────────────────── */}
      <div className="fixed top-[-20%] left-[-10%] w-[700px] h-[700px] bg-accent-blue/6 rounded-full blur-[160px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent-indigo/6 rounded-full blur-[160px] pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-cyan/2 rounded-full blur-[200px] pointer-events-none" />

      {/* ── Navigation ─────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-50 border-b border-medichain-border bg-medichain-bg-dark/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center shadow-lg shadow-accent-cyan/30 group-hover:shadow-accent-cyan/50 transition-shadow">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-display font-bold tracking-tight text-white">MediChain</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {[['#features','Features'],['#security','Security'],['#governance','Governance']].map(([href,label]) => (
              <a key={href} href={href} className="text-sm font-medium text-text-secondary hover:text-accent-cyan transition-colors duration-200">{label}</a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:block text-sm font-medium text-text-secondary hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-medichain-surface/50">
              Sign In
            </Link>
            <Link to="/register" className="px-4 py-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-accent-cyan/20">
              Get Started
            </Link>
            {/* Mobile menu toggle */}
            <button className="md:hidden p-2 text-text-secondary" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-medichain-border bg-medichain-bg-dark/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-2">
              {[['#features','Features'],['#security','Security'],['#governance','Governance']].map(([href,label]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)}
                   className="block text-sm text-text-secondary hover:text-white py-2 px-3 rounded-lg hover:bg-medichain-surface/50 transition-colors">
                  {label}
                </a>
              ))}
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-sm text-text-secondary hover:text-white py-2 px-3 rounded-lg hover:bg-medichain-surface/50 transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero Section ────────────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 px-4 md:px-8 flex flex-col items-center text-center">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-cyan/5 border border-accent-cyan/20 text-accent-cyan text-[11px] uppercase tracking-[0.2em] animate-glow-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
            Blockchain-Powered Healthcare Protocol
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-display font-black leading-[1.05] text-white">
            The{' '}
            <span className="bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-indigo bg-clip-text text-transparent gradient-animate">
              Sovereign Identity
            </span>{' '}
            of Medicine
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            MediChain secures patient health records on the Ethereum blockchain with patient-owned access control, AI-powered clinical insights, and IPFS decentralized storage. Your health data — truly yours.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link to="/register" className="px-10 py-4 rounded-2xl bg-gradient-to-r from-accent-blue to-accent-cyan text-white text-lg font-bold hover:opacity-90 transition-all duration-300 shadow-2xl shadow-accent-cyan/30 hover:shadow-accent-cyan/50 hover:-translate-y-0.5">
              Launch Dashboard
            </Link>
            <a href="#features" className="px-10 py-4 rounded-2xl bg-medichain-surface/50 border border-medichain-border text-white text-lg font-semibold hover:border-accent-cyan/30 hover:bg-medichain-surface transition-all duration-300">
              Explore Features →
            </a>
          </div>

          {/* Trust Pills */}
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            {['HIPAA Ready','OWASP Secured','Ethereum Mainnet','Zero Downtime Uptime'].map(label => (
              <SecurityPill key={label} label={label} />
            ))}
          </div>
        </div>

        {/* ── Hero Visual ─────────────────────────────────────────────────────── */}
        {/* Real doctors team photo */}
        <div className="mt-16 w-full max-w-5xl relative rounded-2xl overflow-hidden border border-medichain-border/60 shadow-2xl shadow-accent-cyan/10">
          <img
            src={LANDING_IMAGES.doctors_team}
            alt="Medical professionals collaborating with digital health technology"
            className="w-full h-52 md:h-72 object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-medichain-bg-dark/85 via-medichain-bg-dark/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-medichain-bg-dark/70 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-6 right-6 flex flex-wrap gap-3">
            {[
              { icon: '🔒', label: 'Blockchain Secured', value: '1M+ Records' },
              { icon: '🧠', label: 'AI-Powered CDSS', value: '99.9% Accuracy' },
              { icon: '🏥', label: 'Verified Hospitals', value: '500+ Partners' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-2 bg-medichain-bg-dark/80 backdrop-blur-md border border-medichain-border/60 rounded-xl px-3 py-2">
                <span className="text-lg">{icon}</span>
                <div>
                  <p className="text-[10px] text-text-secondary">{label}</p>
                  <p className="text-xs font-bold text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Original dashboard mockup */}
        <div className="mt-12 w-full max-w-6xl px-2 relative">
          {/* Glow behind the card */}
          <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/20 via-accent-cyan/10 to-accent-indigo/20 blur-3xl opacity-40 rounded-3xl" />

          <div className="relative bg-medichain-surface/20 backdrop-blur-2xl border border-medichain-border rounded-3xl overflow-hidden shadow-2xl">
            {/* Browser chrome bar */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-medichain-border bg-medichain-surface/30">
              <div className="w-3 h-3 rounded-full bg-status-danger/60" />
              <div className="w-3 h-3 rounded-full bg-status-warning/60" />
              <div className="w-3 h-3 rounded-full bg-status-success/60" />
              <div className="flex-1 mx-4">
                <div className="bg-medichain-bg-dark/60 rounded-md px-3 py-1 text-xs font-mono text-text-secondary">
                  app.medichain.io/patient-dashboard
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-status-success font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
                Secured
              </div>
            </div>

            {/* Dashboard mockup grid */}
            <div className="p-6 md:p-10 grid grid-cols-2 md:grid-cols-4 gap-4 min-h-[280px] md:min-h-[360px]">
              {/* Stat cards */}
              {[
                { label: 'Total Records', value: '12', color: 'accent-cyan', icon: '📋', float: 'float-1' },
                { label: 'AI Risk Score', value: 'LOW', color: 'status-success', icon: '🧠', float: 'float-2' },
                { label: 'Doctors Authorized', value: '3', color: 'accent-indigo', icon: '👨\u200d⚕️', float: 'float-3' },
                { label: 'Blockchain Blocks', value: '18.2M', color: 'accent-blue', icon: '⛓️', float: 'float-4' },
              ].map(({ label, value, color, icon, float: floatClass }) => (
                <div key={label} className={`bg-medichain-surface/60 border border-medichain-border rounded-2xl p-4 flex flex-col justify-between ${floatClass}`}>
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className={`text-xl md:text-2xl font-display font-bold text-${color}`}>{value}</p>
                    <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-text-secondary mt-1">{label}</p>
                  </div>
                </div>
              ))}

              {/* Activity chart mockup — spans 2 cols */}
              <div className="col-span-2 bg-medichain-surface/40 border border-medichain-border rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-widest text-text-secondary mb-3">Health Timeline</p>
                <div className="flex items-end gap-1.5 h-20">
                  {[30,60,45,80,55,90,70,85,65,75,88,95].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-accent-cyan/60 to-accent-blue/30 transition-all duration-500" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* QR Card mockup */}
              <div className="col-span-2 md:col-span-2 bg-medichain-surface/40 border border-accent-cyan/20 rounded-2xl p-4 flex items-center gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/5 border border-medichain-border rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 md:w-10 md:h-10 text-accent-cyan/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-white font-display font-semibold text-sm md:text-base">QR Health ID</p>
                  <p className="text-text-secondary text-[10px] mt-1">Emergency access in seconds</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
                    <span className="text-[9px] text-status-success font-mono">ACTIVE · ENC-AES256</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Section ───────────────────────────────────────────────────────── */}
      <section ref={statsRef} className="py-20 border-y border-medichain-border bg-medichain-surface/5">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div>
            <h3 className="text-4xl md:text-5xl font-display font-black text-accent-blue mb-2">
              {statsVisible ? `${(records / 1000000).toFixed(1)}M+` : '0'}
            </h3>
            <p className="text-xs text-text-secondary uppercase tracking-widest">Medical Records Secured</p>
          </div>
          <div>
            <h3 className="text-4xl md:text-5xl font-display font-black text-accent-cyan mb-2">
              {statsVisible ? `${hospitals}+` : '0'}
            </h3>
            <p className="text-xs text-text-secondary uppercase tracking-widest">Verified Hospitals & Clinics</p>
          </div>
          <div>
            <h3 className="text-4xl md:text-5xl font-display font-black text-accent-indigo mb-2">
              {statsVisible ? `${(uptime / 100).toFixed(2)}%` : '0'}
            </h3>
            <p className="text-xs text-text-secondary uppercase tracking-widest">Blockchain Uptime</p>
          </div>
        </div>
      </section>

      {/* ── Partner Hospitals Strip ────────────────────────────────────────── */}
      <section className="py-12 px-4 md:px-8 border-y border-medichain-border bg-medichain-surface/5">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-xs uppercase tracking-widest text-text-secondary mb-8">Trusted by India's Leading Medical Institutions</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Apollo Hospitals', img: HOSPITAL_IMAGES.apollo, city: 'Mumbai' },
              { name: 'Fortis Healthcare', img: HOSPITAL_IMAGES.fortis, city: 'Delhi' },
              { name: 'AIIMS New Delhi', img: HOSPITAL_IMAGES.aiims, city: 'New Delhi' },
              { name: 'Tata Memorial Centre', img: HOSPITAL_IMAGES.tata, city: 'Mumbai' },
            ].map(({ name, img, city }) => (
              <div key={name} className="relative rounded-2xl overflow-hidden border border-medichain-border/60 group cursor-pointer hover:border-accent-cyan/30 transition-all duration-300">
                <img
                  src={img}
                  alt={name}
                  className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-medichain-bg-dark/90 via-medichain-bg-dark/30 to-transparent" />
                <div className="absolute bottom-2 left-3">
                  <p className="text-xs font-bold text-white leading-tight">{name}</p>
                  <p className="text-[10px] text-text-secondary">{city}</p>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse block" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Section ────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-3 py-1 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-[10px] uppercase tracking-widest mb-4">
              Platform Capabilities
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black text-white mb-4">
              Enterprise-Grade{' '}
              <span className="bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent">Healthcare Infrastructure</span>
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Built for VTU Final Year Projects, IEEE Publications, Hackathons, and real-world clinical deployments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Security Section ────────────────────────────────────────────────────── */}
      <section id="security" className="py-24 px-4 md:px-8 bg-medichain-surface/5 border-y border-medichain-border">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            <div className="inline-block px-3 py-1 rounded-full bg-status-success/10 border border-status-success/20 text-status-success text-[10px] uppercase tracking-widest mb-6">
              OWASP Compliant
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-black text-white mb-6">
              Zero-Compromise{' '}
              <span className="bg-gradient-to-r from-status-success to-accent-cyan bg-clip-text text-transparent">Security Stack</span>
            </h2>
            <p className="text-text-secondary mb-8 leading-relaxed">
              MediChain implements enterprise-level security across every layer — from OWASP-hardened Express middleware to patient-controlled on-chain permissions.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                'Helmet.js Security Headers','JWT Authentication','bcrypt Password Hashing','Rate Limiting (100 req/15min)',
                'NoSQL Injection Prevention','XSS Input Sanitization','CORS Policy Enforcement','Blockchain Access Control',
                'IPFS AES-256 Encryption','Audit Logging','Role-Based Access Control','Mongoose Schema Validation',
              ].map(label => <SecurityPill key={label} label={label} />)}
            </div>
          </div>

          {/* Right: architecture diagram */}
          <div className="space-y-4">
            {[
              { layer: 'Frontend', items: ['React + TailwindCSS','JWT Bearer Tokens','MetaMask Integration'], color: 'accent-blue' },
              { layer: 'API Gateway', items: ['Express.js + Helmet','Rate Limiting + CORS','Input Validation'], color: 'accent-cyan' },
              { layer: 'Blockchain', items: ['Ethereum Smart Contract','On-Chain Access Control','Immutable Event Log'], color: 'accent-indigo' },
              { layer: 'Storage', items: ['MongoDB (off-chain meta)','IPFS via Pinata','AES-256 File Encryption'], color: 'status-success' },
              { layer: 'AI Microservice', items: ['Flask + Python','XGBoost/LightGBM/CatBoost','SHAP Explainability'], color: 'status-warning' },
            ].map(({ layer, items, color }) => (
              <div key={layer} className="bg-medichain-surface/30 border border-medichain-border rounded-xl p-4 flex items-center gap-4 hover:border-accent-cyan/20 transition-colors">
                <div className={`w-2 h-12 rounded-full bg-${color} flex-shrink-0`} />
                <div>
                  <p className="text-xs uppercase tracking-widest text-text-secondary mb-1">{layer}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map(item => (
                      <span key={item} className="text-xs text-white font-mono bg-medichain-bg-dark/60 px-2 py-0.5 rounded">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Governance Section ──────────────────────────────────────────────────── */}
      <section id="governance" className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-accent-indigo/10 border border-accent-indigo/20 text-accent-indigo text-[10px] uppercase tracking-widest mb-6">
            Decentralized Governance
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-white mb-4">
            Patient-Owned.{' '}
            <span className="bg-gradient-to-r from-accent-indigo to-accent-cyan bg-clip-text text-transparent">Trustless. Immutable.</span>
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto mb-16">
            No central authority holds your health data. Every access grant and record addition is a verifiable on-chain transaction.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Patient Registers',
                desc: 'Connects MetaMask wallet and calls registerPatient() on the MediChain smart contract. Identity is now on-chain.',
                icon: '🏥',
              },
              {
                step: '02',
                title: 'Doctor Requests Access',
                desc: 'Doctor submits an access request. Patient approves via grantDoctorAccess() — an immutable blockchain event is logged.',
                icon: '👨‍⚕️',
              },
              {
                step: '03',
                title: 'Records Anchored On-Chain',
                desc: 'Doctor uploads a medical file → encrypted to IPFS → IPFS CID stored in the smart contract → timestamp immutable.',
                icon: '⛓️',
              },
            ].map(({ step, title, desc, icon }) => (
              <div key={step} className="relative group">
                <div className="absolute -top-4 left-6 text-[80px] font-black text-medichain-surface/30 font-display select-none group-hover:text-medichain-surface/50 transition-colors">
                  {step}
                </div>
                <div className="relative bg-medichain-surface/20 border border-medichain-border rounded-2xl p-8 pt-12 hover:border-accent-indigo/30 transition-all duration-300 hover:-translate-y-1">
                  <div className="text-4xl mb-4">{icon}</div>
                  <h3 className="text-lg font-display font-bold text-white mb-3">{title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ─────────────────────────────────────────────────────────── */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-accent-blue/10 via-accent-cyan/5 to-accent-indigo/10 border border-accent-cyan/20 rounded-3xl p-12 text-center overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-accent-cyan/20 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-display font-black text-white mb-4">
                Ready to Secure Your Health Data?
              </h2>
              <p className="text-text-secondary mb-8 max-w-xl mx-auto">
                Join thousands of patients and doctors on the decentralized healthcare network. No central server. No data broker. Just you.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="px-10 py-4 rounded-2xl bg-gradient-to-r from-accent-blue to-accent-cyan text-white font-bold hover:opacity-90 transition-opacity shadow-2xl shadow-accent-cyan/30 hover:-translate-y-0.5 transition-transform">
                  Create Free Account
                </Link>
                <Link to="/login" className="px-10 py-4 rounded-2xl bg-medichain-surface/50 border border-medichain-border text-white font-semibold hover:border-accent-cyan/30 transition-all">
                  Sign In →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-medichain-border py-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="font-display font-bold text-white">MediChain</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Blockchain-Based EHR System with AI-Assisted Medical Insights
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Platform</p>
              <div className="space-y-2">
                {[['/',  'Home'],['#features','Features'],['#security','Security'],['#governance','Governance']].map(([href,label]) => (
                  <a key={label} href={href} className="block text-xs text-text-secondary hover:text-white transition-colors">{label}</a>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Technology</p>
              <div className="space-y-2">
                {['Ethereum','Solidity','IPFS / Pinata','React','Node.js / Express','Python / Flask'].map(tech => (
                  <p key={tech} className="text-xs text-text-secondary">{tech}</p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Resources</p>
              <div className="space-y-2">
                {[['#','GitHub Repository'],['#','API Documentation'],['#','Smart Contract'],['#','Whitepaper']].map(([href,label]) => (
                  <a key={label} href={href} className="block text-xs text-text-secondary hover:text-white transition-colors">{label}</a>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-medichain-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-secondary">
              © 2025 MediChain Protocol · Built on Ethereum · VTU Final Year Project
            </p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
              <span className="text-xs font-mono text-text-secondary">Network: Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
