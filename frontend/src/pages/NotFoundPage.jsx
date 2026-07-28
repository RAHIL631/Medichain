// frontend/src/pages/NotFoundPage.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NotFoundPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const getDashboardPath = () => {
    if (!isAuthenticated || !user) return '/login';
    if (user.role === 'patient')  return '/patient-dashboard';
    if (user.role === 'doctor')   return '/doctor-dashboard';
    if (user.role === 'hospital') return '/hospital-dashboard';
    if (user.role === 'admin')    return '/admin-dashboard';
    return '/login';
  };

  return (
    <div className="min-h-screen bg-medichain-bg-dark flex items-center justify-center relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent-blue/5 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-accent-indigo/5 rounded-full blur-[120px]" />

      <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
        {/* Glowing 404 */}
        <div className="relative mb-8 select-none">
          <p className="text-[10rem] md:text-[14rem] font-display font-black leading-none bg-gradient-to-b from-accent-cyan/30 to-transparent bg-clip-text text-transparent">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-40 h-40 md:w-56 md:h-56 rounded-full bg-accent-cyan/5 border border-accent-cyan/10 flex items-center justify-center">
              <svg className="w-20 h-20 md:w-28 md:h-28 text-accent-cyan/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-text-secondary text-lg mb-10 max-w-md mx-auto">
          The blockchain route you are looking for doesn't exist or has been moved to another block.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-8 py-3 rounded-xl bg-medichain-surface border border-medichain-border text-text-secondary hover:text-white hover:border-accent-cyan/30 transition-all duration-300 font-medium"
          >
            ← Go Back
          </button>
          <Link
            to={getDashboardPath()}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-accent-cyan text-white font-semibold hover:opacity-90 transition-opacity duration-300 shadow-lg shadow-accent-cyan/20"
          >
            Return to Dashboard
          </Link>
          <Link
            to="/"
            className="px-8 py-3 rounded-xl bg-medichain-surface border border-medichain-border text-text-secondary hover:text-white hover:border-accent-cyan/30 transition-all duration-300 font-medium"
          >
            Home
          </Link>
        </div>

        {/* Status indicator */}
        <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-medichain-surface border border-medichain-border">
          <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
          <span className="text-xs text-text-secondary font-mono">MediChain Network: Operational</span>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
