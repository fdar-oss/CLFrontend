'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { financeApi } from '@/lib/api/finance.api';
import { useBranchStore } from '@/lib/stores/branch.store';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, StatCard } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageSpinner } from '@/components/ui/spinner';
import { Plus, CheckCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { format, subDays } from 'date-fns';
import type { Expense } from '@/lib/types';

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function ExpensesTab() {
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', activeBranch?.id, statusFilter],
    queryFn: () => financeApi.listExpenses({ branchId: activeBranch?.id, status: statusFilter || undefined }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: financeApi.listExpenseCategories,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<{
    date: string; amount: number; description: string; categoryId: string;
  }>();

  const createMut = useMutation({
    mutationFn: (data: { date: string; amount: number; description: string; categoryId: string }) =>
      financeApi.createExpense({ ...data, branchId: activeBranch!.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense recorded'); setOpen(false); reset(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  const approveMut = useMutation({
    mutationFn: financeApi.approveExpense,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); toast.success('Expense approved'); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  const totalPending = expenses.filter((e) => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          {totalPending > 0 && (
            <span className="text-sm text-orange-600 font-medium">{formatCurrency(totalPending)} pending approval</span>
          )}
        </div>
        <Button onClick={() => { reset({ date: new Date().toISOString().slice(0, 10) }); setOpen(true); }} disabled={!activeBranch}>
          <Plus className="w-4 h-4" /> Add Expense
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 && <TableEmpty message="No expenses found" />}
            {expenses.map((exp: Expense) => (
              <TableRow key={exp.id}>
                <TableCell className="text-gray-500 text-sm">{formatDate(exp.date)}</TableCell>
                <TableCell className="font-medium">{exp.description}</TableCell>
                <TableCell className="text-gray-500 text-sm">{exp.category.name}</TableCell>
                <TableCell className="text-gray-500 text-sm">{exp.branch.name}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(exp.amount)}</TableCell>
                <TableCell>
                  <Badge variant={exp.status === 'APPROVED' ? 'success' : exp.status === 'REJECTED' ? 'destructive' : 'warning'}>
                    {exp.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {exp.status === 'PENDING' && (
                    <Button size="sm" variant="outline" onClick={() => approveMut.mutate(exp.id)} loading={approveMut.isPending}>
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
          <DialogHeader><DialogTitle>Record Expense</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMut.mutateAsync(d))}>
            <DialogBody>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Date" type="date" error={errors.date?.message} {...register('date', { required: 'Required' })} />
                <Input label="Amount (₨)" type="number" step="0.01" error={errors.amount?.message} {...register('amount', { required: 'Required', valueAsNumber: true })} />
              </div>
              <Input label="Description" error={errors.description?.message} {...register('description', { required: 'Required' })} />
              <Select
                label="Category"
                options={categories.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select category"
                error={errors.categoryId?.message}
                {...register('categoryId', { required: 'Required' })}
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sales Summary Tab ────────────────────────────────────────────────────────

function SalesSummaryTab() {
  const { activeBranch } = useBranchStore();
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ['daily-summaries-finance', activeBranch?.id, from, to],
    queryFn: () => financeApi.getDailySummaries({ branchId: activeBranch?.id, from, to }),
  });

  const totals = summaries.reduce(
    (acc, s) => ({
      grossSales: acc.grossSales + Number(s.grossSales),
      netSales: acc.netSales + Number(s.netSales),
      taxCollected: acc.taxCollected + Number(s.taxCollected),
      discounts: acc.discounts + Number(s.discounts),
      totalOrders: acc.totalOrders + s.totalOrders,
    }),
    { grossSales: 0, netSales: 0, taxCollected: 0, discounts: 0, totalOrders: 0 },
  );

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Gross Sales" value={formatCurrency(totals.grossSales)} change={`${totals.totalOrders} orders`} changeType="neutral" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard title="Net Sales" value={formatCurrency(totals.netSales)} change="After discounts" changeType="positive" icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard title="Tax Collected" value={formatCurrency(totals.taxCollected)} change="FBR + local" changeType="neutral" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard title="Discounts Given" value={formatCurrency(totals.discounts)} change="Total discounted" changeType="negative" icon={<TrendingDown className="w-5 h-5" />} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Gross Sales</TableHead>
              <TableHead>Discounts</TableHead>
              <TableHead>Tax</TableHead>
              <TableHead>Net Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaries.length === 0 && <TableEmpty message="No summaries for this period" />}
            {[...summaries].sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-sm">{formatDate(s.date)}</TableCell>
                <TableCell className="text-gray-500 text-sm">{s.branch.name}</TableCell>
                <TableCell className="text-gray-500">{s.totalOrders}</TableCell>
                <TableCell className="font-medium">{formatCurrency(s.grossSales)}</TableCell>
                <TableCell className="text-red-600">{formatCurrency(s.discounts)}</TableCell>
                <TableCell className="text-gray-500">{formatCurrency(s.taxCollected)}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(s.netSales)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  return (
    <div>
      <PageHeader
        title="Finance"
        description="Expenses, sales summaries, and reports"
      />
      <Tabs defaultValue="sales">
        <TabsList className="mb-6">
          <TabsTrigger value="sales">Sales Summary</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
        <TabsContent value="sales"><SalesSummaryTab /></TabsContent>
        <TabsContent value="expenses"><ExpensesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
