'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { inventoryApi } from '@/lib/api/inventory.api';
import { useBranchStore } from '@/lib/stores/branch.store';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/format';
import type { StockItem } from '@/lib/types';

const MOVEMENT_TYPES = ['PURCHASE', 'ADJUSTMENT', 'TRANSFER', 'WASTE', 'RETURN'];
const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'bag', 'box', 'can'];

// ─── Stock Items Tab ──────────────────────────────────────────────────────────

function StockItemsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);

  const { data: items = [], isLoading } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    name: string; sku?: string; unit: string; minStockLevel?: number; costPrice?: number;
  }>();

  const createMut = useMutation({
    mutationFn: inventoryApi.createItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Item created'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<StockItem> }) => inventoryApi.updateItem(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Item updated'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  function openCreate() { setEditing(null); reset({ name: '', sku: '', unit: 'kg' }); setOpen(true); }
  function openEdit(item: StockItem) {
    setEditing(item);
    reset({ name: item.name, sku: item.sku || '', unit: item.unit, minStockLevel: item.minStockLevel ?? undefined, costPrice: item.costPrice ?? undefined });
    setOpen(true);
  }
  function closeDialog() { setOpen(false); setEditing(null); reset(); }

  async function onSubmit(data: Parameters<typeof createMut.mutateAsync>[0]) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, data });
    else await createMut.mutateAsync(data);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Item</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Min Level</TableHead>
              <TableHead>Cost Price</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && <TableEmpty message="No stock items yet" />}
            {items.map((item) => (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => openEdit(item)}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-gray-500 font-mono text-xs">{item.sku || '—'}</TableCell>
                <TableCell className="text-gray-500">{item.unit}</TableCell>
                <TableCell className="text-gray-500">{item.minStockLevel ?? '—'}</TableCell>
                <TableCell className="text-gray-500">{item.costPrice ? formatCurrency(item.costPrice) : '—'}</TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? 'success' : 'secondary'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Stock Item' : 'New Stock Item'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
                <Input label="SKU" placeholder="RAW-001" {...register('sku')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Unit" options={UNITS.map((u) => ({ value: u, label: u }))} {...register('unit', { required: 'Required' })} />
                <Input label="Min Stock Level" type="number" step="0.001" {...register('minStockLevel', { valueAsNumber: true })} />
              </div>
              <Input label="Cost Price (₨)" type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Stock Balances Tab ───────────────────────────────────────────────────────

function BalancesTab() {
  const { activeBranch } = useBranchStore();
  const qc = useQueryClient();
  const [movementOpen, setMovementOpen] = useState(false);

  const { data: locations = [] } = useQuery({
    queryKey: ['stock-locations', activeBranch?.id],
    queryFn: () => inventoryApi.getLocations(activeBranch!.id),
    enabled: !!activeBranch?.id,
  });

  const [selectedLocation, setSelectedLocation] = useState('');

  const { data: balances = [], isLoading } = useQuery({
    queryKey: ['stock-balances', selectedLocation],
    queryFn: () => inventoryApi.getBalances(selectedLocation || undefined),
  });

  const { data: stockItems = [] } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    stockItemId: string; locationId: string; type: string; quantity: number; unitCost?: number; notes?: string;
  }>();

  const movementMut = useMutation({
    mutationFn: inventoryApi.recordMovement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-balances'] }); toast.success('Movement recorded'); setMovementOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <Button onClick={() => { reset({ type: 'ADJUSTMENT', quantity: 0 }); setMovementOpen(true); }}>
          <Plus className="w-4 h-4" /> Record Movement
        </Button>
      </div>

      {!activeBranch && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-4">
          Select a branch to view stock balances.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Qty on Hand</TableHead>
              <TableHead>Min Level</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.length === 0 && <TableEmpty message="No stock balances found" />}
            {balances.map((b) => {
              const isLow = b.stockItem.minStockLevel !== null && b.quantity <= b.stockItem.minStockLevel;
              return (
                <TableRow key={b.id}>
                  <TableCell>
                    <p className="font-medium">{b.stockItem.name}</p>
                    {b.stockItem.sku && <p className="text-xs text-gray-400 font-mono">{b.stockItem.sku}</p>}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">{b.location.name}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
                      {b.quantity} {b.stockItem.unit}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500">{b.stockItem.minStockLevel ?? '—'} {b.stockItem.unit}</TableCell>
                  <TableCell>
                    {isLow ? (
                      <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={movementOpen} onOpenChange={setMovementOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => movementMut.mutateAsync(d))}>
            <DialogBody>
              <Select
                label="Stock Item"
                options={stockItems.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }))}
                placeholder="Select item"
                error={errors.stockItemId?.message}
                {...register('stockItemId', { required: 'Required' })}
              />
              <Select
                label="Location"
                options={locations.map((l) => ({ value: l.id, label: l.name }))}
                placeholder="Select location"
                error={errors.locationId?.message}
                {...register('locationId', { required: 'Required' })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Type"
                  options={MOVEMENT_TYPES.map((t) => ({ value: t, label: t }))}
                  {...register('type', { required: 'Required' })}
                />
                <Input label="Quantity" type="number" step="0.001" error={errors.quantity?.message} {...register('quantity', { required: 'Required', valueAsNumber: true })} />
              </div>
              <Input label="Unit Cost (₨)" type="number" step="0.01" {...register('unitCost', { valueAsNumber: true })} />
              <Input label="Notes" {...register('notes')} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setMovementOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Low Stock Alerts Tab ─────────────────────────────────────────────────────

function AlertsTab() {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['low-stock'],
    queryFn: inventoryApi.getLowStockAlerts,
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      {alerts.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <p className="text-green-800 font-medium">All items are adequately stocked</p>
          <p className="text-green-600 text-sm mt-1">No low stock alerts at this time</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Current Qty</TableHead>
                <TableHead>Min Level</TableHead>
                <TableHead>Shortage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="font-medium">{b.stockItem.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">{b.location.name}</TableCell>
                  <TableCell className="text-red-600 font-semibold">{b.quantity} {b.stockItem.unit}</TableCell>
                  <TableCell className="text-gray-500">{b.stockItem.minStockLevel} {b.stockItem.unit}</TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {((b.stockItem.minStockLevel || 0) - b.quantity).toFixed(2)} {b.stockItem.unit}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Track stock items, balances, and movements"
      />
      <Tabs defaultValue="balances">
        <TabsList className="mb-6">
          <TabsTrigger value="balances">Stock Balances</TabsTrigger>
          <TabsTrigger value="items">Stock Items</TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-1.5" /> Low Stock Alerts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="balances"><BalancesTab /></TabsContent>
        <TabsContent value="items"><StockItemsTab /></TabsContent>
        <TabsContent value="alerts"><AlertsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
