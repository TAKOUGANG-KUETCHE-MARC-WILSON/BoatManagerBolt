import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Users, FileText, MessageSquare, User, Calendar, Plus } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase'; // Importation du client Supabase
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BoatManagerTabLayout() {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  useEffect(() => {
    if (user?.role !== 'boat_manager') {
      router.replace('/(tabs)');
    }

    const fetchUnreadCounts = async () => {
  if (!user?.id) {
    return;
  }

  // --- Messages non lus ---
  try {
    // 1. Récupérer les conversations de l'utilisateur
    const { data: convMembers, error: convError } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (convError || !convMembers) {
      console.error('Erreur lors de la récupération des conversations:', convError);
      setUnreadMessages(0);
      return;
    }

    const convIds = convMembers.map((c) => c.conversation_id);
    if (convIds.length === 0) {
      setUnreadMessages(0);
    } else {
      // 2. Compter les messages non lus dans ces conversations
      const { count: messagesCount, error: messagesError } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .in('conversation_id', convIds) // uniquement les conversations où il est membre
        .neq('sender_id', user.id)      // pas mes propres messages
        .eq('is_read', false);          // uniquement les non lus

      if (messagesError) {
        console.error('Erreur lors de la récupération des messages non lus:', messagesError);
        setUnreadMessages(0);
      } else {
        setUnreadMessages(messagesCount || 0);
      }
    }
  } catch (e) {
    console.error('Erreur inattendue lors de la récupération des messages non lus:', e);
    setUnreadMessages(0);
  }

  // --- Requêtes non lues ---
  try {
    const { count: requestsCount, error: requestsError } = await supabase
      .from('service_request')
      .select('id', { count: 'exact' })
      .eq('id_boat_manager', user.id)
      .eq('statut', 'submitted'); // statut = 'submitted' = demande non traitée

    if (requestsError) {
      console.error('Erreur lors de la récupération des requêtes non lues:', requestsError);
      setUnreadRequests(0);
    } else {
      setUnreadRequests(requestsCount || 0);
    }
  } catch (e) {
    console.error('Erreur inattendue lors de la récupération des requêtes non lues:', e);
    setUnreadRequests(0);
  }
};


    fetchUnreadCounts();
  }, [user]);

  if (user?.role !== 'boat_manager') {
    return null;
  }

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
         title: 'Devis',
          headerShown: false,
          href: null, // Masquer cet écran de la barre d'onglets
        }}
      />
    </Tabs>
    </SafeAreaView>
  );
}

