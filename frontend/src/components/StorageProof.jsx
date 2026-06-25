// frontend/src/components/StorageProof.jsx
//
// Displays the dual storage proof after a medical record is uploaded:
//   📁 IPFS proof  — CID, gateway link, file info
//   ⛓️  Blockchain proof — TX hash, block number, Etherscan link
//   🔍 Verification explanation — how tamper-proofing works
//
// Props:
//   ipfsCID       {string}   IPFS Content Identifier
//   ipfsURL       {string}   Pinata gateway URL
//   fileName      {string}   Original file name
//   fileSize      {number}   File size in bytes
//   txHash        {string}   Ethereum transaction hash (0x...)
//   blockNumber   {number}   Block number the TX was mined in
//   txStatus      {string}   'pending' | 'confirmed' | 'failed'
//   networkName   {string}   'localhost' | 'sepolia' | 'mainnet'

import React, { useState } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Shortens a hash/CID for display: first 8 + … + last 6 chars */
const shorten = (str, head = 8, tail = 6) =>
  str ? `${str.slice(0, head)}…${str.slice(-tail)}` : '';

/** Formats bytes into human-readable size */
const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/** Returns the Etherscan base URL for a given network */
const etherscanBase = (networkName) => {
  const map = {
    mainnet:  'https://etherscan.io',
    sepolia:  'https://sepolia.etherscan.io',
    localhost: null, // no explorer for local Hardhat
  };
  return map[networkName] ?? map.sepolia;
};

// ── Copy-to-clipboard button ──────────────────────────────────────────────────
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API not available */
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '11px',
        color: copied ? '#22c55e' : '#94a3b8',
        transition: 'color 0.2s',
      }}
    >
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  );
};

// ── Individual proof row ──────────────────────────────────────────────────────
const ProofRow = ({ label, value, href, copyText, mono = true }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
    gap: '8px',
    flexWrap: 'wrap',
  }}>
    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
      {label}
    </span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: mono ? 'monospace' : 'inherit',
            fontSize: '12px',
            color: '#38bdf8',
            textDecoration: 'none',
            wordBreak: 'break-all',
          }}
        >
          {value}
        </a>
      ) : (
        <span style={{
          fontFamily: mono ? 'monospace' : 'inherit',
          fontSize: '12px',
          color: '#e2e8f0',
          wordBreak: 'break-all',
        }}>
          {value}
        </span>
      )}
      {copyText && <CopyButton text={copyText} />}
    </div>
  </div>
);

// ── Section card ─────────────────────────────────────────────────────────────
const ProofCard = ({ icon, title, accent, children }) => (
  <div style={{
    borderRadius: '14px',
    border: `1px solid ${accent}33`,
    background: `linear-gradient(135deg, ${accent}0a 0%, transparent 100%)`,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
      <span style={{ fontSize: '18px' }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: '13px', color: accent, letterSpacing: '0.03em' }}>
        {title}
      </span>
    </div>
    {children}
  </div>
);

// ── TX status badge ───────────────────────────────────────────────────────────
const TxStatusBadge = ({ status }) => {
  const cfg = {
    pending:   { label: '⏳ Pending…',   bg: '#78350f', color: '#fbbf24' },
    confirmed: { label: '✅ Confirmed',   bg: '#052e16', color: '#22c55e' },
    failed:    { label: '❌ Failed',      bg: '#450a0a', color: '#f87171' },
  }[status] || { label: status, bg: '#1e293b', color: '#94a3b8' };

  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: '20px',
      fontSize: '11px',
      fontWeight: 700,
      background: cfg.bg,
      color: cfg.color,
      letterSpacing: '0.04em',
    }}>
      {cfg.label}
    </span>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const StorageProof = ({
  ipfsCID,
  ipfsURL,
  fileName,
  fileSize,
  txHash,
  blockNumber,
  txStatus = 'pending',
  networkName = 'localhost',
}) => {
  const explorerBase = etherscanBase(networkName);
  const txLink       = explorerBase && txHash ? `${explorerBase}/tx/${txHash}` : null;
  const addressLink  = explorerBase && ipfsCID ? `${explorerBase}/search?q=${ipfsCID}` : null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '20px',
      borderRadius: '18px',
      background: 'rgba(2, 6, 23, 0.85)',
      border: '1px solid rgba(56, 189, 248, 0.15)',
      backdropFilter: 'blur(16px)',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
          Storage Proof
        </h3>
        <TxStatusBadge status={txStatus} />
      </div>

      {/* ── PART 1: IPFS Proof ── */}
      <ProofCard icon="📁" title="File stored on IPFS (Pinata)" accent="#38bdf8">
        <ProofRow
          label="CID"
          value={shorten(ipfsCID, 12, 8)}
          href={ipfsURL}
          copyText={ipfsCID}
        />
        <ProofRow
          label="Gateway URL"
          value="Open on IPFS ↗"
          href={ipfsURL}
          copyText={ipfsURL}
          mono={false}
        />
        {fileName && (
          <ProofRow label="File" value={fileName} mono={false} />
        )}
        {fileSize && (
          <ProofRow label="Size" value={formatBytes(fileSize)} mono={false} />
        )}
      </ProofCard>

      {/* ── PART 2: Blockchain Proof ── */}
      <ProofCard icon="⛓️" title="CID anchored on Ethereum Blockchain" accent="#a78bfa">
        {txHash ? (
          <>
            <ProofRow
              label="TX Hash"
              value={shorten(txHash)}
              href={txLink}
              copyText={txHash}
            />
            {blockNumber && (
              <ProofRow
                label="Block"
                value={`#${blockNumber.toLocaleString()}`}
                href={explorerBase ? `${explorerBase}/block/${blockNumber}` : null}
                copyText={String(blockNumber)}
                mono={false}
              />
            )}
            {networkName && (
              <ProofRow label="Network" value={networkName.charAt(0).toUpperCase() + networkName.slice(1)} mono={false} />
            )}
          </>
        ) : (
          <div style={{ fontSize: '12px', color: '#64748b', padding: '8px 12px' }}>
            ⏳ Waiting for MetaMask confirmation…
          </div>
        )}
      </ProofCard>

      {/* ── PART 3: Verification explanation ── */}
      <div style={{
        borderRadius: '10px',
        background: 'rgba(16, 185, 129, 0.06)',
        border: '1px solid rgba(16, 185, 129, 0.15)',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', letterSpacing: '0.04em' }}>
          🔍 HOW TO VERIFY THIS RECORD
        </span>
        <ol style={{ margin: 0, paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            `The CID (${shorten(ipfsCID, 10, 6)}) is a cryptographic SHA-256 hash of the file content.`,
            `This CID is permanently stored in the MediChain smart contract on-chain (TX above).`,
            `Download the file from IPFS and compute its hash — it must equal the on-chain CID.`,
            `If even one byte is changed, the CID changes, making tampering immediately detectable.`,
          ].map((step, i) => (
            <li key={i} style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' }}>
              {step}
            </li>
          ))}
        </ol>
      </div>

    </div>
  );
};

export default StorageProof;
