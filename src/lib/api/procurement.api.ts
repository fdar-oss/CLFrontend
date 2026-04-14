import api from './axios';
import type { Vendor, PurchaseOrder } from '../types';

export const procurementApi = {
  // Vendors
  listVendors: () => api.get<Vendor[]>('/procurement/vendors').then((r) => r.data),
  getVendor: (id: string) => api.get<Vendor>(`/procurement/vendors/${id}`).then((r) => r.data),
  createVendor: (data: Partial<Vendor>) =>
    api.post<Vendor>('/procurement/vendors', data).then((r) => r.data),
  updateVendor: (id: string, data: Partial<Vendor>) =>
    api.patch<Vendor>(`/procurement/vendors/${id}`, data).then((r) => r.data),

  // Purchase Orders
  listPOs: (params?: { branchId?: string; status?: string; vendorId?: string }) =>
    api.get<PurchaseOrder[]>('/procurement/purchase-orders', { params }).then((r) => r.data),
  getPO: (id: string) =>
    api.get<PurchaseOrder>(`/procurement/purchase-orders/${id}`).then((r) => r.data),
  createPO: (data: {
    vendorId: string;
    branchId: string;
    expectedDate?: string;
    notes?: string;
    lines: { stockItemId: string; quantity: number; unit: string; unitPrice: number; taxRate?: number }[];
  }) => api.post<PurchaseOrder>('/procurement/purchase-orders', data).then((r) => r.data),
  approvePO: (id: string) =>
    api.patch(`/procurement/purchase-orders/${id}/approve`).then((r) => r.data),

  // GRN
  receiveGoods: (data: {
    purchaseOrderId: string;
    locationId: string;
    notes?: string;
    lines: { stockItemId: string; orderedQty: number; receivedQty: number; unitCost: number; batchNumber?: string; expiryDate?: string }[];
  }) => api.post('/procurement/grn', data).then((r) => r.data),

  // Vendor Invoices & Payments
  listInvoices: (params?: { vendorId?: string; status?: string }) =>
    api.get('/procurement/vendor-invoices', { params }).then((r) => r.data),
  createInvoice: (data: unknown) =>
    api.post('/procurement/vendor-invoices', data).then((r) => r.data),
  recordPayment: (data: { invoiceId: string; amount: number; method: string; reference?: string }) =>
    api.post('/procurement/vendor-payments', data).then((r) => r.data),
};
