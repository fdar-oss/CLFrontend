'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBranchStore } from '@/lib/stores/branch.store';
import { financeApi } from '@/lib/api/finance.api';
import { PageHeader } from '@/components/admin/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PageSpinner } from '@/components/ui/spinner';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils/format';
import {
  Printer, Banknote, CreditCard, Building2, TrendingUp,
  ShoppingBag, XCircle, RotateCcw, Clock, CheckCircle,
  CalendarDays, ChevronDown, ChevronUp, Users,
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import api from '@/lib/api/axios';

// ─── Z-Reports Tab ──────────────────────────────────────────────────────────

function ZReportsTab() {
  const { activeBranch } = useBranchStore();
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['closed-shifts', activeBranch?.id],
    queryFn: () => api.get('/pos/shifts/closed', { params: { branchId: activeBranch?.id, limit: 50 } }).then(r => r.data),
    enabled: !!activeBranch?.id,
  });

  if (isLoading) return <PageSpinner />;

  // If viewing a specific report
  if (selectedReport) {
    const r = selectedReport;
    return (
      <div>
        <Button variant="outline" onClick={() => setSelectedReport(null)} className="mb-4">
          ← Back to list
        </Button>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-charcoal-800 px-6 py-4 text-white flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Z-Report</h2>
              <p className="text-charcoal-400 text-xs">{r.branchName} · {formatDateTime(r.closedAt)}</p>
            </div>
            <Button size="sm" variant="outline" className="text-white border-charcoal-600 hover:bg-charcoal-700" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>

          <div className="p-6 space-y-6" id="z-report-print">
            {/* Shift Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Opened By</p>
                <p className="font-medium text-sm">{r.openedBy}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Opened</p>
                <p className="font-medium text-sm">{formatDateTime(r.openedAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Closed</p>
                <p className="font-medium text-sm">{formatDateTime(r.closedAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total Orders</p>
                <p className="font-bold text-lg">{r.totalOrders}</p>
              </div>
            </div>

            {/* Sales */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Sales Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-green-600">Gross Sales</p>
                  <p className="text-xl font-bold text-green-800">{formatCurrency(r.totalSales)}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">Subtotal</p>
                  <p className="text-xl font-bold">{formatCurrency(r.totalSubtotal)}</p>
                </div>
                <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-brand-600">GST Collected</p>
                  <p className="text-xl font-bold text-brand-800">{formatCurrency(r.totalTax)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-blue-600">Avg Order</p>
                  <p className="text-xl font-bold text-blue-800">{formatCurrency(r.avgOrderValue)}</p>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Methods</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Banknote className="w-5 h-5 text-green-600" /></div>
                  <div><p className="text-xs text-gray-500">Cash</p><p className="text-lg font-bold">{formatCurrency(r.cashSales)}</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><CreditCard className="w-5 h-5 text-blue-600" /></div>
                  <div><p className="text-xs text-gray-500">Card</p><p className="text-lg font-bold">{formatCurrency(r.cardSales)}</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-purple-600" /></div>
                  <div><p className="text-xs text-gray-500">Bank</p><p className="text-lg font-bold">{formatCurrency(r.bankSales)}</p></div>
                </div>
              </div>
            </div>

            {/* Order Types + Voids */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Order Types</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"><span>Dine In</span><span className="font-bold">{r.orderTypes?.dineIn ?? 0}</span></div>
                  <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"><span>Takeaway</span><span className="font-bold">{r.orderTypes?.takeaway ?? 0}</span></div>
                  <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"><span>Delivery</span><span className="font-bold">{r.orderTypes?.delivery ?? 0}</span></div>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Voids & Refunds</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500" /> Voided</span>
                    <span className="font-bold">{r.voidedOrders ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-purple-500" /> Refunded</span>
                    <span className="font-bold">{r.refundedOrders ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cash Drawer */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Cash Drawer Reconciliation</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span>Opening Float</span><span className="font-medium">{formatCurrency(r.openingFloat)}</span></div>
                <div className="flex justify-between"><span>+ Cash Sales</span><span className="font-medium">{formatCurrency(r.cashSales)}</span></div>
                {r.cashIn > 0 && <div className="flex justify-between"><span>+ Cash In</span><span className="font-medium">{formatCurrency(r.cashIn)}</span></div>}
                {r.cashOut > 0 && <div className="flex justify-between"><span>- Cash Out</span><span className="font-medium text-red-600">−{formatCurrency(r.cashOut)}</span></div>}
                <div className="flex justify-between border-t border-gray-300 pt-2 font-bold"><span>Expected</span><span>{formatCurrency(r.expectedCash)}</span></div>
                <div className="flex justify-between font-bold"><span>Counted</span><span>{formatCurrency(r.closingCash)}</span></div>
                <div className={`flex justify-between font-bold rounded-lg px-3 py-2 ${Math.abs(r.cashVariance) < 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <span>Variance</span><span>{r.cashVariance >= 0 ? '+' : ''}{formatCurrency(r.cashVariance)}</span>
                </div>
              </div>
            </div>

            {/* Top Items */}
            {r.topItems?.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Top Selling Items</h3>
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty Sold</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {r.topItems.map((item: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</span>
                          </TableCell>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.qty}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(item.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Shift list ────────────────────────────────────────────────────────────
  return (
    <div>
      {shifts.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          No closed shifts yet. Z-Reports will appear here after you close a shift from the POS terminal.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Opened By</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Gross Sales</TableHead>
                <TableHead>Cash Variance</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift: any) => {
                const report = shift.zReportData;
                const duration = shift.closedAt && shift.openedAt
                  ? Math.round((new Date(shift.closedAt).getTime() - new Date(shift.openedAt).getTime()) / 3600000 * 10) / 10
                  : 0;
                return (
                  <TableRow key={shift.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setSelectedReport(report)}>
                    <TableCell>
                      <p className="font-medium">{formatDate(shift.closedAt)}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(shift.openedAt)} → {formatDateTime(shift.closedAt)}</p>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">{shift.openedBy?.fullName || '—'}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{duration}h</TableCell>
                    <TableCell className="font-medium">{shift.totalOrders ?? 0}</TableCell>
                    <TableCell className="font-bold text-green-700">{formatCurrency(shift.totalSales ?? 0)}</TableCell>
                    <TableCell>
                      {shift.cashVariance !== null && (
                        <span className={`text-sm font-medium ${Math.abs(Number(shift.cashVariance)) < 1 ? 'text-green-600' : 'text-red-600'}`}>
                          {Number(shift.cashVariance) >= 0 ? '+' : ''}{formatCurrency(shift.cashVariance)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View Report</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ─── Sales Report Tab ────────────────────────────────────────────────────────

function SalesReportTab() {
  const { activeBranch } = useBranchStore();
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: report, isLoading } = useQuery({
    queryKey: ['sales-report', activeBranch?.id, from, to],
    queryFn: () => financeApi.getSalesReport(from, to, activeBranch?.id),
    enabled: !!from && !!to,
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <span className="text-gray-400">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </div>

      {isLoading && <PageSpinner />}

      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold">{report.totals?.totalOrders ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500">Gross Sales</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(report.totals?.grossSales ?? 0)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500">Tax Collected</p>
              <p className="text-2xl font-bold text-brand-700">{formatCurrency(report.totals?.taxCollected ?? 0)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-xs text-gray-500">Cash Sales</p>
              <p className="text-2xl font-bold">{formatCurrency(report.totals?.cashSales ?? 0)}</p>
            </div>
          </div>

          {report.daily?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Gross Sales</TableHead>
                    <TableHead>Net Sales</TableHead>
                    <TableHead>Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.daily.map((d: any) => (
                    <TableRow key={d.id || d.date}>
                      <TableCell className="font-medium">{formatDate(d.date)}</TableCell>
                      <TableCell>{d.totalOrders}</TableCell>
                      <TableCell className="font-semibold text-green-700">{formatCurrency(d.grossSales)}</TableCell>
                      <TableCell>{formatCurrency(d.netSales)}</TableCell>
                      <TableCell>{formatCurrency(d.taxCollected)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EOD Report Tab ─────────────────────────────────────────────────────────

function EODReportTab() {
  const { activeBranch } = useBranchStore();
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expandedShifts, setExpandedShifts] = useState<Record<string, boolean>>({});

  const { data: report, isLoading } = useQuery({
    queryKey: ['eod-report', activeBranch?.id, date],
    queryFn: () => financeApi.getEODReport(date, activeBranch?.id),
    enabled: !!date,
  });

  const toggleShift = (id: string) => setExpandedShifts(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <Button variant="outline" size="sm" onClick={() => setDate(format(new Date(), 'yyyy-MM-dd'))}>Today</Button>
        <Button variant="outline" size="sm" onClick={() => setDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'))}>Yesterday</Button>
      </div>

      {isLoading && <PageSpinner />}

      {report && (
        <div className="space-y-6" id="eod-report-print">
          {/* Header */}
          <div className="bg-charcoal-800 rounded-xl px-6 py-4 text-white flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">End of Day Report</h2>
              <p className="text-charcoal-400 text-xs">{formatDate(report.date)}{activeBranch ? ` · ${activeBranch.name}` : ''}</p>
            </div>
            <Button size="sm" variant="outline" className="text-white border-charcoal-600 hover:bg-charcoal-700" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>

          {/* Sales Summary */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Sales Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <p className="text-xs text-green-600">Gross Sales</p>
                <p className="text-xl font-bold text-green-800">{formatCurrency(report.sales.grossSales)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500">Subtotal</p>
                <p className="text-xl font-bold">{formatCurrency(report.sales.subtotal)}</p>
              </div>
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center">
                <p className="text-xs text-brand-600">GST Collected</p>
                <p className="text-xl font-bold text-brand-800">{formatCurrency(report.sales.tax)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-xs text-red-600">Discounts</p>
                <p className="text-xl font-bold text-red-800">{formatCurrency(report.sales.discounts)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-600">Orders / Avg</p>
                <p className="text-lg font-bold text-blue-800">{report.sales.totalOrders} / {formatCurrency(report.sales.avgOrderValue)}</p>
              </div>
            </div>
          </div>

          {/* Payment Methods + Order Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment Methods</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><Banknote className="w-5 h-5 text-green-600" /></div>
                  <div><p className="text-xs text-gray-500">Cash</p><p className="text-lg font-bold">{formatCurrency(report.payments.cash)}</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><CreditCard className="w-5 h-5 text-blue-600" /></div>
                  <div><p className="text-xs text-gray-500">Card</p><p className="text-lg font-bold">{formatCurrency(report.payments.card)}</p></div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><Building2 className="w-5 h-5 text-purple-600" /></div>
                  <div><p className="text-xs text-gray-500">Bank</p><p className="text-lg font-bold">{formatCurrency(report.payments.bank)}</p></div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Order Types</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"><span>Dine In</span><span className="font-bold">{report.orderTypes.dineIn}</span></div>
                <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"><span>Takeaway</span><span className="font-bold">{report.orderTypes.takeaway}</span></div>
                <div className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"><span>Delivery</span><span className="font-bold">{report.orderTypes.delivery}</span></div>
              </div>
            </div>
          </div>

          {/* Voids & Refunds */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div><p className="text-xs text-red-600">Voided Orders</p><p className="text-lg font-bold text-red-800">{report.voidsAndRefunds.voidedCount}</p></div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div><p className="text-xs text-red-600">Voided Value</p><p className="text-lg font-bold text-red-800">{formatCurrency(report.voidsAndRefunds.voidedValue)}</p></div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-purple-500" />
              <div><p className="text-xs text-purple-600">Refunded Orders</p><p className="text-lg font-bold text-purple-800">{report.voidsAndRefunds.refundedCount}</p></div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-purple-500" />
              <div><p className="text-xs text-purple-600">Refunded Value</p><p className="text-lg font-bold text-purple-800">{formatCurrency(report.voidsAndRefunds.refundedValue)}</p></div>
            </div>
          </div>

          {/* Commission */}
          {report.commission.byTaker.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Order Taker Commission</h3>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Taker</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Commission</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.commission.byTaker.map((t: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell>{t.orders}</TableCell>
                        <TableCell>{formatCurrency(t.subtotal)}</TableCell>
                        <TableCell className="font-bold text-brand-700">{formatCurrency(t.commission)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={3}>Total Commission</TableCell>
                      <TableCell className="text-brand-700">{formatCurrency(report.commission.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Per-Shift Breakdown */}
          {report.shifts.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Per-Shift Breakdown</h3>
              <div className="space-y-3">
                {report.shifts.map((shift: any) => (
                  <div key={shift.shiftId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button onClick={() => toggleShift(shift.shiftId)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium text-sm text-left">{shift.openedBy}</p>
                          <p className="text-xs text-gray-400">{formatDateTime(shift.openedAt)} → {shift.closedAt ? formatDateTime(shift.closedAt) : 'Open'}</p>
                        </div>
                        <Badge variant={shift.status === 'CLOSED' ? 'secondary' : 'default'}>
                          {shift.status === 'CLOSED' ? 'Closed' : 'Open'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{shift.totalOrders} orders</p>
                          <p className="font-bold text-green-700">{formatCurrency(shift.totalSales)}</p>
                        </div>
                        {expandedShifts[shift.shiftId] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    {expandedShifts[shift.shiftId] && (
                      <div className="border-t border-gray-200 px-4 py-3">
                        <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
                          <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-[10px] text-gray-400 uppercase">Opening Float</p>
                            <p className="font-medium">{formatCurrency(shift.openingFloat)}</p>
                          </div>
                          {shift.closingCash !== null && (
                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                              <p className="text-[10px] text-gray-400 uppercase">Closing Cash</p>
                              <p className="font-medium">{formatCurrency(shift.closingCash)}</p>
                            </div>
                          )}
                          {shift.cashVariance !== null && (
                            <div className={`rounded-lg p-2 text-center ${Math.abs(shift.cashVariance) < 1 ? 'bg-green-50' : 'bg-red-50'}`}>
                              <p className="text-[10px] text-gray-400 uppercase">Cash Variance</p>
                              <p className={`font-medium ${Math.abs(shift.cashVariance) < 1 ? 'text-green-700' : 'text-red-700'}`}>
                                {shift.cashVariance >= 0 ? '+' : ''}{formatCurrency(shift.cashVariance)}
                              </p>
                            </div>
                          )}
                        </div>
                        {shift.items.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Item</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Revenue</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {shift.items.map((item: any, i: number) => (
                                <TableRow key={i}>
                                  <TableCell className="font-medium text-sm">{item.name}</TableCell>
                                  <TableCell className="text-sm">{item.qty}</TableCell>
                                  <TableCell className="font-semibold text-sm">{formatCurrency(item.revenue)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-3">No items sold in this shift</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combined Item Breakdown */}
          {report.allItems.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">All Items Sold</h3>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.allItems.map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</span>
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.qty}</TableCell>
                        <TableCell className="font-semibold">{formatCurrency(item.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Expenses */}
          {report.expenses.items.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Expenses</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {report.expenses.byCategory.map((c: any, i: number) => (
                  <div key={i} className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-orange-600">{c.category}</p>
                    <p className="text-lg font-bold text-orange-800">{formatCurrency(c.total)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.expenses.items.map((e: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{e.description}</TableCell>
                        <TableCell className="text-sm text-gray-500">{e.category}</TableCell>
                        <TableCell className="font-semibold text-sm">{formatCurrency(e.amount)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={2}>Total Expenses</TableCell>
                      <TableCell>{formatCurrency(report.expenses.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Daily P&L */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Daily P&L</h3>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>Revenue (Gross Sales)</span><span className="font-medium text-green-700">{formatCurrency(report.dailyPL.revenue)}</span></div>
              <div className="flex justify-between"><span>− Expenses</span><span className="font-medium text-red-600">−{formatCurrency(report.dailyPL.expenses)}</span></div>
              <div className="flex justify-between"><span>− Commission</span><span className="font-medium text-red-600">−{formatCurrency(report.dailyPL.commission)}</span></div>
              <div className={`flex justify-between border-t border-gray-300 pt-2 font-bold text-base rounded-lg px-3 py-2 ${report.dailyPL.netProfit >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                <span>Net Profit</span>
                <span>{formatCurrency(report.dailyPL.netProfit)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isLoading && !report && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          No data found for this date. Select a date with sales activity.
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Z-Reports, sales analysis, and financial summaries"
      />

      <Tabs defaultValue="eod">
        <TabsList className="mb-6">
          <TabsTrigger value="eod"><CalendarDays className="w-4 h-4 mr-1.5" /> EOD Report</TabsTrigger>
          <TabsTrigger value="z-reports"><Clock className="w-4 h-4 mr-1.5" /> Z-Reports</TabsTrigger>
          <TabsTrigger value="sales"><TrendingUp className="w-4 h-4 mr-1.5" /> Sales Report</TabsTrigger>
        </TabsList>
        <TabsContent value="eod"><EODReportTab /></TabsContent>
        <TabsContent value="z-reports"><ZReportsTab /></TabsContent>
        <TabsContent value="sales"><SalesReportTab /></TabsContent>
      </Tabs>
    </div>
  );
}
