// frontend/src/components/NetworkGuard.jsx
//
// Wraps the app and blocks interaction if MetaMask is on an unsupported network.
//
// SUPPORTED:
//   31337     — Hardhat Local   (development default)
//   11155111  — Sepolia Testnet (production/testing)
//
// BEHAVIOUR:
//   chainId === null  → MetaMask not connected yet → render children (login handles it)
//   chainId supported → render children normally
//   chainId wrong     → full-screen blocking overlay with a "Switch Network" button
//
// The component listens to window.ethereum 'chainChanged' to re-evaluate instantly
// without needing a page reload.

import React, { useState, useEffect, useCallback } from 'react';

// ── Network registry ──────────────────────────────────────────────────────────
const SUPPORTED_NETWORKS = {
  31337: {
    name:        'Hardhat Local',
    shortName:   'localhost',
    rpcUrl:      'http://127.0.0.1:8545',
    currency:    { name: 'Ether', symbol: 'ETH', decimals: 18 },
    explorerUrl: null,
    isLocal:     true,
  },
  11155111: {
    name:        'Sepolia Testnet',
    shortName:   'sepolia',
    rpcUrl:      'https://rpc.sepolia.org',
    currency:    { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
    explorerUrl: 'https://sepolia.etherscan.io',
    isLocal:     false,
  },
};

// Target varies by environment — change VITE_TARGET_CHAIN_ID in .env to override
const TARGET_CHAIN_ID =
  Number(import.meta?.env?.VITE_TARGET_CHAIN_ID) ||
  (import.meta?.env?.MODE === 'production' ? 11155111 : 31337);

const TARGET_NETWORK = SUPPORTED_NETWORKS[TARGET_CHAIN_ID];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the display name for any chainId */
const getNetworkName = (chainId) =>
  SUPPORTED_NETWORKS[chainId]?.name ?? `Unknown Network (chain ${chainId})`;

/** Reads the current chainId from MetaMask without triggering a popup */
const readChainId = async () => {
  if (!window.ethereum) return null;
  try {
    const hex = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(hex, 16);
  } catch {
    return null;
  }
};

/** Requests MetaMask to switch to TARGET_CHAIN_ID. Adds the network if missing. */
const switchToTargetNetwork = async () => {
  if (!window.ethereum) throw new Error('MetaMask not installed');

  const hexChainId = `0x${TARGET_CHAIN_ID.toString(16)}`;

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (switchErr) {
    // 4902 = chain not yet added to MetaMask
    if (switchErr.code === 4902 || switchErr.code === -32603) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId:           hexChainId,
          chainName:         TARGET_NETWORK.name,
          nativeCurrency:    TARGET_NETWORK.currency,
          rpcUrls:           [TARGET_NETWORK.rpcUrl],
          blockExplorerUrls: TARGET_NETWORK.explorerUrl
            ? [TARGET_NETWORK.explorerUrl]
            : [],
        }],
      });
    } else {
      throw switchErr; // user rejected or other unrecoverable error
    }
  }
};

// ── Keyframes (injected once) ─────────────────────────────────────────────────
let _kfInjected = false;
const injectKeyframes = () => {
  if (_kfInjected || typeof document === 'undefined') return;
  const s = document.createElement('style');
  s.textContent = `
    @keyframes ng-spin    { to { transform: rotate(360deg); } }
    @keyframes ng-fadeIn  { from { opacity:0; } to { opacity:1; } }
    @keyframes ng-slideUp { from { transform:translateY(24px); opacity:0; }
                            to   { transform:translateY(0);    opacity:1; } }
    @keyframes ng-pulse   {
      0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
      50%     { box-shadow: 0 0 0 12px rgba(245,158,11,0); }
    }
    @keyframes ng-warningBob {
      0%,100% { transform: translateY(0);    }
      50%     { transform: translateY(-6px); }
    }
  `;
  document.head.appendChild(s);
  _kfInjected = true;
};

