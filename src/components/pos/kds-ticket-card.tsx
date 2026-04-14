'use client';

import { useEffect, useState } from 'react';
import { TICKET_STATUS_COLORS } from '@/lib/utils/constants';
import type { KitchenTicket } from '@/lib/types';
import { ChevronRight } from 'lucide-react';

interface KdsTicketCardProps {
  ticket: KitchenTicket;
  onBump: (ticketId: string, nextStatus: string) => void;
}

function elapsedMinutes(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

function ElapsedTimer({ startedAt, createdAt }: { startedAt: string | null; createdAt: string }) {
  const [mins, setMins] = useState(() => elapsedMinutes(startedAt ?? createdAt));

  useEffect(() => {
    const interval = setInterval(() => setMins(elapsedMinutes(startedAt ?? createdAt)), 10000);
    return () => clearInterval(interval);
  }, [startedAt, createdAt]);

  const urgent = mins >= 15;
  const warning = mins >= 8;

  return (
    <span className={`text-xs font-bold tabular-nums ${urgent ? 'text-red-600' : warning ? 'text-orange-500' : 'text-gray-400'}`}>
      {mins}m
    </span>
  );
}

function nextStatus(current: string): string | null {
  switch (current) {
    case 'PENDING': return 'IN_PROGRESS';
    case 'IN_PROGRESS': return 'READY';
    case 'READY': return 'BUMPED';
    default: return null;
  }
}

function bumpLabel(current: string): string {
  switch (current) {
    case 'PENDING': return 'Start';
    case 'IN_PROGRESS': return 'Ready';
    case 'READY': return 'Bump';
    default: return '';
  }
}

export function KdsTicketCard({ ticket, onBump }: KdsTicketCardProps) {
  const colorClass = TICKET_STATUS_COLORS[ticket.status] || 'border-gray-300 bg-white';
  const next = nextStatus(ticket.status);

  return (
    <div className={`rounded-xl border-l-4 shadow-sm overflow-hidden ${colorClass}`}>
      {/* Header */}
      <div className="px-3 py-2.5 flex items-center justify-between border-b border-black/5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-gray-900">#{ticket.ticketNumber}</span>
          <span className="text-xs text-gray-500">
            {ticket.order.orderType.replace('_', ' ')}
            {ticket.order.table ? ` · T${ticket.order.table.number}` : ''}
          </span>
        </div>
        <ElapsedTimer startedAt={ticket.startedAt} createdAt={ticket.createdAt} />
      </div>

      {/* Items */}
      <div className="px-3 py-2 space-y-1.5">
        {ticket.items.map((item, idx) => (
          <div key={idx}>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-bold text-gray-900 leading-tight">{item.quantity}×</span>
              <span className="text-sm font-semibold text-gray-800 leading-tight">{item.name}</span>
            </div>
            {item.modifiers.length > 0 && (
              <p className="text-xs text-gray-500 pl-6">{item.modifiers.join(', ')}</p>
            )}
            {item.notes && (
              <p className="text-xs text-orange-600 pl-6 italic">"{item.notes}"</p>
            )}
          </div>
        ))}

        {ticket.notes && (
          <div className="mt-1.5 pt-1.5 border-t border-black/5">
            <p className="text-xs text-orange-600 italic">Order note: {ticket.notes}</p>
          </div>
        )}
      </div>

      {/* Station + Bump */}
      <div className="px-3 py-2 bg-black/5 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{ticket.station.name}</span>
        {next && (
          <button
            type="button"
            onClick={() => onBump(ticket.id, next)}
            className={`
              flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all
              active:scale-95
              ${ticket.status === 'READY'
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : ticket.status === 'IN_PROGRESS'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-brand-600 text-white hover:bg-brand-700'}
            `}
          >
            {bumpLabel(ticket.status)} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
