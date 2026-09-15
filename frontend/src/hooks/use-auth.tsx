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

import { supabase } from '@/lib/supabase';
import type { AuthenticatedUser } from '@/types/domain';

type AuthContextValue = {
  user: AuthenticatedUser | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return undefined;
    }
    const client = supabase;

    let mounted = true;
    client.auth.getSession().then(async ({ data, error }) => {
      if (mounted) {
        if (error) {
          await client.auth.signOut({ scope: 'local' });
          setSession(null);
        } else {
          setSession(data.session);
        }
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
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
      throw new Error('Supabase nao esta configurado. Verifique o .env do projeto.');
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = mapSessionToUser(session);

    return { user, session, isLoading, signIn, signOut };
  }, [isLoading, session, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};
