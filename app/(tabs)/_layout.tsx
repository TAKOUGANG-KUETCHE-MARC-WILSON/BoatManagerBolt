// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Chrome as Home, MessageSquare, User, FileText } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useCallback , useRef} from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { bootOnLoginOrReopen } from '@/src/notifications/boot';
import { supabase } from '@/src/lib/supabase';

export default function TabLayout() {
  const { user } = useAuth();
  const appState = useRef(AppState.currentState);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  const fetchUnreadCounts = useCallback(async () => {
  if (!user?.id) {
    setUnreadMessages(0);
    setUnreadRequests(0);
    await Notifications.setBadgeCountAsync(0);
    return;
  }

  let totalMessages = 0;
  let totalRequests = 0;

  // --- Messages non lus (via RPC)
  try {
    const { data, error } = await supabase
      .rpc('get_total_unread_messages', { p_user_id: user.id });
    totalMessages = error ? 0 : (data ?? 0);
    setUnreadMessages(totalMessages);
  } catch {
    totalMessages = 0;
    setUnreadMessages(0);
  }

  // --- Demandes « nouvelles » / à suivre
  try {
    const { count, error } = await supabase
      .from('service_request')
      .select('id', { count: 'exact', head: true })
      .eq('id_client', user.id)
      .in('statut', ['submitted', 'quote_sent']);
    totalRequests = error ? 0 : (count || 0);
    setUnreadRequests(totalRequests);
  } catch {
    totalRequests = 0;
    setUnreadRequests(0);
  }

  // --- Badge d’app = messages + demandes
  await Notifications.setBadgeCountAsync(totalMessages + totalRequests);
}, [user?.id]);



 useEffect(() => {
    let unsubscribeRealtime: (() => void) | null = null;
    let mounted = true;

    const wire = async () => {
      if (!user?.id) return;
      // 1) boot + abonnement realtime sur messages
      unsubscribeRealtime = await bootOnLoginOrReopen(user.id, async () => {
        // Quand un message arrive en live → recalcule les badges d’onglet
        if (!mounted) return;
        await fetchUnreadCounts(); // ta fonction existante pour badges des tabs
      });

    };

    wire();

    // 3) Sur re-ouverture app → re-boot + refresh
    const sub = AppState.addEventListener('change', async (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        await bootOnLoginOrReopen(user?.id || undefined, async () => {
          await fetchUnreadCounts();
        });
        await fetchUnreadCounts();
      }
      appState.current = next;
    });

    return () => {
      mounted = false;
      sub.remove();
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, [user?.id, fetchUnreadCounts]);


  useEffect(() => {
  if (!user?.id) {
    Notifications.setBadgeCountAsync(0);
  }
}, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!cancelled) await fetchUnreadCounts();
    };

    run();

    // rafraîchit toutes les 30s si l’utilisateur est connecté
    const interval = user?.id ? setInterval(run, 30_000) : null;

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [user?.id, fetchUnreadCounts]);
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
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          headerTitle: () => <Logo size="small" />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Mes demandes',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
          tabBarBadge: unreadRequests > 0 ? unreadRequests : undefined,
          tabBarBadgeStyle: { backgroundColor: '#EF4444' },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messagerie',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
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
        name="welcome-unauthenticated" // Nom du fichier welcome-unauthenticated.tsx
        options={{
          title: 'Mon profil', // MODIFICATION ICI: Définition du titre
          href: null, // Masque cet écran de la barre d'onglets
        }}
      />
    </Tabs>
    </SafeAreaView>
  );
}
