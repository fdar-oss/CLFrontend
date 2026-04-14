'use client';

import { create } from 'zustand';
import { setAccessToken, clearAccessToken } from '../api/axios';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken) => {
    setAccessToken(accessToken);
    // Write a non-httpOnly session cookie so middleware can check authentication.
    // This only contains a flag — NOT the token itself.
    document.cookie = `session=1; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
    set({ user, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    clearAccessToken();
    // Remove session cookie
    document.cookie = 'session=; path=/; max-age=0';
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
}));
