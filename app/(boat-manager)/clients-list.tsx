import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Mail, Phone, Bot as Boat, ChevronRight, Search } from 'lucide-react-native'; // ⬅️ ArrowLeft retiré (header natif)
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));
const getSignedAvatarUrl = async (value?: string) => {
  if (!value) return '';
  if (isHttpUrl(value)) return value;
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(value, 60 * 60);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
};

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  e_mail: string;
  phone: string;
  status: 'active' | 'pending' | 'inactive';
  last_contact?: string;
  has_new_requests?: boolean;
  has_new_messages?: boolean;
  boat: Array<{ id: string; name: string; type: string }>;
}

export default function ClientsListScreen() {
  const { user } = useAuth();
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // helper : masque les erreurs en prod
  const setMaskedError = (devMsg?: string) => {
    setError(__DEV__ ? (devMsg || 'Erreur inconnue') : 'Impossible de charger les clients pour le moment.');
  };

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      setError(null);

      // sécurité : si pas BM, on renvoie vers les onglets « user »
      if (!user || user.role !== 'boat_manager') {
        router.replace('/(tabs)');
        setLoading(false);
        return;
      }

      try {
        // 1) Ports gérés par le BM
        const { data: bmPorts, error: bmPortsError } = await supabase
          .from('user_ports')
          .select('port_id')
          .eq('user_id', user.id);

        if (bmPortsError) {
          if (__DEV__) console.error('Error fetching boat manager ports:', bmPortsError);
          setMaskedError('Échec du chargement des ports du Boat Manager.');
          setLoading(false);
          return;
        }

        const managedPortIds = bmPorts?.map(p => p.port_id) ?? [];
        if (managedPortIds.length === 0) {
          setClients([]);
          setLoading(false);
          return;
        }

        // 2) Users rattachés à ces ports
        const { data: clientPortAssignments, error: clientPortError } = await supabase
          .from('user_ports')
          .select('user_id')
          .in('port_id', managedPortIds);

        if (clientPortError) {
          if (__DEV__) console.error('Error fetching client port assignments:', clientPortError);
          setMaskedError('Échec du chargement des associations de ports.');
          setLoading(false);
          return;
        }

        const uniqueClientIds = [...new Set((clientPortAssignments ?? []).map(cpa => cpa.user_id))];
        if (uniqueClientIds.length === 0) {
          setClients([]);
          setLoading(false);
          return;
        }

        // 3) Détails clients + bateaux
        const { data, error: clientsError } = await supabase
          .from('users')
          .select(
            'id, first_name, last_name, avatar, e_mail, phone, status, last_contact, has_new_requests, has_new_messages, boat(id, name, type)'
          )
          .in('id', uniqueClientIds)
          .eq('profile', 'pleasure_boater');

        if (clientsError) {
          if (__DEV__) console.error('Error fetching clients:', clientsError);
          setMaskedError(`Échec du chargement des clients: ${clientsError.message}`);
          setClients([]);
        } else {
          const formatted = await Promise.all(
            (data ?? []).map(async (client: any) => {
              const signedAvatar = await getSignedAvatarUrl(client.avatar);
              return {
                ...client,
                avatar: signedAvatar || DEFAULT_AVATAR,
                boat: client.boat || [],
              };
            })
          );
          setClients(formatted as Client[]);
        }
      } catch (e) {
        if (__DEV__) console.error('Unexpected error while fetching clients:', e);
        setMaskedError('Une erreur inattendue est survenue.');
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchClients();
  }, [user]);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) return clients;
    const q = clientSearchQuery.toLowerCase();
    return clients.filter(c => {
      const full = `${c.first_name} ${c.last_name}`.toLowerCase();
      return (
        full.includes(q) ||
        c.e_mail.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.boat?.some(b => b.name.toLowerCase().includes(q))
      );
    });
  }, [clientSearchQuery, clients]);

  const handleClientDetails = (clientId: string) => {
    router.push(`/client/${clientId}`);
  };

  const getStatusColor = (status: Client['status']) =>
    status === 'active' ? '#10B981' : status === 'pending' ? '#F59E0B' : status === 'inactive' ? '#EF4444' : '#666';

  const getStatusLabel = (status: Client['status']) =>
    status === 'active' ? 'Actif' : status === 'pending' ? 'En attente' : status === 'inactive' ? 'Inactif' : status;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Chargement des clients...</Text>
      </View>
    );
  }

  if (error) {
    // error est déjà masquée en prod par setMaskedError
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ⬇️ Header natif via layout — on a retiré le header custom ici */}

      <View style={styles.searchContainer}>
        <Search size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un client..."
          value={clientSearchQuery}
          onChangeText={setClientSearchQuery}
        />
      </View>

      <ScrollView style={styles.content}>
        {filteredClients.length > 0 ? (
          filteredClients.map(client => (
            <TouchableOpacity key={client.id} style={styles.clientCard} onPress={() => handleClientDetails(client.id)}>
              <View style={styles.clientHeader}>
                <Image
                  source={{ uri: client.avatar }}
                  style={styles.clientAvatar}
                  onError={() => {
                    // fallback image silencieux
                    setClients(prev => prev.map(c => (c.id === client.id ? { ...c, avatar: DEFAULT_AVATAR } : c)));
                  }}
                />
                <View style={styles.clientInfo}>
                  <View style={styles.clientNameRow}>
                    <Text style={styles.clientName}>
                      {client.first_name} {client.last_name}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(client.status)}15` }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(client.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(client.status) }]}>
                        {getStatusLabel(client.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactRow}>
                      <Mail size={16} color="#666" />
                      <Text style={styles.contactText}>{client.e_mail}</Text>
                    </View>
                    <View style={styles.contactRow}>
                      <Phone size={16} color="#666" />
                      <Text style={styles.contactText}>{client.phone}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {!!client.boat?.length && (
                <View style={styles.boatsList}>
                  {client.boat.map(boat => (
                    <View key={boat.id} style={styles.boatItem}>
                      <View style={styles.boatInfo}>
                        <Boat size={16} color="#0066CC" />
                        <Text style={styles.boatName}>{boat.name}</Text>
                        <Text style={styles.boatType}>{boat.type}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleClientDetails(client.id)}>
                  <Text style={styles.actionButtonText}>Voir les détails</Text>
                  <ChevronRight size={20} color="#0066CC" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun client trouvé.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#EF4444', fontSize: 14 },

  // (header custom supprimé)

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
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  clientHeader: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  clientAvatar: { width: 60, height: 60, borderRadius: 30 },
  clientInfo: { flex: 1, gap: 8 },
  clientNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  clientName: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '500' },
  contactInfo: { gap: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactText: { fontSize: 14, color: '#666' },
  boatsList: { gap: 8, marginBottom: 16 },
  boatItem: { backgroundColor: '#f0f7ff', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  boatInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boatName: { fontSize: 14, fontWeight: '500', color: '#0066CC' },
  boatType: { fontSize: 14, color: '#666' },
  actions: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  actionButtonText: { fontSize: 14, color: '#0066CC', fontWeight: '500' },
  emptyState: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
});
