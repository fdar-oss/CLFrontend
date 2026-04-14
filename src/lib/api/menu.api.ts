import api from './axios';
import type { MenuCategory, MenuItem, ModifierGroup, TaxCategory, PosMenuCategory } from '../types';

export const menuApi = {
  // Categories
  listCategories: () => api.get<MenuCategory[]>('/menu/categories').then((r) => r.data),
  createCategory: (data: Partial<MenuCategory>) =>
    api.post<MenuCategory>('/menu/categories', data).then((r) => r.data),
  updateCategory: (id: string, data: Partial<MenuCategory>) =>
    api.patch<MenuCategory>(`/menu/categories/${id}`, data).then((r) => r.data),
  deleteCategory: (id: string) =>
    api.delete(`/menu/categories/${id}`).then((r) => r.data),

  // Items
  listItems: (params?: { categoryId?: string; branchId?: string }) =>
    api.get<MenuItem[]>('/menu/items', { params }).then((r) => r.data),
  getItem: (id: string) => api.get<MenuItem>(`/menu/items/${id}`).then((r) => r.data),
  createItem: (data: Partial<MenuItem> & { modifierGroupIds?: string[] }) =>
    api.post<MenuItem>('/menu/items', data).then((r) => r.data),
  updateItem: (id: string, data: Partial<MenuItem>) =>
    api.patch<MenuItem>(`/menu/items/${id}`, data).then((r) => r.data),
  deleteItem: (id: string) => api.delete(`/menu/items/${id}`).then((r) => r.data),
  setBranchPrice: (itemId: string, branchId: string, price: number, isAvailable?: boolean) =>
    api.patch(`/menu/items/${itemId}/branch-price/${branchId}`, { price, isAvailable }).then((r) => r.data),

  // Modifier Groups
  listModifierGroups: () =>
    api.get<ModifierGroup[]>('/menu/modifier-groups').then((r) => r.data),
  createModifierGroup: (data: Partial<ModifierGroup> & { modifiers?: unknown[] }) =>
    api.post<ModifierGroup>('/menu/modifier-groups', data).then((r) => r.data),

  // Tax categories
  listTaxCategories: () =>
    api.get<TaxCategory[]>('/menu/tax-categories').then((r) => r.data),
  createTaxCategory: (data: Partial<TaxCategory>) =>
    api.post<TaxCategory>('/menu/tax-categories', data).then((r) => r.data),

  // Image upload
  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.post<{ url: string }>('/menu/upload-image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },

  // POS-optimized full menu
  getPosMenu: (branchId: string) =>
    api.get<PosMenuCategory[]>(`/menu/pos/${branchId}`).then((r) => r.data),
};
