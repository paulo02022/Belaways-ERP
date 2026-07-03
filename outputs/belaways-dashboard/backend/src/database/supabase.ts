import { createClient } from '@supabase/supabase-js';

import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export const hasSupabaseConfig = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

export const supabaseAdmin = hasSupabaseConfig
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export const requireSupabaseAdmin = () => {
  if (!supabaseAdmin) {
    throw new AppError(
      503,
      'SUPABASE_NOT_CONFIGURED',
      'Supabase is not configured for protected operations.',
    );
  }

  return supabaseAdmin;
};
