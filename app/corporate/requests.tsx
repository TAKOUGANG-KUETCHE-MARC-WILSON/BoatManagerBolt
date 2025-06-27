import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { FileText, ArrowUpDown, Calendar, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CircleDot, Circle as XCircle, ChevronRight, TriangleAlert as AlertTriangle, User, Bot as Boat, Building, Search, Filter, MessageSquare, Upload, Euro } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

// Types pour les filtres de période
type RequestStatus = 'new' | 'in_progress' | 'ready_to_bill' | 'to_pay' | 'paid';
type UrgencyLevel = 'normal' | 'urgent';
type SortKey = 'date' | 'type' | 'client' | 'boatManager' | 'company';
type RequestSource = 'pleasure_boater' | 'boat_manager' | 'nautical_company';

// Interface pour les demandes
interface Request {
  id: string;
  title: string;
  type: string;
  status: RequestStatus;
  originalStatus: string; // Statut original avant simplification
  urgency: UrgencyLevel;
  date: string;
  description: string;
  category: string;
  source: RequestSource;
  client: {
    id: string;
    name: string;
    avatar: string;
    email: string;
    phone: string;
    boat: {
      name: string;
      type: string;
    };
  };
  boatManager: {
    id: string;
    name: string;
    port: string;
  };
  company?: {
    id: string;
    name: string;
  };
  currentHandler?: 'boat_manager' | 'company';
  invoiceReference?: string;
  invoiceAmount?: number;
  invoiceDate?: string;
  isNew?: boolean;
  hasStatusUpdate?: boolean;
}

// Exemples de demandes avec les différents statuts pour le Corporate
const mockRequests: Request[] = [
  {
    id: '1',
    title: 'Entretien moteur',
    type: 'Maintenance',
    status: 'in_progress',
    originalStatus: 'in_progress',
    urgency: 'normal',
    date: '25-02-2024',
    description: 'Révision complète du moteur et changement des filtres',
    category: 'Services',
    source: 'pleasure_boater',
    client: {
      id: '1',
      name: 'Jean Dupont',
      avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
      email: 'jean.dupont@example.com',
      phone: '+33 6 12 34 56 78',
      boat: {
        name: 'Le Grand Bleu',
        type: 'Voilier'
      }
    },
    boatManager: {
      id: 'bm1',
      name: 'Marie Martin',
      port: 'Port de Marseille'
    },
    company: {
      id: 'nc1',
      name: 'Nautisme Pro'
    }
  },
  {
    id: '2',
    title: 'Installation GPS',
    type: 'Amélioration',
    status: 'in_progress',
    originalStatus: 'forwarded',
    urgency: 'normal',
    date: '23-02-2024',
    description: 'Installation d\'un nouveau système GPS pour navigation côtière',
    category: 'Services',
    source: 'boat_manager',
    client: {
      id: '2',
      name: 'Sophie Martin',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
      email: 'sophie.martin@example.com',
      phone: '+33 6 23 45 67 89',
      boat: {
        name: 'Le Petit Prince',
        type: 'Yacht'
      }
    },
    boatManager: {
      id: 'bm2',
      name: 'Pierre Dubois',
      port: 'Port de Nice'
    },
    company: {
      id: 'nc1',
      name: 'Nautisme Pro'
    },
    currentHandler: 'company'
  },
  {
    id: '3',
    title: 'Nettoyage coque',
    type: 'Maintenance',
    status: 'in_progress',
    originalStatus: 'quote_accepted',
    urgency: 'normal',
    date: '21-02-2024',
    description: 'Nettoyage complet de la coque et traitement antifouling',
    category: 'Services',
    source: 'nautical_company',
    client: {
      id: '2',
      name: 'Sophie Martin',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
      email: 'sophie.martin@example.com',
      phone: '+33 6 23 45 67 89',
      boat: {
        name: 'Le Petit Prince',
        type: 'Yacht'
      }
    },
    boatManager: {
      id: 'bm2',
      name: 'Pierre Dubois',
      port: 'Port de Nice'
    },
    company: {
      id: 'nc1',
      name: 'Nautisme Pro'
    }
  },
  {
    id: '4',
    title: 'Renouvellement assurance',
    type: 'Administratif',
    status: 'ready_to_bill',
    originalStatus: 'ready_to_bill',
    urgency: 'normal',
    date: '18-02-2024',
    description: 'Assistance pour le renouvellement de l\'assurance du bateau',
    category: 'Administratif',
    source: 'boat_manager',
    client: {
      id: '2',
      name: 'Sophie Martin',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
      email: 'sophie.martin@example.com',
      phone: '+33 6 23 45 67 89',
      boat: {
        name: 'Le Petit Prince',
        type: 'Yacht'
      }
    },
    boatManager: {
      id: 'bm4',
      name: 'Lucas Bernard',
      port: 'Port de Saint-Tropez'
    }
  },
  {
    id: '5',
    title: 'Remplacement hélice',
    type: 'Réparation',
    status: 'to_pay',
    originalStatus: 'to_pay',
    urgency: 'normal',
    date: '17-02-2024',
    description: 'Remplacement de l\'hélice endommagée',
    category: 'Services',
    source: 'nautical_company',
    client: {
      id: '2',
      name: 'Sophie Martin',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
      email: 'sophie.martin@example.com',
      phone: '+33 6 23 45 67 89',
      boat: {
        name: 'Le Petit Prince',
        type: 'Yacht'
      }
    },
    boatManager: {
      id: 'bm2',
      name: 'Pierre Dubois',
      port: 'Port de Nice'
    },
    company: {
      id: 'nc1',
      name: 'Nautisme Pro'
    },
    invoiceReference: 'FAC-2024-001',
    invoiceAmount: 850,
    invoiceDate: '20-02-2024'
  },
  {
    id: '6',
    title: 'Contrôle annuel',
    type: 'Contrôle',
    status: 'paid',
    originalStatus: 'paid',
    urgency: 'normal',
    date: '16-02-2024',
    description: 'Contrôle technique annuel obligatoire',
    category: 'Services',
    source: 'boat_manager',
    client: {
      id: '2',
      name: 'Sophie Martin',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
      email: 'sophie.martin@example.com',
      phone: '+33 6 23 45 67 89',
      boat: {
        name: 'Le Petit Prince',
        type: 'Yacht'
      }
    },
    boatManager: {
      id: 'bm2',
      name: 'Pierre Dubois',
      port: 'Port de Nice'
    },
    invoiceReference: 'FAC-2024-002',
    invoiceAmount: 450,
    invoiceDate: '18-02-2024'
  }
];

