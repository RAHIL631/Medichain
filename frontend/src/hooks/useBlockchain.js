// frontend/src/hooks/useBlockchain.js
//
// MediChain — Complete ethers.js v6 Blockchain Hooks
//
// EXPORTS (4 hooks):
//   useWallet()          — MetaMask connection, balance, network, persistence
//   useContract(signer)  — Memoised MediChain contract instance
//   usePatientRecords(contract, patientAddress) — On-chain record fetching
//   useAccessControl(contract)                  — Grant/revoke/check doctor access
//
// DESIGN DECISIONS:
//   - All hooks are self-contained; they do NOT call each other internally
//     (callers compose them together in components / pages).
//   - ethers.js v6 syntax throughout: BrowserProvider, formatEther, Contract.
//   - No Web3Provider, no ethers.utils.* (both removed in v6).
//   - useWallet persists the last-connected address to localStorage for silent
//     reconnect on page refresh (no popup, uses eth_accounts not eth_requestAccounts).
//   - usePatientRecords returns plain JS objects, not ethers Result proxies, so
//     components can JSON-serialize them freely.
//   - useAccessControl wraps every TX in a reusable `executeTx` helper that
//     tracks txLoading, txHash, txError, and confirms 1 block before resolving.

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { ethers } from 'ethers';

// ── Contract artifact (written by hardhat deploy script) ──────────────────────
// Graceful fallback so the app compiles even before the first `npx hardhat run`.
let MediChainArtifact = { abi: [], address: '' };
try {
  MediChainArtifact = require('../contracts/MediChain.json');
} catch {
  console.warn(
    '[useBlockchain] MediChain.json not found — run:\n' +
    '  npx hardhat run blockchain/scripts/deploy.js --network localhost'
  );
}

