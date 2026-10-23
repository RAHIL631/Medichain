import { resolveContractAddress, TARGET_CHAIN_ID } from './contractConfig';

const sepoliaAddress = '0x54fb71438b6A79947BE43dFAfB72194619405004';
const localAddress = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

test('uses the configured chain artifact or documented Sepolia deployment', () => {
  const artifact = {
    address: localAddress,
    chainId: 31337,
  };
  const expectedAddress = TARGET_CHAIN_ID === 11155111
    ? sepoliaAddress
    : TARGET_CHAIN_ID === 31337
      ? localAddress
      : '';

  expect(resolveContractAddress(artifact)).toBe(expectedAddress);
});

test('uses the explicit deployment address when configured', () => {
  const originalAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  process.env.REACT_APP_CONTRACT_ADDRESS = localAddress;

  try {
    expect(resolveContractAddress({
      address: sepoliaAddress,
      chainId: 11155111,
    })).toBe(localAddress);
  } finally {
    if (originalAddress === undefined) delete process.env.REACT_APP_CONTRACT_ADDRESS;
    else process.env.REACT_APP_CONTRACT_ADDRESS = originalAddress;
  }
});

test('rejects invalid explicit contract addresses instead of silently using another deployment', () => {
  const originalAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  process.env.REACT_APP_CONTRACT_ADDRESS = 'not-an-address';

  try {
    expect(() => resolveContractAddress({
      address: localAddress,
      chainId: 31337,
    })).toThrow('REACT_APP_CONTRACT_ADDRESS must be a valid Ethereum address.');
  } finally {
    if (originalAddress === undefined) delete process.env.REACT_APP_CONTRACT_ADDRESS;
    else process.env.REACT_APP_CONTRACT_ADDRESS = originalAddress;
  }
});
