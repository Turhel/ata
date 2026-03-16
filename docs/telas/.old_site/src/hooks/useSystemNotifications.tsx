import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export function useSystemNotifications() {
  const { user } = useAuth();

  // Request permission on mount
  useEffect(() => {
    if (!user) return;
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [user]);

  const sendSystemNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications');
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          ...options,
        });
      } catch (err) {
        console.error('Error creating notification:', err);
      }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return 'denied';
    }
    
    const permission = await Notification.requestPermission();
    return permission;
  }, []);

  const isSupported = 'Notification' in window;
  const permission = isSupported ? Notification.permission : 'denied';

  return {
    isSupported,
    permission,
    requestPermission,
    sendSystemNotification,
  };
}
