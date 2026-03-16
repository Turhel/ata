import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { apiFetch } from "@/lib/apiClient";
import { readCache, writeCache } from "@/lib/cache";

interface DuplicateRequest {
  id: string;
  external_id: string;
  requested_by: string;
  original_order_id: string;
  original_created_at: string;
  original_assistant_id: string | null;
  original_assistant_name?: string | null;
  notes: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  requested_at: string;
  requester_name?: string | null;
}

interface OriginalOrderInfo {
  id: string;
  external_id: string;
  created_at: string;
  assistant_id: string | null;
  assistant_name: string | null;
  work_type: string;
  status: string;
}

export function useDuplicateRequests() {
  const { user, getToken } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<DuplicateRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const cacheKey = useMemo(() => `duplicate-requests:${user?.id ?? "anon"}`, [user?.id]);

  const fetchRequests = useCallback(async (force = false) => {
    if (!user) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const cached = !force ? readCache<DuplicateRequest[]>(cacheKey, 180_000) : null;
      if (cached) {
        setRequests(cached);
        setIsLoading(false);
        return;
      }

      const res = await apiFetch<{ ok: true; requests: DuplicateRequest[] }>(
        { getToken },
        "/api/requests/duplicate"
      );
      const next = res.requests || [];
      setRequests(next);
      writeCache(cacheKey, next);
    } catch (err) {
      console.error("Error fetching duplicate requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken, cacheKey]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const checkForDuplicate = async (externalId: string): Promise<OriginalOrderInfo | null> => {
    try {
      const res = await apiFetch<{ ok: true; order: OriginalOrderInfo | null }>(
        { getToken },
        `/api/requests/duplicate/check?external_id=${encodeURIComponent(externalId)}`
      );
      return res.order ?? null;
    } catch (err) {
      console.error("Error checking for duplicate:", err);
      return null;
    }
  };

  const createRequest = async (
    externalId: string,
    originalOrderId: string,
    originalCreatedAt: string,
    originalAssistantId: string | null,
    notes?: string
  ) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const res = await apiFetch<{ ok: true; request: DuplicateRequest }>(
        { getToken },
        "/api/requests/duplicate",
        {
          method: "POST",
          body: JSON.stringify({
            external_id: externalId,
            original_order_id: originalOrderId,
            original_created_at: originalCreatedAt,
            original_assistant_id: originalAssistantId,
            notes: notes || null,
          }),
        }
      );

      setRequests((prev) => {
        const next = [res.request, ...prev];
        writeCache(cacheKey, next);
        return next;
      });

      toast({
        title: "Solicitação enviada",
        description: "A solicitação de revisão foi enviada aos administradores.",
      });
    } catch (err) {
      console.error("Error creating duplicate request:", err);
      throw err;
    }
  };

  const reviewRequest = async (
    requestId: string,
    status: "approved" | "rejected",
    reviewNotes?: string
  ) => {
    if (!user) throw new Error("User not authenticated");

    try {
      const res = await apiFetch<{ ok: true; request: DuplicateRequest }>(
        { getToken },
        `/api/requests/duplicate/${requestId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status, review_notes: reviewNotes || null }),
        }
      );

      setRequests((prev) => {
        const next = prev.map((r) => (r.id === requestId ? { ...r, ...res.request } : r));
        writeCache(cacheKey, next);
        return next;
      });

      toast({
        title: status === "approved" ? "Solicitação aprovada" : "Solicitação rejeitada",
        description:
          status === "approved"
            ? "A ordem foi transferida para o assistente solicitante."
            : "A solicitação foi rejeitada com sucesso.",
      });
    } catch (err) {
      console.error("Error reviewing duplicate request:", err);
      throw err;
    }
  };

  return {
    requests,
    pendingRequests: requests.filter((r) => r.status === "pending"),
    isLoading,
    refetch: () => fetchRequests(true),
    checkForDuplicate,
    createRequest,
    reviewRequest,
  };
}
