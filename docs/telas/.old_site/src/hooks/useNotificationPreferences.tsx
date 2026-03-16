import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { readCache, writeCache } from '@/lib/cache';

export interface NotificationPreferences {
  email_notifications: boolean;
  order_updates: boolean;
  weekly_report: boolean;
  system_alerts: boolean;
  due_date_alerts: boolean;
}

const defaultPreferences: NotificationPreferences = {
  email_notifications: true,
  order_updates: true,
  weekly_report: true,
  system_alerts: true,
  due_date_alerts: true,
};

export function useNotificationPreferences() {
  const { user, getToken } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const cacheKey = useMemo(() => (user ? `notification-preferences:${user.id}` : 'notification-preferences:anon'), [user]);

  const fetchPreferences = useCallback(async (force = false) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const cached = !force ? readCache<NotificationPreferences>(cacheKey, 600_000) : null;
      if (cached) {
        setPreferences(cached);
        setIsLoading(false);
        return;
      }

      const res = await apiFetch<{ ok: true; preferences: NotificationPreferences | null; missingTable: boolean }>(
        { getToken },
        '/api/notification-preferences'
      );

      if (res.missingTable || !res.preferences) {
        setPreferences(defaultPreferences);
        writeCache(cacheKey, defaultPreferences);
        return;
      }

      setPreferences(res.preferences);
      writeCache(cacheKey, res.preferences);
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, getToken, cacheKey]);

  useEffect(() => {
    if (user?.id) {
      fetchPreferences();
    }
  }, [user?.id, fetchPreferences]);

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user?.id) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setIsSaving(true);

    try {
      const res = await apiFetch<{ ok: true; preferences: NotificationPreferences | null; missingTable: boolean }>(
        { getToken },
        '/api/notification-preferences',
        {
          method: 'PATCH',
          body: JSON.stringify({
            user_id: user.id,
            ...newPreferences,
          }),
        }
      );

      if (res.missingTable) {
        toast({
          title: 'Prefer??ncia atualizada localmente',
          description: 'Tabela de prefer??ncias ainda n??o existe no banco.',
        });
        writeCache(cacheKey, newPreferences);
        return;
      }

      toast({
        title: 'Prefer??ncia atualizada',
        description: 'Sua prefer??ncia de notifica????o foi salva.',
      });
      writeCache(cacheKey, newPreferences);
    } catch (error) {
      console.error('Error updating notification preference:', error);
      setPreferences(preferences);
      toast({
        title: 'Erro',
        description: 'N??o foi poss??vel salvar a prefer??ncia.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
    preferences,
    isLoading,
    isSaving,
    updatePreference,
  };
}
