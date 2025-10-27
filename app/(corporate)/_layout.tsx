// app/(corporate)/_layout.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, useWindowDimensions, AppState, View, Text } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Chrome as Dashboard, FileText, MessageSquare, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { useResetBadgeOnLogout } from '@/app/services/utils/useResetBadgeOnLogout';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

// --- Notifications & logs (erreurs masquées côté client) ---
const notifyError = (_msg?: string) => {};
const logError = (scope: string, err: unknown) => {
  if (__DEV__) console.error(`[${scope}]`, err);
};

// -------- Responsive helpers --------
function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isSmallPhone = width < 360;
  const scale = Math.min(Math.max(width / 390, 0.9), 1.2);
  return { width, height, isLandscape, isTablet, isSmallPhone, scale };
}

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

export default function CorporateTabLayout() {
  const { user } = useAuth();
  useResetBadgeOnLogout(user); // ✅ remet le badge à 0 à la déconnexion

  const r = useResponsive();

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);
  const uid = useMemo(() => (user?.id ? Number(user.id) : undefined), [user?.id]);

  // Redirection sécurisée (silencieuse côté client)
  useEffect(() => {
    try {
      if (user && user.role !== 'corporate') router.replace('/(tabs)');
    } catch (e) {
      logError('corporate-tabs.redirect', e);
      notifyError();
    }
  }, [user]);

  // ---- Init notifications (autorisations + canal Android avec showBadge)
  useEffect(() => {
    const initNotif = async () => {
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
    initNotif();
  }, []);

  // ---- Helpers
  const formatBadge = (n: number) => (n > 0 ? (n > 99 ? '99+' : n) : undefined);

  // ---- Source de vérité : user_conversation_unreads + service_request(submitted pour id_companie)
  const fetchUnreadCounts = useCallback(async () => {
    if (!uid) {
      setUnreadMessages(0);
      setUnreadRequests(0);
      await Notifications.setBadgeCountAsync(0).catch(() => {});
      return;
    }

    let totalMsgs = 0;
    let totalReqs = 0;

    // Messages non lus (somme des lignes pour ce user)
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

    // Demandes "submitted" pour cette entreprise
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

    // ✅ Badge d’icône = messages + demandes (calcul immédiat avec les totaux locaux)
    await Notifications.setBadgeCountAsync(totalMsgs + totalReqs).catch(() => {});
  }, [uid]);

  // ---- Premier chargement + refresh périodique
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

  // ---- Realtime : recalcule quand les tables changent
  useEffect(() => {
    if (!uid) return;

    const appStateSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') fetchUnreadCounts();
    });

    const ch = supabase
      .channel(`corp-badges-${uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_conversation_unreads', filter: `user_id=eq.${uid}` },
        () => fetchUnreadCounts()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_request', filter: `id_companie=eq.${uid}` },
        () => fetchUnreadCounts()
      )
      .subscribe();

    // Nouveaux messages dans MES conversations (fallback supplémentaire)
    let chMsgs: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: convs } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', uid);
      const ids = (convs ?? []).map((c: any) => Number(c.conversation_id)).filter(Boolean);
      if (!ids.length) return;

      chMsgs = supabase
        .channel(`corp-msgs-${uid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=in.(${ids.join(',')})` },
          () => fetchUnreadCounts()
        )
        .subscribe();
    })();

    return () => {
      appStateSub.remove();
      supabase.removeChannel(ch);
      if (chMsgs) supabase.removeChannel(chMsgs);
    };
  }, [uid, fetchUnreadCounts]);

  // ---- Reset badge si déconnexion
  useEffect(() => {
    if (!uid) Notifications.setBadgeCountAsync(0).catch(() => {});
  }, [uid]);

  if (!user || user.role !== 'corporate') return null;

  const { tabBarHeight, tabBarPaddingBottom, iconSize, labelFontSize } = useMemo(() => {
    const tabBarHeight =
      Platform.OS === 'ios'
        ? (r.isTablet ? 68 : r.isSmallPhone ? 52 : 56)
        : (r.isTablet ? 62 : r.isSmallPhone ? 50 : 54);
    const tabBarPaddingBottom = Platform.OS === 'ios' ? (r.isTablet ? 12 : 8) : 6;
    const iconSize = r.isTablet ? 26 : r.isSmallPhone ? 20 : 22;
    const labelFontSize = r.isTablet ? 13 : r.isSmallPhone ? 10 : 12;
    return { tabBarHeight, tabBarPaddingBottom, iconSize, labelFontSize };
  }, [r.isTablet, r.isSmallPhone]);

  // ✅ SOMME affichée sur le logo du header
  const totalForHeader = unreadMessages + unreadRequests;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <StatusBar style="dark" hidden={false} translucent backgroundColor="transparent" />

      <Tabs
        
        screenOptions={{
          headerShown: true,
          headerTitle: () => <LogoWithBadge />, // 👈 somme sur le logo
          tabBarActiveTintColor: '#0066CC',
          tabBarInactiveTintColor: '#64748b',
          tabBarShowLabel: !r.isSmallPhone || r.isTablet,
          tabBarLabelStyle: {
            fontSize: labelFontSize,
            marginBottom: Platform.OS === 'ios' ? 0 : 2,
          },
          tabBarItemStyle: { paddingVertical: r.isTablet ? 6 : 2 },
          tabBarStyle: {
            height: tabBarHeight,
            paddingBottom: tabBarPaddingBottom,
          },

          statusBarHidden: false,
          statusBarStyle: Platform.OS === 'ios' ? 'dark' : 'auto',
          statusBarTranslucent: true,
          lazy: true,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Tableau de bord',
            tabBarIcon: ({ color }) => <Dashboard color={color} size={iconSize} />,
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: 'Demandes',
            tabBarIcon: ({ color }) => <FileText color={color} size={iconSize} />,
            tabBarBadge: formatBadge(unreadRequests),
            tabBarBadgeStyle: { backgroundColor: '#EF4444' },
          }}
        />
        <Tabs.Screen
          name="partners"
          options={{
            href: null, // masqué de la barre d’onglets
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messagerie',
            tabBarIcon: ({ color }) => <MessageSquare color={color} size={iconSize} />,
            tabBarBadge: formatBadge(unreadMessages),
            tabBarBadgeStyle: { backgroundColor: '#EF4444' },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color }) => <User color={color} size={iconSize} />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
