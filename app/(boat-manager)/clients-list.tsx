import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, Phone, Bot as Boat, ChevronRight, Search } from 'lucide-react-native';

interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  status: 'active' | 'pending' | 'inactive';
  lastContact?: string;
  hasNewRequests?: boolean;
  hasNewMessages?: boolean;
  boats: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

const mockClients: Client[] = [
  {
    id: '1',
    name: 'Jean Dupont',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    status: 'active',
    lastContact: '2024-02-15',
    hasNewRequests: true,
    hasNewMessages: true,
    boats: [
      {
        id: '1',
        name: 'Le Grand Bleu',
        type: 'Voilier',
      },
    ],
  },
  {
    id: '2',
    name: 'Sophie Martin',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    email: 'sophie.martin@example.com',
    phone: '+33 6 23 45 67 89',
    status: 'active',
    lastContact: '2024-02-18',
    hasNewRequests: false,
    hasNewMessages: false,
    boats: [
      {
        id: '2',
        name: 'Le Petit Prince',
        type: 'Yacht',
      },
      {
        id: '3',
        name: 'L\'Aventurier',
        type: 'Catamaran',
      },
    ],
  },
  {
    id: '3',
    name: 'Pierre Dubois',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    email: 'pierre.dubois@example.com',
    phone: '+33 6 34 56 78 90',
    status: 'pending',
    hasNewRequests: false,
    hasNewMessages: false,
    boats: [
      {
        id: '4',
        name: 'Le Navigateur',
        type: 'Voilier',
      },
    ],
  },
  {
    id: '4',
    name: 'Alice Durand',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734b0a4?q=80&w=2070&auto=format&fit=crop',
    email: 'alice.durand@example.com',
    phone: '+33 6 45 67 89 01',
    status: 'active',
    lastContact: '2024-02-20',
    hasNewRequests: false,
    hasNewMessages: true,
    boats: [
      {
        id: '5',
        name: 'L\'Étoile de Mer',
        type: 'Voilier',
      },
    ],
  },
  {
    id: '5',
    name: 'Marc Lefevre',
    avatar: 'https://images.unsplash.com/photo-1507003211169-e69fe1c5a392?q=80&w=2070&auto=format&fit=crop',
    email: 'marc.lefevre@example.com',
    phone: '+33 6 56 78 90 12',
    status: 'inactive',
    lastContact: '2023-11-01',
    hasNewRequests: false,
    hasNewMessages: false,
    boats: [
      {
        id: '6',
        name: 'Le Corsaire',
        type: 'Yacht',
      },
    ],
  },
];

export default function ClientsListScreen() {
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const filteredClients = useMemo(() => {
    if (!clientSearchQuery) {
      return mockClients;
    }
    const query = clientSearchQuery.toLowerCase();
    return mockClients.filter(client => {
      return (
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.phone.toLowerCase().includes(query) ||
        client.boats.some(boat => boat.name.toLowerCase().includes(query))
      );
    });
  }, [clientSearchQuery]);

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
                    <Text style={styles.clientName}>{client.name}</Text>
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
                      <Text style={styles.contactText}>{client.email}</Text>
                    </View>
                    <View style={styles.contactRow}>
                      <Phone size={16} color="#666" />
                      <Text style={styles.contactText}>{client.phone}</Text>
                    </View>
                  </View>
                </View>
              </View>

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
