import { requireSupabaseAdmin } from '../../database/supabase.js';

export type UserPreferences = {
  theme: 'light' | 'dark' | 'system';
  lowStockThreshold: number;
  favoritePages: string[];
};

const defaultPreferences: UserPreferences = {
  theme: 'system',
  lowStockThreshold: 10,
  favoritePages: ['/dashboard', '/alerts'],
};

export class PreferencesService {
  async get(userId: string): Promise<UserPreferences> {
    const supabase = requireSupabaseAdmin();
    const { data, error } = await supabase
      .from('user_preferences')
      .select('preferences')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return {
      ...defaultPreferences,
      ...(data?.preferences as Partial<UserPreferences> | null),
    };
  }

  async update(userId: string, preferences: Partial<UserPreferences>) {
    const supabase = requireSupabaseAdmin();
    const current = await this.get(userId);
    const next = { ...current, ...preferences };

    const { error } = await supabase.from('user_preferences').upsert({
      user_id: userId,
      preferences: next,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return next;
  }
}

export const preferencesService = new PreferencesService();
