// c:\Users\Rahil hassan\OneDrive\Desktop\Major project\MediChain\frontend\src\components\Navbar.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ connectWallet, walletAddress }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper to highlight active routes
  const isActive = (path) => location.pathname === path;

  // Render navigation links dynamically based on user role
  const renderNavLinks = () => {
    if (!user) return null;

    if (user.role === 'patient') {
      return (
        <>
          <NavLink to="/patient-dashboard" active={isActive('/patient-dashboard')}>Dashboard</NavLink>
          <NavLink to="/records" active={isActive('/records')}>Records</NavLink>
          <NavLink to="/my-qr" active={isActive('/my-qr')}>My QR</NavLink>
          <NavLink to="/settings" active={isActive('/settings')}>Settings</NavLink>
        </>
      );
    }

    if (user.role === 'doctor' || user.role === 'hospital') {
      return (
        <>
          <NavLink to="/doctor-dashboard" active={isActive('/doctor-dashboard')}>Dashboard</NavLink>
          <NavLink to="/scan-qr" active={isActive('/scan-qr')}>Scan QR</NavLink>
          <NavLink to="/upload-record" active={isActive('/upload-record')}>Upload Record</NavLink>
        </>
      );
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 tracking-wide font-display">
                MediChain
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Middle */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-1">
              {renderNavLinks()}
            </div>
          )}

          {/* Right Section: Wallet, Notifications, Logout */}
          <div className="hidden md:flex items-center space-x-4">
            
            {/* Notification Bell */}
            {isAuthenticated && (
              <button className="p-2 text-gray-400 hover:text-cyan-400 transition-colors relative">
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
            )}

            {/* Wallet Badge */}
            {isAuthenticated && (
              walletAddress ? (
                <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 px-4 py-2 rounded-full shadow-inner">
                  <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  <span className="text-sm font-mono text-gray-300">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                </div>
              ) : (
                <button 
                  onClick={connectWallet}
                  className="bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-900/50 hover:border-cyan-500/50 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                >
                  Connect Wallet
                </button>
              )
            )}

            {/* Logout Button */}
            {isAuthenticated && (
              <button 
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors bg-gray-800/50 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-400 hover:text-white focus:outline-none p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${mobileMenuOpen ? 'max-h-96 border-b border-gray-800' : 'max-h-0'}`}>
        <div className="px-2 pt-2 pb-4 space-y-1 bg-gray-900/95 backdrop-blur-md">
          {isAuthenticated && (
            <>
              {renderNavLinks()}
              
              <div className="mt-4 pt-4 border-t border-gray-800">
                {walletAddress ? (
                  <div className="px-3 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-mono text-gray-300">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                  </div>
                ) : (
                  <button onClick={connectWallet} className="block w-full text-left px-3 py-2 text-cyan-400 font-medium hover:bg-gray-800 rounded-md">
                    Connect Wallet
                  </button>
                )}
                
                <button onClick={logout} className="block w-full text-left px-3 py-2 text-red-400 font-medium hover:bg-gray-800 rounded-md mt-1">
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// Internal NavLink helper component
const NavLink = ({ to, active, children }) => (
  <Link 
    to={to} 
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
      active 
        ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-800/50 shadow-[inset_0_0_10px_rgba(34,211,238,0.1)]' 
        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
    }`}
  >
    {children}
  </Link>
);

export default Navbar;
