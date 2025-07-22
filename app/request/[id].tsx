import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CircleDot, Circle as XCircle, ChevronRight, TriangleAlert as AlertTriangle, User, Bot as Boat, Building, MessageSquare, Upload, Euro, FileText, Plus, Download } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { X } from 'lucide-react-native';
import ReminderDateTimePicker from './ReminderDateTimePicker';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [isReminderDatePickerVisible, setIsReminderDatePickerVisible] = useState(false);
  const [isReminderTimePickerVisible, setIsReminderTimePickerVisible] = useState(false); // New state for time picker


  useEffect(() => {
    const fetchRequestDetails = async () => {
      setLoading(true);
      setError(null);
      if (!id) {
        setError("ID de la demande manquant.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: reqError } = await supabase
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
          .eq('id', parseInt(id as string))
          .single();

        if (reqError) {
          console.error('Error fetching request details:', reqError);
          setError("Erreur lors du chargement des détails de la demande.");
          setLoading(false);
          return;
        }

        if (data) {
          let boatManagerDetails: ServiceRequest['boatManager'] | undefined;
          if (data.id_boat_manager) {
            const { data: bmData, error: bmError } = await supabase
              .from('users')
              .select('id, first_name, last_name, port')
              .eq('id', data.id_boat_manager)
              .single();
            if (!bmError && bmData) {
              boatManagerDetails = {
                id: bmData.id.toString(),
                name: `${bmData.first_name} ${bmData.last_name}`,
                port: bmData.port || 'N/A'
              };
            }
          }

          let companyDetails: ServiceRequest['company'] | undefined;
          if (data.id_companie) {
            const { data: companyData, error: companyError } = await supabase
              .from('users')
              .select('id, company_name')
              .eq('id', data.id_companie)
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
          if (data.note_add && (data.statut === 'to_pay' || data.statut === 'paid')) {
            const invoiceMatch = data.note_add.match(/Facture (\S+) • (\d{4}-\d{2}-\d{2})/);
            if (invoiceMatch) {
              invoiceReference = invoiceMatch[1];
              invoiceDate = invoiceMatch[2];
            }
          }

          let scheduledDateFromNotes: string | undefined;
          if (data.statut === 'scheduled' && data.note_add) {
            const scheduledMatch = data.note_add.match(/Planifiée le (\d{4}-\d{2}-\d{2})/);
            if (scheduledMatch) {
              scheduledDateFromNotes = scheduledMatch[1];
            }
          }

          setRequest({
            id: data.id.toString(),
            title: data.description,
            type: data.categorie_service?.description1 || 'N/A',
            status: data.statut as RequestStatus,
            urgency: data.urgence as UrgencyLevel,
            date: data.date,
            description: data.description,
            category: 'Services',
            client: {
              id: data.users.id.toString(),
              name: `${data.users.first_name} ${data.users.last_name}`,
              avatar: data.users.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
              email: data.users.e_mail,
              phone: data.users.phone,
              boat: {
                name: data.boat.name,
                type: data.boat.type
              }
            },
            boatManager: boatManagerDetails,
            company: companyDetails,
            notes: data.note_add,
            scheduledDate: scheduledDateFromNotes,
            invoiceReference: invoiceReference,
            invoiceAmount: data.prix,
            invoiceDate: invoiceDate,
            isNew: false,
            hasStatusUpdate: false
          });
        } else {
          setError("Demande non trouvée.");
        }
      } catch (e) {
        console.error('Unexpected error fetching request details:', e);
        setError("Une erreur inattendue est survenue lors du chargement des détails de la demande.");
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [id]);

  const currentStatusConfig = request ? statusConfig[request.status] : null;

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
    router.push(`/(boat-manager)/messages?client=${request?.client.id}`);
  };

  const handleClientDetails = () => {
    router.push(`/client/${request?.client.id}`);
  };

  const handleNextAction = () => {
    if (!request) return;
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

  const handleTakeCharge = async () => {
    if (!request) return;
    Alert.alert(
      'Prendre en charge',
      'Voulez-vous prendre en charge cette demande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error } = await supabase
              .from('service_request')
              .update({ statut: 'in_progress' })
              .eq('id', parseInt(request.id));
            if (error) {
              console.error('Error updating status:', error);
              Alert.alert('Erreur', `Impossible de mettre à jour le statut: ${error.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'in_progress' } : null);
              Alert.alert('Succès', 'La demande a été prise en charge.');
            }
          }
        }
      ]
    );
  };

  const handleForward = async (companyId: string, companyName: string) => {
    if (!request) return;
    Alert.alert(
      'Transmettre la demande',
      `Voulez-vous transmettre cette demande à ${companyName} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error } = await supabase
              .from('service_request')
              .update({ statut: 'forwarded', id_companie: parseInt(companyId) })
              .eq('id', parseInt(request.id));
            if (error) {
              console.error('Error updating status:', error);
              Alert.alert('Erreur', `Impossible de transmettre la demande: ${error.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'forwarded', company: { id: companyId, name: companyName }, currentHandler: 'company' } : null);
              setShowForwardModal(false);
              Alert.alert('Succès', 'La demande a été transmise.');
            }
          }
        }
      ]
    );
  };

  const handleGenerateQuote = () => {
    if (!request) return;
    setShowQuoteModal(false);
    router.push({
      pathname: user?.role === 'boat_manager' ? '/(boat-manager)/quote-upload' : '/(nautical-company)/quote-upload',
      params: {
        requestId: request.id,
        clientId: request.client.id,
        clientName: request.client.name,
        boatId: request.client.boat.id, // Use actual boat ID
        boatName: request.client.boat.name,
        boatType: request.client.boat.type,
      }
    });
  };

  const handleAcceptQuote = async () => {
    if (!request) return;
    Alert.alert(
      'Accepter le devis',
      'Voulez-vous accepter ce devis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error } = await supabase
              .from('service_request')
              .update({ statut: 'quote_accepted' })
              .eq('id', parseInt(request.id));
            if (error) {
              console.error('Error updating status:', error);
              Alert.alert('Erreur', `Impossible d\'accepter le devis: ${error.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'quote_accepted' } : null);
              Alert.alert('Succès', 'Le devis a été accepté.');
            }
          }
        }
      ]
    );
  };

  const handleSchedule = async () => {
    if (!request) return;
    if (!scheduledDate || !scheduledTime) {
      Alert.alert('Erreur', 'Veuillez renseigner la date et l\'heure.');
      return;
    }
    const { error } = await supabase
      .from('service_request')
      .update({
        statut: 'scheduled',
        note_add: `Planifiée le ${scheduledDate} à ${scheduledTime}. Lieu: ${scheduledLocation}. Notes: ${scheduledNotes}`
      })
      .eq('id', parseInt(request.id));
    if (error) {
      console.error('Error updating status:', error);
      Alert.alert('Erreur', `Impossible de planifier l\'intervention: ${error.message}`);
    } else {
      setRequest(prev => prev ? { ...prev, status: 'scheduled', scheduledDate: scheduledDate, scheduledTime: scheduledTime, scheduledLocation: scheduledLocation, scheduledNotes: scheduledNotes } : null);
      setShowScheduleModal(false);
      Alert.alert('Succès', 'L\'intervention a été planifiée.');
    }
  };

  const handleMarkAsCompleted = async () => {
    if (!request) return;
    Alert.alert(
      'Marquer comme terminée',
      'Voulez-vous marquer cette demande comme terminée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error } = await supabase
              .from('service_request')
              .update({ statut: 'completed' })
              .eq('id', parseInt(request.id));
            if (error) {
              console.error('Error updating status:', error);
              Alert.alert('Erreur', `Impossible de marquer comme terminée: ${error.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'completed' } : null);
              Alert.alert('Succès', 'La demande a été marquée comme terminée.');
            }
          }
        }
      ]
    );
  };

  const handleMarkAsReadyToBill = async () => {
    if (!request) return;
    Alert.alert(
      'Marquer comme bon à facturer',
      'Voulez-vous marquer cette demande comme prête à être facturée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error } = await supabase
              .from('service_request')
              .update({ statut: 'ready_to_bill' })
              .eq('id', parseInt(request.id));
            if (error) {
              console.error('Error updating status:', error);
              Alert.alert('Erreur', `Impossible de marquer comme prête à être facturée: ${error.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'ready_to_bill' } : null);
              Alert.alert('Succès', 'La demande a été marquée comme prête à être facturée.');
            }
          }
        }
      ]
    );
  };

  const handleGenerateInvoice = async () => {
    if (!request) return;
    setShowInvoiceModal(false);
    // In a real app, this would generate a real invoice
    const invoiceRef = `FAC-${Math.floor(Math.random() * 10000)}`;
    const invoiceDate = new Date().toISOString().split('T')[0];
    const paymentDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now
    const deposit = request.invoiceAmount ? Math.round(request.invoiceAmount * 0.3) : 0;

    const { error } = await supabase
      .from('service_request')
      .update({
        statut: 'to_pay',
        note_add: `Facture ${invoiceRef} • ${invoiceDate}`, // Store invoice ref and date in note_add
        prix: request.invoiceAmount, // Ensure price is set
      })
      .eq('id', parseInt(request.id));

    if (error) {
      console.error('Error generating invoice:', error);
      Alert.alert('Erreur', `Impossible de générer la facture: ${error.message}`);
    } else {
      setRequest(prev => prev ? {
        ...prev,
        status: 'to_pay',
        invoiceReference: invoiceRef,
        invoiceDate: invoiceDate,
        depositAmount: deposit,
        paymentDueDate: paymentDueDate
      } : null);
      Alert.alert('Succès', `Facture ${invoiceRef} générée et envoyée au client.`);
    }
  };

  const handleProcessPayment = async () => { // Defined here
    if (!request) return;
    setShowPaymentModal(false);
    // In a real app, this would integrate with a payment gateway
    const { error } = await supabase
      .from('service_request')
      .update({ statut: 'paid' })
      .eq('id', parseInt(request.id));
    if (error) {
      console.error('Error updating status:', error);
      Alert.alert('Erreur', `Impossible de marquer comme payée: ${error.message}`);
    } else {
      Alert.alert('Succès', 'Paiement effectué.');
      setRequest(prev => prev ? { ...prev, status: 'paid' } : null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!request) return;
    Alert.alert(
      'Marquer comme payé',
      'Êtes-vous sûr de vouloir marquer cette facture comme payée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error } = await supabase
              .from('service_request')
              .update({ statut: 'paid' })
              .eq('id', parseInt(request.id));
            if (error) {
              console.error('Error updating status:', error);
              Alert.alert('Erreur', `Impossible de marquer comme payée: ${error.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'paid' } : null);
              Alert.alert('Succès', 'La facture a été marquée comme payée.');
            }
          }
        }
      ]
    );
  };

  const handleCancelRequest = async () => {
    if (!request) return;
    Alert.alert(
      'Annuler la demande',
      'Voulez-vous annuler cette demande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('service_request')
              .update({ statut: 'cancelled' })
              .eq('id', parseInt(request.id));
            if (error) {
              console.error('Error updating status:', error);
              Alert.alert('Erreur', `Impossible d\'annuler la demande: ${error.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'cancelled' } : null);
              Alert.alert('Succès', 'La demande a été annulée.');
            }
          }
        }
      ]
    );
  };

  const handleDateConfirm = (date: Date, type: 'schedule' | 'reminder') => {
    const formattedDate = date.toISOString().split('T')[0];
    if (type === 'schedule') {
      setScheduledDate(formattedDate);
      setIsScheduleDatePickerVisible(false);
    } else {
      setReminderDate(formattedDate);
      setIsReminderDatePickerVisible(false);
    }
  };

  const handleTimeConfirm = (time: Date) => {
    const formattedTime = time.toTimeString().slice(0, 5); // HH:MM
    setReminderTime(formattedTime);
    setIsReminderTimePickerVisible(false);
  };

  const handleSetReminder = async () => {
    if (!request) return;
    if (!reminderDate || !reminderTime) {
      Alert.alert("Erreur", "Merci de définir une date et une heure.");
      return;
    }

    // Store reminder in service_reminders table
    const { error: insertReminderError } = await supabase
      .from('service_reminders')
      .insert({
        id_service_request: parseInt(request.id),
        date: reminderDate, // Store only the date part
        time: reminderTime, // Store the time part
      });

    if (insertReminderError) {
      console.error('Error setting reminder:', insertReminderError);
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
          {/* Mock companies - In a real app, fetch from Supabase */}
          {[
            { id: '1', name: 'Nautisme Pro' },
            { id: '2', name: 'Marine Services' }
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
          
          {request?.quoteIds && request.quoteIds.length > 0 && (
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
          <Text style={styles.modalTitle}>Paiement de la facture</Text>
          
          <View style={styles.modalBody}>
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Référence :</Text>
              <Text style={styles.invoiceValue}>{request?.invoiceReference}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Montant total :</Text>
              <Text style={styles.invoiceValue}>{formatAmount(request?.invoiceAmount || 0)}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Acompte à payer :</Text>
              <Text style={styles.invoiceValue}>{formatAmount(request?.depositAmount || 0)}</Text>
            </View>
            
            <View style={styles.paymentMethodContainer}>
              <Text style={styles.paymentMethodTitle}>Méthode de paiement</Text>
              <View style={styles.paymentMethod}>
                <View style={styles.paymentMethodRadio}>
                  <View style={styles.paymentMethodRadioInner} />
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodName}>Carte bancaire</Text>
                  <Text style={styles.paymentMethodDescription}>Paiement sécurisé par Stripe</Text>
                </View>
              </View>
              
              <View style={styles.cardInputContainer}>
                <Text style={styles.cardInputLabel}>Numéro de carte</Text>
                <TextInput
                  style={styles.cardInput}
                  placeholder="4242 4242 4242 4242"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.cardDetailsRow}>
                <View style={styles.cardInputContainer}>
                  <Text style={styles.cardInputLabel}>Date d'expiration</Text>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="MM/AA"
                  />
                </View>
                
                <View style={styles.cardInputContainer}>
                  <Text style={styles.cardInputLabel}>CVC</Text>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="123"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
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
              onPress={handleProcessPayment}
            >
              <Text style={styles.modalConfirmText}>Payer {formatAmount(request?.depositAmount || 0)}</Text>
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
              <TouchableOpacity // Changed from TextInput to TouchableOpacity
                style={styles.inputWrapper} // Re-using inputWrapper for consistent styling
                onPress={() => setIsReminderTimePickerVisible(true)} // Open time picker
              >
                <Clock size={20} color="#666" />
                <Text style={styles.input}>{reminderTime || 'Sélectionner une heure'}</Text>
              </TouchableOpacity>
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
      <DateTimePickerModal
        isVisible={isReminderTimePickerVisible}
        mode="time"
        onConfirm={handleTimeConfirm}
        onCancel={() => setIsReminderTimePickerVisible(false)}
      />
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Chargement des détails de la demande...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
              <View style={[styles.statusBadge, { backgroundColor: `${currentStatusConfig?.color}15` }]}>
                {currentStatusConfig?.icon && <currentStatusConfig.icon size={16} color={currentStatusConfig.color} />}
                <Text style={[styles.statusText, { color: currentStatusConfig?.color }]}>
                  {currentStatusConfig?.label}
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
            {currentStatusConfig?.nextAction && (
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
                onPress={() => setShowReminderModal(true)} // Open reminder modal
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
    flexShrink: 1, // Allow text to shrink
    flexWrap: 'wrap', // Allow content to wrap to next line
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flexShrink: 1, // Allow text to shrink
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginLeft: 8, // Add some margin to separate from title
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
    alignSelf: 'flex-start', // Align to the top
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
    justifyContent: 'center', // Centered
    alignItems: 'center', // Centered
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16, // Unified border radius
    width: '90%', // Set a width
    maxWidth: 500, // Max width for larger screens
    maxHeight: '80%',
    paddingBottom: 20, // Add padding to the bottom of the modal content
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
    marginBottom: 24,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
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
  invoiceDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
  },
  invoiceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  paymentMethodContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    marginTop: 8,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  paymentMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0066CC',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: '#666',
  },
  cardInputContainer: {
    flex: 1,
    gap: 4,
  },
  cardInputLabel: {
    fontSize: 14,
    color: '#666',
  },
  cardInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
