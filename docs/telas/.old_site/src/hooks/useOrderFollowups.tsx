import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { useAppUser } from "@/hooks/useAppUser";
import { useUserRole } from "@/hooks/useUserRole";
import { useVisibilityInterval } from "@/hooks/useVisibilityInterval";
import { readCache, writeCache } from "@/lib/cache";
import { DEFAULT_POLLING_HIDDEN_MS, DEFAULT_POLLING_VISIBLE_MS } from "@/lib/polling";

export type FollowupStatus = "open" | "in_review" | "resolved" | "dismissed";
export type FollowupKind = "correction" | "pool_exception";

export interface OrderFollowup {
  id: string;
  order_id: string;
  assistant_id: string;
  created_by: string;
  kind: FollowupKind;
  reason: string;
  status: FollowupStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
}

interface UseOrderFollowupsOptions {
  assistantId?: string;
  status?: FollowupStatus[];
  kind?: FollowupKind;
  enabled?: boolean;
}

export function useOrderFollowups(options: UseOrderFollowupsOptions = {}) {
  const { user, getToken } = useAuth();
  const { appUser } = useAppUser();
  const { isAdmin, isMaster } = useUserRole();
  const [followups, setFollowups] = useState<OrderFollowup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const statusKey = useMemo(() => (options.status ? options.status.join(",") : ""), [options.status]);
  const enabled = options.enabled ?? true;
  const cacheKey = useMemo(() => {
    const key = {
      v: 2,
      assistantId: options.assistantId ?? null,
      kind: options.kind ?? null,
      status: options.status ?? null,
      role: isAdmin || isMaster ? "admin" : "user",
      userId: user?.id ?? null,
    };
    return `followups:${JSON.stringify(key)}`;
  }, [options.assistantId, options.kind, options.status, isAdmin, isMaster, user?.id]);

  const fetchFollowups = useCallback(async (force = false) => {
    if (!enabled || !user) {
      setFollowups([]);
      setIsLoading(false);
      return;
    }

    try {
      const cached = !force ? readCache<OrderFollowup[]>(cacheKey, 300_000) : null;
      if (cached) {
        setFollowups(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const qs = new URLSearchParams();
      if (!isAdmin && !isMaster) {
        qs.set("assistant_id", appUser?.id ?? user.id);
      }
      if (options.assistantId) qs.set("assistant_id", options.assistantId);
      if (options.kind) qs.set("kind", options.kind);
      if (statusKey) {
        qs.set("status", statusKey);
      }

      const res = await apiFetch<{ ok: true; followups: OrderFollowup[] }>(
        { getToken },
        `/api/orders/followups?${qs.toString()}`
      );

      setFollowups(res.followups || []);
      writeCache(cacheKey, res.followups || []);
    } catch (err) {
      console.error("Error fetching followups:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, user, getToken, isAdmin, isMaster, options.assistantId, options.kind, statusKey, cacheKey, appUser?.id]);

  useEffect(() => {
    if (enabled) fetchFollowups();
  }, [fetchFollowups, enabled]);

  useVisibilityInterval(
    () => {
      if (enabled && user) fetchFollowups();
    },
    { intervalMs: DEFAULT_POLLING_VISIBLE_MS, hiddenIntervalMs: DEFAULT_POLLING_HIDDEN_MS, enabled: !!user && enabled }
  );

  const refetch = useCallback(() => fetchFollowups(true), [fetchFollowups]);

  return { followups, isLoading, error, refetch };
}
