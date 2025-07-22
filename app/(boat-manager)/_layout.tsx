import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Users, FileText, MessageSquare, User, Calendar, Plus } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase'; // Importation du client Supabase

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

      // Simulation de la récupération des messages non lus depuis Supabase
      // Dans une implémentation réelle, vous feriez une requête à votre table 'messages'
      // pour compter les messages où 'receiver_id' est l'ID de l'utilisateur actuel et 'is_read' est faux.
      try {
        const { count: messagesCount, error: messagesError } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (messagesError) {
          console.error('Erreur lors de la récupération des messages non lus:', messagesError);
          setUnreadMessages(0);
        } else {
          setUnreadMessages(messagesCount || 0);
        }
      } catch (e) {
        console.error('Erreur inattendue lors de la récupération des messages non lus:', e);
        setUnreadMessages(0);
      }

      // Récupération des requêtes non lues (par exemple, les demandes soumises)
      try {
        const { count: requestsCount, error: requestsError } = await supabase
          .from('service_request')
          .select('id', { count: 'exact' })
          .eq('id_boat_manager', user.id)
          .eq('statut', 'submitted'); // Count requests with 'submitted' status as unread

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
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0066CC',
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 80 : 60,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
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
        name="clients-list"
        options={{
         title: 'Devis',
          headerShown: false,
          href: null, // Masquer cet écran de la barre d'onglets
        }}
      />
    </Tabs>
  );
}

