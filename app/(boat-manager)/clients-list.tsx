import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, Phone, Bot as Boat, ChevronRight, Search } from 'lucide-react-native';
import { supabase } from '@/src/lib/supabase'; // Importation du client Supabase

// Interface pour les données client, incluant les bateaux via un JOIN
interface Client {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  e_mail: string;
  phone: string;
  status: 'active' | 'pending' | 'inactive'; // Corresponds to 'status' in DB
  last_contact?: string; // Corresponds to 'last_contact' in DB
  has_new_requests?: boolean; // Corresponds to 'has_new_requests' in DB
  has_new_messages?: boolean; // Corresponds to 'has_new_messages' in DB
  // Les bateaux sont maintenant un tableau d'objets Boat, rempli par le JOIN
  boats: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export default function ClientsListScreen() {
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      setError(null);
      // Utilisation de select('*, boats(*)') pour joindre les données des bateaux
      // Supabase va automatiquement chercher les bateaux liés via la clé étrangère id_user
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar, e_mail, phone, status, last_contact, has_new_requests, has_new_messages, boats(id, name, type)')
        .eq('profile', 'pleasure_boater'); // Filtrer uniquement les plaisanciers

      if (error) {
        console.error('Error fetching clients:', error);
        setError('Failed to load clients.');
        setClients([]);
      } else {
        // Assurez-vous que les données des bateaux sont bien un tableau, même si vide
        const formattedData = data.map(client => ({
          ...client,
          boats: client.boats || [] // S'assurer que 'boats' est toujours un tableau
        }));
        setClients(formattedData as Client[]);
      }
      setLoading(false);
    };

    fetchClients();
  }, []);

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) {
      return clients;
    }
    const query = clientSearchQuery.toLowerCase();
    return clients.filter(client => {
      const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
      return (
        fullName.includes(query) ||
        client.e_mail.toLowerCase().includes(query) ||
        client.phone.toLowerCase().includes(query) ||
        client.boats?.some(boat => boat.name.toLowerCase().includes(query))
      );
    });
  }, [clientSearchQuery, clients]);

  const handleClientDetails = (clientId: string) => {
    router.push(`/client/${clientId}`);
  };

  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'inactive':
        return '#EF4444';
      default:
        return '#666666';
    }
  };

  const getStatusLabel = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'pending':
        return 'En attente';
      case 'inactive':
        return 'Inactif';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Chargement des clients...</Text>
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
        <Text style={styles.title}>Tous mes clients</Text>
      </View>

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
          filteredClients.map((client) => (
            <TouchableOpacity
              key={client.id}
              style={styles.clientCard}
              onPress={() => handleClientDetails(client.id)}
            >
              <View style={styles.clientHeader}>
                <Image source={{ uri: client.avatar }} style={styles.clientAvatar} />
                <View style={styles.clientInfo}>
                  <View style={styles.clientNameRow}>
                    <Text style={styles.clientName}>{client.first_name} {client.last_name}</Text>
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

              {client.boats && client.boats.length > 0 && (
                <View style={styles.boatsList}>
                  {client.boats.map((boat) => (
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
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleClientDetails(client.id)}
                >
                  <Text style={styles.actionButtonText}>Voir les détails</Text>
                  <ChevronRight size={20} color="#0066CC" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Aucun client trouvé.
            </Text>
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
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  clientHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  clientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  clientInfo: {
    flex: 1,
    gap: 8,
  },
  clientNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  contactInfo: {
    gap: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#666',
  },
  boatsList: {
    gap: 8,
    marginBottom: 16,
  },
  boatItem: {
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066CC',
  },
  boatType: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
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
});
