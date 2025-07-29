// app/(nautical-company)/planning.tsx
import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Alert } from 'react-native';
import { Calendar as CalendarIcon, Clock, Bot as Boat, MapPin, User, ChevronRight, ChevronLeft, MessageSquare, FileText, Plus, X, Check, Building, Search } from 'lucide-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Picker } from '@react-native-picker/picker'; // Import Picker
import CustomDateTimePicker from '@/components/CustomDateTimePicker';


interface Appointment {
  id: string; // Keep as string for consistency in UI, but DB is integer
  date: string;
  time: string;
  duration: number | null; // Duration in minutes
  type: string;
  status: 'en_attente' | 'confirme' | 'annule' | 'termine';
  client: {
    id: string;
    name: string;
    avatar: string | null; // Avatar can be null
  };
  boat: {
    id: string;
    name: string;
    type: string;
    place_de_port?: string | null; // Can be null
  };
  location: string | null; // Can be null
  description: string | null; // Can be null
  boatManager?: {
    id: string;
    name: string;
  };
  invite?: {
    id: string;
    name: string;
    profile?: string; // Add profile to invite
  };
  nauticalCompany?: {
    id: string;
    name: string;
  } | null; // Can be null
}

interface Client {
  id: string;
  name: string;
  avatar: string;
  boats: Array<{
    id: string;
    name: string;
    type: string;
    place_de_port?: string;
  }>;
  ports?: Array<{ // Added ports to Client interface
    id: string;
    name: string;
  }>;
}

interface BoatManager {
  id: string;
  name: string;
  ports: string[];
}

interface NauticalCompany {
  id: string;
  name: string;
  logo: string;
  location: string;
  rating?: number;
  categories: Array<{ id: number; description1: string; }>;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  hasNewRequests?: boolean;
  ports: Array<{ id: number; name: string; }>;
}

