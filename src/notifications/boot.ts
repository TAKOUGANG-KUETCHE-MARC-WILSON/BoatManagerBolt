// src/notifications/boot.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/src/lib/supabase';

export async function ensureNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
}

export async function registerForPush(userId: number) {
  try {
    console.log('[push] registerForPush start');

    // Expo Go (SDK 53) ne supporte plus les remote push -> utiliser un Dev Build
    if (!Device.isDevice) {
      console.warn('[push] Not a physical device / Expo Go limitation. Use a Dev Build.');
      return null;
    }

    // Permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[push] permission not granted');
      return null;
    }

    // Récupération du token Expo (avec projectId si dispo via EAS)
    const projectId =
      (Constants?.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    const platform = Platform.OS;
    console.log('[push] got token', token);

    if (!userId || Number.isNaN(Number(userId))) {
      console.warn('[push] Missing userId, skip RPC upsert');
      return token;
    }

    // Appel UNIQUE : RPC SECURITY DEFINER (pas d'upsert direct -> évite l'erreur RLS)
    const { error: rpcError } = await supabase.rpc('upsert_push_token_user', {
      p_user_id: Number(userId),
      p_token: token,
      p_platform: platform,
    });

    if (rpcError) {
      console.error('[push] rpc upsert_push_token_user failed', rpcError);
    } else {
      console.log('[push] rpc upsert_push_token_user OK');
    }

    return token;
  } catch (e) {
    console.error('[push] registerForPush exception', e);
    return null;
  }
}

// Handler foreground (affiche l’alerte quand l’app est ouverte)
export function installForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
}

// Met à jour le badge app via une RPC existante côté DB
export async function refreshAppBadge(userId: number) {
  const { data, error } = await supabase
    .rpc('get_total_unread_messages', { p_user_id: userId });

  const total = error ? 0 : (data ?? 0);
  await Notifications.setBadgeCountAsync(total);
  return total;
}

// Abonnement temps réel aux nouveaux messages pour MAJ badge & callbacks
let rtChannel: ReturnType<typeof supabase.channel> | null = null;

export async function subscribeRealtimeUnread(userId: number, onAnyNewMessage?: () => void) {
  const { data: convos } = await supabase
    .rpc('list_conversation_ids', { p_user_id: userId });

  const ids: number[] = (convos ?? []).map((r: any) => r.conversation_id);
  if (!ids.length) return () => {};

  if (rtChannel) {
    supabase.removeChannel(rtChannel);
    rtChannel = null;
  }

  rtChannel = supabase.channel(`msg-for-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=in.(${ids.join(',')})`,
    }, async (payload) => {
      const row = payload.new as any;
      if (row.sender_id === userId) return; // ignore mes propres messages
      await refreshAppBadge(userId);
      onAnyNewMessage?.();
    })
    .subscribe();

  return () => {
    if (rtChannel) supabase.removeChannel(rtChannel);
    rtChannel = null;
  };
}

// À appeler au login ET à chaque retour en foreground
export async function bootOnLoginOrReopen(userId?: number, onAnyNewMessage?: () => void) {
  if (!userId) return;
  await ensureNotificationChannels();
  installForegroundHandler();
  await registerForPush(userId);
  await refreshAppBadge(userId);
  return subscribeRealtimeUnread(userId, onAnyNewMessage);
}