// ── Network registry (chainId → Hardhat / Sepolia / Mainnet config) ───────────
const NETWORKS = {
  31337: {
    name:       'Hardhat Local',
    shortName:  'localhost',
    rpcUrl:     'http://127.0.0.1:8545',
    currency:   { name: 'ETH', symbol: 'ETH', decimals: 18 },
    explorerUrl: null,
    isLocal:    true,
  },
  11155111: {
    name:       'Sepolia Testnet',
    shortName:  'sepolia',
    rpcUrl:     'https://rpc.sepolia.org',
    currency:   { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://sepolia.etherscan.io',
    isLocal:    false,
  },
  1: {
    name:       'Ethereum Mainnet',
    shortName:  'mainnet',
    rpcUrl:     'https://mainnet.infura.io/v3/',
    currency:   { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://etherscan.io',
    isLocal:    false,
  },
};

const TARGET_CHAIN_ID = 31337; // Hardhat for development — change for Sepolia deployment
const LS_KEY = 'medichain_wallet_address'; // localStorage key for silent reconnect

// ══════════════════════════════════════════════════════════════════════════════
// HOOK 1: useWallet
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Manages MetaMask wallet connection, balance, and network state.
 *
 * Returned shape:
 * {
 *   address:       string | null   — checksummed Ethereum address
 *   shortAddress:  string          — "0x1234…abcd" (display only)
 *   signer:        JsonRpcSigner | null
 *   provider:      BrowserProvider | null
 *   isConnected:   boolean
 *   chainId:       number | null
 *   network:       object | null   — { name, shortName, explorerUrl, isLocal }
 *   balance:       string | null   — formatted ETH string e.g. "1.2345"
 *   isLoading:     boolean
 *   error:         string | null
 *   connectWallet()   — triggers MetaMask popup
 *   disconnect()      — clears state + localStorage (MetaMask stays connected)
 *   switchNetwork(chainId) — asks MetaMask to switch; adds Hardhat if needed
 * }
 *
 * SILENT RECONNECT:
 *   On mount, calls eth_accounts (no popup) to check if MetaMask still has
 *   permission for a previously-connected address saved in localStorage.
 *   If yes, restores signer, balance, and network without user interaction.
 */
export const useWallet = () => {
  const [address,   setAddress]   = useState(null);
  const [signer,    setSigner]    = useState(null);
  const [provider,  setProvider]  = useState(null);
  const [chainId,   setChainId]   = useState(null);
  const [balance,   setBalance]   = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);

  // ── Internal helpers ────────────────────────────────────────────────────────

  /** Loads provider + signer + balance without triggering MetaMask popup */
  const _hydrateFromProvider = useCallback(async (ethProvider, addr) => {
    const net     = await ethProvider.getNetwork();
    const cId     = Number(net.chainId);
    const sig     = await ethProvider.getSigner(addr);
    const rawBal  = await ethProvider.getBalance(addr);
    const formBal = ethers.formatEther(rawBal);

    setSigner(sig);
    setProvider(ethProvider);
    setAddress(addr);
    setChainId(cId);
    setBalance(formBal);

    // Persist address for silent reconnect across page refreshes
    localStorage.setItem(LS_KEY, addr);
  }, []);

  // ── Silent reconnect on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const savedAddress = localStorage.getItem(LS_KEY);
    if (!savedAddress) return;

    const silentReconnect = async () => {
      try {
        // eth_accounts: returns permitted accounts without a popup
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const stillConnected = accounts.some(
          (a) => a.toLowerCase() === savedAddress.toLowerCase()
        );

        if (stillConnected) {
          const ethProvider = new ethers.BrowserProvider(window.ethereum);
          await _hydrateFromProvider(ethProvider, accounts[0]);
        } else {
          // MetaMask permission was revoked — clear stale state
          localStorage.removeItem(LS_KEY);
        }
      } catch (e) {
        console.warn('[useWallet] Silent reconnect failed:', e.message);
      }
    };

    silentReconnect();
  }, [_hydrateFromProvider]);

  // ── MetaMask event listeners ────────────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts) => {
      if (accounts.length === 0) {
        // User disconnected all accounts in MetaMask
        setAddress(null);
        setSigner(null);
        setProvider(null);
        setBalance(null);
        setChainId(null);
        localStorage.removeItem(LS_KEY);
        return;
      }
      // Account switched — silently re-hydrate with new account
      try {
        const ethProvider = new ethers.BrowserProvider(window.ethereum);
        await _hydrateFromProvider(ethProvider, accounts[0]);
      } catch (e) {
        console.error('[useWallet] accountsChanged re-hydration failed:', e.message);
      }
    };

    // chainChanged: ethers.js recommends full reload to avoid stale provider state
    const handleChainChanged = () => window.location.reload();

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged',    handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged',    handleChainChanged);
    };
  }, [_hydrateFromProvider]);

  // ── connectWallet ───────────────────────────────────────────────────────────
  /**
   * Triggers MetaMask popup, requests account access, hydrates all state.
   * @returns {{ address, signer, chainId, balance }} on success
   * @throws if MetaMask is not installed or user rejects the request
   */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      const msg = 'MetaMask is not installed. Please visit https://metamask.io';
      setError(msg);
      throw new Error(msg);
    }

    setIsLoading(true);
    setError(null);

    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);

      // This line triggers the MetaMask account-selection popup
      await ethProvider.send('eth_requestAccounts', []);

      const sig     = await ethProvider.getSigner();
      const addr    = await sig.getAddress();
      const net     = await ethProvider.getNetwork();
      const cId     = Number(net.chainId);
      const rawBal  = await ethProvider.getBalance(addr);
      const formBal = ethers.formatEther(rawBal);

      setSigner(sig);
      setProvider(ethProvider);
      setAddress(addr);
      setChainId(cId);
      setBalance(formBal);
      localStorage.setItem(LS_KEY, addr);

      return { address: addr, signer: sig, chainId: cId, balance: formBal };

    } catch (err) {
      const msg = err.code === 4001
        ? 'Connection rejected — please approve the MetaMask request.'
        : (err.message || 'Failed to connect wallet');
      setError(msg);
      throw new Error(msg); // re-throw so callers can catch and show UI feedback
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── disconnect ──────────────────────────────────────────────────────────────
  /**
   * Clears all wallet state and removes the persisted address.
   * Note: MetaMask itself stays connected; this only clears app-side state.
   */
  const disconnect = useCallback(() => {
    setAddress(null);
    setSigner(null);
    setProvider(null);
    setChainId(null);
    setBalance(null);
    setError(null);
    localStorage.removeItem(LS_KEY);
  }, []);

  // ── switchNetwork ───────────────────────────────────────────────────────────
  /**
   * Asks MetaMask to switch to the given chainId.
   * Automatically adds Hardhat Local (31337) if it doesn't exist in MetaMask yet.
   *
   * @param {number} targetChainId  default: 31337 (Hardhat)
   */
  const switchNetwork = useCallback(async (targetChainId = TARGET_CHAIN_ID) => {
    if (!window.ethereum) return;

    const hexChainId = `0x${targetChainId.toString(16)}`;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (switchErr) {
      // Error 4902: chain not yet added to MetaMask
      if (switchErr.code === 4902) {
        const net = NETWORKS[targetChainId];
        if (!net) {
          throw new Error(`Network config not found for chainId ${targetChainId}`);
        }
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId:         hexChainId,
            chainName:       net.name,
            nativeCurrency:  net.currency,
            rpcUrls:         [net.rpcUrl],
            blockExplorerUrls: net.explorerUrl ? [net.explorerUrl] : [],
          }],
        });
      } else {
        throw switchErr; // user rejected or other error
      }
    }
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────
  const shortAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  const network = chainId ? (NETWORKS[chainId] ?? { name: `Chain ${chainId}`, shortName: 'unknown' }) : null;

  return {
    address,
    shortAddress,
    signer,
    provider,
    isConnected: !!address,
    chainId,
    network,
    balance,
    isLoading,
    error,
    connectWallet,
    disconnect,
    switchNetwork,
  };
};

