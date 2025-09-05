import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Chrome as Home, FileText, MessageSquare, User, Calendar, Ship } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NauticalCompanyTabLayout() {
  const { user, loading } = useAuth(); // ✅ récupère loading aussi
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  // Redirection uniquement une fois que user est chargé
  useEffect(() => {
    if (!loading && user?.role !== 'nautical_company') {
      router.replace('/(tabs)');
    }

    // Simulation des messages non lus (à personnaliser plus tard)
    setUnreadMessages(2);
    setUnreadRequests(3);
  }, [user, loading]);

  // N'affiche rien tant que le rôle n'est pas chargé ou n'est pas autorisé
  if (loading) return null;
  if (user?.role !== 'nautical_company') return null;

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
        name="dashboard"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
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
