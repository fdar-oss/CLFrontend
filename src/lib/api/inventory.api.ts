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
    api.get<Recipe>(`/inventory/recipes/${menuItemId}`).then((r) => r.data),
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
};
