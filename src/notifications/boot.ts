// src/notifications/boot.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/src/lib/supabase';

// -------- Types / Options --------
export type RequestScope = 'client' | 'boat_manager' | 'company';
export type BootOptions = {
  /** Quelle colonne de service_request doit être utilisée pour compter/écouter */
  requestScope?: RequestScope;
  /** Quels statuts font partie du total affiché sur le badge */
  requestStatuses?: readonly string[];
};

const REQUEST_BADGE_STATUSES = ['submitted', 'quote_sent'] as const;

// --- Realtime channels (pour clean up global) ---
let msgChannel: ReturnType<typeof supabase.channel> | null = null;
let reqChannel: ReturnType<typeof supabase.channel> | null = null;
let membersChannel: ReturnType<typeof supabase.channel> | null = null;

// --- Subscriptions notification (éviter les doublons) ---
let notifReceivedSub: Notifications.Subscription | null = null;
let notifResponseSub: Notifications.Subscription | null = null;

// -------------------------------------------------
// Notification channels
// -------------------------------------------------
export async function ensureNotificationChannels() {
  if (Platform.OS === 'android') {
    // Canal par défaut
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      showBadge: true,
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    // Canal dédié messages
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      showBadge: true, // indispensable pour la pastille Android (si supportée par le launcher)
      vibrationPattern: [0, 250, 250, 250],
      sound: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }
}

// -------------------------------------------------
// Push token registration
// -------------------------------------------------
export async function registerForPush(userId: number | undefined | null) {
  try {
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

    // Token Expo
    const projectId =
      (Constants?.expoConfig as any)?.extra?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    const platform = Platform.OS;

    if (!userId || Number.isNaN(Number(userId))) {
      console.warn('[push] Missing userId, skip RPC upsert');
      return token;
    }

    // RPC SECURITY DEFINER côté DB
    const { error: rpcError } = await supabase.rpc('upsert_push_token_user', {
      p_user_id: Number(userId),
      p_token: token,
      p_platform: platform,
    });
    if (rpcError) console.error('[push] upsert_push_token_user failed', rpcError);

    return token;
  } catch (e) {
    console.error('[push] registerForPush exception', e);
    return null;
  }
}

// -------------------------------------------------
// Foreground handler (affiche/sonne/badge)
// -------------------------------------------------
export function installForegroundHandler(currentUserId?: number, opts?: BootOptions) {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const d: any = n?.request?.content?.data ?? {};
      const isSelf = !!(currentUserId && Number(d?.sender_id) === Number(currentUserId));

      return {
        // iOS 17+
        shouldShowBanner: !isSelf,
        shouldShowList: !isSelf,
        // iOS <= 16
        shouldShowAlert: !isSelf,
        // commun
        shouldPlaySound: !isSelf,
        // ⚠️ Laisse iOS/Android appliquer la valeur 'badge' portée par le push
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    },
  });

  // Quand une notif est reçue en foreground → applique le badge du push (ou fallback local)
  if (notifReceivedSub) { notifReceivedSub.remove(); notifReceivedSub = null; }
  notifReceivedSub = Notifications.addNotificationReceivedListener(async (evt) => {
    const content = evt?.request?.content as any;
    const badgeFromPush: number | undefined =
      typeof content?.badge === 'number' ? content.badge :
      typeof content?.data?.badge === 'number' ? content.data.badge : undefined;

    try {
      if (typeof badgeFromPush === 'number') {
        await Notifications.setBadgeCountAsync(badgeFromPush);
      } else if (currentUserId) {
        await refreshAppBadge(currentUserId, opts);
      }
    } catch {}
  });

  // Quand l’utilisateur ouvre la notif → resynchronise le badge
  if (notifResponseSub) { notifResponseSub.remove(); notifResponseSub = null; }
  notifResponseSub = Notifications.addNotificationResponseReceivedListener(async () => {
    if (currentUserId) {
      try { await refreshAppBadge(currentUserId, opts); } catch {}
    }
  });
}

// -------------------------------------------------
// Calcule et pose le badge (messages + demandes)
// -------------------------------------------------
export async function refreshAppBadge(userId: number, opts?: BootOptions) {
  const statuses = (opts?.requestStatuses ?? REQUEST_BADGE_STATUSES);
  const statusesArr = [...statuses]; // pour satisfaire la signature .in(...string[])

  // 1) total messages (RPC côté DB)
  const { data: msgTotal, error: msgErr } =
    await supabase.rpc('get_total_unread_messages', { p_user_id: userId });

  // 2) total demandes selon la portée
  let q = supabase.from('service_request').select('id', { count: 'exact', head: true });
  switch (opts?.requestScope) {
    case 'boat_manager':
      q = q.eq('id_boat_manager', userId);
      break;
    case 'company':
      q = q.eq('id_companie', userId);
      break;
    default: // 'client'
      q = q.eq('id_client', userId);
  }
  const { count: reqCount, error: reqErr } = await q.in('statut', statusesArr);

  const totalMessages = msgErr ? 0 : (msgTotal ?? 0);
  const totalRequests = reqErr ? 0 : (reqCount ?? 0);
  const total = totalMessages + totalRequests;

  await Notifications.setBadgeCountAsync(total);
  return { totalMessages, totalRequests, total };
}

