import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/apiClient";
import { readCache, writeCache } from "@/lib/cache";

export interface InspectionScope {
  id: string;
  order_id: string;
  order_external_id?: string | null;
  external_id?: string | null;
  kind: string | null;
  loss_reason: string | null;
  route_point: string | null;
  visibility: "private" | "public" | string;
  archived_at?: string | null;
  updated_at?: string | null;
  items: ScopeItem[];
  created_by: string;
  created_at: string;
}

export interface ScopeItem {
  id: string;
  scope_id: string;
  sort_order: number | null;
  area: string | null;
  label: string | null;
  notes: string | null;
  required: boolean;
  done: boolean;
  done_at: string | null;
  done_by_user_id: string | null;
  done_by_inspector_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export const useInspectionScopes = () => {
  const [scopes, setScopes] = useState<InspectionScope[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, getToken } = useAuth();
  const cacheKey = useMemo(() => "inspection-scopes:all", []);

  const fetchScopes = useCallback(async (force = false) => {
    try {
      const cached = !force ? readCache<InspectionScope[]>(cacheKey, 300_000) : null;
      if (cached) {
        setScopes(cached);
        setIsLoading(false);
        return;
      }

      const res = await apiFetch<{ ok: true; scopes: InspectionScope[] }>(
        { getToken },
        "/api/scopes"
      );

      const next = res.scopes || [];
      setScopes(next);
      writeCache(cacheKey, next);
    } catch (error: any) {
      console.error("Error fetching scopes:", error);
      toast.error("Erro ao carregar escopos");
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, getToken]);

  useEffect(() => {
    fetchScopes();
  }, [fetchScopes]);

  const createScope = async (scope: Omit<InspectionScope, "id" | "created_at" | "created_by">) => {
    try {
      if (!user) throw new Error("Usuário não autenticado");

      const res = await apiFetch<{ ok: true; scope: InspectionScope }>(
        { getToken },
        "/api/scopes",
        { method: "POST", body: JSON.stringify(scope) }
      );

      setScopes((prev) => {
        const next = [res.scope, ...prev];
        writeCache(cacheKey, next);
        return next;
      });

      toast.success("Escopo criado com sucesso!");
      return true;
    } catch (error: any) {
      console.error("Error creating scope:", error);
      toast.error("Erro ao criar escopo");
      return false;
    }
  };

  const updateScope = async (
    id: string,
    scope: Partial<Omit<InspectionScope, "id" | "created_at" | "created_by">>
  ) => {
    try {
      const res = await apiFetch<{ ok: true; scope: InspectionScope }>(
        { getToken },
        `/api/scopes/${id}`,
        { method: "PATCH", body: JSON.stringify(scope) }
      );

      setScopes((prev) => {
        const next = prev.map((row) => (row.id === id ? res.scope : row));
        writeCache(cacheKey, next);
        return next;
      });

      toast.success("Escopo atualizado com sucesso!");
      return true;
    } catch (error: any) {
      console.error("Error updating scope:", error);
      toast.error("Erro ao atualizar escopo");
      return false;
    }
  };

  const toggleItemDone = async (scopeId: string, itemId: string, done: boolean) => {
    try {
      const res = await apiFetch<{ ok: true; scope: InspectionScope }>(
        { getToken },
        `/api/scopes/${scopeId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ item_updates: [{ id: itemId, done }] }),
        }
      );

      setScopes((prev) => {
        const next = prev.map((row) => (row.id === scopeId ? res.scope : row));
        writeCache(cacheKey, next);
        return next;
      });

      return true;
    } catch (error: any) {
      console.error("Error updating item:", error);
      toast.error("Erro ao atualizar item");
      return false;
    }
  };

  const deleteScope = async (id: string) => {
    try {
      await apiFetch<{ ok: true }>(
        { getToken },
        `/api/scopes/${id}`,
        { method: "DELETE" }
      );

      setScopes((prev) => {
        const next = prev.filter((row) => row.id !== id);
        writeCache(cacheKey, next);
        return next;
      });

      toast.success("Escopo removido com sucesso!");
      return true;
    } catch (error: any) {
      console.error("Error deleting scope:", error);
      toast.error("Erro ao remover escopo");
      return false;
    }
  };

  return {
    scopes,
    isLoading,
    createScope,
    updateScope,
    toggleItemDone,
    deleteScope,
    refetch: () => fetchScopes(true),
  };
};
