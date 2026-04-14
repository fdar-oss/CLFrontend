import api from './axios';

export const fbrApi = {
  registerTerminal: (data: { branchId: string; terminalId: string; terminalName?: string; posId?: string }) =>
    api.post('/fbr/terminals', data).then((r) => r.data),

  getTerminals: (branchId: string) =>
    api.get(`/fbr/terminals/${branchId}`).then((r) => r.data),

  submitInvoice: (orderId: string) =>
    api.post(`/fbr/submit/${orderId}`).then((r) => r.data),

  getSyncQueue: () => api.get('/fbr/sync-queue').then((r) => r.data),
};
