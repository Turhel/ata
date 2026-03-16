import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import { readCache, writeCache } from '@/lib/cache';
import { useQueryClient } from '@tanstack/react-query';
import { useAppUser } from './useAppUser';

type Profile = {
  id: string;
  // `user_id` aqui representa o `public.users.id` (UUID interno).
  user_id: string;
  clerk_user_id?: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  weekly_goal: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function useProfile() {
  const { user, getToken } = useAuth();
  const queryClient = useQueryClient();
  const { appUser, isLoading: isLoadingMe, error: meError, refetch: refetchMe } = useAppUser();

  const profile = useMemo<Profile | null>(() => {
    if (!appUser) return null;
    return {
      id: appUser.id,
      user_id: appUser.id,
      clerk_user_id: appUser.clerk_user_id ?? null,
      full_name: appUser.full_name,
      email: appUser.email,
      phone: appUser.phone,
      weekly_goal: appUser.weekly_goal ?? null,
      created_at: appUser.created_at ?? null,
      updated_at: appUser.updated_at ?? null,
    };
  }, [appUser]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) throw new Error('User not authenticated');

    const patchRes = await apiFetch<{ ok: true; user?: any }>({ getToken }, '/api/me', {
      method: 'PATCH',
      body: JSON.stringify({
        full_name: updates.full_name,
        phone: updates.phone,
        weekly_goal: updates.weekly_goal,
      }),
    });

    queryClient.setQueryData(['me', user.id], (prev: any) => {
      if (!prev || typeof prev !== 'object') return prev;
      const prevUser = (prev as any).user ?? {};
      const nextUser = {
        ...prevUser,
        ...(patchRes.user && typeof patchRes.user === 'object' ? patchRes.user : {}),
        ...(updates.full_name !== undefined ? { full_name: updates.full_name } : {}),
        ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
        ...(updates.weekly_goal !== undefined ? { weekly_goal: updates.weekly_goal } : {}),
      };
      return { ...(prev as any), user: nextUser };
    });

    return { ...profile, ...updates };
  };

  return {
    profile,
    isLoading: isLoadingMe,
    error: meError ?? null,
    refetch: () => refetchMe(),
    updateProfile,
  };
}

export function useAllProfiles() {
  const { user, getToken } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheKey = useMemo(() => (user ? 'profiles:all' : 'profiles:all:anon'), [user]);

  const fetchProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    try {
      const cached = readCache<Profile[]>(cacheKey, 600_000);
      if (cached) {
        setProfiles(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const res = await apiFetch<{ ok: true; profiles: Profile[] }>(
        { getToken },
        '/api/users/profiles?all=true'
      );
      const next = res.profiles || [];
      setProfiles(next);
      writeCache(cacheKey, next);
    } catch (err) {
      console.error('Error fetching profiles:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken, cacheKey]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return { profiles, isLoading, error, refetch: fetchProfiles };
}
