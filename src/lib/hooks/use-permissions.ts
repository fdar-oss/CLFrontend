'use client';

import { useAuthStore } from '@/lib/stores/auth.store';

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const permissions = (user as any)?.permissions as { allowedRoutes: string[]; allowedFeatures: string[] } | undefined;

  const allowedRoutes = permissions?.allowedRoutes ?? [];
  const allowedFeatures = permissions?.allowedFeatures ?? [];
  const permissionsLoaded = !!permissions;

  function canAccess(route: string): boolean {
    // Owner always has full access
    if (user?.role === 'TENANT_OWNER') return true;
    // If permissions haven't loaded yet, allow access (don't block during loading)
    if (!permissionsLoaded) return true;
    return allowedRoutes.some(r => route.startsWith(r));
  }

  function hasFeature(feature: string): boolean {
    if (user?.role === 'TENANT_OWNER') return true;
    if (!permissionsLoaded) return false;
    return allowedFeatures.includes(feature);
  }

  return { canAccess, hasFeature, allowedRoutes, allowedFeatures, role: user?.role, permissionsLoaded };
}
