'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/admin/sidebar';
import { Header } from '@/components/admin/header';
import { useAuthStore } from '@/lib/stores/auth.store';
import { PageSpinner } from '@/components/ui/spinner';
import { useIdleLogout } from '@/lib/hooks/use-idle-logout';
import { IdleWarning } from '@/components/idle-warning';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const { showIdleWarning, dismissIdleWarning } = useIdleLogout(isAuthenticated);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login?from=/admin/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) return <PageSpinner />;
  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
      <IdleWarning open={showIdleWarning} onStay={dismissIdleWarning} />
    </div>
  );
}
