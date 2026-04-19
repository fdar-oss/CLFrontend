'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useBranchStore } from '@/lib/stores/branch.store';
import { useSocket, SocketProvider } from '@/providers/socket-provider';
import { KdsTicketCard } from '@/components/pos/kds-ticket-card';
import { PageSpinner } from '@/components/ui/spinner';
import { ArrowLeft, Wifi, WifiOff, Coffee } from 'lucide-react';
import type { KitchenTicket } from '@/lib/types';
import api from '@/lib/api/axios';

function fetchTickets(branchId: string) {
  return api
    .get<KitchenTicket[]>('/pos/kds/tickets', { params: { branchId, stationType: 'BAR' } })
    .then((r) => r.data);
}

const ACTIVE_STATUSES = ['PENDING', 'IN_PROGRESS', 'READY'];

function BarBoardInner() {
  const router = useRouter();
  const { activeBranch } = useBranchStore();
  const { isConnected, joinBranch, bumpTicket, onNewTicket, onTicketUpdated } = useSocket();
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);

  const { data: initial = [], isLoading } = useQuery({
    queryKey: ['bar-tickets', activeBranch?.id],
    queryFn: () => fetchTickets(activeBranch!.id),
    enabled: !!activeBranch?.id,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    setTickets(initial.filter((t) => ACTIVE_STATUSES.includes(t.status)));
  }, [initial]);

  useEffect(() => {
    if (isConnected && activeBranch?.id) joinBranch(activeBranch.id);
  }, [isConnected, activeBranch?.id, joinBranch]);

  useEffect(() => {
    const offNew = onNewTicket((ticket) => {
      // Only show BAR tickets here
      if (ticket.station?.type !== 'BAR') return;
      setTickets((prev) => (prev.find((t) => t.id === ticket.id) ? prev : [ticket, ...prev]));
    });
    const offUpdated = onTicketUpdated((ticket) => {
      if (ticket.station?.type !== 'BAR') return;
      setTickets((prev) =>
        ACTIVE_STATUSES.includes(ticket.status)
          ? prev.map((t) => (t.id === ticket.id ? ticket : t))
          : prev.filter((t) => t.id !== ticket.id),
      );
    });
    return () => { offNew(); offUpdated(); };
  }, [onNewTicket, onTicketUpdated]);

  function handleBump(ticketId: string, status: string) {
    bumpTicket(ticketId, status);
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status } : t)));
  }

  const pending = tickets.filter((t) => t.status === 'PENDING');
  const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS');
  const ready = tickets.filter((t) => t.status === 'READY');

  if (isLoading) return <PageSpinner />;

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <div className="px-4 py-3 bg-gray-800 flex items-center justify-between flex-shrink-0 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white p-1 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Coffee className="w-5 h-5 text-amber-400" />
          <h1 className="font-bold text-lg">Bar Display</h1>
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
            <span className="text-orange-400 font-medium">{inProgress.length} preparing</span>
            <span className="text-green-400 font-medium">{ready.length} ready</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-3 gap-0 divide-x divide-gray-700">
        <div className="flex flex-col">
          <div className="px-4 py-2.5 bg-yellow-500/10 border-b border-gray-700">
            <h2 className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Pending ({pending.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pending.length === 0 && <div className="text-center text-gray-600 text-sm pt-8">No pending drinks</div>}
            {pending.map((t) => <KdsTicketCard key={t.id} ticket={t} onBump={handleBump} />)}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="px-4 py-2.5 bg-orange-500/10 border-b border-gray-700">
            <h2 className="text-xs font-bold text-orange-400 uppercase tracking-widest">Preparing ({inProgress.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {inProgress.length === 0 && <div className="text-center text-gray-600 text-sm pt-8">Nothing preparing</div>}
            {inProgress.map((t) => <KdsTicketCard key={t.id} ticket={t} onBump={handleBump} />)}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="px-4 py-2.5 bg-green-500/10 border-b border-gray-700">
            <h2 className="text-xs font-bold text-green-400 uppercase tracking-widest">Ready ({ready.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {ready.length === 0 && <div className="text-center text-gray-600 text-sm pt-8">Nothing ready</div>}
            {ready.map((t) => <KdsTicketCard key={t.id} ticket={t} onBump={handleBump} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BarPage() {
  return (
    <SocketProvider>
      <BarBoardInner />
    </SocketProvider>
  );
}
