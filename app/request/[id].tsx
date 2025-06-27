import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CircleDot, Circle as XCircle, ChevronRight, TriangleAlert as AlertTriangle, User, Bot as Boat, Building, MessageSquare, Upload, Euro, FileText, Plus, Download } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { X } from 'lucide-react-native';
import ReminderDateTimePicker from './ReminderDateTimePicker'; 

type RequestStatus = 'submitted' | 'in_progress' | 'forwarded' | 'quote_sent' | 'quote_accepted' | 'scheduled' | 'completed' | 'ready_to_bill' | 'to_pay' | 'paid' | 'cancelled';
type UrgencyLevel = 'normal' | 'urgent';

interface ServiceRequest {
  id: string;
  title: string;
  type: string;
  status: RequestStatus;
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
  quoteIds?: string[];
  location?: string;
  notes?: string;
  scheduledDate?: string;
  scheduledTime?: string; // Added scheduledTime
  scheduledLocation?: string; // Added scheduledLocation
  scheduledNotes?: string; // Added scheduledNotes
  invoiceReference?: string;
  invoiceAmount?: number;
  invoiceDate?: string;
  depositAmount?: number;
  paymentDueDate?: string;
  isNew?: boolean;
  hasStatusUpdate?: boolean;
}

const mockServiceRequests: Record<string, ServiceRequest> = {
  '1': {
    id: '1',
    title: 'Entretien moteur',
    type: 'Maintenance',
    status: 'in_progress',
    urgency: 'normal',
    date: '2024-02-19',
    description: 'Révision complète du moteur et changement des filtres',
    category: 'Services',
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
    },
    currentHandler: 'company'
  },
  '2': {
    id: '2',
    title: 'Réparation voile',
    type: 'Réparation',
    status: 'quote_sent',
    urgency: 'urgent',
    date: '2024-02-24',
    description: 'Déchirure importante sur la grand-voile, besoin d\'une réparation rapide',
    category: 'Services',
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
    quoteIds: ['q1']
  },
  '3': {
    id: '3',
    title: 'Installation GPS',
    type: 'Amélioration',
    status: 'quote_accepted',
    urgency: 'normal',
    date: '2024-02-23',
    description: 'Installation d\'un nouveau système GPS pour navigation côtière',
    category: 'Services',
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
    quoteIds: ['q2']
  },
  '4': {
    id: '4',
    title: 'Contrôle annuel',
    type: 'Contrôle',
    status: 'scheduled',
    urgency: 'normal',
    date: '2024-02-22',
    description: 'Contrôle technique annuel obligatoire',
    category: 'Services',
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
    scheduledDate: '2024-03-15'
  },
  '5': {
    id: '5',
    title: 'Nettoyage coque',
    type: 'Maintenance',
    status: 'completed',
    urgency: 'normal',
    date: '2024-02-21',
    description: 'Nettoyage complet de la coque et traitement antifouling',
    category: 'Services',
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
  '6': {
    id: '6',
    title: 'Vérification amarrage',
    type: 'Sécurité',
    status: 'to_pay',
    urgency: 'urgent',
    date: '2024-02-20',
    description: 'Vérification de l\'amarrage avant tempête annoncée',
    category: 'Sécurité',
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
    invoiceReference: 'FAC-2024-001',
    invoiceAmount: 150,
    invoiceDate: '2024-02-25',
    paymentDueDate: '2024-03-25'
  },
  '7': {
    id: '7',
    title: 'Renouvellement assurance',
    type: 'Administratif',
    status: 'paid',
    urgency: 'normal',
    date: '2024-02-18',
    description: 'Assistance pour le renouvellement de l\'assurance du bateau',
    category: 'Administratif',
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
    },
    invoiceReference: 'FAC-2024-002',
    invoiceAmount: 75,
    invoiceDate: '2024-02-20'
  },
  '8': {
    id: '8',
    title: 'Mise en vente',
    type: 'Vente',
    status: 'cancelled',
    urgency: 'normal',
    date: '2024-02-15',
    description: 'Publication de l\'annonce de vente du bateau',
    category: 'Vente/Achat',
    client: {
      id: '3',
      name: 'Pierre Dubois',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
      email: 'pierre.dubois@example.com',
      phone: '+33 6 34 56 78 90',
      boat: {
        name: 'Le Navigateur',
        type: 'Voilier'
      }
    },
    boatManager: {
      id: 'bm3',
      name: 'Sophie Laurent',
      port: 'Port de Saint-Tropez'
    }
  }
};

