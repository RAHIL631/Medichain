// backend/tests/integration.test.js
const request = require('supertest');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// We test the middlewares directly using a dummy express app to avoid starting MongoDB/Redis just for basic middleware tests
const app = express();
app.use(helmet());
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 2, 
    message: 'Too many requests'
});
app.use('/api', limiter);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.get('/api/test', (req, res) => res.status(200).json({ msg: 'success' }));

describe('Production Readiness & Security Middleware Tests', () => {
    
    it('Should return 200 OK on health check', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('ok');
    });

    it('Should have security headers injected by Helmet', async () => {
        const res = await request(app).get('/health');
        expect(res.headers['x-dns-prefetch-control']).toBe('off');
        expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
        expect(res.headers['strict-transport-security']).toBeDefined();
    });

    it('Should enforce rate limiting on API routes', async () => {
        // Request 1
        let res = await request(app).get('/api/test');
        expect(res.statusCode).toEqual(200);
        
        // Request 2
        res = await request(app).get('/api/test');
        expect(res.statusCode).toEqual(200);
        
        // Request 3 (Should be rate limited because max is 2)
        res = await request(app).get('/api/test');
        expect(res.statusCode).toEqual(429);
        expect(res.text).toContain('Too many requests');
    });

});
