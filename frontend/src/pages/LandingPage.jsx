// frontend/src/pages/LandingPage.jsx
// MediChain — Premium light healthcare landing page with real clinical photography
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  HOSPITAL_IMAGES, MEDICINE_IMAGES, MEDICAL_IMAGES
} from '../utils/images';
import {
  Shield, Lock, Brain, Database, CheckCircle, ArrowRight,
  Activity, FileText, Pill, Building2
} from 'lucide-react';

// ── Hero & Feature Images ───────────────────────────────────────────────────
const HERO_IMG   = 'https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?w=900&q=80&auto=format&fit=crop';
const EDIT_IMG1  = 'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=700&q=80&auto=format&fit=crop';
const EDIT_IMG2  = 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=700&q=80&auto=format&fit=crop';

// ── Feature card ─────────────────────────────────────────────────────────────
const FeatureCard = ({ icon: Icon, title, desc, accent = 'blue', num, image }) => {
  const accents = {
    blue:   'bg-hc-blue-soft    text-hc-blue',
    teal:   'bg-hc-teal-soft    text-hc-teal',
    violet: 'bg-hc-violet-soft  text-hc-violet',
    success:'bg-hc-success-soft text-hc-success',
  };
  return (
    <div className="hc-card overflow-hidden group hover:shadow-hc-card-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      {image && (
        <div className="relative w-full h-36 sm:h-40 overflow-hidden bg-hc-bg-alt flex-shrink-0">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <span className="absolute bottom-2.5 right-3 text-xs font-bold text-white/90 font-mono">
            {String(num).padStart(2,'0')}
          </span>
        </div>
      )}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${accents[accent] || accents.blue}`}>
              <Icon className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-hc-text leading-snug">{title}</h3>
          </div>
          <p className="text-xs sm:text-sm text-hc-text-muted leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  );
};

// ── Trust chip ───────────────────────────────────────────────────────────────
const TrustChip = ({ icon: Icon, label, sub }) => (
  <div className="flex items-center gap-3 p-3.5 sm:p-4 hc-card">
    <div className="w-10 h-10 rounded-xl bg-hc-blue-soft flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-hc-blue" />
    </div>
    <div className="min-w-0">
      <p className="text-xs sm:text-sm font-bold text-hc-text leading-tight truncate">{label}</p>
      <p className="text-[11px] sm:text-xs text-hc-text-muted mt-0.5 truncate">{sub}</p>
    </div>
  </div>
);

// ── Step ─────────────────────────────────────────────────────────────────────
const Step = ({ num, title, desc, last }) => (
  <div className="flex flex-col items-center text-center flex-1 min-w-0 relative">
    <div className="w-12 h-12 rounded-full bg-hc-blue text-white flex items-center justify-center text-lg font-bold mb-3 sm:mb-4 shadow-hc-card flex-shrink-0 z-10">
      {num}
    </div>
    {!last && (
      <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] right-0 h-px bg-hc-border-light" aria-hidden="true" />
    )}
    <h4 className="text-sm sm:text-base font-bold text-hc-text mb-1">{title}</h4>
    <p className="text-xs sm:text-sm text-hc-text-muted leading-relaxed max-w-xs md:max-w-44">{desc}</p>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [imgLoaded, setImgLoaded] = useState(false);

  const features = [
    { Icon: FileText,    title: 'Secure Health Records',        desc: 'All medical records stored on decentralized IPFS with end-to-end cryptographic verification.', accent: 'blue',    num: 1, image: MEDICAL_IMAGES.lab },
    { Icon: Lock,        title: 'Patient-Controlled Access',    desc: 'You decide who sees your health data. Grant or revoke access instantly via smart contracts.',   accent: 'teal',    num: 2, image: EDIT_IMG1 },
    { Icon: Brain,       title: 'AI Health Insights',           desc: 'Clinical AI analyzes health patterns, risks, and provides evidence-based guidance.',          accent: 'violet',  num: 3, image: MEDICAL_IMAGES.mri },
    { Icon: Pill,        title: 'Drug & Dosage Safety',         desc: 'Real-time multi-drug interaction checking to catch conflicting prescriptions instantly.',        accent: 'success', num: 4, image: MEDICINE_IMAGES.pills },
    { Icon: Activity,    title: 'Blockchain Integrity',         desc: 'Every diagnostic record anchored on Ethereum Sepolia with tamper-proof cryptographic proofs.',   accent: 'blue',    num: 5, image: MEDICAL_IMAGES.blood_test },
    { Icon: Database,    title: 'Decentralized Storage',        desc: 'Immutable distributed storage on IPFS — zero single point of failure and true patient ownership.', accent: 'teal',    num: 6, image: MEDICAL_IMAGES.xray },
  ];

  const trust = [
    { Icon: Lock,     label: 'Patient-controlled access',  sub: 'You decide who sees data'      },
    { Icon: Shield,   label: 'Secure records',              sub: 'Encrypted end-to-end'          },
    { Icon: Brain,    label: 'AI-assisted insights',        sub: 'Evidence-based guidance'       },
    { Icon: Activity, label: 'Blockchain integrity',        sub: 'Ethereum Sepolia verified'     },
  ];

  const steps = [
    { num: 1, title: 'Create your account',           desc: 'Sign up as a patient, doctor, or healthcare organization.'           },
    { num: 2, title: 'Verify your identity',           desc: 'Confirm your email and complete verification.'                       },
    { num: 3, title: 'Optional wallet connect',        desc: 'Link MetaMask whenever you need on-chain verified records.'           },
    { num: 4, title: 'Manage records securely',        desc: 'Upload, view, and control access to all your health data.',  last: true },
  ];

  const security = [
    { Icon: Lock,        label: 'End-to-end encryption'        },
    { Icon: Shield,      label: 'Smart contract access control' },
    { Icon: Activity,    label: 'Blockchain integrity'          },
    { Icon: Database,    label: 'IPFS decentralized storage'    },
    { Icon: CheckCircle, label: 'Patient authorization'         },
  ];

  const partnerHospitals = [
    { name: 'Apollo Hospitals',       city: 'National Network', image: HOSPITAL_IMAGES.apollo },
    { name: 'Fortis Healthcare',      city: 'Delhi & NCR',       image: HOSPITAL_IMAGES.fortis },
    { name: 'AIIMS Medical Institute',city: 'New Delhi',         image: HOSPITAL_IMAGES.aiims },
    { name: 'Manipal Health Network', city: 'Bangalore & Pune',  image: HOSPITAL_IMAGES.manipal },
  ];

  return (
    <div className="min-h-screen bg-hc-bg flex flex-col">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-hc-surface border-b border-hc-border-light overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">

            {/* Left — copy */}
            <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-hc-blue-soft border border-hc-blue-mid text-hc-blue text-xs font-semibold mb-4 sm:mb-6">
                <Activity className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Blockchain-secured healthcare platform</span>
              </div>

              <h1 className="hc-hero-title mb-4 sm:mb-6">
                Your Health Records.<br />
                <span className="text-hc-blue">Under Your Control.</span>
              </h1>

              <p className="text-sm sm:text-base text-hc-text-muted leading-relaxed mb-6 sm:mb-8 max-w-lg mx-auto lg:mx-0">
                MediChain combines secure digital health records, patient-controlled access,
                AI-assisted insights, and decentralized technology in one trusted healthcare platform.
              </p>

              {/* CTAs - full width stacked on mobile */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 mb-8 sm:mb-10">
                <Link to="/register" className="hc-btn hc-btn-primary hc-btn-lg justify-center w-full sm:w-auto">
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#features" className="hc-btn hc-btn-ghost hc-btn-lg justify-center w-full sm:w-auto">
                  Explore MediChain
                </a>
              </div>

              {/* Trust pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2">
                {['Private by design', 'No data brokers', 'Patient-owned'].map(label => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-hc-text-muted font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-hc-success flex-shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — hero image */}
            <div className="relative max-w-lg mx-auto lg:max-w-none w-full">
              <div className="relative rounded-2xl overflow-hidden shadow-hc-card-lg aspect-[4/3] sm:aspect-[16/10] bg-hc-bg-alt border border-hc-border-light">
                {!imgLoaded && <div className="absolute inset-0 hc-skeleton" />}
                <img
                  src={HERO_IMG}
                  alt="Doctor consulting with patient using digital healthcare platform"
                  className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImgLoaded(true)}
                  loading="eager"
                />
                {/* Blockchain identity badge overlay */}
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 bg-hc-surface/95 backdrop-blur-sm rounded-xl p-2.5 sm:p-3 flex items-center gap-2.5 shadow-hc-card max-w-[calc(100%-1.5rem)] border border-hc-border-light">
                  <div className="w-8 h-8 rounded-lg bg-hc-violet-soft flex items-center justify-center flex-shrink-0">
                    <Activity className="w-4 h-4 text-hc-violet" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-hc-text leading-none truncate">Blockchain Verified</p>
                    <p className="text-[9px] sm:text-[10px] text-hc-text-muted mt-0.5 truncate">Ethereum Sepolia · 11155111</p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-hc-success ml-1 flex-shrink-0 animate-pulse" />
                </div>
              </div>
              {/* Decorative blob */}
              <div className="hidden sm:block absolute -top-6 -right-6 w-40 h-40 bg-hc-blue-soft rounded-full -z-10" aria-hidden="true" />
              <div className="hidden sm:block absolute -bottom-6 -left-6 w-28 h-28 bg-hc-teal-soft rounded-full -z-10" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <section className="py-8 sm:py-10 bg-hc-bg border-b border-hc-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-[11px] sm:text-xs font-bold text-hc-text-muted uppercase tracking-widest mb-5 sm:mb-6">
            Built around privacy, transparency and patient sovereign control
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {trust.map(({ Icon, label, sub }) => (
              <TrustChip key={label} icon={Icon} label={label} sub={sub} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-12 sm:py-20 bg-hc-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="hc-section-title mb-3 sm:mb-4">Everything you need for secure health records</h2>
            <p className="text-sm sm:text-base text-hc-text-muted max-w-xl mx-auto leading-relaxed">
              A complete platform built for patients, doctors, and healthcare organizations with real-time auditability.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {features.map(({ Icon, title, desc, accent, num, image }) => (
              <FeatureCard key={num} icon={Icon} title={title} desc={desc} accent={accent} num={num} image={image} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Real Hospital Network Gallery ─────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-hc-bg border-y border-hc-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-hc-blue uppercase tracking-wider mb-1">
                <Building2 className="w-4 h-4" /> Connected Clinical Institutions
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-hc-text">Hospital & Diagnostic Network</h2>
            </div>
            <p className="text-xs sm:text-sm text-hc-text-muted max-w-sm">
              Authentic diagnostic findings securely anchored on decentralized storage across premier clinical networks.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {partnerHospitals.map(h => (
              <div key={h.name} className="hc-card overflow-hidden group hover:shadow-hc-card-md transition-all">
                <div className="h-32 sm:h-36 overflow-hidden relative bg-hc-bg-alt">
                  <img
                    src={h.image}
                    alt={h.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <span className="absolute bottom-2.5 left-3 text-[11px] font-bold text-white drop-shadow-sm">
                    {h.city}
                  </span>
                </div>
                <div className="p-3.5 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-hc-text truncate">{h.name}</span>
                  <span className="w-2 h-2 rounded-full bg-hc-success flex-shrink-0 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-12 sm:py-20 bg-hc-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="hc-section-title mb-3 sm:mb-4">Get started in four simple steps</h2>
            <p className="text-sm sm:text-base text-hc-text-muted">Easy for patients. Efficient for doctors.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-4">
            {steps.map(({ num, title, desc, last }) => (
              <Step key={num} num={num} title={title} desc={desc} last={last} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Real photos editorial ─────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 bg-hc-bg border-t border-hc-border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="hc-section-title mb-3 sm:mb-4">
                Designed for real healthcare workflows
              </h2>
              <p className="text-sm sm:text-base text-hc-text-muted leading-relaxed mb-6">
                Whether you're a patient managing your own records, a doctor tracking patient history,
                or a hospital managing access — MediChain is built to fit your workflow.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Patients own and control their sovereign health data',
                  'Doctors access records securely with cryptographic permission',
                  'AI-assisted health risk analysis and drug safety audits',
                  'Blockchain provides immutable, tamper-proof audit trails',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5 text-xs sm:text-sm text-hc-text-muted">
                    <CheckCircle className="w-4 h-4 text-hc-success flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div>
                <Link to="/register" className="hc-btn hc-btn-primary w-full sm:w-auto justify-center">
                  Start for free <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-6 md:mt-0">
              <div className="rounded-2xl overflow-hidden shadow-hc-card aspect-square bg-hc-bg-alt border border-hc-border-light">
                <img
                  src={EDIT_IMG1}
                  alt="Healthcare professional reviewing patient data"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-hc-card aspect-square bg-hc-bg-alt mt-4 sm:mt-8 border border-hc-border-light">
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
      <section id="security" className="py-12 sm:py-20 bg-hc-navy text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-snug">
                Healthcare data deserves<br />more than a password.
              </h2>
              <p className="text-sm sm:text-base text-hc-text-light leading-relaxed mb-6 sm:mb-8">
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
            <div className="hc-card p-5 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-hc-violet-soft flex items-center justify-center flex-shrink-0">
                  <Activity className="w-5 h-5 text-hc-violet" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-hc-text truncate">Blockchain Identity</p>
                  <p className="text-xs text-hc-text-muted truncate">Ethereum Sepolia Network</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-hc-success font-medium flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-hc-success" />
                  Active
                </div>
              </div>
              <div className="space-y-2.5">
                {['Wallet verified', 'IPFS storage active', 'Smart contract deployed', 'Access control enabled'].map(item => (
                  <div key={item} className="flex items-center gap-2.5 p-3 rounded-xl bg-hc-bg-alt">
                    <CheckCircle className="w-4 h-4 text-hc-success flex-shrink-0" />
                    <span className="text-xs sm:text-sm text-hc-text font-medium">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] sm:text-xs text-hc-text-muted mt-4 text-center leading-relaxed">
                AI-assisted insight — not a medical diagnosis. Always consult your healthcare provider.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-20 bg-hc-bg">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="hc-section-title mb-3 sm:mb-4">Take control of your health records today</h2>
          <p className="text-sm sm:text-base text-hc-text-muted mb-6 sm:mb-8 leading-relaxed max-w-lg mx-auto">
            Join MediChain and experience healthcare data management built around patient privacy and control.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/register" className="hc-btn hc-btn-primary hc-btn-lg justify-center w-full sm:w-auto">
              Create free account
            </Link>
            <Link to="/login" className="hc-btn hc-btn-ghost hc-btn-lg justify-center w-full sm:w-auto">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="bg-hc-surface border-t border-hc-border py-8 sm:py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-hc-blue rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-hc-text">MediChain</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {['Privacy', 'Terms', 'Security'].map(label => (
                <span key={label} className="text-xs sm:text-sm text-hc-text-muted cursor-pointer hover:text-hc-text transition-colors">{label}</span>
              ))}
            </div>
            <p className="text-[11px] sm:text-xs text-hc-text-muted">
              © {new Date().getFullYear()} MediChain. Ethereum Sepolia · Chain ID 11155111
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
