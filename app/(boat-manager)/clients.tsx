import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, TextInput, Modal } from 'react-native';
import { Users, MessageSquare, User, Bot as Boat, FileText, ChevronRight, MapPin, Calendar, CircleCheck as CheckCircle2, CircleDot, X, TriangleAlert as AlertTriangle, Plus, Upload, Mail, Phone, Search, Briefcase, Building, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth, User as AuthUser, PleasureBoater, BoatManagerUser, NauticalCompany, CorporateUser } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

// Interfaces mises à jour pour correspondre aux données Supabase
interface Client extends PleasureBoater {
  boats: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  status: 'active' | 'pending' | 'inactive'; // Assuming status is directly on user profile
  last_contact?: string;
  has_new_requests?: boolean;
  has_new_messages?: boolean;
}

interface Company extends NauticalCompany {
  logo: string; // Assuming logo is part of NauticalCompany profile
  commonPortName?: string; // New field for the common port name
  fullAddress?: string; // New field for the full address
  hasNewRequests?: boolean;
  contactEmail: string; // Ensure these are always present for display
  contactPhone: string; // Ensure these are always present for display
}

interface HeadquartersContact extends CorporateUser {
  department?: string; // Assuming department is part of CorporateUser profile
  hasNewMessages?: boolean;
}

interface OtherBoatManager extends BoatManagerUser {
  location?: string; // Assuming location can be derived from ports or added to profile
  specialties?: string[]; // Assuming skills from BoatManagerUser can be used as specialties
  hasNewMessages?: boolean;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [boatManagerSearchQuery, setBoatManagerSearchQuery] = useState('');

  // États pour les données réelles
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [headquartersContacts, setHeadquartersContacts] = useState<HeadquartersContact[]>([]);
  const [otherBoatManagers, setOtherBoatManagers] = useState<OtherBoatManager[]>([]);

