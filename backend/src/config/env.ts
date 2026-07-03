import { resolve } from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

for (const path of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')]) {
  dotenv.config({ path, quiet: true });
}

const envSchema = z.object({
  TINY_API_KEY: z.string().optional().default(''),
  SUPABASE_URL: z.string().url().optional().or(z.literal('')).default(''),
  SUPABASE_ANON_KEY: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  JWT_SECRET: z.string().min(24).optional().or(z.literal('')).default(''),
  CORS_ORIGINS: z.string().optional().default(''),
  VERCEL_URL: z.string().optional().default(''),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsedEnv = envSchema.parse(process.env);

const normalizeSupabaseUrl = (url: string) =>
  url
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '');

const productionRequired = [
  ['TINY_API_KEY', parsedEnv.TINY_API_KEY],
  ['SUPABASE_URL', parsedEnv.SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', parsedEnv.SUPABASE_SERVICE_ROLE_KEY],
  ['JWT_SECRET', parsedEnv.JWT_SECRET],
] as const;

if (parsedEnv.NODE_ENV === 'production') {
  const missing = productionRequired.filter(([, value]) => !value).map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
  }
}

export const env = {
  tinyApiKey: parsedEnv.TINY_API_KEY,
  tinyApiBaseUrl: 'https://api.tiny.com.br/api2',
  supabaseUrl: normalizeSupabaseUrl(parsedEnv.SUPABASE_URL),
  supabaseAnonKey: parsedEnv.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: parsedEnv.SUPABASE_SERVICE_ROLE_KEY,
  jwtSecret: parsedEnv.JWT_SECRET,
  corsOrigins: parsedEnv.CORS_ORIGINS,
  vercelUrl: parsedEnv.VERCEL_URL,
  port: parsedEnv.PORT,
  nodeEnv: parsedEnv.NODE_ENV,
  isProduction: parsedEnv.NODE_ENV === 'production',
};
