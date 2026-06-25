// medichain/backend/utils/ipfs.js
//
// IPFS File Upload Utility — Pinata SDK (@pinata/sdk)
//
// WHY IPFS?
//   Medical files are uploaded to IPFS — a decentralised, content-addressed
//   storage network. Every file is identified by its CID (Content Identifier),
//   a cryptographic SHA-256 hash of the file's content. If even one byte is
//   modified after upload, the CID changes — making it impossible to silently
//   tamper with records. The CID is then written to the Ethereum blockchain,
//   creating an immutable, auditable chain of custody for every medical record.
//
// CREDENTIAL PRIORITY:
//   1. PINATA_JWT (recommended — single token, supports Pinata V2 API)
//   2. PINATA_API_KEY + PINATA_SECRET_KEY (legacy V1 API keys)
//
// ENV VARIABLES REQUIRED (add to backend/.env):
//   PINATA_JWT=eyJhbGci...               ← Pinata dashboard → API Keys → New Key
//   PINATA_API_KEY=abc123                ← Optional: legacy key fallback
//   PINATA_SECRET_KEY=xyz789             ← Optional: legacy secret fallback
//   PINATA_GATEWAY=gateway.pinata.cloud  ← Or your dedicated Pinata gateway subdomain
//
// INSTALL: npm install @pinata/sdk
//
// EXPORTS:
//   uploadToIPFS(fileBuffer, fileName, metadata)  → { cid, url, size }
//   uploadFileToIPFS(buffer, fileName, mimeType)  → { cid, url }  [compat alias]
//   uploadJSONToIPFS(jsonObject)                  → { cid, url }
//   getIPFSUrl(cid)                               → string
//   verifyIPFSFile(cid)                           → { exists, pinnedAt, size }
//   unpinFromIPFS(cid)                            → { success }
//   testPinataConnection()                        → { authenticated }

'use strict';

const PinataClient = require('@pinata/sdk');
const { Readable }  = require('stream');

// ── Constants ─────────────────────────────────────────────────────────────────

/** Public Pinata gateway base URL (no trailing slash). */
const PINATA_GATEWAY = `https://${process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'}/ipfs`;

/** Upload timeout in ms — Pinata free tier can be slow for large files. */
const UPLOAD_TIMEOUT_MS = 60_000; // 60 s

// ── Lazy-initialised SDK singleton ────────────────────────────────────────────
//
// We construct the client lazily (on first use) rather than at module load time
// so that missing env vars don't crash the server during unit tests or CI.

let _pinataClient = null;

/**
 * Returns the shared PinataClient instance.
 * Validates credentials and throws a descriptive error if unconfigured.
 *
 * @returns {PinataClient}
 */
const getPinataClient = () => {
  if (_pinataClient) return _pinataClient;

  const jwt       = process.env.PINATA_JWT;
  const apiKey    = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;

  // JWT is the recommended credential (supports Pinata V2 API)
  if (jwt && jwt !== 'your_pinata_jwt_here') {
    _pinataClient = new PinataClient({ pinataJWTKey: jwt });
    return _pinataClient;
  }

  // Fallback: classic API key + secret (Pinata V1)
  if (apiKey && secretKey) {
    _pinataClient = new PinataClient({
      pinataApiKey:    apiKey,
      pinataSecretApiKey: secretKey,
    });
    return _pinataClient;
  }

  // Neither credential set — throw a clear configuration error
  throw new Error(
    'Pinata credentials not configured. ' +
    'Set PINATA_JWT (preferred) or PINATA_API_KEY + PINATA_SECRET_KEY in backend/.env. ' +
    'Get credentials at https://app.pinata.cloud/keys'
  );
};

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Converts a Buffer to a Node.js Readable stream.
 * Pinata SDK's pinFileToIPFS expects a ReadableStream, not a raw Buffer.
 *
 * @param {Buffer} buffer
 * @returns {Readable}
 */
const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // signal end-of-stream
  return stream;
};

/**
 * Wraps a promise with a timeout.
 * Pinata uploads occasionally stall — we reject after UPLOAD_TIMEOUT_MS.
 *
 * @param {Promise}  promise
 * @param {number}   ms         timeout in milliseconds
 * @param {string}   label      shown in the rejection message
 * @returns {Promise}
 */