// Helper function to convert minutes to HH:MM:SS format
function convertMinutesToTimeFormat(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

// Helper to convert HH:MM or HH:MM:SS to minutes from midnight
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

// Helper to convert duration string (HH:MM:SS) to minutes
function durationToMinutes(durationStr: string): number {
  const parts = durationStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
}

// Client selection modal
const ClientSelectionModal = ({ visible, onClose, onSelectClient, clients }) => {
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un client</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un client..."
              value={clientSearchQuery}
              onChangeText={setClientSearchQuery}
            />
          </View>

          <ScrollView style={styles.modalList}>
            {filteredClients.map(client => (
              <TouchableOpacity
                key={client.id}
                style={styles.modalItem}
                onPress={() => onSelectClient(client)}
              >
                <View style={styles.modalItemContent}>
                  <User size={20} color="#0066CC" />
                  <Text style={styles.modalItemText}>{client.name}</Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            ))}

             {/* Zone vierge */}
          <View style={{ height: 60 }} />

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Boat selection modal
const BoatSelectionModal = ({ visible, onClose, onSelectBoat, selectedClient }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Sélectionner un bateau</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {selectedClient && selectedClient.boats && selectedClient.boats.length > 0 ? (
            <ScrollView style={styles.modalList}>
              {selectedClient.boats.map(boat => (
                <TouchableOpacity
                  key={boat.id}
                  style={styles.modalItem}
                  onPress={() => onSelectBoat(boat)}
                >
                  <View style={styles.modalItemContent}>
                    <Boat size={20} color="#0066CC" />
                    <View>
                      <Text style={styles.modalItemText}>{boat.name}</Text>
                      <Text style={styles.modalItemSubtext}>{boat.type}</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </TouchableOpacity>
              ))}

             {/* Zone vierge */}
          <View style={{ height: 60 }} />

            </ScrollView>
          ) : (
            <View style={styles.emptyModalState}>
              <Text style={styles.emptyModalText}>
                {selectedClient ? "Cet utilisateur n'a pas de bateau enregistré." : "Veuillez d'abord sélectionner un client."}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

// Boat Manager selection modal
const BoatManagerSelectionModal = ({ visible, onClose, onSelectBoatManager, boatManagers }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Sélectionner un boat manager</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalList}>
          {boatManagers.map(manager => (
            <TouchableOpacity
              key={manager.id}
              style={styles.modalItem}
              onPress={() => onSelectBoatManager(manager)}
            >
              <View style={styles.modalItemContent}>
                <User size={20} color="#0066CC" />
                <View>
                  <Text style={styles.modalItemText}>{manager.name}</Text>
                  <Text style={styles.modalItemSubtext}>
                    {manager.ports.join(', ')}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color="#666" />
            </TouchableOpacity>
          ))}

         {/* Zone vierge */}
          <View style={{ height: 60 }} />

        </ScrollView>
      </View>
      </View>
    </Modal>
  );

// Nautical Company selection modal
const NauticalCompanySelectionModal = ({ visible, onClose, onSelectNauticalCompany, nauticalCompanies }) => {
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const filteredCompanies = nauticalCompanies.filter(company =>
    company.name.toLowerCase().includes(companySearchQuery.toLowerCase())
  );


  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner une entreprise du nautisme</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une entreprise..."
              value={companySearchQuery}
              onChangeText={setCompanySearchQuery}
            />
          </View>

          <ScrollView style={styles.modalList}>
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map(company => (
                <TouchableOpacity
                  key={company.id}
                  style={styles.modalItem}
                  onPress={() => onSelectNauticalCompany(company)}
                >
                  <View style={styles.modalItemContent}>
                    <Building size={20} color="#0066CC" />
                    <View>
                      <Text style={styles.modalItemText}>{company.name}</Text>
                      <Text style={styles.modalItemSubtext}>
                        {company.location}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyModalState}>
                <Text style={styles.emptyModalText}>
                  Aucune entreprise trouvée pour ce service.
                </Text>
              </View>
            )}


            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Service Type selection modal
const ServiceTypeSelectionModal = ({ visible, onClose, onSelectServiceType, serviceCategories }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un type d'intervention</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalList}>
            {serviceCategories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.modalItem}
                onPress={() => onSelectServiceType(category.description1)}
              >
                <View style={styles.modalItemContent}>
                  <FileText size={20} color="#1a1a1a" />
                  <Text style={styles.modalItemText}>{category.description1}</Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            ))}

           <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};


// Add appointment modal
const AddAppointmentModal = ({
  visible,
  onClose,
  initialAppointment,
  onSaveAppointment,
  allClients,
  allBoatManagers,
  allNauticalCompanies, // This is now "other nautical companies"
  allServiceCategories,
  mode, // 'new' or 'edit'
}) => {
  const { user } = useAuth();
  const [localAppointment, setLocalAppointment] = useState(initialAppointment);
  const [initialBoatPlaceDePort, setInitialBoatPlaceDePort] = useState<string | undefined>(undefined);

  const [modalSelectedClient, setModalSelectedClient] = useState<Client | null>(null);
  const [modalSelectedBoat, setModalSelectedBoat] = useState<Client['boats'][0] | null>(null);
  const [modalSelectedBoatManager, setModalSelectedBoatManager] = useState<BoatManager | null>(null); // State for invited BM
  const [modalWithBoatManager, setModalWithBoatManager] = useState(false); // Toggle for inviting BM

  const [notifyClient, setNotifyClient] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [showBoatManagerModal, setShowBoatManagerModal] = useState(false); // For selecting BM to invite
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [isScheduleDatePickerVisible, setIsScheduleDatePickerVisible] = useState(false);
  const [isScheduleTimePickerVisible, setIsScheduleTimePickerVisible] = useState(false);
  

  const filteredBoatManagers = useMemo(() => {
  if (!modalSelectedClient) return allBoatManagers;

  const clientPortNames = modalSelectedClient.ports
    ?.map(port => port.name)
    .filter(Boolean) || [];

  return allBoatManagers.filter(manager =>
    manager.ports.some(managerPort => clientPortNames.includes(managerPort))
  );
}, [modalSelectedClient, allBoatManagers]);

  

  // Initialize internal states when modal becomes visible or initialAppointment changes
  useEffect(() => {
    if (visible) {
      setLocalAppointment(initialAppointment);
      setInitialBoatPlaceDePort(initialAppointment.boat?.place_de_port ?? undefined);

      // Initialize client, boat, invited professional based on initialAppointment
      if (initialAppointment.id) { // EDIT MODE
        const client = allClients.find(c => c.id === initialAppointment.client?.id);
        setModalSelectedClient(client || null);

        const boat = client?.boats.find(b => b.id === initialAppointment.boat?.id);
        setModalSelectedBoat(boat || null);

        // Check if invited professional is a Boat Manager
        if (initialAppointment.invite?.profile === 'boat_manager') {
          const invitedBm = allBoatManagers.find(bm => bm.id === initialAppointment.invite?.id);
          setModalSelectedBoatManager(invitedBm || null);
          setModalWithBoatManager(true);
        } else {
          setModalSelectedBoatManager(null);
          setModalWithBoatManager(false);
        }
        setNotifyClient(initialAppointment.notifier === 'oui'); // Assuming 'notifier' is a property in initialAppointment
      } else { // NEW APPOINTMENT MODE
        setModalSelectedClient(null);
        setModalSelectedBoat(null);
        setModalSelectedBoatManager(null);
        setModalWithBoatManager(false);
        setNotifyClient(false); // Default for new appointment
        setLocalAppointment({ // Reset localAppointment for new entry
          date: new Date().toISOString().split('T')[0],
          time: '09:00',
          duration: 60,
          type: '',
          status: 'confirme',
          location: null,
          description: null,
        });
      }
    }
  }, [visible, initialAppointment, allClients, allBoatManagers]); // Dependencies

  const handleLocalDateConfirm = (date: Date) => {
    setLocalAppointment(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
    setIsScheduleDatePickerVisible(false);
  };

  const handleLocalTimeConfirm = (time: Date) => {
    setLocalAppointment(prev => ({ ...prev, time: time.toTimeString().substring(0, 5) }));
    setIsScheduleTimePickerVisible(false);
  };

  const validateAppointmentForm = (appointmentData: Partial<Appointment>) => {
    if (!modalSelectedClient) { // Use internal state
      Alert.alert('Erreur', 'Veuillez sélectionner un client');
      return false;
    }

    if (!modalSelectedBoat) { // Use internal state
      Alert.alert('Erreur', 'Veuillez sélectionner un bateau');
      return false;
    }

    if (modalWithBoatManager && !modalSelectedBoatManager) { // Use internal state
      Alert.alert('Erreur', 'Veuillez sélectionner un Boat Manager à associer');
      return false;
    }

    if (!appointmentData.date) {
      Alert.alert('Erreur', 'Veuillez sélectionner une date');
      return false;
    }

    if (!appointmentData.time) {
      Alert.alert('Erreur', 'Veuillez sélectionner une heure');
      return false;
    }

    if (!appointmentData.description) {
      Alert.alert('Erreur', 'Veuillez ajouter une description');
      return false;
    }

    return true;
  };

  const handleLocalSave = useCallback(async () => {
    if (!validateAppointmentForm(localAppointment)) return;

    // 1. Update place_de_port in 'boat' table if changed
    if (modalSelectedBoat?.id && localAppointment.location !== initialBoatPlaceDePort) { // Use internal state
      try {
        const { error: updateBoatError } = await supabase
          .from('boat')
          .update({ place_de_port: localAppointment.location })
          .eq('id', Number(modalSelectedBoat.id));

        if (updateBoatError) {
          console.error('Error updating boat place_de_port:', updateBoatError);
          Alert.alert('Erreur', `Impossible de mettre à jour la place de port du bateau: ${updateBoatError.message}`);
          return;
        }
      } catch (e) {
        console.error('Unexpected error updating boat place_de_port:', e);
        Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de la mise à jour de la place de port.');
        return;
      }
    }

    // Conflict check: Check for existing appointments at the same date and overlapping time
    try {
      const newAppointmentStartMinutes = timeToMinutes(localAppointment.time);
      const newAppointmentEndMinutes = newAppointmentStartMinutes + (localAppointment.duration || 0);

      const { data: existingAppointments, error: fetchError } = await supabase
        .from('rendez_vous')
        .select('id, heure, duree')
        .eq('date_rdv', localAppointment.date)
        .or(`cree_par.eq.${user.id},invite.eq.${user.id}`);

      if (fetchError) {
        console.error('Error fetching existing appointments:', fetchError);
        Alert.alert('Erreur', 'Impossible de vérifier les conflits d\'horaire.');
        return;
      }

      const conflictFound = existingAppointments.some(existingAppt => {
        if (localAppointment.id && existingAppt.id.toString() === localAppointment.id) {
          return false;
        }

        const existingApptStartMinutes = timeToMinutes(existingAppt.heure);
        const existingApptEndMinutes = existingApptStartMinutes + durationToMinutes(existingAppt.duree);

        return (newAppointmentStartMinutes < existingApptEndMinutes) &&
               (newAppointmentEndMinutes > existingApptStartMinutes);
      });

      if (conflictFound) {
        Alert.alert('Conflit d\'horaire', 'Un rendez-vous existe déjà sur ce créneau horaire.');
        return;
      }

    } catch (e) {
      console.error('Unexpected error during conflict check:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de la vérification des conflits.');
      return;
    }

    // 2. Lookup service_id from categorie_service table
    const { data: serviceCategory, error: serviceCategoryError } = await supabase
      .from('categorie_service')
      .select('id')
      .eq('description1', localAppointment.type)
      .single();

    if (serviceCategoryError || !serviceCategory) {
      console.error('Error fetching service category ID:', serviceCategoryError);
      Alert.alert('Erreur', 'Impossible de trouver l\'ID du service sélectionné.');
      return;
    }

    const serviceId = serviceCategory.id;

    const durationInTimeFormat = localAppointment.duration ? convertMinutesToTimeFormat(localAppointment.duration) : null;

    const rendezVousData = {
      id_client: Number(modalSelectedClient!.id), // Use internal state
      id_boat: Number(modalSelectedBoat!.id),     // Use internal state
      id_categorie_service: serviceId,
      description: localAppointment.description,
      date_rdv: localAppointment.date,
      heure: localAppointment.time,
      duree: durationInTimeFormat,
      cree_par: Number(user?.id), // Current Nautical Company's ID
      invite: modalWithBoatManager ? Number(modalSelectedBoatManager?.id) : null, // Use internal state for invited BM
      statut: modalWithBoatManager ? 'en_attente' : 'confirme', // If inviting BM, status is 'en_attente'
      notifier: notifyClient ? 'oui' : 'non',
      lieu: localAppointment.location,
    };

    let result;
    let successMessage = '';
    if (localAppointment.id) {
      // Update existing appointment
      result = await supabase
        .from('rendez_vous')
        .update(rendezVousData)
        .eq('id', Number(localAppointment.id))
        .select('*')
        .single();
      successMessage = 'Le rendez-vous a été modifié avec succès.';
    } else {
      // Insert new appointment
      result = await supabase
        .from('rendez_vous')
        .insert([rendezVousData])
        .select('*')
        .single();
      successMessage = 'Le rendez-vous a été enregistré avec succès.';
    }

    if (result.error) {
      console.error('Error saving rendez_vous:', result.error);
      Alert.alert('Erreur', `Échec de l'enregistrement du rendez-vous: ${result.error.message}`);
    } else {
      const { data: fetchedAppt, error: fetchError } = await supabase
        .from('rendez_vous')
        .select(`
          id, date_rdv, heure, duree, description, statut,
          id_client(id, first_name, last_name, avatar),
          boat(id, name, type, place_de_port),
          invite(id, first_name, last_name, profile),
          cree_par(id, first_name, last_name, profile),
          categorie_service(description1)
        `)
        .eq('id', result.data.id)
        .single();

      if (fetchError) {
        console.error('Error fetching saved appointment:', fetchError);
        Alert.alert('Erreur', 'Rendez-vous enregistré, mais impossible de rafraîchir les détails.');
        onClose();
        return;
      }

      const savedAppointment: Appointment = {
        id: fetchedAppt.id.toString(),
        date: fetchedAppt.date_rdv,
        time: fetchedAppt.heure,
        duration: fetchedAppt.duree ? durationToMinutes(fetchedAppt.duree) : null,
        type: fetchedAppt.categorie_service?.description1 || 'unknown',
        status: fetchedAppt.statut,
        client: {
          id: fetchedAppt.id_client.id.toString(),
          name: `${fetchedAppt.id_client.first_name} ${fetchedAppt.id_client.last_name}`,
          avatar: fetchedAppt.id_client.avatar,
        },
        boat: {
          id: fetchedAppt.id_boat.id.toString(),
          name: fetchedAppt.id_boat.name,
          type: fetchedAppt.id_boat.type,
          place_de_port: fetchedAppt.id_boat.place_de_port,
        },
        location: fetchedAppt.id_boat.place_de_port || null,
        description: fetchedAppt.description || null,
        boatManager: fetchedAppt.cree_par && fetchedAppt.cree_par.profile === 'boat_manager' ? {
          id: fetchedAppt.cree_par.id.toString(),
          name: `${fetchedAppt.cree_par.first_name} ${fetchedAppt.cree_par.last_name}`,
        } : null,
        invite: fetchedAppt.invite ? {
          id: fetchedAppt.invite.id.toString(),
          name: `${fetchedAppt.invite.first_name} ${fetchedAppt.invite.last_name}`,
          profile: fetchedAppt.invite.profile,
        } : undefined,
        nauticalCompany: fetchedAppt.invite && fetchedAppt.invite.profile === 'nautical_company' ? {
          id: fetchedAppt.invite.id.toString(),
          name: `${fetchedAppt.invite.first_name} ${fetchedAppt.invite.last_name}`,
        } : null,
      };

      console.log('✅ Sauvegarde réussie, préparation fermeture modale...');
onSaveAppointment(savedAppointment, !!localAppointment.id);

setTimeout(() => {
  Alert.alert(
    'Succès',
    successMessage,
    [
      {
        text: 'OK',
        onPress: () => {
          onClose(); // ferme la modale
          console.log('✅ Modale fermée après succès.');
        }
      }
    ]
  );
}, 100);
    }
  }, [localAppointment, modalSelectedClient, modalSelectedBoat, modalWithBoatManager, modalSelectedBoatManager, initialBoatPlaceDePort, user, onClose, onSaveAppointment]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {mode === 'edit' ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScrollView}>
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Client et bateau</Text>

              <TouchableOpacity
                style={styles.formField}
                onPress={() => setShowClientModal(true)}
              >
                <View style={styles.formFieldIcon}>
                  <User size={20} color="#0066CC" />
                </View>
                <View style={styles.formFieldContent}>
                  <Text style={modalSelectedClient ? styles.formFieldValue : styles.formFieldPlaceholder}>
                    {modalSelectedClient ? modalSelectedClient.name : 'Sélectionner un client'}
                  </Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.formField}
                onPress={() => {
                  if (modalSelectedClient) {
                    setShowBoatModal(true);
                  } else {
                    Alert.alert('Erreur', 'Veuillez d\'abord sélectionner un client');
                  }
                }}
              >
                <View style={styles.formFieldIcon}>
                  <Boat size={20} color="#0066CC" />
                </View>
                <View style={styles.formFieldContent}>
                  <Text style={modalSelectedBoat ? styles.formFieldValue : styles.formFieldPlaceholder}>
                    {modalSelectedBoat ? `${modalSelectedBoat.name} (${modalSelectedBoat.type})` : 'Sélectionner un bateau'}
                  </Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Détails du rendez-vous</Text>

              <View style={styles.formField}>
                <View style={styles.formFieldIcon}>
                  <CalendarIcon size={20} color="#0066CC" />
                </View>
                <View style={styles.formFieldContent}>
                  <Text style={styles.formFieldLabel}>Date</Text>
                  <TouchableOpacity
                    style={styles.formInput}
                    onPress={() => setIsScheduleDatePickerVisible(true)}
                  >
                    <Text style={localAppointment.date ? styles.formFieldValue : styles.formFieldPlaceholder}>
                      {localAppointment.date || 'Sélectionner une date'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formFieldIcon}>
                  <Clock size={20} color="#0066CC" />
                </View>
                <View style={styles.formFieldContent}>
                  <Text style={styles.formFieldLabel}>Heure</Text>
                  <TouchableOpacity
                    style={styles.formInput}
                    onPress={() => setIsScheduleTimePickerVisible(true)}
                  >
                    <Text style={localAppointment.time ? styles.formFieldValue : styles.formFieldPlaceholder}>
                      {localAppointment.time || 'Sélectionner une heure'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formFieldIcon}>
                  <Clock size={20} color="#0066CC" />
                </View>
                <View style={styles.formFieldContent}>
                  <Text style={styles.formFieldLabel}>Durée (minutes)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={localAppointment.duration != null ? localAppointment.duration.toString() : ''}
                    onChangeText={(text) => {
                      const parsedValue = parseInt(text, 10);
                      setLocalAppointment(prev => ({
                        ...prev,
                        duration: isNaN(parsedValue) ? null : parsedValue
                      }));
                    }}
                    keyboardType="numeric"
                    placeholder="60"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formFieldIcon}>
                  <FileText size={20} color="#0066CC" />
                </View>
                <View style={styles.formFieldContent}>
                  <Text style={styles.formFieldLabel}>Type d'intervention</Text>
                  <TouchableOpacity
                    style={styles.formInput}
                    onPress={() => setShowServiceTypeModal(true)}
                  >
                    <Text style={localAppointment.type ? styles.formFieldValue : styles.formFieldPlaceholder}>
                      {localAppointment.type || 'Sélectionner un type d\'intervention'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formFieldIcon}>
                  <MapPin size={20} color="#0066CC" />
                </View>
                <View style={styles.formFieldContent}>
                  <Text style={styles.formFieldLabel}>Lieu</Text>
                  <TextInput
                    style={styles.formInput}
                    value={localAppointment.location || ''}
                    onChangeText={(text) => setLocalAppointment(prev => ({ ...prev, location: text }))}
                    placeholder="Lieu du rendez-vous"
                  />
                </View>
              </View>

              <View style={styles.formField}>
                <View style={styles.formFieldIcon}>
                  <FileText size={20} color="#0066CC" />
                </View>
                <View style={styles.formFieldContent}>
                  <Text style={styles.formFieldLabel}>Description</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={localAppointment.description || ''}
                    onChangeText={(text) => setLocalAppointment(prev => ({ ...prev, description: text }))}
                    placeholder="Description de l'intervention"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Associer un Boat Manager</Text>
              <View style={styles.companyToggleContainer}>
                <Text style={styles.companyToggleLabel}>Associer un Boat Manager</Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    modalWithBoatManager ? styles.toggleButtonActive : styles.toggleButtonInactive
                  ]}
                  onPress={() => setModalWithBoatManager(!modalWithBoatManager)}
                >
                  <View style={[
                    styles.toggleIndicator,
                    modalWithBoatManager ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive
                  ]} />
                </TouchableOpacity>
              </View>

              {modalWithBoatManager && (
                <TouchableOpacity
                  style={styles.formField}
                  onPress={() => setShowBoatManagerModal(true)}
                >
                  <View style={styles.formFieldIcon}>
                    <User size={20} color="#0066CC" />
                  </View>
                  <View style={styles.formFieldContent}>
                    <Text style={modalSelectedBoatManager ? styles.formFieldValue : styles.formFieldPlaceholder}>
                      {modalSelectedBoatManager ? modalSelectedBoatManager.name : 'Sélectionner un Boat Manager'}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

           <View style={styles.formSection}>
  <Text style={styles.formSectionTitle}>Notification</Text>
  <View style={styles.companyToggleContainer}>
    <Text style={styles.companyToggleLabel}>Notifier le client</Text>
    <TouchableOpacity
      style={[
        styles.toggleButton,
        notifyClient ? styles.toggleButtonActive : styles.toggleButtonInactive
      ]}
      onPress={() => setNotifyClient(!notifyClient)}
    >
      <View style={[
        styles.toggleIndicator,
        notifyClient ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive
      ]} />
    </TouchableOpacity>
  </View>
</View>


          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleLocalSave}
            >
              <Check size={20} color="white" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {Platform.OS !== 'web' && (
  <>
    <CustomDateTimePicker
      isVisible={isScheduleDatePickerVisible}
      mode="date"
      value={localAppointment.date ? new Date(localAppointment.date) : new Date()}
      onConfirm={handleLocalDateConfirm}
      onCancel={() => setIsScheduleDatePickerVisible(false)}
    />
    <CustomDateTimePicker
      isVisible={isScheduleTimePickerVisible}
      mode="time"
      value={
        localAppointment.date && localAppointment.time
          ? new Date(`${localAppointment.date}T${localAppointment.time}:00`)
          : new Date()
      }
      onConfirm={handleLocalTimeConfirm}
      onCancel={() => setIsScheduleTimePickerVisible(false)}
    />
  </>
)}

      {/* Nested Modals */}
      <ClientSelectionModal
        visible={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={(client) => {
          setModalSelectedClient(client);
          // Vide la sélection du bateau précédent
          if (!client.boats || client.boats.length === 0) {
            setModalSelectedBoat(null); // Use internal state
            setLocalAppointment(prev => ({
              ...prev,
              location: null // on vide aussi le champ "lieu"
            }));
          } else if (client.boats.length === 1) { // Si un seul bateau, le sélectionner automatiquement
            setModalSelectedBoat(client.boats[0]);
            setLocalAppointment(prev => ({
              ...prev,
              location: client.boats[0].place_de_port || ''
            }));
          } else { // Si plusieurs bateaux, ne rien sélectionner et laisser l'utilisateur choisir
            setModalSelectedBoat(null);
            setLocalAppointment(prev => ({
              ...prev,
              location: null
            }));
          }
          setShowClientModal(false);
        }}
        clients={allClients}
      />
      <BoatSelectionModal
        visible={showBoatModal}
        onClose={() => setShowBoatModal(false)}
        onSelectBoat={(boat) => {
          setModalSelectedBoat(boat);
          setLocalAppointment(prev => ({
            ...prev,
            location: boat.place_de_port || ''
          }));
          setShowBoatModal(false);
        }}
        selectedClient={modalSelectedClient}
      />
      <BoatManagerSelectionModal
        visible={showBoatManagerModal}
        onClose={() => setShowBoatManagerModal(false)}
        onSelectBoatManager={(manager) => {
          setModalSelectedBoatManager(manager); // Set the selected Boat Manager
          setModalWithBoatManager(true); // Ensure toggle is on if selected
          setShowBoatManagerModal(false);
        }}
        boatManagers={filteredBoatManagers}
      />
      <ServiceTypeSelectionModal
        visible={showServiceTypeModal}
        onClose={() => setShowServiceTypeModal(false)}
        onSelectServiceType={(type) => {
          setLocalAppointment(prev => ({ ...prev, type }));
          setShowServiceTypeModal(false);
        }}
        serviceCategories={allServiceCategories}
      />
    </Modal>
  );
};


