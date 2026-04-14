import api from './axios';
import type { LoginResponse, User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password, deviceInfo: 'web' }).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  refresh: () => api.post<{ accessToken: string }>('/auth/refresh').then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }).then((r) => r.data),
};
