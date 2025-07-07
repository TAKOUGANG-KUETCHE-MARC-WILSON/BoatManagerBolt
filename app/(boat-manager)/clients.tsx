import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput, Modal } from 'react-native';
import { Users, MessageSquare, User, Bot as Boat, FileText, ChevronRight, MapPin, Calendar, CircleCheck as CheckCircle2, CircleDot, X, TriangleAlert as AlertTriangle, Plus, Upload, Mail, Phone, Search, Briefcase, Building, Star } from 'lucide-react-native'; // Changed XCircle to X
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  boats: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  lastContact?: string;
  status: 'active' | 'pending' | 'inactive';
  hasNewRequests?: boolean;
  hasNewMessages?: boolean;
}

interface Company {
  id: string;
  name: string;
  logo: string;
  location: string;
  services: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  hasNewRequests?: boolean;
}

interface HeadquartersContact {
  id: string;
  name: string;
  avatar: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  hasNewMessages?: boolean;
}

interface OtherBoatManager {
  id: string;
  name: string;
  avatar: string;
  location: string;
  email: string;
  phone: string;
  specialties: string[];
  hasNewMessages?: boolean;
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
];

const mockCompanies: Company[] = [
  {
    id: 'nc1',
    name: 'Nautisme Pro',
    logo: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop',
    location: 'Port de Marseille',
    services: ['Maintenance', 'Réparation', 'Installation'],
    contactName: 'Thomas Leroy',
    contactEmail: 'contact@nautismepro.com',
    contactPhone: '+33 4 91 12 34 56',
    hasNewRequests: true
  },
  {
    id: 'nc2',
    name: 'Marine Services',
    logo: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2070&auto=format&fit=crop',
    location: 'Port de Nice',
    services: ['Maintenance', 'Contrôle', 'Amélioration'],
    contactName: 'Julie Moreau',
    contactEmail: 'contact@marineservices.com',
    contactPhone: '+33 4 93 23 45 67',
  }
];

const mockHeadquartersContacts: HeadquartersContact[] = [
  {
    id: 'hq1',
    name: 'Alexandre Dupont',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    role: 'Directeur Général',
    department: 'Direction',
    email: 'alexandre.dupont@ybm.com',
    phone: '+33 1 23 45 67 89',
    hasNewMessages: true
  },
  {
    id: 'hq2',
    name: 'Émilie Laurent',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop',
    role: 'Responsable RH',
    department: 'Ressources Humaines',
    email: 'emilie.laurent@ybm.com',
    phone: '+33 1 23 45 67 90',
    hasNewMessages: false
  },
  {
    id: 'hq3',
    name: 'Nicolas Martin',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    role: 'Support Technique',
    department: 'IT',
    email: 'nicolas.martin@ybm.com',
    phone: '+33 1 23 45 67 91',
    hasNewMessages: false
  }
];

const mockOtherBoatManagers: OtherBoatManager[] = [
  {
    id: 'bm1',
    name: 'Pierre Dubois',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    location: 'Port de Nice',
    email: 'pierre.dubois@ybm.com',
    phone: '+33 6 23 45 67 89',
    specialties: ['Voiliers', 'Yachts'],
    hasNewMessages: true
  },
  {
    id: 'bm2',
    name: 'Sophie Laurent',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop',
    location: 'Port de Saint-Tropez',
    email: 'sophie.laurent@ybm.com',
    phone: '+33 6 34 56 78 90',
    specialties: ['Catamarans', 'Motoryachts'],
    hasNewMessages: false
  },
  {
    id: 'bm3',
    name: 'Lucas Bernard',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    location: 'Port de Cannes',
    email: 'lucas.bernard@ybm.com',
    phone: '+33 6 45 67 89 01',
    specialties: ['Voiliers', 'Semi-rigides'],
    hasNewMessages: false
  }
];

