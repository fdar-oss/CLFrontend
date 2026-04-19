'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';
import { PageSpinner } from '@/components/ui/spinner';
import { useIdleLogout } from '@/lib/hooks/use-idle-logout';
import { IdleWarning } from '@/components/idle-warning';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const { showIdleWarning, dismissIdleWarning } = useIdleLogout(isAuthenticated);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?from=/pos');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return null;

  return (
    <div className="h-screen bg-gray-100 overflow-hidden">
      {children}
      <IdleWarning open={showIdleWarning} onStay={dismissIdleWarning} />
    </div>
  );
}
