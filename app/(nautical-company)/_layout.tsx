import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Chrome as Home, FileText, MessageSquare, User, Calendar, Ship } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';

export default function NauticalCompanyTabLayout() {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  useEffect(() => {
    if (user?.role !== 'nautical_company') {
      router.replace('/(tabs)');
    }
    
    // Simulate fetching unread counts
    setUnreadMessages(2);
    setUnreadRequests(3);
  }, [user]);

  if (user?.role !== 'nautical_company') {
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
          href: null, // Masquer cet écran de la barre d'onglets
        }}
      />
      {/* L'entrée suivante est supprimée car appointment-form.tsx est maintenant un composant */}
      {/* <Tabs.Screen
        name="planning/appointment-form.tsx"
        options={{
          title: 'Devis',
          headerShown: true,
          href: null, // Masquer cet écran de la barre d'onglets
        }}
      /> */}
    </Tabs>
    
  );
}
