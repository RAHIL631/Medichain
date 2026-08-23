// frontend/src/hooks/useContract.js
//
// Re-export shim — maps the canonical useBlockchain.js interface back
// to the legacy `{ contract }` object expected by older components.
//
// Automatically injects the wallet signer if called with no arguments.

import { useContract as useBlockchainContract, useWallet as useBlockchainWallet } from './useBlockchain';

export const useContract = (explicitSigner) => {
  const { signer } = useBlockchainWallet();
  const contract = useBlockchainContract(explicitSigner || signer);
  return { contract };
};

export default useContract;
