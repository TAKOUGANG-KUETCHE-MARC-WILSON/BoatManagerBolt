// src/lib/notifications.ts

export {
  ensureNotificationChannels,
  registerForPush,
  installForegroundHandler,
  refreshAppBadge,
  subscribeRealtimeUnread,
  bootOnLoginOrReopen,
} from '@/src/notifications/boot';
