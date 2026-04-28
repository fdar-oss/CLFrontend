'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { procurementApi } from '@/lib/api/procurement.api';
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
import { Plus, CheckCircle, Trash2, PackageCheck, Eye } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import type { Vendor, PurchaseOrder } from '@/lib/types';

const PO_STATUS_BADGE: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'info'> = {
  DRAFT: 'secondary',
  SENT: 'info',
  PARTIAL: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'destructive',
};

// ─── Vendors Tab ──────────────────────────────────────────────────────────────

function VendorsTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);

  const { data: vendors = [], isLoading } = useQuery({ queryKey: ['vendors'], queryFn: procurementApi.listVendors });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    name: string; contactPerson?: string; phone?: string; email?: string; address?: string; ntn?: string;
  }>();

  const createMut = useMutation({
    mutationFn: procurementApi.createVendor,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Vendor created'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vendor> }) => procurementApi.updateVendor(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Vendor updated'); closeDialog(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  function openCreate() { setEditing(null); reset(); setOpen(true); }
  function openEdit(v: Vendor) { setEditing(v); reset({ name: v.name, contactPerson: v.contactPerson || '', phone: v.phone || '', email: v.email || '' }); setOpen(true); }
  function closeDialog() { setOpen(false); setEditing(null); reset(); }

  async function onSubmit(data: Parameters<typeof createMut.mutateAsync>[0]) {
    if (editing) await updateMut.mutateAsync({ id: editing.id, data });
    else await createMut.mutateAsync(data);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Add Vendor</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>POs</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendors.length === 0 && <TableEmpty message="No vendors yet" />}
            {vendors.map((v) => (
              <TableRow key={v.id} className="cursor-pointer" onClick={() => openEdit(v)}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="text-gray-500 text-sm">{v.contactPerson || '—'}</TableCell>
                <TableCell className="text-gray-500 text-sm">{v.phone || '—'}</TableCell>
                <TableCell className="text-gray-500 text-sm">{v.email || '—'}</TableCell>
                <TableCell className="text-gray-500">{v._count?.purchaseOrders ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={v.isActive ? 'success' : 'secondary'}>{v.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Vendor' : 'New Vendor'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <Input label="Vendor Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Contact Person" {...register('contactPerson')} />
                <Input label="Phone" {...register('phone')} />
              </div>
              <Input label="Email" type="email" {...register('email')} />
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

// ─── Purchase Orders Tab ──────────────────────────────────────────────────────

type POFormData = {
  vendorId: string;
  expectedDate?: string;
  notes?: string;
  lines: { stockItemId: string; quantity: number; unit: string; unitPrice: number }[];
};

function PurchaseOrdersTab() {
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [receivePoId, setReceivePoId] = useState<string | null>(null);
  const [viewPoId, setViewPoId] = useState<string | null>(null);
  const [grnLines, setGrnLines] = useState<{ stockItemId: string; itemName: string; orderedQty: number; receivedQty: number; unitCost: number; batchNumber: string; expiryDate: string }[]>([]);
  const [grnNotes, setGrnNotes] = useState('');

  const { data: pos = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', activeBranch?.id, statusFilter],
    queryFn: () => procurementApi.listPOs({ branchId: activeBranch?.id, status: statusFilter || undefined }),
  });

  const { data: viewPo } = useQuery<any>({
    queryKey: ['po-detail', viewPoId],
    queryFn: () => procurementApi.getPO(viewPoId!),
    enabled: !!viewPoId,
  });

  const { data: receivePo } = useQuery<any>({
    queryKey: ['po-detail', receivePoId],
    queryFn: () => procurementApi.getPO(receivePoId!),
    enabled: !!receivePoId,
  });

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: procurementApi.listVendors });
  const { data: stockItems = [] } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });
  const { data: locations = [] } = useQuery({
    queryKey: ['stock-locations', activeBranch?.id],
    queryFn: () => inventoryApi.getLocations(activeBranch!.id),
    enabled: !!activeBranch?.id,
  });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<POFormData>({
    defaultValues: { lines: [{ stockItemId: '', quantity: 1, unit: 'kg', unitPrice: 0 }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

  const createMut = useMutation({
    mutationFn: (data: POFormData) => procurementApi.createPO({ ...data, branchId: activeBranch!.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success('PO created'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const approveMut = useMutation({
    mutationFn: procurementApi.approvePO,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success('PO approved & sent'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const receiveMut = useMutation({
    mutationFn: (data: Parameters<typeof procurementApi.receiveGoods>[0]) => procurementApi.receiveGoods(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['stock-items'] });
      qc.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Goods received — stock updated');
      setReceivePoId(null);
      setGrnLines([]);
      setGrnNotes('');
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to receive'),
  });

  const prevReceivePoRef = useRef<string | null>(null);

  function openReceive(poId: string) {
    prevReceivePoRef.current = null;
    setReceivePoId(poId);
  }

  // Populate GRN lines when PO detail loads
  useEffect(() => {
    if (receivePo && receivePoId && prevReceivePoRef.current !== receivePoId) {
      prevReceivePoRef.current = receivePoId;
      setGrnLines(receivePo.lines.map((l: any) => ({
        stockItemId: l.stockItemId,
        itemName: l.stockItem?.name || 'Unknown',
        orderedQty: Number(l.quantity) - Number(l.receivedQty || 0),
        receivedQty: Number(l.quantity) - Number(l.receivedQty || 0),
        unitCost: Number(l.unitPrice),
        batchNumber: '',
        expiryDate: '',
      })));
    }
  }, [receivePo, receivePoId]);

  function submitGrn() {
    if (!receivePoId || !locations[0]) return;
    const lines = grnLines.filter(l => l.receivedQty > 0).map(l => ({
      stockItemId: l.stockItemId,
      orderedQty: l.orderedQty,
      receivedQty: l.receivedQty,
      unitCost: l.unitCost,
      batchNumber: l.batchNumber || undefined,
      expiryDate: l.expiryDate || undefined,
    }));
    if (lines.length === 0) { toast.error('Enter received quantities'); return; }
    receiveMut.mutate({
      purchaseOrderId: receivePoId,
      locationId: locations[0].id,
      notes: grnNotes || undefined,
      lines,
    });
  }

  if (isLoading) return <PageSpinner />;

  // ─── PO Detail View ────────────────────────────────────────────────────────
  if (viewPoId && viewPo) {
    return (
      <div>
        <Button variant="outline" onClick={() => setViewPoId(null)} className="mb-4">← Back to list</Button>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{viewPo.poNumber}</h2>
              <p className="text-sm text-gray-400">{viewPo.vendor?.name} · {formatDate(viewPo.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={PO_STATUS_BADGE[viewPo.status] || 'secondary'}>{viewPo.status.replace(/_/g, ' ')}</Badge>
              {(viewPo.status === 'SENT' || viewPo.status === 'PARTIAL') && (
                <Button size="sm" onClick={() => { setViewPoId(null); openReceive(viewPo.id); }}>
                  <PackageCheck className="w-3.5 h-3.5 mr-1" /> Receive Goods
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Line Items</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewPo.lines?.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.stockItem?.name}</TableCell>
                    <TableCell>{Number(l.quantity)} {l.unit}</TableCell>
                    <TableCell className={Number(l.receivedQty) >= Number(l.quantity) ? 'text-green-700 font-medium' : 'text-orange-600 font-medium'}>
                      {Number(l.receivedQty || 0)} {l.unit}
                    </TableCell>
                    <TableCell>{formatCurrency(l.unitPrice)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(l.quantity) * Number(l.unitPrice))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {viewPo.grns?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Goods Received Notes</h3>
              {viewPo.grns.map((grn: any) => (
                <div key={grn.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold">{grn.grnNumber}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(grn.createdAt)}</p>
                  </div>
                  <div className="space-y-1">
                    {grn.lines?.map((gl: any) => (
                      <div key={gl.id} className="flex justify-between text-sm">
                        <span>{gl.stockItem?.name}</span>
                        <span className="font-medium">{Number(gl.receivedQty)} @ {formatCurrency(gl.unitCost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewPo.notes && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{viewPo.notes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          {['DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <Button onClick={() => { reset({ lines: [{ stockItemId: '', quantity: 1, unit: 'kg', unitPrice: 0 }] }); setOpen(true); }}
          disabled={!activeBranch}>
          <Plus className="w-4 h-4" /> New PO
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Lines</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pos.length === 0 && <TableEmpty message="No purchase orders" />}
            {pos.map((po) => (
              <TableRow key={po.id} className="cursor-pointer" onClick={() => setViewPoId(po.id)}>
                <TableCell className="font-mono font-medium text-sm">{po.poNumber}</TableCell>
                <TableCell className="font-medium">{po.vendor.name}</TableCell>
                <TableCell className="text-gray-500">{po._count?.lines ?? '—'}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(po.total)}</TableCell>
                <TableCell className="text-gray-500 text-sm">{po.expectedDate ? formatDate(po.expectedDate) : '—'}</TableCell>
                <TableCell>
                  <Badge variant={PO_STATUS_BADGE[po.status] || 'secondary'}>{po.status.replace(/_/g, ' ')}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {po.status === 'DRAFT' && (
                      <Button size="sm" variant="outline" onClick={() => approveMut.mutate(po.id)} loading={approveMut.isPending}>
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </Button>
                    )}
                    {(po.status === 'SENT' || po.status === 'PARTIAL') && (
                      <Button size="sm" onClick={() => openReceive(po.id)}>
                        <PackageCheck className="w-3.5 h-3.5" /> Receive
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create PO Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Vendor"
                  options={vendors.map((v) => ({ value: v.id, label: v.name }))}
                  placeholder="Select vendor"
                  error={errors.vendorId?.message}
                  {...register('vendorId', { required: 'Required' })}
                />
                <Input label="Expected Date" type="date" {...register('expectedDate')} />
              </div>
              <Input label="Notes" {...register('notes')} />

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">Line Items</p>
                  <button
                    type="button"
                    onClick={() => append({ stockItemId: '', quantity: 1, unit: 'kg', unitPrice: 0 })}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    + Add Line
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                  {fields.map((field, idx) => (
                    <div key={field.id} className="p-3 grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <Select
                          label={idx === 0 ? 'Item' : undefined}
                          options={stockItems.map((i) => ({ value: i.id, label: i.name }))}
                          placeholder="Select item"
                          {...register(`lines.${idx}.stockItemId`, { required: true })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input label={idx === 0 ? 'Qty' : undefined} type="number" step="0.001" {...register(`lines.${idx}.quantity`, { valueAsNumber: true })} />
                      </div>
                      <div className="col-span-2">
                        <Input label={idx === 0 ? 'Unit' : undefined} placeholder="kg" {...register(`lines.${idx}.unit`)} />
                      </div>
                      <div className="col-span-2">
                        <Input label={idx === 0 ? 'Price' : undefined} type="number" step="0.01" {...register(`lines.${idx}.unitPrice`, { valueAsNumber: true })} />
                      </div>
                      <div className="col-span-1 flex justify-end pb-0.5">
                        {fields.length > 1 && (
                          <button type="button" onClick={() => remove(idx)} className="text-gray-400 hover:text-red-500 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create PO</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Receive Goods (GRN) Dialog */}
      <Dialog open={!!receivePoId} onOpenChange={(v) => { if (!v) { setReceivePoId(null); setGrnLines([]); prevReceivePoRef.current = null; } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Receive Goods — {receivePo?.poNumber}</DialogTitle></DialogHeader>
          <DialogBody>
            {receivePo && (
              <p className="text-sm text-gray-500 mb-4">Vendor: <strong>{receivePo.vendor?.name}</strong></p>
            )}
            <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
              <div className="p-2 grid grid-cols-12 gap-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                <div className="col-span-3">Item</div>
                <div className="col-span-2">Remaining</div>
                <div className="col-span-2">Receiving</div>
                <div className="col-span-2">Unit Cost</div>
                <div className="col-span-3">Expiry</div>
              </div>
              {grnLines.map((line, idx) => (
                <div key={idx} className="p-2 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3 text-sm font-medium">{line.itemName}</div>
                  <div className="col-span-2 text-sm text-gray-500">{line.orderedQty}</div>
                  <div className="col-span-2">
                    <input type="number" step="0.001" value={line.receivedQty}
                      onChange={(e) => { const arr = [...grnLines]; arr[idx].receivedQty = parseFloat(e.target.value) || 0; setGrnLines(arr); }}
                      className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" step="0.01" value={line.unitCost}
                      onChange={(e) => { const arr = [...grnLines]; arr[idx].unitCost = parseFloat(e.target.value) || 0; setGrnLines(arr); }}
                      className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div className="col-span-3">
                    <input type="date" value={line.expiryDate}
                      onChange={(e) => { const arr = [...grnLines]; arr[idx].expiryDate = e.target.value; setGrnLines(arr); }}
                      className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>
              ))}
            </div>
            <input value={grnNotes} onChange={(e) => setGrnNotes(e.target.value)} placeholder="Notes (optional)"
              className="mt-3 w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => { setReceivePoId(null); setGrnLines([]); prevReceivePoRef.current = null; }}>Cancel</Button>
            <Button onClick={submitGrn} loading={receiveMut.isPending}>
              <PackageCheck className="w-4 h-4" /> Post GRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProcurementPage() {
  return (
    <div>
      <PageHeader
        title="Procurement"
        description="Manage vendors and purchase orders"
      />
      <Tabs defaultValue="pos">
        <TabsList className="mb-6">
          <TabsTrigger value="pos">Purchase Orders</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>
        <TabsContent value="pos"><PurchaseOrdersTab /></TabsContent>
        <TabsContent value="vendors"><VendorsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