// -------------------------------------------------
// Helpers cleanup
// -------------------------------------------------
function cleanupMsgChannel() {
  if (msgChannel) {
    supabase.removeChannel(msgChannel);
    msgChannel = null;
  }
}
function cleanupReqChannel() {
  if (reqChannel) {
    supabase.removeChannel(reqChannel);
    reqChannel = null;
  }
}
function cleanupMembersChannel() {
  if (membersChannel) {
    supabase.removeChannel(membersChannel);
    membersChannel = null;
  }
}

// -------------------------------------------------
// Realtime Unread (messages + demandes + nouvelles conv)
// -------------------------------------------------
export async function subscribeRealtimeUnread(
  userId: number,
  onAnyNewMessage?: () => void,
  opts?: BootOptions
) {
  // (re)crée le canal messages avec la liste d'IDs à jour
  const setupMsgChannel = async () => {
    cleanupMsgChannel();

    const { data: convos, error } = await supabase.rpc('list_conversation_ids', { p_user_id: userId });
    if (error) {
      console.warn('[rt] list_conversation_ids error', error);
      return;
    }
    const ids: number[] = (convos ?? []).map((r: any) => r.conversation_id);
    if (!ids.length) return;

    msgChannel = supabase
      .channel(`msg-for-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=in.(${ids.join(',')})`,
        },
        async (payload) => {
          const row = payload.new as any;
          if (Number(row?.sender_id) === Number(userId)) return; // ignore mes propres messages
          await refreshAppBadge(userId, opts);
          onAnyNewMessage?.();
        }
      )
      .subscribe();
  };

  // 1) Messages des convs actuelles
  await setupMsgChannel();

  // 2) Demandes (toute modif pour CE user -> recalcule si statut pertinent)
  cleanupReqChannel();

  // Choix du champ de filtre selon la portée
  let filterField: 'id_client' | 'id_boat_manager' | 'id_companie' = 'id_client';
  switch (opts?.requestScope) {
    case 'boat_manager':
      filterField = 'id_boat_manager';
      break;
    case 'company':
      filterField = 'id_companie';
      break;
  }
  const statuses = (opts?.requestStatuses ?? REQUEST_BADGE_STATUSES);

  reqChannel = supabase
    .channel(`req-for-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'service_request',
        filter: `${filterField}=eq.${userId}`,
      },
      async (payload) => {
        const s = (payload.new as any)?.statut ?? (payload.old as any)?.statut ?? null;
        if (s && !statuses.includes(s as any)) return;
        await refreshAppBadge(userId, opts);
      }
    )
    .subscribe();

  // 3) On m’ajoute à une nouvelle conversation => re-subscribe messages
  cleanupMembersChannel();
  membersChannel = supabase
    .channel(`members-for-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversation_members',
        filter: `user_id=eq.${userId}`,
      },
      async () => {
        await refreshAppBadge(userId, opts);
        await setupMsgChannel(); // rouvre msgChannel avec la nouvelle liste d’IDs
      }
    )
    .subscribe();

  // -> renvoie un cleanup global
  return () => {
    cleanupMsgChannel();
    cleanupReqChannel();
    cleanupMembersChannel();
    if (notifReceivedSub) { notifReceivedSub.remove(); notifReceivedSub = null; }
    if (notifResponseSub) { notifResponseSub.remove(); notifResponseSub = null; }
  };
}

// -------------------------------------------------
// Boot (à appeler au login et à chaque retour foreground)
// -------------------------------------------------
export async function bootOnLoginOrReopen(
  userId?: number,
  onAnyNewMessage?: () => void,
  opts?: BootOptions
) {
  if (!userId) return;
  await ensureNotificationChannels();
  installForegroundHandler(userId, opts);
  await registerForPush(userId);
  await refreshAppBadge(userId, opts);
  return subscribeRealtimeUnread(userId, onAnyNewMessage, opts);
}

/*
⚠️ IMPORTANT côté serveur (push Expo):
Pour que la pastille “logo” s’actualise même quand l’app est fermée, envoie les pushes
avec un champ `badge` = (non-lus messages + demandes). Exemple payload:

{
  to: <expo-token>,
  title: "Nouveau message",
  body: "...",
  sound: "default",
  channelId: "messages",
  badge: <TOTAL>,           // <- iOS applique direct; Android selon launcher
  data: { badge: <TOTAL>, ... }
}

Le client ci-dessus applique aussi `data.badge` en foreground, et resynchronise
le total à l’ouverture de la notification.
*/
