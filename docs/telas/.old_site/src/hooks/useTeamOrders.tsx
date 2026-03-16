import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./useAuth";
import { useAppUser } from "@/hooks/useAppUser";
import { useUserRole } from "./useUserRole";
import { apiFetch } from "@/lib/apiClient";

type ApiOrder = {
  id: string;
  external_id: string;
  app_status: string;
  pool_status: string | null;
  otype: string | null;
  client_code: string | null;
  owner_name: string | null;
  address1: string | null;
  address2?: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  assistant_id: string | null;
  inspector_id: string | null;
  inspector_code?: string | null;
  hold_until: string | null;
  submitted_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  followup_suspected: boolean | null;
  followup_suspected_reason: string | null;
};

type LegacyOrderStatus =
  | "pendente"
  | "agendada"
  | "enviada"
  | "em_analise"
  | "aprovada"
  | "paga"
  | "rejeitada"
  | "cancelada";

type TeamOrder = {
  id: string;
  external_id: string;
  status: LegacyOrderStatus | string;
  pool_status: string | null;
  work_type: string | null;
  category: string | null;
  client_code: string | null;
  owner_name: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  assistant_id: string | null;
  inspector_id: string | null;
  inspector_code: string | null;
  due_date: string | null;
  execution_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  audit_flag: boolean | null;
  audit_reason: string | null;
};

interface InspectorInfo {
  id: string;
  name: string;
  code: string;
}

interface ProfileInfo {
  full_name: string;
}

type OrderWithDetails = TeamOrder & {
  inspectors?: InspectorInfo | null;
  profiles?: ProfileInfo | null;
};

interface UseTeamOrdersOptions {
  assistantId?: string;
}

type TeamApprovalsResponse = {
  ok: true;
  orders: OrderWithDetails[];
  followupCounts?: { correction: number };
  warnings?: string[];
};

