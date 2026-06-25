// frontend/src/utils/api.js
// Pre-configured Axios instance for the MediChain backend

import axios from 'axios';

const api = axios.create({
  // Ensure /api is always appended even if env var lacks it or frontend wasn't restarted
  baseURL: (process.env.REACT_APP_API_URL || 'http://localhost:5005').replace(/\/$/, '') + (process.env.REACT_APP_API_URL?.endsWith('/api') ? '' : '/api'),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request Interceptor ───────────────────────────────────────────────────────
// Attach JWT from localStorage to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medichain_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────────────────────────
// On 401: token expired / invalid — clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('medichain_token');
      window.location.href = '/login';
    }

    // Normalise error to a single { message } shape for consistent UI handling
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject(new Error(message));
  }
);

export default api;
