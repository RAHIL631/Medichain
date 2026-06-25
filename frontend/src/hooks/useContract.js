// frontend/src/hooks/useContract.js
//
// Re-export shim — canonical implementation in useBlockchain.js.
// Existing imports from './useContract' continue to work unchanged.
//
//   import useContract from '../hooks/useContract';           // legacy (still works)
//   import { useContract } from '../hooks/useBlockchain';    // canonical

import { useContract } from './useBlockchain';

export { useContract };
export default useContract;
