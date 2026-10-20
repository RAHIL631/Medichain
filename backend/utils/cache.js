// backend/utils/cache.js
const { createClient } = require('redis');

let redisClient;

const connectRedis = async () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
        redisClient = createClient({ url: redisUrl });
        
        let redisErrorLogged = false;
        redisClient.on('error', (err) => {
            if (!redisErrorLogged) {
                console.warn('[Redis] Unavailable — caching disabled. Run Redis to enable it.');
                redisErrorLogged = true;
            }
        });
        redisClient.on('connect', () => console.log('[Redis] Connected ✓'));

        await redisClient.connect();
    } catch (err) {
        console.warn('[Redis] Could not connect — caching disabled.');
    }
};

/**
 * Middleware to cache express route responses
 * @param {Number} duration - Cache duration in seconds
 */
const cacheRoute = (duration = 60) => {
    return async (req, res, next) => {
        if (!redisClient || !redisClient.isReady) {
            return next(); // Fallback to non-cached if Redis isn't up
        }
        
        const key = `__express__${req.originalUrl || req.url}`;
        try {
            const cachedBody = await redisClient.get(key);
            if (cachedBody) {
                console.log(`[Redis] Cache Hit for: ${key}`);
                return res.send(JSON.parse(cachedBody));
            } else {
                console.log(`[Redis] Cache Miss for: ${key}`);
                // Intercept res.send to cache the payload
                res.sendResponse = res.send;
                res.send = (body) => {
                    // Only cache successful responses
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        redisClient.setEx(key, duration, JSON.stringify(body));
                    }
                    res.sendResponse(body);
                };
                return next();
            }
        } catch (err) {
            console.error('[Redis] Cache Middleware Error:', err);
            return next();
        }
    };
};

module.exports = {
    connectRedis,
    cacheRoute,
    getRedisClient: () => redisClient,

    /**
     * Invalidate a single cached route by its URL path.
     * Call after POST/PUT/DELETE operations to prevent stale cache reads.
     * @param {string} urlPath — e.g. '/api/patient/records'
     */
    invalidateCache: async (urlPath) => {
        if (!redisClient || !redisClient.isReady) return;
        const key = `__express__${urlPath}`;
        try {
            await redisClient.del(key);
            console.log(`[Redis] Cache invalidated: ${key}`);
        } catch (err) {
            console.warn('[Redis] Cache invalidation error:', err.message);
        }
    },

    /**
     * Invalidate all cached routes matching a key pattern.
     * Uses SCAN (not KEYS) to avoid blocking Redis in production.
     * @param {string} pattern — e.g. '/api/patient/*' or '/api/doctor/*'
     */
    invalidateCachePattern: async (pattern) => {
        if (!redisClient || !redisClient.isReady) return;
        const keyPattern = `__express__${pattern}`;
        try {
            let cursor = 0;
            let count = 0;
            do {
                const result = await redisClient.scan(cursor, { MATCH: keyPattern, COUNT: 100 });
                cursor = result.cursor;
                if (result.keys.length > 0) {
                    await redisClient.del(result.keys);
                    count += result.keys.length;
                }
            } while (cursor !== 0);
            if (count > 0) {
                console.log(`[Redis] Cache pattern invalidated (${count} keys): ${keyPattern}`);
            }
        } catch (err) {
            console.warn('[Redis] Cache pattern invalidation error:', err.message);
        }
    },
};
