import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { readCache, writeCache } from '@/lib/cache';

export interface Manual {
  id: string;
  title: string;
  description: string | null;
  cover_url: string;
  file_url: string;
  created_at: string;
  created_by: string | null;
}

export const useManuals = () => {
  const { getToken } = useAuth();
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cacheKey = useMemo(() => 'manuals:all', []);

  const fetchManuals = useCallback(async () => {
    try {
      const cached = readCache<Manual[]>(cacheKey, 1_800_000);
      if (cached) {
        setManuals(cached);
        setIsLoading(false);
        return;
      }

      const res = await apiFetch<{ ok: true; manuals: Manual[] }>({ getToken }, '/api/manuals');
      const next = res.manuals || [];
      setManuals(next);
      writeCache(cacheKey, next);
    } catch (error: any) {
      console.error('Error fetching manuals:', error);
      toast.error('Erro ao carregar manuais');
    } finally {
      setIsLoading(false);
    }
  }, [getToken, cacheKey]);

  useEffect(() => {
    fetchManuals();
  }, [fetchManuals]);

  const createManual = async (manual: Omit<Manual, 'id' | 'created_at' | 'created_by'>) => {
    try {
      const res = await apiFetch<{ ok: true; manual: Manual }>(
        { getToken },
        '/api/manuals',
        {
          method: 'POST',
          body: JSON.stringify({
            title: manual.title,
            description: manual.description,
            cover_url: manual.cover_url,
            file_url: manual.file_url,
          }),
        },
      );

      toast.success('Manual adicionado com sucesso!');
      setManuals((prev) => {
        const next = [res.manual, ...prev];
        writeCache(cacheKey, next);
        return next;
      });
      return true;
    } catch (error: any) {
      console.error('Error creating manual:', error);
      toast.error('Erro ao adicionar manual');
      return false;
    }
  };

  const deleteManual = async (id: string) => {
    try {
      await apiFetch<{ ok: true }>({ getToken }, `/api/manuals/${id}`, { method: 'DELETE' });
      toast.success('Manual removido com sucesso!');
      setManuals((prev) => {
        const next = prev.filter((m) => m.id !== id);
        writeCache(cacheKey, next);
        return next;
      });
      return true;
    } catch (error: any) {
      console.error('Error deleting manual:', error);
      toast.error('Erro ao remover manual');
      return false;
    }
  };

  return {
    manuals,
    isLoading,
    createManual,
    deleteManual,
    refetch: fetchManuals,
  };
};
