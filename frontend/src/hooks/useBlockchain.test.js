import { renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';
import { useContract } from './useBlockchain';

jest.mock('ethers', () => ({
  ethers: {
    Contract: jest.fn(),
  },
}));

test('creates a contract after the deferred ethers module loads', async () => {
  const originalContractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
  process.env.REACT_APP_CONTRACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  const signer = { getAddress: jest.fn() };

  try {
    const { result } = renderHook(() => useContract(signer));
    expect(result.current).toBeNull();

    await waitFor(() => expect(ethers.Contract).toHaveBeenCalledTimes(1));
    expect(ethers.Contract).toHaveBeenCalledWith(
      process.env.REACT_APP_CONTRACT_ADDRESS,
      expect.any(Array),
      signer
    );
    expect(result.current).toBeInstanceOf(ethers.Contract);
  } finally {
    if (originalContractAddress === undefined) {
      delete process.env.REACT_APP_CONTRACT_ADDRESS;
    } else {
      process.env.REACT_APP_CONTRACT_ADDRESS = originalContractAddress;
    }
  }
});
