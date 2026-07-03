import type { NextFunction, Request, Response } from 'express';

import { requireSupabaseAdmin } from '../database/supabase.js';
import { AppError } from '../lib/errors.js';
import type { UserRole } from '../types/auth.js';

export const authenticate = async (
  request: Request,
  _response: Response,
  next: NextFunction,
) => {
  try {
    const header = request.header('Authorization');

    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, 'AUTH_REQUIRED', 'Authentication token is required.');
    }

    const token = header.slice('Bearer '.length);
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user?.email) {
      throw new AppError(401, 'INVALID_TOKEN', 'Authentication token is invalid or expired.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,status')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      throw new AppError(500, 'PROFILE_LOOKUP_FAILED', 'Unable to load user profile.');
    }

    request.user = {
      id: data.user.id,
      email: profile?.email ?? data.user.email,
      fullName: profile?.full_name ?? data.user.user_metadata.full_name ?? data.user.email,
      role: (profile?.role ?? data.user.user_metadata.role ?? 'operator') as UserRole,
      status: profile?.status === 'inactive' ? 'inactive' : 'active',
    };

    if (request.user.status !== 'active') {
      throw new AppError(403, 'USER_INACTIVE', 'User is inactive.');
    }

    next();
  } catch (error) {
    next(error);
  }
};
