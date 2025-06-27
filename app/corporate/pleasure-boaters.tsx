import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, User, ChevronRight, X, Phone, Mail, MapPin, Bot as Boat, Plus, Edit, Trash } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

type SortKey = 'name' | 'port';

interface PleasureBoater {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  ports: Array<{
    id: string;
    name: string;
    boatManagerId: string;
    boatManagerName: string;
  }>;
  boats: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  createdAt: string;
  lastLogin?: string;
}

// Mock data for pleasure boaters
const mockPleasureBoaters: PleasureBoater[] = [
  {
    id: 'pb1',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    ports: [
      {
        id: 'p1',
        name: 'Port de Marseille',
        boatManagerId: 'bm1',
        boatManagerName: 'Marie Martin'
      },
      {
        id: 'p2',
        name: 'Port de Nice',
        boatManagerId: 'bm2',
        boatManagerName: 'Pierre Dubois'
      }
    ],
    boats: [
      {
        id: 'b1',
        name: 'Le Grand Bleu',
        type: 'Voilier'
      }
    ],
    createdAt: '2024-01-15',
    lastLogin: '2024-02-20'
  },
  {
    id: 'pb2',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie.martin@example.com',
    phone: '+33 6 23 45 67 89',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    ports: [
      {
        id: 'p1',
        name: 'Port de Marseille',
        boatManagerId: 'bm1',
        boatManagerName: 'Marie Martin'
      }
    ],
    boats: [
      {
        id: 'b2',
        name: 'Le Petit Prince',
        type: 'Yacht'
      },
      {
        id: 'b3',
        name: "L'Aventurier",
        type: 'Catamaran'
      }
    ],
    createdAt: '2024-01-20',
    lastLogin: '2024-02-19'
  },
  {
    id: 'pb3',
    firstName: 'Pierre',
    lastName: 'Dubois',
    email: 'pierre.dubois@example.com',
    phone: '+33 6 34 56 78 90',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    ports: [
      {
        id: 'p2',
        name: 'Port de Nice',
        boatManagerId: 'bm2',
        boatManagerName: 'Pierre Dubois'
      }
    ],
    boats: [
      {
        id: 'b4',
        name: 'Le Navigateur',
        type: 'Voilier'
      }
    ],
    createdAt: '2024-01-25',
    lastLogin: '2024-02-18'
  },
  {
    id: 'pb4',
    firstName: 'Marie',
    lastName: 'Leroy',
    email: 'marie.leroy@example.com',
    phone: '+33 6 45 67 89 01',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop',
    ports: [
      {
        id: 'p3',
        name: 'Port de Cannes',
        boatManagerId: 'bm3',
        boatManagerName: 'Sophie Laurent'
      }
    ],
    boats: [
      {
        id: 'b5',
        name: 'La Sirène',
        type: 'Yacht'
      }
    ],
    createdAt: '2024-02-01',
    lastLogin: '2024-02-17'
  },
  {
    id: 'pb5',
    firstName: 'Thomas',
    lastName: 'Bernard',
    email: 'thomas.bernard@example.com',
    phone: '+33 6 56 78 90 12',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=2574&auto=format&fit=crop',
    ports: [
      {
        id: 'p4',
        name: 'Port de Saint-Tropez',
        boatManagerId: 'bm4',
        boatManagerName: 'Lucas Bernard'
      }
    ],
    boats: [
      {
        id: 'b6',
        name: 'Le Dauphin',
        type: 'Voilier'
      }
    ],
    createdAt: '2024-02-05',
    lastLogin: '2024-02-16'
  }
];

