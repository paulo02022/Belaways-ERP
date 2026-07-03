import { requireSupabaseAdmin } from '../../database/supabase.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export class UsersService {
  async list(): Promise<AuthenticatedUser[]> {
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,status')
      .order('full_name', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map((profile) => ({
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      status: profile.status,
    }));
  }
}

export const usersService = new UsersService();
