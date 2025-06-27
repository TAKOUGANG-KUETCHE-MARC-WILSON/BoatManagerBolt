import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Phone, Mail, Bot as Boat, MessageSquare, FileText, MapPin, Calendar, CircleCheck as CheckCircle2, CircleDot, Circle as XCircle, ChevronRight, TriangleAlert as AlertTriangle } from 'lucide-react-native';

interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  memberSince: string;
  boats: Array<{
    id: string;
    name: string;
    type: string;
    image: string;
    lastService?: string;
    nextService?: string;
    status: 'active' | 'maintenance' | 'inactive';
  }>;
  lastContact?: string;
  status: 'active' | 'pending' | 'inactive';
  port: string;
}

interface ServiceHistory {
  id: string;
  date: string;
  type: string;
  description: string;
  status: 'completed' | 'in_progress' | 'cancelled';
  boat: {
    id: string;
    name: string;
  };
}

// Mock data
const mockClients: Record<string, Client> = {
  '1': {
    id: '1',
    name: 'Jean Dupont',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    memberSince: 'Janvier 2024',
    status: 'active',
    lastContact: '2024-02-15',
    port: 'Port de Marseille',
    boats: [
      {
        id: '1',
        name: 'Le Grand Bleu',
        type: 'Voilier',
        image: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop',
        lastService: '2024-01-20',
        nextService: '2024-04-20',
        status: 'active',
      },
    ],
  },
  '2': {
    id: '2',
    name: 'Sophie Martin',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    email: 'sophie.martin@example.com',
    phone: '+33 6 23 45 67 89',
    memberSince: 'Décembre 2023',
    status: 'active',
    lastContact: '2024-02-18',
    port: 'Port de Marseille',
    boats: [
      {
        id: '2',
        name: 'Le Petit Prince',
        type: 'Yacht',
        image: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?q=80&w=2044&auto=format&fit=crop',
        lastService: '2024-02-10',
        nextService: '2024-05-10',
        status: 'active',
      },
      {
        id: '3',
        name: 'L\'Aventurier',
        type: 'Catamaran',
        image: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?q=80&w=2066&auto=format&fit=crop',
        lastService: '2024-01-15',
        nextService: '2024-04-15',
        status: 'maintenance',
      },
    ],
  },
};

const mockServiceHistory: ServiceHistory[] = [
  {
    id: '1',
    date: '2024-01-20',
    type: 'Maintenance',
    description: 'Révision complète du moteur et changement des filtres',
    status: 'completed',
    boat: {
      id: '1',
      name: 'Le Grand Bleu',
    },
  },
  {
    id: '2',
    date: '2024-02-10',
    type: 'Installation',
    description: 'Installation d\'un nouveau système GPS',
    status: 'in_progress',
    boat: {
      id: '2',
      name: 'Le Petit Prince',
    },
  },
  {
    id: '3',
    date: '2024-01-15',
    type: 'Réparation',
    description: 'Réparation du système électrique',
    status: 'cancelled',
    boat: {
      id: '3',
      name: 'L\'Aventurier',
    },
  },
];

