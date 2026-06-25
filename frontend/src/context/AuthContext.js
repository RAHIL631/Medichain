// frontend/src/context/AuthContext.js
// Global authentication state via useReducer + Context API

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

// ── State Shape ──────────────────────────────────────────────────────────────
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
};

// ── Action Types ──────────────────────────────────────────────────────────────
export const AUTH_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT:        'LOGOUT',
  SET_USER:      'SET_USER',
  SET_LOADING:   'SET_LOADING',
};

// ── Reducer ───────────────────────────────────────────────────────────────────
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user:            action.payload.user,
        token:           action.payload.token,
        isAuthenticated: true,
        loading:         false,
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user:            action.payload,
        isAuthenticated: true,
        loading:         false,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false,
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    default:
      return state;
  }
};

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On mount: restore session from localStorage
  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('medichain_token');
      if (!token) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: data.user });
      } catch {
        // Token invalid / expired — clear it
        localStorage.removeItem('medichain_token');
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    };
    bootstrap();
  }, []);

  // ── login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('medichain_token', data.token);
    dispatch({
      type: AUTH_ACTIONS.LOGIN_SUCCESS,
      payload: { user: data.user, token: data.token },
    });
    return data;
  }, []);

  // ── register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('medichain_token', data.token);
    dispatch({
      type: AUTH_ACTIONS.LOGIN_SUCCESS,
      payload: { user: data.user, token: data.token },
    });
    return data;
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('medichain_token');
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    // redirect handled by ProtectedRoute / caller
    window.location.href = '/login';
  }, []);

  // ── updateUser ────────────────────────────────────────────────────────────
  const updateUser = useCallback((data) => {
    dispatch({ type: AUTH_ACTIONS.SET_USER, payload: { ...state.user, ...data } });
  }, [state.user]);

  // ── updateWallet ─────────────────────────────────────────────────────────
  const updateWallet = useCallback(async (walletAddress) => {
    const { data } = await api.patch('/auth/wallet', { walletAddress });
    dispatch({
      type: AUTH_ACTIONS.SET_USER,
      payload: { ...state.user, walletAddress: data.walletAddress, isWalletLinked: true },
    });
    return data;
  }, [state.user]);

  const value = {
    // State
    user:            state.user,
    token:           state.token,
    isAuthenticated: state.isAuthenticated,
    loading:         state.loading,
    // Actions
    login,
    logout,
    register,
    updateUser,
    updateWallet,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Custom Hook ───────────────────────────────────────────────────────────────
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};

export default AuthContext;
