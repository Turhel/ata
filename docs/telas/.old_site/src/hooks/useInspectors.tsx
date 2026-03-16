import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';
import { clearCache, readCache, writeCache } from '@/lib/cache';

type Inspector = Database['public']['Tables']['inspectors_directory']['Row'];
type InspectorInsert = Database['public']['Tables']['inspectors_directory']['Insert'];

export function useInspectors(activeOnly = true) {
  const { user, getToken } = useAuth();
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheKey = useMemo(() => `inspectors:${activeOnly ? "active" : "all"}`, [activeOnly]);
  const cacheKeyActive = "inspectors:active";
  const cacheKeyAll = "inspectors:all";

  const fetchInspectors = useCallback(async () => {
    if (!user) {
      setInspectors([]);
      setIsLoading(false);
      return;
    }

    try {
      const cached = readCache<Inspector[]>(cacheKey, 1_800_000);
      if (cached) {
        setInspectors(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const qs = new URLSearchParams();
      if (!activeOnly) qs.set('active_only', 'false');
      const res = await apiFetch<{ ok: true; inspectors: Inspector[] }>(
        { getToken },
        `/api/inspectors?${qs.toString()}`
      );
      const next = res.inspectors || [];
      setInspectors(next);
      writeCache(cacheKey, next);
      // Keep both caches coherent. This avoids the case where Master creates an inspector
      // (cacheKeyAll) but the assistant screen reads only cacheKeyActive.
      if (!activeOnly) {
        writeCache(cacheKeyActive, next.filter((i) => !!i?.active));
      }
    } catch (err) {
      console.error('Error fetching inspectors:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken, cacheKey, activeOnly]);

  useEffect(() => {
    fetchInspectors();
  }, [fetchInspectors]);

  const createInspector = async (inspector: Omit<InspectorInsert, 'created_by'>) => {
    if (!user) throw new Error('User not authenticated');
    
    const res = await apiFetch<{ ok: true; inspector: Inspector }>(
      { getToken },
      '/api/inspectors',
      {
        method: 'POST',
        body: JSON.stringify(inspector),
      }
    );
    
    // Avoid stale empty list on other screens by clearing both caches and refetching.
    clearCache(cacheKeyActive);
    clearCache(cacheKeyAll);
    await fetchInspectors();
    return res.inspector;
  };

  const updateInspector = async (id: string, updates: Partial<Inspector>) => {
    if (!user) throw new Error('User not authenticated');
    
    const res = await apiFetch<{ ok: true; inspector: Inspector }>(
      { getToken },
      `/api/inspectors?id=${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    
    clearCache(cacheKeyActive);
    clearCache(cacheKeyAll);
    await fetchInspectors();
    return res.inspector;
  };

  const toggleActive = async (id: string, active: boolean) => {
    return updateInspector(id, { active });
  };

  return {
    inspectors,
    isLoading,
    error,
    refetch: fetchInspectors,
    createInspector,
    updateInspector,
    toggleActive,
  };
}
