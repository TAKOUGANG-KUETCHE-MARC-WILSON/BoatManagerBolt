// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Chrome as Home, MessageSquare, User, FileText } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/src/lib/supabase'; // Assurez-vous que cette ligne est présente

export default function TabLayout() {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  useEffect(() => {
    const fetchUnreadCounts = async () => {
      if (!user?.id) {
        setUnreadMessages(0);
        setUnreadRequests(0);
        return;
      }

      // Fetch unread messages
      try {
        // Récupérer toutes les conversations de l'utilisateur
        const { data: memberConversations, error: memberError } = await supabase
          .from('conversation_members')
          .select('conversation_id, last_read_at')
          .eq('user_id', user.id);

        if (memberError) {
          console.error('Error fetching member conversations for unread count:', memberError);
          setUnreadMessages(0);
          return;
        }

        let totalUnreadMessages = 0;
        for (const memberConv of memberConversations) {
          const { count: unreadInConv, error: unreadError } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('conversation_id', memberConv.conversation_id)
            .gt('created_at', memberConv.last_read_at || '1970-01-01T00:00:00Z') // Compare with last_read_at, default to epoch if null
            .neq('sender_id', user.id); // Don't count messages sent by the user themselves

          if (unreadError) {
            console.error('Error counting unread messages in conversation:', unreadError);
          } else {
            totalUnreadMessages += unreadInConv || 0;
          }
        }
        setUnreadMessages(totalUnreadMessages);

      } catch (e) {
        console.error('Unexpected error fetching unread messages count:', e);
        setUnreadMessages(0);
      }

      // Fetch unread requests for pleasure boater
      try {
        const { count: requestsCount, error: requestsError } = await supabase
          .from('service_request')
          .select('id', { count: 'exact' })
          .eq('id_client', user.id) // Filter by the logged-in pleasure boater's ID
          .in('statut', ['submitted', 'quote_sent']); // Consider these statuses as "new" for the client

        if (requestsError) {
          console.error('Error fetching unread requests count:', requestsError);
          setUnreadRequests(0);
        } else {
          setUnreadRequests(requestsCount || 0);
        }
      } catch (e) {
        console.error('Unexpected error fetching unread requests count:', e);
        setUnreadRequests(0);
      }
    };

    fetchUnreadCounts();

    // Vous pouvez ajouter un intervalle pour rafraîchir les comptes régulièrement
    const interval = setInterval(fetchUnreadCounts, 30000); // Rafraîchir toutes les 30 secondes
    return () => clearInterval(interval); // Nettoyer l'intervalle au démontage
  }, [user]); // Re-run effect when user object changes (e.g., after login/logout)

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
