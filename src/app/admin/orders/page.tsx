'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { posApi } from '@/lib/api/pos.api';
import { useBranchStore } from '@/lib/stores/branch.store';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { PageSpinner } from '@/components/ui/spinner';
import {
  Eye, RefreshCw, Search, X, Printer, Ban, RotateCcw,
  Banknote, CreditCard, Building2, Clock, CheckCircle, XCircle,
  ShoppingBag, DollarSign, TrendingUp, FileText,
} from 'lucide-react';
import { Receipt, ReceiptMode } from '@/components/pos/receipt';
import { useBranchStore as useBranch } from '@/lib/stores/branch.store';
import { formatCurrency, formatDateTime, formatTime } from '@/lib/utils/format';
import { ORDER_STATUSES, PAYMENT_METHOD_LABELS } from '@/lib/utils/constants';
import type { PosOrder } from '@/lib/types';

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  READY: 'bg-teal-100 text-teal-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
};

const METHOD_ICON: Record<string, React.ReactNode> = {
  CASH: <Banknote className="w-3.5 h-3.5 text-green-600" />,
  CARD: <CreditCard className="w-3.5 h-3.5 text-blue-600" />,
  BANK_TRANSFER: <Building2 className="w-3.5 h-3.5 text-purple-600" />,
};

// ─── Order Detail ───────────────────────────────────────────────────────────

