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

const getAccessToken = async () => {
  if (!supabase) {
    throw new Error('Supabase nao esta configurado para autenticar requisicoes reais.');
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    await supabase.auth.signOut({ scope: 'local' });
    throw new Error('Sua sessão expirou. Entre novamente para continuar.');
  }

  return session?.access_token;
};

export const apiRequest = async <T>(path: string, options: RequestOptions = {}) => {
  const accessToken = await getAccessToken();

  const response = await fetch(buildUrl(path, options.query), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

const fileNameFromDisposition = (header: string | null, fallback: string) => {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const quoted = header?.match(/filename="([^"]+)"/i)?.[1];

  try {
    return encoded ? decodeURIComponent(encoded) : (quoted ?? fallback);
  } catch {
    return fallback;
  }
};

const performApiFileDownload = async (path: string, fallbackFileName: string) => {
  const accessToken = await getAccessToken();
  const response = await fetch(buildUrl(path), {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });

  if (!response.ok) {
    let message = 'Falha ao baixar o arquivo.';
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      message = payload.error?.message ?? message;
    } catch {
      // The download endpoint may return a non-JSON gateway error.
    }
    throw new Error(message);
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = fileNameFromDisposition(
    response.headers.get('Content-Disposition'),
    fallbackFileName,
  );
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(blobUrl);
};

export const downloadApiFile = async (path: string, fallbackFileName: string) => {
  try {
    await performApiFileDownload(path, fallbackFileName);
  } catch (error) {
    window.alert(error instanceof Error ? error.message : 'Falha ao baixar o arquivo.');
  }
};
