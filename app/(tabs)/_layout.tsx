import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Chrome as Home, MessageSquare, User, FileText } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

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

      // Fetch unread messages count
      try {
        const { count: messagesCount, error: messagesError } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (messagesError) {
          console.error('Error fetching unread messages:', messagesError);
          setUnreadMessages(0);
        } else {
          setUnreadMessages(messagesCount || 0);
        }
      } catch (e) {
        console.error('Unexpected error fetching unread messages:', e);
        setUnreadMessages(0);
      }

      // Fetch unread requests count for pleasure boater
      try {
        const { count: submittedRequestsCount, error: submittedRequestsError } = await supabase
          .from('service_request')
          .select('id', { count: 'exact' })
          .eq('id_client', user.id)
          .eq('statut', 'submitted'); // Requests submitted by the user

        const { count: quoteSentRequestsCount, error: quoteSentRequestsError } = await supabase
          .from('service_request')
          .select('id', { count: 'exact' })
          .eq('id_client', user.id)
          .eq('statut', 'quote_sent'); // Quotes sent for user's requests

        if (submittedRequestsError || quoteSentRequestsError) {
          console.error('Error fetching unread requests:', submittedRequestsError || quoteSentRequestsError);
          setUnreadRequests(0);
        } else {
          setUnreadRequests((submittedRequestsCount || 0) + (quoteSentRequestsCount || 0));
        }
      } catch (e) {
        console.error('Unexpected error fetching unread requests:', e);
        setUnreadRequests(0);
      }
    };

    fetchUnreadCounts();

    // Optionally, set up real-time subscriptions if needed for live updates
    // For simplicity, this example only fetches on component mount/user change.
  }, [user]); // Re-run when user object changes

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

