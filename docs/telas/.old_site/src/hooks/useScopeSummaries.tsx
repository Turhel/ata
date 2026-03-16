import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/apiClient';

export interface ScopeCategory {
  name: string;
  items: string[];
}

export interface ScopeSummary {
  id: string;
  order_id: string;
  address: string | null;
  loss_reason: string | null;
  route_point: string | null;
  content: ScopeCategory[];
  created_by: string;
  created_at: string;
}

export const useScopeSummaries = () => {
  const { user, getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ['scope-summaries'],
    queryFn: async () => {
      const res = await apiFetch<{ ok: true; summaries: any[] }>(
        { getToken },
        '/api/scopes/summaries'
      );
      return (res.summaries || []).map(item => ({
        ...item,
        content: (item.content as unknown as ScopeCategory[]) || []
      })) as ScopeSummary[];
    },
    enabled: !!user
  });

  const createSummary = useMutation({
    mutationFn: async (summary: Omit<ScopeSummary, 'id' | 'created_at' | 'created_by'>) => {
      if (!user) throw new Error('Usuario nao autenticado');

      const res = await apiFetch<{ ok: true; summary: any }>(
        { getToken },
        '/api/scopes/summaries',
        {
          method: 'POST',
          body: JSON.stringify({
            order_id: summary.order_id,
            address: summary.address,
            loss_reason: summary.loss_reason,
            route_point: summary.route_point,
            content: JSON.parse(JSON.stringify(summary.content)),
          })
        }
      );

      return res.summary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-summaries'] });
      toast.success('Resumo de escopo salvo!');
    },
    onError: (error) => {
      console.error('Error creating summary:', error);
      toast.error('Erro ao salvar resumo');
    }
  });

  const searchOrderData = async (orderId: string) => {
    const tryFetchOrder = async (archived: boolean) => {
      const orderRes = await apiFetch<{ ok: true; items: any[] }>(
        { getToken },
        `/api/orders?external_id=${encodeURIComponent(orderId)}&limit=1&archived=${archived ? "true" : "false"}`
      );
      return orderRes.items?.[0] ?? null;
    };

    const orderData = (await tryFetchOrder(false)) ?? (await tryFetchOrder(true));

    if (orderData) {
      const address = [orderData.address1, orderData.address2].filter(Boolean).join(' ').trim();
      return {
        worder: orderData.external_id,
        address: address || null,
        city: orderData.city,
        state: orderData.state,
        zip: orderData.zip,
        otype: orderData.otype,
      };
    }

    return null;
  };

  const findExistingSummary = async (orderId: string) => {
    const res = await apiFetch<{ ok: true; summaries: any[] }>(
      { getToken },
      `/api/scopes/summaries?order_id=${encodeURIComponent(orderId)}`
    );

    const data = res.summaries?.[0];

    if (data) {
      return {
        ...data,
        content: (data.content as unknown as ScopeCategory[]) || []
      } as ScopeSummary;
    }
    return null;
  };

  return {
    summaries,
    isLoading,
    createSummary: createSummary.mutateAsync,
    isCreating: createSummary.isPending,
    searchOrderData,
    findExistingSummary
  };
};
