// frontend/src/components/WalletSetup.jsx
// Interactive component to link MetaMask wallet and register on the blockchain

import React, { useState } from 'react';
import { ethers } from 'ethers';
import useWallet from '../hooks/useWallet';
import useContract from '../hooks/useContract';
import api from '../utils/api';
import { formatAddress } from '../utils/web3';

/**
 * WalletSetup Component
 * Handles the 3-step process: Connect -> Link (Backend) -> Register (Blockchain)
 */
const WalletSetup = ({ onComplete }) => {
  const { account, connected, connect, network, error: walletError } = useWallet();
  const { contract } = useContract();

  const [step, setStep] = useState(1); // 1: Connect, 2: Confirm/Link, 3: Registering
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [success, setSuccess] = useState(false);

  // --- Step 1: Connect Wallet ---
  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
    }
  };

  // --- Step 2 & 3: Link and Register ---
  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // a. Link Wallet on Backend
      await api.post('/patient/link-wallet', { walletAddress: account });
      
      // b. Call Contract Function
      if (!contract) throw new Error('Smart contract not initialized. Is MetaMask connected?');
      
      const tx = await contract.registerPatient();
      setTxHash(tx.hash);
      setStep(3);
      
      // c. Wait for confirmation
      await tx.wait();
      
      // d. Confirm on Backend
      await api.post('/patient/confirm-registration');
      
      setSuccess(true);
      // e. Refresh dashboard after a short delay
      setTimeout(() => {
        if (onComplete) onComplete();
        else window.location.reload();
      }, 3000);

    } catch (err) {
      console.error('Registration Error:', err);
      // Handle common Ethereum errors
      let msg = err.reason || err.message || 'Registration failed';
      if (msg.includes('user rejected')) msg = 'Transaction cancelled by user';
      if (msg.includes('already registered')) msg = 'This wallet is already registered on the blockchain';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-indigo-50 dark:border-gray-700 max-w-lg mx-auto overflow-hidden relative">
      {/* Decorative Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 text-center">
        {/* Icon Header */}
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Blockchain Identity Setup</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
          Link your MetaMask wallet to MediChain to secure your medical records with decentralized, tamper-proof technology.
        </p>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${step >= s ? 'w-8 bg-indigo-600' : 'w-4 bg-gray-200 dark:bg-gray-700'}`} />
          ))}
        </div>

        {/* Dynamic Content based on Steps */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none transform hover:-translate-y-0.5 active:scale-95"
            >
              Connect MetaMask Wallet
            </button>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Step 1: Authorization</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
              <p className="text-[10px] text-gray-400 uppercase font-bold mb-2">Connected Address</p>
              <p className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{formatAddress(account)}</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-50 transition-all"
              >
                Change
              </button>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Processing...' : 'Confirm & Register'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col items-center">
              {!success ? (
                <>
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-900 dark:text-white font-bold">Registering on Blockchain...</p>
                  <p className="text-xs text-gray-500 mt-2">Waiting for confirmation on Ethereum</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600 scale-110 transition-transform">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">Registration Complete!</p>
                  <p className="text-sm text-gray-500 mt-1">Redirecting to your dashboard...</p>
                </>
              )}
            </div>

            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 text-xs rounded-xl border border-indigo-100 dark:border-indigo-900/30 hover:underline"
              >
                View Transaction: {txHash.slice(0, 14)}...
              </a>
            )}
          </div>
        )}

        {/* Error Handling */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 text-red-700 dark:text-red-400 text-sm rounded-r-xl text-left flex items-start">
            <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Network Hint */}
        {network && network.chainId !== 31337 && (
          <p className="mt-4 text-[10px] text-amber-600 font-bold uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 py-1 rounded-full">
            ⚠ Please switch to Hardhat Local (Chain 31337)
          </p>
        )}
      </div>
    </div>
  );
};

export default WalletSetup;
