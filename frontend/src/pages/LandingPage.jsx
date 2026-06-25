import React from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import FuturisticButton from '../components/FuturisticButton';

const LandingPage = () => {
  return (
    <div className="bg-medichain-bg-dark text-text-primary min-h-screen relative overflow-hidden flex flex-col">
      
      {/* Background Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent-blue/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-[10%] right-[-10%] w-[500px] h-[500px] bg-accent-indigo/10 rounded-full blur-[150px]"></div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 border-b border-medichain-border bg-medichain-bg-dark/60 backdrop-blur-xl px-4 py-4 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center neon-glow">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="text-2xl font-display font-bold tracking-tight">MediChain</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-text-secondary hover:text-accent-cyan transition-colors">Features</a>
            <a href="#security" className="text-sm font-medium text-text-secondary hover:text-accent-cyan transition-colors">Security</a>
            <a href="#governance" className="text-sm font-medium text-text-secondary hover:text-accent-cyan transition-colors">Governance</a>
        </nav>

        <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-white transition-colors">Login</Link>
            <Link to="/register">
              <FuturisticButton className="py-2 scale-90">Start Journey</FuturisticButton>
            </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-4 md:px-12 flex flex-col items-center text-center">
        <div className="max-w-4xl space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full glass-card border-accent-cyan/30 text-[10px] uppercase tracking-[0.2em] text-accent-cyan mb-4 animate-glow-pulse">
            Next-Gen Healthcare Protocol
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight">
             The <span className="bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-indigo bg-clip-text text-transparent">Sovereign Pulse</span> of Healthcare
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto">
            Secure, decentralized, and immutable. Your medical identity, doctors, and prescriptions — fully owned by you on the blockchain.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link to="/register">
              <FuturisticButton className="px-10 py-4 text-lg">Launch Network</FuturisticButton>
            </Link>
            <FuturisticButton variant="secondary" className="px-10 py-4 text-lg">Read Whitepaper</FuturisticButton>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="mt-24 w-full max-w-5xl px-4 relative">
           <GlassCard glowBorder={true} className="aspect-video bg-medichain-surface/10 rounded-[2rem] overflow-hidden flex items-center justify-center backdrop-blur-3xl group">
              <div className="absolute inset-0 bg-gradient-to-t from-medichain-bg-dark/80 to-transparent z-10"></div>
              {/* Abstract Holographic UI pieces */}
              <div className="relative z-20 w-full h-full p-12 grid grid-cols-2 md:grid-cols-4 gap-6 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="glass-card h-32 animate-[float_4s_ease-in-out_infinite] border-accent-blue/40"></div>
                  <div className="glass-card h-40 animate-[float_6s_ease-in-out_infinite_1s] border-accent-cyan/40"></div>
                  <div className="glass-card h-24 animate-[float_5s_ease-in-out_infinite_0.5s] border-accent-indigo/40"></div>
                  <div className="glass-card h-48 animate-[float_7s_ease-in-out_infinite_2s] border-status-success/40"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center z-30">
                 <div className="w-32 h-32 rounded-full bg-accent-blue/20 blur-2xl animate-pulse"></div>
                 <div className="w-24 h-24 rounded-full border border-accent-cyan/50 animate-ping"></div>
              </div>
           </GlassCard>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-medichain-border bg-medichain-surface/5">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <h3 className="text-4xl font-display font-bold text-accent-blue mb-2">1M+</h3>
              <p className="text-xs text-text-secondary uppercase tracking-widest">Medical Records Secured</p>
            </div>
            <div>
              <h3 className="text-4xl font-display font-bold text-accent-cyan mb-2">0</h3>
              <p className="text-xs text-text-secondary uppercase tracking-widest">Data Breaches to Date</p>
            </div>
            <div>
              <h3 className="text-4xl font-display font-bold text-accent-indigo mb-2">500+</h3>
              <p className="text-xs text-text-secondary uppercase tracking-widest">Verified Hospitals Network</p>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 mt-auto border-t border-medichain-border text-center">
        <p className="text-sm text-text-secondary">© 2024 MediChain Protocol. Secured by Ethereum.</p>
      </header>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}} />
    </div>
  );
};

export default LandingPage;
