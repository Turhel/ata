import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';
import { readCache, writeCache } from '@/lib/cache';

type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

interface AuditLogWithUser extends AuditLog {
  user_name?: string;
  user_email?: string;
  user_avatar_url?: string | null;
}

interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export function useAuditLogs(pageSize = 20) {
  const { user, getToken } = useAuth();
  const [logs, setLogs] = useState<AuditLogWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize,
    totalCount: 0,
    totalPages: 0,
  });
  const [stats, setStats] = useState<{ total: number; actions: Record<string, number>; resources: Record<string, number> }>({
    total: 0,
    actions: {},
    resources: {},
  });

  const fetchLogs = useCallback(async (page: number, force = false) => {
    if (!user) {
      setLogs([]);
      setIsLoading(false);
      return;
    }

    try {
      const cacheKey = `audit-logs:v2:${page}:${pagination.pageSize}`;
      const cached = !force ? readCache<{
        logs: AuditLogWithUser[];
        stats: { total: number; actions: Record<string, number>; resources: Record<string, number> };
        pagination: PaginationState;
      }>(cacheKey, 300_000) : null;
      if (cached) {
        setLogs(cached.logs);
        setStats(cached.stats);
        setPagination(cached.pagination);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const res = await apiFetch<{
        ok: true;
        logs: AuditLogWithUser[];
        stats: { total: number; actions: Record<string, number>; resources: Record<string, number> };
        pagination: PaginationState;
      }>(
        { getToken },
        `/api/audit-logs?page=${page}&page_size=${pagination.pageSize}`
      );

      setLogs(res.logs || []);
      setStats(res.stats);
      setPagination(res.pagination);
      writeCache(cacheKey, { logs: res.logs || [], stats: res.stats, pagination: res.pagination });
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken, pagination.pageSize]);

  useEffect(() => {
    if (user) {
      fetchLogs(pagination.page);
    }
  }, [user, pagination.page, fetchLogs]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchLogs(page);
    }
  }, [pagination.totalPages, fetchLogs]);

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      goToPage(pagination.page + 1);
    }
  }, [pagination.page, pagination.totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1);
    }
  }, [pagination.page, goToPage]);

  const refetch = useCallback(() => {
    fetchLogs(1, true);
  }, [fetchLogs]);

  return {
    logs,
    isLoading,
    error,
    pagination,
    stats,
    refetch,
    goToPage,
    nextPage,
    prevPage,
  };
}
