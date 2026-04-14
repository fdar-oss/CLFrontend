'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { posApi } from '@/lib/api/pos.api';
import { usePosStore } from '@/lib/stores/pos.store';
import { useBranchStore } from '@/lib/stores/branch.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Numpad } from '@/components/pos/numpad';
import { formatCurrency } from '@/lib/utils/format';
import { Coffee, DollarSign } from 'lucide-react';

export default function OpenShiftPage() {
  const router = useRouter();
  const { activeBranch } = useBranchStore();
  const { user } = useAuthStore();
  const setActiveShift = usePosStore((s) => s.setActiveShift);
  const [floatStr, setFloatStr] = useState('0');

  const openMut = useMutation({
    mutationFn: () => posApi.openShift(activeBranch!.id, parseFloat(floatStr) || 0),
    onSuccess: (shift) => {
      setActiveShift(shift);
      toast.success('Shift opened');
      router.replace('/pos/terminal');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to open shift'),
  });

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-brand-600 px-6 py-8 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Coffee className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold">The Coffee Lab</h1>
          <p className="text-brand-200 text-sm mt-0.5">{activeBranch?.name}</p>
          {user && <p className="text-brand-100 text-xs mt-2">Cashier: {user.fullName}</p>}
        </div>

        {/* Float Entry */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-800">Opening Cash Float</h2>
          </div>

          {/* Display */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-right mb-4">
            <p className="text-xs text-gray-400 mb-0.5">Opening Float</p>
            <span className="text-3xl font-bold text-gray-900">
              {floatStr ? formatCurrency(parseFloat(floatStr) || 0) : '₨ 0'}
            </span>
          </div>

          <Numpad value={floatStr} onChange={setFloatStr} />

          <Button
            className="w-full h-12 mt-5 text-base font-semibold"
            onClick={() => openMut.mutate()}
            loading={openMut.isPending}
            disabled={!activeBranch}
          >
            Open Shift
          </Button>

          <button
            type="button"
            onClick={() => router.push('/admin/dashboard')}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-3"
          >
            Back to Admin
          </button>
        </div>
      </div>
    </div>
  );
}
