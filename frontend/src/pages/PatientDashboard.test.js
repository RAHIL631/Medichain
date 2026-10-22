import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
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
  api.get.mockClear();
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

test('views a patient record through the authenticated decrypting endpoint', async () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:synthetic-record');
  URL.revokeObjectURL = jest.fn();
  api.get
    .mockResolvedValueOnce({
      data: {
        total: 1,
        records: [{
          _id: 'synthetic-record-1',
          recordType: 'prescription',
          description: 'Synthetic prescription',
          fileName: 'prescription.pdf',
          fileMimeType: 'application/pdf',
        }],
      },
    })
    .mockResolvedValueOnce({
      data: new Blob(['Synthetic PDF'], { type: 'application/pdf' }),
      headers: { 'content-type': 'application/pdf' },
    });

  try {
    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'View' }));

    expect(await screen.findByRole('dialog', { name: 'Preview prescription.pdf' })).toBeInTheDocument();
    expect(screen.getByTitle('Preview prescription.pdf')).toHaveAttribute('src', 'blob:synthetic-record');
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('download', 'prescription.pdf');
    expect(api.get).toHaveBeenLastCalledWith(
      '/patient/record/synthetic-record-1/download',
      { responseType: 'blob' }
    );
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({
      type: 'application/pdf',
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-record');
  } finally {
    if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL;
    else delete URL.createObjectURL;
    if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL;
    else delete URL.revokeObjectURL;
  }
});

test('shows an error when a record cannot be opened', async () => {
  api.get
    .mockResolvedValueOnce({
      data: {
        total: 1,
        records: [{
          _id: 'synthetic-record-1',
          recordType: 'prescription',
          description: 'Synthetic prescription',
        }],
      },
    })
    .mockRejectedValueOnce(new Error('Synthetic preview failure'));

  render(
    <MemoryRouter>
      <PatientDashboard />
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole('button', { name: 'View' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Synthetic preview failure');
});