export function useTeamOrders(options: UseTeamOrdersOptions = {}) {
  const { user, getToken } = useAuth();
  const { appUser } = useAppUser();
  const { isAdmin, isMaster } = useUserRole();
  const assistantIdFilter = options.assistantId;
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [teamAssistants, setTeamAssistants] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [followupCounts, setFollowupCounts] = useState({ correction: 0 });

  const fetchTeamOrders = useCallback(async () => {
    if (!user || (!isAdmin && !isMaster)) {
      setOrders([]);
      setTeamAssistants([]);
      setFollowupCounts({ correction: 0 });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const qs = new URLSearchParams();
      if (assistantIdFilter && assistantIdFilter !== "all") {
        qs.set("assistant_id", assistantIdFilter);
      }
      const path = qs.toString() ? `/api/orders/team-approvals?${qs.toString()}` : "/api/orders/team-approvals";
      const approvalsRes = await apiFetch<TeamApprovalsResponse>({ getToken }, path, { bypassFreeze: true });

      const nextOrders = approvalsRes.orders ?? [];
      setOrders(nextOrders);
      setFollowupCounts(approvalsRes.followupCounts ?? { correction: 0 });

      const assistantsById = new Map<string, string>();
      nextOrders.forEach((o) => {
        if (!o.assistant_id) return;
        assistantsById.set(o.assistant_id, o.profiles?.full_name || "Desconhecido");
      });
      setTeamAssistants(
        Array.from(assistantsById.entries()).map(([id, name]) => ({
          id,
          name,
        })),
      );
    } catch (err) {
      console.error("Error fetching team orders:", err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken, isAdmin, isMaster, assistantIdFilter]);

  useEffect(() => {
    fetchTeamOrders();
  }, [fetchTeamOrders]);

  const updateOrderStatus = async (
    orderIds: string[],
    newStatus: LegacyOrderStatus | string,
    options?: { reason?: string; auditFlag?: boolean; returnToPool?: boolean },
  ) => {
    const returnToPoolReason = "Devolvida ao Pool";
    const previousStatusById = new Map(orders.map((order) => [order.id, order.status]));

    const reason = options?.reason ?? null;
    const buildPatchBody = () => {
      if (newStatus === "aprovada" || newStatus === "paga") {
        return {
          app_status: "closed",
          closed_at: new Date().toISOString(),
          followup_suspected: false,
          followup_suspected_reason: null,
        };
      }
      if (newStatus === "rejeitada") {
        return {
          app_status: "available",
          followup_suspected: false,
          followup_suspected_reason: reason,
          auto_clear_possession: options?.returnToPool === true,
        };
      }
      if (
        newStatus === "enviada" ||
        newStatus === "em_analise" ||
        newStatus === "pendente" ||
        newStatus === "agendada"
      ) {
        if (options?.auditFlag) {
          return {
            app_status: "followup",
            followup_suspected: true,
            followup_suspected_reason: reason,
          };
        }
        return {
          app_status: "submitted",
          followup_suspected: false,
          followup_suspected_reason: reason,
        };
      }
      return { followup_suspected_reason: reason };
    };

    await Promise.all(
      orderIds.map((id) =>
        apiFetch<{ ok: true; order: ApiOrder }>(
          { getToken },
          `/api/orders/${id}`,
          {
            method: "PATCH",
            body: JSON.stringify(buildPatchBody()),
            // Admin actions should not be blocked by the freeze manager.
            bypassFreeze: true,
          },
        )
      ),
    );

    if (options?.auditFlag && user && orderIds.length > 0) {
      const followupEntries = orderIds.map((orderId) => ({
        order_id: orderId,
        assistant_id: orders.find((o) => o.id === orderId)?.assistant_id || null,
        created_by: appUser?.id ?? user.id,
        kind: "correction",
        reason: options.reason || "Correcao solicitada",
        status: "open",
      }));

      try {
        await apiFetch<{ ok: true; followups: any[] }>(
          { getToken },
          "/api/orders/followups",
          { method: "POST", body: JSON.stringify({ items: followupEntries }), bypassFreeze: true },
        );
      } catch (err) {
        // Do not block UI refresh if followup side-effect fails.
        console.error("Failed to create followup entries:", err);
      }
    }

    if (user && orderIds.length > 0) {
      const historyEntries = orderIds.map((orderId) => ({
        order_id: orderId,
        previous_status: previousStatusById.get(orderId) ?? null,
        new_status: newStatus,
        changed_by: appUser?.id ?? user.id,
        change_reason: options?.reason || (options?.returnToPool ? returnToPoolReason : null),
        details: { source: "useTeamOrders" },
      }));

      try {
        await apiFetch<{ ok: true; history: any[] }>(
          { getToken },
          "/api/orders/history",
          { method: "POST", body: JSON.stringify({ items: historyEntries }), bypassFreeze: true },
        );
      } catch (err) {
        // Do not block UI refresh if history side-effect fails.
        console.error("Failed to create history entries:", err);
      }
    }

    try {
      await fetchTeamOrders();
    } catch (err) {
      console.error("Failed to refresh team approvals after status update:", err);
    }
  };

  const confirmAuditVerification = async (orderIds: string[]) => {
    if (orderIds.length === 0) return;
    try {
      await apiFetch<{ ok: true; followups: any[] }>(
        { getToken },
        "/api/orders/followups",
        {
          method: "PATCH",
          body: JSON.stringify({
            order_ids: orderIds,
            kind: "correction",
            status_filter: ["open", "in_review"],
            resolved_at: new Date().toISOString(),
            resolved_by: user?.id || null,
            status: "resolved",
          }),
          bypassFreeze: true,
        },
      );
    } catch (err) {
      console.error("Failed to resolve followups:", err);
    } finally {
      try {
        await fetchTeamOrders();
      } catch (err) {
        console.error("Failed to refresh team approvals after followup resolution:", err);
      }
    }
  };

  return {
    orders,
    teamAssistants,
    followupCounts,
    isLoading,
    error,
    refetch: fetchTeamOrders,
    updateOrderStatus,
    confirmAuditVerification,
  };
}
