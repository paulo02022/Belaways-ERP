import type { CorsOptions } from 'cors';

import { env } from './env.js';

const developmentOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173'];
const productionOrigins = ['https://www.belaways.com.br'];

const configuredOrigins = env.corsOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const vercelOrigin = env.vercelUrl ? [`https://${env.vercelUrl}`] : [];

const allowedOrigins = env.isProduction
  ? [...new Set([...productionOrigins, ...vercelOrigin, ...configuredOrigins])]
  : [...new Set([...developmentOrigins, ...configuredOrigins])];

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin not allowed by CORS'));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  maxAge: 600,
};

export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  limit: env.isProduction ? 300 : 1200,
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
};
