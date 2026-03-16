import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

// This is kept for UI labels/colors, not for strict typing of the API payload.
type OrderStatus = Database['public']['Enums']['order_status'];

interface OrderHistoryEntry {
  id: string;
  order_id: string;
  previous_status: OrderStatus | null;
  new_status: OrderStatus | null;
  changed_by: string | null;
  change_reason: string | null;
  details: Record<string, unknown> | null;
  created_at: string | null;
  changed_by_name?: string | null;
}

export function useOrderHistory(orderId: string | null) {
  const { getToken } = useAuth();
  const [history, setHistory] = useState<OrderHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      if (!orderId) {
        setHistory([]);
        return;
      }

      try {
        setIsLoading(true);
        const res = await apiFetch<{ ok: true; history: OrderHistoryEntry[] }>(
          { getToken },
          `/api/orders/history?order_id=${encodeURIComponent(orderId)}`
        );

        setHistory((res.history || []).map((entry) => ({
          ...entry,
          details: entry.details as Record<string, unknown> | null,
        })));
      } catch (err) {
        console.error('Error fetching order history:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
  }, [orderId, getToken]);

  return { history, isLoading, error };
}

export function getStatusLabel(status: OrderStatus | null): string {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    agendada: 'Agendada',
    enviada: 'Enviada',
    em_analise: 'Em An??lise',
    aprovada: 'Aprovada',
    rejeitada: 'Rejeitada',
    cancelada: 'Cancelada',
    nao_realizada: 'N??o Realizada',
    paga: 'Paga',
  };
  return status ? labels[status] || status : 'Desconhecido';
}

export function getStatusColor(status: OrderStatus | null): string {
  const colors: Record<string, string> = {
    pendente: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    agendada: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
    enviada: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
    em_analise: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    aprovada: 'bg-green-500/20 text-green-700 dark:text-green-400',
    rejeitada: 'bg-red-500/20 text-red-700 dark:text-red-400',
    cancelada: 'bg-muted text-muted-foreground',
    nao_realizada: 'bg-red-500/20 text-red-700 dark:text-red-400',
    paga: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  };
  return status ? colors[status] || 'bg-muted text-muted-foreground' : 'bg-muted text-muted-foreground';
}
