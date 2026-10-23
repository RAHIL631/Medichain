const createService = (env) => {
  const keys = [
    'NODE_ENV',
    'BLOCKCHAIN_RPC_URL',
    'BLOCKCHAIN_CHAIN_ID',
    'SEPOLIA_RPC_URL',
    'CONTRACT_ADDRESS',
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  keys.forEach((key) => delete process.env[key]);
  Object.assign(process.env, env);

  let service;
  jest.isolateModules(() => {
    service = require('../services/blockchainService');
  });

  keys.forEach((key) => {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  });

  return service;
};

describe('BlockchainService deployment configuration', () => {
  it('uses Sepolia settings in production without falling back to local artifacts', () => {
    const service = createService({
      NODE_ENV: 'production',
      SEPOLIA_RPC_URL: 'https://sepolia.example/rpc',
    });

    expect(service.rpcUrl).toBe('https://sepolia.example/rpc');
    expect(service.chainId).toBe(11155111);
    expect(service.contractAddress).toBe('');
  });

  it('does not silently use a local node or local contract artifact in production', () => {
    const service = createService({ NODE_ENV: 'production' });

    expect(service.rpcUrl).toBe('');
    expect(service.contractAddress).toBe('');
  });

  it('preserves local Hardhat defaults outside production', () => {
    const service = createService({ NODE_ENV: 'development' });

    expect(service.rpcUrl).toBe('http://127.0.0.1:8545');
    expect(service.chainId).toBe(31337);
    expect(service.contractAddress).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
