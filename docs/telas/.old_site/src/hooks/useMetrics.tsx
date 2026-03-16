import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import { readCache, writeCache, clearCache } from '@/lib/cache';

interface DailyMetric {
  id: number;
  date: string;
  metric_type: string;
  metric_value: number;
  user_id?: string;
  created_at: string;
}

interface UseMetricsOptions {
  startDate: string;
  endDate: string;
  metricType?: string;
  userId?: string;
}

export function useMetrics(options: UseMetricsOptions) {
  const { user, getToken } = useAuth();
  const [metrics, setMetrics] = useState<DailyMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = `metrics:${options.startDate}:${options.endDate}:${options.metricType || 'all'}:${options.userId || 'all'}`;

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      setMetrics([]);
      setIsLoading(false);
      return;
    }

    try {
      const cached = readCache<DailyMetric[]>(cacheKey, 300000); // 5 minutos de cache
      if (cached) {
        setMetrics(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const qs = new URLSearchParams({
        start_date: options.startDate,
        end_date: options.endDate,
      });

      if (options.metricType) qs.set('metric_type', options.metricType);
      if (options.userId) qs.set('user_id', options.userId);

      const res = await apiFetch<{ ok: true; metrics: DailyMetric[] }>(
        { getToken },
        `/api/metrics/daily?${qs.toString()}`
      );

      setMetrics(res.metrics || []);
      writeCache(cacheKey, res.metrics || []);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken, cacheKey, options.startDate, options.endDate, options.metricType, options.userId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const createMetric = async (metric: Omit<DailyMetric, 'id' | 'created_at'>) => {
    if (!user) throw new Error('User not authenticated');

    const res = await apiFetch<{ ok: true }>(
      { getToken },
      '/api/metrics/daily',
      {
        method: 'POST',
        body: JSON.stringify(metric),
      }
    );

    // Invalidar cache
    clearCache(cacheKey);
    await fetchMetrics();

    return res;
  };

  return {
    metrics,
    isLoading,
    error,
    refetch: fetchMetrics,
    createMetric,
  };
}
