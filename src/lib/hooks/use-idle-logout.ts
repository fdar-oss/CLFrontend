'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth.api';

const IDLE_LIMIT_MS = 45 * 60 * 1000; // 45 minutes
const WARN_BEFORE_MS = 60 * 1000;     // warn 1 minute before
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'mousemove', 'scroll'] as const;

export function useIdleLogout(enabled = true) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastActivityRef = useRef<number>(Date.now());
  const warningRef = useRef<number | null>(null);
  const logoutRef = useRef<number | null>(null);
  const [showWarn, setShowWarn] = useState(false);

  useEffect(() => {
    if (!enabled || !isAuthenticated) return;

    function scheduleTimers() {
      if (warningRef.current) clearTimeout(warningRef.current);
      if (logoutRef.current) clearTimeout(logoutRef.current);
      warningRef.current = window.setTimeout(() => setShowWarn(true), IDLE_LIMIT_MS - WARN_BEFORE_MS);
      logoutRef.current = window.setTimeout(handleLogout, IDLE_LIMIT_MS);
    }

    async function handleLogout() {
      try { await authApi.logout(); } catch {}
      clearAuth();
      toast.info('Signed out due to inactivity (45 min)');
      router.replace('/login');
    }

    function onActivity() {
      lastActivityRef.current = Date.now();
      if (showWarn) setShowWarn(false);
      scheduleTimers();
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));
    scheduleTimers();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      if (warningRef.current) clearTimeout(warningRef.current);
      if (logoutRef.current) clearTimeout(logoutRef.current);
    };
    // showWarn intentionally excluded — onActivity uses setShowWarn directly
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isAuthenticated, clearAuth, router]);

  function dismissWarning() {
    setShowWarn(false);
    lastActivityRef.current = Date.now();
  }

  return { showIdleWarning: showWarn, dismissIdleWarning: dismissWarning };
}
