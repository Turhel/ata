import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useAppUser } from '@/hooks/useAppUser';
import { useUserRole } from './useUserRole';
import { apiFetch } from '@/lib/apiClient';

export interface PaymentRequest {
  id: string;
  assistant_id: string;
  assistant_name?: string;
  period_start: string;
  period_end: string;
  period_type: 'week' | 'month';
  total_orders: number;
  total_value: number;
  category_breakdown: Record<string, { count: number; value: number }>;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  created_at: string;
}

interface CreatePaymentRequestData {
  period_start: string;
  period_end: string;
  period_type: 'week' | 'month';
  total_orders: number;
  total_value: number;
  category_breakdown: Record<string, { count: number; value: number }>;
}

function usePaymentRequestsLegacy() {
  const { user, getToken } = useAuth();
  const { appUser } = useAppUser();
  const { isAdmin, isMaster } = useUserRole();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [myRequests, setMyRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setRequests([]);
      setMyRequests([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      if (isAdmin || isMaster) {
        let assistantIds: string[] = [];

        if (isAdmin && !isMaster) {
          const teamRes = await apiFetch<{
            ok: true;
            teams: { adminId: string; adminClerkUserId?: string | null; assistants: { id: string }[] }[];
          }>({ getToken }, '/api/team-assignments');

          const team = teamRes.teams.find(
            (t) => t.adminId === appUser?.id || (!!t.adminClerkUserId && t.adminClerkUserId === user.id),
          );
          assistantIds = team?.assistants.map((a) => a.id) || [];
          if (assistantIds.length === 0) {
            setRequests([]);
            assistantIds = [];
          }
        }

        const qs = new URLSearchParams();
        if (assistantIds.length) qs.set('assistant_ids', assistantIds.join(','));
        const res = await apiFetch<{ ok: true; requests: PaymentRequest[] }>(
          { getToken },
          `/api/payments/requests?${qs.toString()}`
        );

        const assistantIdsForProfiles = [...new Set((res.requests || []).map((r) => r.assistant_id))];
        let profileMap = new Map<string, string>();
        if (assistantIdsForProfiles.length > 0) {
          const profilesRes = await apiFetch<{ ok: true; profiles: { user_id: string; full_name: string }[] }>(
            { getToken },
            `/api/users/profiles?user_ids=${assistantIdsForProfiles.join(',')}`
          );
          profileMap = new Map(profilesRes.profiles?.map((p) => [p.user_id, p.full_name]) || []);
        }

        const enrichedData = (res.requests || []).map((r) => ({
          ...r,
          assistant_name: profileMap.get(r.assistant_id) || 'Desconhecido',
          category_breakdown: r.category_breakdown as unknown as Record<string, { count: number; value: number }>,
        })) as PaymentRequest[];

        setRequests(enrichedData);
      }

      const ownRes = await apiFetch<{ ok: true; requests: PaymentRequest[] }>(
        { getToken },
        `/api/payments/requests?assistant_ids=${encodeURIComponent(appUser?.id ?? user.id)}`
      );
      setMyRequests((ownRes.requests || []).map((r) => ({
        ...r,
        category_breakdown: r.category_breakdown as unknown as Record<string, { count: number; value: number }>,
      })) as PaymentRequest[]);

    } catch (err) {
      console.error('Error fetching payment requests:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin, isMaster, getToken, appUser?.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = async (data: CreatePaymentRequestData) => {
    if (!user) throw new Error('User not authenticated');

    const existingRes = await apiFetch<{ ok: true; requests: PaymentRequest[] }>(
      { getToken },
      `/api/payments/requests?assistant_ids=${encodeURIComponent(user.id)}&status=pending`
    );
    const existing = (existingRes.requests || []).find(
      (r) => r.period_start === data.period_start && r.period_end === data.period_end
    );

    if (existing) {
      throw new Error("Ja existe uma solicitacao pendente para este periodo");
    }

    const createRes = await apiFetch<{ ok: true; request: PaymentRequest }>(
      { getToken },
      '/api/payments/requests',
      { method: 'POST', body: JSON.stringify(data) }
    );

    await fetchRequests();
    return createRes.request;
  };

  const approveRequest = async (id: string, notes?: string) => {
    if (!user) throw new Error('User not authenticated');

    const res = await apiFetch<{ ok: true; request: PaymentRequest }>(
      { getToken },
      `/api/payments/requests/${id}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'approved', review_notes: notes || null }) }
    );

    await fetchRequests();
    return res.request;
  };

  const rejectRequest = async (id: string, notes: string) => {
    if (!user) throw new Error('User not authenticated');

    const res = await apiFetch<{ ok: true; request: PaymentRequest }>(
      { getToken },
      `/api/payments/requests/${id}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'rejected', review_notes: notes }) }
    );

    await fetchRequests();
    return res.request;
  };

  const hasPendingRequest = (periodStart: string, periodEnd: string): boolean => {
    return myRequests.some(
      (r) => r.period_start === periodStart && r.period_end === periodEnd && r.status === 'pending'
    );
  };

  const getRequestForPeriod = (periodStart: string, periodEnd: string): PaymentRequest | undefined => {
    return myRequests.find(
      (r) => r.period_start === periodStart && r.period_end === periodEnd
    );
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return {
    requests,
    myRequests,
    isLoading,
    error,
    refetch: fetchRequests,
    createRequest,
    approveRequest,
    rejectRequest,
    hasPendingRequest,
    getRequestForPeriod,
    pendingCount,
  };
}

export function usePaymentRequests() {
  return usePaymentRequestsLegacy();
}
