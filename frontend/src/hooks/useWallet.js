// frontend/src/hooks/useWallet.js
//
// Re-export shim — maps the canonical WalletContext interface back to
// the legacy { account, connected, connect } properties expected by
// older components.
//
// This now reads from WalletContext so all components share one wallet
// instance, instead of each having an independent useBlockchain() call.

import { useWalletContext } from '../context/WalletContext';

export const useWallet = () => {
  const ctx = useWalletContext();
  return {
    ...ctx,
    // Legacy aliases
    account:  ctx.address,
    connected: ctx.isConnected,
    connect:  ctx.connectWallet,
  };
};

export default useWallet;
