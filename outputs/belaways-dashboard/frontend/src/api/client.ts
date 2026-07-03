import { supabase } from '@/lib/supabase';
import {
  mockAlerts,
  mockAuditLogs,
  mockDashboard,
  mockLogistics,
  mockOrders,
  mockPreferences,
  mockProducts,
  mockUsers,
} from '@/services/mock-data';
import type { UserPreferences } from '@/types/domain';

export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

type RequestOptions = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
};

const buildUrl = (path: string, query?: RequestOptions['query']) => {
  const url = new URL(path, window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });

  return `${url.pathname}${url.search}`;
};

const filterBySearch = <T>(items: T[], search: string | undefined, serializer: (item: T) => string) => {
  if (!search) return items;
  const normalized = search.toLowerCase();
  return items.filter((item) => serializer(item).toLowerCase().includes(normalized));
};

const mockResponse = async <T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> => {
  const url = new URL(buildUrl(path, options.query), window.location.origin);
  const pathname = url.pathname;
  const search = url.searchParams.get('search') ?? undefined;
  let data: unknown = null;
  let meta: Record<string, unknown> | undefined;

  if (pathname.endsWith('/dashboard')) data = mockDashboard;
  else if (pathname.endsWith('/products')) {
    const products = filterBySearch(mockProducts, search, (product) => `${product.name} ${product.sku}`);
    data = products;
    meta = { total: products.length, page: 1, pageSize: products.length, totalPages: 1 };
  } else if (pathname.includes('/products/')) {
    const id = pathname.split('/').at(-1);
    data = mockProducts.find((product) => product.id === id || product.sku === id) ?? mockProducts[0];
  } else if (pathname.endsWith('/orders')) {
    const orders = filterBySearch(mockOrders, search, (order) => `${order.number} ${order.customerName}`);
    data = orders;
    meta = { total: orders.length, page: 1, pageSize: orders.length, totalPages: 1 };
  } else if (pathname.includes('/orders/')) {
    const id = pathname.split('/').at(-1);
    data = mockOrders.find((order) => order.id === id || order.number === id) ?? mockOrders[0];
  } else if (pathname.endsWith('/alerts')) data = mockAlerts;
  else if (pathname.endsWith('/logistics')) data = mockLogistics;
  else if (pathname.endsWith('/audits')) data = mockAuditLogs;
  else if (pathname.endsWith('/users')) data = mockUsers;
  else if (pathname.endsWith('/preferences')) {
    data =
      options.method === 'PATCH' && options.body
        ? { ...mockPreferences, ...(JSON.parse(String(options.body)) as Partial<UserPreferences>) }
        : mockPreferences;
  }

  return { success: true, message: 'preview', data: data as T, meta };
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}) => {
  if (!supabase) return mockResponse<T>(path, options);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T> & {
    error?: { message: string; code: string };
  };

  if (!response.ok || !payload.success) {
    throw new Error(payload.error?.message ?? 'Falha ao processar solicitação.');
  }

  return payload;
};
