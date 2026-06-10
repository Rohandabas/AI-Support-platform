import axios from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL || '') + '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; businessName: string; website?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentConversations: () => api.get('/dashboard/recent-conversations'),
  getRecentTickets: () => api.get('/dashboard/recent-tickets'),
};

// Documents
export const documentsApi = {
  getAll: () => api.get('/documents'),
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/documents/${id}`),
  reindex: () => api.post('/documents/reindex'),
  getStatus: (id: string) => api.get(`/documents/${id}/status`),
};

// AI Config
export const aiConfigApi = {
  get: () => api.get('/ai-config'),
  update: (config: Record<string, unknown>) => api.put('/ai-config', config),
};

// Chat
export const chatApi = {
  sendMessage: (data: {
    message: string;
    sessionId: string;
    customerName?: string;
    customerEmail?: string;
  }, tenantId: string) =>
    axios.post(`${BASE_URL}/chat/message`, data, {
      headers: { 'x-tenant-id': tenantId },
    }),
  getSession: (sessionId: string, tenantId: string) =>
    axios.get(`${BASE_URL}/chat/session/${sessionId}`, {
      headers: { 'x-tenant-id': tenantId },
    }),
  getConfig: (tenantId: string) =>
    axios.get(`${BASE_URL}/chat/config`, {
      headers: { 'x-tenant-id': tenantId },
    }),
};

// Conversations
export const conversationsApi = {
  getAll: (params?: Record<string, string | number>) =>
    api.get('/conversations', { params }),
  getById: (id: string) => api.get(`/conversations/${id}`),
  updateStatus: (id: string, status: string) =>
    api.put(`/conversations/${id}/status`, { status }),
};

// Tickets
export const ticketsApi = {
  getAll: (params?: Record<string, string | number>) =>
    api.get('/tickets', { params }),
  getById: (id: string) => api.get(`/tickets/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/tickets/${id}`, data),
  create: (data: Record<string, unknown>) => api.post('/tickets', data),
};

// Escalations
export const escalationsApi = {
  getAll: (params?: Record<string, string | number>) =>
    api.get('/escalations', { params }),
  acknowledge: (id: string) => api.put(`/escalations/${id}/acknowledge`),
  resolve: (id: string, notes?: string) =>
    api.put(`/escalations/${id}/resolve`, { notes }),
};

// Analytics
export const analyticsApi = {
  get: (period?: number) => api.get('/analytics', { params: { period } }),
};

export default api;