export default function ClientDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedTab, setSelectedTab] = useState<'boats' | 'history'>('boats');

  const client = mockClients[id as string];

  if (!client) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Client non trouvé</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ce client n'existe pas.</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleMessage = () => {
    router.push(`/(boat-manager)/messages?client=${client.id}`);
  };

  const handleRequests = () => {
    router.push(`/(boat-manager)/requests?client=${client.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
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

  const getBoatStatusColor = (status: Client['boats'][0]['status']) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'maintenance':
        return '#F59E0B';
      case 'inactive':
        return '#EF4444';
      default:
        return '#666666';
    }
  };

  const getBoatStatusLabel = (status: Client['boats'][0]['status']) => {
    switch (status) {
      case 'active':
        return 'En service';
      case 'maintenance':
        return 'En maintenance';
      case 'inactive':
        return 'Hors service';
      default:
        return status;
    }
  };

  const getServiceStatusColor = (status: ServiceHistory['status']) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#666666';
    }
  };

  const getServiceStatusLabel = (status: ServiceHistory['status']) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      case 'cancelled':
        return 'Annulé';
      default:
        return status;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Détails du client</Text>
      </View>

      {/* Client Profile */}
      <View style={styles.profileSection}>
        <View style={styles.profileHeader}>
          <Image source={{ uri: client.avatar }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{client.name}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(client.status)}15` }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(client.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(client.status) }]}>
                  {getStatusLabel(client.status)}
                </Text>
              </View>
            </View>
            <View style={styles.contactInfo}>
              <View style={styles.contactRow}>
                <Phone size={16} color="#666" />
                <Text style={styles.contactText}>{client.phone}</Text>
              </View>
              <View style={styles.contactRow}>
                <Mail size={16} color="#666" />
                <Text style={styles.contactText}>{client.email}</Text>
              </View>
              <View style={styles.contactRow}>
                <MapPin size={16} color="#666" />
                <Text style={styles.contactText}>{client.port}</Text>
              </View>
              <View style={styles.contactRow}>
                <Calendar size={16} color="#666" />
                <Text style={styles.contactText}>
                  Membre depuis {client.memberSince}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleMessage}
          >
            <MessageSquare size={20} color="#0066CC" />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleRequests}
          >
            <FileText size={20} color="#0066CC" />
            <Text style={styles.actionButtonText}>Demandes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'boats' && styles.activeTab]}
          onPress={() => setSelectedTab('boats')}
        >
          <Text style={[styles.tabText, selectedTab === 'boats' && styles.activeTabText]}>
            Bateaux
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
          onPress={() => setSelectedTab('history')}
        >
          <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {selectedTab === 'boats' ? (
        <View style={styles.boatsContainer}>
          {client.boats.map((boat) => (
            <View key={boat.id} style={styles.boatCard}>
              <Image source={{ uri: boat.image }} style={styles.boatImage} />
              <View style={styles.boatContent}>
                <View style={styles.boatHeader}>
                  <View style={styles.boatInfo}>
                    <Text style={styles.boatName}>{boat.name}</Text>
                    <Text style={styles.boatType}>{boat.type}</Text>
                  </View>
                  <View style={[styles.boatStatusBadge, { backgroundColor: `${getBoatStatusColor(boat.status)}15` }]}>
                    <View style={[styles.statusDot, { backgroundColor: getBoatStatusColor(boat.status) }]} />
                    <Text style={[styles.boatStatusText, { color: getBoatStatusColor(boat.status) }]}>
                      {getBoatStatusLabel(boat.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.boatDetails}>
                  {boat.lastService && (
                    <View style={styles.boatDetailRow}>
                      <CheckCircle2 size={16} color="#666" />
                      <Text style={styles.boatDetailText}>
                        Dernier service : {formatDate(boat.lastService)}
                      </Text>
                    </View>
                  )}
                  {boat.nextService && (
                    <View style={styles.boatDetailRow}>
                      <Calendar size={16} color="#666" />
                      <Text style={styles.boatDetailText}>
                        Prochain service : {formatDate(boat.nextService)}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity 
                  style={styles.boatButton}
                  onPress={() => router.push(`/boats/${boat.id}`)}
                >
                  <Text style={styles.boatButtonText}>Voir les détails</Text>
                  <ChevronRight size={20} color="#0066CC" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.historyContainer}>
          {mockServiceHistory.map((service) => (
            <TouchableOpacity 
              key={service.id} 
              style={styles.serviceCard}
              onPress={() => router.push(`/request/${service.id}`)}
            >
              <View style={styles.serviceHeader}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceType}>{service.type}</Text>
                  <Text style={styles.serviceDate}>{formatDate(service.date)}</Text>
                </View>
                <View style={[styles.serviceStatusBadge, { backgroundColor: `${getServiceStatusColor(service.status)}15` }]}>
                  <Text style={[styles.serviceStatusText, { color: getServiceStatusColor(service.status) }]}>
                    {getServiceStatusLabel(service.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.serviceDetails}>
                <View style={styles.serviceBoat}>
                  <Boat size={16} color="#666" />
                  <Text style={styles.serviceBoatName}>{service.boat.name}</Text>
                </View>
                <Text style={styles.serviceDescription}>{service.description}</Text>
              </View>

              <View style={styles.serviceFooter}>
                <Text style={styles.viewDetails}>Voir les détails</Text>
                <ChevronRight size={20} color="#0066CC" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
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
  profileSection: {
    backgroundColor: 'white',
    padding: 20,
    gap: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileInfo: {
    flex: 1,
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
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
    gap: 8,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: '600',
  },
  boatsContainer: {
    padding: 20,
    gap: 20,
  },
  boatCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
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
  boatImage: {
    width: '100%',
    height: 200,
  },
  boatContent: {
    padding: 16,
    gap: 16,
  },
  boatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  boatInfo: {
    flex: 1,
  },
  boatName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  boatType: {
    fontSize: 14,
    color: '#666',
  },
  boatStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  boatStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  boatDetails: {
    gap: 8,
  },
  boatDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatDetailText: {
    fontSize: 14,
    color: '#666',
  },
  boatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  boatButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  historyContainer: {
    padding: 20,
    gap: 16,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
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
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceInfo: {
    gap: 4,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  serviceDate: {
    fontSize: 14,
    color: '#666',
  },
  serviceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  serviceDetails: {
    padding: 16,
    gap: 8,
  },
  serviceBoat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceBoatName: {
    fontSize: 14,
    color: '#666',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  viewDetails: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});