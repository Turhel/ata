import { useMemo } from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/clerk-react";

type LegacyAuth = {
  user: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    user_metadata?: { full_name?: string | null; name?: string | null };
  } | null;
  loading: boolean;
  isAuthenticated: boolean;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

export function useAuth(): LegacyAuth {
  const { isLoaded, isSignedIn, getToken, userId } = useClerkAuth();
  const { signOut } = useClerk();
  const { user } = useUser();

  const legacyUser = useMemo(() => {
    if (!isSignedIn || !userId) return null;
    const fullName = user?.fullName ?? [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
    return {
      id: userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      fullName: fullName || null,
      user_metadata: {
        full_name: fullName || null,
        name: user?.username ?? null,
      },
    };
  }, [isSignedIn, userId, user]);

  return {
    user: legacyUser,
    loading: !isLoaded,
    isAuthenticated: !!isSignedIn,
    getToken,
    signOut: async () => {
      await signOut();
    },
  };
}
