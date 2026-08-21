// medichain/backend/services/tokenBlocklist.js
//
// Server-side JWT token blocklist using Redis.
// Revoked tokens (on logout) are stored here until they expire.
// This ensures true logout even though JWTs are stateless.
//
// ENV: Requires REDIS_URL or falls back gracefully (logs warning).

'use strict';

let redisClient = null;

// Lazy-load the Redis client (same one used by cache.js)
const getRedis = () => {
  if (redisClient) return redisClient;
  try {
    const { getRedisClient } = require('../utils/cache');
    redisClient = getRedisClient();
  } catch {
    // Redis not available — blocklist will be non-functional
  }
  return redisClient;
};

const BLOCKLIST_PREFIX = 'medichain:blocklist:';

/**
 * Add a token to the blocklist. Expires when the token expires.
 *
 * @param {string} token      — The raw JWT string
 * @param {number} expiresIn  — Seconds until the token expires (used for Redis TTL)
 */
const blockToken = async (token, expiresIn = 86400) => {
  const redis = getRedis();
  if (!redis) {
    console.warn('[BLOCKLIST] Redis unavailable — token not blocklisted (logout is client-side only)');
    return false;
  }
  try {
    // Store token hash (not full token) to save space
    const nodeCrypto = require('crypto');
    const hash = nodeCrypto.createHash('sha256').update(token).digest('hex');
    await redis.setEx(`${BLOCKLIST_PREFIX}${hash}`, expiresIn, '1');
    return true;
  } catch (err) {
    console.error('[BLOCKLIST] Error blocking token:', err.message);
    return false;
  }
};

/**
 * Check if a token has been blocklisted.
 *
 * @param {string} token — The raw JWT string
 * @returns {boolean} true if blocklisted (should be rejected)
 */
const isTokenBlocked = async (token) => {
  const redis = getRedis();
  if (!redis) return false; // Fail open if Redis is down
  try {
    const nodeCrypto = require('crypto');
    const hash = nodeCrypto.createHash('sha256').update(token).digest('hex');
    const result = await redis.get(`${BLOCKLIST_PREFIX}${hash}`);
    return result === '1';
  } catch (err) {
    console.error('[BLOCKLIST] Error checking token:', err.message);
    return false; // Fail open
  }
};

module.exports = { blockToken, isTokenBlocked };
