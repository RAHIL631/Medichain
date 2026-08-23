// frontend/src/hooks/useWallet.js
//
// Re-export shim — maps the canonical useBlockchain.js interface back
// to the legacy `{ account, connected, connect }` properties expected by
// older components.

import { useWallet as useBlockchainWallet } from './useBlockchain';

export const useWallet = () => {
  const wallet = useBlockchainWallet();
  return {
    ...wallet,
    account: wallet.address,
    connected: wallet.isConnected,
    connect: wallet.connectWallet,
  };
};

export default useWallet;
