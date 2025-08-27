import { useState, useEffect, useMemo, useCallback, useRef } from 'react'; // Import useRef
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Building, ChevronRight, X, Phone, Mail, MapPin, Star, Award, Plus, Briefcase, Ship, CreditCard as Edit, Trash } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

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

interface NauticalCompany {
  id: string;
  name: string; // company_name
  email: string; // e_mail
  phone: string; // phone
  logo: string; // avatar (signed URL)
  address: string; // address
  ports: string[]; // user_ports -> ports.name
  rating?: number; // rating
  reviewCount?: number; // review_count
  services: string[]; // user_categorie_service -> categorie_service.description1 (these are the skills/services they offer)
  skills: string[]; // Kept for consistency with mock, but will be empty or derived
  boatTypes: string[]; // Kept for consistency with mock, but will be empty or derived
  certifications: string[]; // Kept for consistency with mock, but will be empty or derived
  createdAt: string; // created_at
  lastLogin?: string; // last_login
}

type SortKey = 'name' | 'rating' | 'port';

export default function NauticalCompaniesScreen() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<NauticalCompany[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<NauticalCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<NauticalCompany | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<TextInput>(null); // Create a ref for the TextInput

  // Get unique ports for filtering
  const uniquePorts = useMemo(() => {
    const ports = new Set<string>();
    companies.forEach(company => {
      company.ports.forEach(port => ports.add(port));
    });
    return Array.from(ports);
  }, [companies]);

  const fetchNauticalCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          id,
          company_name,
          e_mail,
          phone,
          avatar,
          address,
          rating,
          review_count,
          created_at,
          last_login,
          user_ports(ports(name)),
          user_categorie_service(categorie_service(description1))
        `)
        .eq('profile', 'nautical_company');

      if (fetchError) {
        console.error('Error fetching nautical companies:', fetchError);
        setError('Échec du chargement des entreprises du nautisme.');
        return;
      }

      const companiesWithDetails: NauticalCompany[] = await Promise.all(data.map(async (nc: any) => {
        const signedLogoUrl = await getSignedAvatarUrl(nc.avatar);
        const ports = nc.user_ports.map((up: any) => up.ports?.name).filter(Boolean);
        const services = nc.user_categorie_service.map((ucs: any) => ucs.categorie_service?.description1).filter(Boolean);

        return {
          id: nc.id,
          name: nc.company_name,
          email: nc.e_mail,
          phone: nc.phone,
          logo: signedLogoUrl || DEFAULT_AVATAR,
          address: nc.address,
          ports: ports,
          rating: nc.rating || 0,
          reviewCount: nc.review_count || 0,
          services: services,
          skills: [], // Not directly from DB, keep empty or derive if possible
          boatTypes: [], // Not directly from DB, keep empty or derive if possible
          certifications: [], // Not directly from DB, keep empty or derive if possible
          createdAt: nc.created_at,
          lastLogin: nc.last_login,
        };
      }));

      setCompanies(companiesWithDetails);
    } catch (e: any) {
      console.error('Unexpected error fetching nautical companies:', e);
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useFocusEffect to re-fetch companies when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchNauticalCompanies();
      // No cleanup needed for this effect, as it's just fetching data
    }, [fetchNauticalCompanies]) // Dependency on the memoized fetch function
  );

  // Apply filters and sorting
  useEffect(() => {
    let result = [...companies];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(company => 
        company.name?.toLowerCase().includes(query) || // Correction ici
        company.email?.toLowerCase().includes(query) || // Correction ici
        company.ports.some(port => port?.toLowerCase().includes(query)) || // Correction ici
        company.services.some(service => service?.toLowerCase().includes(query)) // Correction ici
      );
    }
    
    // Apply port filter
    if (selectedPort) {
      result = result.filter(company => company.ports.includes(selectedPort));
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortKey) {
        case 'name':
          valueA = a.name?.toLowerCase() || ''; // Correction ici
          valueB = b.name?.toLowerCase() || ''; // Correction ici
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
          valueA = a.name?.toLowerCase() || ''; // Correction ici
          valueB = b.name?.toLowerCase() || ''; // Correction ici
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        if (valueA < valueB) return sortAsc ? -1 : 1;
        if (valueA > valueB) return sortAsc ? 1 : -1;
        return 0;
      } else {
        return sortAsc ? (valueA as number) - (valueB as number) : (valueB as number) - (valueA as number);
      }
    });
    
    setFilteredCompanies(result);
  }, [companies, searchQuery, selectedPort, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name'); // Default ascending for name, descending for rating
    }
  };

  const handleViewDetails = (company: NauticalCompany) => {
    setSelectedCompany(company);
    setShowDetailsModal(true);
  };

  const handleAddCompany = () => {
    router.push('/corporate/nautical-companies/new');
  };

  const handleEditCompany = () => {
    if (selectedCompany) {
      setShowDetailsModal(false);
      router.push(`/corporate/nautical-companies/${selectedCompany.id}/edit`);
    }
  };

  const handleDeleteCompany = () => {
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteCompany = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      // 1. Delete user_ports assignments
      const { error: deleteUserPortsError } = await supabase
        .from('user_ports')
        .delete()
        .eq('user_id', selectedCompany.id);

      if (deleteUserPortsError) {
        throw deleteUserPortsError;
      }

      // 2. Delete user_categorie_service assignments
      const { error: deleteUserCategoriesError } = await supabase
        .from('user_categorie_service')
        .delete()
        .eq('user_id', selectedCompany.id);

      if (deleteUserCategoriesError) {
        throw deleteUserCategoriesError;
      }

      // 3. Delete the user from the 'users' table
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedCompany.id);

      if (deleteUserError) {
        throw deleteUserError;
      }

      Alert.alert('Succès', 'L\'entreprise a été supprimée avec succès.');
      setShowDeleteConfirmModal(false);
      setShowDetailsModal(false);
      fetchNauticalCompanies(); // Re-fetch the list to update UI
    } catch (e: any) {
      console.error('Error deleting nautical company:', e.message);
      Alert.alert('Erreur', `Échec de la suppression de l'entreprise: ${e.message}`);
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

  // Modal component for company details
  const CompanyDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détails de l'entreprise</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedCompany && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.companyProfileHeader}>
                <Image source={{ uri: selectedCompany.logo }} style={styles.companyLogo} />
                <View style={styles.companyProfileInfo}>
                  <Text style={styles.companyName}>{selectedCompany.name}</Text>
                  <View style={styles.ratingContainer}>
                    <Star size={16} color="#FFC107" fill="#FFC107" />
                    <Text style={styles.ratingText}>
                      {selectedCompany.rating} ({selectedCompany.reviewCount} avis)
                    </Text>
                  </View>
                  <Text style={styles.companyDate}>
                    Membre depuis {formatDate(selectedCompany.createdAt)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Informations de contact</Text>
                
                <View style={styles.detailItem}>
                  <Mail size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedCompany.email}</Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <Phone size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Téléphone</Text>
                    <Text style={styles.detailValue}>{selectedCompany.phone}</Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <MapPin size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Adresse</Text>
                    <Text style={styles.detailValue}>{selectedCompany.address}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Ports d'intervention</Text>
                
                {selectedCompany.ports.map((port, index) => (
                  <View key={index} style={styles.portItem}>
                    <MapPin size={20} color="#0066CC" />
                    <Text style={styles.portName}>{port}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Services proposés</Text>
                
                <View style={styles.servicesContainer}>
                  {selectedCompany.services.map((service, index) => (
                    <View key={index} style={styles.serviceBadge}>
                      <Briefcase size={14} color="#0066CC" />
                      <Text style={styles.serviceText}>{service}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Compétences</Text>
                
                <View style={styles.skillsContainer}>
                  {selectedCompany.skills.map((skill, index) => (
                    <View key={index} style={styles.skillBadge}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Types de bateaux</Text>
                
                <View style={styles.boatTypesContainer}>
                  {selectedCompany.boatTypes.map((type, index) => (
                    <View key={index} style={styles.boatTypeBadge}>
                      <Ship size={14} color="#0066CC" />
                      <Text style={styles.boatTypeText}>{type}</Text>
                    </View>
                  ))}
                </View>
              </View>
              
              {/* Removed Certifications Section */}
              {/*
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Certifications</Text>
                
                <View style={styles.certificationsContainer}>
                  {selectedCompany.certifications.map((cert, index) => (
                    <View key={index} style={styles.certificationBadge}>
                      <Award size={14} color="#0066CC" />
                      <Text style={styles.certificationText}>{cert}</Text>
                    </View>
                  ))}
                </View>
              </View>
              */}
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Activité</Text>
                
                <View style={styles.activityItem}>
                  <Text style={styles.activityLabel}>Dernière connexion</Text>
                  <Text style={styles.activityValue}>
                    {selectedCompany.lastLogin ? formatDate(selectedCompany.lastLogin) : 'Jamais'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
          
          <View style={styles.modalFooter}>
            <View style={styles.modalActions}>
              {/* Only one "Modifier" button */}
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditCompany}
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
            Êtes-vous sûr de vouloir supprimer cette entreprise ? Cette action est irréversible.
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
              onPress={confirmDeleteCompany}
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
        <Text style={styles.loadingText}>Chargement des entreprises du nautisme...</Text>
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
        <Text style={styles.title}>Entreprises du nautisme</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddCompany}
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
            placeholder="Rechercher une entreprise..."
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
          <Text style={styles.filterTitle}>Port d'intervention</Text>
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

      <ScrollView style={styles.companiesList}>
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map((company) => (
            <TouchableOpacity 
              key={company.id} 
              style={styles.companyCard}
              onPress={() => handleViewDetails(company)}
            >
              <View style={styles.companyInfo}>
                <Text style={styles.companyCardName}>{company.name}</Text>
                <Text style={styles.companyPorts}>{company.ports.join(', ')}</Text>
              </View>
              <ChevronRight size={24} color="#0066CC" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Building size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucune entreprise trouvée</Text>
            <Text style={styles.emptyStateText}>
              Aucune entreprise ne correspond à vos critères de recherche.
            </Text>
          </View>
        )}
      </ScrollView>

      <CompanyDetailsModal />
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
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
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
  companiesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  companyCard: {
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
  companyInfo: {
    flex: 1,
  },
  companyCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  companyPorts: {
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
  companyProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  companyLogo: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  companyProfileInfo: {
    flex: 1,
  },
  companyName: {
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
  companyDate: {
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
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  serviceText: {
    fontSize: 12,
    color: '#0066CC',
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
  certificationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  certificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  certificationText: {
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
