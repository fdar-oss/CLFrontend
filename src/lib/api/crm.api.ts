import api from './axios';
import type { Customer, Reservation } from '../types';

export const crmApi = {
  // Customers
  listCustomers: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<Customer[]>('/crm/customers', { params }).then((r) => r.data),
  getCustomer: (id: string) => api.get<Customer>(`/crm/customers/${id}`).then((r) => r.data),
  createCustomer: (data: Partial<Customer>) =>
    api.post<Customer>('/crm/customers', data).then((r) => r.data),
  updateCustomer: (id: string, data: Partial<Customer>) =>
    api.patch<Customer>(`/crm/customers/${id}`, data).then((r) => r.data),

  // Reservations
  listReservations: (params?: { branchId?: string; date?: string; status?: string }) =>
    api.get<Reservation[]>('/crm/reservations', { params }).then((r) => r.data),
  createReservation: (data: {
    branchId: string;
    date: string;
    time: string;
    partySize: number;
    customerId?: string;
    notes?: string;
  }) => api.post<Reservation>('/crm/reservations', data).then((r) => r.data),
  updateReservationStatus: (id: string, status: string, tableId?: string) =>
    api.patch(`/crm/reservations/${id}/status`, { status, tableId }).then((r) => r.data),

  // Feedback & Complaints
  getFeedback: (params?: { branchId?: string }) =>
    api.get('/crm/feedback', { params }).then((r) => r.data),
  getComplaints: (params?: { status?: string }) =>
    api.get('/crm/complaints', { params }).then((r) => r.data),
  resolveComplaint: (id: string, resolution: string) =>
    api.patch(`/crm/complaints/${id}/resolve`, { resolution }).then((r) => r.data),

  // Loyalty
  getLoyaltyProgram: () => api.get('/crm/loyalty/program').then((r) => r.data),
  updateLoyaltyProgram: (data: unknown) =>
    api.patch('/crm/loyalty/program', data).then((r) => r.data),
  getLoyaltyAccount: (customerId: string) =>
    api.get(`/crm/loyalty/account/${customerId}`).then((r) => r.data),
  redeemPoints: (customerId: string, points: number, orderId: string) =>
    api.post('/crm/loyalty/redeem', { customerId, points, orderId }).then((r) => r.data),
};
