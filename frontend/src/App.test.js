import { render, screen } from '@testing-library/react';
import App from './App';

test('renders MediChain app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/MediChain/i);
  expect(titleElement).toBeInTheDocument();
});