export default function HomeScreen() {
  const { user } = useAuth();
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [boatManagerSearchQuery, setBoatManagerSearchQuery] = useState('');

  // New state for company details modal
  const [showCompanyDetailsModal, setShowCompanyDetailsModal] = useState(false);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<Company | null>(null);

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Stats for dashboard
  const stats = {
    urgentRequests: 2,
    upcomingAppointments: 8,
    pendingRequests: 5,
    newMessages: 3,
    clientSatisfaction: 4.8,
    reviewCount: 42
  };

  // Filtrer les clients en fonction de la recherche
  const filteredClients = mockClients.filter(client => {
    if (!clientSearchQuery) return true;
    const query = clientSearchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.boats.some(boat => boat.name.toLowerCase().includes(query))
    );
  });

  // Filtrer les entreprises en fonction de la recherche
  const filteredCompanies = mockCompanies.filter(company => {
    if (!companySearchQuery) return true;
    const query = companySearchQuery.toLowerCase();
    return (
      company.name.toLowerCase().includes(query) ||
      company.location.toLowerCase().includes(query) ||
      company.services.some(service => service.toLowerCase().includes(query))
    );
  });

  // Filtrer les contacts en fonction de la recherche
  const filteredContacts = mockHeadquartersContacts.filter(contact => {
    if (!contactSearchQuery) return true;
    const query = contactSearchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query)
    );
  });

  // Filtrer les autres boat managers en fonction de la recherche
  const filteredBoatManagers = mockOtherBoatManagers.filter(manager => {
    if (!boatManagerSearchQuery) return true;
    const query = boatManagerSearchQuery.toLowerCase();
    return (
      manager.name.toLowerCase().includes(query) ||
      manager.location.toLowerCase().includes(query) ||
      manager.specialties.some(specialty => specialty.toLowerCase().includes(query))
    );
  });

  const handleMessage = (clientId: string) => {
    router.push(`/(boat-manager)/messages?client=${clientId}`);
  };

  const handleRequests = (clientId: string) => {
    router.push(`/(boat-manager)/requests?client=${clientId}`);
  };

  const handleClientDetails = (clientId: string) => {
    router.push(`/client/${clientId}`);
  };

  // Modified handleCompanyDetails to open modal
  const handleCompanyDetails = (company: Company) => {
    setSelectedCompanyDetails(company);
    setShowCompanyDetailsModal(true);
  };

  const handleCompanyMessage = (companyId: string) => {
    router.push(`/(boat-manager)/messages?company=${companyId}`);
  };

  const handleContactMessage = (contactId: string) => {
    router.push(`/(boat-manager)/messages?contact=${contactId}`);
  };

  const handleBoatManagerMessage = (managerId: string) => {
    router.push(`/(boat-manager)/messages?manager=${managerId}`);
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
    <ScrollView style={styles.container}>
      <View style={styles.welcomeHeader}>
        <Text style={styles.welcomeText}>
          Bienvenue {user?.firstName}
        </Text>
        <Text style={styles.dateText}>
          {currentDate}
        </Text>
      </View>

      {/* Dashboard Stats */}
      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={[styles.statCard, styles.urgentCard]}
          onPress={() => router.push('/(boat-manager)/requests?urgency=urgent')}
        >
          <AlertTriangle size={24} color="#DC2626" />
          <Text style={[styles.statNumber, { color: '#DC2626' }]}>{stats.urgentRequests}</Text>
          <Text style={[styles.statLabel, { color: '#DC2626' }]}>Demandes urgentes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push('/(boat-manager)/planning')}
        >
          <Calendar size={24} color="#0066CC" />
          <Text style={styles.statNumber}>{stats.upcomingAppointments}</Text>
          <Text style={styles.statLabel}>RDV à venir</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push('/(boat-manager)/requests?status=submitted')}
        >
          <FileText size={24} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.pendingRequests}</Text>
          <Text style={styles.statLabel}>Nouvelles demandes</Text>
          {stats.pendingRequests > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{stats.pendingRequests}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push('/(boat-manager)/messages')}
        >
          <MessageSquare size={24} color="#10B981" />
          <Text style={styles.statNumber}>{stats.newMessages}</Text>
          <Text style={styles.statLabel}>Nouveaux messages</Text>
          {stats.newMessages > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{stats.newMessages}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Carte de performance */}
      <TouchableOpacity 
        style={styles.performanceCard}
      >
        <View style={styles.performanceHeader}>
          <View style={styles.performanceTitle}>
            <Star size={24} color="#FFC107" />
            <Text style={styles.performanceTitleText}>Satisfaction client</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{stats.clientSatisfaction}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  fill={star <= 4 ? '#FFC107' : 'none'}
                  color={star <= 4 ? '#FFC107' : '#D1D5DB'}
                />
              ))}
              <Text style={styles.reviewCount}>({stats.reviewCount} avis)</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Mes Clients Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Users size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Mes Clients</Text>
            {mockClients.filter(client => client.hasNewRequests || client.hasNewMessages).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {mockClients.filter(client => client.hasNewRequests || client.hasNewMessages).length}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => router.push('/(boat-manager)/clients-list')}
          >
            <Text style={styles.viewAllText}>Voir tous</Text>
            <ChevronRight size={20} color="#0066CC" />
          </TouchableOpacity>
        </View>

        {/* Client Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un client..."
            value={clientSearchQuery}
            onChangeText={setClientSearchQuery}
          />
        </View>

        {filteredClients.length > 0 ? (
          <View style={styles.cardGrid}>
            {filteredClients.map((client) => (
              <TouchableOpacity 
                key={client.id} 
                style={styles.clientCardCompact}
                onPress={() => handleClientDetails(client.id)}
              >
                <View style={styles.clientCardHeader}>
                  <Image source={{ uri: client.avatar }} style={styles.clientAvatarCompact} />
                  <View style={[styles.statusBadgeCompact, { backgroundColor: `${getStatusColor(client.status)}15` }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(client.status) }]} />
                    <Text style={[styles.statusTextCompact, { color: getStatusColor(client.status) }]}>
                      {getStatusLabel(client.status)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.clientNameCompact}>{client.name}</Text>
                
                <View style={styles.boatsCountContainer}>
                  <Boat size={16} color="#0066CC" />
                  <Text style={styles.boatsCount}>
                    {client.boats.length} bateau{client.boats.length > 1 ? 'x' : ''}
                  </Text>
                </View>
                
                <View style={styles.actionsCompact}>
                  <TouchableOpacity 
                    style={styles.actionButtonCompact}
                    onPress={() => handleMessage(client.id)}
                  >
                    <MessageSquare size={18} color="#0066CC" />
                    {client.hasNewMessages && (
                      <View style={styles.actionNotificationDot} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButtonCompact}
                    onPress={() => handleRequests(client.id)}
                  >
                    <FileText size={18} color="#0066CC" />
                    {client.hasNewRequests && (
                      <View style={styles.actionNotificationDot} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButtonCompact}
                    onPress={() => handleClientDetails(client.id)}
                  >
                    <ChevronRight size={18} color="#0066CC" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun client trouvé</Text>
          </View>
        )}
      </View>

      {/* Nouvelle Demande Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Plus size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Nouvelle Demande</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.newRequestCard}
          onPress={() => router.push('/(boat-manager)/company-request')}
        >
          <View style={styles.newRequestContent}>
            <Text style={styles.newRequestTitle}>Créer une nouvelle demande</Text>
            <Text style={styles.newRequestDescription}>
              Créez une demande pour un client ou pour vous-même
            </Text>
          </View>
          <ChevronRight size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>

      {/* Mes Entreprises Partenaires Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Building size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Mes Entreprises Partenaires</Text>
            {mockCompanies.filter(company => company.hasNewRequests).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {mockCompanies.filter(company => company.hasNewRequests).length}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Company Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une entreprise..."
            value={companySearchQuery}
            onChangeText={setCompanySearchQuery}
          />
        </View>

        {filteredCompanies.length > 0 ? (
          <View style={styles.cardGrid}>
            {filteredCompanies.map((company) => (
              <TouchableOpacity 
                key={company.id} 
                style={styles.companyCardCompact}
                onPress={() => handleCompanyDetails(company)} // Pass the full company object
              >
                <Image source={{ uri: company.logo }} style={styles.companyLogoCompact} />
                <Text style={styles.companyNameCompact}>{company.name}</Text>
                
                <View style={styles.companyLocationCompact}>
                  <MapPin size={14} color="#666" />
                  <Text style={styles.locationTextCompact}>{company.location}</Text>
                </View>
                
                <View style={styles.servicesTagsCompact}>
                  {company.services.slice(0, 2).map((service, index) => (
                    <View key={index} style={styles.serviceTagCompact}>
                      <Text style={styles.serviceTagTextCompact}>{service}</Text>
                    </View>
                  ))}
                  {company.services.length > 2 && (
                    <View style={styles.serviceTagCompact}>
                      <Text style={styles.serviceTagTextCompact}>+{company.services.length - 2}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.companyActionsCompact}>
                  <TouchableOpacity 
                    style={styles.companyActionCompact}
                    onPress={() => handleCompanyMessage(company.id)}
                  >
                    <MessageSquare size={18} color="#0066CC" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.companyActionCompact}
                    onPress={() => router.push(`/(boat-manager)/company-request?company=${company.id}`)}
                  >
                    <FileText size={18} color="#0066CC" />
                    {company.hasNewRequests && (
                      <View style={styles.actionNotificationDot} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.companyActionCompact}
                    onPress={() => handleCompanyDetails(company)} // Pass the full company object
                  >
                    <ChevronRight size={18} color="#0066CC" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucune entreprise trouvée</Text>
          </View>
        )}
      </View>

      {/* Mes Contacts au siège Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Briefcase size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Mes Contacts au siège</Text>
            {mockHeadquartersContacts.filter(contact => contact.hasNewMessages).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {mockHeadquartersContacts.filter(contact => contact.hasNewMessages).length}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un contact..."
            value={contactSearchQuery}
            onChangeText={setContactSearchQuery}
          />
        </View>

        {filteredContacts.length > 0 ? (
          <View style={styles.cardGrid}>
            {filteredContacts.map((contact) => (
              <TouchableOpacity 
                key={contact.id} 
                style={styles.contactCardCompact}
                onPress={() => handleContactMessage(contact.id)}
              >
                <Image source={{ uri: contact.avatar }} style={styles.contactAvatarCompact} />
                <Text style={styles.contactNameCompact}>{contact.name}</Text>
                <Text style={styles.contactRoleCompact}>{contact.role}</Text>
                <Text style={styles.contactDepartmentCompact}>{contact.department}</Text>
                
                <TouchableOpacity 
                  style={styles.messageButtonCompact}
                  onPress={() => handleContactMessage(contact.id)}
                >
                  <MessageSquare size={16} color="#0066CC" />
                  <Text style={styles.messageButtonText}>Message</Text>
                  {contact.hasNewMessages && (
                    <View style={styles.messageNotificationDot} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun contact trouvé</Text>
          </View>
        )}
      </View>

      {/* Les autres Boat Managers Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Users size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Les autres Boat Managers</Text>
            {mockOtherBoatManagers.filter(manager => manager.hasNewMessages).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {mockOtherBoatManagers.filter(manager => manager.hasNewMessages).length}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Boat Manager Search */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un Boat Manager..."
            value={boatManagerSearchQuery}
            onChangeText={setBoatManagerSearchQuery}
          />
        </View>

        {filteredBoatManagers.length > 0 ? (
          <View style={styles.cardGrid}>
            {filteredBoatManagers.map((manager) => (
              <TouchableOpacity 
                key={manager.id} 
                style={styles.contactCardCompact}
                onPress={() => handleBoatManagerMessage(manager.id)}
              >
                <Image source={{ uri: manager.avatar }} style={styles.contactAvatarCompact} />
                <Text style={styles.contactNameCompact}>{manager.name}</Text>
                <View style={styles.boatManagerLocationContainer}>
                  <MapPin size={14} color="#0066CC" />
                  <Text style={styles.boatManagerLocationText}>{manager.location}</Text>
                </View>
                <View style={styles.boatManagerSpecialtiesContainer}>
                  {manager.specialties.map((specialty, index) => (
                    <View key={index} style={styles.boatManagerSpecialtyTag}>
                      <Text style={styles.boatManagerSpecialtyText}>{specialty}</Text>
                    </View>
                  ))}
                </View>
                
                <TouchableOpacity 
                  style={styles.messageButtonCompact}
                  onPress={() => handleBoatManagerMessage(manager.id)}
                >
                  <MessageSquare size={16} color="#0066CC" />
                  <Text style={styles.messageButtonText}>Message</Text>
                  {manager.hasNewMessages && (
                    <View style={styles.messageNotificationDot} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun Boat Manager trouvé</Text>
          </View>
        )}
      </View>

      {/* Company Details Modal */}
      <Modal
        visible={showCompanyDetailsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompanyDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails de l'entreprise</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowCompanyDetailsModal(false)}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {selectedCompanyDetails && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.companyDetailsCard}>
                  <Image source={{ uri: selectedCompanyDetails.logo }} style={styles.companyDetailsLogo} />
                  <Text style={styles.companyDetailsName}>{selectedCompanyDetails.name}</Text>
                  
                  <View style={styles.companyDetailsRow}>
                    <MapPin size={20} color="#666" />
                    <Text style={styles.companyDetailsText}>{selectedCompanyDetails.location}</Text>
                  </View>
                  
                  <View style={styles.companyDetailsRow}>
                    <Mail size={20} color="#666" />
                    <Text style={styles.companyDetailsText}>{selectedCompanyDetails.contactEmail}</Text>
                  </View>
                  
                  <View style={styles.companyDetailsRow}>
                    <Phone size={20} color="#666" />
                    <Text style={styles.companyDetailsText}>{selectedCompanyDetails.contactPhone}</Text>
                  </View>
                  
                  <View style={styles.companyDetailsServices}>
                    <Text style={styles.companyDetailsServicesTitle}>Services proposés :</Text>
                    <View style={styles.servicesTagsCompact}>
                      {selectedCompanyDetails.services.map((service, index) => (
                        <View key={index} style={styles.serviceTagCompact}>
                          <Text style={styles.serviceTagTextCompact}>{service}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  welcomeHeader: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
  },
  // Dashboard Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
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
  urgentCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Performance Card
  performanceCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
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
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  performanceTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  performanceTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  ratingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceStat: {
    alignItems: 'center',
    flex: 1,
  },
  performanceStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  performanceStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  // New Request Card
  newRequestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  newRequestContent: {
    flex: 1,
  },
  newRequestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 4,
  },
  newRequestDescription: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  clientCardCompact: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
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
  clientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  clientAvatarCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  statusBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTextCompact: {
    fontSize: 10,
    fontWeight: '500',
  },
  clientNameCompact: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  boatsCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  boatsCount: {
    fontSize: 12,
    color: '#0066CC',
  },
  actionsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  actionButtonCompact: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f7ff',
    position: 'relative',
  },
  actionNotificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: 'white',
  },
  companyCardCompact: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
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
  companyLogoCompact: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginBottom: 8,
  },
  companyNameCompact: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  companyLocationCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationTextCompact: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  servicesTagsCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  serviceTagCompact: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  serviceTagTextCompact: {
    fontSize: 10,
    color: '#0066CC',
  },
  companyActionsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  companyActionCompact: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f7ff',
    position: 'relative',
  },
  contactCardCompact: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
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
  contactAvatarCompact: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  contactNameCompact: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  contactRoleCompact: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
    textAlign: 'center',
  },
  contactDepartmentCompact: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  messageButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f0f7ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
    position: 'relative',
  },
  messageButtonText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
  messageNotificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1,
    borderColor: 'white',
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
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 16,
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
  lastContact: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  boatsList: {
    gap: 8,
  },
  boatItem: {
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    gap: 4,
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
    marginLeft: 'auto',
  },
  lastService: {
    fontSize: 12,
    color: '#666',
    marginLeft: 24,
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
  // Boat Manager specific styles
  boatManagerLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  boatManagerLocationText: {
    fontSize: 14,
    color: '#0066CC',
  },
  boatManagerSpecialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  boatManagerSpecialtyTag: {
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  boatManagerSpecialtyText: {
    fontSize: 10,
    color: '#0066CC',
  },
  // Modal Styles
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
  },
  companyDetailsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  companyDetailsLogo: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 12,
  },
  companyDetailsName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  companyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  companyDetailsText: {
    fontSize: 16,
    color: '#666',
  },
  companyDetailsServices: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
    width: '100%',
  },
  companyDetailsServicesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
});
