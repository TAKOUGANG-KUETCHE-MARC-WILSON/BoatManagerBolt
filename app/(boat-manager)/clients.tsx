// app/(boat-manager)/index.tsx (HomeScreen)
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {
  Users,
  MessageSquare,
  User,
  Bot as Boat,
  FileText,
  ChevronRight,
  MapPin,
  Calendar,
  X,
  AlertTriangle,
  Plus,
  Mail,
  Phone,
  Search,
  Briefcase,
  Building,
  Star,
} from 'lucide-react-native';
import { router } from 'expo-router';
import {
  useAuth,
  PleasureBoater,
  BoatManagerUser,
  NauticalCompany,
  CorporateUser,
} from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

// ================================
// Helpers & constants
// ================================
const DEFAULT_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

const isHttpUrl = (v?: string) =>
  !!v && (v.startsWith('http://') || v.startsWith('https://'));

const safeLower = (v?: string | null) => (v || '').toLowerCase();

const buildFullName = (first?: string, last?: string) =>
  [first, last].filter(Boolean).join(' ').trim();

const getSignedAvatarUrl = async (value?: string) => {
  if (!value) return DEFAULT_AVATAR;
  if (isHttpUrl(value)) return value;

  const { data } = await supabase
    .storage
    .from('avatars')
    .createSignedUrl(value, 60 * 60);
  return data?.signedUrl || DEFAULT_AVATAR;
};

// ================================
// Types
// ================================
interface Client extends PleasureBoater {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  avatar: string;
  e_mail: string;
  phone?: string;
  boats: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  status: 'active' | 'pending' | 'inactive';
  last_contact?: string;
  has_new_requests?: boolean;
  has_new_messages?: boolean;
}

interface Company extends NauticalCompany {
  id: string;
  name: string;
  logo: string;
  categories?: Array<{ description1: string }>;
  ports?: string[]; // pour la modale "Ports d'intervention"
  commonPortName?: string; // port commun compact
  fullAddress?: string;
  hasNewRequests?: boolean;
  hasNewMessages?: boolean;
  contactEmail: string;
  contactPhone: string;
}

interface HeadquartersContact extends CorporateUser {
  id: string;
  name: string;
  avatar: string;
  department?: string;
  hasNewMessages?: boolean;
  e_mail: string;
  phone?: string;
}

interface OtherBoatManager extends BoatManagerUser {
  id: string;
  name: string;
  avatar: string;
  location?: string;
  specialties?: string[];
  hasNewMessages?: boolean;
  e_mail: string;
  phone?: string;
}

