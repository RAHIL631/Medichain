import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import api from '../utils/api';
import PatientDashboard from './PatientDashboard';

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Synthetic Patient', walletVerified: false, walletAddress: null },
  }),
}));
jest.mock('../context/WalletContext', () => ({
  useWalletContext: () => ({ isConnected: false, address: null }),
}));
jest.mock('../components/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));
jest.mock('../components/WalletConnectionModal', () => () => null);

beforeEach(() => {
  localStorage.clear();
  api.get.mockResolvedValue({
    data: {
      total: 24,
      records: [{
        _id: 'synthetic-record-1',
        recordType: 'lab-report',
        description: 'Synthetic summary',
        createdAt: '2026-10-22T00:00:00.000Z',
      }],
    },
  });
});

test('loads only the recent records once and uses the returned total', async () => {
  render(
    <MemoryRouter>
      <PatientDashboard />
    </MemoryRouter>
  );

  expect(await screen.findByText('24')).toBeInTheDocument();
  expect(await screen.findByText('Synthetic summary')).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith('/patient/records', { params: { limit: 5 } });
});

test('shows an error instead of an empty-record state when loading fails', async () => {
  api.get.mockRejectedValueOnce(new Error('Synthetic request failure'));

  render(
    <MemoryRouter>
      <PatientDashboard />
    </MemoryRouter>
  );

  expect(await screen.findByRole('alert')).toHaveTextContent('Synthetic request failure');
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  expect(screen.queryByText('No medical records yet')).not.toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(1);
});
