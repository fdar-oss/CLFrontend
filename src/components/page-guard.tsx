'use client';

import { usePathname } from 'next/navigation';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useAuthStore } from '@/lib/stores/auth.store';

/**
 * Hides page content if user doesn't have access.
 * Does NOT redirect — just shows a message.
 * The sidebar already hides unauthorized pages.
 */
export function PageGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { canAccess, permissionsLoaded } = usePermissions();

  // Don't block while loading or not authenticated
  if (isLoading || !isAuthenticated || !permissionsLoaded) return <>{children}</>;

  if (!canAccess(pathname)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Access Denied</p>
          <p className="text-sm text-gray-500 mt-1">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
