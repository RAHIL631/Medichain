// frontend/src/pages/LandingPage.jsx
// MediChain — Premium light healthcare landing page
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  Shield, Lock, Brain, Database, CheckCircle, ArrowRight,
  Activity, FileText
} from 'lucide-react';

// ── Hero image (Unsplash - free commercial use) ───────────────────────────────
const HERO_IMG   = 'https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?w=900&q=80&auto=format&fit=crop';
const EDIT_IMG1  = 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=700&q=80&auto=format&fit=crop';
const EDIT_IMG2  = 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=700&q=80&auto=format&fit=crop';

// ── Feature card ─────────────────────────────────────────────────────────────
const FeatureCard = ({ icon: Icon, title, desc, accent = 'blue', num }) => {
  const accents = {
    blue:   'bg-hc-blue-soft    text-hc-blue',
    teal:   'bg-hc-teal-soft    text-hc-teal',
    violet: 'bg-hc-violet-soft  text-hc-violet',
    success:'bg-hc-success-soft text-hc-success',
  };
  return (
    <div className="hc-card p-6 group hover:shadow-hc-card-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accents[accent] || accents.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold text-hc-border-light">{String(num).padStart(2,'0')}</span>
      </div>
      <h3 className="text-base font-semibold text-hc-text mb-2 leading-snug">{title}</h3>
      <p className="text-sm text-hc-text-muted leading-relaxed">{desc}</p>
    </div>
  );
};

// ── Trust chip ───────────────────────────────────────────────────────────────
const TrustChip = ({ icon: Icon, label, sub }) => (
  <div className="flex items-center gap-3 p-4 hc-card">
    <div className="w-10 h-10 rounded-xl bg-hc-blue-soft flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-hc-blue" />
    </div>
    <div>
      <p className="text-sm font-semibold text-hc-text leading-none">{label}</p>
      <p className="text-xs text-hc-text-muted mt-0.5">{sub}</p>
    </div>
  </div>
);

