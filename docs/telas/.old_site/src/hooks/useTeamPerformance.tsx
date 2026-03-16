import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { apiFetch } from "@/lib/apiClient";
import { nowInAppTimezone } from "@/lib/timezone";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";

export type LegacyOrder = {
  id: string;
  external_id: string | null;
  assistant_id: string | null;
  inspector_id: string | null;
  inspector_code: string | null;
  status: string;
  otype: string | null;
  work_type: string | null;
  category: string | null;
  audit_flag: boolean | null;
  audit_reason: string | null;
  created_at: string | null;
  execution_date: string | null;
  due_date: string | null;
};

interface ReasonCount {
  reason: string;
  count: number;
}

interface AssistantMetrics {
  assistantId: string;
  assistantName: string;
  totalOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  pendingOrders: number;
  followUpOrders: number;
  approvalRate: number;
  categoryBreakdown: {
    regular: number;
    exterior: number;
    interior: number;
    fint: number;
  };
  followUpReasons: ReasonCount[];
  rejectionReasons: ReasonCount[];
  needsAlert: boolean;
}

export interface TeamMetrics {
  totalOrders: number;
  approvedOrders: number;
  rejectedOrders: number;
  pendingOrders: number;
  followUpOrders: number;
  approvalRate: number;
  categoryBreakdown: {
    regular: number;
    exterior: number;
    interior: number;
    fint: number;
  };
  assistants: AssistantMetrics[];
  topFollowUpReasons: ReasonCount[];
  topRejectionReasons: ReasonCount[];
  alertCount: number;
}

export type Period = "week" | "month" | "all";

type TeamPerformanceResponse = {
  ok: true;
  assistantIds: string[];
  range?: { submitted_from: string | null; submitted_to: string | null };
  metrics: TeamMetrics;
  orders: LegacyOrder[];
  warnings?: string[];
};

function getDateRangeForPeriod(period: Period) {
  if (period === "all") return null;
  const now = nowInAppTimezone();
  if (period === "week") {
    return {
      from: startOfWeek(now, { weekStartsOn: 0 }),
      to: endOfWeek(now, { weekStartsOn: 0 }),
    };
  }
  return {
    from: startOfMonth(now),
    to: endOfMonth(now),
  };
}

export function useTeamPerformance(period: Period = "week", assistantId?: string | null) {
  const { user, getToken } = useAuth();
  const { isAdmin, isMaster } = useUserRole();

  const range = useMemo(() => getDateRangeForPeriod(period), [period]);
  const rangeKey = useMemo(() => {
    if (!range) return "all";
    return `${range.from.toISOString()}..${range.to.toISOString()}`;
  }, [range]);

  const query = useQuery({
    queryKey: ["team-performance", user?.id ?? null, period, rangeKey, assistantId ?? null],
    enabled: !!user && (isAdmin || isMaster),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (range) {
        qs.set("submitted_from", range.from.toISOString());
        qs.set("submitted_to", range.to.toISOString());
      }
      if (assistantId) qs.set("assistant_id", assistantId);
      const path = qs.toString() ? `/api/orders/team-performance?${qs.toString()}` : "/api/orders/team-performance";
      return await apiFetch<TeamPerformanceResponse>({ getToken }, path, { bypassFreeze: true });
    },
  });

  return {
    metrics: query.data?.metrics ?? null,
    orders: query.data?.orders ?? [],
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    refetch: query.refetch,
  };
}

