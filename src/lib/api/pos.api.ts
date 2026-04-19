import api from './axios';
import type { PosOrder, PosShift, RestaurantTable } from '../types';

export const posApi = {
  // Shifts
  openShift: (branchId: string, openingFloat: number) =>
    api.post<PosShift>('/pos/shifts/open', { branchId, openingFloat }).then((r) => r.data),
  closeShift: (shiftId: string, closingCash: number, notes?: string) =>
    api.post<PosShift>(`/pos/shifts/${shiftId}/close`, { closingCash, notes }).then((r) => r.data),
  getActiveShift: (branchId: string) =>
    api.get<PosShift>('/pos/shifts/active', { params: { branchId } }).then((r) => r.data),
  addCashMovement: (shiftId: string, type: string, amount: number, reason: string) =>
    api.post(`/pos/shifts/${shiftId}/cash-movement`, { type, amount, reason }).then((r) => r.data),

  // Orders
  createOrder: (data: {
    branchId: string;
    orderType: string;
    tableId?: string;
    customerId?: string;
    servedById?: string;
    notes?: string;
    paymentMethod?: string;
    items: { menuItemId: string; quantity: number; notes?: string; modifiers?: unknown[] }[];
  }) => api.post<PosOrder>('/pos/orders', data).then((r) => r.data),

  listOrders: (branchId: string, params?: Record<string, unknown>) =>
    api.get<PosOrder[]>('/pos/orders', { params: { branchId, ...params } }).then((r) => r.data),

  getOrder: (id: string) => api.get<PosOrder>(`/pos/orders/${id}`).then((r) => r.data),

  updateOrderStatus: (id: string, status: string) =>
    api.patch(`/pos/orders/${id}/status`, { status }).then((r) => r.data),

  processPayment: (
    orderId: string,
    payments: { method: string; amount: number; reference?: string }[],
    customerLeft = true,
    paymentMethod?: string,
    customer?: { fullName?: string; phone?: string; email?: string; optInEmail?: boolean },
  ) => api.post(`/pos/orders/${orderId}/payment`, { payments, customerLeft, paymentMethod, customer }).then((r) => r.data),

  processRefund: (orderId: string, amount: number, reason: string, method: string) =>
    api.post(`/pos/orders/${orderId}/refund`, { amount, reason, method }).then((r) => r.data),

  // Tables
  listTables: (branchId: string) =>
    api.get<RestaurantTable[]>('/pos/tables', { params: { branchId } }).then((r) => r.data),
  createTable: (branchId: string, data: { number: number; section?: string; capacity?: number }) =>
    api.post<RestaurantTable>('/pos/tables', { branchId, ...data }).then((r) => r.data),
  updateTableStatus: (tableId: string, branchId: string, status: string) =>
    api.patch(`/pos/tables/${tableId}/status`, { status, branchId }).then((r) => r.data),
};
