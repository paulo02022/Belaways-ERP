import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { endpoints } from '@/api/endpoints';
import { automaticRefreshIntervalMs } from '@/constants/refresh';
import { queryClient } from '@/lib/query-client';

export type ProductFilters = {
  search?: string;
  page: number;
  pageSize: number;
  stock: 'all' | 'low' | 'out';
  status: 'active' | 'inactive' | 'all';
  sort: 'name' | 'updated' | 'stock' | 'price';
  order: 'asc' | 'desc';
};

export const useDashboard = () =>
  useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await endpoints.dashboard()).data,
    refetchInterval: automaticRefreshIntervalMs,
    refetchOnWindowFocus: true,
  });

export const useProducts = (filters: ProductFilters) =>
  useQuery({
    queryKey: ['products', filters],
    queryFn: async () => endpoints.products(filters),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: automaticRefreshIntervalMs,
    refetchOnWindowFocus: true,
  });

export const useProductsSummary = (status: ProductFilters['status']) =>
  useQuery({
    queryKey: ['products-summary', status],
    queryFn: async () => (await endpoints.productsSummary(status)).data,
    staleTime: 30_000,
    refetchInterval: automaticRefreshIntervalMs,
    refetchOnWindowFocus: true,
  });

export const useProduct = (id: string | undefined) =>
  useQuery({
    queryKey: ['product', id],
    enabled: Boolean(id),
    queryFn: async () => (await endpoints.product(id ?? '')).data,
  });

export const useOrders = (filters: { search?: string; days?: number }) =>
  useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => (await endpoints.orders({ ...filters, pageSize: 100 })).data,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: automaticRefreshIntervalMs,
    refetchOnWindowFocus: true,
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

export const useSyncProducts = () =>
  useMutation({
    mutationFn: async (mode: 'incremental' | 'full' = 'incremental') =>
      (await endpoints.syncProducts(mode)).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['products-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
