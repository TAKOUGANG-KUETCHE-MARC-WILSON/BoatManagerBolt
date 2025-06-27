import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Star, MapPin, Phone, Mail, ChevronRight, Building, Users } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

type PartnerType = 'boat_manager' | 'nautical_company';
type SortKey = 'name' | 'rating' | 'type';

interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  email: string;
  phone: string;
  ports: string[];
  rating: number;
  reviewCount: number;
  image: string;
}

// Mock data for partners
const mockPartners: Partner[] = [
  {
    id: 'p1',
    name: 'Nautisme Pro',
    type: 'nautical_company',
    email: 'contact@nautismepro.com',
    phone: '+33 4 91 12 34 56',
    ports: ['Port de Marseille', 'Port de Cassis'],
    rating: 4.9,
    reviewCount: 42,
    image: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop'
  },
  {
    id: 'p2',
    name: 'Marie Martin',
    type: 'boat_manager',
    email: 'marie.martin@ybm.com',
    phone: '+33 6 12 34 56 78',
    ports: ['Port de Marseille'],
    rating: 4.8,
    reviewCount: 36,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop'
  },
  {
    id: 'p3',
    name: 'Marine Services',
    type: 'nautical_company',
    email: 'contact@marineservices.com',
    phone: '+33 4 93 23 45 67',
    ports: ['Port de Nice', 'Port de Cannes'],
    rating: 4.7,
    reviewCount: 28,
    image: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'p4',
    name: 'Pierre Dubois',
    type: 'boat_manager',
    email: 'pierre.dubois@ybm.com',
    phone: '+33 6 23 45 67 89',
    ports: ['Port de Nice'],
    rating: 4.6,
    reviewCount: 24,
    image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop'
  },
  {
    id: 'p5',
    name: 'Azur Nautique',
    type: 'nautical_company',
    email: 'contact@azurnautique.com',
    phone: '+33 4 94 34 56 78',
    ports: ['Port de Saint-Tropez'],
    rating: 4.5,
    reviewCount: 19,
    image: 'https://images.unsplash.com/photo-1565884280295-98eb83e41c65?q=80&w=2148&auto=format&fit=crop'
  },
  {
    id: 'p6',
    name: 'Sophie Laurent',
    type: 'boat_manager',
    email: 'sophie.laurent@ybm.com',
    phone: '+33 6 34 56 78 90',
    ports: ['Port de Saint-Tropez'],
    rating: 4.9,
    reviewCount: 31,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop'
  },
  {
    id: 'p7',
    name: 'Lucas Bernard',
    type: 'boat_manager',
    email: 'lucas.bernard@ybm.com',
    phone: '+33 6 45 67 89 01',
    ports: ['Port de Cannes'],
    rating: 4.7,
    reviewCount: 22,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop'
  }
];

const getPartnerTypeLabel = (type: PartnerType): string => {
  switch (type) {
    case 'boat_manager':
      return 'Boat Manager';
    case 'nautical_company':
      return 'Entreprise du nautisme';
    default:
      return type;
  }
};

const getPartnerTypeColor = (type: PartnerType): string => {
  switch (type) {
    case 'boat_manager':
      return '#10B981';
    case 'nautical_company':
      return '#8B5CF6';
    default:
      return '#666666';
  }
};

export default function PartnersScreen() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>(mockPartners);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>(mockPartners);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<PartnerType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('rating');
  const [sortAsc, setSortAsc] = useState(false);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...partners];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(partner => 
        partner.name.toLowerCase().includes(query) ||
        partner.email.toLowerCase().includes(query) ||
        partner.ports.some(port => port.toLowerCase().includes(query))
      );
    }
    
    // Apply type filter
    if (selectedType) {
      result = result.filter(partner => partner.type === selectedType);
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
        case 'type':
          valueA = a.type;
          valueB = b.type;
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
      setSortAsc(key === 'name'); // Default ascending for name, descending for others
    }
  };

  const handleViewPartnerDetails = (partnerId: string) => {
    router.push(`/partner/${partnerId}`);
  };

  const handleViewBoatManagers = () => {
    router.push('/corporate/boat-managers');
  };

  const handleViewNauticalCompanies = () => {
    router.push('/corporate/nautical-companies');
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
        <Text style={styles.title}>Partenaires</Text>
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
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un partenaire..."
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
          style={[styles.sortButton, sortKey === 'type' && styles.sortButtonActive]}
          onPress={() => handleSort('type')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'type' && styles.sortButtonTextActive]}>
            Type {sortKey === 'type' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.partnersList}>
        {filteredPartners.length > 0 ? (
          filteredPartners.map((partner) => (
            <TouchableOpacity 
              key={partner.id} 
              style={styles.partnerCard}
              onPress={() => handleViewPartnerDetails(partner.id)}
            >
              <Image source={{ uri: partner.image }} style={styles.partnerImage} />
              
              <View style={styles.partnerInfo}>
                <View style={styles.partnerHeader}>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  <View style={[
                    styles.partnerTypeBadge, 
                    { backgroundColor: `${getPartnerTypeColor(partner.type)}15` }
                  ]}>
                    <Text style={[
                      styles.partnerTypeText,
                      { color: getPartnerTypeColor(partner.type) }
                    ]}>
                      {getPartnerTypeLabel(partner.type)}
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
});