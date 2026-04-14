import api from './axios';

export const marketingApi = {
  // Segments
  listSegments: () => api.get('/marketing/segments').then((r) => r.data),
  createSegment: (data: unknown) => api.post('/marketing/segments', data).then((r) => r.data),
  calculateSegment: (id: string) =>
    api.post(`/marketing/segments/${id}/calculate`).then((r) => r.data),

  // Campaigns
  listCampaigns: () => api.get('/marketing/campaigns').then((r) => r.data),
  getCampaign: (id: string) => api.get(`/marketing/campaigns/${id}`).then((r) => r.data),
  createCampaign: (data: unknown) => api.post('/marketing/campaigns', data).then((r) => r.data),
  scheduleCampaign: (id: string, scheduledAt: string) =>
    api.post(`/marketing/campaigns/${id}/schedule`, { scheduledAt }).then((r) => r.data),
  sendCampaignNow: (id: string) =>
    api.post(`/marketing/campaigns/${id}/send`).then((r) => r.data),
  getCampaignStats: (id: string) =>
    api.get(`/marketing/campaigns/${id}/stats`).then((r) => r.data),

  // Templates
  listTemplates: () => api.get('/marketing/templates').then((r) => r.data),
  createTemplate: (data: unknown) => api.post('/marketing/templates', data).then((r) => r.data),

  // Channels
  getChannels: () => api.get('/marketing/channels').then((r) => r.data),
  saveChannel: (data: { type: string; name: string; config: Record<string, unknown> }) =>
    api.post('/marketing/channels', data).then((r) => r.data),

  // Automations
  listAutomations: () => api.get('/marketing/automations').then((r) => r.data),
  createAutomation: (data: unknown) =>
    api.post('/marketing/automations', data).then((r) => r.data),
  toggleAutomation: (id: string, isActive: boolean) =>
    api.patch(`/marketing/automations/${id}/toggle`, { isActive }).then((r) => r.data),
};
