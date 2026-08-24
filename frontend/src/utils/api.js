// frontend/src/utils/api.js
// Pre-configured Axios instances for the MediChain backend and AI microservice.
// Handles Render.com free-tier cold-start (up to 50s) with extended timeout and
// user-friendly error messages for network failures.

import axios from 'axios';

// ── Backend API Base URL ───────────────────────────────────────────────────────
// Production: https://medichain-1-sjnc.onrender.com/api
// Default fallback: http://localhost:5000
const rawUrl  = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const baseURL = rawUrl.replace(/\/$/, '') + (rawUrl.endsWith('/api') ? '' : '/api');

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  // 60 seconds — covers Render.com free-tier cold-start (~50s worst case)
  timeout: 60000,
  withCredentials: false,
});

// ── AI Service Base URL ────────────────────────────────────────────────────────
// Production: https://medichain-ai.onrender.com
// Default fallback: http://localhost:5001
export const aiApi = axios.create({
  baseURL: process.env.REACT_APP_AI_URL || 'http://localhost:5001',
  headers: { 'Content-Type': 'application/json' },
  // 60 seconds — AI inference + cold-start
  timeout: 60000,
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
const handleResponseError = (error) => {
  // On 401: token expired / invalid — clear storage and redirect to login
  if (error.response?.status === 401) {
    const url = error.config?.url || '';
    if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
      localStorage.removeItem('medichain_token');
      window.location.href = '/login';
    }
  }

  // Detect true network failure (no response received at all)
  // This covers: Render cold-start timeout, ERR_NETWORK, offline, CORS block
  const isNetworkFailure = !error.response && (
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_INTERNET_DISCONNECTED' ||
    error.message === 'Network Error'
  );

  const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');

  // Human-readable message for each failure category
  let message;
  if (isTimeout) {
    message = 'The server is taking too long to respond. The backend may be waking up — please wait a moment and try again.';
  } else if (isNetworkFailure) {
    message = 'Unable to reach the MediChain server. Please check your internet connection. If the problem persists, the server may be temporarily offline — try again in 30 seconds.';
  } else {
    message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      'An unexpected error occurred';
  }

  const customError    = new Error(message);
  customError.response = error.response;
  customError.status   = error.response?.status;
  customError.code     = error.code;
  customError.isNetworkError = isNetworkFailure || isTimeout;

  return Promise.reject(customError);
};

api.interceptors.response.use((r) => r, handleResponseError);
aiApi.interceptors.response.use((r) => r, handleResponseError);

export default api;
