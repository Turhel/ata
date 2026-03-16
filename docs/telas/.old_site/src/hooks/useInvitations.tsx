import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';
import { readCache, writeCache } from '@/lib/cache';

type InvitationCode = Database['public']['Tables']['invitation_codes']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

export function useInvitations() {
  const { user, getToken } = useAuth();
  const [invitations, setInvitations] = useState<InvitationCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheKey = useMemo(() => 'invitations:all', []);

  const fetchInvitations = useCallback(async (force = false) => {
    if (!user) {
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    try {
      const cached = !force ? readCache<InvitationCode[]>(cacheKey, 600_000) : null;
      if (cached) {
        setInvitations(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const res = await apiFetch<{ ok: true; invitations: InvitationCode[] }>(
        { getToken },
        '/api/invitations'
      );
      const next = res.invitations || [];
      setInvitations(next);
      writeCache(cacheKey, next);
    } catch (err) {
      console.error('Error fetching invitations:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken, cacheKey]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const createInvitation = async (role: AppRole, expiresAt?: string | null) => {
    if (!user) throw new Error('User not authenticated');

    const res = await apiFetch<{ ok: true; invitation: InvitationCode }>(
      { getToken },
      '/api/invitations',
      {
        method: 'POST',
        body: JSON.stringify({ role, expires_at: expiresAt || null }),
      },
    );
    setInvitations((prev) => {
      const next = [res.invitation, ...prev];
      writeCache(cacheKey, next);
      return next;
    });
    return res.invitation;
  };

  const expireInvitation = async (id: string) => {
    const res = await apiFetch<{ ok: true; invitation: InvitationCode }>(
      { getToken },
      `/api/invitations/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action: 'expire' }),
      },
    );
    setInvitations((prev) => {
      const next = prev.map((inv) => (inv.id === id ? res.invitation : inv));
      writeCache(cacheKey, next);
      return next;
    });
  };

  const deleteInvitation = async (id: string) => {
    await apiFetch<{ ok: true }>({ getToken }, `/api/invitations/${id}`, { method: 'DELETE' });
    setInvitations((prev) => {
      const next = prev.filter((inv) => inv.id !== id);
      writeCache(cacheKey, next);
      return next;
    });
  };

  const now = new Date();
  const stats = {
    total: invitations.length,
    available: invitations.filter(i => !i.used_at && (!i.expires_at || new Date(i.expires_at) >= now)).length,
    used: invitations.filter(i => i.used_at).length,
    expired: invitations.filter(i => !i.used_at && i.expires_at && new Date(i.expires_at) < now).length,
  };

  return {
    invitations,
    isLoading,
    error,
    stats,
    refetch: () => fetchInvitations(true),
    createInvitation,
    expireInvitation,
    deleteInvitation,
  };
}
