// backend/utils/cache.js
const { createClient } = require('redis');

let redisClient;

const connectRedis = async () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
        redisClient = createClient({ url: redisUrl });
        
        redisClient.on('error', (err) => console.log('[Redis] Client Error:', err));
        redisClient.on('connect', () => console.log('[Redis] Connected gracefully 🚀'));

        await redisClient.connect();
    } catch (err) {
        console.error('[Redis] Failed to connect:', err);
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
    getRedisClient: () => redisClient
};
