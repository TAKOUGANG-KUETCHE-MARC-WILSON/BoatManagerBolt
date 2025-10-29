// app/(boat-manager)/_layout.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  TouchableOpacity,
  AppState,
  View,
  Text,
  BackHandler, // ⬅️ ajout
} from 'react-native';
import { Tabs, router, usePathname } from 'expo-router'; // ⬅️ usePathname importé ici
import {
  Users,
  FileText,
  MessageSquare,
  User,
  Calendar,
  Plus,
  ArrowLeft,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import { useResetBadgeOnLogout } from '@/app/services/utils/useResetBadgeOnLogout';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { useFocusEffect } from '@react-navigation/native'; // ⬅️ on l'utilise pour écouter le back quand ce layout est focus

// ---------- Logo + badge dans le header
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

export default function BoatManagerTabLayout() {
  const { user } = useAuth();
  useResetBadgeOnLogout(user); // ✅ remet le badge à 0 quand l'utilisateur se déconnecte

  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);
  const appState = useRef(AppState.currentState);

  const uid = useMemo(() => (user?.id ? Number(user.id) : undefined), [user?.id]);
  const isBoatManager = user?.role === 'boat_manager';

  const pathname = usePathname(); // ⬅️ ex: "/(boat-manager)/clients", "/(boat-manager)/clients-list", etc.

  // --- INTERCEPTION DU BOUTON BACK ANDROID ---
  // Règle :
  //  - si on est sur un onglet racine (clients / requests / company-request / planning / messages / profile)
  //    => quitter l'app
  //  - sinon (ex: clients-list, quote-upload, etc.)
  //    => juste router.back()
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const onBackPress = () => {
        // on extrait juste la dernière partie du chemin
        // "/(boat-manager)/clients-list" -> "clients-list"
        // "/(boat-manager)/clients" -> "clients"
        const lastSegment = pathname
          .split('/')
          .filter(Boolean)
          .pop() || '';

        // Les écrans racine des tabs boat manager :
        const ROOT_TABS = [
          'clients',          // Accueil
          'requests',         // Demandes
          'company-request',  // Création demande
          'planning',         // Planning
          'messages',         // Messagerie
          'profile',          // Profil
        ];

        const isOnRootTab = ROOT_TABS.includes(lastSegment);

        if (isOnRootTab) {
          // 🛑 au lieu de revenir vers un autre layout / welcome-unauthenticated
          // on ferme carrément l'app.
          BackHandler.exitApp();
          return true;
        }

        // Sinon on est sur un écran "secondaire" (ex: clients-list, quote-upload...)
        // -> on revient en arrière dans l'app, pas besoin d'aller ailleurs
        if (router.canGoBack()) {
          router.back();
          return true;
        }

        // fallback parano : si pour une raison chelou on ne peut pas revenir,
        // on ferme l'app pour éviter d'afficher un autre rôle
        BackHandler.exitApp();
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [pathname])
  );
  // --- FIN interception back ---

  const formatBadge = (n: number) => (n > 0 ? (n > 99 ? '99+' : n) : undefined);

  // ---- Init notifs (autorisation + canal Android)
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

  // ---- Source de vérité : user_conversation_unreads + service_request(submitted)
  const fetchUnreadCounts = useCallback(async () => {
    if (!uid) {
      setUnreadMessages(0);
      setUnreadRequests(0);
      await Notifications.setBadgeCountAsync(0).catch(() => {});
      return;
    }

    let totalMsg = 0;
    let totalReq = 0;

    // 1) Messages non lus (somme des lignes pour ce user)
    try {
      const { data, error } = await supabase
        .from('user_conversation_unreads')
        .select('unread_count')
        .eq('user_id', uid);

      totalMsg = error
        ? 0
        : (data ?? []).reduce(
            (s, r: any) => s + Number(r.unread_count || 0),
            0
          );
      setUnreadMessages(totalMsg);
    } catch {
      totalMsg = 0;
      setUnreadMessages(0);
    }

    // 2) Demandes "submitted" pour ce boat manager
    try {
      const { count } = await supabase
        .from('service_request')
        .select('id', { count: 'exact', head: true })
        .eq('id_boat_manager', uid)
        .eq('statut', 'submitted');

      totalReq = count || 0;
      setUnreadRequests(totalReq);
    } catch {
      totalReq = 0;
      setUnreadRequests(0);
    }

    // 3) ✅ Badge d’icône = SOMME immédiate
    await Notifications.setBadgeCountAsync(totalMsg + totalReq).catch(() => {});
  }, [uid]);

  // ---- Garde-fou + premier chargement
  useEffect(() => {
    if (!isBoatManager) {
      // si jamais un autre rôle se retrouve ici par erreur => renvoyer vers l'app plaisancier
      router.replace('/(tabs)');
      return;
    }
    fetchUnreadCounts();
  }, [isBoatManager, fetchUnreadCounts]);

  // ---- Realtime + refresh au retour foreground
  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel(`bm-badges-${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_conversation_unreads',
          filter: `user_id=eq.${uid}`,
        },
        () => fetchUnreadCounts()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_request',
          filter: `id_boat_manager=eq.${uid}`,
        },
        () => fetchUnreadCounts()
      )
      .subscribe();

    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') fetchUnreadCounts();
      appState.current = s;
    });

    const interval = setInterval(fetchUnreadCounts, 30_000);

    return () => {
      sub.remove();
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [uid, fetchUnreadCounts]);

  // ---- Reset badge si uid disparaît (sécurité)
  useEffect(() => {
    if (!uid) Notifications.setBadgeCountAsync(0).catch(() => {});
  }, [uid]);

  // ✅ somme unique pour le header
  const totalForLogo = useMemo(
    () => unreadMessages + unreadRequests,
    [unreadMessages, unreadRequests]
  );

  if (!isBoatManager) return null;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <StatusBar style="dark" backgroundColor="#ffffff" hidden={false} />

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
          name="clients"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ color, size }) => (
              <Users color={color} size={size} />
            ),
            headerTitle: () => <LogoWithBadge />,
          }}
        />

        <Tabs.Screen
          name="requests"
          options={{
            title: 'Demandes',
            tabBarIcon: ({ color, size }) => (
              <FileText color={color} size={size} />
            ),
            tabBarBadge: formatBadge(unreadRequests),
            tabBarBadgeStyle: { backgroundColor: '#EF4444' },
          }}
        />

        <Tabs.Screen
          name="company-request"
          options={{
            title: 'Création demande',
            tabBarIcon: ({ color, size }) => (
              <Plus color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="planning"
          options={{
            title: 'Planning',
            tabBarIcon: ({ color, size }) => (
              <Calendar color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messagerie',
            tabBarIcon: ({ color, size }) => (
              <MessageSquare color={color} size={size} />
            ),
            tabBarBadge: formatBadge(unreadMessages),
            tabBarBadgeStyle: { backgroundColor: '#EF4444' },
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => (
              <User color={color} size={size} />
            ),
          }}
        />

        {/* écrans masqués (push internes) */}
        <Tabs.Screen
          name="quote-upload"
          options={{ title: 'Devis', headerShown: true, href: null }}
        />
        <Tabs.Screen
          name="other-boat-managers-list"
          options={{ title: 'Devis', headerShown: false, href: null }}
        />
        <Tabs.Screen
          name="headquarters-contacts-list"
          options={{ title: 'Devis', headerShown: false, href: null }}
        />
        <Tabs.Screen
          name="clients-list"
          options={{
            title: 'Tous mes clients',
            href: null,
            headerLargeTitle: false,
            headerTitleStyle: { fontSize: 16, fontWeight: '600' },
            headerStyle: {
              height: Platform.OS === 'ios' ? 48 : 56,
            },
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ paddingHorizontal: 12 }}
              >
                <ArrowLeft size={20} color="#1a1a1a" />
              </TouchableOpacity>
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
