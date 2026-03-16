import { useMemo } from 'react';
import type { Database } from '@/integrations/supabase/types';
import { useAppUser } from '@/hooks/useAppUser';

type AppRole = Database['public']['Enums']['app_role'];

interface UserRoleState {
  roles: AppRole[];
  isLoading: boolean;
  isAssistant: boolean;
  isAdmin: boolean;
  isMaster: boolean;
  highestRole: AppRole | null;
}

export function useUserRole(): UserRoleState {
  const { appUser, isLoading } = useAppUser();
  const roles = useMemo(() => {
    const role = appUser?.role ?? null;
    return role ? [role as AppRole] : [];
  }, [appUser?.role]);

  const isAssistant = roles.includes('user' as AppRole);
  const isAdmin = roles.includes('admin' as AppRole);
  const isMaster = roles.includes('master' as AppRole);

  // Determine highest role for navigation purposes
  let highestRole: AppRole | null = null;
  if (isMaster) highestRole = 'master';
  else if (isAdmin) highestRole = 'admin';
  else if (isAssistant) highestRole = 'user';

  return {
    roles,
    isLoading,
    isAssistant,
    isAdmin,
    isMaster,
    highestRole,
  };
}