// ================================
// Component
// ================================
export default function HomeScreen() {
  const { user } = useAuth();
  const userId = useMemo(() => Number(user?.id) || undefined, [user?.id]);

  // recherches
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [boatManagerSearchQuery, setBoatManagerSearchQuery] = useState('');

  // données
  const [clients, setClients] = useState<Client[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [headquartersContacts, setHeadquartersContacts] = useState<HeadquartersContact[]>([]);
  const [otherBoatManagers, setOtherBoatManagers] = useState<OtherBoatManager[]>([]);

  // chargements
  const [clientsLoading, setClientsLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [otherBMLoading, setOtherBMLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  // modal entreprise
  const [showCompanyDetailsModal, setShowCompanyDetailsModal] = useState(false);
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<Company | null>(null);

  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // stats tableau de bord
  const [stats, setStats] = useState({
    urgentRequests: 0,
    upcomingAppointments: 0,
    pendingRequests: 0,
    newMessages: 0,
    clientSatisfaction: 0,
    reviewCount: 0,
  });

  // ================================
  // Data fetching
  // ================================
  const fetchDashboardStats = useCallback(async () => {
    setStatsLoading(true);
    if (!userId) {
      setStatsLoading(false);
      return;
    }

    try {
      // profil BM (note + avis)
      const { data: bmProfile } = await supabase
        .from('users')
        .select('rating, review_count')
        .eq('id', userId)
        .single();

      // urgences
      const { count: urgentRequestsCount } = await supabase
        .from('service_request')
        .select('id', { count: 'exact' })
        .eq('id_boat_manager', userId)
        .eq('urgence', 'urgent');

      // rdv à venir
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toTimeString().slice(0, 5);
      const { count: upcomingAppointmentsCount } = await supabase
        .from('rendez_vous')
        .select('id', { count: 'exact' })
        .or(`invite.eq.${userId},cree_par.eq.${userId}`)
        .in('statut', ['en_attente', 'confirme'])
        .or(`date_rdv.gt.${today},and(date_rdv.eq.${today},heure.gt.${nowTime})`);

      // demandes en attente
      const { count: pendingRequestsCount } = await supabase
        .from('service_request')
        .select('id', { count: 'exact' })
        .eq('id_boat_manager', userId)
        .eq('statut', 'submitted');

      // messages non lus (toutes convos où je suis membre)
      const { data: convMembers, error: convErr } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', userId);

      let newMessagesCount = 0;
      if (!convErr && convMembers?.length) {
        const convIds = convMembers.map((c) => c.conversation_id);
        const { count: messagesCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .in('conversation_id', convIds)
          .neq('sender_id', userId)
          .eq('is_read', false);

        newMessagesCount = messagesCount || 0;
      }

      setStats({
        urgentRequests: urgentRequestsCount || 0,
        upcomingAppointments: upcomingAppointmentsCount || 0,
        pendingRequests: pendingRequestsCount || 0,
        newMessages: newMessagesCount,
        clientSatisfaction: bmProfile?.rating || 0,
        reviewCount: bmProfile?.review_count || 0,
      });
    } catch (e) {
      console.error('Dashboard stats fetch error:', e);
    } finally {
      setStatsLoading(false);
    }
  }, [userId]);

  // Clients
  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    if (!userId || user?.role !== 'boat_manager') {
      setClients([]);
      setClientsLoading(false);
      return;
    }

    try {
      // ports gérés
      const { data: bmPorts, error: bmPortsError } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', userId);

      if (bmPortsError) throw bmPortsError;

      const managedPortIds = (bmPorts || []).map((p) => p.port_id);
      if (!managedPortIds.length) {
        setClients([]);
        return;
      }

      // utilisateurs à ces ports
      const { data: clientPortAssignments, error: clientPortError } = await supabase
        .from('user_ports')
        .select('user_id')
        .in('port_id', managedPortIds);

      if (clientPortError) throw clientPortError;

      const uniqueClientIds = Array.from(new Set((clientPortAssignments || []).map((c) => c.user_id)));
      if (!uniqueClientIds.length) {
        setClients([]);
        return;
      }

      // profils clients
      const { data, error: clientsError } = await supabase
        .from('users')
        .select(
          'id, first_name, last_name, avatar, e_mail, phone, status, last_contact, has_new_requests, has_new_messages, boat(id, name, type)'
        )
        .in('id', uniqueClientIds)
        .eq('profile', 'pleasure_boater');

      if (clientsError) throw clientsError;

      const clientsWithSigned = await Promise.all(
        (data || []).map(async (c: any) => {
          const avatar = await getSignedAvatarUrl(c.avatar);
          return {
            ...c,
            id: String(c.id),
            name: buildFullName(c.first_name, c.last_name),
            avatar: avatar || DEFAULT_AVATAR,
            boats: c.boat || [],
          } as Client;
        })
      );

      setClients(clientsWithSigned);
    } catch (e) {
      console.error('Error fetching clients:', e);
    } finally {
      setClientsLoading(false);
    }
  }, [userId, user?.role]);

  // Entreprises
  const fetchCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    if (!userId || user?.role !== 'boat_manager') {
      setCompanies([]);
      setCompaniesLoading(false);
      return;
    }

    try {
      // 1) ports gérés & noms
      const { data: bmPorts, error: bmPortsError } = await supabase
        .from('user_ports')
        .select('port_id, ports(name)')
        .eq('user_id', userId);

      if (bmPortsError) throw bmPortsError;

      const managedPortIds = (bmPorts || []).map((p) => p.port_id);
      if (!managedPortIds.length) {
        setCompanies([]);
        return;
      }

      // 2) entreprises (avec catégories & ports)
      const { data: companyUsers, error: companyUsersError } = await supabase
        .from('users')
        .select(
          `
          id,
          company_name,
          avatar,
          address,
          e_mail,
          phone,
          has_new_messages,
          user_categorie_service(categorie_service(description1)),
          user_ports(port_id, ports(name))
        `
        )
        .eq('profile', 'nautical_company');

      if (companyUsersError) throw companyUsersError;

      const formattedCompanies: Company[] = await Promise.all(
        (companyUsers || []).map(async (company: any) => {
          const companyPortIds = (company.user_ports || []).map((up: any) => up.port_id);
          const commonPorts = managedPortIds.filter((pid) => companyPortIds.includes(pid));
          if (!commonPorts.length) return null;

          const commonPortName =
            company.user_ports?.find((up: any) => up.port_id === commonPorts[0])?.ports?.name || '';

          const signedLogo = await getSignedAvatarUrl(company.avatar);
          const allCompanyPortNames = (company.user_ports || [])
            .map((up: any) => up.ports?.name)
            .filter(Boolean);

          return {
            id: String(company.id),
            name: company.company_name,
            logo: signedLogo || DEFAULT_AVATAR,
            fullAddress: company.address || '',
            contactEmail: company.e_mail || '',
            contactPhone: company.phone || '',
            categories:
              (company.user_categorie_service || []).map((ucs: any) => ({
                description1: ucs?.categorie_service?.description1 || '',
              })) || [],
            ports: allCompanyPortNames,
            commonPortName,
            hasNewRequests: false, // si tu as un indicateur côté DB, branche-le ici
            hasNewMessages: !!company.has_new_messages,
          } as Company;
        })
      );

      setCompanies(formattedCompanies.filter(Boolean) as Company[]);
    } catch (e) {
      console.error('Error fetching companies:', e);
    } finally {
      setCompaniesLoading(false);
    }
  }, [userId, user?.role]);

  // Siège
  const fetchHeadquartersContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar, e_mail, phone, department, has_new_messages')
        .eq('profile', 'corporate');

      if (error) throw error;

      const contacts = await Promise.all(
        (data || []).map(async (c: any) => {
          const avatar = await getSignedAvatarUrl(c.avatar);
          return {
            ...c,
            id: String(c.id),
            name: buildFullName(c.first_name, c.last_name),
            avatar: avatar || DEFAULT_AVATAR,
            hasNewMessages: !!c.has_new_messages,
          } as HeadquartersContact;
        })
      );

      setHeadquartersContacts(contacts);
    } catch (e) {
      console.error('Error fetching headquarters contacts:', e);
    } finally {
      setContactsLoading(false);
    }
  }, []);

  // Autres BM
  const fetchOtherBoatManagers = useCallback(async () => {
    setOtherBMLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(
          `
          id,
          first_name,
          last_name,
          avatar,
          e_mail,
          phone,
          has_new_messages,
          user_categorie_service(categorie_service(description1)),
          user_ports(port_id, ports(name))
        `
        )
        .eq('profile', 'boat_manager')
        .neq('id', userId);

      if (error) throw error;

      const managers = await Promise.all(
        (data || []).map(async (bm: any) => {
          const avatar = await getSignedAvatarUrl(bm.avatar);
          const location = bm.user_ports?.[0]?.ports?.name || 'N/A';
          const specialties =
            (bm.user_categorie_service || []).map(
              (ucs: any) => ucs?.categorie_service?.description1 || ''
            ) || [];
          return {
            id: String(bm.id),
            name: buildFullName(bm.first_name, bm.last_name),
            avatar: avatar || DEFAULT_AVATAR,
            e_mail: bm.e_mail,
            phone: bm.phone,
            hasNewMessages: !!bm.has_new_messages,
            location,
            specialties,
          } as OtherBoatManager;
        })
      );

      setOtherBoatManagers(managers);
    } catch (e) {
      console.error('Error fetching other boat managers:', e);
    } finally {
      setOtherBMLoading(false);
    }
  }, [userId]);

  // Lancer tous les fetchs
  useEffect(() => {
    if (!userId) return;

    fetchDashboardStats();
    // Lancer en parallèle (les setLoading protègent chaque bloc)
    fetchClients();
    fetchCompanies();
    fetchHeadquartersContacts();
    fetchOtherBoatManagers();
  }, [
    userId,
    fetchDashboardStats,
    fetchClients,
    fetchCompanies,
    fetchHeadquartersContacts,
    fetchOtherBoatManagers,
  ]);

  // ================================
  // Filters
  // ================================
  const filteredClients = useMemo(
    () =>
      clients.filter((client) => {
        if (!clientSearchQuery) return true;
        const q = safeLower(clientSearchQuery);
        return (
          safeLower(client.name).includes(q) ||
          safeLower(client.e_mail).includes(q) ||
          safeLower(client.phone).includes(q) ||
          (client.boats || []).some((b) => safeLower(b.name).includes(q))
        );
      }),
    [clients, clientSearchQuery]
  );

  const filteredCompanies = useMemo(
    () =>
      companies.filter((company) => {
        if (!companySearchQuery) return true;
        const q = safeLower(companySearchQuery);
        return (
          safeLower(company.name).includes(q) ||
          safeLower(company.commonPortName).includes(q) ||
          (company.categories || []).some((c) => safeLower(c.description1).includes(q))
        );
      }),
    [companies, companySearchQuery]
  );

  const filteredContacts = useMemo(
    () =>
      headquartersContacts.filter((contact) => {
        if (!contactSearchQuery) return true;
        const q = safeLower(contactSearchQuery);
        return (
          safeLower(contact.name).includes(q) ||
          safeLower(contact.e_mail).includes(q) ||
          safeLower(contact.department).includes(q)
        );
      }),
    [headquartersContacts, contactSearchQuery]
  );

  const filteredBoatManagers = useMemo(
    () =>
      otherBoatManagers.filter((manager) => {
        if (!boatManagerSearchQuery) return true;
        const q = safeLower(boatManagerSearchQuery);
        return (
          safeLower(manager.name).includes(q) ||
          safeLower(manager.location).includes(q) ||
          (manager.specialties || []).some((s) => safeLower(s).includes(q))
        );
      }),
    [otherBoatManagers, boatManagerSearchQuery]
  );

  // ================================
  // Handlers & helpers
  // ================================
  const handleMessage = (targetUserId: string) => {
    // MessagesScreen sait gérer ?client= pour ouvrir/Créer la 1:1 si besoin
    router.push(`/(boat-manager)/messages?client=${targetUserId}`);
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
    // on route aussi via ?client= pour uniformiser la logique côté messages
    router.push(`/(boat-manager)/messages?client=${companyId}`);
  };

  const handleContactMessage = (contactId: string) => {
    router.push(`/(boat-manager)/messages?client=${contactId}`);
  };

  const handleBoatManagerMessage = (managerId: string) => {
    router.push(`/(boat-manager)/messages?client=${managerId}`);
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

  // ================================
  // Render
  // ================================
  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.welcomeHeader}>
        <Text style={styles.welcomeText}>Bienvenue {user?.firstName}</Text>
        <Text style={styles.dateText}>{currentDate}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        {statsLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Chargement des statistiques...</Text>
          </View>
        ) : (
          <>
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
             { /*   {stats.pendingRequests > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>{stats.pendingRequests}</Text>
                </View>
              )}  */}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.statCard}
              onPress={() => router.push('/(boat-manager)/messages')}
            >
              <MessageSquare size={24} color="#10B981" />
              <Text style={styles.statNumber}>{stats.newMessages}</Text>
              <Text style={styles.statLabel}>Nouveaux messages</Text>
            { /*  {stats.newMessages > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationText}>{stats.newMessages}</Text>
                </View>
              )} */}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Performance */}
      <TouchableOpacity style={styles.performanceCard}>
        <View style={styles.performanceHeader}>
          <View style={styles.performanceTitle}>
            <Star size={24} color="#FFC107" />
            <Text style={styles.performanceTitleText}>Satisfaction client</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{stats.clientSatisfaction.toFixed(1)}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => {
                const active = star <= Math.round(stats.clientSatisfaction);
                return (
                  <Star key={star} color={active ? '#FFC107' : '#D1D5DB'} />
                );
              })}
              <Text style={styles.reviewCount}>({stats.reviewCount} avis)</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Mes Clients */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Users size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Mes Clients</Text>
            {clients.filter((c) => c.has_new_requests || c.has_new_messages).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {clients.filter((c) => c.has_new_requests || c.has_new_messages).length}
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

        {/* Recherche */}
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
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Chargement des clients...</Text>
          </View>
        ) : filteredClients.length > 0 ? (
          <View style={styles.cardGrid}>
            {filteredClients.slice(0, 4).map((client) => (
              <TouchableOpacity
                key={client.id}
                style={styles.clientCardCompact}
                onPress={() => handleClientDetails(client.id)}
              >
                <View style={styles.clientCardHeader}>
                  <Image
                    source={{ uri: client.avatar }}
                    style={styles.clientAvatarCompact}
                    onError={() =>
                      setClients((prev) =>
                        prev.map((c) =>
                          c.id === client.id ? { ...c, avatar: DEFAULT_AVATAR } : c
                        )
                      )
                    }
                  />
                  <View
                    style={[
                      styles.statusBadgeCompact,
                      { backgroundColor: `${getStatusColor(client.status)}15` },
                    ]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: getStatusColor(client.status) }]}
                    />
                    <Text
                      style={[
                        styles.statusTextCompact,
                        { color: getStatusColor(client.status) },
                      ]}
                    >
                      {getStatusLabel(client.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.clientNameCompact}>
                  {client.first_name} {client.last_name}
                </Text>

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
                    {client.has_new_messages && <View style={styles.actionNotificationDot} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButtonCompact}
                    onPress={() => handleRequests(client.id)}
                  >
                    <FileText size={18} color="#0066CC" />
                    {client.has_new_requests && <View style={styles.actionNotificationDot} />}
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

      {/* Nouvelle Demande */}
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

      {/* Entreprises partenaires */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Building size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Mes Entreprises Partenaires</Text>
            {companies.filter((c) => c.hasNewRequests).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {companies.filter((c) => c.hasNewRequests).length}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Recherche entreprises */}
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
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Chargement des entreprises...</Text>
          </View>
        ) : filteredCompanies.length > 0 ? (
          <View style={styles.cardGrid}>
            {filteredCompanies.slice(0, 4).map((company) => (
              <TouchableOpacity
                key={company.id}
                style={styles.companyCardCompact}
                onPress={() => handleCompanyDetails(company)}
              >
                <Image
                  source={{ uri: company.logo }}
                  style={styles.companyLogoCompact}
                  onError={() =>
                    setCompanies((prev) =>
                      prev.map((c) =>
                        c.id === company.id ? { ...c, logo: DEFAULT_AVATAR } : c
                      )
                    )
                  }
                />
                <Text style={styles.companyNameCompact}>{company.name}</Text>

                {company.commonPortName ? (
                  <View style={styles.companyLocationCompact}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.locationTextCompact}>{company.commonPortName}</Text>
                  </View>
                ) : null}

                <View style={styles.servicesTagsCompact}>
                  {(company.categories || []).slice(0, 2).map((category, index) => (
                    <View key={`${company.id}-cat-${index}`} style={styles.serviceTagCompact}>
                      <Text style={styles.serviceTagTextCompact}>{category.description1}</Text>
                    </View>
                  ))}
                  {company.categories && company.categories.length > 2 && (
                    <View key={`${company.id}-more`} style={styles.serviceTagCompact}>
                      <Text style={styles.serviceTagTextCompact}>
                        +{company.categories.length - 2}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.companyActionsCompact}>
                  <TouchableOpacity
                    style={styles.companyActionCompact}
                    onPress={() => handleCompanyMessage(company.id)}
                  >
                    <MessageSquare size={18} color="#0066CC" />
                    {company.hasNewMessages && <View style={styles.actionNotificationDot} />}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.companyActionCompact}
                    onPress={() =>
                      router.push(`/(boat-manager)/company-request?company=${company.id}`)
                    }
                  >
                    <FileText size={18} color="#0066CC" />
                    {company.hasNewRequests && <View style={styles.actionNotificationDot} />}
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

      {/* Contacts siège */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Briefcase size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Mes Contacts au siège</Text>
            {headquartersContacts.filter((c) => c.hasNewMessages).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {headquartersContacts.filter((c) => c.hasNewMessages).length}
                </Text>
              </View>
            )}
          </View>
          {filteredContacts.length > 4 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/(boat-manager)/headquarters-contacts-list')}
            >
              <Text style={styles.viewAllText}>Voir tous</Text>
              <ChevronRight size={20} color="#0066CC" />
            </TouchableOpacity>
          )}
        </View>

        {/* recherche contacts */}
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
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Chargement des contacts...</Text>
          </View>
        ) : filteredContacts.length > 0 ? (
          <View style={styles.cardGrid}>
            {filteredContacts.slice(0, 4).map((contact) => (
              <TouchableOpacity
                key={contact.id}
                style={styles.contactCardCompact}
                onPress={() => handleContactMessage(contact.id)}
              >
                <Image
                  source={{ uri: contact.avatar }}
                  style={styles.contactAvatarCompact}
                  onError={() =>
                    setHeadquartersContacts((prev) =>
                      prev.map((c) =>
                        c.id === contact.id ? { ...c, avatar: DEFAULT_AVATAR } : c
                      )
                    )
                  }
                />
                <Text style={styles.contactNameCompact}>{contact.name}</Text>
                <Text style={styles.contactRoleCompact}>{contact.department || 'Corporate'}</Text>
                <Text style={styles.contactDepartmentCompact}>{contact.e_mail}</Text>

                <TouchableOpacity
                  style={styles.messageButtonCompact}
                  onPress={() => handleContactMessage(contact.id)}
                >
                  <MessageSquare size={16} color="#0066CC" />
                  <Text style={styles.messageButtonText}>Message</Text>
                  {contact.hasNewMessages && <View style={styles.messageNotificationDot} />}
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

      {/* Autres Boat Managers */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Users size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Les autres Boat Managers</Text>
            {otherBoatManagers.filter((m) => m.hasNewMessages).length > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {otherBoatManagers.filter((m) => m.hasNewMessages).length}
                </Text>
              </View>
            )}
          </View>
          {filteredBoatManagers.length > 4 && (
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/(boat-manager)/other-boat-managers-list')}
            >
              <Text style={styles.viewAllText}>Voir tous</Text>
              <ChevronRight size={20} color="#0066CC" />
            </TouchableOpacity>
          )}
        </View>

        {/* recherche BM */}
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
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Chargement des Boat Managers...</Text>
          </View>
        ) : filteredBoatManagers.length > 0 ? (
          <View style={styles.cardGrid}>
            {filteredBoatManagers.slice(0, 4).map((manager) => (
              <TouchableOpacity
                key={manager.id}
                style={styles.contactCardCompact}
                onPress={() => handleBoatManagerMessage(manager.id)}
              >
                <Image
                  source={{ uri: manager.avatar }}
                  style={styles.contactAvatarCompact}
                  onError={() =>
                    setOtherBoatManagers((prev) =>
                      prev.map((m) =>
                        m.id === manager.id ? { ...m, avatar: DEFAULT_AVATAR } : m
                      )
                    )
                  }
                />
                <Text style={styles.contactNameCompact}>{manager.name}</Text>
                <View style={styles.boatManagerLocationContainer}>
                  <MapPin size={14} color="#666" />
                  <Text style={styles.boatManagerLocationText}>{manager.location}</Text>
                </View>
                <View style={styles.boatManagerSpecialtiesContainer}>
                  {(manager.specialties || []).slice(0, 2).map((s, i) => (
                    <View key={`${manager.id}-s-${i}`} style={styles.boatManagerSpecialtyTag}>
                      <Text style={styles.boatManagerSpecialtyText}>{s}</Text>
                    </View>
                  ))}
                  {manager.specialties && manager.specialties.length > 2 && (
                    <View key={`${manager.id}-s-more`} style={styles.boatManagerSpecialtyTag}>
                      <Text style={styles.boatManagerSpecialtyText}>
                        +{manager.specialties.length - 2}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.messageButtonCompact}
                  onPress={() => handleBoatManagerMessage(manager.id)}
                >
                  <MessageSquare size={16} color="#0066CC" />
                  <Text style={styles.messageButtonText}>Message</Text>
                  {manager.hasNewMessages && <View style={styles.messageNotificationDot} />}
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

      {/* Modale détails entreprise */}
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
                  <Image
                    source={{ uri: selectedCompanyDetails.logo }}
                    style={styles.companyDetailsLogo}
                    onError={() =>
                      setSelectedCompanyDetails((prev) =>
                        prev ? { ...prev, logo: DEFAULT_AVATAR } : null
                      )
                    }
                  />
                  <Text style={styles.companyDetailsName}>
                    {selectedCompanyDetails.name}
                  </Text>

                  {selectedCompanyDetails.commonPortName ? (
                    <View style={styles.companyDetailsRow}>
                      <MapPin size={20} color="#666" />
                      <Text style={styles.companyDetailsText}>
                        {selectedCompanyDetails.commonPortName}
                      </Text>
                    </View>
                  ) : null}

                  {selectedCompanyDetails.fullAddress ? (
                    <View style={styles.companyDetailsRow}>
                      <MapPin size={20} color="#666" />
                      <Text style={styles.companyDetailsText}>
                        {selectedCompanyDetails.fullAddress}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.companyDetailsRow}>
                    <Mail size={20} color="#666" />
                    <Text style={styles.companyDetailsText}>
                      {selectedCompanyDetails.contactEmail}
                    </Text>
                  </View>

                  <View style={styles.companyDetailsRow}>
                    <Phone size={20} color="#666" />
                    <Text style={styles.companyDetailsText}>
                      {selectedCompanyDetails.contactPhone}
                    </Text>
                  </View>

                  {(selectedCompanyDetails.categories || []).length > 0 && (
                    <View style={styles.companyDetailsServices}>
                      <Text style={styles.companyDetailsServicesTitle}>
                        Services proposés :
                      </Text>
                      <View style={styles.servicesTagsCompact}>
                        {(selectedCompanyDetails.categories || []).map((category, index) => (
                          <View key={`scat-${index}`} style={styles.serviceTagCompact}>
                            <Text style={styles.serviceTagTextCompact}>
                              {category.description1}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {(selectedCompanyDetails.ports || []).length > 0 && (
                    <View style={styles.companyDetailsServices}>
                      <Text style={styles.companyDetailsServicesTitle}>
                        Ports d'intervention :
                      </Text>
                      <View style={styles.servicesTagsCompact}>
                        {(selectedCompanyDetails.ports || []).map((port, index) => (
                          <View key={`sport-${index}`} style={styles.serviceTagCompact}>
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

// ================================
// Styles
// ================================
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

  // Stats
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
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
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

  // Performance
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
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
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

  // Section
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

  // Recherche
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
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: { outlineStyle: 'none' },
    }),
  },

  // Grids
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  // Clients
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
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
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

  // Entreprises
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
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
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

  // Contacts / BM cards
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
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
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

  // Boat Manager extras
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

  // New request
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

  // Empty & Loading
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
    paddingVertical: 0,
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
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
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
