// frontend/src/utils/api.js
// Pre-configured Axios instances for the MediChain backend and AI microservice.

import axios from 'axios';

// ── Backend API Base URL ───────────────────────────────────────────────────────
// Default: http://localhost:5000/api (backend runs on port 5000)
const rawUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const baseURL = rawUrl.replace(/\/$/, '') + (rawUrl.endsWith('/api') ? '' : '/api');

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
  withCredentials: false,
});

// ── AI Service Base URL ────────────────────────────────────────────────────────
// Default: http://localhost:5001 (Python Flask microservice)
export const aiApi = axios.create({
  baseURL: process.env.REACT_APP_AI_URL || 'http://localhost:5001',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // AI inference can be slow
});

// ── Request Interceptor ───────────────────────────────────────────────────────
// Attach JWT from localStorage to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medichain_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // If payload is FormData, remove manual Content-Type so browser sets boundary automatically
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ──────────────────────────────────────────────────────
// On 401: token expired / invalid — clear storage and redirect to login
const handleResponseError = (error) => {
  if (error.response?.status === 401) {
    // Only redirect if the failed request wasn't itself to /auth/login or /auth/register
    const url = error.config?.url || '';
    if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
      localStorage.removeItem('medichain_token');
      window.location.href = '/login';
    }
  }

  // Normalise error to a single { message } shape for consistent UI handling
  const message =
    error.response?.data?.error ||
    error.response?.data?.message ||
    error.response?.data?.errors?.[0]?.message ||
    error.response?.data?.errors?.[0]?.msg ||
    (error.code === 'ECONNABORTED' ? 'Request timed out — server may be offline' : null) ||
    error.message ||
    'An unexpected error occurred';

  const customError = new Error(message);
  customError.response = error.response;
  customError.status = error.response?.status;
  customError.code = error.code;
  return Promise.reject(customError);
};

api.interceptors.response.use((r) => r, handleResponseError);
aiApi.interceptors.response.use((r) => r, handleResponseError);

export default api;

