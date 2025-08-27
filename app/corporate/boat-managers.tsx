import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, User, ChevronRight, X, Phone, Mail, MapPin, Plus, Edit, Trash, Star } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
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

interface BoatManager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  ports: string[]; // Noms des ports
  rating?: number;
  reviewCount?: number;
  skills: string[]; // Noms des compétences
  boatTypes: string[]; // Noms des types de bateaux
  createdAt: string;
  lastLogin?: string;
}

type SortKey = 'name' | 'rating' | 'port';

export default function BoatManagersScreen() {
  const { user } = useAuth();
  const [boatManagers, setBoatManagers] = useState<BoatManager[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<BoatManager[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedManager, setSelectedManager] = useState<BoatManager | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<TextInput>(null); // Create a ref for the TextInput

  // Get unique ports for filtering
  const uniquePorts = useMemo(() => {
    const ports = new Set<string>();
    boatManagers.forEach(manager => {
      manager.ports.forEach(port => ports.add(port));
    });
    return Array.from(ports);
  }, [boatManagers]);

  const fetchBoatManagers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          e_mail,
          phone,
          avatar,
          rating,
          review_count,
          created_at,
          last_login,
          user_ports(ports(name)),
          user_categorie_service(categorie_service(description1))
        `)
        .eq('profile', 'boat_manager');

      if (fetchError) {
        console.error('Error fetching boat managers:', fetchError);
        setError('Échec du chargement des Boat Managers.');
        return;
      }

      const managersWithDetails: BoatManager[] = await Promise.all(data.map(async (bm: any) => {
        const signedAvatarUrl = await getSignedAvatarUrl(bm.avatar);
        const ports = bm.user_ports.map((up: any) => up.ports?.name).filter(Boolean);
        const skills = bm.user_categorie_service.map((ucs: any) => ucs.categorie_service?.description1).filter(Boolean);

        return {
          id: bm.id,
          firstName: bm.first_name,
          lastName: bm.last_name,
          email: bm.e_mail,
          phone: bm.phone,
          avatar: signedAvatarUrl || DEFAULT_AVATAR,
          ports: ports,
          rating: bm.rating || 0,
          reviewCount: bm.review_count || 0,
          skills: skills,
          boatTypes: [], // Not directly available in this query, might need another join or be hardcoded
          createdAt: bm.created_at,
          lastLogin: bm.last_login,
        };
      }));

      setBoatManagers(managersWithDetails);
    } catch (e: any) {
      console.error('Unexpected error fetching boat managers:', e);
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoatManagers();
  }, [fetchBoatManagers]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...boatManagers];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(manager => 
        `${manager.firstName} ${manager.lastName}`.toLowerCase().includes(query) ||
        manager.email.toLowerCase().includes(query) ||
        manager.phone.toLowerCase().includes(query) ||
        manager.ports.some(port => port.toLowerCase().includes(query)) ||
        manager.skills.some(skill => skill.toLowerCase().includes(query))
      );
    }
    
    // Apply port filter
    if (selectedPort) {
      result = result.filter(manager => manager.ports.includes(selectedPort));
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA: any, valueB: any;
      
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
      setSortAsc(true);
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

  const confirmDeleteManager = async () => {
    if (!selectedManager) return;

    setLoading(true);
    try {
      // The ON DELETE CASCADE in the database should handle related records.
      // We only need to delete the user from the 'users' table.
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedManager.id);

      if (deleteUserError) {
        throw deleteUserError;
      }

      Alert.alert('Succès', 'Le Boat Manager a été supprimé avec succès.');
      setShowDeleteConfirmModal(false);
      setShowDetailsModal(false);
      fetchBoatManagers(); // Re-fetch the list to update UI
    } catch (e: any) {
      console.error('Error deleting boat manager:', e.message);
      Alert.alert('Erreur', `Échec de la suppression du Boat Manager: ${e.message}`);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des Boat Managers...</Text>
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
        <Text style={styles.title}>Boat Managers</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddManager}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TouchableOpacity // Wrap Search icon and TextInput in TouchableOpacity
          style={styles.searchInputContainer}
          onPress={() => searchInputRef.current?.focus()} // Focus TextInput on press
        >
          <Search size={20} color="#666" />
          <TextInput
            ref={searchInputRef} // Assign ref to TextInput
            style={styles.searchInput}
            placeholder="Rechercher un Boat Manager..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </TouchableOpacity>
        
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
            <User size={48} color="#ccc" />
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
    justifyContent: 'space-between', // Gardé pour la répartition
  },
  backButton: {
    padding: 8,
    // Supprimé le marginRight pour laisser le flexbox gérer l'espacement
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1, // Ajouté pour que le titre prenne l'espace disponible
    textAlign: 'center', // Centré le texte du titre
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
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
  searchInputContainer: { // New style for the TouchableOpacity wrapper
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc', // Changed to match the input background
    borderRadius: 12,
    borderWidth: 1, // Added border to match input style
    borderColor: '#e2e8f0', // Added border color
    paddingHorizontal: 12, // Adjusted padding
    height: 48, // Fixed height
  },
  searchInput: {
    flex: 1,
    marginLeft: 8, // Adjusted margin
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
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
  emptyStateText: {
    fontSize: 16,
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
  portName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
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
    marginBottom: 16,
  },
  boatTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
        boxBoxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
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
