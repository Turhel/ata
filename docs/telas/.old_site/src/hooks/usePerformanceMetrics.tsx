import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { apiFetch } from "@/lib/apiClient";
import { formatInAppTimezone, getDateKeyInAppTimezone, nowInAppTimezone } from "@/lib/timezone";
import { useAuth } from "./useAuth";

export type Period = "week" | "month" | "custom";

export interface PerformanceMetrics {
  totalOrders: number;
  approvedOrders: number;
  approvalRate: number;
  estimatedValue: number;
  dailyAverage: number;
}

type AppStatus = "available" | "scheduled" | "submitted" | "followup" | "canceled" | "closed";

export type PerformanceOrder = {
  id: string;
  external_id: string | null;
  otype: string | null;
  category: string | null;
  app_status: AppStatus | null;
  inspector_id: string | null;
  inspector_code: string | null;
  inspector_code_resolved: string | null;
  inspector_name: string | null;
  submitted_at: string | null;
  created_at: string | null;
  address1: string | null;
  address2: string | null;
  followup_suspected: boolean | null;
  followup_suspected_reason: string | null;
};

type OrdersPerformanceResponse = {
  ok: true;
  assistant_id: string;
  range: { submitted_from: string; submitted_to: string };
  metrics: PerformanceMetrics;
  daily: { day_key: string; total: number; approved: number }[];
  categoryData: { name: string; value: number }[];
  inspectorData: {
    inspector_id: string | null;
    inspector_code: string | null;
    code: string;
    name: string;
    orders: number;
    approved: number;
    value: number;
  }[];
  orders?: PerformanceOrder[];
};

function buildPerformanceUrl(fromIso: string, toIso: string, opts?: { includeOrders?: boolean; limit?: number }) {
  const qs = new URLSearchParams();
  qs.set("submitted_from", fromIso);
  qs.set("submitted_to", toIso);
  if (opts?.includeOrders) qs.set("include_orders", "1");
  if (opts?.limit != null) qs.set("limit", String(opts.limit));
  return `/api/orders/performance?${qs.toString()}`;
}

export function usePerformanceMetrics() {
  const { user, getToken } = useAuth();
  const [period, setPeriod] = useState<Period>("week");

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => {
    const now = nowInAppTimezone();
    return {
      from: startOfWeek(now, { weekStartsOn: 0 }),
      to: endOfWeek(now, { weekStartsOn: 0 }),
    };
  });

  useEffect(() => {
    const now = nowInAppTimezone();
    if (period === "week") {
      setDateRange({
        from: startOfWeek(now, { weekStartsOn: 0 }),
        to: endOfWeek(now, { weekStartsOn: 0 }),
      });
    } else if (period === "month") {
      setDateRange({
        from: startOfMonth(now),
        to: endOfMonth(now),
      });
    }
  }, [period]);

  const fromIso = useMemo(() => dateRange.from.toISOString(), [dateRange.from]);
  const toIso = useMemo(() => dateRange.to.toISOString(), [dateRange.to]);

  const summaryQuery = useQuery({
    queryKey: ["orders-performance", user?.id ?? null, fromIso, toIso],
    enabled: !!user,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      return await apiFetch<OrdersPerformanceResponse>({ getToken }, buildPerformanceUrl(fromIso, toIso), {
        bypassFreeze: true,
      });
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["orders-performance-orders", user?.id ?? null, fromIso, toIso],
    enabled: false,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    queryFn: async () => {
      return await apiFetch<OrdersPerformanceResponse>(
        { getToken },
        buildPerformanceUrl(fromIso, toIso, { includeOrders: true, limit: 2000 }),
        { bypassFreeze: true },
      );
    },
  });

  const data = summaryQuery.data;
  const metrics = data?.metrics ?? {
    totalOrders: 0,
    approvedOrders: 0,
    approvalRate: 0,
    estimatedValue: 0,
    dailyAverage: 0,
  };

  const chartData = useMemo(() => {
    const daily = data?.daily ?? [];
    const byDayKey = new Map<string, { total: number; approved: number }>();
    daily.forEach((d) => {
      byDayKey.set(String(d.day_key), { total: Number(d.total ?? 0) || 0, approved: Number(d.approved ?? 0) || 0 });
    });

    return eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map((day) => {
      const dayKey = getDateKeyInAppTimezone(day);
      const label = formatInAppTimezone(day, period === "month" ? "dd/MM" : "EEE", { locale: ptBR });
      const row = byDayKey.get(dayKey);
      return { day: label, ordens: row?.total ?? 0, aprovadas: row?.approved ?? 0 };
    });
  }, [data?.daily, dateRange.from, dateRange.to, period]);

  const categoryData = useMemo(() => data?.categoryData ?? [], [data?.categoryData]);
  const inspectorData = useMemo(() => data?.inspectorData ?? [], [data?.inspectorData]);

  const orders = useMemo(() => ordersQuery.data?.orders ?? [], [ordersQuery.data?.orders]);
  const approvedOrdersList = useMemo(() => orders.filter((o) => o.app_status === "closed"), [orders]);
  const availableInspectors = useMemo(() => inspectorData.map((i) => ({ id: i.code, name: i.name })), [inspectorData]);

  const ordersData = ordersQuery.data?.orders;
  const refetchOrders = ordersQuery.refetch;
  const getOrdersForExport = useCallback(async () => {
    if (ordersData?.length) return ordersData;
    const r = await refetchOrders();
    return r.data?.orders ?? [];
  }, [ordersData, refetchOrders]);

  return {
    period,
    setPeriod,
    dateRange,
    setDateRange,
    loading: summaryQuery.isLoading,
    metrics,
    chartData,
    categoryData,
    inspectorData,
    orders,
    ordersLoading: ordersQuery.isFetching,
    getOrdersForExport,
    approvedOrdersList,
    availableInspectors,
    refetch: summaryQuery.refetch,
  };
}
