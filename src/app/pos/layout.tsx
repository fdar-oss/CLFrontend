'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';
import { PageSpinner } from '@/components/ui/spinner';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

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
    </div>
  );
}
