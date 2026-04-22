'use client';

import { useState, useEffect } from 'react';
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
import { Plus, AlertTriangle, ChefHat, X, Package, Trash2, TrendingUp, Layers, Beaker, Play } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { ingredientCost } from '@/lib/utils/units';
import { menuApi } from '@/lib/api/menu.api';
import type { StockItem, MenuItem } from '@/lib/types';

const MOVEMENT_TYPES = ['PURCHASE', 'ADJUSTMENT', 'TRANSFER', 'WASTE', 'RETURN'];
const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'dozen', 'bag', 'box', 'can'];

// ─── Stock Items Tab ──────────────────────────────────────────────────────────

const PACK_UNITS = ['carton', 'bottle', 'bag', 'box', 'pack', 'can', 'jar', 'sachet'];

function StockItemsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [batchBrand, setBatchBrand] = useState('');
  const [batchSupplier, setBatchSupplier] = useState('');
  const [batchPackSize, setBatchPackSize] = useState('');
  const [batchPackUnit, setBatchPackUnit] = useState('bottle');
  const [batchPrice, setBatchPrice] = useState('');
  const [batchDate, setBatchDate] = useState(new Date().toISOString().slice(0, 10));
  const [batchRemaining, setBatchRemaining] = useState('');

  const { data: items = [], isLoading } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });

  const { data: editBatches = [] } = useQuery({
    queryKey: ['batches', editing?.id],
    queryFn: () => inventoryApi.getBatches(editing!.id),
    enabled: !!editing?.id,
  });

  const addBatchMut = useMutation({
    mutationFn: () => inventoryApi.addBatch(editing!.id, {
      brandName: batchBrand, supplier: batchSupplier || undefined,
      packSize: parseFloat(batchPackSize), packUnit: batchPackUnit,
      purchasePrice: parseFloat(batchPrice), receivedDate: batchDate,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['stock-items'] });
      toast.success('Brand added');
      setBatchOpen(false); setBatchBrand(''); setBatchSupplier(''); setBatchPackSize(''); setBatchPrice('');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const updateBatchMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => inventoryApi.updateBatch(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Batch updated'); setEditingBatchId(null); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const deleteBatchMut = useMutation({
    mutationFn: inventoryApi.deleteBatch,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Removed'); },
  });

  function startEditBatch(b: any) {
    setEditingBatchId(b.id);
    setBatchBrand(b.brandName);
    setBatchSupplier(b.supplier || '');
    setBatchPackSize(String(Number(b.packSize)));
    setBatchPackUnit(b.packUnit || 'bottle');
    setBatchPrice(String(Number(b.purchasePrice)));
    setBatchRemaining(String(Number(b.remaining)));
  }

  function saveEditBatch() {
    if (!editingBatchId) return;
    updateBatchMut.mutate({
      id: editingBatchId,
      data: {
        brandName: batchBrand,
        supplier: batchSupplier || null,
        packSize: parseFloat(batchPackSize),
        packUnit: batchPackUnit,
        purchasePrice: parseFloat(batchPrice),
        remaining: parseFloat(batchRemaining),
      },
    });
  }

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<{
    name: string; sku?: string; unit: string; minStockLevel?: number;
    packSize?: number; packUnit?: string; purchasePrice?: number; unitCost?: number;
  }>();

  // Auto-compute unit cost when pack fields change
  const packSize = watch('packSize');
  const purchasePrice = watch('purchasePrice');
  const computedUnitCost = packSize && purchasePrice && packSize > 0
    ? Number((purchasePrice / packSize).toFixed(4))
    : undefined;

  const createMut = useMutation({
    mutationFn: (data: any) => {
      // Compute unitCost from pack fields if available
      if (data.packSize && data.purchasePrice && data.packSize > 0) {
        data.unitCost = Number((data.purchasePrice / data.packSize).toFixed(4));
      }
      return inventoryApi.createItem(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Item created'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      if (data.packSize && data.purchasePrice && data.packSize > 0) {
        data.unitCost = Number((data.purchasePrice / data.packSize).toFixed(4));
      }
      return inventoryApi.updateItem(id, data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Item updated'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  function openCreate() { setEditing(null); reset({ name: '', sku: '', unit: 'ml', packUnit: 'carton' }); setOpen(true); }
  function openEdit(item: StockItem) {
    setEditing(item);
    reset({
      name: item.name, sku: item.sku || '', unit: item.unit,
      minStockLevel: item.minStockLevel ?? undefined, unitCost: item.unitCost ?? undefined,
      packSize: (item as any).packSize ?? undefined,
      packUnit: (item as any).packUnit || 'carton',
      purchasePrice: (item as any).purchasePrice ?? undefined,
    });
    setOpen(true);
  }
  function closeDialog() { setOpen(false); setEditing(null); reset(); }

  async function onSubmit(data: any) {
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
              <TableHead>Recipe Unit</TableHead>
              <TableHead>Active Brand</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Batches</TableHead>
              <TableHead>Min Level</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && <TableEmpty message="No stock items yet" />}
            {items.map((item: any) => {
              const activeBatch = item.batches?.find((b: any) => b.status === 'ACTIVE');
              const batchCount = item.batches?.length ?? 0;
              const totalRemaining = item.batches?.reduce((s: number, b: any) => s + Number(b.remaining || 0), 0) ?? 0;
              return (
              <TableRow key={item.id} className="cursor-pointer" onClick={() => openEdit(item)}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-gray-500">{item.unit}</TableCell>
                <TableCell>
                  {activeBatch ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activeBatch.brandName}</p>
                      <p className="text-[10px] text-gray-400">{Number(activeBatch.remaining).toFixed(0)}{item.unit} left</p>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">No batch</span>
                  )}
                </TableCell>
                <TableCell className="font-medium text-brand-700">
                  {item.unitCost ? `₨${Number(item.unitCost).toFixed(2)}/${item.unit}` : '—'}
                </TableCell>
                <TableCell>
                  {batchCount > 0 ? (
                    <Badge variant="info">{batchCount} batch{batchCount !== 1 ? 'es' : ''}</Badge>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-gray-500">{item.minStockLevel ?? '—'} {item.unit}</TableCell>
                <TableCell>
                  <Badge variant={item.isActive ? 'success' : 'secondary'}>{item.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Stock Item' : 'New Stock Item'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} placeholder="e.g. Prema Milk" />
                <Input label="SKU" placeholder="RAW-001" {...register('sku')} />
              </div>
              <Select label="Recipe Unit (what recipes use)" options={UNITS.map((u) => ({ value: u, label: u }))} {...register('unit', { required: 'Required' })} />

              <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Purchasing Info</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Pack Size" type="number" step="0.001" placeholder="e.g. 1000" {...register('packSize', { valueAsNumber: true })} />
                  <Select label="Pack Type" options={PACK_UNITS.map((u) => ({ value: u, label: u }))} {...register('packUnit')} />
                  <Input label="Price per Pack (₨)" type="number" step="0.01" placeholder="e.g. 350" {...register('purchasePrice', { valueAsNumber: true })} />
                </div>
                {computedUnitCost !== undefined && (
                  <div className="mt-2 px-3 py-2 bg-brand-50 rounded-lg border border-brand-200 flex items-center justify-between">
                    <span className="text-xs font-medium text-brand-800">Auto-computed Unit Cost</span>
                    <span className="text-sm font-bold text-brand-700">₨{computedUnitCost} per {watch('unit') || 'unit'}</span>
                  </div>
                )}
              </div>

              <Input label={`Min Stock Level (${watch('unit') || 'units'})`} type="number" step="0.001" placeholder={`e.g. 5 ${watch('unit') || ''}`} {...register('minStockLevel', { valueAsNumber: true })} />

              {/* Inline brand/batch tracking — only shown when editing */}
              {editing && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Brands / Sourcing</p>
                      <p className="text-[10px] text-gray-400">First one added = active. Next activates when current runs out.</p>
                    </div>
                    <button type="button" onClick={() => setBatchOpen(!batchOpen)} className="text-xs text-brand-600 hover:text-brand-800 font-medium">
                      {batchOpen ? '− Cancel' : '+ Add brand'}
                    </button>
                  </div>

                  {/* Current batches */}
                  {(editBatches as any[]).filter((b: any) => b.status !== 'DEPLETED').length === 0 && !batchOpen && (
                    <p className="text-xs text-gray-400 text-center py-3">No brands added yet</p>
                  )}
                  {(editBatches as any[]).filter((b: any) => b.status !== 'DEPLETED').map((b: any) => (
                    editingBatchId === b.id ? (
                      <div key={b.id} className="p-3 bg-white rounded-lg border border-brand-300 mb-1.5 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input value={batchBrand} onChange={(e) => setBatchBrand(e.target.value)} placeholder="Brand" className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          <input value={batchSupplier} onChange={(e) => setBatchSupplier(e.target.value)} placeholder="Supplier" className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" value={batchPackSize} onChange={(e) => setBatchPackSize(e.target.value)} placeholder="Pack size" className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          <input type="number" value={batchPrice} onChange={(e) => setBatchPrice(e.target.value)} placeholder="Price (₨)" className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                          <input type="number" value={batchRemaining} onChange={(e) => setBatchRemaining(e.target.value)} placeholder="Remaining" className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        </div>
                        {batchPackSize && batchPrice && parseFloat(batchPackSize) > 0 && (
                          <p className="text-[10px] text-brand-700">Unit cost: ₨{(parseFloat(batchPrice) / parseFloat(batchPackSize)).toFixed(4)}/{(editing as any)?.unit}</p>
                        )}
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditingBatchId(null)} className="flex-1 py-1 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                          <button type="button" onClick={saveEditBatch} className="flex-1 py-1 text-xs text-white bg-brand-600 rounded-lg hover:bg-brand-700">Save</button>
                        </div>
                      </div>
                    ) : (
                    <div key={b.id} className={`flex items-center justify-between py-2 px-3 rounded-lg mb-1.5 ${b.status === 'ACTIVE' ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-200'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${b.status === 'ACTIVE' ? 'bg-green-600 text-white' : 'bg-amber-100 text-amber-700'}`}>
                          {b.status === 'ACTIVE' ? 'USING' : 'NEXT'}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{b.brandName}</p>
                          <p className="text-[10px] text-gray-400">
                            {Number(b.remaining).toFixed(0)}{(editing as any)?.unit || ''} left · ₨{Number(b.unitCost).toFixed(2)}/{(editing as any)?.unit || 'unit'}
                            {b.supplier ? ` · ${b.supplier}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => startEditBatch(b)} className="text-gray-400 hover:text-brand-600 p-1" title="Edit">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        {b.status !== 'ACTIVE' && (
                          <button type="button" onClick={() => deleteBatchMut.mutate(b.id)} className="text-gray-400 hover:text-red-500 p-1" title="Remove">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    )
                  ))}

                  {/* Add brand form */}
                  {batchOpen && (
                    <div className="mt-2 p-3 bg-white rounded-lg border border-gray-200 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={batchBrand} onChange={(e) => setBatchBrand(e.target.value)} placeholder="Brand name *" className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        <input value={batchSupplier} onChange={(e) => setBatchSupplier(e.target.value)} placeholder="Supplier (optional)" className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input type="number" step="0.001" value={batchPackSize} onChange={(e) => setBatchPackSize(e.target.value)} placeholder={`Pack size (${(editing as any)?.unit})`} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        <select value={batchPackUnit} onChange={(e) => setBatchPackUnit(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
                          {PACK_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <input type="number" step="0.01" value={batchPrice} onChange={(e) => setBatchPrice(e.target.value)} placeholder="Price (₨)" className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      </div>
                      {batchPackSize && batchPrice && parseFloat(batchPackSize) > 0 && (
                        <p className="text-xs text-brand-700 font-medium">Unit cost: ₨{(parseFloat(batchPrice) / parseFloat(batchPackSize)).toFixed(4)} per {(editing as any)?.unit}</p>
                      )}
                      <input type="date" value={batchDate} onChange={(e) => setBatchDate(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <button type="button" onClick={() => batchBrand && batchPackSize && batchPrice && addBatchMut.mutate()} disabled={!batchBrand || !batchPackSize || !batchPrice}
                        className="w-full py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50">
                        Add Brand
                      </button>
                    </div>
                  )}
                </div>
              )}
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

// ─── Recipes Tab ──────────────────────────────────────────────────────────────

type IngredientRow = { stockItemId: string; quantity: number; unit: string; wasteFactor: number };
type VariantRecipeState = {
  variantId: string | null;
  variantName: string;
  price: number;
  ingredients: IngredientRow[];
  notes: string;
  servingSize: number;
  dirty: boolean;
};

function RecipesTab() {
  const qc = useQueryClient();
  const [selectedMenuItemId, setSelectedMenuItemId] = useState('');
  const [activeTab, setActiveTab] = useState<string>('__base__');
  const [recipes, setRecipes] = useState<VariantRecipeState[]>([]);

  const { data: menuItems = [] } = useQuery({ queryKey: ['menu-items'], queryFn: () => menuApi.listItems() });
  const { data: stockItems = [] } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });

  const selectedItem = menuItems.find((m: MenuItem) => m.id === selectedMenuItemId);
  const variants = selectedItem?.variants ?? [];
  const hasVariants = variants.length > 0;

  // Fetch ALL recipes for this item (base + per-variant)
  const { data: allRecipes } = useQuery({
    queryKey: ['recipes-all', selectedMenuItemId],
    queryFn: async () => {
      if (!selectedMenuItemId) return [];
      try {
        const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1')}/inventory/recipes/${selectedMenuItemId}/all`, {
          headers: { Authorization: `Bearer ${(await import('@/lib/api/axios')).getAccessToken() || ''}` },
        });
        if (!res.ok) return [];
        return res.json();
      } catch { return []; }
    },
    enabled: !!selectedMenuItemId,
  });

  // Build recipe state per variant (or base) when data arrives
  useEffect(() => {
    if (!selectedMenuItemId) { setRecipes([]); return; }

    const fetched: any[] = allRecipes || [];
    const states: VariantRecipeState[] = [];

    if (hasVariants) {
      for (const v of variants) {
        const existing = fetched.find((r: any) => r.variantId === v.id);
        states.push({
          variantId: v.id, variantName: v.name, price: Number(v.price),
          ingredients: existing?.ingredients?.map((i: any) => ({
            stockItemId: i.stockItemId, quantity: Number(i.quantity), unit: i.unit, wasteFactor: Number(i.wasteFactor),
          })) || [],
          notes: existing?.notes || '', servingSize: existing?.servingSize ?? 1, dirty: false,
        });
      }
      if (states.length > 0) setActiveTab(states[0].variantId!);
    } else {
      const existing = fetched.find((r: any) => !r.variantId);
      states.push({
        variantId: null, variantName: 'Base Recipe', price: Number(selectedItem?.basePrice ?? 0),
        ingredients: existing?.ingredients?.map((i: any) => ({
          stockItemId: i.stockItemId, quantity: Number(i.quantity), unit: i.unit, wasteFactor: Number(i.wasteFactor),
        })) || [],
        notes: existing?.notes || '', servingSize: existing?.servingSize ?? 1, dirty: false,
      });
      setActiveTab('__base__');
    }
    setRecipes(states);
  }, [allRecipes, selectedMenuItemId, hasVariants]);

  const saveMut = useMutation({
    mutationFn: async () => {
      for (const r of recipes) {
        const payload: any = {
          variantId: r.variantId || undefined,
          servingSize: r.servingSize,
          notes: r.notes,
          ingredients: r.ingredients.filter(i => i.stockItemId && i.quantity > 0),
        };
        await inventoryApi.upsertRecipe(selectedMenuItemId, payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes-all', selectedMenuItemId] });
      qc.invalidateQueries({ queryKey: ['cost-analysis'] });
      toast.success('All recipes saved');
      setRecipes(prev => prev.map(r => ({ ...r, dirty: false })));
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Save failed'),
  });

  function updateRecipe(tabId: string, fn: (r: VariantRecipeState) => VariantRecipeState) {
    setRecipes(prev => prev.map(r => (r.variantId ?? '__base__') === tabId ? fn({ ...r, dirty: true }) : r));
  }
  function addRow(tabId: string) {
    updateRecipe(tabId, r => ({ ...r, ingredients: [...r.ingredients, { stockItemId: '', quantity: 0, unit: 'g', wasteFactor: 1 }] }));
  }
  function removeRow(tabId: string, idx: number) {
    updateRecipe(tabId, r => ({ ...r, ingredients: r.ingredients.filter((_, i) => i !== idx) }));
  }
  function updateRow(tabId: string, idx: number, field: keyof IngredientRow, value: string | number) {
    updateRecipe(tabId, r => ({ ...r, ingredients: r.ingredients.map((row, i) => i === idx ? { ...row, [field]: value } : row) }));
  }
  function copyFrom(fromTabId: string, toTabId: string) {
    const src = recipes.find(r => (r.variantId ?? '__base__') === fromTabId);
    if (!src) return;
    updateRecipe(toTabId, r => ({ ...r, ingredients: JSON.parse(JSON.stringify(src.ingredients)) }));
    toast.success(`Copied ingredients from ${src.variantName}`);
  }

  const activeRecipe = recipes.find(r => (r.variantId ?? '__base__') === activeTab);

  return (
    <div>
      {/* Menu item selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Menu Item</label>
        <select
          value={selectedMenuItemId}
          onChange={(e) => { setSelectedMenuItemId(e.target.value); setRecipes([]); }}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Pick a menu item to edit its recipe…</option>
          {menuItems.map((m: MenuItem) => {
            const vCount = m.variants?.length ?? 0;
            return <option key={m.id} value={m.id}>{m.name}{vCount > 0 ? ` (${vCount} variants)` : ''}</option>;
          })}
        </select>
      </div>

      {selectedMenuItemId && activeRecipe && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Variant tabs */}
          {hasVariants && (
            <div className="flex border-b border-gray-200 bg-gray-50">
              {recipes.map(r => {
                const tabId = r.variantId ?? '__base__';
                const isActive = activeTab === tabId;
                return (
                  <button
                    key={tabId}
                    onClick={() => setActiveTab(tabId)}
                    className={`flex-1 py-3 px-4 text-center transition-all border-b-2 ${
                      isActive
                        ? 'border-brand-500 bg-white text-brand-700'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <p className={`text-sm font-bold ${isActive ? 'text-brand-800' : 'text-gray-700'}`}>{r.variantName}</p>
                    <p className={`text-xs mt-0.5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`}>{formatCurrency(r.price)}</p>
                    {r.ingredients.length > 0 && (
                      <p className={`text-[10px] mt-0.5 ${r.dirty ? 'text-amber-500' : 'text-green-500'}`}>
                        {r.ingredients.length} ingredient{r.ingredients.length !== 1 ? 's' : ''}{r.dirty ? ' · unsaved' : ''}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-5">
            {/* Header + actions */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {hasVariants ? `${activeRecipe.variantName} Recipe` : 'Ingredients'}
                </h3>
                <p className="text-xs text-gray-500">Define what stock is used for this{hasVariants ? ' variant' : ' item'}</p>
              </div>
              <div className="flex gap-2">
                {/* Copy from another variant */}
                {hasVariants && recipes.length > 1 && (
                  <select
                    onChange={(e) => { if (e.target.value) { copyFrom(e.target.value, activeTab); e.target.value = ''; } }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    defaultValue=""
                  >
                    <option value="" disabled>Copy from…</option>
                    {recipes.filter(r => (r.variantId ?? '__base__') !== activeTab).map(r => (
                      <option key={r.variantId ?? '__base__'} value={r.variantId ?? '__base__'}>{r.variantName}</option>
                    ))}
                  </select>
                )}
                <Button size="sm" variant="outline" onClick={() => addRow(activeTab)}>
                  <Plus className="w-3 h-3" /> Add ingredient
                </Button>
              </div>
            </div>

            {/* Ingredients table */}
            {activeRecipe.ingredients.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
                No ingredients yet. Click <span className="font-semibold">Add ingredient</span> to begin.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                  <div className="col-span-5">Stock Item</div>
                  <div className="col-span-3">Quantity</div>
                  <div className="col-span-2">Unit</div>
                  <div className="col-span-1">Waste×</div>
                  <div className="col-span-1"></div>
                </div>
                {activeRecipe.ingredients.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={row.stockItemId}
                      onChange={(e) => {
                        const si = stockItems.find(s => s.id === e.target.value);
                        updateRow(activeTab, idx, 'stockItemId', e.target.value);
                        if (si) updateRow(activeTab, idx, 'unit', si.unit);
                      }}
                      className="col-span-5 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Select…</option>
                      {stockItems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input type="number" step="0.001" value={row.quantity}
                      onChange={(e) => updateRow(activeTab, idx, 'quantity', parseFloat(e.target.value) || 0)}
                      className="col-span-3 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <select value={row.unit} onChange={(e) => updateRow(activeTab, idx, 'unit', e.target.value)}
                      className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" step="0.01" value={row.wasteFactor}
                      onChange={(e) => updateRow(activeTab, idx, 'wasteFactor', parseFloat(e.target.value) || 1)}
                      title="1.05 = 5% extra for prep waste"
                      className="col-span-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <button onClick={() => removeRow(activeTab, idx)} className="col-span-1 text-gray-400 hover:text-red-500 flex justify-center">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Cost breakdown */}
            {activeRecipe.ingredients.filter(r => r.stockItemId && r.quantity > 0).length > 0 && (() => {
              const sellingPrice = activeRecipe.price;
              const lines = activeRecipe.ingredients
                .filter(r => r.stockItemId && r.quantity > 0)
                .map(r => {
                  const si = stockItems.find(s => s.id === r.stockItemId);
                  const stockUnit = si?.unit || r.unit;
                  const unitCostVal = Number(si?.unitCost ?? 0);
                  const lineCost = ingredientCost(r.quantity, r.unit, stockUnit, unitCostVal, r.wasteFactor);
                  return { name: si?.name || '?', qty: r.quantity, recipeUnit: r.unit, stockUnit, unitCost: unitCostVal, wasteFactor: r.wasteFactor, lineCost };
                });
              const totalCost = lines.reduce((s, l) => s + l.lineCost, 0);
              const margin = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;

              return (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Cost Breakdown — {activeRecipe.variantName}
                  </p>
                  <div className="space-y-1">
                    {lines.map((l, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {l.name} <span className="text-gray-400">({l.qty}{l.recipeUnit}
                          {l.recipeUnit !== l.stockUnit ? ` → ₨${l.unitCost.toFixed(2)}/${l.stockUnit}` : ` × ₨${l.unitCost.toFixed(2)}/${l.stockUnit}`}
                          {l.wasteFactor > 1 ? ` × ${l.wasteFactor} waste` : ''})</span>
                        </span>
                        <span className="font-medium text-gray-900">{formatCurrency(l.lineCost)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-300 mt-2 pt-2 space-y-1">
                    <div className="flex justify-between text-sm font-bold">
                      <span>Recipe Cost</span>
                      <span className="text-brand-700">{formatCurrency(totalCost)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Selling Price</span>
                      <span>{formatCurrency(sellingPrice)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold">
                      <span>Gross Margin</span>
                      <span className={margin >= 60 ? 'text-green-600' : margin >= 40 ? 'text-amber-600' : 'text-red-600'}>
                        {margin.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Profit per unit</span>
                      <span className="text-green-700 font-medium">{formatCurrency(sellingPrice - totalCost)}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Save all */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              {hasVariants && (
                <p className="text-xs text-gray-400">
                  Saves recipes for all variants at once
                </p>
              )}
              <Button
                onClick={() => saveMut.mutate()}
                loading={saveMut.isPending}
                disabled={recipes.every(r => r.ingredients.length === 0)}
                className={!hasVariants ? 'ml-auto' : ''}
              >
                {hasVariants ? 'Save All Variant Recipes' : 'Save Recipe'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cost Analysis Tab ───────────────────────────────────────────────────────

function CostAnalysisTab() {
  const [filterType, setFilterType] = useState('');

  const { data: analysis = [], isLoading } = useQuery({
    queryKey: ['cost-analysis'],
    queryFn: inventoryApi.getCostAnalysis,
  });

  if (isLoading) return <PageSpinner />;

  const items: any[] = analysis;
  const filtered = filterType ? items.filter((i) => i.itemType === filterType) : items;
  const withRecipe = filtered.filter((i) => i.hasRecipe);
  const withoutRecipe = filtered.filter((i) => !i.hasRecipe);

  // Summary stats
  const avgMargin = withRecipe.length > 0
    ? withRecipe.reduce((s, i) => s + (i.margin ?? 0), 0) / withRecipe.length
    : 0;
  const lowestMargin = withRecipe.length > 0
    ? withRecipe.reduce((min, i) => (i.margin ?? 100) < (min.margin ?? 100) ? i : min, withRecipe[0])
    : null;
  const highestCost = withRecipe.length > 0
    ? withRecipe.reduce((max, i) => (i.recipeCost ?? 0) > (max.recipeCost ?? 0) ? i : max, withRecipe[0])
    : null;

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Items with Recipe</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{withRecipe.length} <span className="text-sm font-normal text-gray-400">/ {filtered.length}</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Gross Margin</p>
          <p className={`text-2xl font-bold mt-1 ${avgMargin >= 60 ? 'text-green-600' : avgMargin >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
            {avgMargin.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Lowest Margin Item</p>
          <p className="text-sm font-bold text-red-600 mt-1">{lowestMargin?.name || '—'}</p>
          <p className="text-xs text-gray-400">{lowestMargin?.margin !== null ? `${lowestMargin?.margin?.toFixed(1)}%` : ''}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Types</option>
          <option value="BEVERAGE">Beverages</option>
          <option value="FOOD">Food</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Recipe Cost</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableEmpty message="No menu items found" />}
            {filtered.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {!item.hasRecipe && <p className="text-[10px] text-amber-500">No recipe defined</p>}
                  </div>
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{item.category || '—'}</TableCell>
                <TableCell><Badge variant="secondary">{item.itemType}</Badge></TableCell>
                <TableCell className="font-medium">{formatCurrency(item.sellingPrice)}</TableCell>
                <TableCell className={item.hasRecipe ? 'font-medium text-brand-700' : 'text-gray-300'}>
                  {item.hasRecipe ? formatCurrency(item.recipeCost) : '—'}
                </TableCell>
                <TableCell className={item.hasRecipe ? 'font-medium text-green-700' : 'text-gray-300'}>
                  {item.hasRecipe ? formatCurrency(item.profit) : '—'}
                </TableCell>
                <TableCell>
                  {item.hasRecipe ? (
                    <span className={`font-bold ${item.margin >= 60 ? 'text-green-600' : item.margin >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                      {item.margin.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {withoutRecipe.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          {withoutRecipe.length} item{withoutRecipe.length !== 1 ? 's' : ''} without recipes — add recipes in the Recipes tab to see their cost analysis
        </p>
      )}
    </div>
  );
}

// ─── Packaging Rules Tab ─────────────────────────────────────────────────────

const ORDER_TYPE_OPTIONS = [
  { value: 'TAKEAWAY', label: 'Takeaway' },
  { value: 'DELIVERY', label: 'Delivery' },
  { value: 'ANY', label: 'Any (Takeaway + Delivery)' },
];
const ITEM_TYPE_OPTIONS = [
  { value: 'BEVERAGE', label: 'Beverage' },
  { value: 'FOOD', label: 'Food' },
  { value: 'ANY', label: 'Any' },
];
const SIZE_TAG_OPTIONS = [
  { value: 'ANY', label: 'Any size' },
  { value: 'SMALL', label: 'Small' },
  { value: 'LARGE', label: 'Large' },
];
const SCOPE_OPTIONS = [
  { value: 'PER_ITEM', label: 'Per item (1 cup per drink)' },
  { value: 'PER_ORDER', label: 'Per order (1 bag per order)' },
];

function PackagingRulesTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: rules = [], isLoading } = useQuery({ queryKey: ['packaging-rules'], queryFn: inventoryApi.listPackagingRules });
  const { data: stockItems = [] } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    stockItemId: string; orderType: string; itemType: string; sizeTag: string; scope: string; quantity: number;
  }>();

  const createMut = useMutation({
    mutationFn: inventoryApi.createPackagingRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-rules'] }); toast.success('Rule created'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: inventoryApi.deletePackagingRule,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-rules'] }); toast.success('Rule deleted'); },
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-3">
          Define what packaging gets auto-deducted from stock when a takeaway or delivery order is completed. No rules = no auto-deduction.
        </p>
        <div className="flex justify-end">
          <Button onClick={() => { reset({ orderType: 'ANY', itemType: 'BEVERAGE', sizeTag: 'ANY', scope: 'PER_ITEM', quantity: 1 }); setOpen(true); }}>
            <Plus className="w-4 h-4" /> Add Rule
          </Button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          No packaging rules yet. Add your first rule to start tracking disposable costs.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock Item</TableHead>
                <TableHead>Order Type</TableHead>
                <TableHead>Item Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule: any) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.stockItem?.name || '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{rule.orderType}</Badge></TableCell>
                  <TableCell><Badge variant="info">{rule.itemType}</Badge></TableCell>
                  <TableCell className="text-gray-500">{rule.sizeTag || 'Any'}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{rule.scope === 'PER_ORDER' ? 'Per order' : 'Per item'}</TableCell>
                  <TableCell className="text-gray-500">{rule.quantity}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <button
                        onClick={() => deleteMut.mutate(rule.id)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Packaging Rule</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <Select
                label="Stock Item (the packaging)"
                options={stockItems.map((s) => ({ value: s.id, label: `${s.name} (${s.unit})` }))}
                placeholder="Select packaging item…"
                error={errors.stockItemId?.message}
                {...register('stockItemId', { required: 'Required' })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Select label="When order type is" options={ORDER_TYPE_OPTIONS} {...register('orderType', { required: 'Required' })} />
                <Select label="And item type is" options={ITEM_TYPE_OPTIONS} {...register('itemType', { required: 'Required' })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Size" options={SIZE_TAG_OPTIONS} {...register('sizeTag')} />
                <Select label="Deduct how" options={SCOPE_OPTIONS} {...register('scope', { required: 'Required' })} />
              </div>
              <Input label="Quantity per deduction" type="number" defaultValue={1} {...register('quantity', { required: 'Required', valueAsNumber: true })} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create Rule</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Batches Tab ─────────────────────────────────────────────────────────────

function BatchesTab() {
  const qc = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState('');
  const [open, setOpen] = useState(false);

  const { data: stockItems = [] } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches', selectedItemId],
    queryFn: () => inventoryApi.getBatches(selectedItemId),
    enabled: !!selectedItemId,
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<{
    brandName: string; packSize: number; packUnit: string; purchasePrice: number;
    supplier?: string; receivedDate: string; expiryDate?: string; notes?: string;
  }>();

  const packSize = watch('packSize');
  const purchasePrice = watch('purchasePrice');
  const computedCost = packSize && purchasePrice && packSize > 0 ? (purchasePrice / packSize).toFixed(4) : null;

  const addMut = useMutation({
    mutationFn: (data: any) => inventoryApi.addBatch(selectedItemId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Batch added'); setOpen(false); reset(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: inventoryApi.deleteBatch,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Batch deleted'); },
  });

  const selectedItem = stockItems.find((s: any) => s.id === selectedItemId);
  const activeBatch = (batches as any[]).find((b: any) => b.status === 'ACTIVE');
  const totalRemaining = (batches as any[]).reduce((s: number, b: any) => s + Number(b.remaining || 0), 0);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Track different brands/suppliers per stock item. Uses FIFO — oldest batch gets used first, then automatically switches to the next.
      </p>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Stock Item</label>
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select a stock item…</option>
            {stockItems.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>
            ))}
          </select>
        </div>
        {selectedItemId && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-center">
              <p className="text-xs text-gray-400">Total Stock</p>
              <p className="text-lg font-bold text-gray-900">{totalRemaining.toFixed(1)} {selectedItem?.unit}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-center">
              <p className="text-xs text-gray-400">Active Brand</p>
              <p className="text-sm font-bold text-brand-700">{activeBatch?.brandName || 'None'}</p>
            </div>
            <Button onClick={() => { reset({ receivedDate: new Date().toISOString().slice(0, 10), packUnit: 'bottle' }); setOpen(true); }}>
              <Plus className="w-4 h-4" /> Add Batch
            </Button>
          </>
        )}
      </div>

      {selectedItemId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Pack</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableEmpty message="Loading…" />}
              {!isLoading && batches.length === 0 && <TableEmpty message="No batches — add your first brand/purchase" />}
              {(batches as any[]).map((b: any) => (
                <TableRow key={b.id} className={b.status === 'ACTIVE' ? 'bg-green-50/50' : b.status === 'DEPLETED' ? 'opacity-50' : ''}>
                  <TableCell>
                    <Badge variant={b.status === 'ACTIVE' ? 'success' : b.status === 'WAITING' ? 'warning' : 'secondary'}>
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{b.brandName}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{b.supplier || '—'}</TableCell>
                  <TableCell className="text-sm text-gray-500">{Number(b.packSize)} {selectedItem?.unit}/{b.packUnit || 'pack'}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(b.purchasePrice)}</TableCell>
                  <TableCell className="font-medium text-brand-700">₨{Number(b.unitCost).toFixed(2)}/{selectedItem?.unit}</TableCell>
                  <TableCell className="text-sm text-gray-500">{formatDate(b.receivedDate)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${Number(b.remaining) <= 0 ? 'text-red-500' : 'text-gray-900'}`}>
                        {Number(b.remaining).toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">/ {Number(b.quantityReceived).toFixed(0)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {b.status !== 'ACTIVE' && (
                      <button onClick={() => deleteMut.mutate(b.id)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Batch — {selectedItem?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => addMut.mutateAsync(d))}>
            <DialogBody>
              <Input label="Brand Name" placeholder="e.g. Heinz, Knorr, Prema" error={errors.brandName?.message} {...register('brandName', { required: 'Required' })} />
              <Input label="Supplier (optional)" placeholder="e.g. Metro, Makro" {...register('supplier')} />
              <div className="grid grid-cols-3 gap-3">
                <Input label={`Pack Size (${selectedItem?.unit})`} type="number" step="0.001" placeholder="e.g. 1000" error={errors.packSize?.message} {...register('packSize', { required: 'Required', valueAsNumber: true })} />
                <Select label="Pack Type" options={PACK_UNITS.map(u => ({ value: u, label: u }))} {...register('packUnit')} />
                <Input label="Price per Pack (₨)" type="number" step="0.01" error={errors.purchasePrice?.message} {...register('purchasePrice', { required: 'Required', valueAsNumber: true })} />
              </div>
              {computedCost && (
                <div className="bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 flex justify-between items-center">
                  <span className="text-xs text-brand-800">Unit Cost</span>
                  <span className="font-bold text-brand-700">₨{computedCost} per {selectedItem?.unit}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Received Date" type="date" {...register('receivedDate', { required: 'Required' })} />
                <Input label="Expiry Date (optional)" type="date" {...register('expiryDate')} />
              </div>
              <Input label="Notes (optional)" placeholder="e.g. Batch #1234" {...register('notes')} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Add Batch</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Prep Recipes Tab (house-made sauces/dressings) ──────────────────────────

type PrepIngRow = { stockItemId: string; quantity: number; unit: string };

function PrepRecipesTab() {
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const [selectedItemId, setSelectedItemId] = useState('');
  const [ingredients, setIngredients] = useState<PrepIngRow[]>([]);
  const [batchYield, setBatchYield] = useState('');
  const [notes, setNotes] = useState('');

  const { data: stockItems = [] } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });
  const { data: locations = [] } = useQuery({
    queryKey: ['stock-locations', activeBranch?.id],
    queryFn: () => inventoryApi.getLocations(activeBranch!.id),
    enabled: !!activeBranch?.id,
  });

  const { data: prepRecipe } = useQuery({
    queryKey: ['prep-recipe', selectedItemId],
    queryFn: () => inventoryApi.getPrepRecipe(selectedItemId),
    enabled: !!selectedItemId,
  });

  // Auto-load when item or recipe changes
  useEffect(() => {
    if (prepRecipe && prepRecipe.ingredients) {
      setIngredients(prepRecipe.ingredients.map((i: any) => ({
        stockItemId: i.stockItemId, quantity: Number(i.quantity), unit: i.unit,
      })));
      setBatchYield(String(Number(prepRecipe.yield)));
      setNotes(prepRecipe.notes || '');
    } else if (prepRecipe === null) {
      setIngredients([]);
      setBatchYield('');
      setNotes('');
    }
  }, [prepRecipe, selectedItemId]);

  const saveMut = useMutation({
    mutationFn: () => inventoryApi.upsertPrepRecipe(selectedItemId, {
      yield: parseFloat(batchYield), notes,
      ingredients: ingredients.filter(i => i.stockItemId && i.quantity > 0),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prep-recipe'] }); qc.invalidateQueries({ queryKey: ['stock-items'] }); toast.success('Prep recipe saved'); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed'),
  });

  const produceMut = useMutation({
    mutationFn: () => {
      const loc = locations[0];
      if (!loc) { toast.error('No stock location — create one in Stock Balances first'); throw new Error('No location'); }
      return inventoryApi.producePrep(selectedItemId, loc.id, 1);
    },
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['stock-items'] });
      qc.invalidateQueries({ queryKey: ['batches'] });
      toast.success(`Produced ${res.produced} units — Unit cost: ₨${res.unitCost}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Production failed'),
  });

  const selectedItem = stockItems.find((s: any) => s.id === selectedItemId);
  const houseMadeItems = stockItems.filter((s: any) => s.isHouseMade);
  const rawItems = stockItems.filter((s: any) => !s.isHouseMade);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Define how house-made items (sauces, dressings, mixes) are produced from raw ingredients. Click "Make a Batch" to deduct ingredients and add the produced item to stock.
      </p>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 max-w-md">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Stock Item (house-made)</label>
          <select
            value={selectedItemId}
            onChange={(e) => { setSelectedItemId(e.target.value); setIngredients([]); }}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Select or search a stock item…</option>
            {houseMadeItems.length > 0 && (
              <optgroup label="House-Made Items">
                {houseMadeItems.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
              </optgroup>
            )}
            <optgroup label="All Stock Items">
              {stockItems.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
            </optgroup>
          </select>
        </div>
        {selectedItemId && prepRecipe && (
          <Button onClick={() => produceMut.mutate()} loading={produceMut.isPending} className="h-11">
            <Play className="w-4 h-4" /> Make a Batch
          </Button>
        )}
      </div>

      {selectedItemId && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">Production Recipe — {selectedItem?.name}</h3>
              <p className="text-xs text-gray-500">What raw ingredients are needed to make one batch</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setIngredients(prev => [...prev, { stockItemId: '', quantity: 0, unit: 'g' }])}>
              <Plus className="w-3 h-3" /> Add ingredient
            </Button>
          </div>

          <div className="mb-4">
            <Input
              label={`Batch Yield (${selectedItem?.unit || 'units'} produced per batch)`}
              type="number" step="0.001" value={batchYield}
              onChange={(e) => setBatchYield(e.target.value)}
              placeholder={`e.g. 200 ${selectedItem?.unit || ''}`}
            />
          </div>

          {ingredients.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-400">
              No ingredients yet. Click <span className="font-semibold">Add ingredient</span> to define what goes into this item.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                <div className="col-span-6">Raw Ingredient</div>
                <div className="col-span-3">Quantity</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-1"></div>
              </div>
              {ingredients.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={row.stockItemId}
                    onChange={(e) => {
                      const si = stockItems.find((s: any) => s.id === e.target.value);
                      const updated = [...ingredients];
                      updated[idx] = { ...updated[idx], stockItemId: e.target.value, unit: si?.unit || row.unit };
                      setIngredients(updated);
                    }}
                    className="col-span-6 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">Select…</option>
                    {rawItems.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input type="number" step="0.001" value={row.quantity}
                    onChange={(e) => { const u = [...ingredients]; u[idx] = { ...u[idx], quantity: parseFloat(e.target.value) || 0 }; setIngredients(u); }}
                    className="col-span-3 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  <select value={row.unit} onChange={(e) => { const u = [...ingredients]; u[idx] = { ...u[idx], unit: e.target.value }; setIngredients(u); }}
                    className="col-span-2 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button onClick={() => setIngredients(prev => prev.filter((_, i) => i !== idx))} className="col-span-1 text-gray-400 hover:text-red-500 flex justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Cost preview */}
          {ingredients.filter(r => r.stockItemId && r.quantity > 0).length > 0 && batchYield && parseFloat(batchYield) > 0 && (() => {
            const lines = ingredients.filter(r => r.stockItemId && r.quantity > 0).map(r => {
              const si = stockItems.find((s: any) => s.id === r.stockItemId);
              const unitCostVal = Number(si?.unitCost ?? 0);
              const stockUnit = si?.unit || r.unit;
              const cost = ingredientCost(r.quantity, r.unit, stockUnit, unitCostVal);
              return { name: si?.name || '?', qty: r.quantity, unit: r.unit, cost };
            });
            const totalCost = lines.reduce((s, l) => s + l.cost, 0);
            const yieldNum = parseFloat(batchYield);
            const costPerUnit = yieldNum > 0 ? totalCost / yieldNum : 0;

            return (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Batch Cost Preview</p>
                {lines.map((l, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600">{l.name} ({l.qty}{l.unit})</span>
                    <span className="font-medium">{formatCurrency(l.cost)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-300 mt-2 pt-2 space-y-1">
                  <div className="flex justify-between text-sm font-bold">
                    <span>Total Batch Cost</span>
                    <span className="text-brand-700">{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Yield</span>
                    <span>{yieldNum} {selectedItem?.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span>Cost per {selectedItem?.unit}</span>
                    <span className="text-brand-700">₨{costPerUnit.toFixed(4)}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="mt-4">
            <Input label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Blend for 2 min, refrigerate" />
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending} disabled={ingredients.length === 0 || !batchYield}>
              Save Prep Recipe
            </Button>
          </div>
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
        description="Track stock items, balances, recipes, and movements"
      />
      <Tabs defaultValue="balances">
        <TabsList className="mb-6">
          <TabsTrigger value="balances">Stock Balances</TabsTrigger>
          <TabsTrigger value="items">Stock Items</TabsTrigger>
          <TabsTrigger value="recipes"><ChefHat className="w-4 h-4 mr-1.5" /> Recipes</TabsTrigger>
          <TabsTrigger value="prep"><Beaker className="w-4 h-4 mr-1.5" /> Prep Recipes</TabsTrigger>
          <TabsTrigger value="cost"><TrendingUp className="w-4 h-4 mr-1.5" /> Cost Analysis</TabsTrigger>
          <TabsTrigger value="packaging"><Package className="w-4 h-4 mr-1.5" /> Packaging Rules</TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="w-4 h-4 mr-1.5" /> Low Stock Alerts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="balances"><BalancesTab /></TabsContent>
        <TabsContent value="items"><StockItemsTab /></TabsContent>
        <TabsContent value="recipes"><RecipesTab /></TabsContent>
        <TabsContent value="prep"><PrepRecipesTab /></TabsContent>
        <TabsContent value="cost"><CostAnalysisTab /></TabsContent>
        <TabsContent value="packaging"><PackagingRulesTab /></TabsContent>
        <TabsContent value="alerts"><AlertsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
