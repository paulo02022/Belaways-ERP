import { requireSupabaseAdmin } from '../../database/supabase.js';
import type { AuthenticatedUser, UserRole } from '../../types/auth.js';

type ManagedRole = Exclude<UserRole, 'owner'>;

type CreateUserInput = {
  email: string;
  password: string;
  fullName: string;
  role: ManagedRole;
};

type UpdateUserInput = Partial<{
  email: string;
  password: string;
  fullName: string;
  role: ManagedRole;
  status: 'active' | 'inactive';
}>;

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

  async create(input: CreateUserInput): Promise<AuthenticatedUser> {
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
        role: input.role,
      },
    });

    if (error || !data.user?.id) {
      throw error ?? new Error('Unable to create user.');
    }

    const profile = {
      id: data.user.id,
      email: input.email,
      full_name: input.fullName,
      role: input.role,
      status: 'active',
    };

    const { error: profileError } = await supabase.from('profiles').upsert(profile);

    if (profileError) {
      throw profileError;
    }

    return {
      id: data.user.id,
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      status: 'active',
    };
  }

  async update(id: string, input: UpdateUserInput): Promise<AuthenticatedUser> {
    const supabase = requireSupabaseAdmin();
    const authUpdate: {
      email?: string;
      password?: string;
      user_metadata?: Record<string, string>;
    } = {};

    if (input.email) authUpdate.email = input.email;
    if (input.password) authUpdate.password = input.password;
    if (input.fullName || input.role) {
      authUpdate.user_metadata = {
        ...(input.fullName ? { full_name: input.fullName } : {}),
        ...(input.role ? { role: input.role } : {}),
      };
    }

    if (Object.keys(authUpdate).length > 0) {
      const { error } = await supabase.auth.admin.updateUserById(id, authUpdate);
      if (error) throw error;
    }

    const profileUpdate: Record<string, string> = {};
    if (input.email) profileUpdate.email = input.email;
    if (input.fullName) profileUpdate.full_name = input.fullName;
    if (input.role) profileUpdate.role = input.role;
    if (input.status) profileUpdate.status = input.status;

    if (Object.keys(profileUpdate).length > 0) {
      const { error } = await supabase.from('profiles').update(profileUpdate).eq('id', id);
      if (error) throw error;
    }

    const { data: profile, error: loadError } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,status')
      .eq('id', id)
      .single();

    if (loadError) throw loadError;

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      status: profile.status,
    };
  }
}

export const usersService = new UsersService();