const withTimeout = (promise, ms, label) => {
  const timer = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`IPFS upload timeout after ${ms / 1000}s — check your Pinata API keys and network (${label})`)),
      ms
    )
  );
  return Promise.race([promise, timer]);
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 1: uploadToIPFS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Uploads a file Buffer to IPFS via Pinata.
 *
 * @param {Buffer} fileBuffer   — Raw file bytes (from multer memoryStorage)
 * @param {string} fileName     — Original file name (e.g. "prescription.pdf")
 * @param {object} metadata     — Record-level metadata stored alongside the pin:
 *   {
 *     patientWalletAddress: string,  ← Ethereum address of the patient
 *     recordType:           string,  ← "prescription" | "lab_report" | etc.
 *     uploadedBy:           string,  ← Doctor's wallet address
 *     timestamp:            string,  ← ISO timestamp string
 *   }
 *
 * @returns {Promise<{ cid: string, url: string, size: number }>}
 *   cid   — IPFS Content Identifier (tamper-proof cryptographic hash)
 *   url   — Full Pinata gateway URL — accessible in browser
 *   size  — Pin size in bytes as reported by Pinata
 *
 * @throws {Error} on Pinata API errors or network timeout
 *
 * HOW IT WORKS:
 *   1. Buffer → Readable stream (Pinata SDK requires a stream, not a Buffer)
 *   2. Call pinata.pinFileToIPFS(stream, { pinataMetadata: { name, keyvalues } })
 *      - pinataMetadata.name       → visible in Pinata dashboard
 *      - pinataMetadata.keyvalues  → searchable tags (patient address, record type…)
 *   3. Pinata pins the file across multiple IPFS nodes (replication)
 *   4. Return: CID + gateway URL + pin size
 *
 * TAMPER-PROOF GUARANTEE:
 *   The CID is a SHA-256 hash of the file content. Storing the CID on
 *   the Ethereum blockchain means anyone can verify the file hasn't changed
 *   by re-computing its hash and comparing it to the on-chain CID.
 */
