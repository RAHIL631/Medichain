import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../utils/api';
import AccountConsentManager from './AccountConsentManager';

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const pendingRequest = {
  _id: 'consent-request-123',
  status: 'pending',
  createdAt: '2026-10-23T10:00:00.000Z',
  granteeRole: 'doctor',
  granteeId: {
    name: 'Dr Jane Smith',
    email: 'doctor@example.test',
    role: 'doctor',
    specialization: 'Cardiology',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

test('allows the patient to approve a pending request without a wallet', async () => {
  api.get
    .mockResolvedValueOnce({ data: { requests: [pendingRequest] } })
    .mockResolvedValueOnce({
      data: {
        requests: [{
          ...pendingRequest,
          status: 'active',
          expiresAt: '2026-11-22T10:00:00.000Z',
        }],
      },
    });
  api.patch.mockResolvedValue({ data: { message: 'Access approved' } });

  render(<AccountConsentManager />);
  expect(await screen.findByText('Dr Jane Smith')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Approve for 30 days' }));

  await waitFor(() => {
    expect(api.patch).toHaveBeenCalledWith('/patient/access-requests/consent-request-123/approve');
  });
  expect(await screen.findByText('Active account grants')).toBeInTheDocument();
});

test('lets the patient revoke an active account consent', async () => {
  api.get
    .mockResolvedValueOnce({
      data: {
        requests: [{
          ...pendingRequest,
          status: 'active',
          expiresAt: '2026-11-22T10:00:00.000Z',
        }],
      },
    })
    .mockResolvedValueOnce({ data: { requests: [] } });
  api.patch.mockResolvedValue({ data: { message: 'Access revoked' } });

  render(<AccountConsentManager />);
  expect(await screen.findByRole('button', { name: 'Revoke access' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Revoke access' }));

  await waitFor(() => {
    expect(api.patch).toHaveBeenCalledWith('/patient/access-requests/consent-request-123/revoke');
  });
  expect(await screen.findByText('No active account-based grants.')).toBeInTheDocument();
});
