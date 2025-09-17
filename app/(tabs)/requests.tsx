// app/(tabs)/requests.tsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Alert } from 'react-native';
import { FileText, ArrowUpDown, Calendar, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CircleDot, Circle as XCircle, ChevronRight, TriangleAlert as AlertTriangle, User, Bot as Boat, Building, Search, Filter, MessageSquare, Upload, Euro } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect

// Types de statuts pour les différents rôles
type RequestStatus = 'submitted' | 'in_progress' | 'forwarded' | 'quote_sent' | 'quote_accepted' | 'scheduled' | 'completed' | 'ready_to_bill' | 'to_pay' | 'paid' | 'cancelled';
type UrgencyLevel = 'normal' | 'urgent';
type SortKey = 'date' | 'type' | 'client'; // Simplifié pour le plaisancier

// Interface pour les données de la demande
interface Request {
  id: string;
  title: string; // service_request.description
  type: string; // categorie_service.description1
  status: RequestStatus; // service_request.statut
  urgency: UrgencyLevel; // service_request.urgence
  date: string; // service_request.date
  description: string; // service_request.description
  price?: number; // service_request.prix

  client: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
    phone: string;
  };
  boat?: { // MODIFICATION: Rendre la propriété 'boat' optionnelle
    id: string;
    name: string;
    type: string;
  };
  boatManager?: { // Optionnel, si un BM est assigné
    id: string;
    name: string;
  };
  company?: { // Optionnel, si une entreprise est impliquée
    id: string;
    name: string;
  };
  isNew?: boolean; // Client-side UI flag
  hasStatusUpdate?: boolean; // Client-side UI flag
}

// Configuration des statuts pour le plaisancier
const statusConfig = {
  submitted: { icon: Clock, color: '#F97316', label: 'Soumise' },
  in_progress: { icon: CircleDot, color: '#3B82F6', label: 'En cours' },
  forwarded: { icon: Upload, color: '#A855F7', label: 'Transmise' },
  quote_sent: { icon: FileText, color: '#22C55E', label: 'Devis reçu' },
  quote_accepted: { icon: CheckCircle2, color: '#15803D', label: 'Devis accepté' },
  scheduled: { icon: Calendar, color: '#2563EB', label: 'Planifiée' },
  completed: { icon: CheckCircle2, color: '#0EA5E9', label: 'Terminée' },
  ready_to_bill: { icon: Upload, color: '#6366F1', label: 'Bon à facturer' },
  to_pay: { icon: Euro, color: '#EAB308', label: 'À régler' },
  paid: { icon: CheckCircle2, color: '#a6acaf', label: 'Réglée' },
  cancelled: { icon: XCircle, color: '#DC2626', label: 'Annulée' },
};