// ══════════════════════════════════════════════════════════════════════════════
// HOOK 2: useContract
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Returns a memoised, signer-connected MediChain contract instance.
 * Rebuilds only when `signer` changes (avoids unnecessary re-renders).
 *
 * @param {ethers.JsonRpcSigner | null} signer — from useWallet()
 * @returns {ethers.Contract | null}
 *
 * Usage:
 *   const { signer } = useWallet();
 *   const contract   = useContract(signer);
 *   await contract.addMedicalRecord(...);
 */
export const useContract = (signer) => {
  return useMemo(() => {
    if (!signer) return null;
    if (!MediChainArtifact.address) {
      console.warn('[useContract] Contract not deployed — MediChain.json has no address.');
      return null;
    }
    return new ethers.Contract(
      MediChainArtifact.address,
      MediChainArtifact.abi,
      signer
    );
  }, [signer]);
};

// ══════════════════════════════════════════════════════════════════════════════
// HOOK 3: usePatientRecords
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Fetches and auto-refreshes a patient's on-chain medical records.
 *
 * @param {ethers.Contract | null} contract      — from useContract()
 * @param {string | null}          patientAddress — Ethereum address
 *
 * Returned shape:
 * {
 *   records:  Array<{               — plain JS objects (not ethers Result proxies)
 *     index:       number,
 *     ipfsCID:     string,
 *     ipfsURL:     string,
 *     recordType:  string,
 *     notes:       string,
 *     addedBy:     string,          — doctor's address
 *     timestamp:   number,          — Unix seconds
 *     isActive:    boolean,
 *   }>,
 *   loading:  boolean,
 *   error:    string | null,
 *   refetch:  () => void,          — call to manually refresh
 * }
 *
 * HOW IT WORKS:
 *   contract.getMedicalRecords(patientAddress) returns a Solidity struct array.
 *   ethers v6 returns these as Result objects with numbered keys and named keys.
 *   We convert each Result to a plain JS object using the known struct field names.
 */
