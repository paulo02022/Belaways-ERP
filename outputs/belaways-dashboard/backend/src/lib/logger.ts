import pino from 'pino';

import { env } from '../config/env.js';

export const logger = pino({
  level: env.isProduction ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.TINY_API_KEY',
      '*.SUPABASE_SERVICE_ROLE_KEY',
      '*.JWT_SECRET',
      'token',
      'apiKey',
      'password',
    ],
    censor: '[redacted]',
  },
  transport: env.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
        },
      },
});