// ── Collapsible Hardhat setup instructions ────────────────────────────────────
const HardhatGuide = () => {
  const [open, setOpen] = useState(false);

  const steps = [
    { cmd: 'cd blockchain',                          note: 'Navigate to the blockchain folder' },
    { cmd: 'npx hardhat node',                       note: 'Starts a local Ethereum node on port 8545' },
    { cmd: 'npx hardhat run scripts/deploy.js --network localhost', note: 'Deploys MediChain contracts' },
  ];

  return (
    <div style={{
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.02)',
      marginTop: 8,
    }}>
      {/* Accordion header */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '10px 14px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#94a3b8', fontSize: 12, fontWeight: 600,
          letterSpacing: '0.04em', textAlign: 'left',
        }}
      >
        <span>⚙️ How to start the Hardhat local network</span>
        <span style={{
          fontSize: 10,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
        }}>▼</span>
      </button>

      {/* Accordion body */}
      {open && (
        <div style={{ padding: '0 14px 14px', animation: 'ng-slideUp 0.2s ease' }}>
          <p style={{ fontSize: 11, color: '#64748b', marginBottom: 10, lineHeight: 1.6 }}>
            Run these commands in your project root (requires Node.js + Hardhat installed):
          </p>

          {steps.map((step, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              marginBottom: 8,
            }}>
              <span style={{
                minWidth: 20, height: 20, borderRadius: '50%',
                background: 'rgba(245,158,11,0.15)',
                color: '#f59e0b', fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>{i + 1}</span>
              <div>
                <code style={{
                  display: 'block', fontFamily: 'monospace', fontSize: 11,
                  background: 'rgba(0,0,0,0.3)', color: '#7dd3fc',
                  padding: '3px 8px', borderRadius: 5, marginBottom: 2,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {step.cmd}
                </code>
                <span style={{ fontSize: 10, color: '#64748b' }}>{step.note}</span>
              </div>
            </div>
          ))}

          <div style={{
            marginTop: 10, padding: '8px 10px',
            background: 'rgba(56,189,248,0.06)',
            borderRadius: 6, border: '1px solid rgba(56,189,248,0.15)',
          }}>
            <p style={{ fontSize: 10, color: '#7dd3fc', margin: 0, lineHeight: 1.6 }}>
              💡 Then add <strong>Hardhat Local</strong> to MetaMask manually:<br />
              Network Name: <code>Hardhat Local</code> · RPC: <code>http://127.0.0.1:8545</code> ·
              Chain ID: <code>31337</code> · Currency: <code>ETH</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Blocking overlay ──────────────────────────────────────────────────────────
const WrongNetworkScreen = ({ currentChainId, onSwitch, switching, switchError }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(2, 6, 23, 0.97)',
    backdropFilter: 'blur(20px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
    animation: 'ng-fadeIn 0.3s ease',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }}>
    <div style={{
      maxWidth: 480, width: '100%',
      background: 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, rgba(2,6,23,0.9) 100%)',
      border: '1px solid rgba(245,158,11,0.25)',
      borderRadius: 20,
      padding: 32,
      display: 'flex', flexDirection: 'column', gap: 20,
      animation: 'ng-slideUp 0.35s cubic-bezier(0.175,0.885,0.32,1.275)',
    }}>

      {/* ── Warning icon ── */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(245,158,11,0.12)',
          border: '2px solid rgba(245,158,11,0.3)',
          animation: 'ng-warningBob 2s ease-in-out infinite',
        }}>
          <svg width="36" height="36" fill="none" stroke="#f59e0b"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      </div>

      {/* ── Title + description ── */}
      <div style={{ textAlign: 'center' }}>
        <h1 style={{
          margin: '0 0 8px',
          fontSize: 22, fontWeight: 800, color: '#f1f5f9',
          letterSpacing: '-0.02em',
        }}>
          Wrong Network Detected
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
          MediChain requires the{' '}
          <strong style={{ color: '#fbbf24' }}>{TARGET_NETWORK?.name}</strong>{' '}
          network to interact with the smart contracts.
        </p>
      </div>

      {/* ── Network comparison ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8,
        alignItems: 'center',
      }}>
        {/* Current (wrong) */}
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Current
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>
            {getNetworkName(currentChainId)}
          </div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b', marginTop: 2 }}>
            chain {currentChainId}
          </div>
        </div>

        {/* Arrow */}
        <div style={{ color: '#334155', fontSize: 18, textAlign: 'center' }}>→</div>

        {/* Target (required) */}
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.25)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4,
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Required
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>
            {TARGET_NETWORK?.name}
          </div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b', marginTop: 2 }}>
            chain {TARGET_CHAIN_ID}
          </div>
        </div>
      </div>

      {/* ── Switch button ── */}
      <button
        onClick={onSwitch}
        disabled={switching}
        style={{
          width: '100%', padding: '13px 20px',
          borderRadius: 12, border: 'none', cursor: switching ? 'not-allowed' : 'pointer',
          background: switching
            ? 'rgba(245,158,11,0.3)'
            : 'linear-gradient(135deg, #d97706, #f59e0b)',
          color: '#fff', fontWeight: 800, fontSize: 14,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'all 0.2s',
          animation: switching ? 'none' : 'ng-pulse 2s ease-in-out infinite',
          boxShadow: switching ? 'none' : '0 0 24px rgba(245,158,11,0.3)',
        }}
      >
        {switching ? (
          <>
            <svg width="16" height="16" viewBox="0 0 36 36" fill="none"
              style={{ animation: 'ng-spin 0.8s linear infinite' }}>
              <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
              <path d="M18 4 a14 14 0 0 1 14 14" stroke="#fff" strokeWidth="3"
                strokeLinecap="round" />
            </svg>
            Switching Network…
          </>
        ) : (
          <>
            <svg width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              viewBox="0 0 24 24">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            Switch to {TARGET_NETWORK?.name}
          </>
        )}
      </button>

      {/* ── Switch error ── */}
      {switchError && (
        <div style={{
          padding: '8px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
          fontSize: 11, color: '#f87171', lineHeight: 1.5,
        }}>
          ⚠ {switchError}
        </div>
      )}

      {/* ── Hardhat setup guide ── */}
      {TARGET_CHAIN_ID === 31337 && <HardhatGuide />}

      {/* ── Footer note ── */}
      <p style={{ margin: 0, fontSize: 10, color: '#334155', textAlign: 'center', lineHeight: 1.6 }}>
        After switching, this screen will automatically dismiss.
        {!window.ethereum && (
          <span style={{ color: '#f87171' }}>
            {' '}MetaMask is not installed —{' '}
            <a href="https://metamask.io/download/" target="_blank"
              rel="noopener noreferrer" style={{ color: '#38bdf8' }}>
              install it first ↗
            </a>
          </span>
        )}
      </p>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN: NetworkGuard
