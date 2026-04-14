'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { crmApi } from '@/lib/api/crm.api';
import { useBranchStore } from '@/lib/stores/branch.store';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, Search, Star } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import type { Customer, Reservation } from '@/lib/types';

// ─── Customers Tab ────────────────────────────────────────────────────────────

function CustomersTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => crmApi.listCustomers({ search: search || undefined }),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    fullName: string; phone?: string; email?: string;
  }>();

  const createMut = useMutation({
    mutationFn: crmApi.createCustomer,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); toast.success('Customer added'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <Button onClick={() => { reset(); setOpen(true); }}><Plus className="w-4 h-4" /> Add Customer</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Visits</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Loyalty Points</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 && <TableEmpty message="No customers found" />}
            {customers.map((c: Customer) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                      {c.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.fullName}</p>
                      {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{c.phone || '—'}</TableCell>
                <TableCell className="text-gray-500">{c.visitCount}</TableCell>
                <TableCell className="font-medium">{formatCurrency(c.totalSpent)}</TableCell>
                <TableCell>
                  {c.loyaltyAccount ? (
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500" />
                      <span className="font-medium text-sm">{c.loyaltyAccount.points.toLocaleString()}</span>
                      {c.loyaltyAccount.tier && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: c.loyaltyAccount.tier.color + '22', color: c.loyaltyAccount.tier.color }}>
                          {c.loyaltyAccount.tier.name}
                        </span>
                      )}
                    </div>
                  ) : '—'}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{c.lastVisitAt ? formatDate(c.lastVisitAt) : '—'}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? 'success' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <Input label="Full Name" error={errors.fullName?.message} {...register('fullName', { required: 'Required' })} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Phone" {...register('phone')} />
                <Input label="Email" type="email" {...register('email')} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Add Customer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Reservations Tab ─────────────────────────────────────────────────────────

const RESERVATION_STATUSES = ['PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

function ReservationsTab() {
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const [open, setOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['reservations', activeBranch?.id, dateFilter, statusFilter],
    queryFn: () => crmApi.listReservations({
      branchId: activeBranch?.id,
      date: dateFilter || undefined,
      status: statusFilter || undefined,
    }),
  });

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => crmApi.listCustomers() });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    date: string; time: string; partySize: number; customerId?: string; notes?: string;
  }>();

  const createMut = useMutation({
    mutationFn: (data: { date: string; time: string; partySize: number; customerId?: string; notes?: string }) =>
      crmApi.createReservation({ ...data, branchId: activeBranch!.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reservations'] }); toast.success('Reservation created'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => crmApi.updateReservationStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reservations'] }); toast.success('Status updated'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            {RESERVATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <Button onClick={() => { reset({ date: new Date().toISOString().slice(0, 10), partySize: 2 }); setOpen(true); }} disabled={!activeBranch}>
          <Plus className="w-4 h-4" /> New Reservation
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date & Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Party Size</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.length === 0 && <TableEmpty message="No reservations found" />}
            {reservations.map((r: Reservation) => (
              <TableRow key={r.id}>
                <TableCell>
                  <p className="font-medium text-sm">{formatDate(r.date)}</p>
                  <p className="text-xs text-gray-400">{r.time}</p>
                </TableCell>
                <TableCell className="font-medium text-sm">{r.customer?.fullName || 'Walk-in'}</TableCell>
                <TableCell className="text-gray-500">{r.partySize}</TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {r.table ? `T${r.table.number}${r.table.section ? ` (${r.table.section})` : ''}` : '—'}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{r.branch.name}</TableCell>
                <TableCell className="text-gray-500 text-xs max-w-[120px] truncate">{r.notes || '—'}</TableCell>
                <TableCell>
                  <Badge variant={
                    r.status === 'CONFIRMED' || r.status === 'SEATED' ? 'success' :
                    r.status === 'CANCELLED' || r.status === 'NO_SHOW' ? 'destructive' :
                    r.status === 'COMPLETED' ? 'secondary' : 'warning'
                  }>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {r.status === 'PENDING' && (
                    <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ id: r.id, status: 'CONFIRMED' })}>
                      Confirm
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
          <DialogHeader><DialogTitle>New Reservation</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Date" type="date" error={errors.date?.message} {...register('date', { required: 'Required' })} />
                <Input label="Time" type="time" error={errors.time?.message} {...register('time', { required: 'Required' })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Party Size" type="number" min={1} {...register('partySize', { valueAsNumber: true, required: 'Required' })} />
                <Select
                  label="Customer"
                  options={customers.map((c: Customer) => ({ value: c.id, label: c.fullName }))}
                  placeholder="Walk-in"
                  {...register('customerId')}
                />
              </div>
              <Input label="Notes" {...register('notes')} />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CRMPage() {
  return (
    <div>
      <PageHeader
        title="CRM"
        description="Customers, reservations, and loyalty"
      />
      <Tabs defaultValue="customers">
        <TabsList className="mb-6">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
        </TabsList>
        <TabsContent value="customers"><CustomersTab /></TabsContent>
        <TabsContent value="reservations"><ReservationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
