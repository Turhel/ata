import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';
import { readCache, writeCache } from '@/lib/cache';

type WorkCategory = Database['public']['Enums']['work_category'];

export interface WorkType {
  id: string;
  code: string;
  description: string | null;
  category: WorkCategory;
  assistant_value?: number | null;
  inspector_value?: number | null;
  active: boolean;
  created_at: string;
  updated_at?: string | null;
  created_by: string | null;
}

export interface WorkTypeRequest {
  id: string;
  code: string;
  requested_by: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_id: string | null;
  admin_notes: string | null;
  admin_reviewed_at: string | null;
  master_id: string | null;
  master_notes: string | null;
  master_reviewed_at: string | null;
  suggested_category: WorkCategory | null;
  created_work_type_id?: string | null;
  requester_name?: string;
}

export function useWorkTypes() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cacheKey = useMemo(() => 'work-types:all', []);

  const fetchWorkTypes = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      const cached = !force ? readCache<WorkType[]>(cacheKey, 1_800_000) : null;
      if (cached) {
        setWorkTypes(cached);
        setIsLoading(false);
        return;
      }

      const res = await apiFetch<{ ok: true; workTypes: WorkType[] }>(
        { getToken },
        '/api/work-types'
      );
      const next = res.workTypes || [];
      setWorkTypes(next);
      writeCache(cacheKey, next);
    } catch (error) {
      console.error('Error fetching work types:', error);
      toast({
        title: 'Erro ao carregar tipos de ordem',
        description: 'N??o foi poss??vel carregar os tipos de ordem.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [getToken, toast, cacheKey]);

  const createWorkType = async (data: {
    code: string;
    description?: string;
    category: WorkCategory;
    assistant_value?: number;
    inspector_value?: number;
  }) => {
    try {
      const res = await apiFetch<{ ok: true; workType: WorkType }>(
        { getToken },
        '/api/work-types',
        {
          method: 'POST',
          body: JSON.stringify({
            code: data.code.toUpperCase().trim(),
            description: data.description?.trim() || null,
            category: data.category,
            assistant_value: Number(data.assistant_value ?? 0),
            inspector_value: Number(data.inspector_value ?? 0),
            active: true,
          }),
        }
      );

      toast({
        title: 'Tipo de ordem criado',
        description: `O tipo "${data.code}" foi adicionado com sucesso.`,
      });

      setWorkTypes((prev) => {
        const next = [res.workType, ...prev];
        writeCache(cacheKey, next);
        return next;
      });
      return res.workType;
    } catch (error: any) {
      console.error('Error creating work type:', error);
      if (error.message?.includes('23505')) {
        toast({
          title: 'Tipo j?? existe',
          description: `O c??digo "${data.code}" j?? est?? cadastrado.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao criar tipo',
          description: 'N??o foi poss??vel criar o tipo de ordem.',
          variant: 'destructive',
        });
      }
      return null;
    }
  };

  const updateWorkType = async (id: string, data: Partial<WorkType>) => {
    try {
      await apiFetch<{ ok: true; workType: WorkType }>(
        { getToken },
        `/api/work-types/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            ...data,
            code: data.code?.toUpperCase().trim(),
            description: data.description?.trim() || null,
            assistant_value: data.assistant_value !== undefined ? Number(data.assistant_value ?? 0) : undefined,
            inspector_value: data.inspector_value !== undefined ? Number(data.inspector_value ?? 0) : undefined,
          }),
        }
      );

      toast({
        title: 'Tipo atualizado',
        description: 'As altera????es foram salvas com sucesso.',
      });

      setWorkTypes((prev) => {
        const next = prev.map((wt) => (wt.id == id ? { ...wt, ...data } : wt));
        writeCache(cacheKey, next);
        return next;
      });
      return true;
    } catch (error) {
      console.error('Error updating work type:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'N??o foi poss??vel salvar as altera????es.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleWorkTypeStatus = async (id: string, active: boolean) => {
    return updateWorkType(id, { active });
  };

  useEffect(() => {
    fetchWorkTypes();
  }, [fetchWorkTypes]);

  return {
    workTypes,
    activeWorkTypes: workTypes.filter((wt) => wt.active),
    isLoading,
    refetch: () => fetchWorkTypes(true),
    createWorkType,
    updateWorkType,
    toggleWorkTypeStatus,
  };
}

export function useWorkTypeRequests() {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const [requests, setRequests] = useState<WorkTypeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cacheKey = useMemo(() => 'work-type-requests:all', []);

  const fetchRequests = useCallback(async (force = false) => {
    try {
      setIsLoading(true);
      const cached = !force ? readCache<WorkTypeRequest[]>(cacheKey, 300_000) : null;
      if (cached) {
        setRequests(cached);
        setIsLoading(false);
        return;
      }

      const res = await apiFetch<{ ok: true; requests: WorkTypeRequest[] }>(
        { getToken },
        '/api/requests/work-type'
      );
      const next = (res.requests || []).map((r) => ({
        ...r,
        status: r.status as 'pending' | 'approved' | 'rejected',
      }));
      setRequests(next);
      writeCache(cacheKey, next);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Erro ao carregar solicita????es',
        description: 'N??o foi poss??vel carregar as solicita????es.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [getToken, toast, cacheKey]);

  const createRequest = async (code: string) => {
    try {
      await apiFetch<{ ok: true; request: WorkTypeRequest }>(
        { getToken },
        '/api/requests/work-type',
        { method: 'POST', body: JSON.stringify({ code }) }
      );

      toast({
        title: 'Solicita????o enviada',
        description: `Solicita????o para o tipo "${code}" foi enviada para an??lise.`,
      });

      await fetchRequests(true);
      return true;
    } catch (error) {
      console.error('Error creating request:', error);
      toast({
        title: 'Erro ao solicitar',
        description: 'N??o foi poss??vel enviar a solicita????o.',
        variant: 'destructive',
      });
      return false;
    }
  };

  const reviewRequest = async (
    requestId: string,
    action: 'approve' | 'reject' | 'escalate',
    notes?: string,
    category?: WorkCategory,
    values?: { assistant_value?: number; inspector_value?: number }
  ) => {
    try {
      const payload: Record<string, any> = { action, notes, category };
      if (values?.assistant_value !== undefined) payload.assistant_value = Number(values.assistant_value ?? 0);
      if (values?.inspector_value !== undefined) payload.inspector_value = Number(values.inspector_value ?? 0);

      await apiFetch<{ ok: true; request: WorkTypeRequest }>(
        { getToken },
        `/api/requests/work-type/${requestId}`,
        { method: 'PATCH', body: JSON.stringify(payload) }
      );

      if (action === 'escalate') {
        toast({
          title: 'Solicita????o encaminhada',
          description: 'A solicita????o foi encaminhada para o Master.',
        });
      } else if (action === 'reject') {
        toast({
          title: 'Solicita????o rejeitada',
          description: 'A solicita????o foi rejeitada.',
        });
      } else {
        toast({
          title: 'Tipo de ordem criado',
          description: 'O tipo foi aprovado e adicionado ao sistema.',
        });
      }

      await fetchRequests(true);
      return true;
    } catch (error) {
      console.error('Error reviewing request:', error);
      toast({
        title: 'Erro ao processar',
        description: 'N??o foi poss??vel processar a solicita????o.',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    pendingRequests: requests.filter((r) => r.status === 'pending'),
    escalatedRequests: requests.filter((r) => r.status === 'pending' && r.admin_id),
    allPendingForMaster: requests.filter((r) => r.status === 'pending'),
    isLoading,
    refetch: () => fetchRequests(true),
    createRequest,
    reviewRequest,
  };
}
