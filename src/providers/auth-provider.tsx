'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth.api';
import { setAccessToken } from '@/lib/api/axios';

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
      // Already restored or already logged in (client-side nav)
      setLoading(false);
      return;
    }
    attempted.current = true;

    (async () => {
      try {
        // Try refreshing the token using the httpOnly cookie
        const { accessToken } = await authApi.refresh();
        setAccessToken(accessToken);

        // Fetch user profile
        const user = await authApi.me();
        setAuth(user, accessToken);
      } catch {
        // No valid refresh cookie — user needs to log in
        setLoading(false);
      }
    })();
  }, [setAuth, setLoading, isAuthenticated]);

  return <>{children}</>;
}
