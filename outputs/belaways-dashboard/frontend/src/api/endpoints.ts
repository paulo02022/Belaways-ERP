import { apiRequest } from '@/api/client';
import type {
  Alert,
  AuditLog,
  AuthenticatedUser,
  DashboardOverview,
  LogisticsOccurrence,
  Order,
  Product,
  UserPreferences,
} from '@/types/domain';

export const endpoints = {
  dashboard: () => apiRequest<DashboardOverview>('/api/dashboard'),
  products: (query?: { search?: string; page?: number; stock?: string }) =>
    apiRequest<Product[]>('/api/products', { query }),
  product: (id: string) => apiRequest<Product>(`/api/products/${id}`),
  orders: (query?: { search?: string; page?: number; status?: string }) =>
    apiRequest<Order[]>('/api/orders', { query }),
  order: (id: string) => apiRequest<Order>(`/api/orders/${id}`),
  alerts: () => apiRequest<Alert[]>('/api/alerts'),
  updateAlert: (id: string, status: Alert['status']) =>
    apiRequest<{ id: string; status: Alert['status']; updatedAt: string }>(`/api/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  logistics: () => apiRequest<LogisticsOccurrence[]>('/api/logistics'),
  audits: () => apiRequest<AuditLog[]>('/api/audits'),
  users: () => apiRequest<AuthenticatedUser[]>('/api/users'),
  preferences: () => apiRequest<UserPreferences>('/api/preferences'),
  updatePreferences: (preferences: Partial<UserPreferences>) =>
    apiRequest<UserPreferences>('/api/preferences', {
      method: 'PATCH',
      body: JSON.stringify(preferences),
    }),
};
