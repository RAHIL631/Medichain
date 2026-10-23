import { act, renderHook, waitFor } from '@testing-library/react';
import { ethers } from 'ethers';
import { useContract, useWallet } from './useBlockchain';

jest.mock('ethers', () => ({
  ethers: {
    Contract: jest.fn(),
    BrowserProvider: jest.fn(),
    formatEther: jest.fn(),
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

test('shares a pending MetaMask connection request instead of prompting twice', async () => {
  const previousEthereum = window.ethereum;
  const address = '0x1111111111111111111111111111111111111111';
  const signer = { getAddress: jest.fn().mockResolvedValue(address) };
  let resolveAccounts;
  const provider = {
    send: jest.fn(() => new Promise((resolve) => {
      resolveAccounts = resolve;
    })),
    getSigner: jest.fn().mockResolvedValue(signer),
    getNetwork: jest.fn().mockResolvedValue({ chainId: 11155111n }),
    getBalance: jest.fn().mockResolvedValue(1n),
  };
  window.ethereum = { on: jest.fn(), removeListener: jest.fn() };
  localStorage.removeItem('medichain_wallet_address');
  ethers.BrowserProvider.mockImplementation(() => provider);
  ethers.formatEther.mockReturnValue('1.0');

  try {
    const { result, unmount } = renderHook(() => useWallet());
    try {
      let firstRequest;
      let secondRequest;
      act(() => {
        firstRequest = result.current.connectWallet();
        secondRequest = result.current.connectWallet();
      });

      expect(secondRequest).toBe(firstRequest);
      await waitFor(() => expect(provider.send).toHaveBeenCalledTimes(1));
      expect(provider.send).toHaveBeenCalledWith('eth_requestAccounts', []);

      await act(async () => {
        resolveAccounts([address]);
        await expect(firstRequest).resolves.toMatchObject({
          address,
          chainId: 11155111,
          balance: '1.0',
        });
      });
    } finally {
      unmount();
    }
  } finally {
    if (previousEthereum === undefined) delete window.ethereum;
    else window.ethereum = previousEthereum;
  }
});
