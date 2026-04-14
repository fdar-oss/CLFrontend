import api from './axios';
import type { Branch } from '../types';

export const branchesApi = {
  list: () => api.get<Branch[]>('/branches').then((r) => r.data),

  get: (id: string) => api.get<Branch>(`/branches/${id}`).then((r) => r.data),

  create: (data: Partial<Branch>) =>
    api.post<Branch>('/branches', data).then((r) => r.data),

  update: (id: string, data: Partial<Branch>) =>
    api.patch<Branch>(`/branches/${id}`, data).then((r) => r.data),

  deactivate: (id: string) =>
    api.patch(`/branches/${id}/deactivate`).then((r) => r.data),
};
