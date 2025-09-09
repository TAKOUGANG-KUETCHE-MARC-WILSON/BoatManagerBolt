import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Alert, Modal } from 'react-native'; // Ajoutez 'Modal' ici
// MODIFICATION ICI : Ajoutez 'X' à la liste des imports
import { FileText, ArrowUpDown, Calendar, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CircleDot, Circle as XCircle, ChevronRight, TriangleAlert as AlertTriangle, User, Bot as Boat, Building, Search, Filter, MessageSquare, Upload, Euro, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { useCallback } from 'react'; // Import useCallback
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect

// Types de statuts pour les différents rôles
type BoatManagerRequestStatus = 'submitted' | 'in_progress' | 'forwarded' | 'quote_sent' | 'quote_accepted' | 'scheduled' | 'completed' | 'ready_to_bill' | 'to_pay' | 'paid' | 'cancelled';
type UrgencyLevel = 'normal' | 'urgent';
type SortKey = 'date' | 'type' | 'client' | 'company';

// Updated Request interface to match Supabase data structure
interface Request {
  id: string;
  title: string; // Maps to service_request.description (or a new title column if added)
  type: string; // Maps to categorie_service.description1
  status: BoatManagerRequestStatus; // Maps to service_request.statut
  urgency: UrgencyLevel; // Maps to service_request.urgence
  date: string; // Maps to service_request.date
  description: string; // Maps to service_request.description
  category: string; // Not directly in service_request, derived or removed
  client: {
    id: string;
    name: string; // Derived from first_name, last_name
    avatar: string;
    email: string;
    phone: string;
    boat: {
      name: string;
      type: string;
    } | null; // Permet à 'boat' d'être null
  forwardAccepted?: boolean; 
  };
  boatManager?: { // Optional, as not all requests have a BM directly involved in creation
    id: string;
    name: string; // Derived from first_name, last_name
    port: string; // Derived from users.port
  };
  company?: { // Optional
    id: string;
    name: string; // Derived from company_name
  };
  currentHandler?: 'boat_manager' | 'company'; // Derived or managed client-side
  quoteIds?: string[]; // Not directly from DB, might be derived or removed
  location?: string; // Not directly from DB, might be derived or removed
  notes?: string; // Maps to service_request.note_add
  scheduledDate?: string; // Derived from rendez_vous table or note_add
  invoiceReference?: string; // Derived from note_add
  invoiceAmount?: number; // Maps to service_request.prix
  invoiceDate?: string; // Derived from note_add
  isNew?: boolean; // Client-side UI flag
  hasStatusUpdate?: boolean; // Client-side UI flag
}

// Configuration des statuts pour le Boat Manager
const statusConfig = {
  submitted: {
    icon: Clock,
    color: '#F97316', // Orange vif
    label: 'Nouvelle',
    description: 'En attente de prise en charge',
    nextAction: 'Prendre en charge'
  },
  in_progress: {
    icon: CircleDot,
    color: '#3B82F6', // Bleu vif
    label: 'En cours',
    description: 'Intervention en cours',
    nextAction: 'Transmettre à une entreprise'
  },
  forwarded: {
    icon: Upload,
    color: '#A855F7', // Violet
    label: 'Transmise',
    description: 'Transmise à une entreprise',
    nextAction: null
  },
  quote_sent: {
    icon: FileText,
    color: '#22C55E', // Vert clair
    label: 'Devis envoyé',
    description: 'En attente de réponse du client',
    nextAction: null
  },
  quote_accepted: {
    icon: CheckCircle2,
    color: '#15803D', // Vert foncé
    label: 'Devis accepté',
    description: 'Le client a accepté le devis',
    nextAction: 'Planifier l\'intervention'
  },
  scheduled: {
    icon: Calendar,
    color: '#2563EB', // Bleu plus foncé
    label: 'Planifiée',
    description: 'Intervention planifiée',
    nextAction: 'Marquer comme terminée'
  },
  completed: {
    icon: CheckCircle2,
    color: '#0EA5E9', // Bleu ciel
    label: 'Terminée',
    description: 'Intervention terminée',
    nextAction: 'Marquer comme à facturer'
  },
  ready_to_bill: {
    icon: Upload,
    color: '#6366F1', // Indigo
    label: 'Bon à facturer',
    description: 'Prêt pour facturation',
    nextAction: null
  },
  to_pay: {
    icon: FileText,
    color: '#EAB308', // Jaune doré
    label: 'À régler',
    description: 'Facture envoyée au client',
    nextAction: null
  },
  paid: {
    icon: Euro,
    color: '#a6acaf', // Gris
    label: 'Réglée',
    description: 'Facture payée',
    nextAction: null
  },
  cancelled: {
    icon: XCircle,
    color: '#DC2626', // Rouge vif
    label: 'Annulée',
    description: 'Demande annulée',
    nextAction: null
  }
};

const devAlert = (title: string, message: string) => {
  if (__DEV__) Alert.alert(title, message);
};
export default function RequestsScreen() {
  const { user } = useAuth(); // Get the current user from AuthContext
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<BoatManagerRequestStatus | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel | null>(null);
  const [requests, setRequests] = useState<Request[]>([]); // Initialize as empty
  const [loading, setLoading] = useState(true); // Add loading state

  // New state for status change modal
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [requestToUpdate, setRequestToUpdate] = useState<Request | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    if (!user?.id) {
      devAlert('Erreur', 'Utilisateur non authentifié.');
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
          `)
        .eq('id_boat_manager', user.id); // Filter by the connected Boat Manager's ID

      if (error) {
        console.error('Error fetching requests:', error);
       devAlert('Erreur', 'Impossible de charger les demandes.');
        return;
      }

      const formattedRequests: Request[] = await Promise.all(data.map(async (req: any) => {
        // Fetch boat manager details if id_boat_manager is present
        let boatManagerDetails: Request['boatManager'] | undefined;
        if (req.id_boat_manager) {
          const { data: bmData, error: bmError } = await supabase
            .from('users')
            .select('id, first_name, last_name, user_ports(ports(name))') // Assuming 'port' is a column in users table for BM
            .eq('id', req.id_boat_manager)
            .single();
          if (!bmError && bmData) {
            boatManagerDetails = {
              id: bmData.id.toString(),
              name: `${bmData.first_name} ${bmData.last_name}`,
              port: bmData.user_ports && bmData.user_ports.length > 0 ? bmData.user_ports[0].ports.name : 'N/A' // Default if port is null
            };
          }
        }

        // Fetch company details if id_companie is present
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

        // Parse invoice details from note_add if present
        let invoiceReference: string | undefined;
        let invoiceDate: string | undefined;
        // Correction: Ensure req.note_add is not null before calling .match()
        // Also, fix operator precedence with parentheses
        if (req.note_add && (req.statut === 'to_pay' || req.statut === 'paid')) {
          const invoiceMatch = req.note_add.match(/Facture (\S+) • (\d{4}-\d{2}-\d{2})/);
          if (invoiceMatch) {
            invoiceReference = invoiceMatch[1];
            invoiceDate = invoiceMatch[2];
          }
        }
        
        // Determine scheduledDate from note_add or rendez_vous if available
        let scheduledDate: string | undefined;
        // For now, we'll assume it's part of note_add if status is 'scheduled'
        if (req.statut === 'scheduled' && req.note_add) {
          const scheduledMatch = req.note_add.match(/Planifiée le (\d{4}-\d{2}-\d{2})/);
          if (scheduledMatch) {
            scheduledDate = scheduledMatch[1];
          }
        }
const rawStatus = String(req.statut ?? '').trim().toLowerCase();

// accepted -> forwarded + flag
const isForwardAccepted = rawStatus === 'accepted';
const normalizedStatus = (isForwardAccepted ? 'forwarded' : rawStatus) as BoatManagerRequestStatus;

// (optionnel mais sûr) si jamais un statut inconnu arrive, retomber sur 'submitted'
const safeStatus: BoatManagerRequestStatus =
  (normalizedStatus in (statusConfig as any)) ? normalizedStatus : 'submitted';

return {
  id: req.id.toString(),
  title: req.description,
  type: req.categorie_service?.description1 || 'N/A',
  status: safeStatus,                          // 👈 toujours une clé connue
  forwardAccepted: isForwardAccepted,          // 👈 flag “acceptée”
  urgency: (req.urgence as UrgencyLevel) ?? 'normal',
  date: req.date,
  description: req.description,
          category: 'Services', // Default category, adjust if needed
          client: {
            id: req.users.id.toString(),
            name: `${req.users.first_name} ${req.users.last_name}`,
            avatar: req.users.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop', // Default avatar
            email: req.users.e_mail,
            phone: req.users.phone,
            boat: req.boat ? { // <--- MODIFICATION ICI
              name: req.boat.name,
              type: req.boat.type
            } : null // <--- MODIFICATION ICI
          },
          boatManager: boatManagerDetails,
          company: companyDetails,
          notes: req.note_add,
          scheduledDate: scheduledDate,
          invoiceReference: invoiceReference,
          invoiceAmount: req.prix,
          invoiceDate: invoiceDate,
          isNew: false, // Managed client-side
          hasStatusUpdate: false // Managed client-side
        };
      }));

      setRequests(formattedRequests);
    } catch (e) {
      console.error('Unexpected error:', e);
     devAlert('Erreur', 'Une erreur inattendue est survenue lors du chargement des demandes.');
    } finally {
      setLoading(false);
    }
  }, [user]); // Add user to dependency array to re-fetch when user changes

  // Use useFocusEffect to re-fetch requests when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchRequests();
      // No cleanup needed for this effect, as it's just fetching data
    }, [fetchRequests]) // Dependency on the memoized fetch function
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
      newRequests: requests.filter(r => r.isNew).length,
      statusUpdates: requests.filter(r => r.hasStatusUpdate).length
    };
  }, [requests]);

  const filteredAndSortedRequests = useMemo(() => {
    let filteredRequests = [...requests];
    
    // Appliquer le filtre de recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredRequests = filteredRequests.filter(request => 
        request.client.name.toLowerCase().includes(query) ||
        request.company?.name?.toLowerCase().includes(query) ||
        request.title.toLowerCase().includes(query) ||
        request.type.toLowerCase().includes(query) ||
        // MODIFICATION ICI : Vérification de nullité pour request.client.boat
        (request.client.boat && request.client.boat.name.toLowerCase().includes(query))
      );
    }

    // Appliquer le filtre de statut
    if (selectedStatus) {
      filteredRequests = filteredRequests.filter(r => r.status === selectedStatus);
    }

    // Appliquer le filtre d'urgence
    if (selectedUrgency) {
      filteredRequests = filteredRequests.filter(r => r.urgency === selectedUrgency);
    }

    // Appliquer le tri
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
        // Fallback for 'type' or other string fields
        const aValue = a[sortKey as keyof Request] as string;
        const bValue = b[sortKey as keyof Request] as string;
        return sortAsc
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
    });
  }, [sortKey, sortAsc, searchQuery, selectedStatus, selectedUrgency, requests]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    };
  };

  const handleRequestDetails = (requestId: string) => {
    // Marquer la demande comme vue et supprimer le drapeau de mise à jour de statut
    setRequests(prev =>
      prev.map(request => 
        request.id === requestId 
          ? { ...request, isNew: false, hasStatusUpdate: false } 
          : request
      )
    );
    
    // Naviguer vers les détails de la demande
    router.push(`/request/${requestId}`);
  };

  const formatDate = (dateString: string) => {
    // If the date is already in YYYY-MM-DD format, just return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    // Otherwise, try to parse and format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date'; // Handle invalid date strings
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleFilterByStatus = (status: BoatManagerRequestStatus | null) => {
    setSelectedStatus(status === selectedStatus ? null : status);
    setSelectedUrgency(null);
  };

  const handleFilterByUrgency = (urgency: UrgencyLevel | null) => {
    setSelectedUrgency(urgency === selectedUrgency ? null : urgency);
    setSelectedStatus(null);
  };

  const handleMessage = (clientId: string) => {
    router.push(`/(boat-manager)/messages?client=${clientId}`);
  };

  const getCurrentHandlerText = (request: Request) => {
    if (request.status === 'scheduled' && request.scheduledDate) {
      return `Planifiée le ${formatDate(request.scheduledDate)}`;
    }
    
    if (request.status === 'to_pay' && request.invoiceReference) {
      return 'Facture en attente de paiement';
    }
    
    return null;
  };

  // Function to handle status update
  const handleUpdateStatus = async (newStatus: BoatManagerRequestStatus) => {
    if (requestToUpdate) {
      try {
        const { error } = await supabase
          .from('service_request')
          .update({ statut: newStatus })
          .eq('id', parseInt(requestToUpdate.id));

        if (error) {
          console.error('Error updating status:', error);
         devAlert('Erreur', `Impossible de mettre à jour le statut: ${error.message}`);
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
         devAlert('Succès', 'Statut mis à jour avec succès.');
        }
      } catch (e) {
        console.error('Unexpected error during status update:', e);
       devAlert('Erreur', 'Une erreur inattendue est survenue lors de la mise à jour du statut.');
      }
    }
  };

  // Status Change Modal Component
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
            {Object.entries(statusConfig).map(([statusKey, config]) => {
              const StatusIcon = config.icon;
              return (
                <TouchableOpacity
                  key={statusKey}
                  style={styles.statusOption}
                  onPress={() => handleUpdateStatus(statusKey as BoatManagerRequestStatus)}
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
            {(requestsSummary.newRequests > 0 || requestsSummary.statusUpdates > 0) && (
              <View style={styles.summaryNotificationBadge}>
                <Text style={styles.summaryNotificationText}>
                  {requestsSummary.newRequests + requestsSummary.statusUpdates}
                </Text>
              </View>
            )}
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
            <Text style={[styles.summaryLabel, { color: '#F97316' }]}>Nouvelles</Text>
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
            <Text style={[styles.summaryLabel, { color: '#22C55E' }]}>Devis envoyés</Text>
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
            <Text style={[styles.summaryLabel, { color: '#15803D' }]}>Devis acceptés</Text>
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
            <Text style={[styles.summaryNumber, { color: '#6366F1' }]}>{requestsSummary.readyToBill}</Text>
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
            
            {Object.entries(statusConfig).map(([status,config]) => {
              const StatusIcon = config.icon;
              return (
                <TouchableOpacity 
                  key={status}
                  style={[
                    styles.statusFilter,
                    { backgroundColor: `${config.color}15` },
                    selectedStatus === status && { borderColor: config.color, borderWidth: 2 }
                  ]}
                  onPress={() => handleFilterByStatus(status as BoatManagerRequestStatus)}
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
            style={[styles.sortButton, sortKey === 'client' && styles.sortButtonActive]}
            onPress={() => toggleSort('client')}
          >
            <User size={16} color={sortKey === 'client' ? '#0066CC' : '#666'} />
            <Text style={[styles.sortButtonText, sortKey === 'client' && styles.sortButtonTextActive]}>
              Client {sortKey === 'client' && (sortAsc ? '↑' : '↓')}
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
  style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}
  onPress={() => {
    setRequestToUpdate(request);
    setShowStatusChangeModal(true);
  }}
>
  <StatusIcon size={16} color={status.color} />
  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>

  {/* 👇 pastille "acceptée" si ça vient d'un statut 'accepted' côté DB */}
  {request.forwardAccepted && (
    <View style={styles.acceptedPill}>
      <CheckCircle2 size={12} color="#16A34A" />
      <Text style={styles.acceptedPillText}>acceptée</Text>
    </View>
  )}
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
                      <View style={styles.boatInfo}>
                        <Boat size={16} color="#666" />
                        <Text style={styles.boatType}>
                          {request.client.boat ? `${request.client.boat.name} • ${request.client.boat.type}` : 'N/A'}
                        </Text>
                      </View>
                    </View>
                    
                    {request.boatManager && (
                      <View style={styles.boatManagerInfo}>
                        <User size={16} color="#0066CC" />
                        <Text style={styles.boatManagerName}>{request.boatManager.name}</Text>
                      </View>
                    )}
                    
                    {getCurrentHandlerText(request) && (
                      <View style={styles.handlerInfo}>
                        {request.status === 'scheduled' ? (
                          <Calendar size={16} color="#3B82F6" />
                        ) : (
                          <User size={16} color="#0066CC" />
                        )}
                        <Text style={[
                          styles.handlerText, 
                          request.status === 'scheduled' ? { color: '#3B82F6' } : 
                          { color: '#0066CC' }
                        ]}>
                          {getCurrentHandlerText(request)}
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
  <Text style={styles.emptyStateText}>Aucune demande trouvée.</Text>
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
  statusContainer: {
    alignItems: 'flex-end',
    gap: 8,
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
  sourceBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  sourceText: {
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
  acceptedPill: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  marginLeft: 6,
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 12,
  backgroundColor: 'rgba(22, 163, 74, 0.12)', // vert léger
},
acceptedPillText: {
  fontSize: 10,
  fontWeight: '600',
  color: '#16A34A',
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
