const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../utils/cache', () => {
  const actual = jest.requireActual('../utils/cache');
  return {
    ...actual,
    connectRedis: jest.fn(),
    getRedisClient: jest.fn(() => null),
  };
});

jest.mock('../utils/ipfs', () => {
  const actual = jest.requireActual('../utils/ipfs');
  return {
    ...actual,
    testPinataConnection: jest.fn(),
  };
});

const app = require('../server');
const User = require('../models/User');
const blockchainService = require('../services/blockchainService');
const { testPinataConnection } = require('../utils/ipfs');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await User.deleteMany({});
  testPinataConnection.mockResolvedValue({
    authenticated: true,
    message: 'Local IPFS fallback available',
    mode: 'local',
  });
  jest.spyOn(blockchainService, 'checkHealth').mockResolvedValue({
    status: 'UP',
    network: 'Hardhat Local',
  });
  jest.spyOn(axios, 'get').mockResolvedValue({
    status: 200,
    data: { service: 'medichain-ai' },
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('reports healthy when only the optional Redis cache is offline', async () => {
  const admin = await User.create({
    name: 'Health Check Admin',
    email: 'health-admin@example.test',
    password: 'TestPassword123!',
    role: 'admin',
  });
  const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET);

  const response = await request(app)
    .get('/api/admin/system-health')
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toBe(200);
  expect(response.body.status).toBe('healthy');
  expect(response.body.services.redis).toMatchObject({
    status: 'offline',
    detail: 'Redis optional — caching disabled',
  });
});
