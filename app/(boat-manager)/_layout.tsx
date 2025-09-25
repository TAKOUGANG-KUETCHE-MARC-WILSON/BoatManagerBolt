import { Platform, TouchableOpacity, AppState } from 'react-native';
import { Tabs } from 'expo-router';
import { Users, FileText, MessageSquare, User, Calendar, Plus, ArrowLeft } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function BoatManagerTabLayout() {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  // ---- Compteur réutilisable (AppState, interval, realtime s'en servent)
  const fetchUnreadCounts = useCallback(async () => {
    if (!user?.id) {
      setUnreadMessages(0);
      setUnreadRequests(0);
      return;
    }

    // --- Messages non lus
    try {
      const { data: convMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      const convIds = (convMembers ?? []).map((c) => c.conversation_id);
      if (!convIds.length) {
        setUnreadMessages(0);
      } else {
        const { count: messagesCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('conversation_id', convIds) // uniquement les conversations où il est membre
          .neq('sender_id', user.id)      // pas mes propres messages
          .eq('is_read', false);          // uniquement les non lus

        setUnreadMessages(messagesCount || 0);
      }
    } catch {
      setUnreadMessages(0);
    }

    // --- Requêtes non lues
    try {
      const { count: requestsCount } = await supabase
        .from('service_request')
        .select('id', { count: 'exact', head: true })
        .eq('id_boat_manager', user.id)
        .eq('statut', 'submitted');

      setUnreadRequests(requestsCount || 0);
    } catch {
      setUnreadRequests(0);
    }
  }, [user?.id]);

  // ---- Premier chargement + garde-fou de rôle
  useEffect(() => {
    if (user?.role !== 'boat_manager') {
      router.replace('/(tabs)');
      return;
    }
    fetchUnreadCounts();
  }, [user?.role, fetchUnreadCounts]);

  // ---- Realtime INSERT + retour app + interval
  useEffect(() => {
    if (!user?.id) return;

    let mounted = true;
    let cleanupRealtime: (() => void) | null = null;

    const wireRealtime = async () => {
      const { data: convMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      const ids = (convMembers ?? []).map((c) => c.conversation_id).filter(Boolean);
      if (!ids.length) return;

      const channel = supabase
        .channel(`bm-unread-${user.id}`)
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
            // Ignore mes propres messages
            if (row?.sender_id === user.id) return;
            if (!mounted) return;
            await fetchUnreadCounts();
          }
        )
        .subscribe();

      cleanupRealtime = () => supabase.removeChannel(channel);
    };

    wireRealtime();

    // Re-calcul à la ré-ouverture de l’app
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') fetchUnreadCounts();
    });

    // Tick régulier (sécurité)
    const interval = setInterval(fetchUnreadCounts, 30_000);

    return () => {
      mounted = false;
      sub.remove();
      clearInterval(interval);
      if (cleanupRealtime) cleanupRealtime();
    };
  }, [user?.id, fetchUnreadCounts]);

  if (user?.role !== 'boat_manager') {
    return null;
  }

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
            tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
            headerTitle: () => <Logo size="small" />,
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: 'Demandes',
            tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
            tabBarBadge: unreadRequests > 0 ? unreadRequests : undefined,
            tabBarBadgeStyle: { backgroundColor: '#EF4444' },
          }}
        />
        <Tabs.Screen
          name="company-request"
          options={{
            title: 'Création demande',
            tabBarIcon: ({ color, size }) => <Plus color={color} size={size} />,
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
            tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
            tabBarBadgeStyle: { backgroundColor: '#EF4444' },
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
            href: null, // Masquer cet écran de la barre d'onglets
          }}
        />
        <Tabs.Screen
          name="other-boat-managers-list"
          options={{
            title: 'Devis',
            headerShown: false,
            href: null, // Masquer cet écran de la barre d'onglets
          }}
        />
        <Tabs.Screen
          name="headquarters-contacts-list"
          options={{
            title: 'Devis',
            headerShown: false,
            href: null, // Masquer cet écran de la barre d'onglets
          }}
        />
        <Tabs.Screen
          name="clients-list"
          options={{
            title: 'Tous mes clients',
            href: null, // écran masqué de la barre d’onglets
            headerLargeTitle: false,
            headerTitleStyle: { fontSize: 16, fontWeight: '600' },
            headerStyle: { height: Platform.OS === 'ios' ? 48 : 56 },
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 12 }}>
                <ArrowLeft size={20} color="#1a1a1a" />
              </TouchableOpacity>
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
