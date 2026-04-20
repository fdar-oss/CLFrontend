import api from './axios';
import type { User } from '../types';

export const usersApi = {
  list: () => api.get<User[]>('/users').then((r) => r.data),

  get: (id: string) => api.get<User>(`/users/${id}`).then((r) => r.data),

  create: (data: {
    email: string;
    fullName: string;
    password: string;
    role: string;
    phone?: string;
    branchId?: string;
  }) => api.post<User>('/users', data).then((r) => r.data),

  update: (id: string, data: Partial<User & { role: string; branchId: string }>) =>
    api.patch<User>(`/users/${id}`, data).then((r) => r.data),

  deactivate: (id: string) =>
    api.patch(`/users/${id}/deactivate`).then((r) => r.data),

  // Access Control
  getAllPermissions: () => api.get('/users/access-control').then((r) => r.data),
  getMyPermissions: () => api.get('/users/access-control/my').then((r) => r.data),
  updatePermissions: (role: string, data: { allowedRoutes: string[]; allowedFeatures: string[] }) =>
    api.patch(`/users/access-control/${role}`, data).then((r) => r.data),
};
