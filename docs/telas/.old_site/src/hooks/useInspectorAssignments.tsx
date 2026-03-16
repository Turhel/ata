import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { readCache, writeCache, clearCache } from "@/lib/cache";
import { useAuth } from "@/hooks/useAuth";

export type InspectorAssignmentRow = {
  id: string;
  user_id: string;
  inspector_id: string;
  assigned_by: string | null;
  assigned_at: string | null;
  notes: string | null;
  user_full_name: string | null;
  user_email: string | null;
  user_clerk_user_id?: string | null;
  inspector_code: string | null;
  inspector_name: string | null;
  inspector_active: boolean | null;
};

export type PendingInspectorUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  clerk_user_id?: string | null;
  created_at: string | null;
};

type ListResponse = {
  ok: true;
  assignments: InspectorAssignmentRow[];
  pending_users: PendingInspectorUser[];
};

export function useInspectorAssignments() {
  const { user, getToken } = useAuth();
  const [assignments, setAssignments] = useState<InspectorAssignmentRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingInspectorUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = useMemo(() => "inspectors:assignments:v1", []);

  const fetchAll = useCallback(
    async (force = false) => {
      if (!user) {
        setAssignments([]);
        setPendingUsers([]);
        setIsLoading(false);
        return;
      }

      try {
        const cached = !force ? readCache<ListResponse>(cacheKey, 60_000) : null;
        if (cached?.ok) {
          setAssignments(cached.assignments ?? []);
          setPendingUsers(cached.pending_users ?? []);
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        const res = await apiFetch<ListResponse>({ getToken }, "/api/inspectors/assignments", {
          bypassFreeze: true,
        });
        setAssignments(res.assignments ?? []);
        setPendingUsers(res.pending_users ?? []);
        writeCache(cacheKey, res);
      } catch (err: any) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, getToken, cacheKey]
  );

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  const assign = useCallback(
    async (opts: { user_id: string; inspector_id: string; notes?: string | null }) => {
      if (!user) throw new Error("User not authenticated");
      await apiFetch<{ ok: true }>({ getToken }, "/api/inspectors/assignments", {
        method: "POST",
        bypassFreeze: true,
        body: JSON.stringify(opts),
      });
      clearCache(cacheKey);
      await fetchAll(true);
    },
    [user, getToken, cacheKey, fetchAll]
  );

  const unassign = useCallback(
    async (assignmentId: string) => {
      if (!user) throw new Error("User not authenticated");
      await apiFetch<{ ok: true }>({ getToken }, `/api/inspectors/assignments/${assignmentId}`, {
        method: "PATCH",
        bypassFreeze: true,
        body: JSON.stringify({ action: "unassign" }),
      });
      clearCache(cacheKey);
      await fetchAll(true);
    },
    [user, getToken, cacheKey, fetchAll]
  );

  return {
    assignments,
    pendingUsers,
    isLoading,
    error,
    refetch: () => fetchAll(true),
    assign,
    unassign,
  };
}