export default function PlanningScreen() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Data for modals
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allBoatManagers, setAllBoatManagers] = useState<BoatManager[]>([]);
  const [allNauticalCompanies, setAllNauticalCompanies] = useState<NauticalCompany[]>([]); // This is now "other nautical companies"
  const [allServiceCategories, setAllServiceCategories] = useState<Array<{id: number; description1: string}>>([]);

  // New appointment form state (this is the initial state for the modal)
  const [newAppointment, setNewAppointment] = useState<Partial<Appointment>>({
    date: selectedDate.toISOString().split('T')[0],
    time: '09:00',
    duration: 60,
    type: '',
    status: 'confirme', // Default status for NC created appointments
    location: null,
    description: null,
  });

  // Get editAppointmentId from URL params
  const { editAppointmentId } = useLocalSearchParams();

  // useFocusEffect to refetch appointments and handle edit mode when the screen comes into focus
  useFocusEffect(
  useCallback(() => {
    console.log('👀 useFocusEffect déclenché');

    let isActive = true;

    const fetchPlanningData = async () => {
      if (!user?.id) return;

      // 1. RDV liés à l'utilisateur
      const { data: rdvData, error: rdvError } = await supabase
        .from('rendez_vous')
        .select(`
          id, date_rdv, heure, duree, description, statut,
          id_client(id, first_name, last_name, avatar),
          id_boat(id, name, type, place_de_port),
          invite(id, first_name, last_name, profile),
          cree_par(id, first_name, last_name, profile),
          categorie_service(description1)
        `)
        .or(`cree_par.eq.${user.id},invite.eq.${user.id}`);

      if (rdvError) {
        console.error('Erreur chargement RDV:', rdvError);
      } else if (isActive && rdvData) {
        const formatted = rdvData.map(rdv => {
          const duration = typeof rdv.duree === 'string'
            ? rdv.duree.split(':').reduce((acc, val, i) => acc + (i === 0 ? +val * 60 : +val), 0)
            : rdv.duree;
          return {
            id: rdv.id.toString(),
            date: rdv.date_rdv,
            time: rdv.heure,
            duration,
            type: rdv.categorie_service?.description1 || '',
            status: rdv.statut,
            description: rdv.description || null,
            client: {
              id: rdv.id_client.id.toString(),
              name: `${rdv.id_client.first_name} ${rdv.id_client.last_name}`,
              avatar: rdv.id_client.avatar
            },
            boat: {
              id: rdv.id_boat.id.toString(),
              name: rdv.id_boat.name,
              type: rdv.id_boat.type,
              place_de_port: rdv.id_boat.place_de_port
            },
            location: rdv.id_boat.place_de_port || null,
            boatManager: rdv.cree_par?.profile === 'boat_manager' ? {
              id: rdv.cree_par.id.toString(),
              name: `${rdv.cree_par.first_name} ${rdv.cree_par.last_name}`
            } : null,
            invite: rdv.invite ? {
              id: rdv.invite.id.toString(),
              name: `${rdv.invite.first_name} ${rdv.invite.last_name}`,
              profile: rdv.invite.profile
            } : undefined,
            nauticalCompany: rdv.invite?.profile === 'nautical_company' ? {
              id: rdv.invite.id.toString(),
              name: `${rdv.invite.first_name} ${rdv.invite.last_name}`
            } : null
          };
        });
        setAppointments(formatted);
      }

      // 2. Ports opérés
      const { data: companyPorts, error: portsErr } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', Number(user.id));
      if (portsErr) return console.error('Ports erreur:', portsErr);

      const operatedPortIds = companyPorts.map(p => p.port_id);

      // 3. Clients sur ces ports
      const { data: users, error: clientsErr } = await supabase
        .from('users')
        .select(`
          id, first_name, last_name, avatar,
          boat(id, name, type, place_de_port),
          user_ports(port_id, ports(name))
        `)
        .eq('profile', 'pleasure_boater');

      if (!clientsErr && isActive && users) {
        const filtered = users.filter(u =>
          u.user_ports?.some(up => operatedPortIds.includes(up.port_id))
        );
        const parsed = filtered.map(u => ({
          id: u.id.toString(),
          name: `${u.first_name} ${u.last_name}`,
          avatar: u.avatar,
          boats: u.boat || [],
          ports: u.user_ports?.map(up => ({
            id: up.port_id.toString(),
            name: up.ports?.name || ''
          })) || []
        }));
        setAllClients(parsed);
      }

      // 4. Catégories de service
      const { data: cats, error: catErr } = await supabase
        .from('user_categorie_service')
        .select('categorie_service(id, description1)')
        .eq('user_id', Number(user.id));
      if (!catErr && cats) {
        setAllServiceCategories(cats.map(uc => uc.categorie_service));
      }

      // 5. Boat Managers liés aux ports
      const { data: portAssignments, error: paErr } = await supabase
        .from('user_ports')
        .select('user_id, ports(name)')
        .in('port_id', operatedPortIds);
      if (paErr) return;

      const bmIds = [...new Set(portAssignments.map(p => p.user_id))];

      const { data: bms, error: bmErr } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', bmIds)
        .eq('profile', 'boat_manager');

      if (!bmErr && bms) {
        setAllBoatManagers(
          bms.map(bm => ({
            id: bm.id.toString(),
            name: `${bm.first_name} ${bm.last_name}`,
            ports: portAssignments
              .filter(p => p.user_id === bm.id)
              .map(p => p.ports?.name || '')
          }))
        );
      }

      // 6. Autres entreprises nautiques (invitation)
      const { data: others, error: othersErr } = await supabase
        .from('users')
        .select('id, company_name, user_ports(port_id, ports(name))')
        .eq('profile', 'nautical_company')
        .neq('id', Number(user.id));

      if (!othersErr && others) {
        const filteredCompanies = others.filter(comp =>
          comp.user_ports.some(up => operatedPortIds.includes(up.port_id))
        );
        const formattedCompanies = filteredCompanies.map(comp => ({
          id: comp.id.toString(),
          name: comp.company_name,
          logo: '',
          location: comp.user_ports[0]?.ports?.name || '',
          categories: [],
          ports: comp.user_ports.map(up => ({
            id: up.port_id,
            name: up.ports.name
          }))
        }));
        setAllNauticalCompanies(formattedCompanies);
      }
    };

    fetchPlanningData();

    if (editAppointmentId) {
      console.log('🚀 Détection editAppointmentId, chargement de l’édition...');
      const fetchAppointmentForEdit = async () => {
        const { data, error } = await supabase
          .from('rendez_vous')
          .select(`
            id, date_rdv, heure, duree, description, statut,
            id_client(id, first_name, last_name, avatar),
            id_boat(id, name, type, place_de_port),
            invite(id, first_name, last_name, profile),
            cree_par(id, first_name, last_name, profile),
            categorie_service(description1)
          `)
          .eq('id', Number(editAppointmentId))
          .single();

        if (error) {
          console.error('Erreur chargement RDV pour édition:', error);
          Alert.alert('Erreur', 'Impossible de charger le rendez-vous.');
        } else {
          const duration =
            typeof data.duree === 'string'
              ? data.duree.split(':').reduce((acc, val, i) => acc + (i === 0 ? +val * 60 : +val), 0)
              : data.duree;

          setNewAppointment({
            id: data.id.toString(),
            date: data.date_rdv,
            time: data.heure,
            duration,
            type: data.categorie_service?.description1 || '',
            status: data.statut,
            location: data.id_boat.place_de_port || null,
            description: data.description || null,
            client: {
              id: data.id_client.id.toString(),
              name: `${data.id_client.first_name} ${data.id_client.last_name}`,
              avatar: data.id_client.avatar
            },
            boat: {
              id: data.id_boat.id.toString(),
              name: data.id_boat.name,
              type: data.id_boat.type,
              place_de_port: data.id_boat.place_de_port
            },
            invite: data.invite?.profile === 'boat_manager' ? {
              id: data.invite.id.toString(),
              name: `${data.invite.first_name} ${data.invite.last_name}`,
              profile: data.invite.profile
            } : undefined,
            nauticalCompany: data.invite?.profile === 'nautical_company' ? {
              id: data.invite.id.toString(),
              name: `${data.invite.first_name} ${data.invite.last_name}`
            } : null
          });

          setTimeout(() => {
            setShowAddModal(true);
          }, 100);
          router.replace('/(nautical-company)/planning');
        }
      };
      fetchAppointmentForEdit();
    }

    return () => {
      isActive = false;
    };
  }, [user, editAppointmentId])
);



  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time ? time.substring(0, 5).replace(':', 'h') : '';
  };

  const formatDuration = (duration: number | null) => {
    if (duration === null || isNaN(duration) || duration === 0) return '0h';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes ? minutes : ''}`;
  };

  const getAppointmentColor = (appointment: Appointment) => {
  if (appointment.status === 'annule') return '#DC2626'; // Rouge
  if (appointment.status === 'en_attente') return '#F59E0B'; // Orange
  if (appointment.status === 'confirme') {
    if (appointment.invite) return '#10B981'; // Bleu si confirmé avec invité
    return '#3B82F6'; // Vert si confirmé sans invité
  }
  return '#9CA3AF'; // Gris par défaut
};

  const getAppointmentLabel = (type: string) => {
    return type; // Directly use the description1 from categorie_service
  };

  const handlePreviousDay = () => {
    const newDate = new Date(selectedDate);
    if (view === 'day') {
      newDate.setDate(selectedDate.getDate() - 1);
    } else { // week view
      newDate.setDate(selectedDate.getDate() - 7);
    }
    setSelectedDate(newDate);
    setNewAppointment(prev => ({
      ...prev,
      date: newDate.toISOString().split('T')[0]
    }));
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    if (view === 'day') {
      newDate.setDate(selectedDate.getDate() + 1);
    } else { // week view
      newDate.setDate(selectedDate.getDate() + 7);
    }
    setSelectedDate(newDate);
    setNewAppointment(prev => ({
      ...prev,
      date: newDate.toISOString().split('T')[0]
    }));
  };

  const handleMessage = (clientId: string) => {
    router.push(`/(nautical-company)/messages?client=${clientId}`);
  };

  const handleClientDetails = (clientId: string) => {
    router.push(`/client/${clientId}`);
  };

  const handleAppointmentDetails = (appointmentId: string) => {
  const targetUrl = `/appointment/${appointmentId}`; // Construisez l'URL complète
  router.push(targetUrl);
};

  const handleAddAppointment = () => {
    // Reset all states related to the modal form for a new appointment
    setNewAppointment({
      id: '', // Clear ID for new appointment
      date: selectedDate.toISOString().split('T')[0],
      time: '09:00',
      duration: 60,
      type: '',
      status: 'confirme', // Default status for NC created appointments
      location: null,
      description: null,
      client: undefined, // Ensure client is undefined for new appointment
      boat: undefined,   // Ensure boat is undefined for new appointment
      nauticalCompany: undefined, // Ensure nauticalCompany is undefined for new appointment
    });
    setShowAddModal(true); // Open the modal
  };

  const handleSaveAppointment = useCallback(async (newAppt: Appointment, isEditing: boolean) => {
    if (isEditing) {
      setAppointments(prev => prev.map(appt => appt.id === newAppt.id ? newAppt : appt));
    } else {
      setAppointments(prev => [...prev, newAppt]);
    }
    setShowAddModal(false);
  }, []);

  const filteredAppointments = useMemo(() => {
    if (view === 'day') {
      return appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        return appointmentDate.toDateString() === selectedDate.toDateString();
      }).sort((a, b) => {
        return a.time.localeCompare(b.time);
      });
    } else { // week view
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - (selectedDate.getDay() + 6) % 7); // Adjust to Monday
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
      endOfWeek.setHours(23, 59, 59, 999);

      return appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
      }).sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime() || a.time.localeCompare(b.time);
      });
    }
  }, [selectedDate, appointments, view]);

  const getWeekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - (selectedDate.getDay() + 6) % 7); // Adjust to Monday
    startOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  }, [selectedDate]);

  const renderAppointmentCard = (appointment: Appointment) => (
    <TouchableOpacity
      key={appointment.id}
      style={styles.appointmentCard}
      onPress={() => handleAppointmentDetails(appointment.id)}
    >
      <View style={styles.appointmentHeader}>
        <View style={styles.timeContainer}>
          <Clock size={16} color="#666" />
          <Text style={styles.appointmentTime}>
            {formatTime(appointment.time)} • {formatDuration(appointment.duration)}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: `${getAppointmentColor(appointment)}25` }
        ]}>
          <Text style={[
            styles.statusText,
            { color: getAppointmentColor(appointment) }
          ]}>
            {appointment.status === 'en_attente' && 'En attente'}
            {appointment.status === 'confirme' && 'Confirmé'}
            {appointment.status === 'annule' && 'Annulé'}
            {appointment.status === 'termine' && 'Terminé'}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentContent}>
        <Text style={styles.appointmentDescription}>
          {appointment.description ?? ''}
        </Text>

        <View style={styles.locationContainer}>
          <MapPin size={16} color="#666" />
          <Text style={styles.locationText}>{appointment.location ?? ''}</Text>
        </View>

        <View style={styles.boatInfo}>
          <Boat size={16} color="#666" />
          <Text style={styles.boatText}>
            {appointment.boat.name} • {appointment.boat.type}
          </Text>
        </View>

        {appointment.boatManager && (
          <View style={styles.boatManagerInfo}>
            <User size={16} color="#0066CC" />
            <Text style={styles.boatManagerName}>{appointment.boatManager.name}</Text>
          </View>
        )}

        {appointment.nauticalCompany && (
          <View style={styles.boatManagerInfo}>
            <Building size={16} color="#0066CC" />
            <Text style={styles.boatManagerName}>{appointment.nauticalCompany.name}</Text>
          </View>
        )}

        <View style={styles.clientInfo}>
          <View style={styles.clientDetails}>
            <User size={16} color="#666" />
            <Text style={styles.clientName}>{appointment.client.name}</Text>
          </View>
          <View style={styles.clientActions}>
            <TouchableOpacity
              style={styles.clientAction}
              onPress={() => handleMessage(appointment.client.id)}
            >
              <MessageSquare size={20} color="#0066CC" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.clientAction}
              onPress={() => handleClientDetails(appointment.client.id)}
            >
              <FileText size={20} color="#0066CC" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.appointmentFooter}>
        <Text style={styles.viewDetails}>Voir les détails</Text>
        <ChevronRight size={20} color="#0066CC" />
      </View>

      {/* Boutons Accepter/Refuser si le RDV est en attente et que l'utilisateur est l'invité */}
      {appointment.status === 'en_attente' && appointment.invite?.id === user?.id && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'space-around' }}>
          <TouchableOpacity
            style={{ backgroundColor: '#10B981', padding: 10, borderRadius: 8 }}
            onPress={() => updateAppointmentStatus(appointment.id, 'confirme')}
          >
            <Text style={{ color: 'white' }}>Accepter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ backgroundColor: '#DC2626', padding: 10, borderRadius: 8 }}
            onPress={() => updateAppointmentStatus(appointment.id, 'annule')}
          >
            <Text style={{ color: 'white' }}>Refuser</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const updateAppointmentStatus = async (appointmentId: string, newStatus: 'confirme' | 'annule') => {
    const { error } = await supabase
      .from('rendez_vous')
      .update({ statut: newStatus })
      .eq('id', Number(appointmentId));

    if (error) {
      Alert.alert('Erreur', `Impossible de mettre à jour le statut: ${error.message}`);
    } else {
      Alert.alert('Succès', `Rendez-vous ${newStatus === 'confirme' ? 'accepté' : 'refusé'}`);
      // Recharger la liste des rendez-vous
      const refreshedAppointments = appointments.map(appt =>
        appt.id === appointmentId ? { ...appt, status: newStatus } : appt
      );
      setAppointments(refreshedAppointments);
    }
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 07h to 21h
    const hourHeight = 60; // pixels per hour

    return (
      <View style={styles.planningContainer}>
        <View style={styles.dayViewHeader}>
          <TouchableOpacity onPress={handlePreviousDay}>
            <ChevronLeft size={24} color="#0066CC" />
          </TouchableOpacity>
          <Text style={styles.selectedDateText}>
            {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <TouchableOpacity onPress={handleNextDay}>
            <ChevronRight size={24} color="#0066CC" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.dayViewContent}>
          <View style={styles.timeColumn}>
            {hours.map(hour => (
              <View key={hour} style={[styles.timeSlot, { height: hourHeight }]}>
                <Text style={styles.timeText}>{`${hour.toString().padStart(2, '0')}h00`}</Text>
              </View>
            ))}
          </View>
          <View style={styles.appointmentsColumn}>
            {hours.map(hour => (
              <View key={hour} style={[styles.hourLine, { height: hourHeight }]} />
            ))}
            {filteredAppointments.map(appointment => {
              const appTime = appointment.time ? new Date(`2000-01-01T${appointment.time}`) : null;
              if (!appTime) return null;

              const startHour = appTime.getHours();
              const startMinutes = appTime.getMinutes();
              const durationMinutes = appointment.duration || 60;

              const topOffset = ((startHour - 7) * hourHeight) + (startMinutes / 60) * hourHeight;
              const appHeight = (durationMinutes / 60) * hourHeight;

              const statusColor = getAppointmentColor(appointment);

              return (
                <TouchableOpacity
                  key={appointment.id}
                  style={[
                    styles.dayAppointmentCard,
                    {
                      top: topOffset,
                      height: appHeight,
                      backgroundColor: `${statusColor}15`,
                      borderColor: statusColor,
                    }
                  ]}
                  onPress={() => handleAppointmentDetails(appointment.id)}
                >
                  <Text style={styles.dayAppointmentTitle} numberOfLines={1}>{appointment.description}</Text>
                  <Text style={styles.dayAppointmentTime} numberOfLines={1}>{formatTime(appointment.time)} - {appointment.client.name}</Text>
                  <Text style={styles.dayAppointmentBoat} numberOfLines={1}>{appointment.boat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderWeekView = () => {
    const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(selectedDate);
      date.setDate(selectedDate.getDate() - (selectedDate.getDay() + 6) % 7 + i); // Adjust to Monday
      return date;
    });

    const hours = Array.from({ length: 15 }, (_, i) => i + 7); // 07h to 21h
    const hourHeight = 60; // pixels per hour

    return (
      <View style={styles.planningContainer}>
        <View style={styles.weekViewHeader}>
          <TouchableOpacity onPress={handlePreviousDay}>
            <ChevronLeft size={24} color="#0066CC" />
          </TouchableOpacity>
          <Text style={styles.selectedDateText}>
            Semaine du {daysOfWeek[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au {daysOfWeek[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={handleNextDay}>
            <ChevronRight size={24} color="#0066CC" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekViewGrid}>
          {/* Time Axis */}
          <View style={styles.timeAxis}>
            {hours.map(hour => (
              <View key={hour} style={[styles.timeAxisHour, { height: hourHeight }]}>
                <Text style={styles.timeAxisText}>{`${hour.toString().padStart(2, '0')}h`}</Text>
              </View>
            ))}
          </View>

          {/* Day Columns with Appointments */}
          <ScrollView horizontal contentContainerStyle={styles.weekDaysContainer}>
  {daysOfWeek.map(day => (
    <View key={day.toDateString()} style={styles.weekDayColumn}>
      <View style={styles.weekDayHeader}>
        <Text style={styles.weekDayName}>
          {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
        </Text>
        <Text style={styles.weekDayDate}>
          {day.getDate()}
        </Text>
      </View>
      <View style={styles.dayAppointmentsGrid}>
        {hours.map(hour => (
          <View key={hour} style={[styles.hourSlot, { height: hourHeight }]} />
        ))}

        {hours.map(hour =>
          filteredAppointments
            .filter(app => {
              const appDate = new Date(app.date);
              const appHour = parseInt(app.time.split(':')[0]);
              return appDate.toDateString() === day.toDateString() && appHour === hour;
            })
            .map(app => (
              <TouchableOpacity
                key={app.id}
                style={[
                  styles.appointmentBlock,
                  { backgroundColor: getAppointmentColor(app) },
                  { height: (app.duration / 60) * hourHeight },
                  { top: (parseInt(app.time.split(':')[1]) / 60) * hourHeight },
                ]}
                onPress={() => handleAppointmentDetails(app.id)}
              >
                <Text style={{ fontSize: 10, color: 'white' }} numberOfLines={1}>
                  {app.client.name}
                </Text>
              </TouchableOpacity>
            ))
        )}
      </View>
    </View>
  ))}
</ScrollView>
        </View>
      </View>
    );
  };

 return (
  <View style={styles.container}>
    {/* Header */}
    <View style={styles.header}>
      <View style={styles.dateNavigation}>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={handlePreviousDay}
        >
          <ChevronLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.currentDate}>
          {view === 'day'
            ? formatDate(selectedDate)
            : `Semaine du ${formatDate(getWeekDays[0])}`}
        </Text>
        <TouchableOpacity
          style={styles.navigationButton}
          onPress={handleNextDay}
        >
          <ChevronRight size={24} color="#1a1a1a" />
        </TouchableOpacity>
      </View>

      <View style={styles.headerActions}>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewButton, view === 'day' && styles.activeViewButton]}
            onPress={() => setView('day')}
          >
            <Text style={[styles.viewButtonText, view === 'day' && styles.viewButtonTextActive]}>
              Jour
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewButton, view === 'week' && styles.activeViewButton]}
            onPress={() => setView('week')}
          >
            <Text style={[styles.viewButtonText, view === 'week' && styles.viewButtonTextActive]}>
              Semaine
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddAppointment}
        >
          <Plus size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>

    {/* Vue Jour ou Semaine */}
{view === 'day' ? (
  <ScrollView style={{ flex: 1, padding: 20 }}>
    {filteredAppointments.length === 0 ? (
      <View style={styles.emptyState}>
        <CalendarIcon size={48} color="#666" />
        <Text style={styles.emptyStateTitle}>Aucun rendez-vous</Text>
        <Text style={styles.emptyStateText}>
          Vous n'avez pas de rendez-vous prévu pour cette journée
        </Text>
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={handleAddAppointment}
        >
          <Plus size={20} color="white" />
          <Text style={styles.emptyStateButtonText}>Ajouter un rendez-vous</Text>
        </TouchableOpacity>
      </View>
    ) : (
      filteredAppointments.map(renderAppointmentCard)
    )}
  </ScrollView>
) : (
  <View style={{ flex: 1, paddingTop: 10, backgroundColor: '#fff' }}>
    {/* Déclaration ici */}
    {(() => {
      const hourHeight = 60;
      return (
        <>
          {/* En-tête des jours */}
          <View style={{ flexDirection: 'row', marginLeft: 50 }}>
            {getWeekDays.map((day, index) => (
              <View key={index} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, color: '#666', textTransform: 'capitalize' }}>
                  {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
                  {day.getDate()}
                </Text>
              </View>
            ))}
          </View>

          {/* Grille horaire fixe */}
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {/* Colonne des heures */}
            <View style={{ width: 50 }}>
              {Array.from({ length: 15 }, (_, i) => 7 + i).map(hour => (
                <View key={hour} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#666' }}>{hour.toString().padStart(2, '0')}h</Text>
                </View>
              ))}
            </View>

            {/* Colonnes des jours avec rendez-vous */}
            <View style={{ flex: 1, flexDirection: 'row' }}>
              {getWeekDays.map((day, dayIndex) => (
                <View key={dayIndex} style={{ flex: 1 }}>
                  {Array.from({ length: 15 }).map((_, hourIndex) => (
                    <View
                      key={hourIndex}
                      style={{
                        flex: 1,
                        borderWidth: 0.5,
                        borderColor: '#eee',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      {/* Affichage des rendez-vous */}
                      {filteredAppointments.map((appt, i) => {
                        const apptDate = new Date(appt.date);
                        const apptHour = parseInt(appt.time.split(':')[0], 10);
                        const apptMinutes = parseInt(appt.time.split(':')[1], 10);
                        const duration = appt.duration || 60;
                        const hour = 7 + hourIndex;

                        if (apptDate.toDateString() === day.toDateString() && apptHour === hour) {
                          const height = (duration / 60) * hourHeight;
                          const offsetTop = (apptMinutes / 60) * hourHeight;
                          const color = getAppointmentColor(appt);

                          return (
                            <TouchableOpacity
                              key={i}
                              style={{
                                position: 'absolute',
                                top: offsetTop,
                                left: 2,
                                right: 2,
                                height,
                                backgroundColor: color,
                                borderRadius: 4,
                                padding: 4,
                                justifyContent: 'center',
                                zIndex: 1,
                              }}
                              onPress={() => handleAppointmentDetails(appt.id)}
                            >
                              <Text style={{ fontSize: 10, color: 'white' }} numberOfLines={1}>
                                {appt.client.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        }

                        return null;
                      })}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        </>
      );
    })()}
  </View>
)}


    {/* Modal ajout RDV */}
    <AddAppointmentModal
      visible={showAddModal}
      onClose={() => setShowAddModal(false)}
      initialAppointment={newAppointment}
      mode={newAppointment.id ? 'edit' : 'new'}
      allClients={allClients}
      allBoatManagers={allBoatManagers}
      allNauticalCompanies={allNauticalCompanies}
      allServiceCategories={allServiceCategories}
      onSaveAppointment={handleSaveAppointment}
    />
  </View>
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
  header: {
    backgroundColor: 'white',
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navigationButton: {
    padding: 8,
  },
  currentDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  viewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeViewButton: {
    backgroundColor: 'white',
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
  viewButtonText: {
    fontSize: 14,
    color: '#666',
  },
  viewButtonTextActive: {
    color: '#0066CC',
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  appointmentsList: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  appointmentContent: {
    padding: 16,
    gap: 12,
  },
  appointmentDescription: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  boatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatText: {
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
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  boatManagerName: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
  clientInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  clientDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  clientActions: {
    flexDirection: 'row',
    gap: 12,
  },
  clientAction: {
    padding: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  appointmentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  viewDetails: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
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
    maxHeight: '90%',
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
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalItemSubtext: {
    fontSize: 14,
    color: '#666',
  },
  emptyModalState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formScrollView: {
    maxHeight: 500,
  },
  formSection: {
    padding: 20,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  formField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  formFieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formFieldContent: {
    flex: 1,
  },
  formFieldLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  formFieldValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  formFieldPlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
  },
  formInput: {
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeOptionText: {
    fontSize: 14,
    color: '#666',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  companyToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#0066CC',
  },
  toggleButtonInactive: {
    backgroundColor: '#e2e8f0',
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  toggleIndicatorActive: {
    backgroundColor: 'white',
    alignSelf: 'flex-end',
  },
  toggleIndicatorInactive: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  companyToggleLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  planningContainer: {
    height: 800, // Fixed height for the planning area
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
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
  dayViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedDateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  dayViewContent: {
    flexDirection: 'row',
    flex: 1,
  },
  timeColumn: {
    width: 60,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  timeSlot: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  appointmentsColumn: {
    flex: 1,
    position: 'relative',
  },
  hourLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayAppointmentCard: {
    position: 'absolute',
    left: 5,
    right: 5,
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 4,
    justifyContent: 'center',
    minHeight: 30,
  },
  dayAppointmentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dayAppointmentTime: {
    fontSize: 12,
    color: '#666',
  },
  dayAppointmentBoat: {
    fontSize: 12,
    color: '#666',
  },
  weekViewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekViewGrid: {
    flexDirection: 'row',
    flex: 1,
  },
  timeAxis: {
    width: 60,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    paddingTop: 55, // Space for day headers
  },
  timeAxisHour: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  timeAxisText: {
    fontSize: 12,
    color: '#666',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    flexGrow: 1,
  },
  weekDayColumn: {
    flex: 1,
    minWidth: 100, // Minimum width for each day column
    borderRightWidth: 0.5,
    borderRightColor: '#e0e0e0',
  },
  weekDayHeader: {
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekDayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  weekDayDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dayAppointmentsGrid: {
    flex: 1,
  },
  hourSlot: {
    height: 60,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
    position: 'relative',
  },
  appointmentBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 4,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  appointmentBlockText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  emptyHourSlot: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyDayState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
