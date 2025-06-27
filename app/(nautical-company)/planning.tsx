import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Modal, TextInput, Alert } from 'react-native';
import { Calendar as CalendarIcon, Clock, Bot as Boat, MapPin, User, ChevronRight, ChevronLeft, MessageSquare, FileText, Plus, X, Check, Building } from 'lucide-react-native';
import { router } from 'expo-router';

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

// Mock data
const mockAppointments: Appointment[] = [
  {
    id: '1',
    date: '2024-02-20',
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
    date: '2024-02-20',
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
    date: '2024-02-21',
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

export default function PlanningScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [showBoatManagerModal, setShowBoatManagerModal] = useState(false);
  
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
  const [withBoatManager, setWithBoatManager] = useState(false);

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
        return '#F59E0B';
      case 'improvement':
        return '#8B5CF6'; // Purple
      case 'access':
        return '#0EA5E9'; // Light Blue
      case 'security':
        return '#DC2626'; // Red
      case 'administrative':
        return '#6366F1'; // Indigo
      case 'sell':
        return '#F97316'; // Orange
      case 'buy':
        return '#EAB308'; // Yellow
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
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
    setNewAppointment(prev => ({
      ...prev,
      date: newDate.toISOString().split('T')[0]
    }));
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
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
    router.push(`/appointment/${appointmentId}`);
  };

  const handleAddAppointment = () => {
    setSelectedClient(null);
    setSelectedBoat(null);
    setSelectedBoatManager(null);
    setWithBoatManager(false);
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

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSelectedBoat(null);
    setShowClientModal(false);
  };

  const handleSelectBoat = (boat: Client['boats'][0]) => {
    setSelectedBoat(boat);
    setShowBoatModal(false);
  };

  const handleSelectBoatManager = (boatManager: BoatManager) => {
    setSelectedBoatManager(boatManager);
    setShowBoatManagerModal(false);
  };

  const toggleWithBoatManager = () => {
    setWithBoatManager(!withBoatManager);
    if (!withBoatManager) {
      setSelectedBoatManager(null);
    }
  };

  const validateAppointmentForm = () => {
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
    
    if (!newAppointment.date) {
      Alert.alert('Erreur', 'Veuillez sélectionner une date');
      return false;
    }
    
    if (!newAppointment.time) {
      Alert.alert('Erreur', 'Veuillez sélectionner une heure');
      return false;
    }
    
    if (!newAppointment.description) {
      Alert.alert('Erreur', 'Veuillez ajouter une description');
      return false;
    }
    
    return true;
  };

  const handleSaveAppointment = () => {
    if (!validateAppointmentForm()) return;
    
    const newAppointmentComplete: Appointment = {
      id: Date.now().toString(),
      date: newAppointment.date!,
      time: newAppointment.time!,
      duration: newAppointment.duration || 60,
      type: newAppointment.type as Appointment['type'],
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
      location: newAppointment.location || 'Port de Marseille',
      description: newAppointment.description || '',
    };
    
    // Add boat manager if selected
    if (withBoatManager && selectedBoatManager) {
      newAppointmentComplete.boatManager = {
        id: selectedBoatManager.id,
        name: selectedBoatManager.name
      };
    }
    
    setAppointments(prev => [...prev, newAppointmentComplete]);
    setShowAddModal(false);
    
    Alert.alert(
      'Succès',
      'Le rendez-vous a été créé avec succès',
      [{ text: 'OK' }]
    );
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.toDateString() === selectedDate.toDateString();
    }).sort((a, b) => {
      return a.time.localeCompare(b.time);
    });
  }, [selectedDate, appointments]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Client selection modal
  const ClientSelectionModal = () => (
    <Modal
      visible={showClientModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowClientModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un client</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowClientModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            {mockClients.map(client => (
              <TouchableOpacity
                key={client.id}
                style={styles.modalItem}
                onPress={() => handleSelectClient(client)}
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

  // Boat selection modal
  const BoatSelectionModal = () => (
    <Modal
      visible={showBoatModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBoatModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un bateau</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowBoatModal(false)}
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
                  onPress={() => handleSelectBoat(boat)}
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

  // Boat Manager selection modal
  const BoatManagerSelectionModal = () => (
    <Modal
      visible={showBoatManagerModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBoatManagerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un boat manager</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowBoatManagerModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            {mockBoatManagers.map(manager => (
              <TouchableOpacity
                key={manager.id}
                style={styles.modalItem}
                onPress={() => handleSelectBoatManager(manager)}
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

  // Add appointment modal
  const AddAppointmentModal = () => (
    <Modal
      visible={showAddModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouveau rendez-vous</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAddModal(false)}
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
                <Text style={styles.companyToggleLabel}>Avec un boat manager</Text>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton, 
                    withBoatManager ? styles.toggleButtonActive : styles.toggleButtonInactive
                  ]}
                  onPress={toggleWithBoatManager}
                >
                  <View style={[
                    styles.toggleIndicator, 
                    withBoatManager ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive
                  ]} />
                </TouchableOpacity>
              </View>

              {withBoatManager && (
                <TouchableOpacity 
                  style={styles.formField}
                  onPress={() => setShowBoatManagerModal(true)}
                >
                  <View style={styles.formFieldIcon}>
                    <User size={20} color="#0066CC" />
                  </View>
                  <View style={styles.formFieldContent}>
                    <Text style={styles.formFieldLabel}>Boat Manager</Text>
                    <Text style={selectedBoatManager ? styles.formFieldValue : styles.formFieldPlaceholder}>
                      {selectedBoatManager ? selectedBoatManager.name : 'Sélectionner un boat manager'}
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
                  <TextInput
                    style={styles.formInput}
                    value={newAppointment.date}
                    onChangeText={(text) => setNewAppointment(prev => ({ ...prev, date: text }))}
                    placeholder="AAAA-MM-JJ"
                  />
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
                    value={newAppointment.time}
                    onChangeText={(text) => setNewAppointment(prev => ({ ...prev, time: text }))}
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
                    value={newAppointment.duration?.toString()}
                    onChangeText={(text) => setNewAppointment(prev => ({ 
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
                          newAppointment.type === type && {
                            backgroundColor: `${getAppointmentColor(type)}15`,
                            borderColor: getAppointmentColor(type),
                          }
                        ]}
                        onPress={() => setNewAppointment(prev => ({ ...prev, type }))}
                      >
                        <Text 
                          style={[
                            styles.typeOptionText,
                            newAppointment.type === type && { color: getAppointmentColor(type) }
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
                    value={newAppointment.location}
                    onChangeText={(text) => setNewAppointment(prev => ({ ...prev, location: text }))}
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
                    value={newAppointment.description}
                    onChangeText={(text) => setNewAppointment(prev => ({ ...prev, description: text }))}
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
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveAppointment}
            >
              <Check size={20} color="white" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
            {formatDate(selectedDate)}
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
              <Text style={[styles.viewButtonText, view === 'day' && styles.activeViewButtonText]}>
                Jour
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.viewButton, view === 'week' && styles.activeViewButton]}
              onPress={() => setView('week')}
            >
              <Text style={[styles.viewButtonText, view === 'week' && styles.activeViewButtonText]}>
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
          filteredAppointments.map((appointment) => (
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
          ))
        )}
      </ScrollView>

      <ClientSelectionModal />
      <BoatSelectionModal />
      <BoatManagerSelectionModal />
      <AddAppointmentModal />
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
  activeViewButtonText: {
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
        boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
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
        boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
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
  companyToggleLabel: {
    fontSize: 16,
    color: '#1a1a1a',
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
});
