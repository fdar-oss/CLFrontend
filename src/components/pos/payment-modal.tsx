'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { posApi } from '@/lib/api/pos.api';
import { usePosStore, CartItem } from '@/lib/stores/pos.store';
import { Button } from '@/components/ui/button';
import { Numpad } from './numpad';
import { formatCurrency } from '@/lib/utils/format';
import { PAYMENT_METHOD_LABELS } from '@/lib/utils/constants';
import { X, CheckCircle, CreditCard, Banknote, Building2 } from 'lucide-react';

const CASH_TAX_RATE = 0.16;         // 16% GST — cash invoice
const NON_CASH_TAX_RATE = 0.05;     // 5% GST — card / bank transfer

type PayMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER';

function taxRateFor(method: PayMethod) {
  return method === 'CASH' ? CASH_TAX_RATE : NON_CASH_TAX_RATE;
}

const METHOD_ICONS: Record<PayMethod, React.ReactNode> = {
  CASH:          <Banknote className="w-5 h-5" />,
  CARD:          <CreditCard className="w-5 h-5" />,
  BANK_TRANSFER: <Building2 className="w-5 h-5" />,
};

const METHODS: { key: PayMethod; label: string; sub: string }[] = [
  { key: 'CASH',          label: 'Cash',          sub: '' },
  { key: 'CARD',          label: 'Card',          sub: 'HBL POS' },
  { key: 'BANK_TRANSFER', label: 'Bank Transfer', sub: 'HBL Business' },
];

interface PaymentModalProps {
  branchId: string;
  orderType: string;
  tableId?: string;
  customerId?: string | null;
  servedById?: string | null;
  /** If provided, payment is processed against this existing order — no new order is created. */
  existingOrderId?: string | null;
  cartItems: CartItem[];
  subtotal: number;
  discount?: { type: 'PERCENT' | 'FLAT'; value: number; reason: string } | null;
  onSuccess: (orderId: string, cashGiven?: number, change?: number) => void;
  onClose: () => void;
}

