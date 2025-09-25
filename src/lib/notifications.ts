// src/lib/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "@/src/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPush(userId?: number) {
  if (!Device.isDevice || !userId) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return null;

  // Android: crée le channel "default" (Expo push utilise ce channel par défaut)
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      showBadge: true,
      enableVibrate: true,
    });
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  // On passe par le RPC qui s'appuie sur auth() côté serveur (pas de user_id côté client)
  await supabase.rpc("upsert_push_token", {
    p_token: token,
    p_platform: Platform.OS,
  });

  return token;
}

export async function refreshAppBadge(userId?: number) {
  if (!userId) return 0;

  // ✅ Utilise le RPC RLS-safe
  const { data, error } = await supabase.rpc("get_total_unread_messages", {
    p_user_id: userId,
  });

  const total = error ? 0 : (data ?? 0);
  await Notifications.setBadgeCountAsync(total);
  return total;
}
