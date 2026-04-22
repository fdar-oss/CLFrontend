'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { posApi } from '@/lib/api/pos.api';
import { useBranchStore } from '@/lib/stores/branch.store';
import { usePosStore } from '@/lib/stores/pos.store';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { PageSpinner } from '@/components/ui/spinner';
import { ArrowLeft, Plus, Clock, User, ShoppingBag, Receipt, X, Sparkles } from 'lucide-react';
import { formatCurrency, formatTime } from '@/lib/utils/format';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-50 border-green-300 hover:border-green-500',
  OCCUPIED: 'bg-red-50 border-red-300',
  RESERVED: 'bg-amber-50 border-amber-300',
  CLEANING: 'bg-blue-50 border-blue-300',
  INACTIVE: 'bg-gray-100 border-gray-200 opacity-50',
};

const STATUS_DOT: Record<string, string> = {
  AVAILABLE: 'bg-green-500',
  OCCUPIED: 'bg-red-500',
  RESERVED: 'bg-amber-500',
  CLEANING: 'bg-blue-500',
  INACTIVE: 'bg-gray-400',
};

function elapsedStr(since: string | null | undefined): string {
  if (!since) return '';
  const mins = Math.floor((Date.now() - new Date(since).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export default function TablesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const { setSelectedTable, setOrderType } = usePosStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [, setTick] = useState(0);

  // Refresh timer display every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', activeBranch?.id],
    queryFn: () => posApi.listTables(activeBranch!.id),
    enabled: !!activeBranch?.id,
    refetchInterval: 15000,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    number: string; capacity: number; section: string;
  }>();

  const createMut = useMutation({
    mutationFn: (data: any) => posApi.createTable(activeBranch!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table added'); setAddOpen(false); reset(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => posApi.updateTableStatus(id, activeBranch!.id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables'] }); },
  });

  const selected = tables.find((t: any) => t.id === selectedId);
  const activeOrder = selected?.posOrders?.[0];

  // Group by section
  const sections = [...new Set(tables.map((t: any) => t.section || 'General'))].sort();

  function handleTableClick(table: any) {
    if (table.status === 'AVAILABLE') {
      // Quick-seat: select table and go to terminal
      setSelectedTable({ id: table.id, number: table.number, section: table.section, status: table.status, branchId: activeBranch!.id, isActive: true, capacity: table.capacity });
      setOrderType('DINE_IN');
      router.push('/pos/terminal');
    } else {
      setSelectedId(table.id);
    }
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold">Table Management</h1>
          <span className="text-gray-400 text-sm">{activeBranch?.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> {tables.filter((t: any) => t.status === 'AVAILABLE').length} Available</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> {tables.filter((t: any) => t.status === 'OCCUPIED').length} Occupied</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {tables.filter((t: any) => t.status === 'RESERVED').length} Reserved</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> {tables.filter((t: any) => t.status === 'CLEANING').length} Cleaning</span>
          </div>
          <Button size="sm" onClick={() => { reset({ section: 'Indoor', capacity: 4 }); setAddOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Table
          </Button>
        </div>
      </div>

      {/* Table grid by section */}
      <div className="p-6 space-y-8">
        {sections.map(section => {
          const sectionTables = tables.filter((t: any) => (t.section || 'General') === section);
          return (
            <div key={section}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{section}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {sectionTables.map((table: any) => {
                  const isOccupied = table.status === 'OCCUPIED';
                  const elapsed = elapsedStr(table.occupiedSince);
                  return (
                    <button
                      key={table.id}
                      onClick={() => handleTableClick(table)}
                      className={`relative rounded-2xl border-2 p-4 transition-all text-left ${STATUS_COLORS[table.status] || 'bg-gray-800 border-gray-600'} ${table.status === 'AVAILABLE' ? 'cursor-pointer active:scale-95' : 'cursor-pointer'}`}
                    >
                      {/* Status dot */}
                      <div className={`absolute top-3 right-3 w-3 h-3 rounded-full ${STATUS_DOT[table.status]} ${isOccupied ? 'animate-pulse' : ''}`} />

                      {/* Table number */}
                      <p className="text-2xl font-bold text-gray-900">{table.number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{table.capacity} seats</p>

                      {/* Occupied info */}
                      {isOccupied && (
                        <div className="mt-3 space-y-1">
                          {elapsed && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Clock className="w-3 h-3" />
                              <span className={`font-medium ${parseInt(elapsed) > 60 ? 'text-red-600' : 'text-gray-700'}`}>{elapsed}</span>
                            </div>
                          )}
                          {table.servedBy && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <User className="w-3 h-3" />
                              <span>{table.servedBy}</span>
                            </div>
                          )}
                          {table.posOrders?.[0] && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <ShoppingBag className="w-3 h-3" />
                              <span className="font-medium">{formatCurrency(table.posOrders[0].total)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reserved info */}
                      {table.status === 'RESERVED' && table.reservations?.[0] && (
                        <div className="mt-3 text-xs text-amber-700">
                          <p className="font-medium">{table.reservations[0].guestName}</p>
                          <p>{table.reservations[0].time} · {table.reservations[0].partySize} guests</p>
                        </div>
                      )}

                      {/* Status label */}
                      <div className="mt-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          table.status === 'AVAILABLE' ? 'text-green-700' :
                          table.status === 'OCCUPIED' ? 'text-red-700' :
                          table.status === 'RESERVED' ? 'text-amber-700' :
                          table.status === 'CLEANING' ? 'text-blue-700' : 'text-gray-500'
                        }`}>
                          {table.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table detail panel */}
      {selected && (
        <Dialog open={!!selectedId} onOpenChange={() => setSelectedId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span className="text-2xl font-bold">{selected.number}</span>
                <Badge variant={selected.status === 'OCCUPIED' ? 'destructive' : selected.status === 'AVAILABLE' ? 'success' : 'warning'}>
                  {selected.status}
                </Badge>
                <span className="text-sm text-gray-400">{selected.section} · {selected.capacity} seats</span>
              </DialogTitle>
            </DialogHeader>
            <DialogBody>
              {/* Time + Staff */}
              {selected.status === 'OCCUPIED' && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-500">Time Seated</span>
                    </div>
                    <p className={`text-lg font-bold ${parseInt(elapsedStr(selected.occupiedSince)) > 60 ? 'text-red-600' : 'text-gray-900'}`}>
                      {elapsedStr(selected.occupiedSince) || '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-500">Served By</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{selected.servedBy || '—'}</p>
                  </div>
                </div>
              )}

              {/* Active order */}
              {activeOrder && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide flex justify-between">
                    <span>Order {activeOrder.orderNumber}</span>
                    <Badge variant={activeOrder.status === 'COMPLETED' ? 'success' : 'warning'}>{activeOrder.status}</Badge>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {activeOrder.orderItems?.map((item: any) => (
                      <div key={item.id} className="px-4 py-2 flex justify-between text-sm">
                        <span>{item.quantity}× {item.itemName}</span>
                        <span className="font-medium">{formatCurrency(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 bg-gray-50 flex justify-between font-bold border-t border-gray-200">
                    <span>Total</span>
                    <span>{formatCurrency(activeOrder.total)}</span>
                  </div>
                </div>
              )}

              {/* Reservation */}
              {selected.reservations?.[0] && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Upcoming Reservation</p>
                  <p className="text-sm font-medium text-amber-900">{selected.reservations[0].guestName} — {selected.reservations[0].partySize} guests</p>
                  <p className="text-xs text-amber-700">{selected.reservations[0].time} · {selected.reservations[0].guestPhone}</p>
                  {selected.reservations[0].specialRequests && <p className="text-xs text-amber-600 mt-1 italic">"{selected.reservations[0].specialRequests}"</p>}
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <div className="flex items-center gap-2 w-full flex-wrap">
                <Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button>

                {selected.status === 'OCCUPIED' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => {
                      setSelectedTable({ id: selected.id, number: selected.number, section: selected.section, status: selected.status, branchId: activeBranch!.id, isActive: true, capacity: selected.capacity });
                      setOrderType('DINE_IN');
                      router.push('/pos/terminal');
                    }}>
                      <Receipt className="w-3.5 h-3.5" /> View in POS
                    </Button>
                    <div className="flex-1" />
                    <Button size="sm" variant="outline" onClick={() => { statusMut.mutate({ id: selected.id, status: 'CLEANING' }); setSelectedId(null); toast.success('Table set to cleaning — auto-releases in 5 min'); }}>
                      <Sparkles className="w-3.5 h-3.5" /> Cleaning
                    </Button>
                    <Button size="sm" onClick={() => { statusMut.mutate({ id: selected.id, status: 'AVAILABLE' }); setSelectedId(null); toast.success('Table freed'); }}>
                      Free Table
                    </Button>
                  </>
                )}

                {selected.status === 'RESERVED' && (
                  <>
                    <div className="flex-1" />
                    <Button size="sm" onClick={() => { statusMut.mutate({ id: selected.id, status: 'OCCUPIED' }); setSelectedId(null); toast.success('Guest seated'); }}>
                      Seat Guest
                    </Button>
                  </>
                )}

                {selected.status === 'CLEANING' && (
                  <>
                    <div className="flex-1" />
                    <Button size="sm" onClick={() => { statusMut.mutate({ id: selected.id, status: 'AVAILABLE' }); setSelectedId(null); toast.success('Table available'); }}>
                      Mark Available
                    </Button>
                  </>
                )}

                {selected.status === 'AVAILABLE' && (
                  <>
                    <div className="flex-1" />
                    <Button size="sm" onClick={() => {
                      setSelectedTable({ id: selected.id, number: selected.number, section: selected.section, status: selected.status, branchId: activeBranch!.id, isActive: true, capacity: selected.capacity });
                      setOrderType('DINE_IN');
                      setSelectedId(null);
                      router.push('/pos/terminal');
                    }}>
                      <ShoppingBag className="w-3.5 h-3.5" /> New Order
                    </Button>
                  </>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add table dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Table</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <Input label="Table Number" placeholder="e.g. T6, O4" {...register('number', { required: true })} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Capacity (seats)" type="number" defaultValue={4} {...register('capacity', { valueAsNumber: true })} />
                <Select label="Section" options={[{ value: 'Indoor', label: 'Indoor' }, { value: 'Outdoor', label: 'Outdoor' }]} {...register('section')} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
