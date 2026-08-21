// medichain/backend/utils/encryption.js
//
// AES-256-GCM encryption/decryption for medical files before IPFS upload.
//
// WHY AES-256-GCM?
//   - AES-256 provides 256-bit key strength (NSA Suite B, used for TOP SECRET)
//   - GCM mode provides authenticated encryption (integrity + confidentiality)
//   - Authentication tag prevents undetected tampering of ciphertext
//   - Per-record unique IV (nonce) prevents pattern analysis across records
//
// KEY ARCHITECTURE:
//   - ENCRYPTION_MASTER_KEY  (env, 64 hex chars = 256 bits) — never changes
//   - Per-record data key    (32 random bytes) — different for every file
//   - The per-record key is encrypted with the master key before being stored in MongoDB
//
// FLOW:
//   Encrypt: fileBuffer + masterKey → encryptedBuffer + encryptedKey + iv + authTag
//   Decrypt: encryptedBuffer + encryptedKey + masterKey → originalFileBuffer
//
// STORAGE:
//   Upload encryptedBuffer to IPFS.
//   Store { encryptedKey, iv, authTag } in MongoDB MedicalRecord.encryptionMeta
//
// ENV:
//   ENCRYPTION_MASTER_KEY=<64 hex chars>
//   Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LEN   = 32; // 256 bits
const IV_LEN    = 16; // 128 bits (GCM standard)
const TAG_LEN   = 16; // GCM auth tag length

/**
 * Get the master encryption key from environment.
 * @returns {Buffer} 32-byte master key
 */
const getMasterKey = () => {
  const hexKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!hexKey || hexKey.length !== 64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'ENCRYPTION_MASTER_KEY is required in production. ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    // Development fallback — NOT secure, logs a warning
    console.warn(
      '[ENCRYPTION] ⚠️  ENCRYPTION_MASTER_KEY not set. Using insecure dev key. ' +
      'Set this in backend/.env before storing real medical data.'
    );
    return crypto.scryptSync('medichain-dev-key', 'salt-dev', KEY_LEN);
  }
  return Buffer.from(hexKey, 'hex');
};

/**
 * Encrypt a Buffer with AES-256-GCM.
 * Returns everything needed to decrypt + store.
 *
 * @param {Buffer} plainBuffer — original file bytes
 * @returns {{
 *   encryptedBuffer: Buffer,  — upload this to IPFS
 *   encryptedKey:    string,  — store in MongoDB (hex)
 *   iv:              string,  — store in MongoDB (hex)
 *   authTag:         string,  — store in MongoDB (hex)
 * }}
 */
const encryptBuffer = (plainBuffer) => {
  if (!Buffer.isBuffer(plainBuffer)) throw new Error('encryptBuffer: input must be a Buffer');

  const masterKey = getMasterKey();

  // 1. Generate a unique data key for this record
  const dataKey = crypto.randomBytes(KEY_LEN);

  // 2. Encrypt the file with the data key
  const iv     = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGORITHM, dataKey, iv);
  const encrypted  = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag    = cipher.getAuthTag();

  // 3. Encrypt the data key with the master key (key wrapping)
  const keyIv        = crypto.randomBytes(IV_LEN);
  const keyCipher    = crypto.createCipheriv(ALGORITHM, masterKey, keyIv);
  const encryptedKey = Buffer.concat([keyCipher.update(dataKey), keyCipher.final()]);
  const keyAuthTag   = keyCipher.getAuthTag();

  // Store key IV + key auth tag + encrypted key together for simplicity
  const keyBundle = Buffer.concat([keyIv, keyAuthTag, encryptedKey]);

  return {
    encryptedBuffer: encrypted,
    encryptedKey:    keyBundle.toString('hex'),  // store in MongoDB
    iv:              iv.toString('hex'),          // store in MongoDB
    authTag:         authTag.toString('hex'),     // store in MongoDB
  };
};

/**
 * Decrypt an encrypted Buffer using stored metadata.
 *
 * @param {Buffer} encryptedBuffer — from IPFS
 * @param {string} encryptedKey    — hex string from MongoDB
 * @param {string} iv              — hex string from MongoDB
 * @param {string} authTag         — hex string from MongoDB
 * @returns {Buffer} original file bytes
 */
const decryptBuffer = (encryptedBuffer, encryptedKey, iv, authTag) => {
  if (!Buffer.isBuffer(encryptedBuffer)) throw new Error('decryptBuffer: input must be a Buffer');

  const masterKey  = getMasterKey();
  const keyBundle  = Buffer.from(encryptedKey, 'hex');

  // Extract key IV, key auth tag, and encrypted data key from bundle
  const keyIv         = keyBundle.slice(0, IV_LEN);
  const keyAuthTag    = keyBundle.slice(IV_LEN, IV_LEN + TAG_LEN);
  const encryptedDataKey = keyBundle.slice(IV_LEN + TAG_LEN);

  // 1. Decrypt the data key
  const keyDecipher = crypto.createDecipheriv(ALGORITHM, masterKey, keyIv);
  keyDecipher.setAuthTag(keyAuthTag);
  const dataKey = Buffer.concat([keyDecipher.update(encryptedDataKey), keyDecipher.final()]);

  // 2. Decrypt the file
  const decipher = crypto.createDecipheriv(ALGORITHM, dataKey, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  return Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
};

/**
 * Returns true if the encryption system is properly configured.
 * Use this to warn on startup if master key is missing.
 */
const isEncryptionConfigured = () => {
  const hexKey = process.env.ENCRYPTION_MASTER_KEY;
  return !!(hexKey && hexKey.length === 64);
};

module.exports = { encryptBuffer, decryptBuffer, isEncryptionConfigured };
