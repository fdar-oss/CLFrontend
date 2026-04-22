import api from './axios';
import type { StockItem, StockBalance, StockMovement, StockLocation, Recipe } from '../types';

export const inventoryApi = {
  listItems: () => api.get<StockItem[]>('/inventory/stock-items').then((r) => r.data),
  createItem: (data: Partial<StockItem>) =>
    api.post<StockItem>('/inventory/stock-items', data).then((r) => r.data),
  updateItem: (id: string, data: Partial<StockItem>) =>
    api.patch<StockItem>(`/inventory/stock-items/${id}`, data).then((r) => r.data),

  getBalances: (locationId?: string) =>
    api.get<StockBalance[]>('/inventory/balances', { params: { locationId } }).then((r) => r.data),
  getLowStockAlerts: () => api.get<StockBalance[]>('/inventory/alerts/low-stock').then((r) => r.data),

  listMovements: (params?: Record<string, unknown>) =>
    api.get<StockMovement[]>('/inventory/movements', { params }).then((r) => r.data),
  recordMovement: (data: {
    stockItemId: string;
    locationId: string;
    type: string;
    quantity: number;
    unitCost?: number;
    notes?: string;
  }) => api.post('/inventory/movements', data).then((r) => r.data),

  getRecipe: (menuItemId: string) =>
    api.get<Recipe>(`/inventory/recipes/${menuItemId}`).then((r) => r.data).catch(() => null),
  upsertRecipe: (menuItemId: string, data: { ingredients: unknown[] }) =>
    api.post(`/inventory/recipes/${menuItemId}`, data).then((r) => r.data),

  submitStockCount: (locationId: string, counts: { stockItemId: string; counted: number }[]) =>
    api.post('/inventory/stock-count', { locationId, counts }).then((r) => r.data),

  listCategories: () => api.get('/inventory/categories').then((r) => r.data),
  createCategory: (name: string) =>
    api.post('/inventory/categories', { name }).then((r) => r.data),

  getLocations: (branchId: string) =>
    api.get<StockLocation[]>(`/inventory/locations/${branchId}`).then((r) => r.data),
  createLocation: (branchId: string, name: string, isDefault = false) =>
    api.post<StockLocation>('/inventory/locations', { branchId, name, isDefault }).then((r) => r.data),

  // Stock Batches (FIFO)
  getBatches: (stockItemId: string) =>
    api.get(`/inventory/stock-items/${stockItemId}/batches`).then((r) => r.data),
  addBatch: (stockItemId: string, data: { brandName: string; packSize: number; packUnit?: string; purchasePrice: number; supplier?: string; receivedDate: string; expiryDate?: string; notes?: string }) =>
    api.post(`/inventory/stock-items/${stockItemId}/batches`, data).then((r) => r.data),
  updateBatch: (id: string, data: any) =>
    api.patch(`/inventory/batches/${id}`, data).then((r) => r.data),
  deleteBatch: (id: string) =>
    api.delete(`/inventory/batches/${id}`).then((r) => r.data),

  // Cost Analysis
  getCostAnalysis: () => api.get('/inventory/cost-analysis').then((r) => r.data),

  // Packaging Rules
  listPackagingRules: () =>
    api.get('/inventory/packaging-rules').then((r) => r.data),
  createPackagingRule: (data: { stockItemId: string; orderType: string; itemType: string; sizeTag?: string; scope: string; quantity?: number }) =>
    api.post('/inventory/packaging-rules', data).then((r) => r.data),
  deletePackagingRule: (id: string) =>
    api.delete(`/inventory/packaging-rules/${id}`).then((r) => r.data),
};
