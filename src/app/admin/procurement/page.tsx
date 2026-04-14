'use client';

import { useState } from 'react';
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
import { Plus, CheckCircle, Trash2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { Vendor, PurchaseOrder } from '@/lib/types';

const PO_STATUS_BADGE: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'info'> = {
  DRAFT: 'secondary',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'info',
  PARTIALLY_RECEIVED: 'warning',
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

  const { data: pos = [], isLoading } = useQuery({
    queryKey: ['purchase-orders', activeBranch?.id, statusFilter],
    queryFn: () => procurementApi.listPOs({ branchId: activeBranch?.id, status: statusFilter || undefined }),
  });

  const { data: vendors = [] } = useQuery({ queryKey: ['vendors'], queryFn: procurementApi.listVendors });
  const { data: stockItems = [] } = useQuery({ queryKey: ['stock-items'], queryFn: inventoryApi.listItems });

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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); toast.success('PO approved'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].map((s) => (
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
              <TableRow key={po.id}>
                <TableCell className="font-mono font-medium text-sm">{po.poNumber}</TableCell>
                <TableCell className="font-medium">{po.vendor.name}</TableCell>
                <TableCell className="text-gray-500">{po._count?.lines ?? '—'}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(po.total)}</TableCell>
                <TableCell className="text-gray-500 text-sm">{po.expectedDate ? formatDate(po.expectedDate) : '—'}</TableCell>
                <TableCell>
                  <Badge variant={PO_STATUS_BADGE[po.status] || 'secondary'}>{po.status.replace('_', ' ')}</Badge>
                </TableCell>
                <TableCell>
                  {po.status === 'DRAFT' && (
                    <Button size="sm" variant="outline" onClick={() => approveMut.mutate(po.id)} loading={approveMut.isPending}>
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
