import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../utils/api';
import AccessManager from './AccessManager';

const mockContract = {
  isRegistered: jest.fn(),
  registerPatient: jest.fn(),
  grantDoctorAccess: jest.fn(),
  hasAccess: jest.fn(),
  filters: {
    DoctorAccessGranted: jest.fn((address) => ({ type: 'grant', address })),
    DoctorAccessRevoked: jest.fn((address) => ({ type: 'revoke', address })),
  },
  queryFilter: jest.fn().mockResolvedValue([]),
  on: jest.fn(),
  off: jest.fn(),
};
let mockPatientRegistered = false;

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));
jest.mock('../context/WalletContext', () => ({
  useWalletContext: () => ({
    signer: {
      getAddress: jest.fn().mockResolvedValue('0x1111111111111111111111111111111111111111'),
      provider: { getNetwork: jest.fn().mockResolvedValue({ chainId: 11155111n }) },
    },
    address: '0x1111111111111111111111111111111111111111',
    isConnected: true,
    chainId: 11155111,
  }),
}));
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      role: 'patient',
      walletVerified: true,
      walletAddress: '0x1111111111111111111111111111111111111111',
    },
  }),
}));
jest.mock('../hooks/useBlockchain', () => ({
  TARGET_CHAIN_ID: 11155111,
  TARGET_EXPLORER_URL: 'https://sepolia.etherscan.io',
  TARGET_NETWORK_NAME: 'Sepolia Testnet',
  useContract: () => mockContract,
}));
jest.mock('./WalletConnectionModal', () => () => null);

beforeEach(() => {
  jest.clearAllMocks();
  mockPatientRegistered = false;
  mockContract.queryFilter.mockResolvedValue([]);
  mockContract.hasAccess.mockResolvedValue(false);
  mockContract.isRegistered.mockImplementation(async () => mockPatientRegistered);
  mockContract.registerPatient.mockImplementation(async () => ({
    hash: '0xregistration',
    wait: jest.fn().mockImplementation(async () => {
      mockPatientRegistered = true;
      return { status: 1 };
    }),
  }));
  mockContract.grantDoctorAccess.mockResolvedValue({
    hash: '0xgrant',
    wait: jest.fn().mockResolvedValue({ status: 1 }),
  });
  api.post.mockResolvedValue({ data: { success: true } });
});

test('registers the patient wallet before granting consent to a doctor', async () => {
  render(<AccessManager />);

  fireEvent.click(await screen.findByRole('button', { name: 'Register Patient Wallet' }));
  await waitFor(() => expect(mockContract.registerPatient).toHaveBeenCalledTimes(1));
  expect(api.post).toHaveBeenCalledWith('/patient/confirm-registration');

  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: '0x2222222222222222222222222222222222222222' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Grant Access' }));

  await waitFor(() => {
    expect(mockContract.grantDoctorAccess).toHaveBeenCalledWith(
      '0x2222222222222222222222222222222222222222'
    );
  });
  expect(await screen.findByText('Access Granted!')).toBeInTheDocument();
});

test('does not grant consent when the patient registration transaction fails', async () => {
  mockContract.registerPatient.mockRejectedValueOnce(new Error('Transaction rejected'));
  render(<AccessManager />);

  fireEvent.click(await screen.findByRole('button', { name: 'Register Patient Wallet' }));

  expect(await screen.findByText('Transaction rejected')).toBeInTheDocument();
  expect(mockContract.grantDoctorAccess).not.toHaveBeenCalled();
});
