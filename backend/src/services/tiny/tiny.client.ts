import axios, { AxiosError } from 'axios';

import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

type TinyResponse<T> = {
  retorno?: {
    status?: string;
    codigo_erro?: number;
    erros?: Array<{ erro: string }>;
  } & T;
};

const retryableStatusCodes = new Set([408, 429, 500, 502, 503, 504]);

const wait = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export class TinyClient {
  private readonly client = axios.create({
    baseURL: env.tinyApiBaseUrl,
    timeout: 15000,
  });

  async post<T extends Record<string, unknown>>(
    endpoint: string,
    payload: Record<string, string | number | undefined> = {},
  ): Promise<T> {
    if (!env.tinyApiKey) {
      throw new AppError(503, 'TINY_NOT_CONFIGURED', 'Tiny API key is not configured.');
    }

    const body = new URLSearchParams({
      token: env.tinyApiKey,
      formato: 'json',
    });

    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        body.set(key, String(value));
      }
    });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const response = await this.client.post<TinyResponse<T>>(endpoint, body, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });

        const retorno = response.data.retorno;

        if (!retorno) {
          throw new AppError(502, 'TINY_INVALID_RESPONSE', 'Tiny returned an invalid response.');
        }

        if (retorno.status === 'Erro') {
          const message =
            retorno.erros?.map((item) => item.erro).join('; ') ?? 'Tiny returned an error.';
          const statusCode = retorno.codigo_erro === 2 ? 401 : 502;
          throw new AppError(statusCode, 'TINY_API_ERROR', message, retorno.erros);
        }

        return retorno as T;
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        const canRetry =
          attempt < 3 && (!status || retryableStatusCodes.has(status) || axiosError.code === 'ECONNABORTED');

        if (!canRetry || error instanceof AppError) {
          if (error instanceof AppError) {
            throw error;
          }

          logger.error({ error, endpoint }, 'Tiny request failed');
          throw new AppError(502, 'TINY_REQUEST_FAILED', 'Unable to communicate with Tiny.');
        }

        logger.warn({ attempt, endpoint, status }, 'Retrying Tiny request');
        await wait(350 * attempt);
      }
    }

    throw new AppError(502, 'TINY_REQUEST_FAILED', 'Unable to communicate with Tiny.');
  }
}

export const tinyClient = new TinyClient();
