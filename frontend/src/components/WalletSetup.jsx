// frontend/src/components/WalletSetup.jsx
// MediChain — Optional blockchain identity setup (light theme)
//
// This component is OPTIONAL. Users can choose not to connect.
// All blockchain logic (connect, switch network, link wallet) is preserved.
// Added: "Back to Dashboard" link for users who choose not to continue.

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWalletContext } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, AlertCircle, Shield, ArrowLeft } from 'lucide-react';

const TARGET = Number(process.env.REACT_APP_TARGET_CHAIN_ID) || 11155111;

export default function WalletSetup({ backPath = '/patient-dashboard' }) {
  const {
    address, isConnected, chainId,
    connectWallet, switchNetwork,
    error: walletError, isLoading: connecting,
    network,
  } = useWalletContext();

  const { user, updateWallet } = useAuth();
  const [linking,   setLinking]   = useState(false);
  const [linked,    setLinked]    = useState(false);
  const [linkError, setLinkError] = useState('');

  const isCorrectNetwork = chainId === TARGET;
  const networkName = network?.name || (chainId ? `Chain ${chainId}` : 'Unknown');

  useEffect(() => {
    if (user?.walletAddress) setLinked(true);
  }, [user]);

  const handleLink = async () => {
    if (!address) return;
    setLinking(true);
    setLinkError('');
    try {
      await updateWallet(address);
      setLinked(true);
    } catch (err) {
      setLinkError(err.message || 'Could not link wallet.');
    } finally {
      setLinking(false);
    }
  };

  const steps = [
    { n: 1, label: 'Connect Wallet',      done: isConnected },
    { n: 2, label: 'Sign Authorization',  done: isConnected && isCorrectNetwork },
    { n: 3, label: 'Identity Verified',   done: linked },
  ];

  if (linked && isConnected && isCorrectNetwork) {
    return (
      <div className="hc-card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-hc-success-soft flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-hc-success" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-hc-text">Healthcare identity verified</p>
          <p className="text-xs text-hc-text-muted font-mono mt-0.5">
            {address?.slice(0,6)}…{address?.slice(-4)} &middot; Sepolia ({TARGET})
          </p>
        </div>
        <span className="hc-badge hc-badge-success">Verified</span>
      </div>
    );
  }

  return (
    <div className="hc-card p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-hc-blue-soft flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-hc-blue" />
        </div>
        <div>
          <h3 className="text-base font-bold text-hc-text">Secure your healthcare identity</h3>
          <p className="text-sm text-hc-text-muted mt-0.5">
            Connect your wallet to establish a patient-controlled blockchain identity.
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map(({ n, label, done }, i) => (
          <React.Fragment key={n}>
            <div className="flex items-center gap-1.5">
              <div className={"w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors " +
                (done ? "bg-hc-success text-white" : "bg-hc-border text-hc-text-muted")}>
                {done ? <CheckCircle className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={"text-xs font-medium " + (done ? "text-hc-success" : "text-hc-text-muted")}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-hc-border-light" />}
          </React.Fragment>
        ))}
      </div>

      {/* Wrong network */}
      {isConnected && !isCorrectNetwork && (
        <div className="mb-4 p-3 rounded-xl bg-hc-warning-soft border border-hc-warning/20 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-hc-warning flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-hc-text">Wrong network</p>
            <p className="text-xs text-hc-text-muted mt-0.5">
              Switch to <strong>Sepolia Testnet</strong> (Chain ID {TARGET}).
              Currently on: {networkName}.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {(walletError || linkError) && (
        <div className="mb-4 p-3 rounded-xl bg-hc-danger-soft border border-hc-danger/20 text-xs text-hc-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {walletError || linkError}
        </div>
      )}

      {/* CTA */}
      {!isConnected ? (
        <button onClick={connectWallet} disabled={connecting} className="hc-btn hc-btn-primary w-full" id="wallet-setup-connect-btn">
          <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-5 h-5" />
          {connecting ? 'Connecting…' : 'Connect MetaMask Wallet'}
        </button>
      ) : !isCorrectNetwork ? (
        <button onClick={() => switchNetwork(TARGET)} className="hc-btn hc-btn-primary w-full" id="wallet-setup-switch-btn">
          <Shield className="w-4 h-4" /> Switch to Sepolia Testnet
        </button>
      ) : !linked ? (
        <button onClick={handleLink} disabled={linking} className="hc-btn hc-btn-primary w-full" id="wallet-setup-link-btn">
          <CheckCircle className="w-4 h-4" />
          {linking ? 'Verifying…' : 'Authorize Healthcare Identity'}
        </button>
      ) : null}

      {isConnected && (
        <p className="text-xs text-hc-text-muted text-center mt-3">
          Connected: <span className="font-mono">{address?.slice(0,6)}…{address?.slice(-4)}</span>
        </p>
      )}
      <p className="text-xs text-hc-text-light text-center mt-2">Your private key never leaves your device.</p>

      {/* Back to Dashboard — always visible */}
      <div className="mt-4 pt-4 border-t border-hc-border-light flex justify-center">
        <Link
          to={backPath}
          className="flex items-center gap-1.5 text-xs text-hc-text-muted hover:text-hc-text transition-colors"
          id="wallet-setup-back-btn"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
