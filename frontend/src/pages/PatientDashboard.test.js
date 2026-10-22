import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  const popup = {
    close: jest.fn(),
    location: { replace: jest.fn() },
    opener: window,
  };
  const openSpy = jest.spyOn(window, 'open').mockReturnValue(popup);
  const originalCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:synthetic-record');
  api.get
    .mockResolvedValueOnce({
      data: {
        total: 1,
        records: [{
          _id: 'synthetic-record-1',
          recordType: 'prescription',
          description: 'Synthetic prescription',
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

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/patient/record/synthetic-record-1/download',
        { responseType: 'blob' }
      );
      expect(popup.location.replace).toHaveBeenCalledWith('blob:synthetic-record');
    });
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank');
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({
      type: 'application/pdf',
    }));
  } finally {
    openSpy.mockRestore();
    if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL;
    else delete URL.createObjectURL;
  }
});

test('shows an error and closes the preview if a record cannot be opened', async () => {
  const popup = { close: jest.fn(), location: { replace: jest.fn() } };
  const openSpy = jest.spyOn(window, 'open').mockReturnValue(popup);
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

  try {
    render(
      <MemoryRouter>
        <PatientDashboard />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: 'View' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Synthetic preview failure');
    expect(popup.close).toHaveBeenCalled();
  } finally {
    openSpy.mockRestore();
  }
});
