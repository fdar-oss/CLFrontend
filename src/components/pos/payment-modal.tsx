'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  // Order context — order is created here, not before
  branchId: string;
  orderType: string;
  tableId?: string;
  customerId?: string | null;
  cartItems: CartItem[];
  subtotal: number;
  onSuccess: () => void;
  onClose: () => void;
}

export function PaymentModal({
  branchId, orderType, tableId, customerId, cartItems, subtotal,
  onSuccess, onClose,
}: PaymentModalProps) {
  const clearCart = usePosStore((s) => s.clearCart);
  const qc = useQueryClient();

  const [method, setMethod] = useState<PayMethod>('CASH');
  const [amountStr, setAmountStr] = useState('');
  const [payments, setPayments] = useState<{ method: string; amount: number; reference?: string }[]>([]);
  const [reference, setReference] = useState('');
  const [done, setDone] = useState(false);
  const [change, setChange] = useState(0);

  // Live tax calculation based on selected method
  const taxRate = taxRateFor(method);
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const inputAmount = parseFloat(amountStr) || 0;

  // Update amount display when method (and thus total) changes
  function handleMethodChange(m: PayMethod) {
    setMethod(m);
    // Recalculate remaining with new tax
    const newTaxAmount = subtotal * taxRateFor(m);
    const newTotal = subtotal + newTaxAmount;
    const newRemaining = Math.max(0, newTotal - totalPaid);
    setAmountStr(payments.length === 0 ? newTotal.toFixed(2) : newRemaining.toFixed(2));
  }

  // Initialise amount display on first render
  useState(() => {
    setAmountStr(total.toFixed(2));
  });

  const createAndPayMut = useMutation({
    mutationFn: async () => {
      // Create order with payment method so backend uses correct tax rate
      const order = await posApi.createOrder({
        branchId,
        orderType,
        tableId,
        customerId: customerId || undefined,
        paymentMethod: method,
        items: cartItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers.map((m) => ({
            modifierId: m.modifierId,
            modifierName: m.modifierName,
            priceAdjustment: m.priceAdjustment,
          })),
        })),
      });

      // Process payment
      const paymentList = payments.length > 0
        ? payments
        : [{ method, amount: total }];
      await posApi.processPayment(order.id, paymentList);
      return order;
    },
    onSuccess: () => {
      toast.success('Payment processed!');
      const cashPaid = payments.filter((p) => p.method === 'CASH').reduce((s, p) => s + p.amount, 0);
      const effectiveCashPaid = payments.length === 0 && method === 'CASH' ? inputAmount : cashPaid;
      setChange(Math.max(0, effectiveCashPaid - total));
      setDone(true);
      clearCart();
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Payment failed'),
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
          <Button className="w-full h-12" onClick={onSuccess}>New Order</Button>
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

          {/* Summary — updates live when method changes */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-700">{formatCurrency(subtotal)}</span>
            </div>
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

              {/* Quick cash amounts */}
              {method === 'CASH' && (
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          {remaining === 0 ? (
            <Button className="w-full h-12 text-base" onClick={() => createAndPayMut.mutate()} loading={createAndPayMut.isPending}>
              Confirm Payment — {formatCurrency(total)}
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
                : `Charge ${formatCurrency(total)}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
