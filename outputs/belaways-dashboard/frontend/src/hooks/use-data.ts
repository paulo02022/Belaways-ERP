import { useQuery } from '@tanstack/react-query';

import { endpoints } from '@/api/endpoints';

export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: async () => (await endpoints.dashboard()).data });

export const useProducts = (search?: string) =>
  useQuery({
    queryKey: ['products', search],
    queryFn: async () => (await endpoints.products({ search })).data,
  });

export const useProduct = (id: string | undefined) =>
  useQuery({
    queryKey: ['product', id],
    enabled: Boolean(id),
    queryFn: async () => (await endpoints.product(id ?? '')).data,
  });

export const useOrders = (search?: string) =>
  useQuery({
    queryKey: ['orders', search],
    queryFn: async () => (await endpoints.orders({ search })).data,
  });

export const useOrder = (id: string | undefined) =>
  useQuery({
    queryKey: ['order', id],
    enabled: Boolean(id),
    queryFn: async () => (await endpoints.order(id ?? '')).data,
  });

export const useAlerts = () =>
  useQuery({ queryKey: ['alerts'], queryFn: async () => (await endpoints.alerts()).data });

export const useLogistics = () =>
  useQuery({ queryKey: ['logistics'], queryFn: async () => (await endpoints.logistics()).data });

export const useAudits = () =>
  useQuery({ queryKey: ['audits'], queryFn: async () => (await endpoints.audits()).data });

export const useUsers = () =>
  useQuery({ queryKey: ['users'], queryFn: async () => (await endpoints.users()).data });

export const usePreferences = () =>
  useQuery({ queryKey: ['preferences'], queryFn: async () => (await endpoints.preferences()).data });
