import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Mail, Phone, Briefcase, MessageSquare } from 'lucide-react-native';
import { useAuth, CorporateUser } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

// Définition de l'avatar par défaut
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

// Fonctions utilitaires pour les URLs d'avatars
const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getSignedAvatarUrl = async (value?: string) => {
  if (!value) return '';
  if (isHttpUrl(value)) return value;

  const { data, error } = await supabase
    .storage
    .from('avatars')
    .createSignedUrl(value, 60 * 60); // 1h de validité

  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
};

interface HeadquartersContact extends CorporateUser {
  department?: string;
  hasNewMessages?: boolean;
}

export default function HeadquartersContactsListScreen() {
  const { user } = useAuth();
  const [headquartersContacts, setHeadquartersContacts] = useState<HeadquartersContact[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHeadquartersContacts = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar, e_mail, phone, department, has_new_messages')
          .eq('profile', 'corporate');

        if (fetchError) {
          console.error('Error fetching headquarters contacts:', fetchError);
          setError('Échec du chargement des contacts du siège.');
          return;
        }

        const contactsWithSignedAvatars = await Promise.all(data.map(async c => {
          const signedAvatar = await getSignedAvatarUrl(c.avatar);
          return {
            ...c,
            name: `${c.first_name} ${c.last_name}`,
            avatar: signedAvatar || DEFAULT_AVATAR,
            role: 'corporate',
          };
        }));
        setHeadquartersContacts(contactsWithSignedAvatars as HeadquartersContact[]);
      } catch (e) {
        console.error('Unexpected error fetching headquarters contacts:', e);
        setError('Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
    };

    fetchHeadquartersContacts();
  }, []);

  const filteredContacts = headquartersContacts.filter(contact => {
    if (!contactSearchQuery) return true;
    const query = contactSearchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.e_mail.toLowerCase().includes(query) ||
      contact.department?.toLowerCase().includes(query)
    );
  });

  const handleContactMessage = (contactId: string) => {
    router.push(`/(boat-manager)/messages?contact=${contactId}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des contacts du siège...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Contacts au siège</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un contact..."
          value={contactSearchQuery}
          onChangeText={setContactSearchQuery}
        />
      </View>

      <ScrollView style={styles.content}>
        {filteredContacts.length > 0 ? (
          filteredContacts.map((contact) => (
            <TouchableOpacity
              key={contact.id}
              style={styles.contactCard}
              onPress={() => handleContactMessage(contact.id)}
            >
              <Image
                source={{ uri: contact.avatar }}
                style={styles.contactAvatar}
                onError={() => {
                  // Fallback to default avatar if image fails to load
                  setHeadquartersContacts(prev =>
                    prev.map(c => c.id === contact.id ? { ...c, avatar: DEFAULT_AVATAR } : c)
                  );
                }}
              />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactRole}>{contact.role || 'Corporate User'}</Text>
                {contact.department && (
                  <Text style={styles.contactDepartment}>{contact.department}</Text>
                )}
                <View style={styles.contactDetails}>
                  <View style={styles.contactDetailRow}>
                    <Mail size={16} color="#666" />
                    <Text style={styles.contactDetailText}>{contact.e_mail}</Text>
                  </View>
                  <View style={styles.contactDetailRow}>
                    <Phone size={16} color="#666" />
                    <Text style={styles.contactDetailText}>{contact.phone}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => handleContactMessage(contact.id)}
              >
                <MessageSquare size={20} color="#0066CC" />
                {contact.hasNewMessages && (
                  <View style={styles.messageNotificationDot} />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun contact trouvé.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  contactAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  contactRole: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
    marginBottom: 4,
  },
  contactDepartment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  contactDetails: {
    gap: 4,
  },
  contactDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactDetailText: {
    fontSize: 14,
    color: '#666',
  },
  messageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f7ff',
    position: 'relative',
  },
  messageNotificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: 'white',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
  },
});