const uploadToIPFS = async (fileBuffer, fileName, metadata = {}) => {
  if (!Buffer.isBuffer(fileBuffer) && !fileBuffer) {
    throw new Error('uploadToIPFS: fileBuffer must be a non-empty Buffer');
  }
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('uploadToIPFS: fileName must be a non-empty string');
  }

  const pinata = getPinataClient();

  // Convert Buffer to stream — pinFileToIPFS requires a ReadableStream
  const stream = bufferToStream(fileBuffer);

  // Pinata options
  // keyvalues are stored as searchable metadata alongside the pin.
  // All values must be strings (Pinata requirement).
  const options = {
    pinataMetadata: {
      name: fileName, // shows as the pin name in the Pinata dashboard
      keyvalues: {
        patientWalletAddress: String(metadata.patientWalletAddress || ''),
        recordType:           String(metadata.recordType           || 'other'),
        uploadedBy:           String(metadata.uploadedBy           || ''),
        timestamp:            String(metadata.timestamp            || new Date().toISOString()),
        app:                  'MediChain',
      },
    },
    pinataOptions: {
      // cidVersion 1 → base32 CID (shorter, more browser-friendly)
      cidVersion: 1,
    },
  };

  try {
    // Race the upload against a 60-second timeout
    const result = await withTimeout(
      pinata.pinFileToIPFS(stream, options),
      UPLOAD_TIMEOUT_MS,
      fileName
    );

    // result.IpfsHash  → the CID (e.g. "bafybei...")
    // result.PinSize   → pin size in bytes
    // result.Timestamp → ISO string
    const cid = result.IpfsHash;
    const url = `${PINATA_GATEWAY}/${cid}`;

    console.log(`[IPFS] ✅ Pinned: ${fileName} → CID: ${cid} (${result.PinSize} bytes)`);

    return {
      cid,
      url,
      size: result.PinSize,
    };

  } catch (err) {
    // Re-wrap with a descriptive context message
    if (err.message?.includes('timeout')) throw err;
    if (err.response?.status === 401) {
      throw new Error(
        'Pinata authentication failed — check PINATA_JWT or PINATA_API_KEY in backend/.env'
      );
    }
    throw new Error(`IPFS upload failed for "${fileName}": ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 1b: uploadFileToIPFS — backward-compatible alias used by doctor.js
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Simplified wrapper used by routes/doctor.js → upload-record.
 * Delegates to uploadToIPFS with mimeType folded into metadata.
 *
 * @param {Buffer} fileBuffer
 * @param {string} fileName
 * @param {string} mimeType    — MIME type (e.g. "application/pdf")
 * @returns {Promise<{ cid: string, url: string }>}
 */
const uploadFileToIPFS = async (fileBuffer, fileName, mimeType = 'application/octet-stream') => {
  const result = await uploadToIPFS(fileBuffer, fileName, {
    timestamp: new Date().toISOString(),
    mimeType,
  });
  return { cid: result.cid, url: result.url };
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 2: uploadJSONToIPFS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Pins a plain JavaScript object as a JSON file to IPFS.
 * Useful for pinning structured metadata or summaries alongside binary files.
 *
 * @param {object} jsonObject   — Must be JSON-serialisable
 * @param {string} [pinName]    — Optional label shown in Pinata dashboard
 * @returns {Promise<{ cid: string, url: string }>}
 * @throws {Error} on Pinata API errors
 */
const uploadJSONToIPFS = async (jsonObject, pinName = 'medichain-metadata') => {
  if (typeof jsonObject !== 'object' || jsonObject === null) {
    throw new Error('uploadJSONToIPFS: jsonObject must be a non-null object');
  }

  const pinata = getPinataClient();

  const options = {
    pinataMetadata: {
      name: pinName,
      keyvalues: { app: 'MediChain', type: 'json' },
    },
  };

  try {
    const result = await withTimeout(
      pinata.pinJSONToIPFS(jsonObject, options),
      UPLOAD_TIMEOUT_MS,
      pinName
    );

    const cid = result.IpfsHash;
    const url = `${PINATA_GATEWAY}/${cid}`;

    console.log(`[IPFS] ✅ JSON pinned: ${pinName} → CID: ${cid}`);
    return { cid, url };

  } catch (err) {
    if (err.message?.includes('timeout')) throw err;
    throw new Error(`IPFS JSON upload failed: ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 3: getIPFSUrl
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Converts a bare IPFS CID to a fully-qualified Pinata gateway URL.
 * Pure function — no network calls.
 *
 * @param {string} cid   — IPFS Content Identifier (v0 "Qm..." or v1 "bafybei...")
 * @returns {string}     — e.g. "https://gateway.pinata.cloud/ipfs/bafybei..."
 *
 * Usage:
 *   const url = getIPFSUrl(record.ipfsCID);
 *   // → "https://gateway.pinata.cloud/ipfs/bafybeib..."
 */
const getIPFSUrl = (cid) => {
  if (!cid || typeof cid !== 'string') {
    throw new Error('getIPFSUrl: cid must be a non-empty string');
  }
  return `${PINATA_GATEWAY}/${cid}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 4: verifyIPFSFile
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Verifies that a given CID is currently pinned on Pinata.
 *
 * WHY THIS MATTERS:
 *   When a patient or auditor wants to confirm a medical record hasn't been
 *   deleted from IPFS, they can call this to verify the pin still exists.
 *   Combined with the on-chain CID, this proves both existence and integrity.
 *
 * @param {string} cid   — IPFS Content Identifier to look up
 * @returns {Promise<{
 *   exists:   boolean,          ← true if Pinata has an active pin for this CID
 *   pinnedAt: string | null,    ← ISO timestamp of when it was pinned
 *   size:     number | null,    ← Pin size in bytes
 *   url:      string | null,    ← Gateway URL (convenience)
 * }>}
 * @throws {Error} on Pinata API errors (not on "not found")
 */
const verifyIPFSFile = async (cid) => {
  if (!cid || typeof cid !== 'string') {
    throw new Error('verifyIPFSFile: cid must be a non-empty string');
  }

  const pinata = getPinataClient();

  try {
    // pinList with hashContains returns all pins matching the given CID substring.
    // For an exact match, the returned list should contain exactly 1 item.
    const result = await pinata.pinList({ hashContains: cid });

    if (!result || !result.rows || result.rows.length === 0) {
      return { exists: false, pinnedAt: null, size: null, url: null };
    }

    // Find the exact CID match (not just a substring match)
    const pin = result.rows.find((r) => r.ipfs_pin_hash === cid);

    if (!pin) {
      return { exists: false, pinnedAt: null, size: null, url: null };
    }

    return {
      exists:   true,
      pinnedAt: pin.date_pinned || null,
      size:     pin.size || null,
      url:      `${PINATA_GATEWAY}/${cid}`,
    };

  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error(
        'Pinata authentication failed during CID verification. Check credentials.'
      );
    }
    throw new Error(`IPFS verification failed for CID "${cid}": ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 5: unpinFromIPFS
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Removes a pin from Pinata — FOR ADMIN USE ONLY.
 *
 * ⚠️  IMPORTANT: Unpinning does NOT delete the file from the IPFS network
 *     immediately. It only removes Pinata's replication. If other nodes
 *     have cached the file, it may still be accessible. However, it will
 *     eventually be garbage-collected from the network.
 *
 * In MediChain, unpinning is intentionally restricted:
 *   - Only call this for test data cleanup or GDPR "right to erasure" requests.
 *   - The on-chain CID remains — blockchain records are immutable.
 *   - Consider this a "best-effort" deletion.
 *
 * @param {string} cid   — IPFS Content Identifier to unpin
 * @returns {Promise<{ success: boolean, cid: string }>}
 * @throws {Error} if the CID is not pinned or Pinata returns an error
 */
const unpinFromIPFS = async (cid) => {
  if (!cid || typeof cid !== 'string') {
    throw new Error('unpinFromIPFS: cid must be a non-empty string');
  }

  const pinata = getPinataClient();

  try {
    await pinata.unpin(cid);
    console.log(`[IPFS] 🗑️  Unpinned CID: ${cid}`);
    return { success: true, cid };

  } catch (err) {
    if (err.response?.status === 400) {
      throw new Error(
        `CID "${cid}" is not currently pinned on this Pinata account.`
      );
    }
    if (err.response?.status === 401) {
      throw new Error(
        'Pinata authentication failed during unpin. Check credentials.'
      );
    }
    throw new Error(`IPFS unpin failed for CID "${cid}": ${err.message}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 6: testPinataConnection
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Validates Pinata credentials by calling the authentication test endpoint.
 * Called on server startup (in server.js) to give an early warning if
 * Pinata is misconfigured — before any real upload attempts fail.
 *
 * @returns {Promise<{ authenticated: boolean, message: string }>}
 *
 * NEVER throws — always returns a result object so the server can log
 * a warning and continue even if Pinata is unreachable.
 */
const testPinataConnection = async () => {
  try {
    // Ensure credentials are configured before attempting the test
    getPinataClient(); // throws if not configured
    const pinata = getPinataClient();

    const result = await pinata.testAuthentication();

    // Pinata returns { message: "Congratulations! You are communicating with the Pinata API!" }
    if (result && result.message) {
      console.log('📦  [IPFS] Pinata connection: ✅ Authenticated');
      return { authenticated: true, message: result.message };
    }

    console.warn('📦  [IPFS] Pinata connection: ⚠️  Unexpected response —', result);
    return { authenticated: false, message: 'Unexpected response from Pinata' };

  } catch (err) {
    // Pinata 401: bad credentials
    if (err.response?.status === 401 || err.message?.includes('authentication')) {
      const msg = 'Pinata authentication FAILED — check PINATA_JWT in backend/.env';
      console.error('📦  [IPFS]', msg);
      return { authenticated: false, message: msg };
    }

    // Credentials not configured
    if (err.message?.includes('credentials not configured')) {
      const msg = 'Pinata credentials NOT SET — IPFS uploads will fail. Set PINATA_JWT in backend/.env';
      console.warn('📦  [IPFS]', msg);
      return { authenticated: false, message: msg };
    }

    // Network error / Pinata service down
    const msg = `Pinata service unreachable: ${err.message}`;
    console.warn('📦  [IPFS]', msg);
    return { authenticated: false, message: msg };
  }
};

// ── Module exports ─────────────────────────────────────────────────────────────
module.exports = {
  uploadToIPFS,         // FUNCTION 1 — primary upload (buffer + full metadata)
  uploadFileToIPFS,     // FUNCTION 1b — compat alias (buffer + mimeType)
  uploadJSONToIPFS,     // FUNCTION 2 — pin JSON metadata
  getIPFSUrl,           // FUNCTION 3 — CID → gateway URL
  verifyIPFSFile,       // FUNCTION 4 — check if CID is pinned
  unpinFromIPFS,        // FUNCTION 5 — admin unpin
  testPinataConnection, // FUNCTION 6 — startup health check
};
