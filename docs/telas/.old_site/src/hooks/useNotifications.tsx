import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '@/lib/apiClient';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';
import { useVisibilityInterval } from '@/hooks/useVisibilityInterval';
import { readCache, writeCache } from '@/lib/cache';
import { DEFAULT_POLLING_HIDDEN_MS, DEFAULT_POLLING_VISIBLE_MS } from '@/lib/polling';

type Notification = Database['public']['Tables']['notifications']['Row'];

export function useNotifications() {
  const { user, getToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheKey = useMemo(() => (user ? `notifications:${user.id}` : 'notifications:anon'), [user]);

  const fetchNotifications = useCallback(async (force = false) => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      const cached = !force ? readCache<Notification[]>(cacheKey, 300_000) : null;
      if (cached) {
        setNotifications(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const res = await apiFetch<{ ok: true; notifications: Notification[] }>(
        { getToken },
        '/api/notifications'
      );
      const next = res.notifications || [];
      setNotifications(next);
      writeCache(cacheKey, next);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [user, getToken, cacheKey]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useVisibilityInterval(
    () => {
      if (user) fetchNotifications();
    },
    { intervalMs: DEFAULT_POLLING_VISIBLE_MS, hiddenIntervalMs: DEFAULT_POLLING_HIDDEN_MS, enabled: !!user }
  );

  const markAsRead = async (id: string) => {
    await apiFetch<{ ok: true }>({ getToken }, `/api/notifications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    });
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n));
      writeCache(cacheKey, next);
      return next;
    });
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await apiFetch<{ ok: true }>({ getToken }, '/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    setNotifications((prev) => {
      const now = new Date().toISOString();
      const next = prev.map((n) => (n.read ? n : { ...n, read: true, read_at: now }));
      writeCache(cacheKey, next);
      return next;
    });
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;

    await apiFetch<{ ok: true }>({ getToken }, `/api/notifications/${id}`, {
      method: 'DELETE',
    });
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      writeCache(cacheKey, next);
      return next;
    });
  };

  const deleteReadNotifications = async () => {
    if (!user) return;

    await apiFetch<{ ok: true }>({ getToken }, '/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'delete_read' }),
    });
    setNotifications((prev) => {
      const next = prev.filter((n) => !n.read);
      writeCache(cacheKey, next);
      return next;
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const readCount = notifications.filter(n => n.read).length;

  return {
    notifications,
    isLoading,
    error,
    unreadCount,
    readCount,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
  };
}

export function useSendNotification() {
  const { user, getToken } = useAuth();

  const sendNotification = async (
    userId: string,
    title: string,
    message: string,
    type: string = 'info'
  ) => {
    if (!user) throw new Error('User not authenticated');

      const res = await apiFetch<{ ok: true; notification: Notification }>(
        { getToken },
        '/api/notifications',
        {
          method: 'POST',
          body: JSON.stringify({ user_id: userId, title, message, type }),
        }
      );
    return res.notification;
  };

  return { sendNotification };
}
