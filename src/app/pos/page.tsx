'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/lib/api/pos.api';
import { usePosStore } from '@/lib/stores/pos.store';
import { useBranchStore } from '@/lib/stores/branch.store';
import { PageSpinner } from '@/components/ui/spinner';

// Entry point: check for active shift, redirect accordingly
export default function PosIndexPage() {
  const router = useRouter();
  const { activeBranch } = useBranchStore();
  const setActiveShift = usePosStore((s) => s.setActiveShift);

  const { data: shift, isLoading } = useQuery({
    queryKey: ['active-shift', activeBranch?.id],
    queryFn: () => posApi.getActiveShift(activeBranch!.id),
    enabled: !!activeBranch?.id,
    retry: false,
  });

  useEffect(() => {
    if (!activeBranch) {
      router.replace('/admin/dashboard');
      return;
    }
    if (!isLoading) {
      if (shift) {
        setActiveShift(shift);
        router.replace('/pos/terminal');
      } else {
        router.replace('/pos/shift/open');
      }
    }
  }, [shift, isLoading, activeBranch, router, setActiveShift]);

  return <PageSpinner />;
}
