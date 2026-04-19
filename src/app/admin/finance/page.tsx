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
import { Plus, CheckCircle, DollarSign, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
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

// ─── Expense Categories Tab ──────────────────────────────────────────────────

function ExpenseCategoriesTab() {
  const qc = useQueryClient();
  const [name, setName] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: financeApi.listExpenseCategories,
  });

  const createMut = useMutation({
    mutationFn: () => financeApi.createExpenseCategory(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expense-categories'] }); toast.success('Category created'); setName(''); },
    onError: (e: unknown) => toast.error((e as any)?.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Define expense categories so you can classify and track your spending. Common examples: Rent, Utilities, Salaries, Supplies, Marketing, Maintenance.
      </p>

      <div className="flex items-end gap-3 mb-6">
        <div className="flex-1 max-w-xs">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">New Category</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Rent, Utilities, Petty Cash…"
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && createMut.mutate()}
          />
        </div>
        <Button onClick={() => name.trim() && createMut.mutate()} disabled={!name.trim()} loading={createMut.isPending}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category Name</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 && <TableEmpty message="No expense categories yet" />}
            {categories.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-gray-500 text-sm">{formatDate(c.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── P&L Tab ─────────────────────────────────────────────────────────────────

function ProfitLossTab() {
  const { activeBranch } = useBranchStore();
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: pl, isLoading } = useQuery({
    queryKey: ['profit-loss', activeBranch?.id, from, to],
    queryFn: () => financeApi.getProfitLoss(from, to, activeBranch?.id),
    enabled: !!from && !!to,
  });

  if (isLoading) return <PageSpinner />;

  const revenue = pl?.revenue ?? pl?.totals?.netSales ?? 0;
  const cogs = pl?.cogs ?? 0;
  const grossProfit = pl?.grossProfit ?? revenue - cogs;
  const expenses = pl?.totalExpenses ?? 0;
  const netProfit = pl?.netProfit ?? grossProfit - expenses;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const expenseBreakdown: any[] = pl?.expenseBreakdown ?? [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Revenue</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(revenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Cost of Goods</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(cogs)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Expenses</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(expenses)}</p>
        </div>
        <div className={`rounded-xl border p-4 ${netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Net Profit</p>
          <p className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(netProfit)}</p>
          <p className={`text-xs mt-0.5 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{marginPct.toFixed(1)}% margin</p>
        </div>
      </div>

      {/* P&L breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Profit & Loss Statement</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between font-medium text-green-700 pb-2 border-b border-gray-200">
            <span>Revenue (Net Sales)</span>
            <span>{formatCurrency(revenue)}</span>
          </div>

          <div className="flex justify-between text-gray-600 pl-4">
            <span>− Cost of Goods Sold (recipes)</span>
            <span>({formatCurrency(cogs)})</span>
          </div>

          <div className="flex justify-between font-bold border-t border-gray-200 pt-2">
            <span>Gross Profit</span>
            <span className={grossProfit >= 0 ? 'text-green-700' : 'text-red-700'}>{formatCurrency(grossProfit)}</span>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Operating Expenses</p>
            {expenseBreakdown.length > 0 ? (
              expenseBreakdown.map((eb: any, i: number) => (
                <div key={i} className="flex justify-between text-gray-600 pl-4 py-0.5">
                  <span>− {eb.category || 'Uncategorized'}</span>
                  <span>({formatCurrency(eb.total)})</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-gray-600 pl-4">
                <span>− Total Expenses</span>
                <span>({formatCurrency(expenses)})</span>
              </div>
            )}
          </div>

          <div className={`flex justify-between font-bold text-lg border-t-2 border-gray-300 pt-3 mt-2 ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            <span>Net Profit / (Loss)</span>
            <span>{formatCurrency(netProfit)}</span>
          </div>
        </div>
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
        description="Expenses, P&L, and sales summaries"
      />
      <Tabs defaultValue="expenses">
        <TabsList className="mb-6">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="categories">Expense Categories</TabsTrigger>
          <TabsTrigger value="pl"><TrendingUp className="w-4 h-4 mr-1.5" /> P&L</TabsTrigger>
          <TabsTrigger value="sales">Sales Summary</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses"><ExpensesTab /></TabsContent>
        <TabsContent value="categories"><ExpenseCategoriesTab /></TabsContent>
        <TabsContent value="pl"><ProfitLossTab /></TabsContent>
        <TabsContent value="sales"><SalesSummaryTab /></TabsContent>
      </Tabs>
    </div>
  );
}
