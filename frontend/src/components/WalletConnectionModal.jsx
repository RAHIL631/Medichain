// frontend/src/components/WalletConnectionModal.jsx
// Reusable modal that appears when a blockchain operation is attempted without a connected MetaMask wallet.
// Mobile-first responsive: bottom sheet on small screens, centered modal on tablet/desktop.

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

  const step = !isConnected ? 1 : !onCorrectNetwork ? 2 : 3;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(2, 6, 23, 0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Wallet connection required"
    >
      {/* Modal card - Bottom sheet on mobile, rounded card on desktop */}
      <div 
        className="hc-card w-full max-w-md p-5 sm:p-6 relative animate-slide-up shadow-hc-card-lg rounded-b-none sm:rounded-2xl max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Handle bar on mobile */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-hc-border mx-auto mb-4" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl text-hc-text-muted hover:bg-hc-bg-alt transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon + header */}
        <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5 pr-8">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-hc-blue-soft flex items-center justify-center flex-shrink-0">
            <Wallet className="w-5 h-5 text-hc-blue" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-hc-text leading-tight">Wallet connection required</h2>
            <p className="text-[11px] sm:text-xs text-hc-text-muted mt-1 leading-relaxed">
              Connect your MetaMask wallet to securely {operationLabel}.
            </p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-5 sm:mb-6">
          {[
            { n: 1, label: 'Connect',    done: step > 1 },
            { n: 2, label: 'Sepolia',    done: step > 2 },
            { n: 3, label: 'Ready',      done: step >= 3 },
          ].map(({ n, label, done }, i, arr) => (
            <React.Fragment key={n}>
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-colors ${
                  done ? 'bg-hc-success text-white' : step === n ? 'bg-hc-blue text-white' : 'bg-hc-border text-hc-text-muted'
                }`}>
                  {done ? '✓' : n}
                </div>
                <span className={`text-[11px] sm:text-xs font-medium ${done ? 'text-hc-success' : step === n ? 'text-hc-blue' : 'text-hc-text-muted'}`}>
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
            <span>{localError}</span>
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
            className="hc-btn hc-btn-primary w-full min-h-[48px] text-sm"
            id="wallet-modal-connect-btn"
          >
            {connecting || isLoading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Connecting…</>
            ) : (
              <>
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                  alt="MetaMask"
                  className="w-5 h-5 flex-shrink-0"
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
              className="hc-btn hc-btn-primary w-full min-h-[48px]"
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
              className="hc-btn hc-btn-primary w-full min-h-[48px]"
              id="wallet-modal-proceed-btn"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Cancel */}
        <button
          onClick={onClose}
          className="hc-btn hc-btn-ghost w-full mt-2.5 min-h-[44px]"
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
