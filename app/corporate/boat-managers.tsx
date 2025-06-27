import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, User, ChevronRight, X, Phone, Mail, MapPin, Star, Plus, Users, CreditCard as Edit, Trash } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

type SortKey = 'name' | 'rating' | 'port';

interface BoatManager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  ports: string[];
  rating: number;
  reviewCount: number;
  skills: string[];
  boatTypes: string[];
  clientCount: number;
  createdAt: string;
  lastLogin?: string;
}

// Mock data for boat managers
const mockBoatManagers: BoatManager[] = [
  {
    id: 'bm1',
    firstName: 'Marie',
    lastName: 'Martin',
    email: 'marie.martin@ybm.com',
    phone: '+33 6 12 34 56 78',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop',
    ports: ['Port de Marseille'],
    rating: 4.8,
    reviewCount: 36,
    skills: ['Entretien', 'Amélioration', 'Réparation', 'Contrôle'],
    boatTypes: ['Voilier', 'Yacht', 'Catamaran'],
    clientCount: 12,
    createdAt: '2023-01-15',
    lastLogin: '2024-02-20'
  },
  {
    id: 'bm2',
    firstName: 'Pierre',
    lastName: 'Dubois',
    email: 'pierre.dubois@ybm.com',
    phone: '+33 6 23 45 67 89',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    ports: ['Port de Nice'],
    rating: 4.6,
    reviewCount: 24,
    skills: ['Entretien', 'Gestion des accès', 'Sécurité'],
    boatTypes: ['Voilier', 'Yacht'],
    clientCount: 8,
    createdAt: '2023-03-10',
    lastLogin: '2024-02-19'
  },
  {
    id: 'bm3',
    firstName: 'Sophie',
    lastName: 'Laurent',
    email: 'sophie.laurent@ybm.com',
    phone: '+33 6 34 56 78 90',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop',
    ports: ['Port de Saint-Tropez'],
    rating: 4.9,
    reviewCount: 31,
    skills: ['Entretien', 'Amélioration', 'Réparation', 'Représentation', 'Achat/Vente'],
    boatTypes: ['Voilier', 'Yacht', 'Catamaran', 'Motoryacht'],
    clientCount: 15,
    createdAt: '2022-11-05',
    lastLogin: '2024-02-18'
  },
  {
    id: 'bm4',
    firstName: 'Lucas',
    lastName: 'Bernard',
    email: 'lucas.bernard@ybm.com',
    phone: '+33 6 45 67 89 01',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    ports: ['Port de Cannes'],
    rating: 4.7,
    reviewCount: 22,
    skills: ['Entretien', 'Contrôle', 'Gestion des accès'],
    boatTypes: ['Voilier', 'Yacht'],
    clientCount: 10,
    createdAt: '2023-05-20',
    lastLogin: '2024-02-17'
  },
  {
    id: 'bm5',
    firstName: 'Émilie',
    lastName: 'Rousseau',
    email: 'emilie.rousseau@ybm.com',
    phone: '+33 6 56 78 90 12',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    ports: ['Port de Marseille', 'Port de Cassis'],
    rating: 4.5,
    reviewCount: 18,
    skills: ['Entretien', 'Sécurité', 'Achat/Vente'],
    boatTypes: ['Voilier', 'Catamaran'],
    clientCount: 7,
    createdAt: '2023-08-15',
    lastLogin: '2024-02-16'
  }
];

