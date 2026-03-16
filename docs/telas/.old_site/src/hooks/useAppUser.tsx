import { useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export type AppRole = "user" | "admin" | "master";

export type Persona = "assistant" | "inspector";

export type AppUser = {
  id: string; // public.users.id (ID interno; tratar como string)
  role: AppRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  weekly_goal: number | null;
  active: boolean;
  clerk_user_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type InspectorContext = {
  origin: {
    origin_city: string;
    origin_state: string | null;
    origin_zip: string | null;
  } | null;
  assignment: {
    id: string;
    inspector_id: string;
    inspector_code?: string | null;
    inspector_name?: string | null;
    assigned_at: string | null;
  } | null;
} | null;

type MeResponse = {
  ok: true;
  clerkUserId: string;
  sessionId: string | null;
  user: AppUser | null;
  persona?: Persona | null;
  inspector?: InspectorContext | null;
};

export function useAppUser() {
  const { user: clerkUser, getToken, loading: authLoading } = useAuth();
  const { user: clerk } = useUser();
  const queryClient = useQueryClient();

  const meQueryKey = useMemo(() => ["me", clerkUser?.id ?? null] as const, [clerkUser?.id]);

  const meQuery = useQuery({
    queryKey: meQueryKey,
    enabled: !!clerkUser && !authLoading,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    queryFn: async () => {
      return await apiFetch<MeResponse>({ getToken }, "/api/me");
    },
  });

  const appUser = meQuery.data?.user ?? null;
  const persona = meQuery.data?.persona ?? null;
  const inspector = (meQuery.data?.inspector ?? null) as InspectorContext | null;

  useEffect(() => {
    if (!clerkUser) return;
    if (!meQuery.data) return;

    const res = meQuery.data;

    const clerkFullName = clerk?.fullName ? String(clerk.fullName).trim() : "";
    const clerkEmail = clerk?.primaryEmailAddress?.emailAddress
      ? String(clerk.primaryEmailAddress.emailAddress).trim()
      : "";
    const clerkAvatarUrl = clerk?.imageUrl ? String(clerk.imageUrl).trim() : "";

    const wantsSync =
      (!res.user?.full_name && !!clerkFullName) || (!res.user?.email && !!clerkEmail) || !!clerkAvatarUrl;
    if (!wantsSync) return;

    const syncKey = `me:identitySynced:v3:${clerkUser.id}`;
    try {
      if (localStorage.getItem(syncKey)) return;
      localStorage.setItem(syncKey, "pending");
    } catch {
      // ignore (localStorage not available)
      return;
    }

    (async () => {
      try {
        const patchRes = await apiFetch<MeResponse>({ getToken }, "/api/me", {
          method: "PATCH",
          bypassFreeze: true,
          body: JSON.stringify({
            ...(res.user?.full_name ? {} : clerkFullName ? { full_name: clerkFullName } : {}),
            ...(res.user?.email ? {} : clerkEmail ? { email: clerkEmail } : {}),
            ...(clerkAvatarUrl ? { avatar_url: clerkAvatarUrl } : {}),
          }),
        });

        queryClient.setQueryData(meQueryKey, (prev: MeResponse | undefined) => {
          if (!prev) return patchRes;
          return {
            ...prev,
            user: patchRes.user ?? prev.user,
          };
        });
        localStorage.setItem(syncKey, new Date().toISOString());
      } catch {
        // ignore (non-blocking)
      }
    })();
  }, [clerkUser, clerk, getToken, meQuery.data, meQueryKey, queryClient]);

  return {
    appUser,
    persona,
    inspector,
    isLoading: authLoading || meQuery.isLoading,
    error: (meQuery.error as Error | null) ?? null,
    refetch: () => meQuery.refetch(),
  };
}
