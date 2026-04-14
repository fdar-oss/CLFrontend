'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/lib/stores/auth.store';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 min
        retry: (failureCount, error: unknown) => {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401 || status === 403 || status === 404) return false;
          return failureCount < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const { setAuth, clearAuth, setLoading } = useAuthStore();

  // On first mount, try to restore session via silent refresh.
  // This handles hard reload — access token is in memory only so it's lost.
  useEffect(() => {
    const restore = async () => {
      try {
        const { accessToken } = await authApi.refresh();
        const user = await authApi.me();
        setAuth(user, accessToken);
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, [setAuth, clearAuth, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
