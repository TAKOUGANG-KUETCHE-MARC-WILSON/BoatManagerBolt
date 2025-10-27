// app/(nautical_company)/_layout.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, AppState, View, Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Chrome as Home, FileText, MessageSquare, User, Calendar, Ship } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { useResetBadgeOnLogout } from '@/app/services/utils/useResetBadgeOnLogout';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

// ------ Logo + badge (somme) dans le header
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

export default function NauticalCompanyTabLayout() {
  const { user, loading } = useAuth();
  useResetBadgeOnLogout(user);

  const appState = useRef(AppState.currentState);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  const uid = useMemo(() => (user?.id ? Number(user.id) : undefined), [user?.id]);
  const isNauticalCompany = user?.role === 'nautical_company';

  // --------- Permissions / channel pour badge d’icône
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

  // --------- Helper badges d’onglets
  const formatBadge = (n: number) => (n > 0 ? (n > 99 ? '99+' : n) : undefined);

  // --------- Calcul des compteurs + badge d’icône
  const fetchUnreadCounts = useCallback(async () => {
    if (!uid) {
      setUnreadMessages(0);
      setUnreadRequests(0);
      await Notifications.setBadgeCountAsync(0).catch(() => {});
      return;
    }

    let totalMsgs = 0;
    let totalReqs = 0;

    // 1) Messages non lus (source de vérité: user_conversation_unreads)
    try {
      const { data, error } = await supabase
        .from('user_conversation_unreads')
        .select('unread_count')
        .eq('user_id', uid);

      totalMsgs = error ? 0 : (data ?? []).reduce((s, r: any) => s + Number(r.unread_count || 0), 0);
      setUnreadMessages(totalMsgs);
    } catch {
      totalMsgs = 0;
      setUnreadMessages(0);
    }

    // 2) Demandes assignées à la société (id_companie = moi) au statut 'submitted'
    try {
      const { count } = await supabase
        .from('service_request')
        .select('id', { count: 'exact', head: true })
        .eq('id_companie', uid)
        .eq('statut', 'submitted');

      totalReqs = count || 0;
      setUnreadRequests(totalReqs);
    } catch {
      totalReqs = 0;
      setUnreadRequests(0);
    }

    // 3) Badge d’icône = somme
    await Notifications.setBadgeCountAsync(totalMsgs + totalReqs).catch(() => {});
  }, [uid]);

  // --------- Redirection quand le rôle est connu
  useEffect(() => {
    if (!loading && !isNauticalCompany) {
      router.replace('/(tabs)');
    }
  }, [loading, isNauticalCompany]);

  // --------- Premier chargement + refresh périodique
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchUnreadCounts();
    })();
    const interval = uid ? setInterval(fetchUnreadCounts, 30_000) : null;
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [uid, fetchUnreadCounts]);

  // --------- Realtime: tables qui impactent les badges
  useEffect(() => {
    if (!uid) return;

    // 1) Changement des agrégats de non-lus
    const chAgg = supabase
      .channel(`nc-agg-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_conversation_unreads', filter: `user_id=eq.${uid}` },
        () => fetchUnreadCounts()
      )
      .subscribe();

    // 2) Mises à jour sur les demandes de la société
    const chReq = supabase
      .channel(`nc-req-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_request', filter: `id_companie=eq.${uid}` },
        () => fetchUnreadCounts()
      )
      .subscribe();

    // 3) Nouveaux messages dans MES conversations (fallback utile)
    let cleanupMessagesChannel: (() => void) | null = null;
    (async () => {
      const { data: convs } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', uid);

      const ids = (convs ?? []).map((c: any) => Number(c.conversation_id)).filter(Boolean);
      if (!ids.length) return;

      const chMsgs = supabase
        .channel(`nc-msgs-${uid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=in.(${ids.join(',')})` },
          () => fetchUnreadCounts()
        )
        .subscribe();

      cleanupMessagesChannel = () => supabase.removeChannel(chMsgs);
    })();

    // 4) Recalcule quand l’app revient en avant-plan
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') fetchUnreadCounts();
    });

    return () => {
      sub.remove();
      supabase.removeChannel(chAgg);
      supabase.removeChannel(chReq);
      if (cleanupMessagesChannel) cleanupMessagesChannel();
    };
  }, [uid, fetchUnreadCounts]);

  // --------- Reset badge si déconnexion
  useEffect(() => {
    if (!uid) Notifications.setBadgeCountAsync(0).catch(() => {});
  }, [uid]);

  // --------- Garde d’affichage
  if (loading) return null;
  if (!isNauticalCompany) return null;

  const totalForHeader = unreadMessages + unreadRequests;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <StatusBar style="dark" backgroundColor="#ffffff" hidden={false} />
      <Tabs
        
        screenOptions={{
          headerShown: true,
          // somme sur le logo du header (toutes les pages)
          headerTitle: () => <LogoWithBadge />,
          tabBarActiveTintColor: '#0066CC',
          tabBarStyle: {
            height: Platform.OS === 'ios' ? 60 : 54,
            paddingBottom: Platform.OS === 'ios' ? 12 : 6,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: 'Demandes',
            tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
            tabBarBadge: formatBadge(unreadRequests),
            tabBarBadgeStyle: { backgroundColor: '#EF4444' },
          }}
        />
        <Tabs.Screen
          name="planning"
          options={{
            title: 'Planning',
            tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
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
          name="services"
          options={{
            title: 'Services',
            tabBarIcon: ({ color, size }) => <Ship color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="quote-upload"
          options={{
            title: 'Devis',
            headerShown: true,
            href: null, // Masqué de la barre d'onglets
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
