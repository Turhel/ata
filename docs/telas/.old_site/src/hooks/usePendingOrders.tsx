// Hook for pending orders management - v4 (uses /api/orders/pending-summary)
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { getPollingIntervalMs } from "@/lib/polling";
import { getDueDateKey, getTodayInAppTimezone, msUntilNextDayInAppTimezone } from "@/lib/timezone";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import type { Order } from "@/hooks/useOrders";

type PendingSummaryItem = {
  id: string;
  external_id: string;
  app_status: string;
  otype: string | null;
  hold_until: string | null;
  due_date_confirmed: boolean | null;
  due_date_key: string | null;
  followup_reason?: string | null;
};

type PendingSummaryResponse = {
  ok: true;
  todayKey: string;
  counts: {
    dueDate: number;
    returned: number;
    dueToday: number;
    pending: number;
  };
  dueDateOrders: PendingSummaryItem[];
  returnedOrders: PendingSummaryItem[];
  warnings?: string[];
};

function mapToOrder(row: PendingSummaryItem): Order {
  return {
    id: row.id,
    external_id: row.external_id,
    status: row.app_status,
    pool_status: null,
    work_type: row.otype,
    category: null,
    client_code: null,
    owner_name: null,
    address1: null,
    city: null,
    state: null,
    zip: null,
    assistant_id: null,
    inspector_id: null,
    inspector_code: null,
    due_date: row.hold_until,
    due_date_confirmed: row.due_date_confirmed ?? null,
    execution_date: null,
    created_at: null,
    updated_at: null,
    audit_flag: row.followup_reason ? true : null,
    audit_reason: row.followup_reason ?? null,
  };
}

export function usePendingOrders(enabled = true) {
  const { user, getToken } = useAuth();
  const { isAdmin, isMaster } = useUserRole();

  const queryKey = useMemo(() => ["pending-summary", user?.id ?? null], [user?.id]);
  const [todayKey, setTodayKey] = useState(() => getTodayInAppTimezone());

  useEffect(() => {
    let timer: number | null = null;
    const schedule = () => {
      const ms = msUntilNextDayInAppTimezone(new Date());
      timer = window.setTimeout(() => {
        setTodayKey(getTodayInAppTimezone());
        schedule();
      }, Math.max(1000, ms + 50));
    };
    schedule();
    return () => {
      if (timer != null) window.clearTimeout(timer);
    };
  }, []);

  const query = useQuery({
    queryKey,
    enabled: enabled && !!user && !isAdmin && !isMaster,
    staleTime: 300_000, // 5 min
    refetchInterval: () => getPollingIntervalMs(),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    // Ajuda a evitar "stale UX" quando o usuÃ¡rio volta para o dashboard apÃ³s uma aÃ§Ã£o.
    // MantÃ©m baixo egress porque sÃ³ refetch se estiver stale (staleTime=5min) ou se a query for invalidada.
    refetchOnMount: true,
    queryFn: async () => {
      return await apiFetch<PendingSummaryResponse>({ getToken }, "/api/orders/pending-summary");
    },
  });

  const dueDateOrders = useMemo(() => (query.data?.dueDateOrders ?? []).map(mapToOrder), [query.data?.dueDateOrders]);
  const returnedOrders = useMemo(
    () => (query.data?.returnedOrders ?? []).map(mapToOrder),
    [query.data?.returnedOrders],
  );

  const ordersDueToday = useMemo(() => {
    return (query.data?.dueDateOrders ?? [])
      .filter((o) => (o.due_date_key ?? (o.hold_until ? getDueDateKey(o.hold_until) : null)) === todayKey)
      .map(mapToOrder);
  }, [query.data?.dueDateOrders, todayKey]);

  const pendingCount = query.data?.counts?.pending ?? dueDateOrders.length + returnedOrders.length;

  return {
    // Backwards compat: `orders` used to mean the scheduled orders list.
    orders: dueDateOrders,
    dueDateOrders,
    returnedOrders,
    ordersDueToday,
    pendingCount,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
