import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Chrome as Home, MessageSquare, User, FileText } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

export default function TabLayout() {
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadRequests, setUnreadRequests] = useState(0);

  // Simulate fetching unread counts
  useEffect(() => {
    // In a real app, this would be an API call or a subscription
    setUnreadMessages(2);
    setUnreadRequests(1);
  }, []);

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
    </Tabs>
  );
}