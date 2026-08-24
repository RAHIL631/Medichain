// frontend/src/components/WalletConnectionModal.jsx
//
// Reusable modal that appears when a blockchain operation is attempted
// without a connected MetaMask wallet.
//
// Usage:
//   const [walletModalOpen, setWalletModalOpen] = useState(false);
//   const [walletModalAction, setWalletModalAction] = useState(null);
//
//   // Before a blockchain op:
//   if (!isConnected) {
//     setWalletModalAction(() => () => handleGrantAccess(addr));
//     setWalletModalOpen(true);
//     return;
//   }
//
//   <WalletConnectionModal
//     isOpen={walletModalOpen}
//     onClose={() => setWalletModalOpen(false)}
//     onConnected={walletModalAction}
//     operationLabel="grant doctor access"   // optional, shown in description
//   />

import React, { useState, useCallback } from 'react';
import { useWalletContext } from '../context/WalletContext';
import { Wallet, Shield, AlertCircle, X, ChevronRight, Loader } from 'lucide-react';

const TARGET_CHAIN_ID = Number(process.env.REACT_APP_TARGET_CHAIN_ID) || 11155111;
const SEPOLIA_NAME    = 'Sepolia Testnet';

export default function WalletConnectionModal({
  isOpen,
  onClose,
  onConnected,          // optional callback invoked after successful connect + network check
  operationLabel = 'perform this blockchain action',
}) {
  const { connectWallet, isConnected, chainId, switchNetwork, isLoading } = useWalletContext();
  const [localError, setLocalError] = useState('');
  const [connecting,  setConnecting]  = useState(false);
  const [switching,   setSwitching]   = useState(false);

  const onCorrectNetwork = chainId === TARGET_CHAIN_ID;

  const handleConnect = useCallback(async () => {
    setLocalError('');
    setConnecting(true);
    try {
      await connectWallet();
      // After connecting, check network
    } catch (err) {
      setLocalError(
        err.message?.includes('rejected') || err.code === 4001
          ? 'Connection rejected. Please approve the MetaMask request.'
          : err.message || 'Failed to connect wallet.'
      );
    } finally {
      setConnecting(false);
    }
  }, [connectWallet]);

  const handleSwitchNetwork = useCallback(async () => {
    setLocalError('');
    setSwitching(true);
    try {
      await switchNetwork(TARGET_CHAIN_ID);
    } catch (err) {
      setLocalError(
        err.message?.includes('rejected') || err.code === 4001
          ? 'Network switch rejected. Please approve in MetaMask.'
          : err.message || 'Failed to switch network.'
      );
    } finally {
      setSwitching(false);
    }
  }, [switchNetwork]);

  const handleProceed = useCallback(() => {
    if (onConnected) onConnected();
    onClose();
  }, [onConnected, onClose]);

  if (!isOpen) return null;

  // ── Determine which step we are on ───────────────────────────────────────
  // Step 1: not connected
  // Step 2: connected but wrong network
  // Step 3: connected + correct network → ready
  const step = !isConnected ? 1 : !onCorrectNetwork ? 2 : 3;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2, 6, 23, 0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Wallet connection required"
    >
      {/* Modal card */}
      <div className="hc-card w-full max-w-md p-6 relative animate-slide-up shadow-hc-card-lg">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-hc-text-muted hover:bg-hc-bg-alt transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon + header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-hc-blue-soft flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-hc-blue" />
          </div>
          <div>
            <h2 className="text-base font-bold text-hc-text">Wallet connection required</h2>
            <p className="text-xs text-hc-text-muted mt-1 leading-relaxed">
              Connect your MetaMask wallet to securely {operationLabel}.
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { n: 1, label: 'Connect',    done: step > 1 },
            { n: 2, label: 'Sepolia',    done: step > 2 },
            { n: 3, label: 'Ready',      done: step >= 3 },
          ].map(({ n, label, done }, i, arr) => (
            <React.Fragment key={n}>
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done ? 'bg-hc-success text-white' : step === n ? 'bg-hc-blue text-white' : 'bg-hc-border text-hc-text-muted'
                }`}>
                  {done ? '✓' : n}
                </div>
                <span className={`text-xs font-medium ${done ? 'text-hc-success' : step === n ? 'text-hc-blue' : 'text-hc-text-muted'}`}>
                  {label}
                </span>
              </div>
              {i < arr.length - 1 && <div className="flex-1 h-px bg-hc-border-light" />}
            </React.Fragment>
          ))}
        </div>

        {/* Error */}
        {localError && (
          <div className="mb-4 p-3 rounded-xl bg-hc-danger-soft border border-hc-danger/20 flex items-start gap-2 text-xs text-hc-danger">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {localError}
          </div>
        )}

        {/* No MetaMask hint */}
        {!window.ethereum && (
          <div className="mb-4 p-3 rounded-xl bg-hc-warning-soft border border-hc-warning/20 text-xs text-hc-text-muted">
            MetaMask is not installed.{' '}
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-hc-blue hover:underline font-semibold"
            >
              Install MetaMask ↗
            </a>
          </div>
        )}

        {/* Action area */}
        {step === 1 && (
          <button
            onClick={handleConnect}
            disabled={connecting || isLoading || !window.ethereum}
            className="hc-btn hc-btn-primary w-full"
            id="wallet-modal-connect-btn"
          >
            {connecting || isLoading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Connecting…</>
            ) : (
              <>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                  alt="MetaMask"
                  className="w-5 h-5"
                />
                Connect MetaMask
              </>
            )}
          </button>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-hc-warning-soft border border-hc-warning/20 text-xs text-hc-text-muted flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-hc-warning flex-shrink-0 mt-0.5" />
              <span>
                Wrong network detected. MediChain requires <strong className="text-hc-text">Sepolia Testnet</strong> (Chain ID {TARGET_CHAIN_ID}) for blockchain operations.
              </span>
            </div>
            <button
              onClick={handleSwitchNetwork}
              disabled={switching}
              className="hc-btn hc-btn-primary w-full"
              id="wallet-modal-switch-btn"
            >
              {switching ? (
                <><Loader className="w-4 h-4 animate-spin" /> Switching…</>
              ) : (
                <><Shield className="w-4 h-4" /> Switch to {SEPOLIA_NAME}</>
              )}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-hc-success-soft border border-hc-success/20 text-xs text-hc-success flex items-center gap-2">
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span>Wallet connected on Sepolia. Ready to proceed.</span>
            </div>
            <button
              onClick={handleProceed}
              className="hc-btn hc-btn-primary w-full"
              id="wallet-modal-proceed-btn"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cancel */}
        <button
          onClick={onClose}
          className="hc-btn hc-btn-ghost w-full mt-3"
          id="wallet-modal-cancel-btn"
        >
          Cancel
        </button>

        <p className="text-[10px] text-hc-text-light text-center mt-3">
          Your private key never leaves your device. MediChain never stores wallet credentials.
        </p>
      </div>
    </div>
  );
}