// Configuration des statuts simplifiés pour le Corporate
const statusConfig = {
  new: {
    icon: Clock,
    color: '#F97316',
    label: 'Nouvelle',
    description: 'Demande soumise par le client',
  },
  in_progress: {
    icon: CircleDot,
    color: '#3B82F6',
    label: 'En cours',
    description: 'En cours de traitement',
  },
  ready_to_bill: {
    icon: Upload,
    color: '#6366F1',
    label: 'Bon à facturer',
    description: 'Prêt pour facturation',
  },
  to_pay: {
    icon: FileText,
    color: '#EAB308',
    label: 'À régler',
    description: 'Facture envoyée au client',
  },
  paid: {
    icon: Euro,
    color: '#a6acaf',
    label: 'Réglée',
    description: 'Facture payée',
  }
};

// Configuration des sources de demandes
const sourceConfig = {
  pleasure_boater: {
    label: 'Plaisancier',
    color: '#0EA5E9',
  },
  boat_manager: {
    label: 'Boat Manager',
    color: '#10B981',
  },
  nautical_company: {
    label: 'Entreprise du nautisme',
    color: '#8B5CF6',
  }
};

export default function RequestsScreen() {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | null>(null);
  const [selectedSource, setSelectedSource] = useState<RequestSource | null>(null);
  const [selectedUrgency, setSelectedUrgency] = useState<UrgencyLevel | null>(null);
  const [requests, setRequests] = useState<Request[]>(mockRequests);

  // Marquer les demandes comme vues lorsque l'écran est ouvert
  useEffect(() => {
    const updatedRequests = requests.map(request => ({
      ...request,
      isNew: false,
      hasStatusUpdate: false
    }));
    setRequests(updatedRequests);
  }, []);

  const requestsSummary = useMemo(() => {
    return {
      total: requests.length,
      new: requests.filter(r => r.status === 'new').length,
      inProgress: requests.filter(r => r.status === 'in_progress').length,
      readyToBill: requests.filter(r => r.status === 'ready_to_bill').length,
      toPay: requests.filter(r => r.status === 'to_pay').length,
      paid: requests.filter(r => r.status === 'paid').length,
      urgent: requests.filter(r => r.urgency === 'urgent').length,
      pleasureBoater: requests.filter(r => r.source === 'pleasure_boater').length,
      boatManager: requests.filter(r => r.source === 'boat_manager').length,
      nauticalCompany: requests.filter(r => r.source === 'nautical_company').length,
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
        request.client.boat.name.toLowerCase().includes(query)
      );
    }

    // Appliquer le filtre de statut
    if (selectedStatus) {
      filteredRequests = filteredRequests.filter(r => r.status === selectedStatus);
    }

    // Appliquer le filtre de source
    if (selectedSource) {
      filteredRequests = filteredRequests.filter(r => r.source === selectedSource);
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
        return sortAsc
          ? a[sortKey].localeCompare(b[sortKey])
          : b[sortKey].localeCompare(a[sortKey]);
      }
    });
  }, [sortKey, sortAsc, searchQuery, selectedStatus, selectedSource, selectedUrgency, requests]);

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
    // Si la date est déjà au format JJ-MM-AAAA, la retourner telle quelle
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      return dateString;
    }
    
    // Sinon, convertir depuis le format ISO
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleFilterByStatus = (status: RequestStatus | null) => {
    setSelectedStatus(status === selectedStatus ? null : status);
    setSelectedSource(null);
    setSelectedUrgency(null);
  };

  const handleFilterBySource = (source: RequestSource | null) => {
    setSelectedSource(source === selectedSource ? null : source);
    setSelectedStatus(null);
    setSelectedUrgency(null);
  };

  const handleFilterByUrgency = (urgency: UrgencyLevel | null) => {
    setSelectedUrgency(urgency === selectedUrgency ? null : urgency);
    setSelectedStatus(null);
    setSelectedSource(null);
  };

  const handleMessage = (clientId: string) => {
    router.push(`/(corporate)/messages?client=${clientId}`);
  };

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
              selectedStatus === null && selectedUrgency === null && selectedSource === null && styles.summaryCardSelected
            ]}
            onPress={() => {
              setSelectedStatus(null);
              setSelectedUrgency(null);
              setSelectedSource(null);
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
        
        {/* Statuts */}
        <View style={styles.summaryGrid}>
          <TouchableOpacity 
            style={[
              styles.summaryCard, 
              { backgroundColor: 'rgba(249, 115, 22, 0.2)' },
              selectedStatus === 'new' && styles.summaryCardSelected
            ]}
            onPress={() => handleFilterByStatus('new')}
          >
            <Text style={[styles.summaryNumber, { color: '#F97316' }]}>{requestsSummary.new}</Text>
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
        </View>
        
        {/* Source des demandes */}
        <View style={styles.summaryGrid}>
          <TouchableOpacity 
            style={[
              styles.summaryCard, 
              { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
              selectedSource === 'boat_manager' && styles.summaryCardSelected
            ]}
            onPress={() => handleFilterBySource('boat_manager')}
          >
            <Text style={[styles.summaryNumber, { color: '#10B981' }]}>{requestsSummary.boatManager}</Text>
            <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Boat Managers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.summaryCard, 
              { backgroundColor: 'rgba(139, 92, 246, 0.2)' },
              selectedSource === 'nautical_company' && styles.summaryCardSelected
            ]}
            onPress={() => handleFilterBySource('nautical_company')}
          >
            <Text style={[styles.summaryNumber, { color: '#8B5CF6' }]}>{requestsSummary.nauticalCompany}</Text>
            <Text style={[styles.summaryLabel, { color: '#8B5CF6' }]}>Entreprises</Text>
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
          <Text style={styles.filterTitle}>Filtres</Text>
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
            ? `Demandes ${statusConfig[selectedStatus].label.toLowerCase()}`
            : selectedUrgency === 'urgent'
            ? 'Demandes urgentes'
            : selectedSource
            ? `Demandes des ${sourceConfig[selectedSource].label.toLowerCase()}s`
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
              const source = sourceConfig[request.source];

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
                    <View style={styles.statusContainer}>
                      <View style={[styles.sourceBadge, { backgroundColor: `${source.color}15` }]}>
                        <Text style={[styles.sourceText, { color: source.color }]}>
                          {source.label}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
                        <StatusIcon size={16} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
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
                      <Text style={styles.dateText}>{request.date}</Text>
                    </View>
                    <View style={styles.clientInfo}>
                      <User size={16} color="#666" />
                      <Text style={styles.clientName}>{request.client.name}</Text>
                      <View style={styles.boatInfo}>
                        <Boat size={16} color="#666" />
                        <Text style={styles.boatType}>
                          {request.client.boat.name} • {request.client.boat.type}
                        </Text>
                      </View>
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
                    
                    {request.status === 'to_pay' && request.invoiceReference && (
                      <View style={styles.invoiceInfo}>
                        <FileText size={16} color="#3B82F6" />
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
                Aucune demande {selectedStatus ? statusConfig[selectedStatus].label.toLowerCase() : ''} trouvée
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
  }
});