'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { posApi } from '@/lib/api/pos.api';
import { usePosStore } from '@/lib/stores/pos.store';
import { Button } from '@/components/ui/button';
import { Numpad } from '@/components/pos/numpad';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';
import {
  X, TrendingUp, ShoppingBag, Banknote, CreditCard, Building2,
  Printer, CheckCircle, XCircle, RotateCcw, Clock,
} from 'lucide-react';

export default function CloseShiftPage() {
  const router = useRouter();
  const { activeShift, setActiveShift } = usePosStore();
  const [cashStr, setCashStr] = useState('0');
  const [notes, setNotes] = useState('');
  const [report, setReport] = useState<any>(null);

  const closeMut = useMutation({
    mutationFn: () => posApi.closeShift(activeShift!.id, parseFloat(cashStr) || 0, notes || undefined),
    onSuccess: (data) => {
      setActiveShift(null);
      setReport(data.zReport || data.zReportData || data);
      toast.success('Shift closed');
    },
    onError: (e: unknown) => toast.error((e as any)?.response?.data?.message || 'Failed to close shift'),
  });

  // ─── Z-Report Screen ─────────────────────────────────────────────────────
  if (report) {
    return (
      <>
        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            #z-report-print, #z-report-print * { visibility: visible; }
            #z-report-print { position: absolute; left: 0; top: 0; width: 80mm; font-family: 'Courier New', monospace; color: #000; font-size: 11px; }
            @page { size: 80mm auto; margin: 4mm; }
          }
        `}</style>

        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-green-600 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6" />
                <div>
                  <h1 className="text-lg font-bold">Shift Closed</h1>
                  <p className="text-green-200 text-xs">Z-Report — End of Day Summary</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="p-2 bg-green-700 hover:bg-green-800 rounded-lg transition-colors" title="Print Z-Report">
                  <Printer className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Report body — both screen + print */}
            <div className="px-6 py-5" id="z-report-print">
              {/* Print header (hidden on screen) */}
              <div className="hidden print:block text-center mb-3">
                <div className="font-bold text-base">THE COFFEE LAB</div>
                <div className="text-xs">{report.branchName}</div>
                <div className="border-t border-dashed border-gray-400 my-1.5" />
                <div className="font-bold">Z-REPORT</div>
              </div>

              {/* Shift info */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4 print:bg-transparent print:p-0 print:mb-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Branch:</span> <span className="font-medium">{report.branchName}</span></div>
                  <div><span className="text-gray-500">Opened by:</span> <span className="font-medium">{report.openedBy}</span></div>
                  <div><span className="text-gray-500">Opened:</span> <span className="font-medium">{formatDateTime(report.openedAt)}</span></div>
                  <div><span className="text-gray-500">Closed:</span> <span className="font-medium">{formatDateTime(report.closedAt)}</span></div>
                </div>
              </div>

              {/* Sales Summary */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Sales Summary</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Total Orders</span><span className="font-bold">{report.totalOrders}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Subtotal</span><span className="font-medium">{formatCurrency(report.totalSubtotal)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">GST Collected</span><span className="font-medium">{formatCurrency(report.totalTax)}</span></div>
                  <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5 text-base">
                    <span>Gross Sales</span><span className="text-green-700">{formatCurrency(report.totalSales)}</span>
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">Avg Order Value</span><span className="font-medium">{formatCurrency(report.avgOrderValue)}</span></div>
                </div>
              </div>

              {/* Payment Breakdown */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment Methods</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><Banknote className="w-4 h-4 text-green-600 print:hidden" /> Cash</span>
                    <span className="font-bold">{formatCurrency(report.cashSales)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-600 print:hidden" /> Card (HBL POS)</span>
                    <span className="font-bold">{formatCurrency(report.cardSales)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-600 print:hidden" /> Bank Transfer</span>
                    <span className="font-bold">{formatCurrency(report.bankSales)}</span>
                  </div>
                </div>
              </div>

              {/* Order Types */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Order Types</h3>
                <div className="flex gap-3 text-sm">
                  <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center print:bg-transparent">
                    <p className="text-lg font-bold text-gray-900">{report.orderTypes?.dineIn ?? 0}</p>
                    <p className="text-[10px] text-gray-500">Dine In</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center print:bg-transparent">
                    <p className="text-lg font-bold text-gray-900">{report.orderTypes?.takeaway ?? 0}</p>
                    <p className="text-[10px] text-gray-500">Takeaway</p>
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center print:bg-transparent">
                    <p className="text-lg font-bold text-gray-900">{report.orderTypes?.delivery ?? 0}</p>
                    <p className="text-[10px] text-gray-500">Delivery</p>
                  </div>
                </div>
              </div>

              {/* Voids & Refunds */}
              {(report.voidedOrders > 0 || report.refundedOrders > 0) && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Voids & Refunds</h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-500 print:hidden" /> Voided Orders</span>
                      <span className="font-bold text-red-600">{report.voidedOrders}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-purple-500 print:hidden" /> Refunded Orders</span>
                      <span className="font-bold text-purple-600">{report.refundedOrders}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Drawer */}
              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cash Drawer</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Opening Float</span><span className="font-medium">{formatCurrency(report.openingFloat)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">+ Cash Sales</span><span className="font-medium">{formatCurrency(report.cashSales)}</span></div>
                  {report.cashIn > 0 && <div className="flex justify-between"><span className="text-gray-600">+ Cash In</span><span className="font-medium">{formatCurrency(report.cashIn)}</span></div>}
                  {report.cashOut > 0 && <div className="flex justify-between"><span className="text-gray-600">- Cash Out</span><span className="font-medium text-red-600">−{formatCurrency(report.cashOut)}</span></div>}
                  <div className="flex justify-between border-t border-gray-200 pt-1.5 font-bold">
                    <span>Expected in Drawer</span><span>{formatCurrency(report.expectedCash)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Counted Cash</span><span>{formatCurrency(report.closingCash)}</span>
                  </div>
                  <div className={`flex justify-between font-bold rounded-lg px-3 py-1.5 ${
                    Math.abs(report.cashVariance) < 1 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    <span>Variance</span>
                    <span>{report.cashVariance >= 0 ? '+' : ''}{formatCurrency(report.cashVariance)}</span>
                  </div>
                </div>
              </div>

              {/* Top Items */}
              {report.topItems?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Top Selling Items</h3>
                  <div className="space-y-1">
                    {report.topItems.slice(0, 10).map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate flex-1">
                          <span className="text-gray-400 mr-1.5">{i + 1}.</span>
                          {item.name}
                        </span>
                        <span className="text-gray-500 text-xs mx-2">{item.qty}×</span>
                        <span className="font-medium shrink-0">{formatCurrency(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Print footer */}
              <div className="hidden print:block text-center text-xs mt-3 border-t border-dashed border-gray-400 pt-2">
                Z-Report generated {formatDateTime(new Date())}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Print Z-Report
              </Button>
              <Button className="flex-1" onClick={() => router.replace('/admin/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── Close Shift Form ─────────────────────────────────────────────────────
  if (!activeShift) {
    router.replace('/pos');
    return null;
  }

  const expectedCash = activeShift.expectedCash ?? 0;
  const counted = parseFloat(cashStr) || 0;
  const variance = counted - expectedCash;

  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gray-800 px-6 py-5 text-white">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-bold">Close Shift</h1>
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-400 text-xs">Opened: {formatDateTime(activeShift.openedAt)}</p>
        </div>

        <div className="px-6 pt-5">
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500">Total Sales</span>
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(activeShift.totalSales ?? 0)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-500">Total Orders</span>
              </div>
              <p className="font-bold text-gray-900">{activeShift.totalOrders ?? 0}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className="w-4 h-4 text-brand-600" />
                <span className="text-xs text-gray-500">Opening Float</span>
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(activeShift.openingFloat)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500">Expected Cash</span>
              </div>
              <p className="font-bold text-gray-900">{formatCurrency(expectedCash)}</p>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mb-2">Count Cash in Drawer</h3>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-right mb-3">
            <span className="text-3xl font-bold text-gray-900">{formatCurrency(counted)}</span>
          </div>
          <Numpad value={cashStr} onChange={setCashStr} />

          <div className={`mt-3 rounded-xl px-4 py-2.5 flex items-center justify-between text-sm
            ${Math.abs(variance) < 1 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <span>Cash Variance</span>
            <span className="font-bold">{variance >= 0 ? '+' : ''}{formatCurrency(variance)}</span>
          </div>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Closing notes (optional)…"
            rows={2}
            className="w-full mt-3 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />

          <Button
            variant="destructive"
            className="w-full h-12 mt-4 mb-5 text-base"
            onClick={() => closeMut.mutate()}
            loading={closeMut.isPending}
          >
            Close Shift & Generate Z-Report
          </Button>
        </div>
      </div>
    </div>
  );
}
