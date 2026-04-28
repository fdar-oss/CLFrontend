'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePosStore } from '@/lib/stores/pos.store';
import { useAuthStore } from '@/lib/stores/auth.store';
import { usersApi } from '@/lib/api/users.api';
import { posApi } from '@/lib/api/pos.api';
import { Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { ShoppingCart, Plus, Minus, Trash2, ChevronDown, User as UserIcon, Percent, X, Package } from 'lucide-react';
import { ORDER_TYPES, ORDER_TYPE_LABELS } from '@/lib/utils/constants';

interface CartPanelProps {
  onCheckout: () => void;
  onSendOrder?: () => void;
  onPreBill?: () => void;
  sendingOrder?: boolean;
  tables?: { id: string; number: number; section: string | null; status: string }[];
}

const STAFF_ROLES = new Set(['WAITER', 'CASHIER', 'MANAGER', 'TENANT_OWNER']);

function modKey(item: { modifiers: { modifierId: string }[]; variantId?: string }): string {
  const mk = item.modifiers.map((m) => m.modifierId).sort().join(',');
  return item.variantId ? `v:${item.variantId}|${mk}` : mk;
}

export function CartPanel({ onCheckout, onSendOrder, onPreBill, sendingOrder, tables = [] }: CartPanelProps) {
  const {
    cart, updateCartItemQty, removeFromCart,
    orderType, setOrderType,
    selectedTable, setSelectedTable,
    servedById, setServedById,
    currentOrderId, setCurrentOrderId,
    discount, setDiscount,
    orderTakerId, setOrderTakerId,
    needsPackaging, setNeedsPackaging,
    needsFoodPackaging, setNeedsFoodPackaging,
    cartTotal, cartItemCount,
    clearCart,
  } = usePosStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'TENANT_OWNER';

  const [tableOpen, setTableOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [takerOpen, setTakerOpen] = useState(false);

  const { data: orderTakers = [] } = useQuery({
    queryKey: ['order-takers'],
    queryFn: posApi.listOrderTakers,
  });
  const selectedTaker = (orderTakers as any[]).find((t: any) => t.id === orderTakerId);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discType, setDiscType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [discValue, setDiscValue] = useState('');
  const [discReason, setDiscReason] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });
  const staff = users.filter((u) => u.isActive && STAFF_ROLES.has(u.role));
  const selectedStaff = staff.find((s) => s.id === servedById);

  // When a parked order is active, fetch it so we can display its real subtotal/items
  const { data: parkedOrder } = useQuery({
    queryKey: ['order-detail', currentOrderId],
    queryFn: () => posApi.getOrder(currentOrderId!),
    enabled: !!currentOrderId,
  });

  const cartSub = cartTotal();
  const cartCount = cartItemCount();
  // Parked order subtotal and item count take precedence when active
  const subtotal = currentOrderId ? Number(parkedOrder?.subtotal ?? 0) : cartSub;
  const count = currentOrderId
    ? (parkedOrder?.orderItems || []).reduce((s, it: any) => s + it.quantity, 0)
    : cartCount;
  const parkedItems = parkedOrder?.orderItems || [];

  const availableTables = tables.filter((t) => t.status === 'AVAILABLE' || t.status === 'OCCUPIED');

  function handleCheckout() {
    if (cart.length === 0 && !currentOrderId) { toast.error('Cart is empty'); return; }
    if (!currentOrderId) {
      if (orderType === 'DINE_IN' && !selectedTable) { toast.error('Please pick a table for dine-in'); return; }
      if (!servedById) { toast.error('Please pick the staff member serving this order'); return; }
    }
    onCheckout();
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            <span className="font-bold text-gray-900">Order</span>
            {count > 0 && (
              <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                {count}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Clear
            </button>
          )}
        </div>

        {/* Order Type */}
        <div className="flex gap-1.5 flex-wrap">
          {ORDER_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => { setOrderType(type); if (type !== 'DINE_IN') setSelectedTable(null); }}
              className={`
                px-3 py-1 rounded-lg text-xs font-medium transition-all
                ${orderType === type
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              {ORDER_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {/* Staff Selector */}
        <div className="mt-2 relative">
          <button
            type="button"
            onClick={() => setStaffOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl text-sm hover:border-brand-400 transition-colors"
          >
            <span className="flex items-center gap-2">
              <UserIcon className="w-3.5 h-3.5 text-gray-400" />
              <span className={selectedStaff ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                {selectedStaff ? `Served by ${selectedStaff.fullName.split(' ')[0]}` : 'Pick staff serving…'}
              </span>
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {staffOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto">
              {staff.length === 0 && <div className="px-3 py-2 text-sm text-gray-400">No staff at this branch</div>}
              {staff.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setServedById(s.id); setStaffOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
                >
                  <span className="font-medium">{s.fullName}</span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">{s.role.replace(/_/g, ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table Selector (Dine-in only) */}
        {orderType === 'DINE_IN' && (
          <div className="mt-2 relative">
            <button
              type="button"
              onClick={() => setTableOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl text-sm hover:border-brand-400 transition-colors"
            >
              <span className={selectedTable ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                {selectedTable ? `Table ${selectedTable.number}${selectedTable.section ? ` — ${selectedTable.section}` : ''}` : 'Select table…'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {tableOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-40 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => { setSelectedTable(null); setTableOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50"
                >
                  No table
                </button>
                {availableTables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setSelectedTable({ id: t.id, number: t.number, section: t.section, status: t.status, branchId: '', isActive: true, capacity: 0 });
                      setTableOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between"
                  >
                    <span>Table {t.number}{t.section ? ` — ${t.section}` : ''}</span>
                    <span className={`text-xs ${t.status === 'AVAILABLE' ? 'text-green-600' : 'text-orange-600'}`}>{t.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Takeaway packaging toggles (dine-in only) */}
        {orderType === 'DINE_IN' && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setNeedsPackaging(!needsPackaging)}
              className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                needsPackaging
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Takeaway Cup
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${needsPackaging ? 'bg-amber-200 text-amber-900' : 'bg-gray-200 text-gray-500'}`}>
                {needsPackaging ? 'Yes' : 'No'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setNeedsFoodPackaging(!needsFoodPackaging)}
              className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                needsFoodPackaging
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                Takeaway Pack
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${needsFoodPackaging ? 'bg-amber-200 text-amber-900' : 'bg-gray-200 text-gray-500'}`}>
                {needsFoodPackaging ? 'Yes' : 'No'}
              </span>
            </button>
          </div>
        )}

        {/* Order Taker (optional) */}
        {(orderTakers as any[]).length > 0 && (
          <div className="mt-2 relative">
            <button
              type="button"
              onClick={() => setTakerOpen((o) => !o)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl text-sm hover:border-brand-400 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                <span className={selectedTaker ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                  {selectedTaker ? `Order Taker: ${selectedTaker.fullName}` : 'Direct order (no taker)'}
                </span>
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {takerOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-30 max-h-40 overflow-y-auto">
                <button type="button" onClick={() => { setOrderTakerId(null); setTakerOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50">Direct (no order taker)</button>
                {(orderTakers as any[]).map((t: any) => (
                  <button key={t.id} type="button" onClick={() => { setOrderTakerId(t.id); setTakerOpen(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between">
                    <span className="font-medium">{t.fullName}</span>
                    <span className="text-xs text-gray-400">{Number(t.commissionRate || 10)}%</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {/* Parked-order items (read-only) */}
        {currentOrderId && parkedItems.length > 0 && (
          <div className="divide-y divide-gray-50 bg-amber-50/30">
            {parkedItems.map((item: any) => {
              const modSum = (item.modifiers || []).reduce((s: number, m: any) => s + Number(m.priceAdjustment || 0), 0);
              const linePrice = (Number(item.unitPrice) + modSum) * item.quantity;
              return (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        <span className="text-brand-700 mr-1.5">{item.quantity}×</span>
                        {item.itemName}
                      </p>
                      {item.modifiers && item.modifiers.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {item.modifiers.map((m: any) => m.modifierName).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-orange-500 mt-0.5 italic truncate">"{item.notes}"</p>
                      )}
                      <p className="text-xs text-brand-700 font-medium mt-0.5">
                        {formatCurrency(Number(item.unitPrice) + modSum)} each
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(linePrice)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!currentOrderId && cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
            <ShoppingCart className="w-12 h-12" />
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : !currentOrderId ? (
          <div className="divide-y divide-gray-50">
            {cart.map((item) => {
              const key = modKey(item);
              const modTotal = item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0);
              const linePrice = (item.unitPrice + modTotal) * item.quantity;

              return (
                <div key={`${item.menuItemId}-${key}`} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{item.itemName}</p>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {item.modifiers.map((m) => m.modifierName).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-orange-500 mt-0.5 italic truncate">"{item.notes}"</p>
                      )}
                      <p className="text-xs text-brand-700 font-medium mt-0.5">
                        {formatCurrency(item.unitPrice + modTotal)} each
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(linePrice)}</p>
                    </div>
                  </div>

                  {/* Qty Controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => updateCartItemQty(item.menuItemId, key, -1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-red-300 hover:text-red-500 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartItemQty(item.menuItemId, key, 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:border-brand-400 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.menuItemId, key)}
                      className="ml-auto p-1 text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Active order banner */}
      {currentOrderId && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-amber-800">
              {parkedOrder?.orderNumber || 'Active Order'} · Sent to kitchen
            </span>
            <button
              onClick={() => { setCurrentOrderId(null); clearCart(); }}
              className="text-amber-600 hover:text-amber-800 underline"
            >
              New customer
            </button>
          </div>
        </div>
      )}

      {/* Footer / Checkout */}
      {(cart.length > 0 || currentOrderId) && (() => {
        const discountAmt = discount
          ? discount.type === 'PERCENT' ? (subtotal * discount.value) / 100 : discount.value
          : 0;
        const afterDiscount = Math.max(0, subtotal - discountAmt);

        return (
        <div className="p-4 border-t border-gray-100 space-y-2">
          {/* Subtotal + Discount */}
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className={`font-bold text-base ${discount ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{formatCurrency(subtotal)}</span>
            </div>
            {discount && (
              <>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    {discount.type === 'PERCENT' ? `${discount.value}% off` : `₨${discount.value} off`}
                    <span className="text-[10px] text-gray-400 ml-1">({discount.reason})</span>
                  </span>
                  <span className="text-sm font-medium text-green-600">−{formatCurrency(discountAmt)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-semibold text-gray-900">After Discount</span>
                  <span className="font-bold text-gray-900 text-base">{formatCurrency(afterDiscount)}</span>
                </div>
              </>
            )}
            <p className="text-[10px] text-gray-400 mt-0.5">
              GST added at checkout — depends on payment method
            </p>
          </div>

          {/* Discount button — admin only */}
          {isAdmin && !discount && subtotal > 0 && (
            <button
              onClick={() => setDiscountOpen(true)}
              className="w-full text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center justify-center gap-1 py-1.5"
            >
              <Percent className="w-3 h-3" /> Apply Discount
            </button>
          )}
          {discount && (
            <button
              onClick={() => setDiscount(null)}
              className="w-full text-xs text-red-500 hover:text-red-700 font-medium flex items-center justify-center gap-1 py-1.5"
            >
              <X className="w-3 h-3" /> Remove Discount
            </button>
          )}

          {/* Discount modal */}
          {discountOpen && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">Apply Discount</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDiscType('PERCENT')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${discType === 'PERCENT' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}
                >
                  % Percentage
                </button>
                <button
                  onClick={() => setDiscType('FLAT')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${discType === 'FLAT' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}
                >
                  ₨ Flat Amount
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                value={discValue}
                onChange={(e) => setDiscValue(e.target.value)}
                placeholder={discType === 'PERCENT' ? 'e.g. 10' : 'e.g. 100'}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <select
                value={discReason}
                onChange={(e) => setDiscReason(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select reason…</option>
                <option value="Staff Meal">Staff Meal</option>
                <option value="Manager Discount">Manager Discount</option>
                <option value="Owner Complimentary">Owner Complimentary</option>
                <option value="Customer Complaint">Customer Complaint</option>
                <option value="Promo / Marketing">Promo / Marketing</option>
                <option value="Loyalty Reward">Loyalty Reward</option>
                <option value="Other">Other</option>
              </select>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setDiscountOpen(false); setDiscValue(''); setDiscReason(''); }}>Cancel</Button>
                <Button size="sm" className="flex-1" onClick={() => {
                  const val = parseFloat(discValue);
                  if (!val || val <= 0) { toast.error('Enter a valid amount'); return; }
                  if (!discReason) { toast.error('Select a reason'); return; }
                  if (discType === 'PERCENT' && val > 100) { toast.error('Percentage cannot exceed 100'); return; }
                  if (discType === 'FLAT' && val > subtotal) { toast.error('Discount exceeds subtotal'); return; }
                  setDiscount({ type: discType, value: val, reason: discReason });
                  setDiscountOpen(false);
                  setDiscValue('');
                  setDiscReason('');
                  toast.success(`Discount applied: ${discType === 'PERCENT' ? `${val}%` : `₨${val}`} — ${discReason}`);
                }}>Apply</Button>
              </div>
            </div>
          )}

          {!currentOrderId && onSendOrder && cart.length > 0 && (
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={onSendOrder}
              loading={sendingOrder}
            >
              Send to Kitchen — Park & pay later
            </Button>
          )}

          {currentOrderId && onPreBill && (
            <Button variant="outline" className="w-full h-11" onClick={onPreBill}>
              Print Pre-Bill
            </Button>
          )}

          <Button className="w-full h-12 text-base font-semibold" onClick={handleCheckout}>
            {currentOrderId ? `Charge — ${formatCurrency(afterDiscount)} + GST` : `Pay Now — ${formatCurrency(afterDiscount)} + GST`}
          </Button>

          {!currentOrderId && cart.length > 0 && (
            <p className="text-[11px] text-gray-400 text-center mt-1">
              Take-away or quick sale? Use <span className="font-semibold">Pay Now</span> to skip the kitchen-ticket step.
            </p>
          )}
        </div>
        );
      })()}
    </div>
  );
}
