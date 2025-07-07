import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Alert } from 'react-native';
import { Calendar as CalendarIcon, Clock, Bot as Boat, MapPin, User, ChevronRight, ChevronLeft, MessageSquare, FileText, Plus, X, Check, Building } from 'lucide-react-native';
import { router } from 'expo-router';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface Appointment {
  id: string;
  date: string;
  time: string;
  duration: number; // in minutes
  type: 'maintenance' | 'repair' | 'control' | 'installation' | 'improvement' | 'access' | 'security' | 'administrative' | 'sell' | 'buy';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  client: {
    id: string;
    name: string;
    avatar: string;
  };
  boat: {
    name: string;
    type: string;
  };
  location: string;
  description: string;
  boatManager?: {
    id: string;
    name: string;
  };
  nauticalCompany?: { // Added nauticalCompany to Appointment interface
    id: string;
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
  avatar: string;
  boats: Array<{
    id: string;
    name: string;
    type: string;
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
  services: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  hasNewRequests?: boolean;
}

// Mock data
const mockAppointments: Appointment[] = [
  {
    id: '1',
    date: '2024-07-01', // Monday
    time: '09:00',
    duration: 120,
    type: 'maintenance',
    status: 'scheduled',
    client: {
      id: '1',
      name: 'Jean Dupont',
      avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop'
    },
    boat: {
      name: 'Le Grand Bleu',
      type: 'Voilier'
    },
    location: 'Port de Marseille - Quai A',
    description: 'Révision complète du moteur',
    boatManager: {
      id: 'bm1',
      name: 'Marie Martin'
    }
  },
  {
    id: '2',
    date: '2024-07-01', // Monday
    time: '14:00',
    duration: 90,
    type: 'control',
    status: 'scheduled',
    client: {
      id: '2',
      name: 'Sophie Martin',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop'
    },
    boat: {
      name: 'Le Petit Prince',
      type: 'Yacht'
    },
    location: 'Port de Marseille - Quai B',
    description: 'Contrôle technique annuel'
  },
  {
    id: '3',
    date: '2024-07-03', // Wednesday
    time: '10:00',
    duration: 180,
    type: 'installation',
    status: 'scheduled',
    client: {
      id: '3',
      name: 'Pierre Dubois',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop'
    },
    boat: {
      name: 'Le Navigateur',
      type: 'Voilier'
    },
    location: 'Port de Marseille - Quai C',
    description: 'Installation système GPS',
    boatManager: {
      id: 'bm2',
      name: 'Pierre Dubois'
    }
  },
  {
    id: '4',
    date: '2024-07-05', // Friday
    time: '11:00',
    duration: 60,
    type: 'repair',
    status: 'scheduled',
    client: {
      id: '1',
      name: 'Jean Dupont',
      avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop'
    },
    boat: {
      name: 'Le Grand Bleu',
      type: 'Voilier'
    },
    location: 'Port de Marseille - Quai A',
    description: 'Réparation mineure coque'
  },
  {
    id: '5',
    date: '2024-07-08', // Next Monday
    time: '09:30',
    duration: 150,
    type: 'improvement',
    status: 'scheduled',
    client: {
      id: '2',
      name: 'Sophie Martin',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop'
    },
    boat: {
      name: 'Le Petit Prince',
      type: 'Yacht'
    },
    location: 'Port de Nice - Quai D',
    description: 'Installation nouveau système audio'
  }
];

// Mock clients data
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Jean Dupont',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    boats: [
      {
        id: '1',
        name: 'Le Grand Bleu',
        type: 'Voilier',
      },
    ],
  },
  {
    id: '2',
    name: 'Sophie Martin',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    boats: [
      {
        id: '2',
        name: 'Le Petit Prince',
        type: 'Yacht',
      },
      {
        id: '3',
        name: "L'Aventurier",
        type: 'Catamaran',
      },
    ],
  },
  {
    id: '3',
    name: 'Pierre Dubois',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    boats: [
      {
        id: '4',
        name: 'Le Navigateur',
        type: 'Voilier',
      },
    ],
  },
];

// Mock boat managers
const mockBoatManagers: BoatManager[] = [
  { 
    id: 'bm1', 
    name: 'Marie Martin',
    ports: ['Port de Marseille', 'Port de Cassis']
  },
  { 
    id: 'bm2', 
    name: 'Pierre Dubois',
    ports: ['Port de Nice', 'Port de Cannes']
  },
  { 
    id: 'bm3', 
    name: 'Sophie Laurent',
    ports: ['Port de Saint-Tropez']
  },
];

