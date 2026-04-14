'use client';

import { useState } from 'react';
import { usePosStore } from '@/lib/stores/pos.store';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils/format';
import { ShoppingCart, Plus, Minus, Trash2, ChevronDown } from 'lucide-react';
import { ORDER_TYPES, ORDER_TYPE_LABELS } from '@/lib/utils/constants';

interface CartPanelProps {
  onCheckout: () => void;
  tables?: { id: string; number: number; section: string | null; status: string }[];
}

function modKey(mods: { modifierId: string }[]): string {
  return mods.map((m) => m.modifierId).sort().join(',');
}

export function CartPanel({ onCheckout, tables = [] }: CartPanelProps) {
  const {
    cart, updateCartItemQty, removeFromCart,
    orderType, setOrderType,
    selectedTable, setSelectedTable,
    cartTotal, cartItemCount,
    clearCart,
  } = usePosStore();

  const [tableOpen, setTableOpen] = useState(false);

  const total = cartTotal();
  const count = cartItemCount();

  const availableTables = tables.filter((t) => t.status === 'AVAILABLE' || t.status === 'OCCUPIED');

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
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
            <ShoppingCart className="w-12 h-12" />
            <p className="text-sm">Cart is empty</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {cart.map((item) => {
              const key = modKey(item.modifiers);
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
        )}
      </div>

      {/* Footer / Checkout */}
      {cart.length > 0 && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500">Subtotal</span>
            <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
          </div>
          <Button className="w-full h-12 text-base font-semibold" onClick={onCheckout}>
            Charge {formatCurrency(total)}
          </Button>
        </div>
      )}
    </div>
  );
}
