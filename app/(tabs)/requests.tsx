import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Alert, Modal } from 'react-native';
import { FileText, ArrowUpDown, Calendar, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CircleDot, Circle as XCircle, ChevronRight, ChevronDown, ChevronUp,TriangleAlert as AlertTriangle, User, Bot as Boat, Building, Search, Filter, MessageSquare, Upload, Euro, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// Types de statuts pour les différents rôles
type RequestStatus = 'submitted' | 'in_progress' | 'forwarded' | 'quote_sent' | 'quote_accepted' | 'scheduled' | 'completed' | 'ready_to_bill' | 'to_pay' | 'paid' | 'cancelled';
type UrgencyLevel = 'normal' | 'urgent';
type SortKey = 'date' | 'type' | 'client' | 'company';

// Updated Request interface to match Supabase data structure
interface Request {
  id: string;
  description: string; // Maps to service_request.description
  type: string; // Maps to categorie_service.description1
  status: RequestStatus; // Maps to service_request.statut
  urgency: UrgencyLevel; // Maps to service_request.urgence
  date: string; // Maps to service_request.date
  prix: number | null; // Maps to service_request.prix
  note_add: string | null; // Maps to service_request.note_add
  client: {
    id: string;
    first_name: string;
    last_name: string;
    avatar: string | null;
    e_mail: string;
    phone: string;
  };
  boat: {
    name: string;
    type: string;
    place_de_port: string | null;
  };
  boat_manager: { // Renamed from boatManager to match Supabase relation
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  companie: { // Renamed from company to match Supabase relation
    id: string;
    company_name: string;
  } | null;
  scheduledDate?: string;
  invoiceReference?: string;
  invoiceAmount?: number;
  invoiceDate?: string;
  isNew?: boolean;
  hasStatusUpdate?: boolean;
}

// Configuration des statuts pour le Plaisancier
const statusConfig = {
  submitted: {
    icon: Clock,
    color: '#C0351A', // Orange vif
    label: 'Transmise',
    description: 'Votre demande a été transmise',
  },
  in_progress: {
    icon: CircleDot,
    color: '#3B82F6', // Bleu vif
    label: 'En cours',
    description: 'Nos équipes travaillent sur votre demande',
  },
  forwarded: {
    icon: Upload,
    color: '#A855F7', // Violet
    label: 'Transmise',
    description: 'Transmise à une entreprise',
  },
  quote_sent: {
    icon: FileText,
    color: '#8B5CF6', // Vert clair
    label: 'Devis reçu',
    description: 'Un devis vous a été envoyé',
  },
  quote_accepted: {
    icon: CheckCircle2,
    color: '#10B981', // Vert foncé
    label: 'Devis accepté',
    description: 'Vous avez accepté le devis',
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
    color: '#6366F1', // Indigo
    label: 'Bon à facturer',
    description: 'Prêt pour facturation',
  },
  to_pay: {
    icon: FileText,
    color: '#EAB308', // Jaune doré
    label: 'À régler',
    description: 'Une facture vous a été envoyée',
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

export default function RequestsScreen() {
  const { user } = useAuth();
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      if (!user?.id) {
        setRequests([]); // Clear requests if user is not logged in
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
            boat(name, type, place_de_port),
            boat_manager:users!id_boat_manager(id, first_name, last_name),
            companie:users!id_companie(id, company_name)
          `)
          .eq('id_client', user.id);

        if (error) {
          console.error('Error fetching requests:', error);
          Alert.alert('Erreur', 'Impossible de charger les demandes.');
          setRequests([]);
          return;
        }

        const formattedRequests: Request[] = data.map((req: any) => {
          // Extract scheduledDate, invoiceReference, invoiceAmount, invoiceDate from note_add if available
          let scheduledDate: string | undefined;
          let invoiceReference: string | undefined;
          let invoiceAmount: number | undefined;
          let invoiceDate: string | undefined;

          if (req.note_add) {
            // Example: "Planifiée le 2024-03-15"
            const scheduledMatch = req.note_add.match(/Planifiée le (\d{4}-\d{2}-\d{2})/);
            if (scheduledMatch) {
              scheduledDate = scheduledMatch[1];
            }

            // Example: "Facture FAC-2024-001 • 1200€ • 2024-03-01"
            const invoiceMatch = req.note_add.match(/Facture (\S+) • (\d+\.?\d*)€ • (\d{4}-\d{2}-\d{2})/);
            if (invoiceMatch) {
              invoiceReference = invoiceMatch[1];
              invoiceAmount = parseFloat(invoiceMatch[2]);
              invoiceDate = invoiceMatch[3];
            }
          }

          return {
            id: req.id.toString(),
            description: req.description,
            type: req.categorie_service?.description1 || 'N/A',
            status: req.statut as RequestStatus,
            urgency: req.urgence as UrgencyLevel,
            date: req.date,
            prix: req.prix,
            note_add: req.note_add,
            client: {
              id: req.users.id.toString(),
              first_name: req.users.first_name,
              last_name: req.users.last_name,
              avatar: req.users.avatar,
              e_mail: req.users.e_mail,
              phone: req.users.phone,
            },
            boat: {
              name: req.boat.name,
              type: req.boat.type,
              place_de_port: req.boat.place_de_port,
            },
            boat_manager: req.boat_manager ? {
              id: req.boat_manager.id.toString(),
              first_name: req.boat_manager.first_name,
              last_name: req.boat_manager.last_name,
            } : null,
            companie: req.companie ? {
              id: req.companie.id.toString(),
              company_name: req.companie.company_name,
            } : null,
            scheduledDate: scheduledDate,
            invoiceReference: invoiceReference,
            invoiceAmount: invoiceAmount,
            invoiceDate: invoiceDate,
            isNew: false, // Managed client-side
            hasStatusUpdate: false // Managed client-side
          };
        });

        setRequests(formattedRequests);
      } catch (e) {
        console.error('Unexpected error:', e);
        Alert.alert('Erreur', 'Une erreur inattendue est survenue lors du chargement des demandes.');
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [user]);

  // Marquer les demandes comme vues lorsque l'écran est ouvert
  useEffect(() => {
    setRequests(prev =>
      prev.map(request => ({
        ...request,
        isNew: false,
        hasStatusUpdate: false
      }))
    );
  }, [requests.length]);

  const requestsSummary = useMemo(() => {
    return {
      total: requests.length,
      submitted: requests.filter(r => r.status === 'submitted').length,
      inProgress: requests.filter(r => r.status === 'in_progress').length,
      quoteSent: requests.filter(r => r.status === 'quote_sent').length,
      quoteAccepted: requests.filter(r => r.status === 'quote_accepted').length,
      scheduled: requests.filter(r => r.status === 'scheduled').length,
      completed: requests.filter(r => r.status === 'completed').length,
      toPay: requests.filter(r => r.status === 'to_pay').length,
      paid: requests.filter(r => r.status === 'paid').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length,
      urgent: requests.filter(r => r.urgency === 'urgent').length,
      newRequests: requests.filter(r => r.isNew).length,
      statusUpdates: requests.filter(r => r.hasStatusUpdate).length
    };
  }, [requests]);

  const filteredAndSortedRequests = useMemo(() => {
    let filteredRequests = [...requests];
    
    // Apply status filter
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
      } else {
        // Fallback for 'type' or other string fields
        const aValue = a[sortKey as keyof Request] as string;
        const bValue = b[sortKey as keyof Request] as string;
        return sortAsc
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
    });
  }, [sortKey, sortAsc, selectedStatus, selectedUrgency, requests]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleRequestDetails = (requestId: string) => {
    // Marquer la demande comme vue et supprimer le drapeau de mise à jour de statut
    const updatedRequests = requests.map(request => 
      request.id === requestId 
        ? { ...request, isNew: false, hasStatusUpdate: false } 
        : request
    );
    setRequests(updatedRequests);
    
    // Naviguer vers les détails de la demande
    router.push(`/request/${requestId}`);
  };

  const formatDate = (dateString: string) => {
    // Supabase returns dates in ISO format (e.g., "2024-02-20T10:05:00.000Z")
    // Convert to Date object and then format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date'; // Handle invalid date strings
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleFilterByStatus = (status: RequestStatus | null) => {
    setSelectedStatus(status === selectedStatus ? null : status);
    setSelectedUrgency(null);
  };

  const handleFilterByUrgency = (urgency: UrgencyLevel | null) => {
    setSelectedUrgency(urgency === selectedUrgency ? null : urgency);
    setSelectedStatus(null);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Chargement de vos demandes...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.emptyStateText}>
          Veuillez vous connecter pour voir vos demandes.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Récapitulatif des demandes */}
      <View style={styles.summaryContainer}>
        {/* Carte Total toujours visible */}
        <TouchableOpacity 
          style={styles.totalCardContainer}
          onPress={() => setShowSummaryDetails(!showSummaryDetails)}
        >
          <View 
            style={[
              styles.summaryCard, 
              { backgroundColor: 'rgba(33, 43, 84, 0.2)' },
              selectedStatus === null && selectedUrgency === null && styles.summaryCardSelected
            ]}
          >
            <Text style={[styles.summaryLabel, { color: '#212B54', fontSize: 12 }]}>Total de mes demandes</Text>
            <View style={styles.summaryNumberContainer}>
              <Text style={[styles.summaryNumber, { color: '#212B54' }]}>{requestsSummary.total}</Text>
            </View>
            {(requestsSummary.newRequests > 0 || requestsSummary.statusUpdates > 0) && (
              <View style={styles.summaryNotificationBadge}>
                <Text style={styles.summaryNotificationText}>
                  {requestsSummary.newRequests + requestsSummary.statusUpdates}
                </Text>
              </View>
            )}
            {showSummaryDetails ? (
              <ChevronUp size={24} color="#212B54" style={styles.summaryToggleIcon} />
            ) : (
              <ChevronDown size={24} color="#212B54" style={styles.summaryToggleIcon} />
            )}
          </View>
        </TouchableOpacity>
        
        {/* Autres cartes de statut dans une grille - visibles uniquement si showSummaryDetails est true */}
        {showSummaryDetails && (
          <>
            <View style={styles.summaryGrid}>
              <TouchableOpacity 
                style={[
                  styles.summaryCard, 
                  { backgroundColor: 'rgba(192, 53, 26, 0.2)' },
                  selectedStatus === 'submitted' && styles.summaryCardSelected
                ]}
                onPress={() => handleFilterByStatus('submitted')}
              >
                <Text style={[styles.summaryLabel, { color: '#C0351A', fontSize: 12 }]}>Transmises</Text>
                <View style={styles.summaryNumberContainer}>
                  <Text style={[styles.summaryNumber, { color: '#C0351A' }]}>{requestsSummary.submitted}</Text>
                </View>
                {requests.filter(r => r.status === 'submitted' && r.isNew).length > 0 && (
                  <View style={styles.summaryNotificationBadge}>
                    <Text style={styles.summaryNotificationText}>
                      {requests.filter(r => r.status === 'submitted' && r.isNew).length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.summaryCard, 
                  { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
                  selectedStatus === 'in_progress' && styles.summaryCardSelected
                ]}
                onPress={() => handleFilterByStatus('in_progress')}
              >
                <Text style={[styles.summaryLabel, { color: '#3B82F6', fontSize: 12 }]}>En cours</Text>
                <View style={styles.summaryNumberContainer}>
                  <Text style={[styles.summaryNumber, { color: '#3B82F6' }]}>{requestsSummary.inProgress}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.summaryCard, 
                  { backgroundColor: 'rgba(139, 92, 246, 0.2)' },
                  selectedStatus === 'quote_sent' && styles.summaryCardSelected
                ]}
                onPress={() => handleFilterByStatus('quote_sent')}
              >
                <Text style={[styles.summaryLabel, { color: '#8B5CF6', fontSize: 12 }]}>Devis reçus</Text>
                <View style={styles.summaryNumberContainer}>
                  <Text style={[styles.summaryNumber, { color: '#8B5CF6' }]}>{requestsSummary.quoteSent}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.summaryCard, 
                  { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                  selectedStatus === 'quote_accepted' && styles.summaryCardSelected
                ]}
                onPress={() => handleFilterByStatus('quote_accepted')}
              >
                <Text style={[styles.summaryLabel, { color: '#10B981', fontSize: 12 }]}>Devis acceptés</Text>
                <View style={styles.summaryNumberContainer}>
                  <Text style={[styles.summaryNumber, { color: '#10B981' }]}>{requestsSummary.quoteAccepted}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.summaryCard, 
                  { backgroundColor: 'rgba(14, 165, 233, 0.2)' },
                  selectedStatus === 'scheduled' && styles.summaryCardSelected
                ]}
                onPress={() => handleFilterByStatus('scheduled')}
              >
                <Text style={[styles.summaryLabel, { color: '#0EA5E9', fontSize: 12 }]}>Planifiées</Text>
                <View style={styles.summaryNumberContainer}>
                  <Text style={[styles.summaryNumber, { color: '#0EA5E9' }]}>{requestsSummary.scheduled}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.summaryCard, 
                  { backgroundColor: 'rgba(43, 202, 0, 0.2)' },
                  selectedStatus === 'completed' && styles.summaryCardSelected
                ]}
                onPress={() => handleFilterByStatus('completed')}
              >
                <Text style={[styles.summaryLabel, { color: '#2BCA00', fontSize: 12 }]}>Terminées</Text>
                <View style={styles.summaryNumberContainer}>
                  <Text style={[styles.summaryNumber, { color: '#2BCA00' }]}>{requestsSummary.completed}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.summaryCard, 
                  { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
                  selectedStatus === 'to_pay' && styles.summaryCardSelected
                ]}
                onPress={() => handleFilterByStatus('to_pay')}
              >
                <Text style={[styles.summaryLabel, { color: '#EF4444', fontSize: 12 }]}>À régler</Text>
                <View style={styles.summaryNumberContainer}>
                  <Text style={[styles.summaryNumber, { color: '#EF4444' }]}>{requestsSummary.toPay}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.summaryCard, 
                  { backgroundColor: 'rgba(249, 115, 22, 0.2)' },
                  selectedStatus === 'paid' && styles.summaryCardSelected
                ]}
                onPress={() => handleFilterByStatus('paid')}
              >
                <Text style={[styles.summaryLabel, { color: '#F97316', fontSize: 12 }]}>Réglées</Text>
                <View style={styles.summaryNumberContainer}>
                  <Text style={[styles.summaryNumber, { color: '#F97316' }]}>{requestsSummary.paid}</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.summaryCard, 
                  { backgroundColor: 'rgba(0, 0, 0, 0.2)' },
                  selectedStatus === 'cancelled' && styles.summaryCardSelected
                ]}
                onPress={() => handleFilterByStatus('cancelled')}
              >
                <Text style={[styles.summaryLabel, { color: 'black', fontSize: 12 }]}>Annulées</Text>
                <View style={styles.summaryNumberContainer}>
                  <Text style={[styles.summaryNumber, { color: 'black' }]}>{requestsSummary.cancelled}</Text>
                </View>
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
                  <Text style={styles.urgentCardText}>Demandes urgentes ({requestsSummary.urgent})</Text>
                </View>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Liste des demandes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedStatus 
            ? `Demandes ${statusConfig[selectedStatus].label.toLowerCase()}`
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
            style={[styles.sortButton, sortKey === 'type' && styles.sortButtonActive]}
            onPress={() => toggleSort('type')}
          >
            <ArrowUpDown size={16} color={sortKey === 'type' ? '#0066CC' : '#666'} />
            <Text style={[styles.sortButtonText, sortKey === 'type' && styles.sortButtonTextActive]}>
              Type {sortKey === 'type' && (sortAsc ? '↑' : '↓')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.requestsList}>
          {filteredAndSortedRequests.length > 0 ? (
            filteredAndSortedRequests.map((request) => {
              const status = statusConfig[request.status];
              const StatusIcon = status.icon;

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
                        <Text style={styles.requestTitle}>{request.description}</Text>
                        {request.urgency === 'urgent' && (
                          <View style={styles.urgentBadge}>
                            <AlertTriangle size={14} color="#DC2626" />
                            <Text style={styles.urgentText}>Urgent</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.requestType}>{request.type}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
                      <StatusIcon size={16} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {status.label}
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
                    
                    <View style={styles.boatManagerInfo}>
                      <User size={16} color="#0066CC" />
                      <Text style={styles.boatManagerName}>
                        {request.boat_manager?.first_name} {request.boat_manager?.last_name} • {request.boat.place_de_port}
                      </Text>
                    </View>
                    
                    {request.companie && (
                      <View style={styles.companyInfo}>
                        <Building size={16} color="#8B5CF6" />
                        <Text style={styles.companyName}>{request.companie.company_name}</Text>
                      </View>
                    )}
                    
                    {request.scheduledDate && (
                      <View style={styles.scheduledInfo}>
                        <Calendar size={16} color="#3B82F6" />
                        <Text style={styles.scheduledText}>
                          Planifiée le {request.scheduledDate}
                        </Text>
                      </View>
                    )}
                    
                    {request.status === 'to_pay' && request.invoiceReference && (
                      <View style={styles.invoiceInfo}>
                        <FileText size={16} color="#8B5CF6" />
                        <Text style={styles.invoiceText}>
                          Facture {request.invoiceReference} • {request.invoiceAmount ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(request.invoiceAmount) : ''}
                        </Text>
                      </View>
                    )}
                    
                    {request.status === 'paid' && request.invoiceReference && (
                      <View style={styles.paidInfo}>
                        <Euro size={16} color="#10B981" />
                        <Text style={styles.paidText}>
                          Facture {request.invoiceReference} réglée
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.requestFooter}>
                    <Text style={styles.viewDetails}>Voir les détails</Text>
                    <ChevronRight size={20} color="#0066CC" />
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Vous n'avez pas encore de demandes. Utilisez les services disponibles pour créer votre première demande.
              </Text>
            </View>
          )}
        </View>
      </View>
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
  summaryToggleButton: {
    marginBottom: 16,
  },
  summaryToggleContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalCardContainer: {
    marginBottom: 12,
  },
  summaryToggleIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  urgentCardContainer: {
    width: '100%',
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
    height: 100, // Hauteur fixe pour tous les carrés
    justifyContent: 'space-between', // Répartit l'espace verticalement
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
  summaryCardSelected: {
    borderColor: '#0066CC',
  },
  summaryNumberContainer: {
    flex: 1,
    justifyContent: 'flex-end', // Aligne le chiffre en bas
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8, // Espace entre le label et le chiffre
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    gap: 8,
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
  scheduledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  scheduledText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  invoiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  invoiceText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
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
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  requestFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
  },
  viewDetails: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
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
  }
});

