'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useBranchStore } from '@/lib/stores/branch.store';
import { useSocket } from '@/providers/socket-provider';
import { KdsTicketCard } from '@/components/pos/kds-ticket-card';
import { SocketProvider } from '@/providers/socket-provider';
import { PageSpinner } from '@/components/ui/spinner';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import type { KitchenTicket } from '@/lib/types';
import api from '@/lib/api/axios';

function fetchTickets(branchId: string) {
  return api.get<KitchenTicket[]>('/pos/kds/tickets', { params: { branchId } }).then((r) => r.data);
}

const ACTIVE_STATUSES = ['PENDING', 'IN_PROGRESS', 'READY'];

function KdsBoardInner() {
  const router = useRouter();
  const { activeBranch } = useBranchStore();
  const { isConnected, joinBranch, bumpTicket, onNewTicket, onTicketUpdated } = useSocket();
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);

  const { data: initial = [], isLoading } = useQuery({
    queryKey: ['kds-tickets', activeBranch?.id],
    queryFn: () => fetchTickets(activeBranch!.id),
    enabled: !!activeBranch?.id,
  });

  useEffect(() => {
    setTickets(initial.filter((t) => ACTIVE_STATUSES.includes(t.status)));
  }, [initial]);

  // Join branch room on connect
  useEffect(() => {
    if (isConnected && activeBranch?.id) {
      joinBranch(activeBranch.id);
    }
  }, [isConnected, activeBranch?.id, joinBranch]);

  // Live updates
  useEffect(() => {
    const offNew = onNewTicket((ticket) => {
      setTickets((prev) => {
        if (prev.find((t) => t.id === ticket.id)) return prev;
        return [ticket, ...prev];
      });
    });

    const offUpdated = onTicketUpdated((ticket) => {
      setTickets((prev) => {
        if (!ACTIVE_STATUSES.includes(ticket.status)) {
          return prev.filter((t) => t.id !== ticket.id);
        }
        return prev.map((t) => (t.id === ticket.id ? ticket : t));
      });
    });

    return () => { offNew(); offUpdated(); };
  }, [onNewTicket, onTicketUpdated]);

  function handleBump(ticketId: string, status: string) {
    bumpTicket(ticketId, status);
    // Optimistically update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status } : t)),
    );
  }

  // Group by station
  const stations = Array.from(new Set(tickets.map((t) => t.station.name))).sort();

  const pending = tickets.filter((t) => t.status === 'PENDING');
  const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS');
  const ready = tickets.filter((t) => t.status === 'READY');

  if (isLoading) return <PageSpinner />;

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-800 flex items-center justify-between flex-shrink-0 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white p-1 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">Kitchen Display</h1>
          <span className="text-gray-400 text-sm">{activeBranch?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1.5 text-green-400 text-xs">
              <Wifi className="w-4 h-4" /> Live
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-red-400 text-xs">
              <WifiOff className="w-4 h-4" /> Offline
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400 ml-4">
            <span className="text-yellow-400 font-medium">{pending.length} pending</span>
            <span className="text-orange-400 font-medium">{inProgress.length} cooking</span>
            <span className="text-green-400 font-medium">{ready.length} ready</span>
          </div>
        </div>
      </div>

      {/* Board — 3 columns by status */}
      <div className="flex-1 overflow-hidden grid grid-cols-3 gap-0 divide-x divide-gray-700">
        {/* Pending */}
        <div className="flex flex-col">
          <div className="px-4 py-2.5 bg-yellow-500/10 border-b border-gray-700">
            <h2 className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Pending ({pending.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pending.length === 0 && (
              <div className="text-center text-gray-600 text-sm pt-8">No pending tickets</div>
            )}
            {pending.map((t) => (
              <KdsTicketCard key={t.id} ticket={t} onBump={handleBump} />
            ))}
          </div>
        </div>

        {/* In Progress */}
        <div className="flex flex-col">
          <div className="px-4 py-2.5 bg-orange-500/10 border-b border-gray-700">
            <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Cooking ({inProgress.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {inProgress.length === 0 && (
              <div className="text-center text-gray-600 text-sm pt-8">Nothing cooking</div>
            )}
            {inProgress.map((t) => (
              <KdsTicketCard key={t.id} ticket={t} onBump={handleBump} />
            ))}
          </div>
        </div>

        {/* Ready */}
        <div className="flex flex-col">
          <div className="px-4 py-2.5 bg-green-500/10 border-b border-gray-700">
            <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest">Ready ({ready.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {ready.length === 0 && (
              <div className="text-center text-gray-600 text-sm pt-8">Nothing ready</div>
            )}
            {ready.map((t) => (
              <KdsTicketCard key={t.id} ticket={t} onBump={handleBump} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KdsPage() {
  return (
    <SocketProvider>
      <KdsBoardInner />
    </SocketProvider>
  );
}
