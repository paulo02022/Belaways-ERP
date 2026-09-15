import { useEffect } from 'react';

import { endpoints } from '@/api/endpoints';
import { automaticRefreshIntervalMs } from '@/constants/refresh';
import { useAuth } from '@/hooks/use-auth';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';

const autoSyncRoles = new Set(['owner', 'admin', 'manager']);
const syncAttemptKey = 'belaways:last-catalog-sync-attempt';

const refreshCatalogQueries = () =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['products'] }),
    queryClient.invalidateQueries({ queryKey: ['products-summary'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  ]);

export const useCatalogLive = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!supabase) return undefined;
    const client = supabase;

    const channel = client
      .channel('product-cache-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_cache' },
        () => void refreshCatalogQueries(),
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!user || !autoSyncRoles.has(user.role)) return undefined;

    let running = false;
    const synchronize = async () => {
      if (running || document.visibilityState === 'hidden') return;
      const lastAttempt = Number(localStorage.getItem(syncAttemptKey) ?? 0);
      if (Date.now() - lastAttempt < automaticRefreshIntervalMs - 5_000) return;

      running = true;
      localStorage.setItem(syncAttemptKey, String(Date.now()));
      try {
        await endpoints.syncProducts('incremental');
        await refreshCatalogQueries();
      } catch {
        // Manual synchronization remains available when the Tiny real-time extension is unavailable.
      } finally {
        running = false;
      }
    };

    void synchronize();
    const interval = window.setInterval(() => void synchronize(), automaticRefreshIntervalMs);
    const onVisibility = () => void synchronize();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user]);
};
