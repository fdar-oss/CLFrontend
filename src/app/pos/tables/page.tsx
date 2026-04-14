'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { posApi } from '@/lib/api/pos.api';
import { useBranchStore } from '@/lib/stores/branch.store';
import { usePosStore } from '@/lib/stores/pos.store';
import { TableGrid } from '@/components/pos/table-grid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { PageSpinner } from '@/components/ui/spinner';
import { ArrowLeft, Plus } from 'lucide-react';
import type { RestaurantTable } from '@/lib/types';

const STATUS_OPTIONS = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'INACTIVE'];

export default function TablesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const { setSelectedTable, setOrderType } = usePosStore();
  const [addOpen, setAddOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedTable, setSelected] = useState<RestaurantTable | null>(null);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', activeBranch?.id],
    queryFn: () => posApi.listTables(activeBranch!.id),
    enabled: !!activeBranch?.id,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{
    number: number; section?: string; capacity: number;
  }>();

  const createMut = useMutation({
    mutationFn: (data: { number: number; section?: string; capacity: number }) =>
      posApi.createTable(activeBranch!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables'] }); toast.success('Table added'); setAddOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const statusMut = useMutation({
    mutationFn: ({ tableId, status }: { tableId: string; status: string }) =>
      posApi.updateTableStatus(tableId, activeBranch!.id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables'] }); toast.success('Status updated'); setStatusOpen(false); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  function handleTableSelect(table: RestaurantTable) {
    setSelected(table);
    setStatusOpen(true);
  }

  function handleNewOrder() {
    if (!selectedTable) return;
    setSelectedTable(selectedTable);
    setOrderType('DINE_IN');
    router.push('/pos/terminal');
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white p-1 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold">Tables — {activeBranch?.name}</h1>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Add Table
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        {[
          { status: 'AVAILABLE', label: 'Available', color: 'bg-green-400' },
          { status: 'OCCUPIED', label: 'Occupied', color: 'bg-red-400' },
          { status: 'RESERVED', label: 'Reserved', color: 'bg-yellow-400' },
          { status: 'CLEANING', label: 'Cleaning', color: 'bg-blue-400' },
        ].map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${item.color}`} />
            <span className="text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <TableGrid tables={tables} onSelect={handleTableSelect} selectedId={selectedTable?.id} />
      </div>

      {/* Add Table Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Table</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Table Number" type="number" min={1} {...register('number', { valueAsNumber: true, required: 'Required' })} />
                <Input label="Capacity" type="number" min={1} defaultValue={4} {...register('capacity', { valueAsNumber: true })} />
              </div>
              <Input label="Section" placeholder="e.g. Outdoor, VIP" {...register('section')} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Table Action Dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Table {selectedTable?.number}
              {selectedTable?.section ? ` — ${selectedTable.section}` : ''}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-2">
              <Button className="w-full" onClick={handleNewOrder}>
                New Order on this Table
              </Button>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Change Status</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => selectedTable && statusMut.mutate({ tableId: selectedTable.id, status })}
                    className={`
                      py-2 rounded-xl text-sm font-medium border transition-all
                      ${selectedTable?.status === status
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'}
                    `}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