const statusConfig = {
  submitted: {
    icon: Clock,
    color: '#F97316',
    label: 'Transmise',
    description: 'Votre demande a été transmise',
    nextAction: 'Prendre en charge'
  },
  in_progress: {
    icon: CircleDot,
    color: '#3B82F6',
    label: 'En cours',
    description: 'Nos équipes travaillent sur votre demande',
    nextAction: 'Transmettre à une entreprise'
  },
  forwarded: {
    icon: Upload,
    color: '#A855F7',
    label: 'Transmise',
    description: 'Transmise à une entreprise',
    nextAction: 'Demander un devis'
  },
  quote_sent: {
    icon: FileText,
    color: '#22C55E',
    label: 'Devis reçu',
    description: 'Un devis vous a été envoyé',
    nextAction: 'Accepter le devis'
  },
  quote_accepted: {
    icon: CheckCircle2,
    color: '#15803D',
    label: 'Devis accepté',
    description: 'Vous avez accepté le devis',
    nextAction: 'Planifier l\'intervention'
  },
  scheduled: {
    icon: Calendar,
    color: '#2563EB',
    label: 'Planifiée',
    description: 'Intervention planifiée',
    nextAction: 'Marquer comme terminée'
  },
  completed: {
    icon: CheckCircle2,
    color: '#0EA5E9',
    label: 'Terminée',
    description: 'Intervention terminée',
    nextAction: 'Marquer comme à facturer'
  },
  ready_to_bill: {
    icon: Upload,
    color: '#6366F1',
    label: 'Bon à facturer',
    description: 'Prêt pour facturation',
    nextAction: 'Générer la facture'
  },
  to_pay: {
    icon: FileText,
    color: '#EAB308',
    label: 'À régler',
    description: 'Une facture vous a été envoyée',
    nextAction: 'Payer la facture'
  },
  paid: {
    icon: Euro,
    color: '#a6acaf',
    label: 'Réglée',
    description: 'Facture payée',
    nextAction: null
  },
  cancelled: {
    icon: XCircle,
    color: '#DC2626',
    label: 'Annulée',
    description: 'Demande annulée',
    nextAction: null
  }
};

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [scheduledLocation, setScheduledLocation] = useState('');
  const [scheduledNotes, setScheduledNotes] = useState('');
  const [isScheduleDatePickerVisible, setIsScheduleDatePickerVisible] = useState(false); // Specific for scheduling

  
  if (!request) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Demande non trouvée</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Cette demande n'existe pas.</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentStatusConfig = statusConfig[request.status];

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

  const handleMessage = () => {
    router.push(`/(boat-manager)/messages?client=${request.client.id}`);
  };

  const handleClientDetails = () => {
    router.push(`/client/${request.client.id}`);
  };

  const handleNextAction = () => {
    switch (request.status) {
      case 'submitted':
        handleTakeCharge();
        break;
      case 'in_progress':
        setShowForwardModal(true);
        break;
      case 'forwarded':
        setShowQuoteModal(true);
        break;
      case 'quote_accepted':
        setShowScheduleModal(true);
        break;
      case 'scheduled':
        handleMarkAsCompleted();
        break;
      case 'completed':
        handleMarkAsReadyToBill();
        break;
      case 'ready_to_bill':
        setShowInvoiceModal(true); // Show invoice modal for generation
        break;
      case 'to_pay':
        setShowPaymentModal(true);
        break;
      default:
        Alert.alert('Action non disponible', 'Aucune action suivante définie pour ce statut.');
    }
  };

  const handleTakeCharge = () => {
    Alert.alert(
      'Prendre en charge',
      'Voulez-vous prendre en charge cette demande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            setRequest(prev => prev ? { ...prev, status: 'in_progress' } : null);
            Alert.alert('Succès', 'La demande a été prise en charge.');
          }
        }
      ]
    );
  };

  const handleForward = (companyId: string, companyName: string) => {
    Alert.alert(
      'Transmettre la demande',
      `Voulez-vous transmettre cette demande à ${companyName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            setRequest(prev => prev ? { ...prev, status: 'forwarded', company: { id: companyId, name: companyName }, currentHandler: 'company' } : null);
            setShowForwardModal(false);
            Alert.alert('Succès', 'La demande a été transmise.');
          }
        }
      ]
    );
  };

  const handleGenerateQuote = () => {
    setShowQuoteModal(false);
    router.push({
      pathname: user?.role === 'boat_manager' ? '/(boat-manager)/quote-upload' : '/(nautical-company)/quote-upload',
      params: {
        requestId: request.id,
        clientId: request.client.id,
        clientName: request.client.name,
        boatId: request.client.boat.name, // Using boat name as ID for simplicity in mock
        boatName: request.client.boat.name,
        boatType: request.client.boat.type,
      }
    });
  };

  const handleAcceptQuote = () => {
    Alert.alert(
      'Accepter le devis',
      'Voulez-vous accepter ce devis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            setRequest(prev => prev ? { ...prev, status: 'quote_accepted' } : null);
            Alert.alert('Succès', 'Le devis a été accepté.');
          }
        }
      ]
    );
  };

  const handleSchedule = () => {
    if (!scheduledDate || !scheduledTime) {
      Alert.alert('Erreur', 'Veuillez renseigner la date et l\'heure.');
      return;
    }
    setRequest(prev => prev ? { ...prev, status: 'scheduled', scheduledDate: scheduledDate, scheduledTime: scheduledTime, scheduledLocation: scheduledLocation, scheduledNotes: scheduledNotes } : null);
    setShowScheduleModal(false);
    Alert.alert('Succès', 'L\'intervention a été planifiée.');
  };

  const handleMarkAsCompleted = () => {
    Alert.alert(
      'Marquer comme terminée',
      'Voulez-vous marquer cette demande comme terminée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            setRequest(prev => prev ? { ...prev, status: 'completed' } : null);
            Alert.alert('Succès', 'La demande a été marquée comme terminée.');
          }
        }
      ]
    );
  };

  const handleMarkAsReadyToBill = () => {
    Alert.alert(
      'Marquer comme bon à facturer',
      'Voulez-vous marquer cette demande comme prête à être facturée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            setRequest(prev => prev ? { ...prev, status: 'ready_to_bill' } : null);
            Alert.alert('Succès', 'La demande a été marquée comme prête à être facturée.');
          }
        }
      ]
    );
  };

  const handleGenerateInvoice = () => {
    setShowInvoiceModal(false);
    // In a real app, this would generate a real invoice
    const invoiceRef = `FAC-${Math.floor(Math.random() * 10000)}`;
    const invoiceDate = new Date().toISOString().split('T')[0];
    const paymentDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now
    const deposit = request.invoiceAmount ? Math.round(request.invoiceAmount * 0.3) : 0;

    setRequest(prev => prev ? {
      ...prev,
      status: 'to_pay',
      invoiceReference: invoiceRef,
      invoiceDate: invoiceDate,
      depositAmount: deposit,
      paymentDueDate: paymentDueDate
    } : null);
    Alert.alert('Succès', `Facture ${invoiceRef} générée et envoyée au client.`);
  };

  const handlePayInvoice = () => {
    setShowPaymentModal(false);
    // In a real app, this would integrate with a payment gateway
    Alert.alert('Succès', 'Paiement effectué.');
    setRequest(prev => prev ? { ...prev, status: 'paid' } : null);
  };

  const handleCancelRequest = () => {
    Alert.alert(
      'Annuler la demande',
      'Voulez-vous annuler cette demande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: () => {
            setRequest(prev => prev ? { ...prev, status: 'cancelled' } : null);
            Alert.alert('Succès', 'La demande a été annulée.');
          }
        }
      ]
    );
  };

  // Reminder functions
const handleSetReminder = async () => {
  if (!reminderDate || !reminderTime) {
    Alert.alert("Erreur", "Merci de définir une date et une heure.");
    return;
  }

  const fullReminder = new Date(`${reminderDate}T${reminderTime}:00`);

  const { error } = await supabase
    .from('requests')
    .update({ reminder_at: fullReminder.toISOString() })
    .eq('id', request.id); // ou autre identifiant

  if (error) {
    console.error(error);
    Alert.alert("Erreur", "La sauvegarde du rappel a échoué.");
  } else {
    Alert.alert("Succès", "Rappel défini et enregistré.");
    setShowReminderModal(false);
  }
};


 const ScheduleModal = () => (
  <Modal
    visible={showScheduleModal}
    transparent
    animationType="slide"
    onRequestClose={() => setShowScheduleModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Planifier l'intervention</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowScheduleModal(false)}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalBody}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity 
              style={styles.inputWrapper}
              onPress={() => setIsScheduleDatePickerVisible(true)}
            >
              <Calendar size={20} color="#666" />
              <Text style={styles.input}>
                {scheduledDate || 'Sélectionner une date'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Heure</Text>
            <View style={styles.inputWrapper}>
              <Clock size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={scheduledTime}
                onChangeText={setScheduledTime}
                placeholder="HH:MM"
              />
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Lieu</Text>
            <View style={styles.inputWrapper}>
              <User size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={scheduledLocation}
                onChangeText={setScheduledLocation}
                placeholder="Lieu de l'intervention"
              />
            </View>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes</Text>
            <View style={styles.textAreaWrapper}>
              <TextInput
                style={styles.textArea}
                value={scheduledNotes}
                onChangeText={setScheduledNotes}
                placeholder="Notes additionnelles"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowScheduleModal(false)}
          >
            <Text style={styles.modalCancelText}>Annuler</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalConfirmButton}
            onPress={handleSchedule}
          >
            <Text style={styles.modalConfirmText}>Planifier</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>

    <DateTimePickerModal
      isVisible={isScheduleDatePickerVisible}
      mode="date"
      onConfirm={(date) => handleDateConfirm(date, 'schedule')}
      onCancel={() => setIsScheduleDatePickerVisible(false)}
    />
  </Modal>
);


 const ForwardModal = () => (
  <Modal
    visible={showForwardModal}
    transparent
    animationType="slide"
    onRequestClose={() => setShowForwardModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Transmettre à une entreprise</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowForwardModal(false)}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalBody}>
          {[
            { id: 'nc1', name: 'Nautisme Pro' },
            { id: 'nc2', name: 'Marine Services' }
          ].map(company => (
            <TouchableOpacity
              key={company.id}
              style={styles.companyOption}
              onPress={() => handleForward(company.id, company.name)}
            >
              <Building size={20} color="#0066CC" />
              <Text style={styles.companyOptionText}>{company.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  </Modal>
);

const QuoteModal = () => (
  <Modal
    visible={showQuoteModal}
    transparent
    animationType="slide"
    onRequestClose={() => setShowQuoteModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Demander un devis</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowQuoteModal(false)}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalBody}>
          <TouchableOpacity
            style={styles.quoteOption}
            onPress={handleGenerateQuote}
          >
            <FileText size={20} color="#0066CC" />
            <Text style={styles.quoteOptionText}>Générer un devis</Text>
          </TouchableOpacity>
          
          {request.quoteIds && request.quoteIds.length > 0 && (
            <TouchableOpacity
              style={styles.quoteOption}
              onPress={() => router.push(`/quote/${request.quoteIds[0]}`)}
            >
              <Download size={20} color="#0066CC" />
              <Text style={styles.quoteOptionText}>Voir le devis existant</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  </Modal>
);

const InvoiceModal = () => (
  <Modal
    visible={showInvoiceModal}
    transparent
    animationType="slide"
    onRequestClose={() => setShowInvoiceModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Générer la facture</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowInvoiceModal(false)}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalBody}>
          <Text style={styles.invoiceModalText}>
            Confirmez-vous la génération de la facture pour cette demande ?
          </Text>
          <Text style={styles.invoiceModalText}>
            La facture sera envoyée au client par email.
          </Text>
        </View>

        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowInvoiceModal(false)}
          >
            <Text style={styles.modalCancelText}>Annuler</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.modalConfirmButton}
            onPress={handleGenerateInvoice}
          >
            <Text style={styles.modalConfirmText}>Générer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);


  const PaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payer la facture</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.invoiceModalText}>
              Vous allez être redirigé vers une page de paiement sécurisée pour régler la facture.
            </Text>
            <Text style={styles.invoiceModalText}>
              Montant à payer : {formatAmount(request.invoiceAmount || 0)}
            </Text>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalConfirmButton}
              onPress={handlePayInvoice}
            >
              <Text style={styles.modalConfirmText}>Payer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const ReminderModal = () => (
    <Modal
      visible={showReminderModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowReminderModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Définir un rappel</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowReminderModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date du rappel</Text>
              <TouchableOpacity 
                style={styles.inputWrapper}
                onPress={() => setIsReminderDatePickerVisible(true)}
              >
                <Calendar size={20} color="#666" />
                <Text style={styles.input}>{reminderDate || 'Sélectionner une date'}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Heure du rappel</Text>
              <View style={styles.inputWrapper}>
                <Clock size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  placeholder="HH:MM"
                />
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowReminderModal(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalConfirmButton}
              onPress={handleSetReminder}
            >
              <Text style={styles.modalConfirmText}>Définir le rappel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <DateTimePickerModal
        isVisible={isReminderDatePickerVisible}
        mode="date"
        onConfirm={(date) => handleDateConfirm(date, 'reminder')}
        onCancel={() => setIsReminderDatePickerVisible(false)}
      />
    </Modal>
  );

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Détails de la demande</Text>
        </View>

        <View style={styles.content}>
          {/* Request Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryTitleContainer}>
                <Text style={styles.summaryTitle}>{request.title}</Text>
                {request.urgency === 'urgent' && (
                  <View style={styles.urgentBadge}>
                    <AlertTriangle size={14} color="#DC2626" />
                    <Text style={styles.urgentText}>Urgent</Text>
                  </View>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${currentStatusConfig.color}15` }]}>
                <currentStatusConfig.icon size={16} color={currentStatusConfig.color} />
                <Text style={[styles.statusText, { color: currentStatusConfig.color }]}>
                  {currentStatusConfig.label}
                </Text>
              </View>
            </View>
            
            <Text style={styles.summaryDescription}>{request.description}</Text>
            
            <View style={styles.summaryDetails}>
              <View style={styles.detailRow}>
                <Calendar size={16} color="#666" />
                <Text style={styles.detailText}>Date de la demande: {formatDate(request.date)}</Text>
              </View>
              <View style={styles.detailRow}>
                <User size={16} color="#666" />
                <Text style={styles.detailText}>Client: {request.client.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Boat size={16} color="#666" />
                <Text style={styles.detailText}>Bateau: {request.client.boat.name} ({request.client.boat.type})</Text>
              </View>
              {request.company && (
                <View style={styles.detailRow}>
                  <Building size={16} color="#666" />
                  <Text style={styles.detailText}>Entreprise: {request.company.name}</Text>
                </View>
              )}
              {request.scheduledDate && (
                <View style={styles.detailRow}>
                  <Calendar size={16} color="#666" />
                  <Text style={styles.detailText}>Planifiée le: {formatDate(request.scheduledDate)}</Text>
                </View>
              )}
              {request.location && (
                <View style={styles.detailRow}>
                  <User size={16} color="#666" />
                  <Text style={styles.detailText}>Lieu: {request.location}</Text>
                </View>
              )}
              {request.notes && (
                <View style={styles.detailRow}>
                  <FileText size={16} color="#666" />
                  <Text style={styles.detailText}>Notes: {request.notes}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {currentStatusConfig.nextAction && (
              <TouchableOpacity 
                style={styles.nextActionButton}
                onPress={handleNextAction}
              >
                <Text style={styles.nextActionButtonText}>{currentStatusConfig.nextAction}</Text>
                <ChevronRight size={20} color="white" />
              </TouchableOpacity>
            )}
            
            <View style={styles.secondaryActions}>
              <TouchableOpacity 
                style={styles.secondaryActionButton}
                onPress={handleMessage}
              >
                <MessageSquare size={20} color="#0066CC" />
                <Text style={styles.secondaryActionButtonText}>Message</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.secondaryActionButton}
                onPress={handleClientDetails}
              >
                <User size={20} color="#0066CC" />
                <Text style={styles.secondaryActionButtonText}>Client</Text>
              </TouchableOpacity>
              
              {request.status === 'to_pay' && user?.role === 'boat_manager' && (
                <TouchableOpacity 
                  style={styles.secondaryActionButton}
                  onPress={() => router.push(`/quote/${request.quoteIds?.[0]}`)}
                >
                  <FileText size={20} color="#0066CC" />
                  <Text style={styles.secondaryActionButtonText}>Devis</Text>
                </TouchableOpacity>
              )}
              
              {request.invoiceReference && (
                <TouchableOpacity 
                  style={styles.secondaryActionButton}
                  onPress={() => router.push(`/quote/${request.invoiceReference}`)}
                >
                  <FileText size={20} color="#0066CC" />
                  <Text style={styles.secondaryActionButtonText}>Facture</Text>
                </TouchableOpacity>
              )}
              
              {user?.role === 'boat_manager' && (
                <TouchableOpacity 
                  style={styles.secondaryActionButton}
                  onPress={handleCancelRequest}
                >
                  <XCircle size={20} color="#DC2626" />
                  <Text style={[styles.secondaryActionButtonText, { color: '#DC2626' }]}>Annuler</Text>
                </TouchableOpacity>
              )}

              {/* Reminder Button - Only for Boat Manager and 'paid' status */}
              {user?.role === 'boat_manager' && request.status === 'paid' && (
                <TouchableOpacity 
                  style={styles.secondaryActionButton}
                  onPress={() => setShowReminderModal(true)}
                >
                  <Calendar size={20} color="#0066CC" />
                  <Text style={styles.secondaryActionButtonText}>Rappel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Reminder Section */}
          {user?.role === 'boat_manager' && (
            <View style={styles.reminderSection}>
              <Text style={styles.reminderTitle}>Définir un rappel</Text>
              <TouchableOpacity 
                style={styles.setReminderButton}
                onPress={() => setIsReminderDatePickerVisible(true)}
              >
                <Calendar size={20} color="#0066CC" />
                <Text style={styles.setReminderButtonText}>
                  {reminderDate ? `Rappel le ${formatDate(reminderDate)}` : 'Définir une date de rappel'}
                </Text>
              </TouchableOpacity>
             
            </View>
          )}
        </View>
      </ScrollView>
      <ScheduleModal />
      <ForwardModal />
      <QuoteModal />
      <InvoiceModal />
      <PaymentModal />
      <ReminderModal />
       <DateTimePickerModal
                isVisible={isReminderDatePickerVisible}
                mode="date"
                onConfirm={(date) => handleDateConfirm(date, 'reminder')}
                onCancel={() => setIsReminderDatePickerVisible(false)}
              />
    </>
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
  content: {
    padding: 20,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
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
  summaryDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  summaryDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  nextActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  nextActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  secondaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 12,
  },
  secondaryActionButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  reminderSection: {
    backgroundColor: 'white',
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
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  setReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 12,
  },
  setReminderButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  textAreaWrapper: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  textArea: {
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  modalConfirmText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  companyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  companyOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  quoteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quoteOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  invoiceModalText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 12,
    lineHeight: 22,
  },
});
