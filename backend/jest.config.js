// File: medichain/backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'controllers/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js'
  ],
  testMatch: [
    '**/tests/**/*.test.js'
  ],
  setupFilesAfterEnv: [],
  testTimeout: 30000, // 30s timeout for supertest/mongodb-memory-server
  // Force Jest to exit after all tests complete — prevents hanging on open handles
  // (Redis client, pino-http timers, rate-limiter windows, etc.)
  forceExit:   true,
  // Log which resources prevent clean exit (development only — remove for CI speed)
  detectOpenHandles: process.env.CI !== 'true',
};

if (!process.env.MONGOMS_SYSTEM_BINARY && process.platform === 'win32') {
  process.env.MONGOMS_SYSTEM_BINARY = 'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe';
}