// ── Step ─────────────────────────────────────────────────────────────────────
const Step = ({ num, title, desc, last }) => (
  <div className="flex flex-col items-center text-center flex-1 min-w-0 relative">
    <div className="w-12 h-12 rounded-full bg-hc-blue text-white flex items-center justify-center text-lg font-bold mb-4 shadow-hc-card flex-shrink-0 z-10">
      {num}
    </div>
    {!last && (
      <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] right-0 h-px bg-hc-border-light" aria-hidden="true" />
    )}
    <h4 className="text-sm font-semibold text-hc-text mb-1">{title}</h4>
    <p className="text-xs text-hc-text-muted leading-relaxed max-w-36">{desc}</p>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [imgLoaded, setImgLoaded] = useState(false);

  const features = [
    { Icon: FileText,    title: 'Secure Health Records',        desc: 'All your medical records stored securely and accessible only to you and authorized providers.',              accent: 'blue',    num: 1 },
    { Icon: Lock,        title: 'Patient-Controlled Access',    desc: 'You decide who sees your health data. Grant or revoke access instantly — no intermediaries.',              accent: 'teal',    num: 2 },
    { Icon: Brain,       title: 'AI Health Insights',           desc: 'AI-assisted analysis of your health data. Understand risks and get evidence-based health guidance.',        accent: 'violet',  num: 3 },
    { Icon: Shield,      title: 'Drug & Dosage Safety',         desc: 'Real-time medication safety checking. Detect interactions and dosage risks before they become problems.',    accent: 'success', num: 4 },
    { Icon: Activity,    title: 'Blockchain Integrity',         desc: 'Every record is anchored on Ethereum Sepolia. Immutable, timestamped, tamper-proof by design.',             accent: 'blue',    num: 5 },
    { Icon: Database,    title: 'Decentralized Storage',        desc: 'Records stored on IPFS — no single point of failure, no central server that owns your data.',               accent: 'teal',    num: 6 },
  ];

  const trust = [
    { Icon: Lock,     label: 'Patient-controlled access',  sub: 'You decide who sees your data'  },
    { Icon: Shield,   label: 'Secure records',              sub: 'Encrypted end-to-end'           },
    { Icon: Brain,    label: 'AI-assisted insights',        sub: 'Evidence-based, not prescriptive'},
    { Icon: Activity, label: 'Blockchain integrity',        sub: 'Ethereum Sepolia verified'       },
  ];

  const steps = [
    { num: 1, title: 'Create your account',           desc: 'Sign up as a patient, doctor, or healthcare organization.'           },
    { num: 2, title: 'Verify your identity',           desc: 'Confirm your email and complete verification.'                       },
    { num: 3, title: 'Connect your wallet',            desc: 'Link MetaMask to create your blockchain health identity.'             },
    { num: 4, title: 'Manage your records securely',   desc: 'Upload, view, and control access to all your health data.',  last: true },
  ];

  const security = [
    { Icon: Lock,        label: 'End-to-end encryption'     },
    { Icon: Shield,      label: 'Smart contract access control'},
    { Icon: Activity,    label: 'Blockchain integrity'       },
    { Icon: Database,    label: 'IPFS decentralized storage' },
    { Icon: CheckCircle, label: 'Patient authorization'      },
  ];

  return (
    <div className="min-h-screen bg-hc-bg">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-hc-surface border-b border-hc-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left — copy */}
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-hc-blue-soft border border-hc-blue-mid text-hc-blue text-xs font-semibold mb-6">
                <Activity className="w-3 h-3" />
                Blockchain-secured healthcare platform
              </div>

              <h1 className="text-4xl lg:text-5xl font-bold text-hc-text leading-tight mb-6">
                Your Health Records.<br />
                <span className="text-hc-blue">Under Your Control.</span>
              </h1>

              <p className="text-base text-hc-text-muted leading-relaxed mb-8 max-w-md">
                MediChain combines secure digital health records, patient-controlled access,
                AI-assisted insights, and decentralized technology in one trusted healthcare platform.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link to="/register" className="hc-btn hc-btn-primary hc-btn-lg">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#features" className="hc-btn hc-btn-ghost hc-btn-lg">
                  Explore MediChain
                </a>
              </div>

              {/* Trust pills */}
              <div className="flex flex-wrap gap-3">
                {['Private by design', 'No data brokers', 'Patient-owned'].map(label => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-hc-text-muted">
                    <CheckCircle className="w-3.5 h-3.5 text-hc-success" />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right — hero image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-hc-card-lg aspect-[4/3] bg-hc-bg-alt">
                {!imgLoaded && <div className="absolute inset-0 hc-skeleton" />}
                <img
                  src={HERO_IMG}
                  alt="Doctor consulting with patient using digital healthcare platform"
                  className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImgLoaded(true)}
                  loading="eager"
                />
                {/* Blockchain identity badge overlay */}
                <div className="absolute bottom-4 left-4 bg-hc-surface/95 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2 shadow-hc-card">
                  <div className="w-7 h-7 rounded-lg bg-hc-violet-soft flex items-center justify-center">
                    <Activity className="w-4 h-4 text-hc-violet" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-hc-text leading-none">Blockchain Verified</p>
                    <p className="text-[9px] text-hc-text-muted mt-0.5">Ethereum Sepolia · 11155111</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-hc-success ml-1 flex-shrink-0" />
                </div>
              </div>
              {/* Decorative blob */}
              <div className="absolute -top-6 -right-6 w-40 h-40 bg-hc-blue-soft rounded-full -z-10" aria-hidden="true" />
              <div className="absolute -bottom-6 -left-6 w-28 h-28 bg-hc-teal-soft rounded-full -z-10" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <section className="py-10 bg-hc-bg border-b border-hc-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-hc-text-muted uppercase tracking-widest mb-6">
            Built around privacy, transparency and patient control
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {trust.map(({ Icon, label, sub }) => (
              <TrustChip key={label} icon={Icon} label={label} sub={sub} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-hc-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-hc-text mb-4">Everything you need for secure health records</h2>
            <p className="text-base text-hc-text-muted max-w-xl mx-auto leading-relaxed">
              A complete platform built for patients, doctors, and healthcare organizations.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ Icon, title, desc, accent, num }) => (
              <FeatureCard key={num} icon={Icon} title={title} desc={desc} accent={accent} num={num} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-hc-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-hc-text mb-4">Get started in four simple steps</h2>
            <p className="text-base text-hc-text-muted">Easy for patients. Efficient for doctors.</p>
          </div>
          <div className="flex flex-col md:flex-row gap-8 md:gap-4">
            {steps.map(({ num, title, desc, last }) => (
              <Step key={num} num={num} title={title} desc={desc} last={last} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Real photos editorial ─────────────────────────────────────────── */}
      <section className="py-20 bg-hc-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-hc-text mb-4 leading-snug">
                Designed for real healthcare workflows
              </h2>
              <p className="text-base text-hc-text-muted leading-relaxed mb-6">
                Whether you're a patient managing your own records, a doctor tracking patient history,
                or a hospital managing access — MediChain is built to fit your workflow.
              </p>
              <ul className="space-y-3">
                {[
                  'Patients own and control their data',
                  'Doctors access records securely with permission',
                  'AI-assisted health risk analysis',
                  'Blockchain provides tamper-proof audit trails',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-hc-text-muted">
                    <CheckCircle className="w-4 h-4 text-hc-success flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link to="/register" className="hc-btn hc-btn-primary">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl overflow-hidden shadow-hc-card aspect-square bg-hc-bg-alt">
                <img
                  src={EDIT_IMG1}
                  alt="Healthcare professional reviewing patient data"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-hc-card aspect-square bg-hc-bg-alt mt-8">
                <img
                  src={EDIT_IMG2}
                  alt="Doctor using digital health technology"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <section id="security" className="py-20 bg-hc-navy">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
                Healthcare data deserves<br />more than a password.
              </h2>
              <p className="text-hc-text-light leading-relaxed mb-8">
                MediChain layers encryption, blockchain integrity, patient authorization, and 
                decentralized storage to provide a level of data security appropriate for your health records.
              </p>
              <div className="space-y-3">
                {security.map(({ Icon, label }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-hc-blue/20 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-hc-blue-mid" />
                    </div>
                    <span className="text-sm font-medium text-white">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hc-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-hc-violet-soft flex items-center justify-center">
                  <Activity className="w-5 h-5 text-hc-violet" />
                </div>
                <div>
                  <p className="text-sm font-bold text-hc-text">Blockchain Identity</p>
                  <p className="text-xs text-hc-text-muted">Ethereum Sepolia Network</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs text-hc-success font-medium">
                  <div className="w-2 h-2 rounded-full bg-hc-success" />
                  Active
                </div>
              </div>
              <div className="space-y-3">
                {['Wallet verified', 'IPFS storage active', 'Smart contract deployed', 'Access control enabled'].map(item => (
                  <div key={item} className="flex items-center gap-2.5 p-3 rounded-xl bg-hc-bg-alt">
                    <CheckCircle className="w-4 h-4 text-hc-success flex-shrink-0" />
                    <span className="text-sm text-hc-text font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-hc-text-muted mt-4 text-center leading-relaxed">
                AI-assisted insight — not a medical diagnosis. Always consult your healthcare provider.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-20 bg-hc-bg">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-hc-text mb-4">Take control of your health records today</h2>
          <p className="text-base text-hc-text-muted mb-8 leading-relaxed">
            Join MediChain and experience healthcare data management built around patient privacy and control.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="hc-btn hc-btn-primary hc-btn-lg">
              Create free account
            </Link>
            <Link to="/login" className="hc-btn hc-btn-ghost hc-btn-lg">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-hc-surface border-t border-hc-border py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-hc-blue rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-hc-text">MediChain</span>
            </div>
            <div className="flex gap-6">
              {['Privacy', 'Terms', 'Security'].map(label => (
                <span key={label} className="text-sm text-hc-text-muted cursor-pointer hover:text-hc-text transition-colors">{label}</span>
              ))}
            </div>
            <p className="text-xs text-hc-text-muted">
              © {new Date().getFullYear()} MediChain. Ethereum Sepolia · Chain ID 11155111
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
