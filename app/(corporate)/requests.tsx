import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Alert, Modal } from 'react-native';
import { FileText, ArrowUpDown, Calendar, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CircleDot, Circle as XCircle, ChevronRight, TriangleAlert as AlertTriangle, User, Bot as Boat, Building, Search, Filter, MessageSquare, Upload, Euro, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

// Types de statuts pour les différents rôles (Corporate peut voir tous les statuts)
type CorporateRequestStatus = 'submitted' | 'in_progress' | 'forwarded' | 'quote_sent' | 'quote_accepted' | 'scheduled' | 'completed' | 'ready_to_bill' | 'to_pay' | 'paid' | 'cancelled';
type UrgencyLevel = 'normal' | 'urgent';
type SortKey = 'date' | 'type' | 'client' | 'boatManager' | 'company';

interface Request {
  id: string;
  title: string;
  type: string;
  status: CorporateRequestStatus;
  urgency: UrgencyLevel;
  date: string;
  description: string;
  category: string;
  client: {
    id: string;
    name: string;
    avatar: string;
    email: string;
    phone: string;
    boat?: { // MODIFICATION: Rendre la propriété 'boat' optionnelle dans client
      name: string;
      type: string;
    } | null; // Ajout de | null pour être explicite
  };
  boatManager?: {
    id: string;
    name: string;
    port: string;
  };
  company?: {
    id: string;
    name: string;
  };
  currentHandler?: 'boat_manager' | 'company' | 'client';
  quoteIds?: string[];
  location?: string;
  notes?: string;
  scheduledDate?: string;
  invoiceReference?: string;
  invoiceAmount?: number;
  invoiceDate?: string;
  isNew?: boolean;
  hasStatusUpdate?: boolean;
}

// Configuration des statuts pour le Boat Manager
const detailedStatusConfig = {
  submitted: {
    icon: Clock,
    color: '#F97316', // Orange vif
    label: 'Nouvelle',
    description: 'En attente de prise en charge',
  },
  in_progress: {
    icon: CircleDot,
    color: '#3B82F6', // Bleu vif
    label: 'En cours',
    description: 'Intervention en cours',
  },
  forwarded: {
    icon: Upload,
    color: '#A855F7', // Violet
    label: 'Transmise',
    description: 'Transmise à une entreprise',
  },
  quote_sent: {
    icon: FileText,
    color: '#22C55E', // Vert clair
    label: 'Devis envoyé',
    description: 'En attente de réponse du client',
  },
  quote_accepted: {
    icon: CheckCircle2,
    color: '#15803D', // Vert foncé
    label: 'Devis accepté',
    description: 'Le client a accepté le devis',
  },
  scheduled: {
    icon: Calendar,
    color: '#2563EB', // Bleu plus foncé
    label: 'Planifiée',
    description: 'Intervention planifiée',
  },
  completed: {
    icon: CheckCircle2,
    color: '#0EA5E9', // Bleu ciel
    label: 'Terminée',
    description: 'Intervention terminée',
  },
  ready_to_bill: {
    icon: Upload,
    color: '#F59E0B', // Jaune du dashboard pour "Bon à facturer"
    label: 'Bon à facturer',
    description: 'Prêt pour facturation',
  },
  to_pay: {
    icon: FileText,
    color: '#10B981', // Vert du dashboard pour "Factures émises"
    label: 'À régler',
    description: 'Facture envoyée au client',
  },
  paid: {
    icon: Euro,
    color: '#a6acaf', // Gris
    label: 'Réglée',
    description: 'Facture payée',
  },
  cancelled: {
    icon: XCircle,
    color: '#DC2626', // Rouge vif
    label: 'Annulée',
    description: 'Demande annulée',
  }
};

// Nouvelles catégories de résumé pour la vue Corporate
type CorporateSummaryCategory = 'total' | 'new_requests' | 'in_progress_group' | 'ready_to_bill_group' | 'to_pay_group' | 'paid_group' | 'cancelled_group' | 'urgent';

interface CorporateSummaryConfig {
  label: string;
  color: string;
  icon?: any; // Lucide icon
  statuses?: CorporateRequestStatus[]; // Underlying statuses for filtering
  subCategories?: {
    key: string;
    label: string;
    filter: (request: Request) => boolean;
  }[];
}

const corporateSummaryConfig: Record<CorporateSummaryCategory, CorporateSummaryConfig> = {
  total: { label: 'Total', color: '#1a1a1a' },
  new_requests: { label: 'Nouvelles', color: '#F97316', icon: Clock, statuses: ['submitted'] },
  in_progress_group: {
    label: 'En cours',
    color: '#3B82F6',
    icon: CircleDot,
    statuses: ['in_progress', 'forwarded', 'quote_sent', 'quote_accepted', 'scheduled', 'completed']
  },
  ready_to_bill_group: {
    label: 'Bon à facturer',
    color: '#F59E0B', // Jaune du dashboard
    icon: Upload,
    statuses: ['ready_to_bill'],
    subCategories: [
      { key: 'ready_to_bill_bm', label: 'BM', filter: (r) => r.status === 'ready_to_bill' && !!r.boatManager && !r.company }
    ]
  },
  to_pay_group: {
    label: 'À régler',
    color: '#10B981', // Vert du dashboard
    icon: FileText,
    statuses: ['to_pay'],
    subCategories: [
      { key: 'to_pay_bm', label: 'BM', filter: (r) => r.status === 'to_pay' && !!r.boatManager && !r.company }
    ]
  },
  paid_group: {
    label: 'Réglées',
    color: '#a6acaf',
    icon: Euro,
    statuses: ['paid'],
    subCategories: [
      { key: 'paid_bm', label: 'BM', filter: (r) => r.status === 'paid' && !!r.boatManager && !r.company }
    ]
  },
  cancelled_group: { label: 'Annulées', color: '#DC2626', icon: XCircle, statuses: ['cancelled'] },
  urgent: { label: 'Urgentes', color: '#DC2626', icon: AlertTriangle }
};


export default function RequestsScreen() {
  const { user } = useAuth();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSummaryCategory, setSelectedSummaryCategory] = useState<CorporateSummaryCategory | null>(null); // New state for summary filter
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [requestToUpdate, setRequestToUpdate] = useState<Request | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_request')
        .select(`
            id,
            description,
            statut,
            urgence,
            date,
            prix,
            note_add,
            id_client,
            id_boat_manager,
            id_companie,
            categorie_service(description1),
            users!id_client(id, first_name, last_name, avatar, e_mail, phone),
            boat(name, type, place_de_port)
          `);

      if (error) {
        console.error('Error fetching requests:', error);
        Alert.alert('Erreur', 'Impossible de charger les demandes.');
        return;
      }

      const formattedRequests: Request[] = await Promise.all(data.map(async (req: any) => {
        let boatManagerDetails: Request['boatManager'] | undefined;
        if (req.id_boat_manager) {
          const { data: bmData, error: bmError } = await supabase
            .from('users')
            .select('id, first_name, last_name, user_ports(ports(name))')
            .eq('id', req.id_boat_manager)
            .single();
          if (!bmError && bmData) {
            boatManagerDetails = {
              id: bmData.id.toString(),
              name: `${bmData.first_name} ${bmData.last_name}`,
              port: bmData.user_ports && bmData.user_ports.length > 0 ? bmData.user_ports[0].ports.name : 'N/A'
            };
          }
        }

        let companyDetails: Request['company'] | undefined;
        if (req.id_companie) {
          const { data: companyData, error: companyError } = await supabase
            .from('users')
            .select('id, company_name')
            .eq('id', req.id_companie)
            .single();
          if (!companyError && companyData) {
            companyDetails = {
              id: companyData.id.toString(),
              name: companyData.company_name || 'N/A'
            };
          }
        }

        let invoiceReference: string | undefined;
        let invoiceDate: string | undefined;
        if (req.note_add && (req.statut === 'to_pay' || req.statut === 'paid')) {
          const invoiceMatch = req.note_add.match(/Facture (\S+) • (\d{4}-\d{2}-\d{2})/);
          if (invoiceMatch) {
            invoiceReference = invoiceMatch[1];
            invoiceDate = invoiceMatch[2];
          }
        }
        
        let scheduledDate: string | undefined;
        if (req.statut === 'scheduled' && req.note_add) {
          const scheduledMatch = req.note_add.match(/Planifiée le (\d{4}-\d{2}-\d{2})/);
          if (scheduledMatch) {
            scheduledDate = scheduledMatch[1];
          }
        }

        let currentHandler: Request['currentHandler'] = 'client';
        if (req.id_boat_manager && ['submitted', 'in_progress'].includes(req.statut)) {
            currentHandler = 'boat_manager';
        } else if (req.id_companie && ['forwarded', 'quote_sent', 'quote_accepted', 'scheduled', 'completed', 'ready_to_bill', 'to_pay', 'paid'].includes(req.statut)) {
            currentHandler = 'company';
        }


        return {
          id: req.id.toString(),
          title: req.description,
          type: req.categorie_service?.description1 || 'N/A',
          status: req.statut as CorporateRequestStatus,
          urgency: req.urgence as UrgencyLevel,
          date: req.date,
          description: req.description,
          category: 'Services',
          client: {
            id: req.users.id.toString(),
            name: `${req.users.first_name} ${req.users.last_name}`,
            avatar: req.users.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
            email: req.users.e_mail,
            phone: req.users.phone,
            boat: req.boat ? { // MODIFICATION: Vérifier si req.boat est null avant d'assigner
              name: req.boat.name,
              type: req.boat.type
            } : null, // Assigner null si req.boat est null
          },
          boatManager: boatManagerDetails,
          company: companyDetails,
          notes: req.note_add,
          scheduledDate: scheduledDate,
          invoiceReference: invoiceReference,
          invoiceAmount: req.prix,
          invoiceDate: invoiceDate,
          isNew: false,
          hasStatusUpdate: false,
          currentHandler: currentHandler,
        };
      }));

      setRequests(formattedRequests);
    } catch (e) {
      console.error('Unexpected error:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors du chargement des demandes.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const requestsSummary = useMemo(() => {
    const summary = {
      total: requests.length,
      new_requests: requests.filter(r => r.status === 'submitted').length,
      in_progress_group: requests.filter(r => ['in_progress', 'forwarded', 'quote_sent', 'quote_accepted', 'scheduled', 'completed'].includes(r.status)).length,
      ready_to_bill_group: requests.filter(r => r.status === 'ready_to_bill').length,
      ready_to_bill_bm: requests.filter(r => r.status === 'ready_to_bill' && !!r.boatManager && !r.company).length,
      ready_to_bill_company: requests.filter(r => r.status === 'ready_to_bill' && !!r.company).length,
      to_pay_group: requests.filter(r => r.status === 'to_pay').length,
      to_pay_bm: requests.filter(r => r.status === 'to_pay' && !!r.boatManager && !r.company).length,
      to_pay_company: requests.filter(r => r.status === 'to_pay' && !!r.company).length,
      paid_group: requests.filter(r => r.status === 'paid').length,
      paid_bm: requests.filter(r => r.status === 'paid' && !!r.boatManager && !r.company).length,
      paid_company: requests.filter(r => r.status === 'paid' && !!r.company).length,
      cancelled_group: requests.filter(r => r.status === 'cancelled').length,
      urgent: requests.filter(r => r.urgency === 'urgent').length,
      newRequests: requests.filter(r => r.isNew).length, // Keep for notification badge
      statusUpdates: requests.filter(r => r.hasStatusUpdate).length // Keep for notification badge
    };
    return summary;
  }, [requests]);

  const filteredAndSortedRequests = useMemo(() => {
    let filteredRequests = [...requests];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredRequests = filteredRequests.filter(request => 
        request.client.name.toLowerCase().includes(query) ||
        request.company?.name?.toLowerCase().includes(query) ||
        request.boatManager?.name?.toLowerCase().includes(query) ||
        request.title.toLowerCase().includes(query) ||
        request.type.toLowerCase().includes(query) ||
        (request.client.boat && request.client.boat.name.toLowerCase().includes(query)) // MODIFICATION: Vérifier si request.client.boat existe
      );
    }

    if (selectedSummaryCategory) {
      const config = corporateSummaryConfig[selectedSummaryCategory];
      if (config.statuses) {
        filteredRequests = filteredRequests.filter(r => config.statuses!.includes(r.status));
      }
      // Apply sub-category filter if a specific sub-category was selected (e.g., 'to_pay_bm')
      // This part assumes `selectedSummaryCategory` can also hold sub-category keys for filtering
      // If not, a separate state for sub-category filtering would be needed.
      // For now, if a main category is selected, it shows all requests within that main category.
      // If you need to filter by 'to_pay_bm' directly from the summary card, we'd need to adjust `handleFilterBySummaryCategory`
      // and potentially add a new state for sub-category selection.
    }

    if (selectedUrgency) {
      filteredRequests = filteredRequests.filter(r => r.urgency === selectedUrgency);
    }

    return filteredRequests.sort((a, b) => {
      if (sortKey === 'date') {
        return sortAsc 
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortKey === 'client') {
        return sortAsc
          ? a.client.name.localeCompare(b.client.name)
          : b.client.name.localeCompare(a.client.name);
      } else if (sortKey === 'company') {
        const aName = a.company?.name || '';
        const bName = b.company?.name || '';
        return sortAsc
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      } else {
        const aValue = a[sortKey as keyof Request] as string;
        const bValue = b[sortKey as keyof Request] as string;
        return sortAsc
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
    });
  }, [sortKey, sortAsc, searchQuery, selectedSummaryCategory, selectedUrgency, requests]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    };
  };

  const handleRequestDetails = (requestId: string) => {
    setRequests(prev =>
      prev.map(request => 
        request.id === requestId 
          ? { ...request, isNew: false, hasStatusUpdate: false } 
          : request
      )
    );
    router.push(`/request/${requestId}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date'; // Handle invalid date strings
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleFilterBySummaryCategory = (category: CorporateSummaryCategory | null) => {
    setSelectedSummaryCategory(category === selectedSummaryCategory ? null : category);
    setSelectedUrgency(null); // Reset urgency filter when a summary category is selected
  };

  const handleFilterByUrgency = (urgency: UrgencyLevel | null) => {
    setSelectedUrgency(urgency === selectedUrgency ? null : urgency);
    setSelectedSummaryCategory(null); // Reset summary category filter when urgency is selected
  };

  const handleMessage = (clientId: string) => {
    router.push(`/(corporate)/messages?client=${clientId}`);
  };

  const getCurrentHandlerInfo = useCallback((request: Request) => { // MODIFICATION: Encapsuler dans useCallback
    let handlerText = '';
    let handlerIcon = null;
    let handlerColor = '#666';

    switch (request.currentHandler) {
      case 'boat_manager':
        handlerText = `Géré par BM: ${request.boatManager?.name || 'Inconnu'}`;
        handlerIcon = User;
        handlerColor = '#0066CC';
        break;
      case 'company':
        handlerText = `Géré par Entreprise: ${request.company?.name || 'Inconnu'}`;
        handlerIcon = Building;
        handlerColor = '#8B5CF6';
        break;
      case 'client':
        handlerText = `Géré par Client: ${request.client.name}`;
        handlerIcon = User;
        handlerColor = '#666';
        break;
      default:
        handlerText = 'Statut inconnu';
        handlerIcon = FileText;
        handlerColor = '#666';
    }

    // Override for specific statuses that imply a different "handler" context
    if (request.status === 'scheduled' && request.scheduledDate) {
      handlerText = `Planifiée le ${formatDate(request.scheduledDate)}`;
      handlerIcon = Calendar;
      handlerColor = '#3B82F6';
    } else if (request.status === 'to_pay' && request.invoiceReference) {
      handlerText = 'Facture en attente de paiement';
      handlerIcon = FileText;
      handlerColor = '#EAB308';
    } else if (request.status === 'paid' && request.invoiceReference) {
      handlerText = 'Facture réglée';
      handlerIcon = Euro;
      handlerColor = '#a6acaf';
    }

    return { handlerText, handlerIcon, handlerColor };
  }, [formatDate]); // Dépendance à formatDate

  const handleUpdateStatus = async (newStatus: CorporateRequestStatus) => {
    if (requestToUpdate) {
      try {
        const { error } = await supabase
          .from('service_request')
          .update({ statut: newStatus })
          .eq('id', parseInt(requestToUpdate.id));

        if (error) {
          console.error('Error updating status:', error);
          Alert.alert('Erreur', `Impossible de mettre à jour le statut: ${error.message}`);
        } else {
          setRequests(prev =>
            prev.map(req =>
              req.id === requestToUpdate.id
                ? { ...req, status: newStatus, isNew: false, hasStatusUpdate: false }
                : req
            )
          );
          setRequestToUpdate(null);
          setShowStatusChangeModal(false);
          Alert.alert('Succès', 'Statut mis à jour avec succès.');
        }
      } catch (e) {
        console.error('Unexpected error during status update:', e);
        Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de la mise à jour du statut.');
      }
    }
  };

  const StatusChangeModal = () => (
    <Modal
      visible={showStatusChangeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStatusChangeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Changer le statut</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowStatusChangeModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {Object.entries(detailedStatusConfig).map(([statusKey, config]) => {
              const StatusIcon = config.icon;
              return (
                <TouchableOpacity
                  key={statusKey}
                  style={styles.statusOption}
                  onPress={() => handleUpdateStatus(statusKey as CorporateRequestStatus)}
                >
                  <View style={styles.statusOptionContent}>
                    <StatusIcon size={20} color={config.color} />
                    <View>
                      <Text style={[styles.statusOptionLabel, { color: config.color }]}>
                        {config.label}
                      </Text>
                      <Text style={styles.statusOptionDescription}>
                        {config.description}
                      </Text>
                    </View>
                  </View>
                  {requestToUpdate?.status === statusKey && (
                    <CheckCircle2 size={24} color="#0066CC" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Chargement des demandes...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Récapitulatif des demandes */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Récapitulatif des demandes</Text>
        
        <View style={styles.totalCardContainer}>
          <TouchableOpacity 
            style={[
              styles.summaryCard, 
              { backgroundColor: '#f8fafc' },
              selectedSummaryCategory === 'total' && styles.summaryCardSelected
            ]}
            onPress={() => handleFilterBySummaryCategory('total')}
          >
            <Text style={[styles.summaryNumber, { color: '#1a1a1a' }]}>{requestsSummary.total}</Text>
            <Text style={[styles.summaryLabel, { color: '#1a1a1a' }]}>Total</Text>
            {(requestsSummary.newRequests > 0 || requestsSummary.statusUpdates > 0) && (
              <View style={styles.summaryNotificationBadge}>
                <Text style={styles.summaryNotificationText}>
                  {requestsSummary.newRequests + requestsSummary.statusUpdates}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={styles.summaryGrid}>
          {Object.entries(corporateSummaryConfig).map(([categoryKey, config]) => {
            if (categoryKey === 'total' || categoryKey === 'urgent') return null; // Handled separately

            const count = requestsSummary[categoryKey as keyof typeof requestsSummary];
            const SummaryIcon = config.icon;

            return (
              <TouchableOpacity 
                key={categoryKey}
                style={[
                  styles.summaryCard, 
                  { backgroundColor: `${config.color}15` },
                  selectedSummaryCategory === categoryKey && styles.summaryCardSelected
                ]}
                onPress={() => handleFilterBySummaryCategory(categoryKey as CorporateSummaryCategory)}
              >
                <Text style={[styles.summaryNumber, { color: config.color }]}>{count}</Text>
                <Text style={[styles.summaryLabel, { color: config.color }]}>{config.label}</Text>
                
                {/* Display sub-categories for "Bon à facturer", "À régler" and "Réglées" */}
                {(categoryKey === 'ready_to_bill_group' || categoryKey === 'to_pay_group' || categoryKey === 'paid_group') && config.subCategories && (
                  <View style={styles.subCategoryContainer}>
                    {config.subCategories.map(sub => (
                      <Text key={sub.key} style={[styles.subCategoryText, { color: config.color }]}>
                        {requestsSummary[sub.key as keyof typeof requestsSummary]}
                      </Text>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        
        <View style={styles.urgentCardContainer}>
          <TouchableOpacity 
            style={[
              styles.summaryCard, 
              { backgroundColor: '#FEE2F2' },
              selectedUrgency === 'urgent' && styles.summaryCardSelected
            ]}
            onPress={() => handleFilterByUrgency('urgent')}
          >
            <View style={styles.urgentCardContent}>
              <AlertTriangle size={20} color="#DC2626" />
              <Text style={styles.urgentCardText}>Demandes urgentes ({requestsSummary.urgent})</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recherche et Filtres */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une demande..."
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
          <Text style={styles.filtersTitle}>Filtres par statut</Text>
          <View style={styles.statusFilters}>
            
            {Object.entries(detailedStatusConfig).map(([status,config]) => {
              const StatusIcon = config.icon;
              return (
                <TouchableOpacity 
                  key={status}
                  style={[
                    styles.statusFilter,
                    { backgroundColor: `${config.color}15` },
                    selectedSummaryCategory === status && { borderColor: config.color, borderWidth: 2 } // Use selectedSummaryCategory for detailed filter too
                  ]}
                  onPress={() => handleFilterBySummaryCategory(status as CorporateSummaryCategory)}
                >
                  <StatusIcon size={16} color={config.color} />
                  <Text style={[styles.statusFilterText, { color: config.color }]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Liste des demandes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedSummaryCategory 
            ? `Demandes ${corporateSummaryConfig[selectedSummaryCategory]?.label?.toLowerCase() || 'inconnu'}`
            : selectedUrgency === 'urgent'
            ? 'Demandes urgentes'
            : 'Toutes les demandes'}
        </Text>
        
        <View style={styles.sortContainer}>
          <TouchableOpacity 
            style={[styles.sortButton, sortKey === 'date' && styles.sortButtonActive]} 
            onPress={() => toggleSort('date')}
          >
            <Calendar size={16} color={sortKey === 'date' ? '#0066CC' : '#666'} />
            <Text style={[styles.sortButtonText, sortKey === 'date' && styles.sortButtonTextActive]}>
              Date {sortKey === 'date' && (sortAsc ? '↑' : '↓')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.sortButton, sortKey === 'client' && styles.sortButtonActive]}
            onPress={() => toggleSort('client')}
          >
            <User size={16} color={sortKey === 'client' ? '#0066CC' : '#666'} />
            <Text style={[styles.sortButtonText, sortKey === 'client' && styles.sortButtonTextActive]}>
              Client {sortKey === 'client' && (sortAsc ? '↑' : '↓')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.sortButton, sortKey === 'boatManager' && styles.sortButtonActive]}
            onPress={() => toggleSort('boatManager')}
          >
            <User size={16} color={sortKey === 'boatManager' ? '#0066CC' : '#666'} />
            <Text style={[styles.sortButtonText, sortKey === 'boatManager' && styles.sortButtonTextActive]}>
              Boat Manager {sortKey === 'boatManager' && (sortAsc ? '↑' : '↓')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.sortButton, sortKey === 'company' && styles.sortButtonActive]}
            onPress={() => toggleSort('company')}
          >
            <Building size={16} color={sortKey === 'company' ? '#0066CC' : '#666'} />
            <Text style={[styles.sortButtonText, sortKey === 'company' && styles.sortButtonTextActive]}>
              Entreprise {sortKey === 'company' && (sortAsc ? '↑' : '↓')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.requestsList}>
          {filteredAndSortedRequests.length > 0 ? (
            filteredAndSortedRequests.map((request) => {
              const status = detailedStatusConfig[request.status];
              const StatusIcon = status ? status.icon : FileText;
              const statusLabel = status ? status.label : 'Inconnu';
              const statusColor = status ? status.color : '#666666'; // MODIFICATION: Valeur par défaut pour statusColor

              const { handlerText, handlerIcon: HandlerIcon, handlerColor } = getCurrentHandlerInfo(request); // MODIFICATION: Appel de la fonction

              return (
                <TouchableOpacity 
                  key={request.id} 
                  style={[
                    styles.requestCard,
                    request.urgency === 'urgent' && styles.urgentRequestCard,
                    request.isNew && styles.newRequestCard,
                    request.hasStatusUpdate && styles.statusUpdateCard
                  ]}
                  onPress={() => handleRequestDetails(request.id)}
                >
                  {(request.isNew || request.hasStatusUpdate) && (
                    <View style={[
                      styles.notificationIndicator,
                      request.isNew ? styles.newIndicator : styles.updateIndicator
                    ]} />
                  )}
                  <View style={styles.requestHeader}>
                    <View style={styles.requestInfo}>
                      <View style={styles.requestTitleContainer}>
                        <Text style={styles.requestTitle}>{request.title}</Text>
                        {request.urgency === 'urgent' && (
                          <View style={styles.urgentBadge}>
                            <AlertTriangle size={14} color="#DC2626" />
                            <Text style={styles.urgentText}>Urgent</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.requestType}>{request.type}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}
                      onPress={() => {
                        setRequestToUpdate(request);
                        setShowStatusChangeModal(true);
                      }}
                    >
                      <StatusIcon size={16} color={status?.color || '#999'} />
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.requestDetails}>
                    <View style={styles.requestMetadata}>
                      <FileText size={16} color="#666" />
                      <Text style={styles.requestDescription} numberOfLines={2}>
                        {request.description}
                      </Text>
                    </View>
                    <View style={styles.requestDate}>
                      <Calendar size={16} color="#666" />
                      <Text style={styles.dateText}>{formatDate(request.date)}</Text>
                    </View>
                    <View style={styles.clientInfo}>
                      <User size={16} color="#666" />
                      <Text style={styles.clientName}>{request.client.name}</Text>
                      {request.client.boat && ( // MODIFICATION: Afficher les informations du bateau uniquement si request.client.boat existe
                        <View style={styles.boatInfo}>
                          <Boat size={16} color="#666" />
                          <Text style={styles.boatType}>
                            {request.client.boat.name} • {request.client.boat.type}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {request.boatManager && (
                      <View style={styles.boatManagerInfo}>
                        <User size={16} color="#0066CC" />
                        <Text style={styles.boatManagerName}>{request.boatManager.name}</Text>
                      </View>
                    )}
                    
                    {/* Display current handler and progress */}
                    {handlerText && HandlerIcon && (
                      <View style={[styles.handlerInfo, { backgroundColor: `${handlerColor}15` }]}>
                        <HandlerIcon size={16} color={handlerColor} />
                        <Text style={[styles.handlerText, { color: handlerColor }]}>
                          {handlerText}
                        </Text>
                      </View>
                    )}
                    
                    {request.status === 'to_pay' && request.invoiceReference && (
                      <View style={styles.invoiceInfo}>
                        <FileText size={16} color="#EAB308" />
                        <Text style={styles.invoiceText}>
                          Facture {request.invoiceReference} • {request.invoiceAmount ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(request.invoiceAmount) : ''}
                        </Text>
                      </View>
                    )}
                    
                    {request.status === 'paid' && request.invoiceReference && (
                      <View style={styles.paidInfo}>
                        <Euro size={16} color="#a6acaf" />
                        <Text style={styles.paidText}>
                          Facture {request.invoiceReference} réglée
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.requestActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleMessage(request.client.id)}
                    >
                      <MessageSquare size={20} color="#0066CC" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleRequestDetails(request.id)}
                    >
                      <ChevronRight size={20} color="#0066CC" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Aucune demande {selectedSummaryCategory ? corporateSummaryConfig[selectedSummaryCategory]?.label?.toLowerCase() || 'inconnu' : ''} trouvée
              </Text>
            </View>
          )}
        </View>
      </View>
      <StatusChangeModal />
    </ScrollView>
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
  summaryContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  totalCardContainer: {
    marginBottom: 12,
  },
  urgentCardContainer: {
    width: '100%',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 0,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  summaryCardSelected: {
    borderColor: '#0066CC',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  subCategoryContainer: {
    marginTop: 4,
    alignItems: 'center',
  },
  subCategoryText: {
    fontSize: 10,
    fontWeight: '500',
  },
  summaryNotificationBadge: {
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
  summaryNotificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  urgentCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgentCardText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  searchSection: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  searchContainer: {
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
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
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
  filtersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  sortContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  sortButtonActive: {
    backgroundColor: '#e0f2fe',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#0066CC',
    fontWeight: '500',
  },
  requestsList: {
    gap: 16,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
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
  urgentRequestCard: {
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  newRequestCard: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  statusUpdateCard: {
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  notificationIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'white',
    zIndex: 1,
  },
  newIndicator: {
    backgroundColor: '#EF4444',
  },
  updateIndicator: {
    backgroundColor: '#3B82F6',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  requestType: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  urgentText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
  },
  requestDetails: {
    padding: 16,
    gap: 12,
  },
  requestMetadata: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  requestDescription: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  requestDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  clientName: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  boatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatType: {
    fontSize: 14,
    color: '#666',
  },
  boatManagerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  boatManagerName: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  companyName: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  handlerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  handlerText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
  invoiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  invoiceText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  paidInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  paidText: {
    fontSize: 12,
    color: '#10B981',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
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
    borderRadius: 16, // MODIFICATION ICI : borderRadius uniforme
    width: '90%', // MODIFICATION ICI : Largeur de 90%
    maxWidth: 500, // MODIFICATION ICI : Largeur maximale de 500px
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
    padding: 20,
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
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  statusOptionDescription: {
    fontSize: 12,
    color: '#666',
  },
});
