import { useMemo, useEffect } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPollingIntervalMs } from "@/lib/polling";
import { apiFetch } from "@/lib/apiClient";
import { useAuth } from "./useAuth";
import { useAppUser } from "@/hooks/useAppUser";
import { useUserRole } from "./useUserRole";
import { clearCacheByPrefix, readCache, writeCache } from "@/lib/cache";

interface ApiOrder {
  id: string;
  external_id: string;
  app_status: string;
  pool_status: string | null;
  otype: string | null;
  client_code: string | null;
  owner_name: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  assistant_id: string | null;
  inspector_id: string | null;
  inspector_code?: string | null;
  hold_until: string | null;
  due_date_confirmed?: boolean | null;
  submitted_at: string | null;
  closed_at: string | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  followup_suspected: boolean | null;
  followup_suspected_reason: string | null;
}

export type Order = {
  id: string;
  external_id: string;
  status: string;
  pool_status: string | null;
  work_type: string | null;
  category: string | null;
  client_code: string | null;
  owner_name: string | null;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  assistant_id: string | null;
  inspector_id: string | null;
  inspector_code?: string | null;
  due_date: string | null;
  due_date_confirmed: boolean | null;
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

export interface OrderWithInspector extends Order {
  inspectors?: InspectorInfo | null;
}

interface OrdersPage {
  items: ApiOrder[];
  nextCursor: string | null;
}

interface UseOrdersOptions {
  assistantId?: string;
  status?: string;
  category?: string;
  limit?: number;
}

function mapOrder(row: ApiOrder): Order {
  return {
    id: row.id,
    external_id: row.external_id,
    status: row.app_status,
    pool_status: row.pool_status,
    work_type: row.otype,
    category: null,
    client_code: row.client_code,
    owner_name: row.owner_name,
    address1: row.address1,
    city: row.city,
    state: row.state,
    zip: row.zip,
    assistant_id: row.assistant_id,
    inspector_id: row.inspector_id,
    inspector_code: row.inspector_code ?? null,
    due_date: row.hold_until,
    due_date_confirmed: row.due_date_confirmed ?? null,
    execution_date: row.submitted_at ?? row.closed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    audit_flag: row.followup_suspected ?? null,
    audit_reason: row.followup_suspected_reason ?? null,
  };
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { user, getToken } = useAuth();
  const { isAdmin, isMaster } = useUserRole();
  const queryClient = useQueryClient();

  const limit = options.limit ?? 20;
  const cacheMaxAgeMs = 30 * 60_000; // 30 min (anti-egress)
  const cacheKey = useMemo(() => {
    const key = {
      v: 2,
      assistantId: options.assistantId ?? null,
      status: options.status ?? null,
      category: options.category ?? null,
      limit,
      role: isAdmin || isMaster ? "admin" : "user",
      userId: user?.id ?? null,
    };
    return `orders:${JSON.stringify(key)}`;
  }, [options.assistantId, options.status, options.category, limit, isAdmin, isMaster, user?.id]);

  const queryKey = useMemo(
    () => ["orders", options.assistantId ?? null, options.status ?? null, limit, isAdmin || isMaster, user?.id],
    [options.assistantId, options.status, limit, isAdmin, isMaster, user?.id]
  );

  const query = useInfiniteQuery({
    queryKey,
    enabled: !!user,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: OrdersPage) => lastPage.nextCursor ?? null,
    // Polling conforme regra de ouro (>=60s, 5min quando hidden)
    refetchInterval: () => getPollingIntervalMs(),
    refetchIntervalInBackground: false,
    // Reduz egress: não refetch ao voltar para a aba (polling já cobre o essencial)
    refetchOnWindowFocus: false,
    // Reduz egress: refetch apenas a primeira página (mais recente) quando o polling rodar
    refetchPage: (_page, index) => index === 0,
    // Reduz egress: quando remonta o componente, usa cache e espera o polling
    refetchOnMount: false,
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams();
      qs.set("limit", String(limit));
      if (pageParam) qs.set("cursor", String(pageParam));

      // Sempre que a tela fornecer `assistantId`, filtra por ele.
      // - Preferir passar `users.id` (UUID interno). A API ainda aceita `clerk_user_id` por compatibilidade.
      // - Para user: a API já restringe por RBAC, mas o filtro explícito ajuda consistência/caching.
      if (options.assistantId) qs.set("assistant_id", options.assistantId);
      if (options.status && options.status !== "all") qs.set("app_status", options.status);

      const res = await apiFetch<{ ok: true; items: ApiOrder[]; nextCursor: string | null }>(
        { getToken },
        `/api/orders?${qs.toString()}`
      );
      return { items: res.items ?? [], nextCursor: res.nextCursor ?? null };
    },
    initialData: () => {
      const cached = readCache<OrdersPage[]>(cacheKey, cacheMaxAgeMs);
      if (!cached || !Array.isArray(cached) || cached.length === 0) return undefined;
      if (!cached.every((p) => p && Array.isArray((p as any).items))) return undefined;
      return {
        pages: cached,
        pageParams: cached.map(() => null),
      } as any;
    },
  });

  useEffect(() => {
    const pages = query.data?.pages;
    if (!pages || !Array.isArray(pages) || pages.length === 0) return;

    // Defensive cap: keep at most 5 pages in localStorage.
    const capped = pages.slice(0, 5).map((p) => ({
      items: Array.isArray(p.items) ? p.items : [],
      nextCursor: p.nextCursor ?? null,
    }));
    writeCache(cacheKey, capped);
  }, [cacheKey, query.data?.pages]);

  const orders = useMemo(() => {
    const items = query.data?.pages.flatMap((page) => page.items) ?? [];
    return items.map(mapOrder) as OrderWithInspector[];
  }, [query.data]);

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    const payload: Record<string, any> = { ...updates };
    if ("status" in payload && payload.status !== undefined) {
      payload.app_status = payload.status;
      delete payload.status;
    }
    if ("audit_flag" in payload && payload.audit_flag !== undefined) {
      payload.followup_suspected = !!payload.audit_flag;
      delete payload.audit_flag;
    }
    if ("audit_reason" in payload && payload.audit_reason !== undefined) {
      payload.followup_suspected_reason = payload.audit_reason ?? null;
      delete payload.audit_reason;
    }
    if ("due_date" in payload && payload.due_date !== undefined) {
      payload.hold_until = payload.due_date ?? null;
      delete payload.due_date;
    }
    if ("execution_date" in payload && payload.execution_date !== undefined) {
      payload.submitted_at = payload.execution_date ?? null;
      delete payload.execution_date;
    }

    // Se o front marcou como "submitted" e não informou submitted_at, assume agora.
    if (payload.app_status === "submitted" && payload.submitted_at === undefined) {
      payload.submitted_at = new Date().toISOString();
    }

    const res = await apiFetch<{ ok: true; order: ApiOrder }>(
      { getToken },
      `/api/orders/${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );

    queryClient.setQueryData(queryKey, (data: any) => {
      if (!data?.pages) return data;
      const next = {
        ...data,
        pages: data.pages.map((page: OrdersPage) => ({
          ...page,
          items: page.items.map((item) => (item.id === id ? res.order : item)),
        })),
      };
      return next;
    });

    // Ao mutar uma ordem, outras telas dependem de agregados (pending-summary, stats, followups).
    // Preferimos invalidar + limpar caches locais (sem aumentar polling) para evitar UX "stale".
    clearCacheByPrefix("order-stats:");
    clearCacheByPrefix("followups:");
    queryClient.invalidateQueries({ queryKey: ["pending-summary"] });
    queryClient.invalidateQueries({ queryKey: ["order-stats"] });

    return mapOrder(res.order);
  };

  return {
    orders,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
    updateOrder,
  };
}

export function useOrderStats() {
  const { user, getToken } = useAuth();

  type Stats = {
    today: number;
    approved: number;
    pending: number;
    inReview: number;
    rejected: number;
    total: number;
  };

  const empty: Stats = useMemo(
    () => ({ today: 0, approved: 0, pending: 0, inReview: 0, rejected: 0, total: 0 }),
    [],
  );

  const cacheKey = useMemo(() => (user ? `order-stats:v2:${user.id}` : "order-stats:v2:anon"), [user]);
  const queryKey = useMemo(() => ["order-stats", user?.id ?? null], [user?.id]);

  const query = useQuery({
    queryKey,
    enabled: !!user,
    staleTime: 300_000, // 5 min
    refetchInterval: false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    // Refetch quando estiver stale/invalidada para evitar cards "travados" no dashboard
    refetchOnMount: true,
    queryFn: async () => {
      const res = await apiFetch<{ ok: true; stats: Stats }>({ getToken }, `/api/orders/stats?archived=false`);
      return res.stats ?? empty;
    },
    initialData: () => {
      if (!user) return empty;
      const cached = readCache<Stats>(cacheKey, 300_000);
      return cached ?? empty;
    },
  });

  useEffect(() => {
    if (!user) return;
    if (!query.data) return;
    writeCache(cacheKey, query.data);
  }, [cacheKey, query.data, user]);

  return { stats: query.data ?? empty, isLoading: query.isLoading };
}