// Mock nautical companies
const mockNauticalCompanies: NauticalCompany[] = [
  {
    id: 'nc1',
    name: 'Nautisme Pro',
    logo: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop',
    location: 'Port de Marseille',
    services: ['Maintenance', 'Réparation', 'Installation'],
    contactName: 'Thomas Leroy',
    contactEmail: 'contact@nautismepro.com',
    contactPhone: '+33 4 91 12 34 56',
  },
  {
    id: 'nc2',
    name: 'Marine Services',
    logo: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2070&auto=format&fit=crop',
    location: 'Port de Nice',
    services: ['Maintenance', 'Contrôle', 'Amélioration'],
    contactName: 'Julie Moreau',
    contactEmail: 'contact@marineservices.com',
    contactPhone: '+33 4 93 23 45 67',
  }
];

// Client selection modal (Moved outside AddAppointmentModal)
const ClientSelectionModal = ({ visible, onClose, onSelectClient, clients }) => (
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
        
        <ScrollView style={styles.modalList}>
          {clients.map(client => (
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

// Boat selection modal (Moved outside AddAppointmentModal)
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
        
        {selectedClient ? (
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
            <Text style={styles.emptyModalText}>Veuillez d'abord sélectionner un client</Text>
          </View>
        )}
      </View>
    </View>
  </Modal>
);

// Boat Manager selection modal (Moved outside AddAppointmentModal)
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
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// Nautical Company selection modal
const NauticalCompanySelectionModal = ({ visible, onClose, onSelectNauticalCompany, nauticalCompanies }) => (
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
        
        <ScrollView style={styles.modalList}>
          {nauticalCompanies.map(company => (
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
          ))}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

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
  setShowClientModal,
  setShowBoatModal,
  setShowBoatManagerModal,
  setShowNauticalCompanyModal, // New prop
  isScheduleDatePickerVisible,
  setIsScheduleDatePickerVisible,
  onSaveAppointment, // Renamed prop
  getAppointmentColor,
  getAppointmentLabel,
  handleSelectClient,
  handleSelectBoat,
  handleSelectBoatManager,
  handleSelectNauticalCompany, // New prop
}) => {
  // Local state for the form fields
  const [localAppointment, setLocalAppointment] = useState(initialAppointment);

  // Sync local state with prop when initialAppointment changes (e.g., modal opens)
  useEffect(() => {
    setLocalAppointment(initialAppointment);
  }, [initialAppointment]);

  const handleLocalDateConfirm = (date: Date) => {
    setLocalAppointment(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
    setIsScheduleDatePickerVisible(false);
  };

  const handleLocalSave = useCallback(() => { // Renamed local function
    if (!validateAppointmentForm(localAppointment)) return;
    
    const newAppointmentComplete: Appointment = {
      id: Date.now().toString(),
      date: localAppointment.date!,
      time: localAppointment.time!,
      duration: localAppointment.duration || 60,
      type: localAppointment.type as Appointment['type'],
      status: 'scheduled',
      client: {
        id: selectedClient!.id,
        name: selectedClient!.name,
        avatar: selectedClient!.avatar
      },
      boat: {
        name: selectedBoat!.name,
        type: selectedBoat!.type
      },
      location: localAppointment.location || 'Port de Marseille',
      description: localAppointment.description || '',
    };
    
    // Add boat manager if selected
    if (withBoatManager && selectedBoatManager) {
      newAppointmentComplete.boatManager = {
        id: selectedBoatManager.id,
        name: selectedBoatManager.name
      };
    }

    // Add nautical company if selected
    if (withNauticalCompany && selectedNauticalCompany) {
      newAppointmentComplete.nauticalCompany = {
        id: selectedNauticalCompany.id,
        name: selectedNauticalCompany.name
      };
    }
    
    onSaveAppointment(newAppointmentComplete); // Call the prop function
  }, [localAppointment, selectedClient, selectedBoat, withBoatManager, selectedBoatManager, withNauticalCompany, selectedNauticalCompany, onSaveAppointment]);

  const validateAppointmentForm = (appointmentData: Partial<Appointment>) => {
    if (!selectedClient) {
      Alert.alert('Erreur', 'Veuillez sélectionner un client');
      return false;
    }
    
    if (!selectedBoat) {
      Alert.alert('Erreur', 'Veuillez sélectionner un bateau');
      return false;
    }
    
    if (withBoatManager && !selectedBoatManager) {
      Alert.alert('Erreur', 'Veuillez sélectionner un boat manager');
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
            <Text style={styles.modalTitle}>Nouveau rendez-vous</Text>
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
                  <Text style={styles.formFieldLabel}>Bateau</Text>
                  <Text style={selectedBoat ? styles.formFieldValue : styles.formFieldPlaceholder}>
                    {selectedBoat ? `${selectedBoat.name} (${selectedBoat.type})` : 'Sélectionner un bateau'}
                  </Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>

              <View style={styles.companyToggleContainer}>
                <Text style={styles.companyToggleLabel}>Avec une entreprise du nautisme</Text>
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
                    value={localAppointment.duration?.toString()}
                    onChangeText={(text) => setLocalAppointment(prev => ({ 
                      ...prev, 
                      duration: parseInt(text) || 60 
                    }))}
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
                  <View style={styles.typeSelector}>
                    {(['maintenance', 'repair', 'control', 'installation', 'improvement', 'access', 'security', 'administrative', 'sell', 'buy'] as Appointment['type'][]).map(type => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.typeOption,
                          localAppointment.type === type && {
                            backgroundColor: `${getAppointmentColor(type)}15`,
                            borderColor: getAppointmentColor(type),
                          }
                        ]}
                        onPress={() => setLocalAppointment(prev => ({ ...prev, type }))}
                      >
                        <Text 
                          style={[
                            styles.typeOptionText,
                            localAppointment.type === type && { color: getAppointmentColor(type) }
                          ]}
                        >
                          {getAppointmentLabel(type)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
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
                    value={localAppointment.location}
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
                    value={localAppointment.description}
                    onChangeText={(text) => setLocalAppointment(prev => ({ ...prev, description: text }))}
                    placeholder="Description de l'intervention"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
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
    </Modal>
  );
};

const AppointmentDetailsModal = ({ visible, onClose, appointment, getAppointmentColor, getAppointmentLabel }) => {
  if (!appointment) return null;

  const formatTime = (time: string) => time.replace(':', 'h');
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

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
            <Text style={styles.modalTitle}>Détails du rendez-vous</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Informations générales</Text>
              <View style={styles.detailRow}>
                <CalendarIcon size={20} color="#0066CC" />
                <Text style={styles.detailText}>Date: {formatDate(appointment.date)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Clock size={20} color="#0066CC" />
                <Text style={styles.detailText}>Heure: {formatTime(appointment.time)}</Text>
              </View>
              <View style={styles.detailRow}>
                <FileText size={20} color="#0066CC" />
                <Text style={styles.detailText}>Type: {getAppointmentLabel(appointment.type)}</Text>
              </View>
              <View style={styles.detailRow}>
                <MapPin size={20} color="#0066CC" />
                <Text style={styles.detailText}>Lieu: {appointment.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailText}>Description: {appointment.description}</Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Client et Bateau</Text>
              <View style={styles.detailRow}>
                <User size={20} color="#0066CC" />
                <Text style={styles.detailText}>Client: {appointment.client.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Boat size={20} color="#0066CC" />
                <Text style={styles.detailText}>Bateau: {appointment.boat.name} ({appointment.boat.type})</Text>
              </View>
            </View>

            {appointment.boatManager && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Boat Manager</Text>
                <View style={styles.detailRow}>
                  <User size={20} color="#0066CC" />
                  <Text style={styles.detailText}>{appointment.boatManager.name}</Text>
                </View>
              </View>
            )}

            {appointment.nauticalCompany && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Entreprise du nautisme</Text>
                <View style={styles.detailRow}>
                  <Building size={20} color="#0066CC" />
                  <Text style={styles.detailText}>{appointment.nauticalCompany.name}</Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function PlanningScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [showBoatManagerModal, setShowBoatManagerModal] = useState(false);
  const [showNauticalCompanyModal, setShowNauticalCompanyModal] = useState(false); // New state for nautical company modal
  
  // New state for date picker visibility
  const [isScheduleDatePickerVisible, setIsScheduleDatePickerVisible] = useState(false);

  // New appointment form state
  const [newAppointment, setNewAppointment] = useState<Partial<Appointment>>({
    date: selectedDate.toISOString().split('T')[0],
    time: '09:00',
    duration: 60,
    type: 'maintenance',
    status: 'scheduled',
    location: 'Port de Marseille',
    description: '',
  });
  
  // Selected client and boat for new appointment
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedBoat, setSelectedBoat] = useState<Client['boats'][0] | null>(null);
  const [selectedBoatManager, setSelectedBoatManager] = useState<BoatManager | null>(null);
  const [selectedNauticalCompany, setSelectedNauticalCompany] = useState<NauticalCompany | null>(null); // New state
  const [withBoatManager, setWithBoatManager] = useState(false);
  const [withNauticalCompany, setWithNauticalCompany] = useState(false); // New state

  // State for Appointment Details Modal
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<Appointment | null>(null);
  const [showAppointmentDetailsModal, setShowAppointmentDetailsModal] = useState(false);


  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return time.replace(':', 'h');
  };

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes ? minutes : ''}`;
  };

  const getAppointmentColor = (type: Appointment['type']) => {
    switch (type) {
      case 'maintenance':
        return '#0066CC';
      case 'repair':
        return '#EF4444';
      case 'control':
        return '#10B981';
      case 'installation':
        return '#F59E0B'; // Purple
      case 'improvement':
        return '#8B5CF6'; // Light Blue
      case 'access':
        return '#0EA5E9'; // Red
      case 'security':
        return '#DC2626'; // Indigo
      case 'administrative':
        return '#6366F1'; // Orange
      case 'sell':
        return '#F97316'; // Yellow
      case 'buy':
        return '#EAB308';
      default:
        return '#666666';
    }
  };

  const getAppointmentLabel = (type: Appointment['type']) => {
    switch (type) {
      case 'maintenance':
        return 'Maintenance';
      case 'repair':
        return 'Réparation';
      case 'control':
        return 'Contrôle';
      case 'installation':
        return 'Installation';
      case 'improvement':
        return 'Amélioration';
      case 'access':
        return 'Accès';
      case 'security':
        return 'Sécurité';
      case 'administrative':
        return 'Administratif';
      case 'sell':
        return 'Vente';
      case 'buy':
        return 'Achat';
      default:
        return type;
    }
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

  const handleAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointmentForDetails(appointment);
    setShowAppointmentDetailsModal(true);
  };

  const handleAddAppointment = () => {
    setSelectedClient(null);
    setSelectedBoat(null);
    setSelectedBoatManager(null);
    setSelectedNauticalCompany(null); // Reset new state
    setWithBoatManager(false);
    setWithNauticalCompany(false); // Reset new state
    setNewAppointment({
      date: selectedDate.toISOString().split('T')[0],
      time: '09:00',
      duration: 60,
      type: 'maintenance',
      status: 'scheduled',
      location: 'Port de Marseille',
      description: '',
    });
    setShowAddModal(true);
  };

  const handleSelectClient = useCallback((client: Client) => {
    setSelectedClient(client);
    setSelectedBoat(null);
    setShowClientModal(false);
  }, []);

  const handleSelectBoat = useCallback((boat: Client['boats'][0]) => {
    setSelectedBoat(boat);
    setShowBoatModal(false);
  }, []);

  const handleSelectBoatManager = useCallback((boatManager: BoatManager) => {
    setSelectedBoatManager(boatManager);
    setShowBoatManagerModal(false);
  }, []);

  const handleSelectNauticalCompany = useCallback((company: NauticalCompany) => { // New handler
    setSelectedNauticalCompany(company);
    setShowNauticalCompanyModal(false);
  }, []);

  const handleSaveAppointment = useCallback((appointmentData: Appointment) => { // Changed parameter type to Appointment
    setAppointments(prev => [...prev, appointmentData]); // Directly use appointmentData
    setShowAddModal(false);
    
    Alert.alert(
      'Succès',
      'Le rendez-vous a été créé avec succès',
      [{ text: 'OK' }]
    );
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
      onPress={() => handleAppointmentDetails(appointment)}
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
          {appointment.description}
        </Text>

        <View style={styles.locationContainer}>
          <MapPin size={16} color="#666" />
          <Text style={styles.locationText}>{appointment.location}</Text>
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

  const renderWeeklyAppointmentSquare = (appointment: Appointment) => (
    <TouchableOpacity
      key={appointment.id}
      style={[
        styles.weeklyAppointmentSquare,
        { backgroundColor: getAppointmentColor(appointment.type) }
      ]}
      onPress={() => handleAppointmentDetails(appointment)}
    >
      <Text style={styles.weeklyAppointmentTime}>{formatTime(appointment.time)}</Text>
      <Text style={styles.weeklyAppointmentText} numberOfLines={1}>{appointment.client.name}</Text>
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
            {view === 'day' ? formatDate(selectedDate) : `Semaine du ${getWeekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
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
            <View style={styles.weekDaysHeader}>
              <View style={styles.timeColumnHeader} /> {/* Empty corner for hours */}
              {getWeekDays.map((day, index) => (
                <View key={index} style={styles.weekDayHeader}>
                  <Text style={styles.weekDayName}>
                    {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.weekDayDate}>
                    {day.getDate()}
                  </Text>
                </View>
              ))}
            </View>
            <ScrollView style={styles.weekCalendarScroll}>
              <View style={styles.weekCalendarGrid}>
                <View style={styles.hoursColumn}>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <View key={hour} style={styles.hourSlot}>
                      <Text style={styles.hourText}>{`${hour.toString().padStart(2, '0')}:00`}</Text>
                    </View>
                  ))}
                </View>
                {getWeekDays.map((day, dayIndex) => (
                  <View key={dayIndex} style={styles.weekDayColumn}>
                    {Array.from({ length: 24 }).map((_, hour) => {
                      const appointmentsInHour = filteredAppointments.filter(app => {
                        const appDate = new Date(app.date);
                        const appHour = parseInt(app.time.split(':')[0]);
                        return appDate.toDateString() === day.toDateString() && appHour === hour;
                      });
                      return (
                        <View key={hour} style={styles.hourSlot}>
                          {appointmentsInHour.map(renderWeeklyAppointmentSquare)}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
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
        selectedNauticalCompany={selectedNauticalCompany} // Pass new state
        withBoatManager={withBoatManager}
        withNauticalCompany={withNauticalCompany} // Pass new state
        setWithBoatManager={setWithBoatManager}
        setWithNauticalCompany={setWithNauticalCompany} // Pass new state
        setShowClientModal={setShowClientModal}
        setShowBoatModal={setShowBoatModal}
        setShowBoatManagerModal={setShowBoatManagerModal}
        setShowNauticalCompanyModal={setShowNauticalCompanyModal} // Pass new state
        isScheduleDatePickerVisible={isScheduleDatePickerVisible}
        setIsScheduleDatePickerVisible={setIsScheduleDatePickerVisible}
        onSaveAppointment={handleSaveAppointment} // Pass the handler
        getAppointmentColor={getAppointmentColor}
        getAppointmentLabel={getAppointmentLabel}
        handleSelectClient={handleSelectClient}
        handleSelectBoat={handleSelectBoat}
        handleSelectBoatManager={handleSelectBoatManager}
        handleSelectNauticalCompany={handleSelectNauticalCompany} // Pass new handler
      />

      <ClientSelectionModal 
        visible={showClientModal} 
        onClose={() => setShowClientModal(false)} 
        onSelectClient={handleSelectClient} 
        clients={mockClients} 
      />
      <BoatSelectionModal 
        visible={showBoatModal} 
        onClose={() => setShowBoatModal(false)} 
        onSelectBoat={handleSelectBoat} 
        selectedClient={selectedClient} 
      />
      <BoatManagerSelectionModal 
        visible={showBoatManagerModal} 
        onClose={() => setShowBoatManagerModal(false)} 
        onSelectBoatManager={handleSelectBoatManager} 
        boatManagers={mockBoatManagers} 
      />
      <NauticalCompanySelectionModal // Render new modal
        visible={showNauticalCompanyModal} 
        onClose={() => setShowNauticalCompanyModal(false)} 
        onSelectNauticalCompany={handleSelectNauticalCompany} 
        nauticalCompanies={mockNauticalCompanies} 
      />
      <AppointmentDetailsModal
        visible={showAppointmentDetailsModal}
        onClose={() => setShowAppointmentDetailsModal(false)}
        appointment={selectedAppointmentForDetails}
        getAppointmentColor={getAppointmentColor}
        getAppointmentLabel={getAppointmentLabel}
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
    paddingHorizontal: 0, // Remove horizontal padding for full width
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 10,
  },
  timeColumnHeader: {
    width: 60, // Width for the hours column
  },
  weekDayHeader: {
    flex: 1,
    alignItems: 'center',
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
  weekCalendarScroll: {
    flex: 1,
  },
  weekCalendarGrid: {
    flexDirection: 'row',
  },
  hoursColumn: {
    width: 60, // Fixed width for hours column
    borderRightWidth: 1,
    borderColor: '#e0e0e0',
  },
  hourSlot: {
    height: 80, // Height for each hour slot
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderColor: '#e0e0e0',
    paddingHorizontal: 5,
  },
  hourText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  weekDayColumn: {
    flex: 1,
    borderRightWidth: 0.5,
    borderColor: '#e0e0e0',
  },
  weeklyAppointmentSquare: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 4,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 30, // Minimum height for visibility
    zIndex: 1,
  },
  weeklyAppointmentTime: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  weeklyAppointmentText: {
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
});