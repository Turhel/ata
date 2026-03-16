import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, format } from "date-fns";
import { apiFetch } from "@/lib/apiClient";
import { nowInAppTimezone } from "@/lib/timezone";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";

interface InspectorPayment {
  inspectorId: string;
  inspectorName: string;
  inspectorCode: string;
  orderCount: number;
  categoryBreakdown: {
    regular: { count: number; value: number };
    exterior: { count: number; value: number };
    interior: { count: number; value: number };
    fint: { count: number; value: number };
  };
  totalValue: number;
}

interface AssistantPayment {
  assistantId: string;
  assistantName: string;
  orderCount: number;
  categoryBreakdown: {
    regular: { count: number; value: number };
    exterior: { count: number; value: number };
    interior: { count: number; value: number };
    fint: { count: number; value: number };
  };
  totalValue: number;
  inspectors: InspectorPayment[];
}

interface TeamPayments {
  assistants: AssistantPayment[];
  totalAssistantValue: number;
  totalInspectorValue: number;
  totalOrders: number;
}

export type Period = "week" | "month" | "custom";

interface UseTeamPaymentsOptions {
  period: Period;
  customStart?: string;
  customEnd?: string;
}

type TeamPaymentsResponse = {
  ok: true;
  range: { closed_from: string; closed_to: string };
  payments: TeamPayments;
  warnings?: string[];
};

function getDateRangeForPeriod(options: UseTeamPaymentsOptions) {
  const now = nowInAppTimezone();

  if (options.period === "week") {
    return {
      start: format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd"),
      end: format(endOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd"),
    };
  }

  if (options.period === "month") {
    return {
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }

  return {
    start: options.customStart || format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd"),
    end: options.customEnd || format(endOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd"),
  };
}

export function useTeamPayments(options: UseTeamPaymentsOptions) {
  const { user, getToken } = useAuth();
  const { isAdmin, isMaster } = useUserRole();

  const { period, customStart, customEnd } = options;
  const range = useMemo(
    () => getDateRangeForPeriod({ period, customStart, customEnd }),
    [customEnd, customStart, period],
  );
  const rangeKey = useMemo(() => `${range.start}..${range.end}`, [range.end, range.start]);

  const query = useQuery({
    queryKey: ["team-payments", user?.id ?? null, period, rangeKey],
    enabled: !!user && (isAdmin || isMaster),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      const qs = new URLSearchParams();
      qs.set("closed_from", range.start);
      qs.set("closed_to", `${range.end}T23:59:59`);
      return await apiFetch<TeamPaymentsResponse>({ getToken }, `/api/orders/team-payments?${qs.toString()}`, {
        bypassFreeze: true,
      });
    },
  });

  return {
    payments: query.data?.payments ?? null,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    refetch: query.refetch,
  };
}