export default function BoatManagersScreen() {
  const { user } = useAuth();
  const [boatManagers, setBoatManagers] = useState<BoatManager[]>(mockBoatManagers);
  const [filteredManagers, setFilteredManagers] = useState<BoatManager[]>(mockBoatManagers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedManager, setSelectedManager] = useState<BoatManager | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Get unique ports for filtering
  const uniquePorts = [...new Set(boatManagers.flatMap(manager => manager.ports))];

  // Apply filters and sorting
  useEffect(() => {
    let result = [...boatManagers];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(manager => 
        `${manager.firstName} ${manager.lastName}`.toLowerCase().includes(query) ||
        manager.email.toLowerCase().includes(query) ||
        manager.ports.some(port => port.toLowerCase().includes(query)) ||
        manager.skills.some(skill => skill.toLowerCase().includes(query)) ||
        manager.boatTypes.some(type => type.toLowerCase().includes(query))
      );
    }
    
    // Apply port filter
    if (selectedPort) {
      result = result.filter(manager => manager.ports.includes(selectedPort));
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortKey) {
        case 'name':
          valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'rating':
          valueA = a.rating;
          valueB = b.rating;
          break;
        case 'port':
          valueA = a.ports[0]?.toLowerCase() || '';
          valueB = b.ports[0]?.toLowerCase() || '';
          break;
        default:
          valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        if (valueA < valueB) return sortAsc ? -1 : 1;
        if (valueA > valueB) return sortAsc ? 1 : -1;
        return 0;
      } else {
        return sortAsc ? (valueA as number) - (valueB as number) : (valueB as number) - (valueA as number);
      }
    });
    
    setFilteredManagers(result);
  }, [boatManagers, searchQuery, selectedPort, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name'); // Default ascending for name, descending for rating
    }
  };

  const handleViewDetails = (manager: BoatManager) => {
    setSelectedManager(manager);
    setShowDetailsModal(true);
  };

  const handleAddManager = () => {
    router.push('/corporate/boat-managers/new');
  };

  const handleEditManager = () => {
    if (selectedManager) {
      setShowDetailsModal(false);
      router.push(`/corporate/boat-managers/${selectedManager.id}/edit`);
    }
  };

  const handleDeleteManager = () => {
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteManager = () => {
    if (selectedManager) {
      // Filtrer le boat manager sélectionné de la liste
      const updatedManagers = boatManagers.filter(manager => manager.id !== selectedManager.id);
      setBoatManagers(updatedManagers);
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
  const ManagerDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détails du Boat Manager</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedManager && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.userProfileHeader}>
                <Image source={{ uri: selectedManager.avatar }} style={styles.userProfileImage} />
                <View style={styles.userProfileInfo}>
                  <Text style={styles.userProfileName}>
                    {selectedManager.firstName} {selectedManager.lastName}
                  </Text>
                  <View style={styles.ratingContainer}>
                    <Star size={16} color="#FFC107" fill="#FFC107" />
                    <Text style={styles.ratingText}>
                      {selectedManager.rating} ({selectedManager.reviewCount} avis)
                    </Text>
                  </View>
                  <Text style={styles.userProfileDate}>
                    Membre depuis {formatDate(selectedManager.createdAt)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Informations de contact</Text>
                
                <View style={styles.detailItem}>
                  <Mail size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedManager.email}</Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <Phone size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Téléphone</Text>
                    <Text style={styles.detailValue}>{selectedManager.phone}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Ports d'attache</Text>
                
                {selectedManager.ports.map((port, index) => (
                  <View key={index} style={styles.portItem}>
                    <MapPin size={20} color="#0066CC" />
                    <Text style={styles.portName}>{port}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Compétences</Text>
                
                <View style={styles.skillsContainer}>
                  {selectedManager.skills.map((skill, index) => (
                    <View key={index} style={styles.skillBadge}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Types de bateaux</Text>
                
                <View style={styles.boatTypesContainer}>
                  {selectedManager.boatTypes.map((type, index) => (
                    <View key={index} style={styles.boatTypeBadge}>
                      <Text style={styles.boatTypeText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Activité</Text>
                
                <View style={styles.activityItem}>
                  <Text style={styles.activityLabel}>Nombre de clients</Text>
                  <Text style={styles.activityValue}>{selectedManager.clientCount}</Text>
                </View>
                
                <View style={styles.activityItem}>
                  <Text style={styles.activityLabel}>Dernière connexion</Text>
                  <Text style={styles.activityValue}>
                    {selectedManager.lastLogin ? formatDate(selectedManager.lastLogin) : 'Jamais'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
          
          <View style={styles.modalFooter}>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={handleDeleteManager}
              >
                <Trash size={20} color="white" />
                <Text style={styles.deleteButtonText}>Supprimer</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditManager}
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
            Êtes-vous sûr de vouloir supprimer ce Boat Manager ? Cette action est irréversible.
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
              onPress={confirmDeleteManager}
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
        <Text style={styles.title}>Boat Managers</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddManager}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un Boat Manager..."
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
          style={[styles.sortButton, sortKey === 'rating' && styles.sortButtonActive]}
          onPress={() => handleSort('rating')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'rating' && styles.sortButtonTextActive]}>
            Note {sortKey === 'rating' && (sortAsc ? '↑' : '↓')}
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

      <ScrollView style={styles.managersList}>
        {filteredManagers.length > 0 ? (
          filteredManagers.map((manager) => (
            <TouchableOpacity 
              key={manager.id} 
              style={styles.managerCard}
              onPress={() => handleViewDetails(manager)}
            >
              <View style={styles.managerInfo}>
                <Text style={styles.managerName}>
                  {manager.firstName} {manager.lastName}
                </Text>
                <Text style={styles.managerPort}>{manager.ports.join(', ')}</Text>
              </View>
              <ChevronRight size={24} color="#0066CC" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Users size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucun Boat Manager trouvé</Text>
            <Text style={styles.emptyStateText}>
              Aucun Boat Manager ne correspond à vos critères de recherche.
            </Text>
          </View>
        )}
      </ScrollView>

      <ManagerDetailsModal />
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
  managersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  managerCard: {
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
  managerInfo: {
    flex: 1,
  },
  managerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  managerPort: {
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
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
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  portName: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  skillBadge: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 12,
    color: '#0066CC',
  },
  boatTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  boatTypeBadge: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  boatTypeText: {
    fontSize: 12,
    color: '#0066CC',
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