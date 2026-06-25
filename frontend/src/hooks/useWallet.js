// frontend/src/hooks/useWallet.js
//
// Re-export shim — the canonical implementation now lives in useBlockchain.js.
// This file exists so existing components that import from './useWallet' continue
// to work without any changes. Both of these are equivalent:
//
//   import useWallet from '../hooks/useWallet';           // legacy import (still works)
//   import { useWallet } from '../hooks/useBlockchain';  // new canonical import

import { useWallet } from './useBlockchain';

export { useWallet };
export default useWallet;
