// frontend/src/context/WalletContext.js
//
// Global OPTIONAL wallet state — wraps useBlockchain.useWallet() in a React
// Context so all components share one wallet instance without prop-drilling.
//
// KEY DESIGN: This context does NOT block rendering, redirect, or require
// MetaMask. It is purely informational. Components that need a wallet for a
// blockchain operation should call connectWallet() themselves or show the
// WalletConnectionModal.

import React, { createContext, useContext, useMemo } from 'react';
import { useWallet as useBlockchainWallet } from '../hooks/useBlockchain';

// ── Context ───────────────────────────────────────────────────────────────────
const WalletContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export const WalletProvider = ({ children }) => {
  // Shared wallet state — silent reconnect on mount (no popup)
  const wallet = useBlockchainWallet();

  const value = useMemo(() => ({
    // Core state
    address:      wallet.address,
    shortAddress: wallet.shortAddress,
    isConnected:  wallet.isConnected,
    chainId:      wallet.chainId,
    network:      wallet.network,
    balance:      wallet.balance,
    isLoading:    wallet.isLoading,
    error:        wallet.error,
    signer:       wallet.signer,
    provider:     wallet.provider,

    // Compat aliases for legacy components
    account:     wallet.address,
    connected:   wallet.isConnected,

    // Actions
    connectWallet:  wallet.connectWallet,
    connect:        wallet.connectWallet,  // legacy alias
    disconnect:     wallet.disconnect,
    switchNetwork:  wallet.switchNetwork,
  }), [wallet]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useWalletContext = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used inside <WalletProvider>');
  return ctx;
};

export default WalletContext;
