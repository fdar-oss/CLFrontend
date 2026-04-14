'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { posApi } from '@/lib/api/pos.api';
import { useBranchStore } from '@/lib/stores/branch.store';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { PageSpinner } from '@/components/ui/spinner';
import { Eye, RefreshCw } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import { ORDER_STATUS_COLORS, ORDER_STATUSES, PAYMENT_METHOD_LABELS } from '@/lib/utils/constants';
import type { PosOrder } from '@/lib/types';

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'info'> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  IN_PROGRESS: 'warning',
  READY: 'success',
  SERVED: 'success',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
  REFUNDED: 'default',
};

function OrderDetailDialog({ order, open, onClose }: { order: PosOrder | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => posApi.updateOrderStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Status updated'); onClose(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed'),
  });

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Order {order.orderNumber}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* Summary */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={STATUS_BADGE[order.status] || 'secondary'}>{order.status}</Badge>
              <Badge variant="secondary">{order.orderType.replace('_', ' ')}</Badge>
              {order.table && <Badge variant="secondary">Table {order.table.number}{order.table.section ? ` (${order.table.section})` : ''}</Badge>}
            </div>
            <span className="text-xs text-gray-500">{formatDateTime(order.createdAt)}</span>
          </div>

          {order.customer && (
            <p className="text-sm text-gray-600 mb-3">Customer: <span className="font-medium">{order.customer.fullName}</span></p>
          )}

          {/* Items */}
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
            <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Items</div>
            <div className="divide-y divide-gray-100">
              {order.orderItems.map((item) => (
                <div key={item.id} className="px-3 py-2.5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-medium">{item.quantity}× {item.itemName}</span>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.modifiers.map((m) => m.modifierName).join(', ')}</p>
                      )}
                      {item.notes && <p className="text-xs text-orange-600 mt-0.5">Note: {item.notes}</p>}
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(item.lineTotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 text-sm mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax</span><span>{formatCurrency(order.taxAmount)}</span>
              </div>
            )}
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span><span>−{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t pt-1.5">
              <span>Total</span><span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payments */}
          {order.payments.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payments</p>
              <div className="space-y-1">
                {order.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{PAYMENT_METHOD_LABELS[p.method] || p.method}</span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FBR */}
          {order.fbrInvoiceNo && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
              <span className="font-medium text-green-800">FBR Invoice:</span>{' '}
              <span className="text-green-700 font-mono">{order.fbrInvoiceNo}</span>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onClose}>Close</Button>
          {order.status === 'COMPLETED' && (
            <Button
              variant="destructive"
              onClick={() => statusMut.mutate({ id: order.id, status: 'REFUNDED' })}
              loading={statusMut.isPending}
            >
              Mark Refunded
            </Button>
          )}
          {order.status === 'PENDING' && (
            <Button
              variant="destructive"
              onClick={() => statusMut.mutate({ id: order.id, status: 'CANCELLED' })}
              loading={statusMut.isPending}
            >
              Cancel Order
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function OrdersPage() {
  const { activeBranch } = useBranchStore();
  const [selected, setSelected] = useState<PosOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['orders', activeBranch?.id, statusFilter],
    queryFn: () => posApi.listOrders(activeBranch?.id || '', statusFilter ? { status: statusFilter } : { limit: 100 }),
    enabled: !!activeBranch?.id,
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div>
      <PageHeader
        title="Orders"
        description="View and manage all orders"
        action={
          <Button variant="outline" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{orders.length} orders</span>
      </div>

      {!activeBranch && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 mb-4">
          Select a branch from the header to view orders.
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && <TableEmpty message="No orders found" />}
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono font-medium text-sm">{order.orderNumber}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{order.orderType.replace('_', ' ')}</Badge>
                </TableCell>
                <TableCell className="text-gray-500">
                  {order.table ? `T${order.table.number}` : '—'}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {order.customer?.fullName || order.createdBy.fullName}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{order.orderItems.length} items</TableCell>
                <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
                  </span>
                </TableCell>
                <TableCell className="text-gray-500 text-xs">{formatDateTime(order.createdAt)}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setSelected(order)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OrderDetailDialog order={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}
