// app/(tabs)/_layout.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tabs } from 'expo-router';
import { Platform, AppState, View, Text } from 'react-native';
import { Chrome as Home, MessageSquare, User, FileText } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

import { useResetBadgeOnLogout } from '@/app/services/utils/useResetBadgeOnLogout';

import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { bootOnLoginOrReopen } from '@/src/notifications/boot';
import { supabase } from '@/src/lib/supabase';

// ---- Badge visuel sur le logo du header
const LogoWithBadge = ({ total }: { total: number }) => (
  <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
    <Logo size="small" />
    {total > 0 && (
      <View
        style={{
          position: 'absolute',
          top: -4,
          right: -8,
          backgroundColor: '#EF4444',
          minWidth: 18,
          height: 18,
          paddingHorizontal: 4,
          borderRadius: 9,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
          {total > 99 ? '99+' : total}
        </Text>
      </View>
    )}
  </View>
);

export default function TabLayout() {
  const { user } = useAuth();
  useResetBadgeOnLogout(user);

  const appState = useRef(AppState.currentState);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  const uid = useMemo(() => (user?.id ? Number(user.id) : undefined), [user?.id]);

  // ---- Permissions / channel (badge icône app)
  useEffect(() => {
    const init = async () => {
      if (Platform.OS === 'ios') {
        await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowBadge: true, allowSound: true },
        });
      } else if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
          showBadge: true,
        });
      }
    };
    init();
  }, []);

  const formatBadge = (n: number) => (n > 0 ? (n > 99 ? '99+' : n) : undefined);

  // ---- Calcul unifié (source de vérité = user_conversation_unreads)
  const fetchUnreadCounts = useCallback(async () => {
    if (!uid) {
      setUnreadMessages(0);
      setUnreadRequests(0);
      return;
    }

    let totalMessages = 0;
    let totalRequests = 0;

    // 1) Messages non lus = somme des lignes user_conversation_unreads
    try {
      const { data, error } = await supabase
        .from('user_conversation_unreads')
        .select('unread_count')
        .eq('user_id', uid);

      totalMessages = error ? 0 : (data ?? []).reduce((s, r: any) => s + Number(r.unread_count || 0), 0);
      setUnreadMessages(totalMessages);
    } catch {
      totalMessages = 0;
      setUnreadMessages(0);
    }

    // 2) Demandes “nouvelles / à suivre” côté client
    try {
      const { count, error } = await supabase
        .from('service_request')
        .select('id', { count: 'exact', head: true })
        .eq('id_client', uid)
        .in('statut', ['submitted', 'quote_sent']);

      totalRequests = error ? 0 : (count || 0);
      setUnreadRequests(totalRequests);
    } catch {
      totalRequests = 0;
      setUnreadRequests(0);
    }

    // 3) Badge d’icône = messages + demandes (utiliser les totaux locaux)
    await Notifications.setBadgeCountAsync(totalMessages + totalRequests).catch(() => {});
  }, [uid]);

  // ---- Boot (push) → refresh
  useEffect(() => {
    let unsubscribeRealtime: (() => void) | null = null;
    let mounted = true;

    const wire = async () => {
      if (!uid) return;
      unsubscribeRealtime = await bootOnLoginOrReopen(
        uid,
        async () => { if (mounted) await fetchUnreadCounts(); },
        { requestScope: 'client', requestStatuses: ['submitted', 'quote_sent'] }
      );
    };

    wire();

    const sub = AppState.addEventListener('change', async (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        await bootOnLoginOrReopen(
          uid,
          async () => { await fetchUnreadCounts(); },
          { requestScope: 'client', requestStatuses: ['submitted', 'quote_sent'] }
        );
        await fetchUnreadCounts();
      }
      appState.current = next;
    });

    return () => {
      mounted = false;
      sub.remove();
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [uid, fetchUnreadCounts]);

  // ---- Realtime DB : agrégats, marquage lu et nouveaux messages dans MES convos
  useEffect(() => {
    if (!uid) return;

    let cleanupMessagesChannel: (() => void) | null = null;

    const wireMessagesInsert = async () => {
      const { data: convs } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', uid);

      const ids = (convs ?? []).map((c: any) => Number(c.conversation_id)).filter(Boolean);
      if (!ids.length) return;

      const ch = supabase
        .channel(`tabs-msgs-${uid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=in.(${ids.join(',')})` },
          () => fetchUnreadCounts()
        )
        .subscribe();

      cleanupMessagesChannel = () => supabase.removeChannel(ch);
    };

    const agg = supabase
      .channel(`tabs-agg-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_conversation_unreads', filter: `user_id=eq.${uid}` },
        () => fetchUnreadCounts()
      )
      .subscribe();

    const reads = supabase
      .channel(`tabs-reads-${uid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${uid}` },
        () => fetchUnreadCounts()
      )
      .subscribe();

    wireMessagesInsert();
    const interval = setInterval(fetchUnreadCounts, 30_000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(agg);
      supabase.removeChannel(reads);
      if (cleanupMessagesChannel) cleanupMessagesChannel();
    };
  }, [uid, fetchUnreadCounts]);

  // ---- Premier run
  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await fetchUnreadCounts(); })();
    return () => { cancelled = true; };
  }, [fetchUnreadCounts]);

  const totalForHeader = unreadMessages + unreadRequests;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: '#0066CC',
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 60 : 54,
            paddingBottom: Platform.OS === 'ios' ? 12 : 6,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
            headerTitle: () => <LogoWithBadge  />,
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: 'Mes demandes',
            tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
            tabBarBadge: formatBadge(unreadRequests),
            tabBarBadgeStyle: { backgroundColor: '#EF4444' },
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messagerie',
            tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
            tabBarBadge: formatBadge(unreadMessages),
            tabBarBadgeStyle: { backgroundColor: '#EF4444' },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Mon profil',
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="welcome-unauthenticated"
          options={{ title: 'Mon profil', href: null }}
        />
      </Tabs>
    </SafeAreaView>
  );
}