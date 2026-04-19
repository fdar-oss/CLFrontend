'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/lib/api/pos.api';
import { usePosStore } from '@/lib/stores/pos.store';
import { formatCurrency, timeAgo } from '@/lib/utils/format';
import { Pause, ChevronDown } from 'lucide-react';

interface ParkedOrdersProps {
  branchId: string;
}

const PENDING_STATUSES = new Set(['PENDING', 'CONFIRMED', 'IN_PROGRESS']);

export function ParkedOrders({ branchId }: ParkedOrdersProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { currentOrderId, setCurrentOrderId, clearCart } = usePosStore();

  const { data: orders = [] } = useQuery({
    queryKey: ['orders', branchId, 'parked'],
    queryFn: () => posApi.listOrders(branchId, { limit: 30 }),
    enabled: !!branchId,
    refetchInterval: 15_000,
  });

  const parked = orders.filter((o) => PENDING_STATUSES.has(o.status));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function resume(orderId: string) {
    clearCart();
    setCurrentOrderId(orderId);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-gray-300 hover:text-white hover:bg-gray-800 flex items-center gap-1.5 text-sm px-2.5 h-9 rounded-md font-medium transition-colors"
      >
        <Pause className="w-4 h-4" />
        Parked
        {parked.length > 0 && (
          <span className="bg-amber-500 text-gray-900 text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
            {parked.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[70vh] overflow-y-auto">
          <div className="px-4 py-2.5 border-b border-gray-100 sticky top-0 bg-white">
            <h3 className="font-semibold text-gray-900 text-sm">Parked Orders</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Pending orders awaiting payment</p>
          </div>

          {parked.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No parked orders</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {parked.map((o) => {
                const isActive = o.id === currentOrderId;
                const itemCount = (o.orderItems || []).reduce((s, it) => s + it.quantity, 0);
                return (
                  <button
                    key={o.id}
                    onClick={() => resume(o.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isActive ? 'bg-amber-50' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-gray-900">{o.orderNumber}</span>
                      <span className="text-[11px] text-gray-400">{timeAgo(o.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        {o.table ? `Table ${o.table.number}` : o.orderType.replace('_', ' ')}
                        <span className="text-gray-400 ml-2">· {itemCount} items</span>
                      </span>
                      <span className="font-semibold text-brand-700">{formatCurrency(Number(o.total))}</span>
                    </div>
                    {o.createdBy?.fullName && (
                      <p className="text-[10px] text-gray-400 mt-1">{o.createdBy.fullName}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
