// app/corporate/partners.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Star, MapPin, Phone, Mail, X, ChevronRight, Building, Users, Briefcase, Ship, Award } from 'lucide-react-native';
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

type PartnerType = 'boat_manager' | 'nautical_company';
type SortKey = 'name' | 'rating' | 'port';

interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  email: string;
  phone: string;
  ports: string[]; // Array of port names
  rating: number;
  reviewCount: number;
  image: string; // Signed URL for avatar
  services: string[]; // Array of service names (skills)
  address?: string; // Only for nautical companies
  createdAt: string;
  lastLogin?: string;
}

export default function PartnersScreen() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PartnerType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<TextInput>(null);

  // Get unique ports for filtering
  const uniquePorts = useMemo(() => {
    const ports = new Set<string>();
    partners.forEach(partner => {
      partner.ports.forEach(port => ports.add(port));
    });
    return Array.from(ports);
  }, [partners]);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          company_name,
          e_mail,
          phone,
          avatar,
          address,
          rating,
          review_count,
          created_at,
          last_login,
          profile,
          user_ports(ports(name)),
          user_categorie_service(categorie_service(description1))
        `)
        .in('profile', ['boat_manager', 'nautical_company']);

      if (fetchError) {
        console.error('Error fetching partners:', fetchError);
        setError('Échec du chargement des partenaires.');
        return;
      }

      const processedPartners: Partner[] = await Promise.all(data.map(async (p: any) => {
        const signedAvatarUrl = await getSignedAvatarUrl(p.avatar);
        const ports = p.user_ports.map((up: any) => up.ports?.name).filter(Boolean);
        const services = p.user_categorie_service.map((ucs: any) => ucs.categorie_service?.description1).filter(Boolean);

        return {
          id: p.id,
          name: p.profile === 'boat_manager' ? `${p.first_name} ${p.last_name}` : p.company_name,
          type: p.profile as PartnerType,
          email: p.e_mail,
          phone: p.phone,
          ports: ports,
          rating: p.rating || 0,
          reviewCount: p.review_count || 0,
          image: signedAvatarUrl || DEFAULT_AVATAR,
          services: services,
          address: p.address,
          createdAt: p.created_at,
          lastLogin: p.last_login,
        };
      }));

      setPartners(processedPartners);
    } catch (e: any) {
      console.error('Unexpected error fetching partners:', e);
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Use useFocusEffect to re-fetch partners when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchPartners();
      // No cleanup needed for this effect, as it's just fetching data
    }, [fetchPartners]) // Dependency on the memoized fetch function
  );

  // Apply filters and sorting
  useEffect(() => {
    let result = [...partners];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(partner => 
        partner.name.toLowerCase().includes(query) ||
        partner.email.toLowerCase().includes(query) ||
        partner.ports.some(port => port.toLowerCase().includes(query)) ||
        partner.services.some(service => service.toLowerCase().includes(query))
      );
    }
    
    // Apply type filter
    if (selectedType) {
      result = result.filter(partner => partner.type === selectedType);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortKey) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
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
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        if (valueA < valueB) return sortAsc ? -1 : 1;
        if (valueA > valueB) return sortAsc ? 1 : -1;
        return 0;
      } else {
        return sortAsc ? (valueA as number) - (valueB as number) : (valueB as number) - (valueA as number);
      }
    });
    
    setFilteredPartners(result);
  }, [partners, searchQuery, selectedType, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name'); // Default ascending for name, descending for rating
    }
  };

  const handleViewPartnerDetails = (partner: Partner) => {
    setSelectedPartner(partner);
    setShowDetailsModal(true);
  };

  const handleViewBoatManagers = () => {
    router.push('/corporate/boat-managers');
  };

  const handleViewNauticalCompanies = () => {
    router.push('/corporate/nautical-companies');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Modal component for partner details
  const PartnerDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détails du partenaire</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedPartner && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.partnerProfileHeader}>
                <Image source={{ uri: selectedPartner.image }} style={styles.partnerLogo} />
                <View style={styles.partnerProfileInfo}>
                  <Text style={styles.partnerProfileName}>{selectedPartner.name}</Text>
                  <View style={[
                    styles.partnerTypeBadge, 
                    { backgroundColor: `${selectedPartner.type === 'boat_manager' ? '#10B981' : '#8B5CF6'}15` }
                  ]}>
                    <Text style={[
                      styles.partnerTypeText,
                      { color: selectedPartner.type === 'boat_manager' ? '#10B981' : '#8B5CF6' }
                    ]}>
                      {selectedPartner.type === 'boat_manager' ? 'Boat Manager' : 'Entreprise du nautisme'}
                    </Text>
                  </View>
                  <View style={styles.ratingContainer}>
                    <Star size={16} color="#FFC107" fill="#FFC107" />
                    <Text style={styles.ratingText}>
                      {selectedPartner.rating} ({selectedPartner.reviewCount} avis)
                    </Text>
                  </View>
                  <Text style={styles.partnerDate}>
                    Membre depuis {formatDate(selectedPartner.createdAt)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Informations de contact</Text>
                
                <View style={styles.detailItem}>
                  <Mail size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedPartner.email}</Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <Phone size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Téléphone</Text>
                    <Text style={styles.detailValue}>{selectedPartner.phone}</Text>
                  </View>
                </View>
                
                {selectedPartner.address && ( // Ligne 342 : Ajout de la vérification conditionnelle
                  <View style={styles.detailItem}>
                    <MapPin size={20} color="#0066CC" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Adresse</Text>
                      <Text style={styles.detailValue}>{selectedPartner.address}</Text>
                    </View>
                  </View>
                )}
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Ports d'intervention</Text>
                
                {selectedPartner.ports.map((port, index) => (
                  <View key={index} style={styles.portItem}>
                    <MapPin size={20} color="#0066CC" />
                    <Text style={styles.portName}>{port}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Services proposés</Text>
                
                <View style={styles.servicesContainer}>
                  {selectedPartner.services.length > 0 ? ( // Ajout de la vérification de longueur
                    selectedPartner.services.map((service, index) => (
                      <View key={index} style={styles.serviceBadge}>
                        <Briefcase size={14} color="#0066CC" />
                        <Text style={styles.serviceText}>{service}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyModalText}>Aucun service proposé.</Text> // Message si aucun service
                  )}
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Activité</Text>
                
                <View style={styles.activityItem}>
                  <Text style={styles.activityLabel}>Dernière connexion</Text>
                  <Text style={styles.activityValue}>
                    {selectedPartner.lastLogin ? formatDate(selectedPartner.lastLogin) : 'Jamais'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des partenaires...</Text>
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
        <Text style={styles.title}>Partenaires</Text>
        {/* Add button for new partner if needed */}
      </View>

      <View style={styles.quickLinks}>
        <TouchableOpacity 
          style={styles.quickLink}
          onPress={handleViewBoatManagers}
        >
          <Users size={20} color="#10B981" />
          <Text style={styles.quickLinkText}>Boat Managers</Text>
          <ChevronRight size={16} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickLink}
          onPress={handleViewNauticalCompanies}
        >
          <Building size={20} color="#8B5CF6" />
          <Text style={styles.quickLinkText}>Entreprises du nautisme</Text>
          <ChevronRight size={16} color="#666" />
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
            placeholder="Rechercher un partenaire..."
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
          <Text style={styles.filterTitle}>Type de partenaire</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity 
              style={[
                styles.filterOption,
                selectedType === null && styles.filterOptionSelected
              ]}
              onPress={() => setSelectedType(null)}
            >
              <Text style={styles.filterOptionText}>Tous</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterOption,
                selectedType === 'boat_manager' && styles.filterOptionSelected
              ]}
              onPress={() => setSelectedType('boat_manager')}
            >
              <Users size={16} color="#10B981" />
              <Text style={styles.filterOptionText}>Boat Managers</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterOption,
                selectedType === 'nautical_company' && styles.filterOptionSelected
              ]}
              onPress={() => setSelectedType('nautical_company')}
            >
              <Building size={16} color="#8B5CF6" />
              <Text style={styles.filterOptionText}>Entreprises du nautisme</Text>
            </TouchableOpacity>
          </View>

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

      <ScrollView style={styles.partnersList}>
        {filteredPartners.length > 0 ? (
          filteredPartners.map((partner) => (
            <TouchableOpacity 
              key={partner.id} 
              style={styles.partnerCard}
              onPress={() => handleViewPartnerDetails(partner)}
            >
              <Image source={{ uri: partner.image }} style={styles.partnerImage} />
              
              <View style={styles.partnerInfo}>
                <View style={styles.partnerHeader}>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  <View style={[
                    styles.partnerTypeBadge, 
                    { backgroundColor: `${partner.type === 'boat_manager' ? '#10B981' : '#8B5CF6'}15` }
                  ]}>
                    <Text style={[
                      styles.partnerTypeText,
                      { color: partner.type === 'boat_manager' ? '#10B981' : '#8B5CF6' }
                    ]}>
                      {partner.type === 'boat_manager' ? 'Boat Manager' : 'Entreprise du nautisme'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.partnerRating}>
                  <Star size={16} color="#FFC107" fill="#FFC107" />
                  <Text style={styles.partnerRatingText}>
                    {partner.rating} ({partner.reviewCount} avis)
                  </Text>
                </View>
                
                <View style={styles.partnerDetails}>
                  <View style={styles.partnerDetailRow}>
                    <Mail size={16} color="#666" />
                    <Text style={styles.partnerDetailText}>{partner.email}</Text>
                  </View>
                  
                  <View style={styles.partnerDetailRow}>
                    <Phone size={16} color="#666" />
                    <Text style={styles.partnerDetailText}>{partner.phone}</Text>
                  </View>
                  
                  <View style={styles.partnerDetailRow}>
                    <MapPin size={16} color="#666" />
                    <Text style={styles.partnerDetailText}>
                      {partner.ports.join(', ')}
                    </Text>
                  </View>
                </View>
              </View>
              
              <ChevronRight size={24} color="#0066CC" style={styles.partnerChevron} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Building size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucun partenaire trouvé</Text>
            <Text style={styles.emptyStateText}>
              Aucun partenaire ne correspond à vos critères de recherche.
            </Text>
          </View>
        )}
      </ScrollView>

      <PartnerDetailsModal />
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
  quickLinks: {
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  quickLinkText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
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
  partnersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  partnerCard: {
    flexDirection: 'row',
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
  partnerImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerHeader: {
    marginBottom: 8,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  partnerTypeBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  partnerTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  partnerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  partnerRatingText: {
    fontSize: 14,
    color: '#666',
  },
  partnerDetails: {
    gap: 6,
  },
  partnerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partnerDetailText: {
    fontSize: 14,
    color: '#666',
  },
  partnerChevron: {
    alignSelf: 'center',
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
  partnerProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  partnerLogo: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  partnerProfileInfo: {
    flex: 1,
  },
  partnerProfileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  partnerDate: {
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
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
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

