import React from 'react';
import { render, screen } from '@testing-library/react';
import api from '../utils/api';
import DigitalTwinDashboard from './DigitalTwinDashboard';

jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));
jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'synthetic-patient-id', role: 'patient' } }),
}));
jest.mock('../components/DashboardLayout', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));
jest.mock('../components/GlassCard', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));
jest.mock('../components/FuturisticButton', () => ({
  __esModule: true,
  default: ({ children }) => <button>{children}</button>,
}));

beforeEach(() => {
  api.get.mockResolvedValue({
    data: { profile: { baselineMetrics: {} } },
  });
  api.post.mockRejectedValue({
    response: { data: { error: 'AI Simulation Service is unavailable.' } },
  });
});

test('shows the simulation service error instead of a generic failure', async () => {
  render(<DigitalTwinDashboard />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'AI Simulation Service is unavailable.'
  );
  expect(screen.queryByText('Medication simulation failed.')).not.toBeInTheDocument();
});
