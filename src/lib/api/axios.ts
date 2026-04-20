import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send httpOnly refresh token cookie on every request
  headers: { 'Content-Type': 'application/json' },
});

// ─── Token injection ──────────────────────────────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Access token lives only in memory (auth store). Read it from a module-level
  // variable that auth.store.ts writes to, so this interceptor stays dependency-free.
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Silent refresh ───────────────────────────────────────────────────────────
// One in-flight refresh at a time. If multiple 401s arrive simultaneously,
// they all wait on the same promise rather than each starting a new refresh.

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Refresh failed — clear auth and redirect to login (but not if already on login)
      clearAccessToken();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

async function doRefresh(): Promise<string | null> {
  try {
    // Use a raw axios instance (no interceptors) to avoid infinite loops
    const res = await axios.post(
      `${BASE_URL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const newToken: string = res.data.accessToken;
    setAccessToken(newToken);
    return newToken;
  } catch {
    return null;
  }
}

// ─── In-memory token store (written to by auth.store.ts) ─────────────────────

let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function clearAccessToken() {
  _accessToken = null;
}

export default api;
