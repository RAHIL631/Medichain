// frontend/src/pages/Login.jsx
// MediChain — Premium healthcare login page
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Shield, AlertCircle } from 'lucide-react';
import mediChainLogo from '../medichain-logo.png';

const SIDE_IMG = 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80&auto=format&fit=crop';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'patient') navigate('/patient-dashboard');
      else if (user.role === 'doctor' || user.role === 'hospital') navigate('/doctor-dashboard');
      else if (user.role === 'admin') navigate('/admin-dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      const role = data?.user?.role?.toLowerCase();
      if (role === 'patient') navigate('/patient-dashboard');
      else if (role === 'doctor' || role === 'hospital') navigate('/doctor-dashboard');
      else if (role === 'admin') navigate('/admin-dashboard');
      else navigate('/patient-dashboard');
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-hc-bg">
      {/* Left — healthcare photo */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden">
        <img
          src={SIDE_IMG}
          alt="Healthcare professional in modern medical facility"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-hc-navy/80 via-hc-navy/20 to-transparent" />
        <div className="absolute bottom-12 left-10 right-10">
          <div className="flex items-center gap-2 mb-4">
            <img src={mediChainLogo} alt="MediChain" className="h-8 w-auto object-contain" />
          </div>
          <h2 className="text-3xl font-bold text-white leading-snug mb-2">
            Secure, patient-controlled<br />healthcare records
          </h2>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Shield className="w-4 h-4 text-hc-teal" />
            Blockchain-verified · Patient-owned · Private by design
          </div>
        </div>
      </div>

      {/* Right — auth card */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-8">
            <img
              src={mediChainLogo}
              alt="MediChain"
              className="h-12 w-auto object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold text-hc-text mb-1">Welcome back</h1>
          <p className="text-sm text-hc-text-muted mb-8">Sign in to access your health records and dashboard.</p>

          {/* Error alert */}
          {error && (
            <div role="alert" className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-hc-danger-soft border border-hc-danger/20 text-sm text-hc-danger">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label htmlFor="email" className="hc-label">Email address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="hc-input"
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="hc-label">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="hc-input pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute inset-y-0 right-3 flex items-center text-hc-text-light hover:text-hc-text-muted transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="hc-btn-primary w-full mt-2 py-3"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-hc-border-light" />
            </div>
            <div className="relative flex justify-center text-xs text-hc-text-muted">
              <span className="bg-hc-bg px-3">Or continue with</span>
            </div>
          </div>

          {/* MetaMask */}
          <button
            type="button"
            onClick={() => alert('MetaMask wallet login — coming soon!')}
            className="hc-btn hc-btn-ghost w-full"
          >
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
              alt="MetaMask"
              className="w-5 h-5"
            />
            Connect MetaMask Wallet
          </button>

          {/* Register link */}
          <p className="mt-8 text-center text-sm text-hc-text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="text-hc-blue hover:text-hc-blue-hover font-semibold transition-colors">
              Create account
            </Link>
          </p>

          {/* Trust note */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-hc-text-light">
            <Shield className="w-3 h-3" />
            Your data is encrypted and private
          </div>
        </div>
      </div>
    </div>
  );
}
