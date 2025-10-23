// utils/useResetBadgeOnLogout.ts
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

export function useResetBadgeOnLogout<T extends { id?: number }>(user?: T | null) {
  const prev = useRef(user);
  useEffect(() => {
    const hadUser = !!prev.current?.id;
    const hasUser = !!user?.id;

    // On ne remet à zéro QUE si on passe de connecté -> déconnecté
    if (hadUser && !hasUser) {
      Notifications.setBadgeCountAsync(0).catch(() => {});
    }
    prev.current = user ?? null;
  }, [user]);
}