// ══════════════════════════════════════════════════════════════════════════════
/**
 * Wraps the app and blocks rendering if MetaMask is on a wrong network.
 *
 * Place it just inside <AuthProvider> and outside <BrowserRouter>:
 *
 *   <AuthProvider>
 *     <NetworkGuard>
 *       <BrowserRouter>
 *         <Routes> ... </Routes>
 *       </BrowserRouter>
 *     </NetworkGuard>
 *   </AuthProvider>
 *
 * @param {{ children: React.ReactNode }} props
 */
const NetworkGuard = ({ children }) => {
  injectKeyframes();

  const [chainId,     setChainId]     = useState(null);  // null = unknown (MetaMask not yet queried)
  const [hydrated,    setHydrated]    = useState(false); // true after first eth_chainId call
  const [switching,   setSwitching]   = useState(false);
  const [switchError, setSwitchError] = useState(null);

  // ── Read current chain on mount ───────────────────────────────────────────
  useEffect(() => {
    readChainId().then((id) => {
      setChainId(id);
      setHydrated(true);
    });
  }, []);

  // ── Listen for chainChanged ───────────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = (hexChainId) => {
      const id = parseInt(hexChainId, 16);
      setChainId(id);
      setSwitchError(null); // clear any stale error
    };

    window.ethereum.on('chainChanged', handleChainChanged);
    return () => window.ethereum.removeListener('chainChanged', handleChainChanged);
  }, []);

  // ── Network switch handler ────────────────────────────────────────────────
  const handleSwitch = useCallback(async () => {
    setSwitching(true);
    setSwitchError(null);
    try {
      await switchToTargetNetwork();
      // chainChanged event will fire and update chainId automatically
    } catch (err) {
      if (err.code === 4001 || err.message?.includes('user rejected')) {
        setSwitchError('Network switch cancelled — please approve the MetaMask request.');
      } else {
        setSwitchError(err.message || 'Failed to switch network. Try manually in MetaMask.');
      }
    } finally {
      setSwitching(false);
    }
  }, []);

  // ── Guard logic ───────────────────────────────────────────────────────────
  // Case 1: haven't read chainId yet — avoid flash of wrong screen
  if (!hydrated) return null;

  // Case 2: MetaMask not installed / wallet not connected — let children handle it
  if (chainId === null) return children;

  // Case 3: supported network — all good, render app
  if (SUPPORTED_NETWORKS[chainId]) return children;

  // Case 4: unsupported network — show blocking overlay
  return (
    <>
      {/* Render children underneath (blurred) for context */}
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <WrongNetworkScreen
        currentChainId={chainId}
        onSwitch={handleSwitch}
        switching={switching}
        switchError={switchError}
      />
    </>
  );
};

export default NetworkGuard;
