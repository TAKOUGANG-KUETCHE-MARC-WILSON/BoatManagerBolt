import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Chrome as Dashboard, FileText, MessageSquare, User } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function CorporateTabLayout() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role !== 'corporate') {
      router.replace('/(tabs)');
    }
  }, [user]);

  if (user?.role !== 'corporate') {
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
          title: 'Tableau de bord',
          tabBarIcon: ({ color, size }) => <Dashboard color={color} size={size} />,
          headerTitle: () => <Logo size="small" />,
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Demandes',
          tabBarIcon: ({ color, size }) => <FileText color={color} size={size} />,
        }}
      />
       <Tabs.Screen
        name="partners"
        options={{
          headerShown: false,
          href: null, // Masquer cet écran de la barre d'onglets
        }}
      />
        
        
        
        }}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messagerie',
          tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}