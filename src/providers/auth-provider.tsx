'use client';

import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth.api';
import { setAccessToken } from '@/lib/api/axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

/**
 * Restores auth on cold start (page refresh / first visit).
 * Uses the httpOnly refreshToken cookie to get a new accessToken,
 * then fetches the user profile and hydrates the Zustand store.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setLoading, isAuthenticated } = useAuthStore();
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || isAuthenticated) {
      setLoading(false);
      return;
    }
    attempted.current = true;

    (async () => {
      try {
        // Use a raw axios instance (no interceptors) to avoid triggering
        // the 401 interceptor's own refresh and double-revoking the token.
        const res = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const accessToken = res.data?.accessToken;
        if (!accessToken) { setLoading(false); return; }
        setAccessToken(accessToken);

        // Now fetch user profile with the intercepted instance (has token)
        const user = await authApi.me();
        if (user) setAuth(user, accessToken);
        else setLoading(false);
      } catch {
        // No valid refresh cookie — user needs to log in
        setLoading(false);
      }
    })();
  }, [setAuth, setLoading, isAuthenticated]);

  return <>{children}</>;
}
