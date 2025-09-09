// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Chrome as Home, MessageSquare, User, FileText } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/src/lib/supabase';

export default function TabLayout() {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  const fetchUnreadCounts = useCallback(async () => {
    // pas d’utilisateur -> on remet à zéro silencieusement
    if (!user?.id) {
      setUnreadMessages(0);
      setUnreadRequests(0);
      return;
    }

    let mounted = true;

    // --- Messages non lus ---
    try {
      const { data: memberConversations, error: memberError } = await supabase
        .from('conversation_members')
        .select('conversation_id,last_read_at')
        .eq('user_id', user.id);

      if (memberError || !memberConversations?.length) {
        if (__DEV__) console.warn('[tabs] unread messages: no conversations or query failed');
        if (mounted) setUnreadMessages(0);
      } else {
        // Compter sans transférer les lignes
        const counts = await Promise.all(
          memberConversations.map(async (member) => {
            const { count, error } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', member.conversation_id)
              .gt('created_at', member.last_read_at || '1970-01-01T00:00:00Z')
              .neq('sender_id', user.id);
            if (error) {
              if (__DEV__) console.warn('[tabs] unread messages: count failed for a conversation');
              return 0;
            }
            return count || 0;
          })
        );

        const total = counts.reduce((a, b) => a + b, 0);
        if (mounted) setUnreadMessages(total);
      }
    } catch {
      if (__DEV__) console.warn('[tabs] unread messages: unexpected error');
      if (mounted) setUnreadMessages(0);
    }

    // --- Demandes « nouvelles » / à suivre ---
    try {
      const { count, error } = await supabase
        .from('service_request')
        .select('id', { count: 'exact', head: true })
        .eq('id_client', user.id)
        .in('statut', ['submitted', 'quote_sent']);

      if (error) {
        if (__DEV__) console.warn('[tabs] unread requests: count failed');
        if (mounted) setUnreadRequests(0);
      } else if (mounted) {
        setUnreadRequests(count || 0);
      }
    } catch {
      if (__DEV__) console.warn('[tabs] unread requests: unexpected error');
      if (mounted) setUnreadRequests(0);
    }

    return () => {
      mounted = false;
    };
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