function OrderDetail({ order: listOrder, onClose }: { order: PosOrder; onClose: () => void }) {
  const qc = useQueryClient();
  const { activeBranch } = useBranch();
  const [refundOpen, setRefundOpen] = useState(false);
  const [receiptMode, setReceiptMode] = useState<ReceiptMode | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ amount: number; reason: string }>();

  // Fetch full order detail (includes menuItem.itemType)
  const { data: fullOrder } = useQuery({
    queryKey: ['order-detail', listOrder.id],
    queryFn: () => posApi.getOrder(listOrder.id),
  });
  const order = fullOrder || listOrder;

  const cancelMut = useMutation({
    mutationFn: () => posApi.updateOrderStatus(order.id, 'CANCELLED'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Order cancelled'); onClose(); },
    onError: () => toast.error('Failed to cancel'),
  });

  const refundMut = useMutation({
    mutationFn: (data: { amount: number; reason: string }) =>
      posApi.processRefund(order.id, data.amount, data.reason, order.payments?.[0]?.method || 'CASH'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); toast.success('Refund processed'); onClose(); },
    onError: (e: unknown) => toast.error((e as any)?.response?.data?.message || 'Refund failed'),
  });

  const isPending = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(order.status);
  const isCompleted = order.status === 'COMPLETED';
  const paymentMethod = order.payments?.[0]?.method;

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="font-mono">{order.orderNumber}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[order.status] || 'bg-gray-100'}`}>
              {order.status}
            </span>
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Type</p>
              <p className="font-medium text-gray-900">{order.orderType.replace('_', ' ')}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Table</p>
              <p className="font-medium text-gray-900">{order.table ? `#${order.table.number}${order.table.section ? ` · ${order.table.section}` : ''}` : '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Created</p>
              <p className="font-medium text-gray-900">{formatDateTime(order.createdAt)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Staff</p>
              <p className="font-medium text-gray-900">{order.createdBy?.fullName || '—'}</p>
            </div>
            {order.customer && (
              <div className="bg-gray-50 rounded-lg px-3 py-2 col-span-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Customer</p>
                <p className="font-medium text-gray-900">{order.customer.fullName}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
            <div className="bg-gray-50 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Items</div>
            <div className="divide-y divide-gray-100">
              {order.orderItems?.map((item) => (
                <div key={item.id} className="px-4 py-2.5 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      <span className="text-brand-700 mr-1">{item.quantity}×</span>
                      {item.itemName}
                    </p>
                    {item.modifiers?.length > 0 && (
                      <p className="text-xs text-gray-400 mt-0.5 pl-4">{item.modifiers.map((m: any) => m.modifierName).join(', ')}</p>
                    )}
                    {item.notes && <p className="text-xs text-orange-500 mt-0.5 pl-4 italic">"{item.notes}"</p>}
                  </div>
                  <span className="text-sm font-medium text-gray-900 shrink-0">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 mb-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>GST ({order.orderItems?.[0]?.taxRate ? `${Number(order.orderItems[0].taxRate)}%` : '—'})</span>
              <span>{formatCurrency(order.taxAmount)}</span>
            </div>
            {Number(order.discountAmount) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span><span>−{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-gray-300 pt-1.5">
              <span>Total</span><span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payments */}
          {order.payments?.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Payments</p>
              <div className="space-y-1.5">
                {order.payments.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      {METHOD_ICON[p.method]}
                      <span className="font-medium text-green-800">{PAYMENT_METHOD_LABELS[p.method] || p.method}</span>
                      {p.reference && <span className="text-xs text-green-600">ref: {p.reference}</span>}
                    </div>
                    <span className="font-bold text-green-800">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refund form */}
          {refundOpen && (
            <form onSubmit={handleSubmit((d) => refundMut.mutateAsync(d))} className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Process Refund</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Input label="Amount (₨)" type="number" step="0.01" defaultValue={Number(order.total)} {...register('amount', { required: true, valueAsNumber: true })} />
                <Input label="Reason" placeholder="e.g. Customer complaint" {...register('reason', { required: true })} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" onClick={() => setRefundOpen(false)}>Cancel</Button>
                <Button variant="destructive" type="submit" loading={isSubmitting}>Confirm Refund</Button>
              </div>
            </form>
          )}
        </DialogBody>
        <DialogFooter>
          <div className="flex items-center gap-2 w-full flex-wrap">
            <Button variant="outline" onClick={onClose}>Close</Button>

            {/* Reprint buttons — show KOT and/or BAR based on item types */}
            {(() => {
              const hasFood = order.orderItems?.some((it: any) => it.menuItem?.itemType === 'FOOD' || (!it.menuItem?.itemType && !it.itemName?.toLowerCase().includes('(small)') && !it.itemName?.toLowerCase().includes('(large)')));
              const hasBev = order.orderItems?.some((it: any) => it.menuItem?.itemType === 'BEVERAGE');
              return (
                <>
                  {hasFood && (
                    <Button variant="outline" size="sm" onClick={() => setReceiptMode('KITCHEN')}>
                      <Printer className="w-3.5 h-3.5" /> KOT
                    </Button>
                  )}
                  {hasBev && (
                    <Button variant="outline" size="sm" onClick={() => setReceiptMode('BAR')}>
                      <Printer className="w-3.5 h-3.5" /> Bar
                    </Button>
                  )}
                </>
              );
            })()}
            <Button variant="outline" size="sm" onClick={() => setReceiptMode('PRE_BILL')}>
              <FileText className="w-3.5 h-3.5" /> Pre-Bill
            </Button>
            {isCompleted && (
              <Button variant="outline" size="sm" onClick={() => setReceiptMode('PAID')}>
                <Printer className="w-3.5 h-3.5" /> Receipt
              </Button>
            )}

            <div className="flex-1" />
            {isPending && (
              <Button variant="destructive" onClick={() => cancelMut.mutate()} loading={cancelMut.isPending}>
                <Ban className="w-4 h-4" /> Void Order
              </Button>
            )}
            {isCompleted && !refundOpen && (
              <Button variant="destructive" onClick={() => setRefundOpen(true)}>
                <RotateCcw className="w-4 h-4" /> Refund
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Reprint receipt overlay */}
      {receiptMode && (
        <Receipt
          mode={receiptMode}
          order={{
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            createdAt: order.createdAt,
            table: order.table ? { number: order.table.number, section: order.table.section } : null,
            customer: order.customer ? { fullName: order.customer.fullName } : null,
            createdBy: order.createdBy ? { fullName: order.createdBy.fullName } : null,
            servedBy: undefined,
            orderItems: (order.orderItems || []).map((it: any) => ({
              itemName: it.itemName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxRate: it.taxRate,
              notes: it.notes,
              modifiers: it.modifiers,
            })),
            subtotal: order.subtotal,
            taxAmount: order.taxAmount,
            total: order.total,
            payments: order.payments,
            notes: order.notes,
          }}
          branchName={activeBranch?.name}
          onClose={() => setReceiptMode(null)}
        />
      )}
    </Dialog>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const qc = useQueryClient();
  const { activeBranch } = useBranchStore();
  const [selected, setSelected] = useState<PosOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-orders', activeBranch?.id, statusFilter, typeFilter, dateFilter],
    queryFn: () => posApi.listOrders(activeBranch?.id || '', {
      limit: 200,
      ...(statusFilter && { status: statusFilter }),
      ...(typeFilter && { orderType: typeFilter }),
      ...(dateFilter && { date: dateFilter }),
    }),
    enabled: !!activeBranch?.id,
    refetchInterval: 15_000,
  });

  // Client-side search filter
  const filtered = search.trim()
    ? orders.filter((o) =>
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.customer?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        o.createdBy?.fullName?.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  // Summary stats from filtered orders
  const completedOrders = filtered.filter(o => o.status === 'COMPLETED');
  const totalRevenue = completedOrders.reduce((s, o) => s + Number(o.total), 0);
  const avgOrder = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
  const pendingCount = filtered.filter(o => ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(o.status)).length;

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Orders"
        description="View, search, and manage all orders"
        action={
          <Button variant="outline" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Revenue</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Orders</p>
            <p className="text-lg font-bold text-gray-900">{filtered.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Avg Order</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(avgOrder)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${pendingCount > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
            <Clock className={`w-4 h-4 ${pendingCount > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Pending</p>
            <p className="text-lg font-bold text-gray-900">{pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, customer, staff…"
            className="pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
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
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Types</option>
          <option value="DINE_IN">Dine In</option>
          <option value="TAKEAWAY">Takeaway</option>
          <option value="DELIVERY">Delivery</option>
        </select>
        {(search || dateFilter || statusFilter || typeFilter) && (
          <button
            onClick={() => { setSearch(''); setDateFilter(''); setStatusFilter(''); setTypeFilter(''); }}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableEmpty message="No orders found" />}
            {filtered.map((order) => {
              const method = order.payments?.[0]?.method;
              return (
                <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelected(order)}>
                  <TableCell className="font-mono font-semibold text-sm text-brand-800">{order.orderNumber}</TableCell>
                  <TableCell className="text-gray-500 text-xs">{formatTime(order.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{order.orderType.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {order.table ? `T${order.table.number}` : '—'}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {order.orderItems?.reduce((s, it) => s + it.quantity, 0) ?? 0} items
                  </TableCell>
                  <TableCell>
                    {method ? (
                      <div className="flex items-center gap-1.5">
                        {METHOD_ICON[method]}
                        <span className="text-xs text-gray-600">{PAYMENT_METHOD_LABELS[method]?.split(' ')[0] || method}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[order.status] || 'bg-gray-100 text-gray-700'}`}>
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs">{order.createdBy?.fullName?.split(' ')[0] || '—'}</TableCell>
                  <TableCell>
                    <button className="p-1.5 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Detail dialog */}
      {selected && <OrderDetail order={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
