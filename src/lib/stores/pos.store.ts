'use client';

import { create } from 'zustand';
import type { PosShift, RestaurantTable } from '../types';

export interface CartItem {
  menuItemId: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  modifiers: { modifierId: string; modifierName: string; priceAdjustment: number }[];
}

interface PosState {
  // Shift
  activeShift: PosShift | null;
  setActiveShift: (shift: PosShift | null) => void;

  // Order context
  orderType: string;
  selectedTable: RestaurantTable | null;
  customerId: string | null;
  setOrderType: (type: string) => void;
  setSelectedTable: (table: RestaurantTable | null) => void;
  setCustomerId: (id: string | null) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  updateCartItemQty: (menuItemId: string, modifierKey: string, delta: number) => void;
  removeFromCart: (menuItemId: string, modifierKey: string) => void;
  clearCart: () => void;

  // Derived
  cartTotal: () => number;
  cartItemCount: () => number;
}

function modifierKey(item: CartItem): string {
  return item.modifiers.map((m) => m.modifierId).sort().join(',');
}

export const usePosStore = create<PosState>((set, get) => ({
  activeShift: null,
  setActiveShift: (shift) => set({ activeShift: shift }),

  orderType: 'DINE_IN',
  selectedTable: null,
  customerId: null,
  setOrderType: (orderType) => set({ orderType }),
  setSelectedTable: (selectedTable) => set({ selectedTable }),
  setCustomerId: (customerId) => set({ customerId }),

  cart: [],

  addToCart: (item) => {
    const key = modifierKey(item);
    set((state) => {
      const existing = state.cart.find(
        (c) => c.menuItemId === item.menuItemId && modifierKey(c) === key,
      );
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c.menuItemId === item.menuItemId && modifierKey(c) === key
              ? { ...c, quantity: c.quantity + item.quantity }
              : c,
          ),
        };
      }
      return { cart: [...state.cart, item] };
    });
  },

  updateCartItemQty: (menuItemId, mKey, delta) => {
    set((state) => {
      const updated = state.cart
        .map((c) =>
          c.menuItemId === menuItemId && modifierKey(c) === mKey
            ? { ...c, quantity: c.quantity + delta }
            : c,
        )
        .filter((c) => c.quantity > 0);
      return { cart: updated };
    });
  },

  removeFromCart: (menuItemId, mKey) => {
    set((state) => ({
      cart: state.cart.filter(
        (c) => !(c.menuItemId === menuItemId && modifierKey(c) === mKey),
      ),
    }));
  },

  clearCart: () =>
    set({ cart: [], selectedTable: null, customerId: null, orderType: 'DINE_IN' }),

  cartTotal: () => {
    const { cart } = get();
    return cart.reduce((sum, item) => {
      const modTotal = item.modifiers.reduce((s, m) => s + m.priceAdjustment, 0);
      return sum + (item.unitPrice + modTotal) * item.quantity;
    }, 0);
  },

  cartItemCount: () => get().cart.reduce((sum, item) => sum + item.quantity, 0),
}));
