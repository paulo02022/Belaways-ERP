import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { previewUser } from '@/services/mock-data';
import type { AuthenticatedUser } from '@/types/domain';

type AuthContextValue = {
  user: AuthenticatedUser | null;
  session: Session | null;
  isLoading: boolean;
  isPreview: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  enterPreview: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const previewStorageKey = 'belaways.preview.enabled';

const mapSessionToUser = (session: Session | null): AuthenticatedUser | null => {
  const email = session?.user.email;
  if (!session?.user.id || !email) return null;

  return {
    id: session.user.id,
    email,
    fullName: session.user.user_metadata.full_name ?? email,
    role: (session.user.user_metadata.role ?? 'operator') as AuthenticatedUser['role'],
    status: 'active',
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [previewEnabled, setPreviewEnabled] = useState(
    () => localStorage.getItem(previewStorageKey) === 'true',
  );
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return undefined;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      localStorage.setItem(previewStorageKey, 'true');
      setPreviewEnabled(true);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const enterPreview = useCallback(() => {
    localStorage.setItem(previewStorageKey, 'true');
    setPreviewEnabled(true);
  }, []);

  const signOut = useCallback(async () => {
    localStorage.removeItem(previewStorageKey);
    setPreviewEnabled(false);
    if (supabase) await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = isSupabaseConfigured ? mapSessionToUser(session) : previewEnabled ? previewUser : null;

    return { user, session, isLoading, isPreview: !isSupabaseConfigured, signIn, enterPreview, signOut };
  }, [enterPreview, isLoading, previewEnabled, session, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};