export const usePatientRecords = (contract, patientAddress) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Use a ref to hold the fetch function so it can be called both from useEffect
  // and from the manually-exposed `refetch` without creating circular deps.
  const fetchRef = useRef(null);

  fetchRef.current = useCallback(async () => {
    if (!contract || !patientAddress) {
      setRecords([]);
      return;
    }

    // Basic Ethereum address validation
    if (!ethers.isAddress(patientAddress)) {
      setError(`Invalid Ethereum address: ${patientAddress}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call the view function — no gas, no MetaMask popup
      const rawRecords = await contract.getMedicalRecords(patientAddress);

      // Convert ethers Result proxy objects to plain serialisable JS objects.
      // Field names mirror the Solidity struct in MediChain.sol:
      //   struct MedicalRecord {
      //     string  ipfsCID;
      //     string  ipfsURL;
      //     string  recordType;
      //     string  notes;
      //     address addedBy;
      //     uint256 timestamp;
      //     bool    isActive;
      //   }
      const plainRecords = Array.from(rawRecords).map((r, index) => ({
        index,
        ipfsCID:    String(r.ipfsCID    ?? r[0] ?? ''),
        ipfsURL:    String(r.ipfsURL    ?? r[1] ?? ''),
        recordType: String(r.recordType ?? r[2] ?? ''),
        notes:      String(r.notes      ?? r[3] ?? ''),
        addedBy:    String(r.addedBy    ?? r[4] ?? ''),
        timestamp:  Number(r.timestamp  ?? r[5] ?? 0),
        isActive:   Boolean(r.isActive  ?? r[6] ?? true),
        // Derived display fields
        date:       new Date(Number(r.timestamp ?? r[5] ?? 0) * 1000).toLocaleDateString(),
      }));

      // Show only active records; sort newest first
      const activeRecords = plainRecords
        .filter((r) => r.isActive)
        .sort((a, b) => b.timestamp - a.timestamp);

      setRecords(activeRecords);

    } catch (err) {
      console.error('[usePatientRecords] Fetch failed:', err);

      // Contract access control revert: doctor lacks permission
      if (err.message?.includes('Not authorized') || err.message?.includes('revert')) {
        setError('Access denied — you may not have permission to view this patient\'s records.');
      } else if (err.message?.includes('patient not registered')) {
        setError('This patient has not registered on the MediChain blockchain.');
      } else {
        setError(err.reason || err.message || 'Failed to fetch records from blockchain');
      }
    } finally {
      setLoading(false);
    }
  }, [contract, patientAddress]);

  // Re-fetch automatically whenever contract or patientAddress changes
  useEffect(() => {
    fetchRef.current();
  }, [contract, patientAddress]);

  const refetch = useCallback(() => {
    fetchRef.current();
  }, []);

  return { records, loading, error, refetch };
};

// ══════════════════════════════════════════════════════════════════════════════
// HOOK 4: useAccessControl
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Provides grant/revoke/check doctor access functions backed by the smart contract.
 *
 * @param {ethers.Contract | null} contract — from useContract()
 *
 * Returned shape:
 * {
 *   txLoading:  boolean,        — true while a TX is pending/mining
 *   txHash:     string | null,  — current pending TX hash (0x...)
 *   txError:    string | null,  — last error message
 *   txReceipt:  object | null,  — last confirmed receipt
 *
 *   grantAccess(doctorAddress)              — patient grants a doctor read+write access
 *   revokeAccess(doctorAddress)             — patient revokes doctor's access
 *   checkAccess(patientAddress, doctorAddress) → Promise<boolean>
 *   clearTxState()                          — reset txHash/txError after display
 * }
 *
 * SMART CONTRACT CALLS:
 *   grantAccess  → contract.grantDoctorAccess(doctorAddress)   [state-changing TX]
 *   revokeAccess → contract.revokeDoctorAccess(doctorAddress)  [state-changing TX]
 *   checkAccess  → contract.hasAccess(patient, doctor)          [view — no gas]
 *
 * ACCESS CONTROL MODEL:
 *   The patient is ALWAYS the caller for grant/revoke. The smart contract
 *   enforces this via msg.sender — so grantAccess is called from the PATIENT'S
 *   MetaMask, not the doctor's. The contract will revert if a non-patient calls it.
 */
export const useAccessControl = (contract) => {
  const [txLoading, setTxLoading] = useState(false);
  const [txHash,    setTxHash]    = useState(null);
  const [txError,   setTxError]   = useState(null);
  const [txReceipt, setTxReceipt] = useState(null);

  // ── Internal TX executor ────────────────────────────────────────────────────
  /**
   * Wraps a state-changing contract call with:
   *   1. Input validation
   *   2. MetaMask TX submission
   *   3. Pending hash display
   *   4. 1-block confirmation wait
   *   5. Error classification
   *
   * @param {() => Promise<ethers.TransactionResponse>} txFn
   * @returns {Promise<ethers.TransactionReceipt | null>}
   */
  const executeTx = useCallback(async (txFn) => {
    if (!contract) {
      setTxError('Contract not initialised — connect your wallet first.');
      return null;
    }

    setTxLoading(true);
    setTxHash(null);
    setTxError(null);
    setTxReceipt(null);

    try {
      // Submit TX to MetaMask → returns immediately with the pending TX object
      const tx = await txFn();

      // Show pending TX hash to the user immediately
      setTxHash(tx.hash);

      // Wait for 1 block confirmation
      const receipt = await tx.wait(1);
      setTxReceipt(receipt);

      return receipt;

    } catch (err) {
      let msg;

      if (err.code === 4001 || err.message?.includes('user rejected')) {
        msg = 'Transaction rejected — you cancelled the MetaMask request.';
      } else if (err.message?.includes('revert')) {
        // Try to extract the Solidity revert reason
        msg = `Smart contract error: ${err.reason || err.data?.message || err.message}`;
      } else if (err.message?.includes('insufficient funds')) {
        msg = 'Insufficient ETH for gas — add funds to your wallet.';
      } else if (err.message?.includes('nonce')) {
        msg = 'Nonce error — reset MetaMask account and try again.';
      } else {
        msg = err.reason || err.message || 'Blockchain transaction failed.';
      }

      setTxError(msg);
      console.error('[useAccessControl] TX failed:', err);
      return null;

    } finally {
      setTxLoading(false);
    }
  }, [contract]);

  // ── grantAccess ─────────────────────────────────────────────────────────────
  /**
   * Patient grants a doctor on-chain read+write access to their records.
   * MUST be called from the patient's MetaMask (msg.sender = patient).
   *
   * @param {string} doctorAddress — Ethereum address of the doctor
   * @returns {Promise<ethers.TransactionReceipt | null>}
   */
  const grantAccess = useCallback(async (doctorAddress) => {
    if (!ethers.isAddress(doctorAddress)) {
      setTxError(`Invalid doctor address: ${doctorAddress}`);
      return null;
    }
    return executeTx(() => contract.grantDoctorAccess(doctorAddress));
  }, [contract, executeTx]);

  // ── revokeAccess ────────────────────────────────────────────────────────────
  /**
   * Patient revokes a doctor's access.
   * MUST be called from the patient's MetaMask (msg.sender = patient).
   *
   * @param {string} doctorAddress — Ethereum address of the doctor
   * @returns {Promise<ethers.TransactionReceipt | null>}
   */
  const revokeAccess = useCallback(async (doctorAddress) => {
    if (!ethers.isAddress(doctorAddress)) {
      setTxError(`Invalid doctor address: ${doctorAddress}`);
      return null;
    }
    return executeTx(() => contract.revokeDoctorAccess(doctorAddress));
  }, [contract, executeTx]);

  // ── checkAccess ─────────────────────────────────────────────────────────────
  /**
   * Checks whether a doctor currently has access to a patient's records.
   * This is a VIEW call — no gas, no MetaMask popup.
   *
   * @param {string} patientAddress
   * @param {string} doctorAddress
   * @returns {Promise<boolean>}
   */
  const checkAccess = useCallback(async (patientAddress, doctorAddress) => {
    if (!contract) return false;
    if (!ethers.isAddress(patientAddress) || !ethers.isAddress(doctorAddress)) {
      console.warn('[useAccessControl] checkAccess: invalid address(es)');
      return false;
    }
    try {
      return await contract.hasAccess(patientAddress, doctorAddress);
    } catch (err) {
      console.error('[useAccessControl] checkAccess failed:', err.message);
      return false;
    }
  }, [contract]);

  // ── clearTxState ────────────────────────────────────────────────────────────
  /** Resets txHash, txError, and txReceipt — call after displaying the result. */
  const clearTxState = useCallback(() => {
    setTxHash(null);
    setTxError(null);
    setTxReceipt(null);
  }, []);

  return {
    txLoading,
    txHash,
    txError,
    txReceipt,
    grantAccess,
    revokeAccess,
    checkAccess,
    clearTxState,
  };
};

// ── Default export: all hooks as a named map (convenient for lazy imports) ─────
export default { useWallet, useContract, usePatientRecords, useAccessControl };