export function PaymentModal({
  branchId, orderType, tableId, customerId, servedById, existingOrderId,
  cartItems, subtotal, discount, onSuccess, onClose,
}: PaymentModalProps) {
  const clearCart = usePosStore((s) => s.clearCart);
  const qc = useQueryClient();

  const [method, setMethod] = useState<PayMethod>('CASH');
  const [amountStr, setAmountStr] = useState('');
  const [payments, setPayments] = useState<{ method: string; amount: number; reference?: string }[]>([]);
  const [reference, setReference] = useState('');
  const [done, setDone] = useState(false);
  const [change, setChange] = useState(0);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [tableReleased, setTableReleased] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custOptIn, setCustOptIn] = useState(true);

  // For parked orders, fetch the existing order to get its real subtotal
  const { data: existingOrder } = useQuery({
    queryKey: ['order-detail', existingOrderId],
    queryFn: () => posApi.getOrder(existingOrderId!),
    enabled: !!existingOrderId,
  });

  // Effective subtotal: parked order's subtotal if available, otherwise the cart's
  const rawSubtotal = existingOrderId
    ? Number(existingOrder?.subtotal ?? 0)
    : subtotal;

  // Apply discount
  const discountAmount = discount
    ? discount.type === 'PERCENT' ? (rawSubtotal * discount.value) / 100 : discount.value
    : 0;
  const effectiveSubtotal = Math.max(0, rawSubtotal - discountAmount);

  // Lines to display: from the existing order (parked) OR from the current cart
  const displayLines: Array<{
    name: string;
    qty: number;
    unit: number;
    modifiers: { name: string; price: number }[];
    notes?: string | null;
  }> = existingOrderId
    ? (existingOrder?.orderItems || []).map((it: any) => ({
        name: it.itemName,
        qty: it.quantity,
        unit: Number(it.unitPrice),
        modifiers: (it.modifiers || []).map((m: any) => ({ name: m.modifierName, price: Number(m.priceAdjustment) })),
        notes: it.notes,
      }))
    : cartItems.map((it) => ({
        name: it.itemName,
        qty: it.quantity,
        unit: it.unitPrice,
        modifiers: it.modifiers.map((m) => ({ name: m.modifierName, price: m.priceAdjustment })),
        notes: it.notes,
      }));

  // Live tax calculation based on selected method — round to whole rupees
  const taxRate = taxRateFor(method);
  const taxAmount = Math.round(effectiveSubtotal * taxRate);
  const total = Math.round(effectiveSubtotal + taxAmount);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const inputAmount = parseFloat(amountStr) || 0;

  // Update amount display when method (and thus total) changes
  function handleMethodChange(m: PayMethod) {
    setMethod(m);
    const newTaxAmount = effectiveSubtotal * taxRateFor(m);
    const newTotal = effectiveSubtotal + newTaxAmount;
    const newRemaining = Math.max(0, newTotal - totalPaid);
    setAmountStr(payments.length === 0 ? newTotal.toFixed(2) : newRemaining.toFixed(2));
  }

  // Keep amount in sync once the existing order loads (for parked orders)
  useEffect(() => {
    if (payments.length === 0) setAmountStr(total.toFixed(2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const createAndPayMut = useMutation({
    mutationFn: async () => {
      let orderId = existingOrderId;
      if (!orderId) {
        const order = await posApi.createOrder({
          branchId,
          orderType,
          tableId,
          customerId: customerId || undefined,
          servedById: servedById || undefined,
          paymentMethod: method,
          discount: discount ? { type: discount.type, value: discount.value, reason: discount.reason } : undefined,
          items: cartItems.map((item) => ({
            menuItemId: item.menuItemId,
            variantId: item.variantId,
            variantName: item.variantName,
            quantity: item.quantity,
            notes: item.notes,
            modifiers: item.modifiers.map((m) => ({
              modifierId: m.modifierId,
              modifierName: m.modifierName,
              priceAdjustment: m.priceAdjustment,
            })),
          })),
        });
        orderId = order.id;
      }

      const paymentList = payments.length > 0 ? payments : [{ method, amount: total }];
      const customerPayload = custName.trim() && (custPhone.trim() || custEmail.trim())
        ? { fullName: custName.trim(), phone: custPhone.trim() || undefined, email: custEmail.trim() || undefined, optInEmail: custOptIn }
        : undefined;
      // Default: don't free table — operator picks on success screen
      // Send paymentMethod so backend recalculates tax for existing orders
      await posApi.processPayment(orderId!, paymentList, false, method, customerPayload);
      return orderId!;
    },
    onSuccess: (orderId) => {
      toast.success('Payment processed!');
      // Change for ANY method — if they tendered more than the bill, show the difference
      const effectivePaid = payments.length === 0 ? inputAmount : payments.reduce((s, p) => s + p.amount, 0);
      setChange(Math.max(0, effectivePaid - total));
      setCompletedOrderId(orderId);
      setDone(true);
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Payment failed'),
  });

  const releaseTableMut = useMutation({
    mutationFn: async () => {
      if (!tableId) return;
      await posApi.updateTableStatus(tableId, branchId, 'AVAILABLE');
    },
    onSuccess: () => {
      setTableReleased(true);
      qc.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table freed');
    },
  });

  function addPayment() {
    if (inputAmount <= 0) return;
    const capped = Math.min(inputAmount, remaining);
    setPayments((prev) => [...prev, { method, amount: capped, reference: reference || undefined }]);
    setReference('');
    setAmountStr(Math.max(0, remaining - capped).toFixed(2));
  }

  function removePayment(idx: number) {
    const removed = payments[idx].amount;
    setPayments((prev) => prev.filter((_, i) => i !== idx));
    setAmountStr((remaining + removed).toFixed(2));
  }

  function handleCharge() {
    if (payments.length > 0 && remaining > 0) {
      addPayment();
    } else {
      createAndPayMut.mutate();
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Payment Complete</h2>
          {change > 0 && (
            <p className="text-lg text-gray-600 mb-4">
              Change: <span className="font-bold text-green-600">{formatCurrency(change)}</span>
            </p>
          )}

          {/* Customer-left prompt — only for dine-in with a table */}
          {tableId && !tableReleased && (
            <div className="mt-4 mb-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-3">Has the customer left?</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => { setTableReleased(true); }}>
                  Still seated
                </Button>
                <Button onClick={() => releaseTableMut.mutate()} loading={releaseTableMut.isPending}>
                  Yes, free table
                </Button>
              </div>
            </div>
          )}
          {tableId && tableReleased && (
            <p className="text-xs text-gray-400 mt-4 mb-2">
              Table is now {releaseTableMut.isSuccess ? 'available' : 'still occupied'}
            </p>
          )}

          <Button
            className="w-full h-12 mt-4"
            onClick={() => {
              clearCart();
              onSuccess(completedOrderId!, payments.length === 0 && method === 'CASH' ? inputAmount : undefined, change);
            }}
          >
            Print Receipt & New Order
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Collect Payment</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Method Selection — FIRST so tax updates before showing totals */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-3">
              {METHODS.map(({ key, label, sub }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleMethodChange(key)}
                  className={`
                    flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-sm font-medium transition-all
                    ${method === key
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}
                  `}
                >
                  {METHOD_ICONS[key]}
                  <span>{label}</span>
                  {sub && <span className={`text-xs font-normal ${method === key ? 'text-brand-500' : 'text-gray-400'}`}>{sub}</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Items breakdown */}
          {displayLines.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Items {existingOrderId && existingOrder?.orderNumber && (
                    <span className="text-gray-400 font-normal normal-case">· {existingOrder.orderNumber}</span>
                  )}
                </p>
                <span className="text-[11px] text-gray-400">
                  {displayLines.reduce((s, l) => s + l.qty, 0)} item{displayLines.reduce((s, l) => s + l.qty, 0) !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
                {displayLines.map((line, i) => {
                  const modSum = line.modifiers.reduce((s, m) => s + m.price, 0);
                  const lineTotal = (line.unit + modSum) * line.qty;
                  return (
                    <div key={i} className="px-3 py-2.5 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">
                            <span className="text-brand-700 mr-1.5">{line.qty}×</span>
                            {line.name}
                          </p>
                          {line.modifiers.length > 0 && (
                            <ul className="text-[11px] text-gray-500 mt-0.5 pl-4 list-disc list-inside">
                              {line.modifiers.map((m, j) => (
                                <li key={j}>
                                  {m.name}
                                  {m.price !== 0 && (
                                    <span className={m.price > 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                                      ({m.price > 0 ? '+' : ''}{formatCurrency(m.price)})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          {line.notes && (
                            <p className="text-[11px] italic text-orange-500 mt-0.5">"{line.notes}"</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-gray-900">{formatCurrency(lineTotal)}</p>
                          <p className="text-[10px] text-gray-400">
                            {formatCurrency(line.unit + modSum)} ea
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary — updates live when method changes */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
            {discount ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-400 line-through">{formatCurrency(rawSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-green-600">
                  <span>{discount.type === 'PERCENT' ? `${discount.value}% Discount` : 'Discount'} — {discount.reason}</span>
                  <span>−{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">After Discount</span>
                  <span className="text-gray-700 font-medium">{formatCurrency(effectiveSubtotal)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-700">{formatCurrency(effectiveSubtotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {method === 'CASH'
                  ? 'GST — Cash Invoice (16%)'
                  : method === 'CARD'
                  ? 'GST — Card / HBL POS (5%)'
                  : 'GST — Bank Transfer / HBL (5%)'}
              </span>
              <span className="text-gray-700">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-gray-200">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Added Payments */}
          {payments.length > 0 && (
            <div className="space-y-1.5">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                  <span className="font-medium text-green-800">{PAYMENT_METHOD_LABELS[p.method]}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-green-800">{formatCurrency(p.amount)}</span>
                    <button onClick={() => removePayment(i)} className="text-green-400 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm px-1">
                <span className="text-gray-500">Remaining</span>
                <span className={`font-bold ${remaining === 0 ? 'text-green-600' : 'text-brand-700'}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>
          )}

          {/* Amount + Numpad */}
          {remaining > 0 && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Amount</p>
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-right mb-3">
                  <span className="text-3xl font-bold text-gray-900">
                    {amountStr ? `₨ ${parseFloat(amountStr).toLocaleString()}` : '₨ 0'}
                  </span>
                </div>
                <Numpad value={amountStr} onChange={setAmountStr} />
              </div>

              {/* Quick amounts — available for all payment methods */}
              <div className="flex gap-2">
                {[500, 1000, 2000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmountStr(amt.toFixed(2))}
                    className="flex-1 py-2 bg-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    {amt >= 1000 ? `${amt / 1000}k` : amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmountStr(remaining.toFixed(2))}
                  className="flex-1 py-2 bg-brand-50 text-brand-700 rounded-xl text-sm font-medium hover:bg-brand-100"
                >
                  Exact
                </button>
              </div>

              {/* Live change hint when amount entered exceeds bill */}
              {inputAmount > remaining && remaining > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                      {method === 'CASH' ? 'Change to give back' : 'Customer overpaid'}
                    </p>
                    <p className="text-[11px] text-green-600 mt-0.5">
                      Received {formatCurrency(inputAmount)} · Bill {formatCurrency(remaining)}
                    </p>
                  </div>
                  <span className="text-xl font-bold text-green-700">
                    {formatCurrency(inputAmount - remaining)}
                  </span>
                </div>
              )}

              {/* Reference for non-cash */}
              {method !== 'CASH' && (
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={method === 'CARD' ? 'HBL POS transaction ref (optional)' : 'HBL transfer reference / last 4 digits'}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              )}

              {payments.length > 0 && (
                <Button variant="outline" className="w-full" onClick={addPayment} disabled={inputAmount <= 0}>
                  + Add {METHODS.find((m) => m.key === method)?.label} Payment
                </Button>
              )}
            </>
          )}

          {/* Customer capture */}
          <div className="border-t border-gray-100 pt-3 -mb-1">
            <button
              type="button"
              onClick={() => setShowCustomer((v) => !v)}
              className="text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1"
            >
              {showCustomer ? '−' : '+'} {showCustomer ? 'Skip customer details' : 'Add customer for marketing / receipt'}
            </button>
            {showCustomer && (
              <div className="mt-3 space-y-2">
                <input
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="Full name"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="Phone"
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <input
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={custOptIn}
                    onChange={(e) => setCustOptIn(e.target.checked)}
                    className="rounded"
                  />
                  Customer agrees to receive marketing emails
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          {remaining === 0 ? (
            <Button className="w-full h-12 text-base" onClick={() => createAndPayMut.mutate()} loading={createAndPayMut.isPending}>
              Pay & Print Receipt — {formatCurrency(total)}
            </Button>
          ) : (
            <Button
              className="w-full h-12 text-base"
              onClick={handleCharge}
              loading={createAndPayMut.isPending}
              disabled={inputAmount <= 0 && payments.length === 0}
            >
              {payments.length > 0
                ? `Add Payment (${formatCurrency(remaining)} left)`
                : `Pay & Print — ${formatCurrency(total)}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
