// frontend/src/components/WalletSetup.jsx
// MediChain — Healthcare identity setup (light theme)
// Preserved: all blockchain logic, hook APIs
// Changed: visual shell only
import React, { useState, useEffect } from 'react';
import useWallet from '../hooks/useWallet';
import { useAuth } from '../context/AuthContext';
import { Activity, CheckCircle, AlertCircle, Shield } from 'lucide-react';

const TARGET = Number(process.env.REACT_APP_TARGET_CHAIN_ID) || 11155111;

export default function WalletSetup() {
  const {
    account, connected, chainId,
    connect, switchNetwork,
    error: walletError, isLoading: connecting,
    network,
  } = useWallet();

  const { user, updateWallet } = useAuth();
  const [linking, setLinking]     = useState(false);
  const [linked, setLinked]       = useState(false);
  const [linkError, setLinkError] = useState('');

  const isCorrectNetwork = chainId === TARGET;
  const networkName = network?.name || (chainId ? `Chain ${chainId}` : 'Unknown');

  useEffect(() => {
    if (user?.walletAddress) setLinked(true);
  }, [user]);

  const handleLink = async () => {
    if (!account) return;
    setLinking(true);
    setLinkError('');
    try {
      await updateWallet(account);
      setLinked(true);
    } catch (err) {
      setLinkError(err.message || 'Could not link wallet.');
    } finally {
      setLinking(false);
    }
  };

  const steps = [
    { n: 1, label: 'Connect',   done: connected },
    { n: 2, label: 'Authorize', done: connected && isCorrectNetwork },
    { n: 3, label: 'Complete',  done: linked },
  ];

  if (linked && connected && isCorrectNetwork) {
    return (
      <div className="hc-card p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-hc-success-soft flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-hc-success" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-hc-text">Healthcare identity verified</p>
          <p className="text-xs text-hc-text-muted font-mono mt-0.5">
            {account?.slice(0,6)}…{account?.slice(-4)} &middot; Sepolia ({TARGET})
          </p>
        </div>
        <span className="hc-badge hc-badge-success">Verified</span>
      </div>
    );
  }

  return (
    <div className="hc-card p-6">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-hc-violet-soft flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-hc-violet" />
        </div>
        <div>
          <h3 className="text-base font-bold text-hc-text">Secure your healthcare identity</h3>
          <p className="text-sm text-hc-text-muted mt-0.5">
            Connect your MetaMask wallet to enable blockchain-verified health records.
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
      {connected && !isCorrectNetwork && (
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
      {!connected ? (
        <button onClick={connect} disabled={connecting} className="hc-btn hc-btn-primary w-full">
          <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-5 h-5" />
          {connecting ? 'Connecting…' : 'Connect MetaMask Wallet'}
        </button>
      ) : !isCorrectNetwork ? (
        <button onClick={() => switchNetwork(TARGET)} className="hc-btn hc-btn-primary w-full">
          <Shield className="w-4 h-4" /> Switch to Sepolia Testnet
        </button>
      ) : !linked ? (
        <button onClick={handleLink} disabled={linking} className="hc-btn hc-btn-primary w-full">
          <CheckCircle className="w-4 h-4" />
          {linking ? 'Verifying…' : 'Authorize Healthcare Identity'}
        </button>
      ) : null}

      {connected && (
        <p className="text-xs text-hc-text-muted text-center mt-3">
          Connected: <span className="font-mono">{account?.slice(0,6)}…{account?.slice(-4)}</span>
        </p>
      )}
      <p className="text-xs text-hc-text-light text-center mt-2">Your private key never leaves your device.</p>
    </div>
  );
}
