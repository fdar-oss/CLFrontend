'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { posApi } from '@/lib/api/pos.api';
import { usePosStore } from '@/lib/stores/pos.store';
import { Button } from '@/components/ui/button';
import { Numpad } from '@/components/pos/numpad';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import { X, TrendingUp, ShoppingBag, Banknote } from 'lucide-react';

export default function CloseShiftPage() {
  const router = useRouter();
  const { activeShift, setActiveShift } = usePosStore();
  const [cashStr, setCashStr] = useState('0');
  const [notes, setNotes] = useState('');

  const closeMut = useMutation({
    mutationFn: () => posApi.closeShift(activeShift!.id, parseFloat(cashStr) || 0, notes || undefined),
    onSuccess: (shift) => {
      setActiveShift(null);
      toast.success('Shift closed');
      router.replace('/admin/dashboard');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to close shift'),
  });

  if (!activeShift) {
    router.replace('/pos');
    return null;
  }

  const expectedCash = activeShift.expectedCash ?? 0;
  const counted = parseFloat(cashStr) || 0;
  const variance = counted - expectedCash;

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-bold">Close Shift</h1>
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-400 text-xs">Opened: {formatDateTime(activeShift.openedAt)}</p>
        </div>

        {/* Shift Summary */}
        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500">Total Sales</span>
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(activeShift.totalSales ?? 0)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-500">Total Orders</span>
              </div>
              <p className="font-bold text-gray-900">{activeShift.totalOrders ?? 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className="w-4 h-4 text-brand-600" />
                <span className="text-xs text-gray-500">Opening Float</span>
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(activeShift.openingFloat)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500">Expected Cash</span>
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(expectedCash)}</p>
            </div>
          </div>

          {/* Cash Count */}
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Count Cash in Drawer</h3>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-right mb-3">
            <span className="text-3xl font-bold text-gray-900">
              {formatCurrency(counted)}
            </span>
          </div>
          <Numpad value={cashStr} onChange={setCashStr} />

          {/* Variance */}
          <div className={`mt-3 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm
            ${Math.abs(variance) < 1 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <span>Cash Variance</span>
            <span className="font-bold">{variance >= 0 ? '+' : ''}{formatCurrency(variance)}</span>
          </div>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Closing notes (optional)…"
            rows={2}
            className="w-full mt-3 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />

          <Button
            variant="destructive"
            className="w-full h-12 mt-4 mb-5 text-base"
            onClick={() => closeMut.mutate()}
            loading={closeMut.isPending}
          >
            Close Shift
          </Button>
        </div>
      </div>
    </div>
  );
}