export default function PleasureBoatersScreen() {
  const { user } = useAuth();
  const [pleasureBoaters, setPleasureBoaters] = useState<PleasureBoater[]>(mockPleasureBoaters);
  const [filteredBoaters, setFilteredBoaters] = useState<PleasureBoater[]>(mockPleasureBoaters);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedBoater, setSelectedBoater] = useState<PleasureBoater | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Get unique ports for filtering
  const uniquePorts = [...new Set(pleasureBoaters.flatMap(boater => boater.ports.map(port => port.name)))];

  // Apply filters and sorting
  useEffect(() => {
    let result = [...pleasureBoaters];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(boater => 
        `${boater.firstName} ${boater.lastName}`.toLowerCase().includes(query) ||
        boater.email.toLowerCase().includes(query) ||
        boater.ports.some(port => port.name.toLowerCase().includes(query)) ||
        boater.ports.some(port => port.boatManagerName.toLowerCase().includes(query)) ||
        boater.boats.some(boat => boat.name.toLowerCase().includes(query))
      );
    }
    
    // Apply port filter
    if (selectedPort) {
      result = result.filter(boater => boater.ports.some(port => port.name === selectedPort));
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortKey) {
        case 'name':
          valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'port':
          valueA = a.ports[0]?.name.toLowerCase() || '';
          valueB = b.ports[0]?.name.toLowerCase() || '';
          break;
        default:
          valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
      }
      
      if (valueA < valueB) return sortAsc ? -1 : 1;
      if (valueA > valueB) return sortAsc ? 1 : -1;
      return 0;
    });
    
    setFilteredBoaters(result);
  }, [pleasureBoaters, searchQuery, selectedPort, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleViewDetails = (boater: PleasureBoater) => {
    setSelectedBoater(boater);
    setShowDetailsModal(true);
  };

  const handleAddBoater = () => {
    router.push('/corporate/pleasure-boaters/new');
  };

  const handleEditBoater = () => {
    if (selectedBoater) {
      setShowDetailsModal(false);
      router.push(`/corporate/pleasure-boaters/${selectedBoater.id}/edit`);
    }
  };

  const handleDeleteBoater = () => {
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteBoater = () => {
    if (selectedBoater) {
      // Filtrer le plaisancier sélectionné de la liste
      const updatedBoaters = pleasureBoaters.filter(boater => boater.id !== selectedBoater.id);
      setPleasureBoaters(updatedBoaters);
      setShowDeleteConfirmModal(false);
      setShowDetailsModal(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Modal component for user details
  const BoaterDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détails du plaisancier</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedBoater && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.userProfileHeader}>
                <Image source={{ uri: selectedBoater.avatar }} style={styles.userProfileImage} />
                <View style={styles.userProfileInfo}>
                  <Text style={styles.userProfileName}>
                    {selectedBoater.firstName} {selectedBoater.lastName}
                  </Text>
                  <Text style={styles.userProfileDate}>
                    Membre depuis {formatDate(selectedBoater.createdAt)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Informations de contact</Text>
                
                <View style={styles.detailItem}>
                  <Mail size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedBoater.email}</Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <Phone size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Téléphone</Text>
                    <Text style={styles.detailValue}>{selectedBoater.phone}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Ports d'attache et Boat Managers</Text>
                
                {selectedBoater.ports.map((port, index) => (
                  <View key={index} style={styles.portItem}>
                    <MapPin size={20} color="#0066CC" />
                    <View style={styles.portInfo}>
                      <Text style={styles.portName}>{port.name}</Text>
                      <View style={styles.boatManagerInfo}>
                        <User size={16} color="#0066CC" />
                        <Text style={styles.boatManagerName}>{port.boatManagerName}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Bateaux</Text>
                
                {selectedBoater.boats.map((boat) => (
                  <View key={boat.id} style={styles.boatItem}>
                    <Boat size={20} color="#0066CC" />
                    <View style={styles.boatInfo}>
                      <Text style={styles.boatName}>{boat.name}</Text>
                      <Text style={styles.boatType}>{boat.type}</Text>
                    </View>
                  </View>
                ))}
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Activité</Text>
                
                <View style={styles.activityItem}>
                  <Text style={styles.activityLabel}>Dernière connexion</Text>
                  <Text style={styles.activityValue}>
                    {selectedBoater.lastLogin ? formatDate(selectedBoater.lastLogin) : 'Jamais'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
          
          <View style={styles.modalFooter}>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={handleDeleteBoater}
              >
                <Trash size={20} color="white" />
                <Text style={styles.deleteButtonText}>Supprimer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditBoater}
              >
                <Edit size={20} color="white" />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Modal de confirmation de suppression
  const DeleteConfirmModal = () => (
    <Modal
      visible={showDeleteConfirmModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDeleteConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalContent}>
          <Text style={styles.confirmModalTitle}>Confirmer la suppression</Text>
          <Text style={styles.confirmModalText}>
            Êtes-vous sûr de vouloir supprimer ce plaisancier ? Cette action est irréversible.
          </Text>
          
          <View style={styles.confirmModalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowDeleteConfirmModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.confirmDeleteButton}
              onPress={confirmDeleteBoater}
            >
              <Text style={styles.confirmDeleteButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Plaisanciers</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddBoater}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un plaisancier..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? "#0066CC" : "#666"} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>Port d'attache</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity 
              style={[
                styles.filterOption,
                selectedPort === null && styles.filterOptionSelected
              ]}
              onPress={() => setSelectedPort(null)}
            >
              <Text style={styles.filterOptionText}>Tous</Text>
            </TouchableOpacity>
            
            {uniquePorts.map((port) => (
              <TouchableOpacity 
                key={port}
                style={[
                  styles.filterOption,
                  selectedPort === port && styles.filterOptionSelected
                ]}
                onPress={() => setSelectedPort(port)}
              >
                <MapPin size={16} color="#0066CC" />
                <Text style={styles.filterOptionText}>{port}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.sortContainer}>
        <TouchableOpacity 
          style={[styles.sortButton, sortKey === 'name' && styles.sortButtonActive]}
          onPress={() => handleSort('name')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'name' && styles.sortButtonTextActive]}>
            Nom {sortKey === 'name' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, sortKey === 'port' && styles.sortButtonActive]}
          onPress={() => handleSort('port')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'port' && styles.sortButtonTextActive]}>
            Port {sortKey === 'port' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.boatersList}>
        {filteredBoaters.length > 0 ? (
          filteredBoaters.map((boater) => (
            <TouchableOpacity 
              key={boater.id} 
              style={styles.boaterCard}
              onPress={() => handleViewDetails(boater)}
            >
              <View style={styles.boaterInfo}>
                <Text style={styles.boaterName}>
                  {boater.firstName} {boater.lastName}
                </Text>
                <Text style={styles.boaterPort}>
                  {boater.ports.map(port => port.name).join(', ')}
                </Text>
              </View>
              <ChevronRight size={24} color="#0066CC" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <User size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucun plaisancier trouvé</Text>
            <Text style={styles.emptyStateText}>
              Aucun plaisancier ne correspond à vos critères de recherche.
            </Text>
          </View>
        )}
      </ScrollView>

      <BoaterDetailsModal />
      <DeleteConfirmModal />
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
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
  filterButtonActive: {
    backgroundColor: '#f0f7ff',
  },
  filtersContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
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
  filterTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  sortButtonActive: {
    backgroundColor: '#f0f7ff',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#0066CC',
    fontWeight: '500',
  },
  boatersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  boaterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  boaterInfo: {
    flex: 1,
  },
  boaterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  boaterPort: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 20,
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
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  confirmModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  confirmModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  userProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  userProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userProfileInfo: {
    flex: 1,
  },
  userProfileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userProfileDate: {
    fontSize: 14,
    color: '#666',
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  portItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  portInfo: {
    flex: 1,
  },
  portName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  boatManagerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatManagerName: {
    fontSize: 14,
    color: '#0066CC',
  },
  boatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  boatInfo: {
    flex: 1,
  },
  boatName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  boatType: {
    fontSize: 14,
    color: '#666',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityLabel: {
    fontSize: 14,
    color: '#666',
  },
  activityValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  editButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
      },
    }),
  },
  deleteButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});