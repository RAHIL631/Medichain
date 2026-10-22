import { render, screen } from '@testing-library/react';
import Profile from './Profile';
import { useAuth } from '../context/AuthContext';
import { useWalletContext } from '../context/WalletContext';
import {
  TARGET_CHAIN_ID,
  TARGET_NETWORK_NAME,
} from '../hooks/useBlockchain';

jest.mock('../components/DashboardLayout', () => ({ children }) => children);
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('../context/WalletContext', () => ({
  useWalletContext: jest.fn(),
}));

beforeEach(() => {
  useAuth.mockReturnValue({
    user: {
      name: 'Test Patient',
      email: 'patient@example.test',
      role: 'patient',
    },
    updateWallet: jest.fn(),
  });
  useWalletContext.mockReturnValue({
    address: null,
    signer: null,
    isConnected: false,
    chainId: null,
    network: null,
    connectWallet: jest.fn(),
  });
});

test('shows the configured blockchain network when no wallet is connected', () => {
  render(<Profile />);

  expect(screen.getByText(TARGET_NETWORK_NAME)).toBeInTheDocument();
  expect(screen.getByText(String(TARGET_CHAIN_ID))).toBeInTheDocument();
});

test('shows the connected wallet network and chain instead of the configured default', () => {
  useWalletContext.mockReturnValue({
    address: '0x1234567890123456789012345678901234567890',
    signer: null,
    isConnected: true,
    chainId: 1,
    network: { name: 'Ethereum Mainnet' },
    connectWallet: jest.fn(),
  });

  render(<Profile />);

  expect(screen.getByText('Ethereum Mainnet')).toBeInTheDocument();
  expect(screen.getByText('1')).toBeInTheDocument();
});
