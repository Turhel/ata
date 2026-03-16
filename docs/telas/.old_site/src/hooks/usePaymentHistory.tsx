import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';
import { apiFetch } from '@/lib/apiClient';

interface PaymentRecord {
  id: string;
  period_start: string;
  period_end: string;
  order_count: number;
  total_value: number;
  status: 'processing' | 'paid';
  paid_at: string | null;
  paid_by: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

interface UsePaymentHistoryOptions {
  status?: string;
}

export function usePaymentHistory(options: UsePaymentHistoryOptions = {}) {
  const { user, getToken } = useAuth();
  const { isAdmin, isMaster } = useUserRole();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!user || (!isAdmin && !isMaster)) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const batchesRes = await apiFetch<{ ok: true; batches: any[] }>(
        { getToken },
        '/api/payments/batches'
      );

      let batches = batchesRes.batches || [];
      if (isAdmin && !isMaster) {
        batches = batches.filter((b) => b.created_by === user.id);
      }
      if (options.status && options.status !== 'all') {
        batches = batches.filter((b) => b.status === options.status);
      }

      if (batches.length === 0) {
        setRecords([]);
        return;
      }

      const batchIds = batches.map((b) => b.id).join(',');
      const itemsRes = await apiFetch<{ ok: true; items: { batch_id: string; amount: number }[] }>(
        { getToken },
        `/api/payments/batch-items?batch_ids=${encodeURIComponent(batchIds)}`
      );

      const summaryMap = new Map<string, { count: number; total: number }>();
      (itemsRes.items || []).forEach((item) => {
        const current = summaryMap.get(item.batch_id) || { count: 0, total: 0 };
        summaryMap.set(item.batch_id, {
          count: current.count + 1,
          total: current.total + Number(item.amount || 0),
        });
      });

      const mapped = batches.map((batch) => {
        const summary = summaryMap.get(batch.id) || { count: 0, total: 0 };
        return {
          id: batch.id,
          period_start: batch.period_start,
          period_end: batch.period_end,
          order_count: summary.count,
          total_value: Number(batch.total_value || summary.total || 0),
          status: batch.status,
          paid_at: batch.paid_at,
          paid_by: batch.paid_by,
          notes: batch.notes,
          created_at: batch.created_at,
          created_by: batch.created_by,
        } as PaymentRecord;
      });

      setRecords(mapped);
    } catch (err) {
      console.error('Error fetching payment records:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken, isAdmin, isMaster, options.status]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const markAsPaid = async (id: string, notes?: string) => {
    if (!user) throw new Error('User not authenticated');

    const res = await apiFetch<{ ok: true; batch: any }>(
      { getToken },
      `/api/payments/batches/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: user.id,
          notes: notes || null,
        }),
      }
    );

    await fetchRecords();
    return res.batch;
  };

  const markAsPending = async (id: string) => {
    const res = await apiFetch<{ ok: true; batch: any }>(
      { getToken },
      `/api/payments/batches/${id}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'processing', paid_at: null, paid_by: null }) }
    );

    await fetchRecords();
    return res.batch;
  };

  return {
    records,
    isLoading,
    error,
    refetch: fetchRecords,
    markAsPaid,
    markAsPending,
  };
}
