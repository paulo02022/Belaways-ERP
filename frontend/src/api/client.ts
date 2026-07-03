import { supabase } from '@/lib/supabase';

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

export const apiRequest = async <T>(path: string, options: RequestOptions = {}) => {
  if (!supabase) {
    throw new Error('Supabase nao esta configurado para autenticar requisicoes reais.');
  }

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
