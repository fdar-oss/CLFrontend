'use client';

import { useEffect, useRef } from 'react';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

export type ReceiptMode = 'KITCHEN' | 'BAR' | 'PRE_BILL' | 'PAID';

interface ReceiptOrder {
  orderNumber: string;
  orderType: string;
  createdAt: string | Date;
  table?: { number: number; section?: string | null } | null;
  customer?: { fullName: string } | null;
  createdBy?: { fullName: string } | null;
  servedBy?: { fullName: string } | null;
  orderItems: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number | string;
    taxRate?: number | string;
    notes?: string | null;
    modifiers?: Array<{ modifierName: string; priceAdjustment: number | string }>;
  }>;
  subtotal: number | string;
  taxAmount: number | string;
  total: number | string;
  payments?: Array<{ method: string; amount: number | string; reference?: string | null }>;
  notes?: string | null;
}

interface ReceiptProps {
  mode: ReceiptMode;
  order: ReceiptOrder;
  branchName?: string;
  autoPrint?: boolean;
  onClose?: () => void;
  cashGiven?: number;
  change?: number;
}

const TITLES: Record<ReceiptMode, string> = {
  KITCHEN: 'KITCHEN ORDER',
  BAR: 'BAR ORDER',
  PRE_BILL: 'PRE-BILL',
  PAID: 'RECEIPT',
};

export function Receipt({ mode, order, branchName, autoPrint, onClose, cashGiven, change }: ReceiptProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoPrint) return;
    const t = setTimeout(() => window.print(), 200);
    return () => clearTimeout(t);
  }, [autoPrint]);

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print styles — only the receipt prints */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print, #receipt-print * { visibility: visible; }
          #receipt-print {
            position: absolute; left: 0; top: 0; width: 80mm;
            font-family: 'Courier New', monospace; color: #000;
          }
          @page { size: 80mm auto; margin: 4mm; }
        }
      `}</style>

      {/* On-screen modal preview */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 print:hidden">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">{TITLES[mode]}</h2>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="text-xs px-3 py-1 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700">
                Print
              </button>
              {onClose && (
                <button onClick={onClose} className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200">
                  Close
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div ref={ref} id="receipt-print" className="font-mono text-xs leading-tight text-gray-900 bg-white">
              <ReceiptBody mode={mode} order={order} branchName={branchName} cashGiven={cashGiven} change={change} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ReceiptBody({ mode, order, branchName, cashGiven, change }: { mode: ReceiptMode; order: ReceiptOrder; branchName?: string; cashGiven?: number; change?: number }) {
  const showPrices = mode !== 'KITCHEN';

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-2">
        <div className="font-bold text-base">THE COFFEE LAB</div>
        {branchName && <div className="text-[11px]">{branchName}</div>}
        <div className="border-t border-dashed border-gray-400 my-1.5" />
        <div className="font-bold text-sm uppercase">{TITLES[mode]}</div>
        <div className="text-[10px] text-gray-600 mt-0.5">
          {formatDateTime(order.createdAt)}
        </div>
      </div>

      {/* Meta */}
      <div className="text-[11px] mb-2">
        <div className="flex justify-between"><span>Order #</span><span className="font-bold">{order.orderNumber}</span></div>
        <div className="flex justify-between"><span>Type</span><span>{order.orderType.replace('_', ' ')}</span></div>
        {order.table && (
          <div className="flex justify-between"><span>Table</span><span>#{order.table.number}{order.table.section ? ` · ${order.table.section}` : ''}</span></div>
        )}
        {order.customer && (
          <div className="flex justify-between"><span>Customer</span><span>{order.customer.fullName}</span></div>
        )}
        {order.servedBy && (
          <div className="flex justify-between"><span>Served by</span><span>{order.servedBy.fullName}</span></div>
        )}
      </div>

      <div className="border-t border-dashed border-gray-400 my-1.5" />

      {/* Items */}
      <div className="mb-2">
        {order.orderItems.map((item, i) => {
          const modSum = (item.modifiers || []).reduce((s, m) => s + Number(m.priceAdjustment || 0), 0);
          const lineTotal = (Number(item.unitPrice) + modSum) * item.quantity;
          return (
            <div key={i} className="mb-1.5">
              <div className="flex justify-between gap-2">
                <span className="font-semibold">{item.quantity}x {item.itemName}</span>
                {showPrices && <span>{formatCurrency(lineTotal)}</span>}
              </div>
              {item.modifiers && item.modifiers.length > 0 && item.modifiers.map((m, j) => (
                <div key={j} className="pl-3 text-[10px] text-gray-700">
                  + {m.modifierName}
                  {showPrices && Number(m.priceAdjustment) !== 0 && ` (${formatCurrency(Number(m.priceAdjustment))})`}
                </div>
              ))}
              {item.notes && <div className="pl-3 text-[10px] italic text-gray-700">"{item.notes}"</div>}
            </div>
          );
        })}
      </div>

      {showPrices && (() => {
        const sub = Number(order.subtotal) || 0;
        const tax = Number(order.taxAmount) || 0;
        // Prefer the tax rate stored on the line item; fall back to derived rate
        const itemRate = Number(order.orderItems?.[0]?.taxRate ?? 0);
        const derivedRate = sub > 0 ? (tax / sub) * 100 : 0;
        const rate = itemRate > 0 ? itemRate : derivedRate;
        return (
          <>
            <div className="border-t border-dashed border-gray-400 my-1.5" />
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(sub)}</span></div>
              <div className="flex justify-between">
                <span>GST ({rate.toFixed(rate % 1 === 0 ? 0 : 2)}%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm border-t border-gray-700 pt-1 mt-1">
                <span>TOTAL</span><span>{formatCurrency(Number(order.total))}</span>
              </div>
            </div>
          </>
        );
      })()}

      {mode === 'PAID' && order.payments && order.payments.length > 0 && (
        <>
          <div className="border-t border-dashed border-gray-400 my-1.5" />
          <div className="text-[11px] space-y-0.5">
            {order.payments.map((p, i) => (
              <div key={i} className="flex justify-between">
                <span>{p.method.replace('_', ' ')}{p.reference ? ` · ${p.reference}` : ''}</span>
                <span>{formatCurrency(Number(p.amount))}</span>
              </div>
            ))}
            {cashGiven !== undefined && cashGiven > 0 && (
              <div className="flex justify-between"><span>Cash given</span><span>{formatCurrency(cashGiven)}</span></div>
            )}
            {change !== undefined && change > 0 && (
              <div className="flex justify-between font-bold"><span>Change</span><span>{formatCurrency(change)}</span></div>
            )}
          </div>
        </>
      )}

      {mode === 'PRE_BILL' && (
        <div className="text-center text-[10px] mt-3 italic text-gray-700">
          *** This is not a paid receipt ***
        </div>
      )}

      <div className="border-t border-dashed border-gray-400 my-1.5" />
      <div className="text-center text-[10px] mt-2">
        {mode === 'KITCHEN'
          ? 'KOT — for kitchen use'
          : mode === 'BAR'
          ? 'BAR ORDER — for bar use'
          : mode === 'PAID'
          ? 'Thank you for visiting!'
          : 'Pre-bill — please pay at counter'}
      </div>
      {order.notes && (
        <div className="mt-2 text-[10px] italic text-gray-700 text-center">Note: {order.notes}</div>
      )}
    </div>
  );
}
