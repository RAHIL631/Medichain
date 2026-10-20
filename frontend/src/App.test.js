import { render, screen } from '@testing-library/react';
import App from './App';

test('renders MediChain app title', () => {
  render(<App />);
  const titleElements = screen.getAllByText(/MediChain/i);
  expect(titleElements.length).toBeGreaterThan(0);
});
