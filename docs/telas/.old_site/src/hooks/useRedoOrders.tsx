import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAppUser } from "@/hooks/useAppUser";
import { useUserRole } from "@/hooks/useUserRole";
import { differenceInDays } from "date-fns";
import { apiFetch } from "@/lib/apiClient";

export type SeverityLevel = "low" | "medium" | "high" | "critical";

export interface RedoOrder {
  id: string;
  followupId: string;
  followupKind: "correction" | "pool_exception";
  followupStatus: "open" | "in_review" | "resolved" | "dismissed";
  externalId: string;
  assistantId: string | null;
  assistantName: string;
  workType: string | null;
  status: "rejeitada" | "enviada" | "aprovada" | "paga" | "cancelada" | "pendente" | "nao_realizada";
  rejectionReason: string;
  rejectionDate: string;
  redoDate?: string;
  originalDate: string;
  daysSinceRejection: number;
  severity: SeverityLevel;
  auditFlag?: boolean;
  category?: string | null;
  address?: string | null;
}

interface UseRedoOrdersProps {
  searchTerm?: string;
}

export function useRedoOrders({ searchTerm }: UseRedoOrdersProps = {}) {
  const { user, getToken } = useAuth();
  const { appUser } = useAppUser();
  const { isAdmin, isMaster } = useUserRole();
  const { toast } = useToast();
  const [orders, setOrders] = useState<RedoOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    exceptions: 0,
    completed: 0,
    approved: 0,
  });

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const followupsRes = await apiFetch<{ ok: true; followups: any[] }>(
        { getToken },
        `/api/orders/followups?status=open,in_review${!isAdmin && !isMaster ? `&assistant_id=${encodeURIComponent(appUser?.id ?? user.id)}` : ''}`
      );

      const followups = followupsRes.followups || [];
      const orderIds = Array.from(new Set(followups.map((f) => f.order_id)));

      if (orderIds.length === 0) {
        setOrders([]);
        setStats({ total: 0, pending: 0, exceptions: 0, completed: 0, approved: 0 });
        return;
      }

    const workTypesRes = await apiFetch<{
      ok: true;
      workTypes: { code: string; category: string | null; active: boolean | null }[];
    }>({ getToken }, "/api/work-types");
      const workTypeCategoryByCode: Record<string, string> = {};
      (workTypesRes.workTypes || []).forEach((wt) => {
        if (wt?.active === false) return;
        const code = String(wt?.code || "").toUpperCase().trim();
        if (!code) return;
        if (wt.category) workTypeCategoryByCode[code] = String(wt.category);
      });

      const ordersRes = await apiFetch<{ ok: true; items: any[] }>(
        { getToken },
        `/api/orders?ids=${orderIds.join(",")}&limit=200&archived=false`
      );

      const ordersData = ordersRes.items || [];
      const ordersById = new Map((ordersData || []).map((order: any) => [order.id, order]));

      const assistantIds = Array.from(
        new Set((ordersData || []).map((o: any) => o.assistant_id).filter(Boolean)),
      ) as string[];
      const profilesMap = new Map<string, string>();

      if (assistantIds.length > 0) {
        const profilesRes = await apiFetch<{ ok: true; profiles: { user_id: string; full_name: string }[] }>(
          { getToken },
          `/api/users/profiles?user_ids=${assistantIds.join(',')}`
        );
        (profilesRes.profiles || []).forEach((p: any) => {
          if (p.id) profilesMap.set(p.id, p.full_name);
          if (p.user_id) profilesMap.set(p.user_id, p.full_name);
        });
      }

      const processedOrders: RedoOrder[] = followups
        .map((followup: any) => {
          const order = ordersById.get(followup.order_id);
          if (!order) return null;

          const rejectionDate = new Date(followup.created_at);
          const daysSince = differenceInDays(new Date(), rejectionDate);

          let severity: SeverityLevel = "low";
          if (daysSince > 7) severity = "critical";
          else if (daysSince > 3) severity = "high";
          else if (daysSince > 1) severity = "medium";

          return {
            id: order.id,
            followupId: followup.id,
            followupKind: followup.kind,
            followupStatus: followup.status,
            externalId: order.external_id,
            assistantId: order.assistant_id,
            assistantName: profilesMap.get(order.assistant_id) || "Desconhecido",
            workType: order.otype ?? null,
            status: (() => {
              const auditFlag = order.followup_suspected ?? null;
              if (auditFlag) return "enviada";
              const s = String(order.app_status || "").toLowerCase();
              if (s === "closed") return "aprovada";
              if (s === "canceled") return "cancelada";
              if (s === "available") return "pendente";
              if (s === "scheduled") return "agendada";
              return "enviada";
            })(),
            rejectionReason: followup.reason || "Motivo nao informado",
            rejectionDate: rejectionDate.toLocaleDateString("pt-BR"),
            redoDate:
              String(order.app_status || "").toLowerCase() === "submitted"
                ? new Date(order.updated_at).toLocaleDateString("pt-BR")
                : undefined,
            originalDate: new Date(order.created_at).toLocaleDateString("pt-BR"),
            daysSinceRejection: daysSince,
            severity,
            auditFlag: followup.kind === "pool_exception",
            category: (() => {
              const code = String(order.otype || "").toUpperCase().trim();
              return code ? workTypeCategoryByCode[code] ?? null : null;
            })(),
            address:
              [
                [order.address1, order.address2].filter(Boolean).join(" ").trim(),
                order.city,
                order.state,
                order.zip,
              ]
                .filter(Boolean)
                .join(", ") || null,
          };
        })
        .filter(Boolean) as RedoOrder[];

      const searchLower = searchTerm?.toLowerCase().trim();
      const filtered = searchLower
        ? processedOrders.filter(
            (order) =>
              order.externalId.toLowerCase().includes(searchLower) ||
              order.assistantName.toLowerCase().includes(searchLower),
          )
        : processedOrders;

      setOrders(filtered);

      const pendingCount = processedOrders.filter((o) => o.followupKind === "correction").length;
      const exceptionCount = processedOrders.filter((o) => o.followupKind === "pool_exception").length;

      setStats({
        total: processedOrders.length,
        pending: pendingCount,
        exceptions: exceptionCount,
        completed: processedOrders.filter((o) => o.followupStatus === "resolved").length,
        approved: processedOrders.filter((o) => o.status === "aprovada").length,
      });
    } catch (error: any) {
      console.error("Error fetching redo orders:", error);
      toast({
        title: "Erro ao carregar ordens",
        description: error.message || "Nao foi possivel buscar a lista de ordens.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin, isMaster, appUser?.id, searchTerm, toast, getToken]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    stats,
    isLoading,
    refetch: fetchOrders,
  };
}