  // États de chargement
  const [clientsLoading, setClientsLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [otherBMLoading, setOtherBMLoading] = useState(true);

  // New state for company details modal
  const [showCompanyDetailsModal, setShowCompanyDetailsModal] = useState(false);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<Company | null>(null);

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Stats for dashboard (still mocked for now)
  const stats = {
    urgentRequests: 2,
    upcomingAppointments: 8,
    pendingRequests: 5,
    newMessages: 3,
    clientSatisfaction: 4.8,
    reviewCount: 42
  };

  // --- Data Fetching ---
  useEffect(() => {
    const fetchClients = async () => {
      setClientsLoading(true);
      if (!user || user.role !== 'boat_manager') {
        setClientsLoading(false);
        return;
      }
      try {
        const { data: bmPorts, error: bmPortsError } = await supabase
          .from('user_ports')
          .select('port_id')
          .eq('user_id', user.id);

        if (bmPortsError) throw bmPortsError;
        const managedPortIds = bmPorts.map(p => p.port_id);

        if (managedPortIds.length === 0) {
          setClients([]);
          setClientsLoading(false);
          return;
        }

        const { data: clientPortAssignments, error: clientPortError } = await supabase
          .from('user_ports')
          .select('user_id')
          .in('port_id', managedPortIds);

        if (clientPortError) throw clientPortError;
        const uniqueClientIds = [...new Set(clientPortAssignments.map(cpa => cpa.user_id))];

        if (uniqueClientIds.length === 0) {
          setClients([]);
          setClientsLoading(false);
          return;
        }

        const { data, error: clientsError } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar, e_mail, phone, status, last_contact, has_new_requests, has_new_messages, boat(id, name, type)')
          .in('id', uniqueClientIds)
          .eq('profile', 'pleasure_boater');

        if (clientsError) throw clientsError;
        setClients(data.map(c => ({ ...c, name: `${c.first_name} ${c.last_name}`, boats: c.boat || [] })) as Client[]);
      } catch (e) {
        console.error('Error fetching clients:', e);
      } finally {
        setClientsLoading(false);
      }
    };

    const fetchCompanies = async () => {
      setCompaniesLoading(true);
      if (!user || user.role !== 'boat_manager') {
        setCompaniesLoading(false);
        return;
      }
      try {
        // 1. Get ports managed by the current Boat Manager
        const { data: bmPorts, error: bmPortsError } = await supabase
          .from('user_ports')
          .select('port_id, ports(name)') // Also fetch port names
          .eq('user_id', user.id);

        if (bmPortsError) throw bmPortsError;
        const managedPortIds = bmPorts.map(p => p.port_id);
        const managedPortNames = bmPorts.map(p => p.ports?.name).filter(Boolean) as string[]; // Get names for display

        if (managedPortIds.length === 0) {
          setCompanies([]);
          setCompaniesLoading(false);
          return;
        }

        // 2. Get companies that share at least one port with the current BM
        const { data: companyUsers, error: companyUsersError } = await supabase
          .from('users')
          .select('id, company_name, avatar, address, e_mail, phone, user_categorie_service(categorie_service(description1)), user_ports(port_id, ports(name))')
          .eq('profile', 'nautical_company');

        if (companyUsersError) throw companyUsersError;

        const formattedCompanies: Company[] = [];

        for (const company of companyUsers) {
          const companyPortIds = company.user_ports.map((up: any) => up.port_id);
          const commonPorts = managedPortIds.filter(bmPid => companyPortIds.includes(bmPid));

          if (commonPorts.length > 0) {
            // Pick the first common port for display on the compact card
            const commonPortName = company.user_ports.find((up: any) => up.port_id === commonPorts[0])?.ports?.name || '';

            // Get all port names for the detailed view
            const allCompanyPortNames = company.user_ports.map((up: any) => up.ports?.name).filter(Boolean) as string[];

            formattedCompanies.push({
              id: company.id,
              name: company.company_name,
              logo: company.avatar,
              fullAddress: company.address,
              contactEmail: company.e_mail,
              contactPhone: company.phone,
              categories: company.user_categorie_service.map((ucs: any) => ({
                id: ucs.categorie_service.id,
                description1: ucs.categorie_service.description1
              })),
              ports: allCompanyPortNames, // All ports for modal's "Ports d'intervention"
              commonPortName: commonPortName, // The common port for compact view
              // Add other NauticalCompany fields as needed
              role: 'nautical_company', // Explicitly set role
              siret: '', // Placeholder
              certifications: [], // Placeholder
              permissions: { // Placeholder
                canManageServices: false, canManageBookings: false,
                canAccessFinancials: false, canManageStaff: false
              }
            });
          }
        }
        setCompanies(formattedCompanies);
      } catch (e) {
        console.error('Error fetching companies:', e);
      } finally {
        setCompaniesLoading(false);
      }
    };

    const fetchHeadquartersContacts = async () => {
      setContactsLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar, e_mail, phone, department, has_new_messages')
          .eq('profile', 'corporate');
        if (error) throw error;
        setHeadquartersContacts(data.map(c => ({
          ...c,
          name: `${c.first_name} ${c.last_name}`,
          role: 'corporate', // Explicitly set role
        })) as HeadquartersContact[]);
      } catch (e) {
        console.error('Error fetching headquarters contacts:', e);
      } finally {
        setContactsLoading(false);
      }
    };

    const fetchOtherBoatManagers = async () => {
      setOtherBMLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar, e_mail, phone, user_categorie_service(categorie_service(description1)), user_ports(port_id, ports(name))')
          .eq('profile', 'boat_manager')
          .neq('id', user?.id); // Exclude current user
        if (error) throw error;

        const managersWithPorts = await Promise.all(data.map(async (bm: any) => {
          let location = 'N/A';
          if (bm.user_ports && bm.user_ports.length > 0) {
            const { data: portData, error: portError } = await supabase
              .from('ports')
              .select('name')
              .eq('id', bm.user_ports[0].port_id)
              .single();
            if (!portError) {
              location = portData.name;
            }
          }
          return {
            ...bm,
            name: `${bm.first_name} ${bm.last_name}`,
            location: location,
            specialties: bm.user_categorie_service.map((ucs: any) => ucs.categorie_service.description1), // Using categories as specialties
            role: 'boat_manager', // Explicitly set role
            categories: bm.user_categorie_service.map((ucs: any) => ({ id: ucs.categorie_service.id, description1: ucs.categorie_service.description1 }))
          };
        }));
        setOtherBoatManagers(managersWithPorts as OtherBoatManager[]);
      } catch (e) {
        console.error('Error fetching other boat managers:', e);
      } finally {
        setOtherBMLoading(false);
      }
    };

    if (user) {
      fetchClients();
      fetchCompanies();
      fetchHeadquartersContacts();
      fetchOtherBoatManagers();
    }
  }, [user]);

  // --- Filtering Logic ---
  const filteredClients = clients.filter(client => {
    if (!clientSearchQuery) return true;
    const query = clientSearchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.e_mail.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query) ||
      client.boats?.some(boat => boat.name.toLowerCase().includes(query))
    );
  });

  const filteredCompanies = companies.filter(company => {
    if (!companySearchQuery) return true;
    const query = companySearchQuery.toLowerCase();
    return (
      company.name.toLowerCase().includes(query) ||
      company.commonPortName?.toLowerCase().includes(query) || // Filter by common port name
      company.categories?.some(category => category.description1.toLowerCase().includes(query)) // Filter by categories
    );
  });

  const filteredContacts = headquartersContacts.filter(contact => {
    if (!contactSearchQuery) return true;
    const query = contactSearchQuery.toLowerCase();
    return (
      contact.name.toLowerCase().includes(query) ||
      contact.e_mail.toLowerCase().includes(query) ||
      contact.department?.toLowerCase().includes(query)
    );
  });

  const filteredBoatManagers = otherBoatManagers.filter(manager => {
    if (!boatManagerSearchQuery) return true;
    const query = boatManagerSearchQuery.toLowerCase();
    return (
      manager.name.toLowerCase().includes(query) ||
      manager.location?.toLowerCase().includes(query) ||
      manager.specialties?.some(specialty => specialty.toLowerCase().includes(query))
    );
  });

  // --- Handlers ---
  const handleMessage = (clientId: string) => {
    router.push(`/(boat-manager)/messages?client=${clientId}`);
  };

  const handleRequests = (clientId: string) => {
    router.push(`/(boat-manager)/requests?client=${clientId}`);
  };

  const handleClientDetails = (clientId: string) => {
    router.push(`/client/${clientId}`);
  };

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
          <Text style={[styles.statNumber, { color: '#DC2626' }]}>
            {stats.urgentRequests}
          </Text>
          <Text style={[styles.statLabel, { color: '#DC2626' }]}>
            Demandes urgentes
          </Text>
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
            {clients.filter(client => client.has_new_requests || client.has_new_messages).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {clients.filter(client => client.has_new_requests || client.has_new_messages).length}
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

        {clientsLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Chargement des clients...</Text>
          </View>
        ) : filteredClients.length > 0 ? (
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
                
                <Text style={styles.clientNameCompact}>{client.first_name} {client.last_name}</Text>
                
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
                    {client.has_new_messages && (
                      <View style={styles.actionNotificationDot} />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButtonCompact}
                    onPress={() => handleRequests(client.id)}
                  >
                    <FileText size={18} color="#0066CC" />
                    {client.has_new_requests && (
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
            {companies.filter(company => company.hasNewRequests).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {companies.filter(company => company.hasNewRequests).length}
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

        {companiesLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Chargement des entreprises...</Text>
          </View>
        ) : filteredCompanies.length > 0 ? (
          <View style={styles.cardGrid}>
            {filteredCompanies.map((company) => (
              <TouchableOpacity 
                key={company.id} 
                style={styles.companyCardCompact}
                onPress={() => handleCompanyDetails(company)}
              >
                <Image source={{ uri: company.logo }} style={styles.companyLogoCompact} />
                <Text style={styles.companyNameCompact}>{company.name}</Text>
                
                {company.commonPortName && ( // Display common port name
                  <View style={styles.companyLocationCompact}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.locationTextCompact}>{company.commonPortName}</Text>
                  </View>
                )}
                
                <View style={styles.servicesTagsCompact}>
                  {company.categories?.slice(0, 2).map((category, index) => ( // Use categories
                    <View key={index} style={styles.serviceTagCompact}>
                      <Text style={styles.serviceTagTextCompact}>{category.description1}</Text>
                    </View>
                  ))}
                  {company.categories && company.categories.length > 2 && ( // Use categories
                    <View key="more-services" style={styles.serviceTagCompact}>
                      <Text style={styles.serviceTagTextCompact}>+{company.categories.length - 2}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.companyActionsCompact}>
                  <TouchableOpacity 
                    style={styles.companyActionCompact}
                    onPress={() => handleCompanyMessage(company.id)}
                  >
                    <MessageSquare size={18} color="#0066CC" />
                    {company.hasNewRequests && (
                      <View style={styles.actionNotificationDot} />
                    )}
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
                    onPress={() => handleCompanyDetails(company)}
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
            {headquartersContacts.filter(contact => contact.hasNewMessages).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {headquartersContacts.filter(contact => contact.hasNewMessages).length}
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

        {contactsLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Chargement des contacts...</Text>
          </View>
        ) : filteredContacts.length > 0 ? (
          <View style={styles.cardGrid}>
            {filteredContacts.map((contact) => (
              <TouchableOpacity 
                key={contact.id} 
                style={styles.contactCardCompact}
                onPress={() => handleContactMessage(contact.id)}
              >
                <Image source={{ uri: contact.avatar }} style={styles.contactAvatarCompact} />
                <Text style={styles.contactNameCompact}>{contact.name}</Text>
                <Text style={styles.contactRoleCompact}>{contact.role || 'Corporate User'}</Text>
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
            {otherBoatManagers.filter(manager => manager.hasNewMessages).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {otherBoatManagers.filter(manager => manager.hasNewMessages).length}
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

        {otherBMLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Chargement des Boat Managers...</Text>
          </View>
        ) : filteredBoatManagers.length > 0 ? (
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
                  <MapPin size={14} color="#666" />
                  <Text style={styles.boatManagerLocationText}>{manager.location}</Text>
                </View>
                <View style={styles.boatManagerSpecialtiesContainer}>
                  {manager.specialties?.slice(0, 2).map((specialty, index) => (
                    <View key={index} style={styles.boatManagerSpecialtyTag}>
                      <Text style={styles.boatManagerSpecialtyText}>{specialty}</Text>
                    </View>
                  ))}
                  {manager.specialties && manager.specialties.length > 2 && (
                    <View key="more-specialties" style={styles.boatManagerSpecialtyTag}>
                      <Text style={styles.boatManagerSpecialtyText}>+{manager.specialties.length - 2}</Text>
                    </View>
                  )}
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
                  
                  {selectedCompanyDetails.commonPortName && ( // Display common port name
                    <View style={styles.companyDetailsRow}>
                      <MapPin size={20} color="#666" />
                      <Text style={styles.companyDetailsText}>
                        {selectedCompanyDetails.commonPortName}
                      </Text>
                    </View>
                  )}

                  {selectedCompanyDetails.fullAddress && ( // Display full address if available
                    <View style={styles.companyDetailsRow}>
                      <MapPin size={20} color="#666" />
                      <Text style={styles.companyDetailsText}>
                        {selectedCompanyDetails.fullAddress}
                      </Text>
                    </View>
                  )}
                  
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
                      {selectedCompanyDetails.categories?.map((category, index) => ( // Use categories
                        <View key={index} style={styles.serviceTagCompact}>
                          <Text style={styles.serviceTagTextCompact}>{category.description1}</Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  {selectedCompanyDetails.ports && selectedCompanyDetails.ports.length > 0 && (
                    <View style={styles.companyDetailsServices}>
                      <Text style={styles.companyDetailsServicesTitle}>Ports d'intervention :</Text>
                      <View style={styles.servicesTagsCompact}>
                        {selectedCompanyDetails.ports.map((port, index) => (
                          <View key={index} style={styles.serviceTagCompact}>
                            <Text style={styles.serviceTagTextCompact}>{port}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
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
  loadingState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  clientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 16,
    padding: 16,
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
