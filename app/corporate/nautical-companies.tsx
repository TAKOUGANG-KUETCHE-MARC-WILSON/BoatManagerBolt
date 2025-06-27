import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Building, ChevronRight, X, Phone, Mail, MapPin, Star, Award, Plus, Briefcase, Ship, CreditCard as Edit, Trash } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

type SortKey = 'name' | 'rating' | 'port';

interface NauticalCompany {
  id: string;
  name: string;
  email: string;
  phone: string;
  logo: string;
  address: string;
  ports: string[];
  rating: number;
  reviewCount: number;
  services: string[];
  skills: string[];
  boatTypes: string[];
  certifications: string[];
  createdAt: string;
  lastLogin?: string;
}

// Mock data for nautical companies
const mockNauticalCompanies: NauticalCompany[] = [
  {
    id: 'nc1',
    name: 'Nautisme Pro',
    email: 'contact@nautismepro.com',
    phone: '+33 4 91 12 34 56',
    logo: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop',
    address: '123 Avenue du Port, 13000 Marseille',
    ports: ['Port de Marseille', 'Port de Cassis'],
    rating: 4.9,
    reviewCount: 42,
    services: ['Maintenance', 'Réparation', 'Installation'],
    skills: ['Mécanique', 'Électronique', 'Voilerie'],
    boatTypes: ['Voilier', 'Yacht', 'Catamaran'],
    certifications: ['Expert Maritime', 'Certification Technique Nautique'],
    createdAt: '2023-01-10',
    lastLogin: '2024-02-20'
  },
  {
    id: 'nc2',
    name: 'Marine Services',
    email: 'contact@marineservices.com',
    phone: '+33 4 93 23 45 67',
    logo: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2070&auto=format&fit=crop',
    address: '45 Quai des Yachts, 06300 Nice',
    ports: ['Port de Nice', 'Port de Cannes'],
    rating: 4.7,
    reviewCount: 28,
    services: ['Maintenance', 'Contrôle', 'Amélioration'],
    skills: ['Mécanique', 'Électronique', 'Plomberie'],
    boatTypes: ['Voilier', 'Yacht', 'Motoryacht'],
    certifications: ['Expert Maritime'],
    createdAt: '2023-02-15',
    lastLogin: '2024-02-19'
  },
  {
    id: 'nc3',
    name: 'Azur Nautique',
    email: 'contact@azurnautique.com',
    phone: '+33 4 94 34 56 78',
    logo: 'https://images.unsplash.com/photo-1565884280295-98eb83e41c65?q=80&w=2148&auto=format&fit=crop',
    address: '78 Boulevard du Littoral, 83990 Saint-Tropez',
    ports: ['Port de Saint-Tropez'],
    rating: 4.5,
    reviewCount: 19,
    services: ['Réparation', 'Installation', 'Vente d\'équipements'],
    skills: ['Mécanique', 'Électronique', 'Menuiserie'],
    boatTypes: ['Voilier', 'Yacht', 'Catamaran'],
    certifications: ['Certification Technique Nautique'],
    createdAt: '2023-03-20',
    lastLogin: '2024-02-18'
  },
  {
    id: 'nc4',
    name: 'Méditerranée Yachting',
    email: 'contact@mediterraneeyachting.com',
    phone: '+33 4 95 45 67 89',
    logo: 'https://images.unsplash.com/photo-1544919982-b61976f0ba43?q=80&w=2066&auto=format&fit=crop',
    address: '12 Rue des Marins, 20000 Ajaccio',
    ports: ['Port d\'Ajaccio'],
    rating: 4.6,
    reviewCount: 15,
    services: ['Maintenance', 'Réparation', 'Hivernage'],
    skills: ['Mécanique', 'Électronique', 'Peinture'],
    boatTypes: ['Voilier', 'Yacht'],
    certifications: ['Expert Maritime'],
    createdAt: '2023-04-05',
    lastLogin: '2024-02-17'
  },
  {
    id: 'nc5',
    name: 'Atlantique Nautisme',
    email: 'contact@atlantiquenautisme.com',
    phone: '+33 2 40 56 78 90',
    logo: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop',
    address: '34 Quai de la Loire, 44000 Nantes',
    ports: ['Port de Nantes', 'Port de La Baule'],
    rating: 4.8,
    reviewCount: 32,
    services: ['Maintenance', 'Réparation', 'Vente d\'équipements'],
    skills: ['Mécanique', 'Électronique', 'Voilerie'],
    boatTypes: ['Voilier', 'Yacht', 'Catamaran', 'Motoryacht'],
    certifications: ['Expert Maritime', 'Certification Technique Nautique'],
    createdAt: '2023-05-12',
    lastLogin: '2024-02-16'
  }
];

export default function NauticalCompaniesScreen() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<NauticalCompany[]>(mockNauticalCompanies);
  const [filteredCompanies, setFilteredCompanies] = useState<NauticalCompany[]>(mockNauticalCompanies);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<NauticalCompany | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // Get unique ports for filtering
  const uniquePorts = [...new Set(companies.flatMap(company => company.ports))];

  // Apply filters and sorting
  useEffect(() => {
    let result = [...companies];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(company => 
        company.name.toLowerCase().includes(query) ||
        company.email.toLowerCase().includes(query) ||
        company.ports.some(port => port.toLowerCase().includes(query)) ||
        company.services.some(service => service.toLowerCase().includes(query)) ||
        company.skills.some(skill => skill.toLowerCase().includes(query)) ||
        company.boatTypes.some(type => type.toLowerCase().includes(query))
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

  const confirmDeleteCompany = () => {
    if (selectedCompany) {
      // Filtrer l'entreprise sélectionnée de la liste
      const updatedCompanies = companies.filter(company => company.id !== selectedCompany.id);
      setCompanies(updatedCompanies);
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
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={handleDeleteCompany}
              >
                <Trash size={20} color="white" />
                <Text style={styles.deleteButtonText}>Supprimer</Text>
              </TouchableOpacity>
              
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
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une entreprise..."
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