import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Alert } from 'react-native';
import { Calendar as CalendarIcon, Clock, Bot as Boat, MapPin, User, ChevronRight, ChevronLeft, MessageSquare, FileText, Plus, X, Check, Building, Search } from 'lucide-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'; // Import useLocalSearchParams and useFocusEffect
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Appointment {
  id: string; // Keep as string for consistency in UI, but DB is integer
  date: string;
  time: string;
  duration: number | null; // Can be null if not set
  type: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
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
  categories: Array<{ id: number; description1: string; }>; // Changed from services: string[]
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  hasNewRequests?: boolean;
  ports: Array<{ id: number; name: string; }>; // All ports the company operates in
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
  // Seconds part is ignored for minute conversion, but could be parsed if needed
  return hours * 60 + minutes;
}

// Client selection modal (Now defined inside AddAppointmentModal)
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
      onRequestRequestClose={onClose}
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Boat selection modal (Now defined inside AddAppointmentModal)
const BoatSelectionModal = ({ visible, onClose, onSelectBoat, selectedClient }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestRequestClose={onClose}
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
        
        {selectedClient && selectedClient.boats && selectedClient.boats.length > 0 ? ( // MODIFIED LINE
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

// Boat Manager selection modal (Now defined inside AddAppointmentModal)
const BoatManagerSelectionModal = ({ visible, onClose, onSelectBoatManager, boatManagers }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestRequestClose={onClose}
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
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// Nautical Company selection modal (Now defined inside AddAppointmentModal)
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
      onRequestRequestClose={onClose}
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
      onRequestRequestClose={onClose}
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
  selectedClient,
  selectedBoat,
  selectedBoatManager,
  selectedNauticalCompany, // New prop
  withBoatManager,
  withNauticalCompany, // New prop
  setWithBoatManager,
  setWithNauticalCompany, // New prop
  onSaveAppointment, // Renamed prop
  getAppointmentColor,
  getAppointmentLabel,
  handleSelectClient: parentHandleSelectClient, // Renamed to avoid conflict
  handleSelectBoat: parentHandleSelectBoat, // Renamed to avoid conflict
  handleSelectBoatManager: parentHandleSelectBoatManager, // Renamed to avoid conflict
  handleSelectNauticalCompany: parentHandleSelectNauticalCompany, // Renamed to avoid conflict
  allClients, // All clients for selection
  allBoatManagers, // All boat managers for selection
  allNauticalCompanies, // All nautical companies for selection
  allServiceCategories, // All service categories for selection
}) => {
  const { user } = useAuth();
  // Local state for the form fields
  const [localAppointment, setLocalAppointment] = useState(initialAppointment);
  const [initialBoatPlaceDePort, setInitialBoatPlaceDePort] = useState<string | undefined>(undefined);

  // Local states for nested modals visibility
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [showBoatManagerModal, setShowBoatManagerModal] = useState(false);
  const [showNauticalCompanyModal, setShowNauticalCompanyModal] = useState(false);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false); // New state for service type modal
  const [isScheduleDatePickerVisible, setIsScheduleDatePickerVisible] = useState(false);


  // Sync local state with prop when initialAppointment changes (e.g., modal opens)
  useEffect(() => {
    setLocalAppointment(initialAppointment);
    // Ensure initialBoatPlaceDePort is set correctly, handling null/undefined
    setInitialBoatPlaceDePort(initialAppointment.boat?.place_de_port ?? undefined);

    // Pre-fill selectedClient and selectedBoat if initialAppointment has them
    if (initialAppointment.id) { // Only if it's an existing appointment being edited
      const client = allClients.find(c => c.id === initialAppointment.client?.id);
      if (client) {
        parentHandleSelectClient(client);
      }
      const boat = client?.boats.find(b => b.id === initialAppointment.boat?.id);
      if (boat) {
        parentHandleSelectBoat(boat);
      }
      // Pre-fill nautical company if exists
      if (initialAppointment.nauticalCompany?.id) {
        const nc = allNauticalCompanies.find(c => c.id === initialAppointment.nauticalCompany?.id);
        if (nc) {
          parentHandleSelectNauticalCompany(nc);
          setWithNauticalCompany(true);
        }
      } else {
        setWithNauticalCompany(false);
      }
    }
  }, [initialAppointment, allClients, allNauticalCompanies]); // Add allClients and allNauticalCompanies to dependencies


  const handleLocalDateConfirm = (date: Date) => {
    setLocalAppointment(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
    setIsScheduleDatePickerVisible(false);
  };

  const handleLocalSave = useCallback(async () => { // Renamed local function
    if (!validateAppointmentForm(localAppointment)) return;
    
    // 1. Update place_de_port in 'boat' table if changed
    if (selectedBoat?.id && localAppointment.location !== initialBoatPlaceDePort) {
      try {
        const { error: updateBoatError } = await supabase
          .from('boat')
          .update({ place_de_port: localAppointment.location })
          .eq('id', Number(selectedBoat.id)); // Ensure ID is Number

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
        .select('id, heure, duree') // Select id to exclude current appointment from conflict check
        .eq('date_rdv', localAppointment.date)
        .eq('id_boat_manager', Number(user?.id)); // Ensure ID is Number

      if (fetchError) {
        console.error('Error fetching existing appointments:', fetchError);
        Alert.alert('Erreur', 'Impossible de vérifier les conflits d\'horaire.');
        return;
      }

      const conflictFound = existingAppointments.some(existingAppt => {
        // Exclude the current appointment if editing
        if (localAppointment.id && existingAppt.id.toString() === localAppointment.id) { // Convert existingAppt.id to string for comparison
          return false;
        }

        const existingApptStartMinutes = timeToMinutes(existingAppt.heure);
        const existingApptEndMinutes = existingApptStartMinutes + durationToMinutes(existingAppt.duree);

        // Check for overlap: (start1 < end2) AND (end1 > start2)
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

    // Convert duration from minutes to HH:MM:SS format
    const durationInTimeFormat = convertMinutesToTimeFormat(localAppointment.duration || 0);

    // Prepare data for insertion/update
    const rendezVousData = {
      id_client: Number(selectedClient!.id), // Ensure ID is Number
      id_boat_manager: Number(user?.id), // Ensure ID is Number
      id_boat: Number(selectedBoat!.id), // Ensure ID is Number
      id_companie: withNauticalCompany ? Number(selectedNauticalCompany?.id) : null, // Ensure ID is Number
      id_categorie_service: serviceId,
      description: localAppointment.description,
      date_rdv: localAppointment.date,
      heure: localAppointment.time,
      duree: durationInTimeFormat, // Use the converted duration
      statut: 'en_attente',
    };

    let result;
    if (localAppointment.id) {
      // Update existing appointment
      result = await supabase
        .from('rendez_vous')
        .update(rendezVousData)
        .eq('id', Number(localAppointment.id)) // Ensure ID is Number
        .select('id') // Select id to return the updated row's id
        .single();
    } else {
      // Insert new appointment
      result = await supabase
        .from('rendez_vous')
        .insert([rendezVousData])
        .select('id') // Select id to return the new row's id
        .single();
    }

    if (result.error) {
      console.error('Error saving rendez_vous:', result.error);
      Alert.alert('Erreur', `Échec de l'enregistrement du rendez-vous: ${result.error.message}`);
    } else {
      Alert.alert(
        'Succès',
        'Le rendez-vous a été enregistré avec succès.',
        [
          {
            text: 'OK',
            onPress: () => {
              onSaveAppointment({ // Pass a complete Appointment object for local state update
                id: result.data.id.toString(), // Convert to string for Appointment interface
                date: localAppointment.date!,
                time: localAppointment.time!,
                duration: localAppointment.duration || 60,
                type: localAppointment.type,
                status: 'scheduled',
                client: {
                  id: selectedClient!.id,
                  name: selectedClient!.name,
                  avatar: selectedClient!.avatar,
                },
                boat: {
                  id: selectedBoat!.id,
                  name: selectedBoat!.name,
                  type: selectedBoat!.type,
                  place_de_port: localAppointment.location,
                },
                location: localAppointment.location || null, // Use null if empty
                description: localAppointment.description || null, // Use null if empty
                boatManager: {
                  id: user?.id || '',
                  name: `${user?.firstName} ${user?.lastName}` || '',
                },
                nauticalCompany: withNauticalCompany ? {
                  id: selectedNauticalCompany!.id,
                  name: selectedNauticalCompany!.name,
                } : null, // Ensure it's null if id_companie is null
              }, !!localAppointment.id); // Pass true if editing
              onClose(); // Close the modal
            }
          }
        ]
      );
    }
  }, [localAppointment, selectedClient, selectedBoat, withNauticalCompany, selectedNauticalCompany, initialBoatPlaceDePort, user, onSaveAppointment, onClose]);

  const validateAppointmentForm = (appointmentData: Partial<Appointment>) => {
    if (!selectedClient) {
      Alert.alert('Erreur', 'Veuillez sélectionner un client');
      return false;
    }
    
    if (!selectedBoat) {
      Alert.alert('Erreur', 'Veuillez sélectionner un bateau');
      return false;
    }
    
    if (withNauticalCompany && !selectedNauticalCompany) { // New validation
      Alert.alert('Erreur', 'Veuillez sélectionner une entreprise du nautisme');
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

  const filteredNauticalCompanies = useMemo(() => {
    if (!localAppointment.type) return []; // No service type selected, no companies

    return allNauticalCompanies.filter(company => 
      company.categories.some(cat => cat.description1 === localAppointment.type)
    );
  }, [localAppointment.type, allNauticalCompanies]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{localAppointment.id ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</Text>
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
                  <Text style={styles.formFieldLabel}>Client</Text>
                  <Text style={selectedClient ? styles.formFieldValue : styles.formFieldPlaceholder}>
                    {selectedClient ? selectedClient.name : 'Sélectionner un client'}
                  </Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.formField}
                onPress={() => {
                  if (selectedClient) {
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
                  <Text style={selectedBoat ? styles.formFieldValue : styles.formFieldPlaceholder}>
                    {selectedBoat ? `${selectedBoat.name} (${selectedBoat.type})` : 'Sélectionner un bateau'}
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
                    onPress={() => setIsScheduleDatePickerVisible(true)} // Open date picker
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
                  <TextInput
                    style={styles.formInput}
                    value={localAppointment.time}
                    onChangeText={(text) => setLocalAppointment(prev => ({ ...prev, time: text }))}
                    placeholder="HH:MM"
                  />
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
                    value={localAppointment.duration != null ? localAppointment.duration.toString() : ''} // Handle null duration
                    onChangeText={(text) => {
                      const parsedValue = parseInt(text, 10);
                      setLocalAppointment(prev => ({
                        ...prev,
                        duration: isNaN(parsedValue) ? null : parsedValue // Set to null if cleared or invalid
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
                    onPress={() => setShowServiceTypeModal(true)} // Open service type picker
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
                    value={localAppointment.location || ''} // Handle null location
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
                    value={localAppointment.description || ''} // Handle null description
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
              <Text style={styles.formSectionTitle}>Avec une entreprise du nautisme</Text>
              <View style={styles.companyToggleContainer}>
                <Text style={styles.companyToggleLabel}>Associer une entreprise</Text>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton, 
                    withNauticalCompany ? styles.toggleButtonActive : styles.toggleButtonInactive
                  ]}
                  onPress={() => setWithNauticalCompany(!withNauticalCompany)}
                >
                  <View style={[
                    styles.toggleIndicator, 
                    withNauticalCompany ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive
                  ]} />
                </TouchableOpacity>
              </View>

              {withNauticalCompany && (
                <TouchableOpacity 
                  style={styles.formField}
                  onPress={() => setShowNauticalCompanyModal(true)}
                >
                  <View style={styles.formFieldIcon}>
                    <Building size={20} color="#0066CC" />
                  </View>
                  <View style={styles.formFieldContent}>
                    <Text style={selectedNauticalCompany ? styles.formFieldValue : styles.formFieldPlaceholder}>
                      {selectedNauticalCompany ? selectedNauticalCompany.name : 'Sélectionner une entreprise du nautisme'}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </TouchableOpacity>
              )}
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
              onPress={handleLocalSave} // Call the renamed local function
            >
              <Check size={20} color="white" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {Platform.OS !== 'web' && (
        <DateTimePickerModal
          isVisible={isScheduleDatePickerVisible}
          mode="date"
          onConfirm={handleLocalDateConfirm}
          onCancel={() => setIsScheduleDatePickerVisible(false)}
        />
      )}

      {/* Nested Modals */}
      <ClientSelectionModal 
        visible={showClientModal} 
        onClose={() => setShowClientModal(false)} 
        onSelectClient={(client) => {
          parentHandleSelectClient(client); // Update parent state
          setShowClientModal(false); // Close this modal
        }} 
        clients={allClients} 
      />
      <BoatSelectionModal 
        visible={showBoatModal} 
        onClose={() => setShowBoatModal(false)} 
        onSelectBoat={(boat) => {
          parentHandleSelectBoat(boat); // Update parent state
          setShowBoatModal(false); // Close this modal
        }} 
        selectedClient={selectedClient} 
      />
      <BoatManagerSelectionModal 
        visible={showBoatManagerModal} 
        onClose={() => setShowBoatManagerModal(false)} 
        onSelectBoatManager={(manager) => {
          parentHandleSelectBoatManager(manager); // Update parent state
          setShowBoatManagerModal(false); // Close this modal
        }} 
        boatManagers={allBoatManagers} 
      />
      <NauticalCompanySelectionModal 
        visible={showNauticalCompanyModal} 
        onClose={() => setShowNauticalCompanyModal(false)} 
        onSelectNauticalCompany={(company) => {
          parentHandleSelectNauticalCompany(company); // Update parent state
          setShowNauticalCompanyModal(false); // Close this modal
        }} 
        nauticalCompanies={filteredNauticalCompanies} 
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
  const [appointments, setAppointments] = useState<Appointment[]>([]); // Initialize as empty
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [isScheduleDatePickerVisible, setIsScheduleDatePickerVisible] = useState(false);

  // Data for modals
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allBoatManagers, setAllBoatManagers] = useState<BoatManager[]>([]);
  const [allNauticalCompanies, setAllNauticalCompanies] = useState<NauticalCompany[]>([]);
  const [allServiceCategories, setAllServiceCategories] = useState<Array<{id: number; description1: string}>>([]);

  // New appointment form state
  const [newAppointment, setNewAppointment] = useState<Partial<Appointment>>({
    date: selectedDate.toISOString().split('T')[0],
    time: '09:00',
    duration: 60,
    type: '', // Default type is now empty
    status: 'scheduled',
    location: null, // Set to null
    description: null, // Set to null
  });
  
  // Selected client and boat for new appointment
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedBoat, setSelectedBoat] = useState<Client['boats'][0] | null>(null);
  const [selectedBoatManager, setSelectedBoatManager] = useState<BoatManager | null>(null);
  const [selectedNauticalCompany, setSelectedNauticalCompany] = useState<NauticalCompany | null>(null); 
  const [withBoatManager, setWithBoatManager] = useState(false);
  const [withNauticalCompany, setWithNauticalCompany] = useState(false); 

  // Get editAppointmentId from URL params
  const { editAppointmentId } = useLocalSearchParams();

  // useFocusEffect to refetch appointments when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchPlanningData = async () => {
        if (!user?.id) return;

        // Fetch appointments
        const { data: rdvData, error: rdvError } = await supabase
          .from('rendez_vous')
          .select(`
            id,
            date_rdv,
            heure,
            duree,
            description,
            statut,
            users!id_client(id, first_name, last_name, avatar),
            boat(id, name, type, place_de_port),
            id_companie(id, company_name),
            categorie_service(description1)
          `)
          .eq('id_boat_manager', Number(user.id)); // Filter by current boat manager, ensure ID is Number

        if (rdvError) {
          console.error('Error fetching appointments:', rdvError);
        } else {
          const formattedAppointments: Appointment[] = rdvData.map(rdv => {
            // Parse duration from "HH:MM:SS" to minutes
            let durationInMinutes: number | null = null; // Initialize as null
            if (typeof rdv.duree === 'string') {
              const parts = rdv.duree.split(':');
              if (parts.length >= 3) { // Expecting HH:MM:SS or similar
                const hours = parseInt(parts[0], 10); // Assuming parts[0] is hours
                const minutes = parseInt(parts[1], 10); // Assuming parts[1] is minutes
                durationInMinutes = hours * 60 + minutes;
              } else if (parts.length === 2) { // Fallback for HH:MM
                const hours = parseInt(parts[0], 10);
                const minutes = parseInt(parts[1], 10);
                durationInMinutes = hours * 60 + minutes;
              }
            } else if (typeof rdv.duree === 'number') {
              durationInMinutes = rdv.duree;
            }
            
            return {
              id: rdv.id.toString(),
              date: rdv.date_rdv,
              time: rdv.heure,
              duration: durationInMinutes,
              type: rdv.categorie_service?.description1 || 'unknown',
              status: rdv.statut,
              client: {
                id: rdv.users.id.toString(),
                name: `${rdv.users.first_name} ${rdv.users.last_name}`,
                avatar: rdv.users.avatar,
              },
              boat: {
                id: rdv.boat.id.toString(),
                name: rdv.boat.name,
                type: rdv.boat.type,
                place_de_port: rdv.boat.place_de_port,
              },
              location: rdv.boat.place_de_port || null, // Use null if empty
              nauticalCompany: rdv.id_companie ? { // Corrected access to id_companie
                id: rdv.id_companie.id.toString(),
                name: rdv.id_companie.company_name,
              } : null, // Ensure it's null if id_companie is null
              description: rdv.description || null, // Use null if empty
            };
          });
          setAppointments(formattedAppointments);
        }

        // Fetch clients for the current BM
        const { data: bmPorts, error: bmPortsError } = await supabase
          .from('user_ports')
          .select('port_id')
          .eq('user_id', Number(user.id)); // Ensure ID is Number

        if (bmPortsError) {
          console.error('Error fetching boat manager ports:', bmPortsError);
          return;
        }
        const managedPortIds = bmPorts.map(p => p.port_id);

        if (managedPortIds.length > 0) {
          const { data: clientPortAssignments, error: clientPortError } = await supabase
            .from('user_ports')
            .select('user_id')
            .in('port_id', managedPortIds);

          if (clientPortError) {
            console.error('Error fetching client port assignments:', clientPortError);
            return;
          }
          
          const uniqueClientIds = [...new Set(clientPortAssignments.map(cpa => cpa.user_id))];

          if (uniqueClientIds.length > 0) {
            const { data: clientsData, error: clientsError } = await supabase
              .from('users')
              .select('id, first_name, last_name, avatar, boat(id, name, type, place_de_port)')
              .in('id', uniqueClientIds)
              .eq('profile', 'pleasure_boater');

            if (clientsError) {
              console.error('Error fetching clients:', clientsError);
            } else {
              setAllClients(clientsData.map(c => ({
                id: c.id.toString(), // Ensure ID is string
                name: `${c.first_name} ${c.last_name}`,
                avatar: c.avatar,
                boats: c.boat || []
              })) as Client[]);
            }
          }
        }

        // Fetch service categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categorie_service')
          .select('id, description1');
        if (categoriesError) {
          console.error('Error fetching service categories:', categoriesError);
        } else {
          setAllServiceCategories(categoriesData);
        }

        // Fetch nautical companies for the current BM's ports
        const { data: companyUsers, error: companyUsersError } = await supabase
          .from('users')
          .select('id, company_name, user_categorie_service(categorie_service(id, description1)), user_ports(port_id, ports(name))')
          .eq('profile', 'nautical_company');

        if (companyUsersError) {
          console.error('Error fetching nautical companies:', companyUsersError);
        } else {
          const companiesForBM: NauticalCompany[] = [];
          for (const company of companyUsers) {
            const companyPortIds = company.user_ports.map((up: any) => up.port_id);
            const commonPorts = managedPortIds.filter(bmPid => companyPortIds.includes(bmPid));

            if (commonPorts.length > 0) {
              companiesForBM.push({
                id: company.id.toString(), // Ensure ID is string
                name: company.company_name,
                logo: '', // Not fetching logo here, can be added if needed
                location: company.user_ports.find((up: any) => up.port_id === commonPorts[0])?.ports?.name || '',
                categories: company.user_categorie_service.map((ucs: any) => ({
                  id: ucs.categorie_service.id,
                  description1: ucs.categorie_service.description1
                })),
                contactName: '', contactEmail: '', contactPhone: '', // Not fetching contact info here
                ports: company.user_ports.map((up: any) => ({ id: up.port_id, name: up.ports.name }))
              });
            }
          }
          setAllNauticalCompanies(companiesForBM);
        }
      };

      fetchPlanningData();

      // Handle editAppointmentId from params
      if (editAppointmentId) {
        const fetchAppointmentForEdit = async () => {
          const { data, error: rdvError } = await supabase
            .from('rendez_vous')
            .select(`
              id,
              date_rdv,
              heure,
              duree,
              description,
              statut,
              users!id_client(id, first_name, last_name, avatar),
              boat(id, name, type, place_de_port),
              id_companie(id, company_name),
              categorie_service(description1)
            `)
            .eq('id', Number(editAppointmentId)) // Ensure ID is Number
            .single();

          if (rdvError) {
            console.error('Error fetching appointment for edit:', rdvError);
            Alert.alert('Erreur', 'Impossible de charger le rendez-vous pour modification.');
          } else if (data) {
            // Parse duration from "HH:MM:SS" to minutes, handling null
            let durationInMinutes: number | null = null; // Initialize as null
            if (typeof data.duree === 'string') {
              const parts = data.duree.split(':');
              if (parts.length >= 3) {
                const hours = parseInt(parts[0], 10);
                const minutes = parseInt(parts[1], 10);
                durationInMinutes = hours * 60 + minutes;
              } else if (parts.length === 2) {
                const hours = parseInt(parts[0], 10);
                const minutes = parseInt(parts[1], 10);
                durationInMinutes = hours * 60 + minutes;
              }
            } else if (typeof data.duree === 'number') {
              durationInMinutes = data.duree;
            }

            const clientData = {
              id: data.users.id.toString(),
              name: `${data.users.first_name} ${data.users.last_name}`,
              avatar: data.users.avatar,
            };
            const boatData = {
              id: data.boat.id.toString(),
              name: data.boat.name,
              type: data.boat.type,
              place_de_port: data.boat.place_de_port,
            };
            const nauticalCompanyData = data.id_companie ? {
              id: data.id_companie.id.toString(),
              name: data.id_companie.company_name,
            } : null; // Ensure it's null if id_companie is null

            setSelectedClient(clientData);
            setSelectedBoat(boatData);
            setSelectedNauticalCompany(nauticalCompanyData);
            setWithNauticalCompany(!!nauticalCompanyData);

            setNewAppointment({
              id: data.id.toString(), // Convert to string for Appointment interface
              date: data.date_rdv,
              time: data.heure,
              duration: durationInMinutes,
              type: data.categorie_service?.description1 || '',
              status: data.statut,
              location: data.boat.place_de_port || null, // Use null if empty
              description: data.description || null, // Use null if empty
            });
            setShowAddModal(true);
          }
        };
        fetchAppointmentForEdit();
      }
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

  const formatDuration = (duration: number | null) => { // Handle null duration
    if (duration === null || isNaN(duration) || duration === 0) return '0h';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes ? minutes : ''}`;
  };

  const getAppointmentColor = (type: string) => {
    switch (type) {
      case 'Maintenance':
        return '#0066CC';
      case 'Réparation':
        return '#EF4444';
      case 'Contrôle':
        return '#10B981';
      case 'Installation':
        return '#F59E0B';
      case 'Amélioration':
        return '#8B5CF6';
      case 'Accès':
        return '#0EA5E9';
      case 'Sécurité':
        return '#DC2626';
      case 'Administratif':
        return '#6366F1';
      case 'Vente':
        return '#F97316';
      case 'Achat':
        return '#EAB308';
      default:
        return '#666666';
    }
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
    router.push(`/(boat-manager)/messages?client=${clientId}`);
  };

  const handleClientDetails = (clientId: string) => {
    router.push(`/client/${clientId}`);
  };

  const handleAppointmentDetails = (appointmentId: string) => {
    // Corrected navigation path
    router.push(`/appointment/${appointmentId}`);
  };

  const handleAddAppointment = () => {
    setSelectedClient(null);
    setSelectedBoat(null);
    setSelectedBoatManager(null);
    setSelectedNauticalCompany(null); 
    setWithBoatManager(false);
    setWithNauticalCompany(false); 
    setNewAppointment({
      id: '', // Clear ID for new appointment
      date: selectedDate.toISOString().split('T')[0],
      time: '09:00',
      duration: 60,
      type: '', // Default type is now empty
      status: 'scheduled',
      location: null, // Set to null
      description: null, // Set to null
    });
    setShowAddModal(true);
  };

  const handleSelectClient = useCallback((client: Client) => {
    setSelectedClient(client);
    setSelectedBoat(null);
    setNewAppointment(prev => ({ ...prev, location: client.boats[0]?.place_de_port || null })); // Pre-fill location, use null
    // setShowClientModal(false); // This is now handled inside AddAppointmentModal
  }, []);

  const handleSelectBoat = useCallback((boat: Client['boats'][0]) => {
    setSelectedBoat(boat);
    setNewAppointment(prev => ({ ...prev, location: boat.place_de_port || null })); // Pre-fill location, use null
    // setShowBoatModal(false); // This is now handled inside AddAppointmentModal
  }, []);

  const handleSelectBoatManager = useCallback((manager: BoatManager) => {
    setSelectedBoatManager(manager);
    // setShowBoatManagerModal(false); // This is now handled inside AddAppointmentModal
  }, []);

  const handleSelectNauticalCompany = useCallback((company: NauticalCompany) => { 
    setSelectedNauticalCompany(company);
    // setShowNauticalCompanyModal(false); // This is now handled inside AddAppointmentModal
  }, []);

  const handleSaveAppointment = useCallback(async (newAppt: Appointment, isEditing: boolean) => { 
    if (isEditing) {
      setAppointments(prev => prev.map(appt => appt.id === newAppt.id ? newAppt : appt));
    } else {
      setAppointments(prev => [...prev, newAppt]);
    }
    setShowAddModal(false);
    
    // No need for Alert here, it's handled in the modal's save function
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
          styles.typeBadge,
          { backgroundColor: `${getAppointmentColor(appointment.type)}15` }
        ]}>
          <Text style={[
            styles.typeText,
            { color: getAppointmentColor(appointment.type) }
          ]}>
            {getAppointmentLabel(appointment.type)}
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

        {appointment.nauticalCompany && ( // Display nautical company if present
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
    </TouchableOpacity>
  );

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
            {view === 'day' ? formatDate(selectedDate) : `Semaine du ${formatDate(getWeekDays[0])}`}
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

      {/* Appointments List */}
      <ScrollView style={styles.appointmentsList}>
        {view === 'day' ? (
          filteredAppointments.length === 0 ? (
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
          )
        ) : ( // Week View
          <View style={styles.weekViewContainer}>
            {/* Time Axis (00h-23h) */}
            <View style={styles.timeAxis}>
              {Array.from({ length: 24 }).map((_, hour) => (
                <View key={hour} style={styles.timeAxisHour}>
                  <Text style={styles.timeAxisText}>{`${hour.toString().padStart(2, '0')}h`}</Text>
                </View>
              ))}
            </View>

            {/* Day Columns with Appointments */}
            {getWeekDays.map((day, index) => (
              <View key={index} style={styles.weekDayColumn}>
                <View style={styles.weekDayHeader}>
                  <Text style={styles.weekDayName}>
                    {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.weekDayDate}>
                    {day.getDate()}
                  </Text>
                </View>
                <ScrollView style={styles.dayAppointmentsList}>
                  {Array.from({ length: 24 }).map((_, hour) => {
                    const appointmentsInHour = filteredAppointments.filter(app => {
                      const appDate = new Date(app.date);
                      const appHour = parseInt(app.time.split(':')[0]);
                      return appDate.toDateString() === day.toDateString() && appHour === hour;
                    });

                    return (
                      <View key={hour} style={styles.hourSlot}>
                        {appointmentsInHour.length > 0 ? (
                          appointmentsInHour.map(app => (
                            <TouchableOpacity
                              key={app.id}
                              style={[
                                styles.appointmentBlock,
                                { backgroundColor: getAppointmentColor(app.type) },
                                { height: (app.duration / 60) * 60 }, // Scale duration to minutes for height
                                { top: (parseInt(app.time.split(':')[1]) / 60) * 60 }, // Position based on minutes
                              ]}
                              onPress={() => handleAppointmentDetails(app.id)}
                            >
                              <Text style={styles.appointmentBlockText} numberOfLines={1}>
                                {formatTime(app.time)} {app.client.name} - {app.type}
                              </Text>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={styles.emptyHourSlot} />
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <AddAppointmentModal 
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        initialAppointment={newAppointment}
        selectedClient={selectedClient}
        selectedBoat={selectedBoat}
        selectedBoatManager={selectedBoatManager}
        selectedNauticalCompany={selectedNauticalCompany} 
        withBoatManager={withBoatManager}
        withNauticalCompany={withNauticalCompany} 
        setWithBoatManager={setWithBoatManager}
        setWithNauticalCompany={setWithNauticalCompany} 
        isScheduleDatePickerVisible={isScheduleDatePickerVisible}
        setIsScheduleDatePickerVisible={setIsScheduleDatePickerVisible}
        onSaveAppointment={handleSaveAppointment} 
        getAppointmentColor={getAppointmentColor}
        getAppointmentLabel={getAppointmentLabel}
        handleSelectClient={handleSelectClient}
        handleSelectBoat={handleSelectBoat}
        handleSelectBoatManager={handleSelectBoatManager}
        handleSelectNauticalCompany={handleSelectNauticalCompany} 
        allClients={allClients} 
        allBoatManagers={[]} // Not used in this modal, but keeping for consistency if needed later
        allNauticalCompanies={allNauticalCompanies} 
        allServiceCategories={allServiceCategories} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  weekViewContainer: {
    flex: 1,
    flexDirection: 'row', // Arrange columns horizontally
    paddingHorizontal: 0, // Remove horizontal padding for full width
  },
  timeAxis: {
    width: 60, // Fixed width for time axis
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingVertical: 10,
  },
  timeAxisHour: {
    height: 60, // Height of each hour slot
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  timeAxisText: {
    fontSize: 12,
    color: '#666',
  },
  weekDayColumn: {
    flex: 1, // Each day column takes equal width
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
  dayAppointmentsList: {
    flex: 1, // Allow scrolling within the day column
  },
  hourSlot: {
    height: 60, // Height of each hour slot
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
    position: 'relative', // For absolute positioning of appointment blocks
  },
  appointmentBlock: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 4,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Ensure blocks are above grid lines
  },
  appointmentBlockText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  emptyHourSlot: {
    flex: 1,
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