// AuthOverlay Component
const AuthOverlay = () => (
  <View style={overlayStyles.overlayContainer}>
    <View style={overlayStyles.authCard}>
      <Text style={overlayStyles.authTitle}>Connexion requise</Text>
      <Text style={overlayStyles.authSubtitle}>
        Pour suivre l'ensemble de vos demandes, connectez-vous à votre compte.
      </Text>
      <TouchableOpacity
        style={overlayStyles.authButton}
        onPress={() => router.replace('/(tabs)/welcome-unauthenticated')}
      >
        <Text style={overlayStyles.authButtonText}>Se connecter</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function RequestsScreen() {
  const { user } = useAuth();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadRequestsCount, setUnreadRequestsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Combined data fetching logic
  const fetchData = useCallback(async () => {
    if (!user?.id) {
      // User is not authenticated, clear data and stop loading
      setRequests([]);
      setUnreadRequestsCount(0);
      setUnreadMessagesCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch requests
      const { data, error } = await supabase
        .from('service_request')
        .select(`
            id,
            description,
            statut,
            urgence,
            date,
            prix,
            id_client(id, first_name, last_name, e_mail, phone, avatar),
            id_boat(id, name, type),
            id_boat_manager(id, first_name, last_name),
            id_companie(id, company_name),
            categorie_service(description1)
          `)
        .eq('id_client', user.id) // Filter by the logged-in pleasure boater's ID
        .order('date', { ascending: false }); // Order by date, newest first

      if (error) {
        console.error('Error fetching requests:', error);
        Alert.alert('Erreur', 'Impossible de charger vos demandes.');
        setRequests([]); // Ensure requests are cleared on error
      } else {
        const formattedRequests: Request[] = data.map((req: any) => ({
          id: req.id.toString(),
          title: req.description || 'Demande de service',
          type: req.categorie_service?.description1 || 'N/A',
          status: req.statut as RequestStatus,
          urgency: req.urgence as UrgencyLevel,
          date: req.date,
          description: req.description,
          price: req.prix,
          client: {
            id: req.id_client.id.toString(),
            name: `${req.id_client.first_name} ${req.id_client.last_name}`,
            avatar: req.id_client.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
            email: req.id_client.e_mail,
            phone: req.id_client.phone,
          },
          boat: req.id_boat ? {
            id: req.id_boat.id.toString(),
            name: req.id_boat.name,
            type: req.id_boat.type,
          } : undefined,
          boatManager: req.id_boat_manager ? {
            id: req.id_boat_manager.id.toString(),
            name: `${req.id_boat_manager.first_name} ${req.id_boat_manager.last_name}`,
          } : undefined,
          company: req.id_companie ? {
            id: req.id_companie.id.toString(),
            name: req.id_companie.company_name,
          } : undefined,
          isNew: false,
          hasStatusUpdate: false,
        }));
        setRequests(formattedRequests);
      }

      // Fetch unread counts
      const { data: convMembers, error: convError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (convError || !convMembers) {
        console.error('Erreur lors de la récupération des conversations:', convError);
        setUnreadMessagesCount(0);
      } else {
        const convIds = convMembers.map(c => c.conversation_id);
        if (convIds.length === 0) {
          setUnreadMessagesCount(0);
        } else {
          const { count: messagesCount, error: messagesError } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .in('conversation_id', convIds)
            .neq('sender_id', user.id)
            .eq('is_read', false);

          if (messagesError) {
            console.error('Erreur lors de la récupération des messages non lus:', messagesError);
            setUnreadMessagesCount(0);
          } else {
            setUnreadMessagesCount(messagesCount || 0);
          }
        }
      }

      const { count: requestsCount, error: requestsError } = await supabase
        .from('service_request')
        .select('id', { count: 'exact' })
        .eq('id_client', user.id)
        .in('statut', ['submitted', 'quote_sent']);

      if (requestsError) {
        console.error('Error fetching unread requests count:', requestsError);
        setUnreadRequestsCount(0);
      } else {
        setUnreadRequestsCount(requestsCount || 0);
      }

    } catch (e) {
      console.error('Unexpected error in fetchData:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors du chargement des données.');
      setRequests([]);
      setUnreadRequestsCount(0);
      setUnreadMessagesCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const requestsSummary = useMemo(() => {
    return {
      total: requests.length,
      submitted: requests.filter(r => r.status === 'submitted').length,
      inProgress: requests.filter(r => r.status === 'in_progress').length,
      forwarded: requests.filter(r => r.status === 'forwarded').length,
      quoteSent: requests.filter(r => r.status === 'quote_sent').length,
      quoteAccepted: requests.filter(r => r.status === 'quote_accepted').length,
      scheduled: requests.filter(r => r.status === 'scheduled').length,
      completed: requests.filter(r => r.status === 'completed').length,
      readyToBill: requests.filter(r => r.status === 'ready_to_bill').length,
      toPay: requests.filter(r => r.status === 'to_pay').length,
      paid: requests.filter(r => r.status === 'paid').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length,
      urgent: requests.filter(r => r.urgency === 'urgent').length,
    };
  }, [requests]);

  const filteredAndSortedRequests = useMemo(() => {
    let filteredRequests = [...requests];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredRequests = filteredRequests.filter(request =>
        request.title.toLowerCase().includes(query) ||
        request.type.toLowerCase().includes(query) ||
        (request.boat && request.boat.name.toLowerCase().includes(query)) ||
        request.boatManager?.name.toLowerCase().includes(query) ||
        request.company?.name.toLowerCase().includes(query)
      );
    }

    if (selectedStatus) {
      filteredRequests = filteredRequests.filter(r => r.status === selectedStatus);
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
      } else {
        return sortAsc
          ? a.type.localeCompare(b.type)
          : b.type.localeCompare(a.type);
      }
    });
  }, [sortKey, sortAsc, searchQuery, selectedStatus, selectedUrgency, requests]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleRequestDetails = (requestId: string) => {
    router.push(`/request/${requestId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleFilterByStatus = (status: RequestStatus | null) => {
    setSelectedStatus(status === selectedStatus ? null : status);
    setSelectedUrgency(null);
  };

  const handleFilterByUrgency = (urgency: UrgencyLevel | null) => {
    setSelectedUrgency(urgency === selectedUrgency ? null : urgency);
    setSelectedStatus(null);
  };

  const handleMessage = (clientId: string) => {
    router.push(`/(tabs)/messages?client=${clientId}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollViewContent}>
        {/* Récapitulatif des demandes */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Récapitulatif de mes demandes</Text>

          {/* Carte Total dans sa propre rangée */}
          <View style={styles.totalCardContainer}>
            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: '#f8fafc' },
                selectedStatus === null && selectedUrgency === null && styles.summaryCardSelected
              ]}
              onPress={() => {
                setSelectedStatus(null);
                setSelectedUrgency(null);
              }}
            >
              <Text style={[styles.summaryNumber, { color: '#1a1a1a' }]}>{requestsSummary.total}</Text>
              <Text style={[styles.summaryLabel, { color: '#1a1a1a' }]}>Total</Text>
              {(unreadRequestsCount > 0) && (
                <View style={styles.summaryNotificationBadge}>
                  <Text style={styles.summaryNotificationText}>
                    {unreadRequestsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Carte pour les demandes urgentes */}
          <View style={styles.urgentCardContainer}>
            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: '#FEE2E2' },
                selectedUrgency === 'urgent' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByUrgency('urgent')}
            >
              <View style={styles.urgentCardContent}>
                <AlertTriangle size={20} color="#DC2626" />
                <Text style={styles.urgentCardText}>Urgentes ({requestsSummary.urgent})</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Autres cartes de statut dans une grille */}
          <View style={styles.summaryGrid}>
            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(249, 115, 22, 0.2)' },
                selectedStatus === 'submitted' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('submitted')}
            >
              <Text style={[styles.summaryNumber, { color: '#F97316' }]}>{requestsSummary.submitted}</Text>
              <Text style={[styles.summaryLabel, { color: '#F97316' }]}>Soumises</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
                selectedStatus === 'in_progress' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('in_progress')}
            >
              <Text style={[styles.summaryNumber, { color: '#3B82F6' }]}>{requestsSummary.inProgress}</Text>
              <Text style={[styles.summaryLabel, { color: '#3B82F6' }]}>En cours</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(168, 85, 247, 0.2)' },
                selectedStatus === 'forwarded' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('forwarded')}
            >
              <Text style={[styles.summaryNumber, { color: '#A855F7' }]}>{requestsSummary.forwarded}</Text>
              <Text style={[styles.summaryLabel, { color: '#A855F7' }]}>Transmises</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
                selectedStatus === 'quote_sent' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('quote_sent')}
            >
              <Text style={[styles.summaryNumber, { color: '#22C55E' }]}>{requestsSummary.quoteSent}</Text>
              <Text style={[styles.summaryLabel, { color: '#22C55E' }]}>Devis reçu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(21, 128, 61, 0.2)' },
                selectedStatus === 'quote_accepted' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('quote_accepted')}
            >
              <Text style={[styles.summaryNumber, { color: '#15803D' }]}>{requestsSummary.quoteAccepted}</Text>
              <Text style={[styles.summaryLabel, { color: '#15803D' }]}>Devis accepté</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(37, 99, 235, 0.2)' },
                selectedStatus === 'scheduled' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('scheduled')}
            >
              <Text style={[styles.summaryNumber, { color: '#2563EB' }]}>{requestsSummary.scheduled}</Text>
              <Text style={[styles.summaryLabel, { color: '#2563EB' }]}>Planifiées</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(14, 165, 233, 0.2)' },
                selectedStatus === 'completed' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('completed')}
            >
              <Text style={[styles.summaryNumber, { color: '#0EA5E9' }]}>{requestsSummary.completed}</Text>
              <Text style={[styles.summaryLabel, { color: '#0EA5E9' }]}>Terminées</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(99, 102, 241, 0.2)' },
                selectedStatus === 'ready_to_bill' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('ready_to_bill')}
            >
              <Text style={[styles.summaryNumber, { color: '#6366F1' }]}>{requestsSummary.readyToBill ?? 0}</Text>
              <Text style={[styles.summaryLabel, { color: '#6366F1' }]}>Bon à facturer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(234, 179, 8, 0.2)' },
                selectedStatus === 'to_pay' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('to_pay')}
            >
              <Text style={[styles.summaryNumber, { color: '#EAB308' }]}>{requestsSummary.toPay}</Text>
              <Text style={[styles.summaryLabel, { color: '#EAB308' }]}>À régler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(166, 172, 175, 0.2)' },
                selectedStatus === 'paid' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('paid')}
            >
              <Text style={[styles.summaryNumber, { color: '#a6acaf' }]}>{requestsSummary.paid}</Text>
              <Text style={[styles.summaryLabel, { color: '#a6acaf' }]}>Réglées</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.summaryCard,
                { backgroundColor: 'rgba(220, 38, 38, 0.2)' },
                selectedStatus === 'cancelled' && styles.summaryCardSelected
              ]}
              onPress={() => handleFilterByStatus('cancelled')}
            >
              <Text style={[styles.summaryNumber, { color: '#DC2626' }]}>{requestsSummary.cancelled}</Text>
              <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>Annulées</Text>
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

              {Object.entries(statusConfig).map(([status, config]) => {
                const StatusIcon = config.icon;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusFilter,
                      { backgroundColor: `${config.color}15` },
                      selectedStatus === status && { borderColor: config.color, borderWidth: 2 }
                    ]}
                    onPress={() => handleFilterByStatus(status as RequestStatus)}
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
            {selectedStatus
              ? `Demandes ${statusConfig[selectedStatus]?.label?.toLowerCase() || selectedStatus}`
              : selectedUrgency === 'urgent'
              ? 'Demandes urgentes'
              : 'Toutes mes demandes'}
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
              style={[styles.sortButton, sortKey === 'type' && styles.sortButtonActive]}
              onPress={() => toggleSort('type')}
            >
              <FileText size={16} color={sortKey === 'type' ? '#0066CC' : '#666'} />
              <Text style={[styles.sortButtonText, sortKey === 'type' && styles.sortButtonTextActive]}>
                Type {sortKey === 'type' && (sortAsc ? '↑' : '↓')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.requestsList}>
            {filteredAndSortedRequests.length > 0 ? (
              filteredAndSortedRequests.map((request) => {
                const status = statusConfig[request.status];
                const StatusIcon = status?.icon || FileText;
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
                      <View style={[styles.statusBadge, { backgroundColor: `${status?.color || '#999'}15` }]}>
                        <StatusIcon size={16} color={status?.color || '#999'} />
                        <Text style={[styles.statusText, { color: status?.color || '#999' }]}>
                          {status?.label || 'Statut inconnu'}
                        </Text>
                      </View>
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
                        {/* MODIFICATION: Afficher les informations du bateau uniquement si request.boat existe */}
                        {request.boat && (
                          <View style={styles.boatInfo}>
                            <Boat size={16} color="#666" />
                            <Text style={styles.boatType}>
                              {request.boat.name} • {request.boat.type}
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

                      {request.company && (
                        <View style={styles.companyInfo}>
                          <Building size={16} color="#8B5CF6" />
                          <Text style={styles.companyName}>{request.company.name}</Text>
                        </View>
                      )}

                      {request.status === 'to_pay' && request.price && (
                        <View style={styles.invoiceInfo}>
                          <FileText size={16} color="#EAB308" />
                          <Text style={styles.invoiceText}>
                            Facture • {formatAmount(request.price)}
                          </Text>
                        </View>
                      )}

                      {request.status === 'paid' && request.price && (
                        <View style={styles.paidInfo}>
                          <Euro size={16} color="#a6acaf" />
                          <Text style={styles.paidText}>
                            Facture réglée • {formatAmount(request.price)}
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
                  Aucune demande {selectedStatus ? statusConfig[selectedStatus].label.toLowerCase() : ''} trouvée.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      {!user?.id && <AuthOverlay />}
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Ensure it's on top
  },
  authCard: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 8 },
      web: { boxShadow: '0 8px 20px rgba(0,0,0,0.2)' },
    }),
  },
  authTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  authButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollViewContent: {
    flexGrow: 1, // Ensure content can grow and scroll
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
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
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
    backgroundColor: '#FEE2E2',
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
});
