import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Mail, Phone, MapPin, MessageSquare, Star } from 'lucide-react-native';
import { useAuth, BoatManagerUser } from '@/context/AuthContext';
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

interface OtherBoatManager extends BoatManagerUser {
  location?: string;
  specialties?: string[];
  hasNewMessages?: boolean;
  rating?: number;
  reviewCount?: number;
}

export default function OtherBoatManagersListScreen() {
  const { user } = useAuth();
  const [otherBoatManagers, setOtherBoatManagers] = useState<OtherBoatManager[]>([]);
  const [boatManagerSearchQuery, setBoatManagerSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOtherBoatManagers = async () => {
      setLoading(true);
      setError(null);
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar, e_mail, phone, rating, review_count, user_categorie_service(categorie_service(description1)), user_ports(port_id, ports(name))')
          .eq('profile', 'boat_manager')
          .neq('id', user.id); // Exclude current user

        if (fetchError) {
          console.error('Error fetching other boat managers:', fetchError);
          setError('Échec du chargement des autres Boat Managers.');
          return;
        }

        const managersWithDetails = await Promise.all(data.map(async (bm: any) => {
  let location = 'N/A';
  if (Array.isArray(bm.user_ports) && bm.user_ports.length > 0) {
    const { data: portData } = await supabase
      .from('ports')
      .select('name')
      .eq('id', bm.user_ports[0]?.port_id)
      .single();
    if (portData?.name) location = portData.name;
  }

  const signedAvatar = await getSignedAvatarUrl(bm.avatar);

  // ⚙️ Normalisation sûre (évite null/strings pour rating & reviewCount)
  const rating = bm.rating == null ? undefined : Number(bm.rating);
  const reviewCount = bm.review_count == null ? 0 : Number(bm.review_count);

  const specialties = Array.isArray(bm.user_categorie_service)
    ? bm.user_categorie_service
        .map((ucs: any) => ucs?.categorie_service?.description1)
        .filter(Boolean)
    : [];

  return {
    ...bm,
    name: `${bm.first_name} ${bm.last_name}`,
    avatar: signedAvatar || DEFAULT_AVATAR,
    location,
    specialties,
    role: 'boat_manager',
    rating,        // → number | undefined (plus de null)
    reviewCount,   // → number
  };
}));

        setOtherBoatManagers(managersWithDetails as OtherBoatManager[]);
      } catch (e) {
        console.error('Unexpected error fetching other boat managers:', e);
        setError('Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
    };

    fetchOtherBoatManagers();
  }, [user]);

  const filteredBoatManagers = otherBoatManagers.filter(manager => {
  if (!boatManagerSearchQuery) return true;
  const query = boatManagerSearchQuery.toLowerCase();

  const name = (manager.name || '').toLowerCase();
  const email = (manager.e_mail || '').toLowerCase();
  const phone = String(manager.phone || '').toLowerCase();
  const location = (manager.location || '').toLowerCase();
  const specialties = (manager.specialties || []).some(s => (s || '').toLowerCase().includes(query));

  return (
    name.includes(query) ||
    email.includes(query) ||
    phone.includes(query) ||
    location.includes(query) ||
    specialties
  );
});


  const handleBoatManagerMessage = (managerId: string) => {
    router.push(`/(boat-manager)/messages?manager=${managerId}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des autres Boat Managers...</Text>
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
        <Text style={styles.title}>Autres Boat Managers</Text>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un Boat Manager..."
          value={boatManagerSearchQuery}
          onChangeText={setBoatManagerSearchQuery}
        />
      </View>

      <ScrollView style={styles.content}>
        {filteredBoatManagers.length > 0 ? (
          filteredBoatManagers.map((manager) => (
            <TouchableOpacity
              key={manager.id}
              style={styles.contactCard}
              onPress={() => handleBoatManagerMessage(manager.id)}
            >
              <Image
                source={{ uri: manager.avatar }}
                style={styles.contactAvatar}
                onError={() => {
                  // Fallback to default avatar if image fails to load
                  setOtherBoatManagers(prev =>
                    prev.map(m => m.id === manager.id ? { ...m, avatar: DEFAULT_AVATAR } : m)
                  );
                }}
              />
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{manager.name}</Text>
                <View style={styles.boatManagerLocationContainer}>
                  <MapPin size={14} color="#666" />
                  <Text style={styles.boatManagerLocationText}>{manager.location}</Text>
                </View>
                <View style={styles.contactDetails}>
                  <View style={styles.contactDetailRow}>
                    <Mail size={16} color="#666" />
                    <Text style={styles.contactDetailText}>{manager.e_mail}</Text>
                  </View>
                  <View style={styles.contactDetailRow}>
                    <Phone size={16} color="#666" />
                    <Text style={styles.contactDetailText}>{manager.phone}</Text>
                  </View>
                  {typeof manager.rating === 'number' && Number.isFinite(manager.rating) && (
  <View style={styles.contactDetailRow}>
    <Star size={16} color="#FFC107" />
    <Text style={styles.contactDetailText}>
      {manager.rating.toFixed(1)} ({manager.reviewCount ?? 0} avis)
    </Text>
  </View>
)}
                </View>
                <View style={styles.boatManagerSpecialtiesContainer}>
                  {manager.specialties?.map((specialty, index) => (
                    <View key={index} style={styles.boatManagerSpecialtyTag}>
                      <Text style={styles.boatManagerSpecialtyText}>{specialty}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => handleBoatManagerMessage(manager.id)}
              >
                <MessageSquare size={20} color="#0066CC" />
                {manager.hasNewMessages && (
                  <View style={styles.messageNotificationDot} />
                )}
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun autre Boat Manager trouvé.</Text>
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
  boatManagerLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  boatManagerLocationText: {
    fontSize: 14,
    color: '#666',
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
  boatManagerSpecialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  boatManagerSpecialtyTag: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  boatManagerSpecialtyText: {
    fontSize: 10,
    color: '#0066CC',
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
