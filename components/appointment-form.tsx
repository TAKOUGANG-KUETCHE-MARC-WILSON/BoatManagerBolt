import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal } from 'react-native';
import { Calendar, Clock, User, Bot as Boat, FileText, X, Check, Building } from 'lucide-react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext'; // Assurez-vous que le chemin est correct

// Interface pour un rendez-vous (doit être cohérente avec planning.tsx)
interface Appointment {
  id: string; // Garder comme string pour la cohérence de l'UI, mais la DB est un entier
  date: string; // Format YYYY-MM-DD
  time: string; // Format HH:MM:SS
  duration: number | null; // Durée en minutes
  type: string; // Description du service (ex: "Maintenance", "Réparation")
  status: 'en_attente' | 'confirme' | 'annule' | 'termine';
  client: {
    id: string;
    name: string;
    avatar: string | null;
    e_mail: string;
    phone: string;
  };
  boat: {
    id: string;
    name: string;
    type: string;
    place_de_port: string | null;
  };
  nauticalCompany?: {
    id: string;
    company_name: string;
  } | null;
  boatManager?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
  location: string | null; // Place de port du bateau
  description: string | null; // Description du rendez-vous
}

interface AppointmentFormProps {
  visible: boolean;
  onClose: () => void;
  initialAppointment: Appointment; // Rendez-vous à modifier, ou un objet vide pour un nouveau
  onSaveAppointment: (savedAppt: Appointment, isEditing: boolean) => void; // Callback après sauvegarde
  allClients: Array<{
    id: string;
    name: string;
    avatar: string | null;
    boats: Array<{
      id: string;
      name: string;
      type: string;
      place_de_port?: string;
    }>;
  }>;
  allServiceCategories: Array<{ id: number; description1: string }>;
}

// Helper pour convertir les minutes en format HH:MM:SS
const convertMinutesToTimeFormat = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
};

// Helper pour convertir HH:MM ou HH:MM:SS en minutes
const timeToMinutes = (timeStr: string): number => {
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
};

// Helper pour convertir la durée (HH:MM:SS) en minutes
const durationToMinutes = (durationStr: string): number => {
  const parts = durationStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  return hours * 60 + minutes;
};

const AppointmentForm = ({
  visible,
  onClose,
  initialAppointment,
  onSaveAppointment,
  allClients,
  allServiceCategories,
}: AppointmentFormProps) => {
  const { user } = useAuth();
  const [localAppointment, setLocalAppointment] = useState<Appointment>(initialAppointment);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [isDurationPickerVisible, setDurationPickerVisible] = useState(false);

  const [showClientModal, setShowClientModal] = useState(false);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [showServiceCategoryModal, setShowServiceCategoryModal] = useState(false);

  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [selectedBoat, setSelectedBoat] = useState<BoatOption | null>(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<ServiceCategoryOption | null>(null);

  // Sync local state with initialAppointment prop
  useEffect(() => {
    setLocalAppointment(initialAppointment);
    // Pre-fill selected client, boat, service category for editing
    if (initialAppointment.id) {
      const client = allClients.find(c => c.id === initialAppointment.client?.id);
      setSelectedClient(client || null);

      const boat = client?.boats.find(b => b.id === initialAppointment.boat?.id);
      setSelectedBoat(boat || null);

      const serviceCat = allServiceCategories.find(sc => sc.description1 === initialAppointment.type);
      setSelectedServiceCategory(serviceCat || null);
    } else {
      // Reset selections for new appointment
      setSelectedClient(null);
      setSelectedBoat(null);
      setSelectedServiceCategory(null);
    }
  }, [initialAppointment, allClients, allServiceCategories]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!selectedClient?.id) newErrors.client = 'Le client est requis';
    if (!selectedBoat?.id) newErrors.boat = 'Le bateau est requis';
    if (!localAppointment.date) newErrors.date = 'La date est requise';
    if (!localAppointment.time) newErrors.time = 'L\'heure est requise';
    if (!localAppointment.description?.trim()) newErrors.description = 'La description est requise';
    if (!selectedServiceCategory?.id) newErrors.serviceCategory = 'Le type de service est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [localAppointment, selectedClient, selectedBoat, selectedServiceCategory]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    // Conflict check: Check for existing appointments at the same date and overlapping time
    try {
      const newAppointmentStartMinutes = timeToMinutes(localAppointment.time);
      const newAppointmentEndMinutes = newAppointmentStartMinutes + (localAppointment.duration || 0);

      const { data: existingAppointments, error: fetchError } = await supabase
        .from('rendez_vous')
        .select('id, heure, duree')
        .eq('date_rdv', localAppointment.date)
        .eq('id_companie', user?.id); // Filter by current nautical company

      if (fetchError) {
        console.error('Error fetching existing appointments:', fetchError);
        Alert.alert('Erreur', 'Impossible de vérifier les conflits d\'horaire.');
        return;
      }

      const conflictFound = existingAppointments.some(existingAppt => {
        // Exclude the current appointment if editing
        if (localAppointment.id && existingAppt.id.toString() === localAppointment.id) {
          return false;
        }

        const existingApptStartMinutes = timeToMinutes(existingAppt.heure);
        const existingApptEndMinutes = existingApptStartMinutes + durationToMinutes(existingAppt.duree);

        // Check for overlap: (start1 < end2) AND (end1 > start2)
        return (newAppointmentStartMinutes < existingApptStartMinutes + (existingAppt.duree ? durationToMinutes(existingAppt.duree) : 0)) &&
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

    const payload = {
      date_rdv: localAppointment.date,
      heure: localAppointment.time,
      duree: localAppointment.duration ? convertMinutesToTimeFormat(localAppointment.duration) : null,
      description: localAppointment.description,
      statut: localAppointment.status,
      id_client: selectedClient?.id,
      id_boat: selectedBoat?.id,
      id_companie: user?.id, // L'entreprise nautique connectée
      id_boat_manager: null, // Peut être défini si nécessaire si la NC gère aussi des BMs
      id_service: selectedServiceCategory?.id,
    };

    try {
      let result;
      let isEditing = !!localAppointment.id;

      if (isEditing) {
        result = await supabase
          .from('rendez_vous')
          .update(payload)
          .eq('id', parseInt(localAppointment.id))
          .select('*')
          .single();
      } else {
        result = await supabase
          .from('rendez_vous')
          .insert(payload)
          .select('*')
          .single();
      }

      if (result.error) {
        console.error('Error saving appointment:', result.error);
        Alert.alert('Erreur', `Échec de l'enregistrement du rendez-vous: ${result.error.message}`);
      } else {
        Alert.alert('Succès', `Rendez-vous ${isEditing ? 'modifié' : 'ajouté'} avec succès.`);
        
        // Format the saved appointment to match the Appointment interface
        const savedAppointment: Appointment = {
          id: result.data.id.toString(),
          date: result.data.date_rdv,
          time: result.data.heure,
          duration: result.data.duree ? durationToMinutes(result.data.duree) : null,
          type: selectedServiceCategory?.description1 || 'unknown',
          status: result.data.statut,
          client: {
            id: selectedClient!.id,
            name: selectedClient!.name,
            avatar: selectedClient!.avatar,
            e_mail: selectedClient!.e_mail,
            phone: selectedClient!.phone,
          },
          boat: {
            id: selectedBoat!.id,
            name: selectedBoat!.name,
            type: selectedBoat!.type,
            place_de_port: selectedBoat!.place_de_port,
          },
          nauticalCompany: {
            id: user!.id,
            company_name: user!.companyName,
          },
          boatManager: null, // Set if applicable
          location: selectedBoat!.place_de_port || null,
          description: result.data.description,
        };
        onSaveAppointment(savedAppointment, isEditing);
        onClose();
      }
    } catch (e) {
      console.error('Unexpected error during save:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de la sauvegarde.');
    }
  }, [localAppointment, selectedClient, selectedBoat, selectedServiceCategory, user, onSaveAppointment, onClose, validateForm]);

  const handleSelectClient = useCallback((client: ClientOption) => {
    setSelectedClient(client);
    setSelectedBoat(null); // Clear selected boat when client changes
    setLocalAppointment(prev => ({ ...prev, client: client, boat: null })); // Update local form data
    setShowClientModal(false);
    setErrors(prev => ({ ...prev, client: undefined, boat: undefined }));
  }, []);

  const handleSelectBoat = useCallback((boat: BoatOption) => {
    setSelectedBoat(boat);
    setLocalAppointment(prev => ({ ...prev, boat: boat, location: boat.place_de_port || null })); // Update local form data
    setShowBoatModal(false);
    setErrors(prev => ({ ...prev, boat: undefined }));
  }, []);

  const handleSelectServiceCategory = useCallback((category: ServiceCategoryOption) => {
    setSelectedServiceCategory(category);
    setLocalAppointment(prev => ({ ...prev, type: category.description1 })); // Update local form data
    setShowServiceCategoryModal(false);
    setErrors(prev => ({ ...prev, serviceCategory: undefined }));
  }, []);

  const ClientSelectionModal = () => (
    <Modal visible={showClientModal} transparent animationType="slide" onRequestClose={() => setShowClientModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un client</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowClientModal(false)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {allClients.map(client => (
              <TouchableOpacity key={client.id} style={styles.modalItem} onPress={() => handleSelectClient(client)}>
                <User size={20} color="#0066CC" />
                <Text style={styles.modalItemText}>{client.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const BoatSelectionModal = () => (
    <Modal visible={showBoatModal} transparent animationType="slide" onRequestClose={() => setShowBoatModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un bateau</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowBoatModal(false)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {selectedClient?.boats.map(boat => (
              <TouchableOpacity key={boat.id} style={styles.modalItem} onPress={() => handleSelectBoat(boat)}>
                <Boat size={20} color="#0066CC" />
                <Text style={styles.modalItemText}>{boat.name} ({boat.type})</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const ServiceCategorySelectionModal = () => (
    <Modal visible={showServiceCategoryModal} transparent animationType="slide" onRequestClose={() => setShowServiceCategoryModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un service</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowServiceCategoryModal(false)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {allServiceCategories.map(category => (
              <TouchableOpacity key={category.id} style={styles.modalItem} onPress={() => handleSelectServiceCategory(category)}>
                <FileText size={20} color="#0066CC" />
                <Text style={styles.modalItemText}>{category.description1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
            <Text style={styles.modalTitle}>{initialAppointment.id ? 'Modifier le rendez-vous' : 'Ajouter un rendez-vous'}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#1a1a1a" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollViewContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date du rendez-vous</Text>
              <TouchableOpacity style={[styles.inputWrapper, errors.date && styles.inputError]} onPress={() => setDatePickerVisible(true)}>
                <Calendar size={20} color={errors.date ? '#ff4444' : '#666'} />
                <Text style={styles.inputText}>{localAppointment.date || 'Sélectionner une date'}</Text>
              </TouchableOpacity>
              {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                onConfirm={(date) => {
                  setLocalAppointment(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
                  setDatePickerVisible(false);
                  setErrors(prev => ({ ...prev, date: undefined }));
                }}
                onCancel={() => setDatePickerVisible(false)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Heure du rendez-vous</Text>
              <TouchableOpacity style={[styles.inputWrapper, errors.time && styles.inputError]} onPress={() => setTimePickerVisible(true)}>
                <Clock size={20} color={errors.time ? '#ff4444' : '#666'} />
                <Text style={styles.inputText}>{localAppointment.time || 'Sélectionner une heure'}</Text>
              </TouchableOpacity>
              {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}
              <DateTimePickerModal
                isVisible={isTimePickerVisible}
                mode="time"
                onConfirm={(time) => {
                  const hours = time.getHours().toString().padStart(2, '0');
                  const minutes = time.getMinutes().toString().padStart(2, '0');
                  setLocalAppointment(prev => ({ ...prev, time: `${hours}:${minutes}:00` }));
                  setTimePickerVisible(false);
                  setErrors(prev => ({ ...prev, time: undefined }));
                }}
                onCancel={() => setTimePickerVisible(false)}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Durée (minutes)</Text>
              <TextInput
                style={[styles.textArea, errors.duration && styles.inputError]}
                value={localAppointment.duration != null ? localAppointment.duration.toString() : ''}
                onChangeText={(text) => {
                  const parsedValue = parseInt(text, 10);
                  setLocalAppointment(prev => ({ ...prev, duration: isNaN(parsedValue) ? null : parsedValue }));
                  setErrors(prev => ({ ...prev, duration: undefined }));
                }}
                placeholder="ex: 60"
                keyboardType="numeric"
              />
              {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.textArea, errors.description && styles.inputError]}
                value={localAppointment.description || ''}
                onChangeText={(text) => {
                  setLocalAppointment(prev => ({ ...prev, description: text }));
                  setErrors(prev => ({ ...prev, description: undefined }));
                }}
                placeholder="Description du rendez-vous"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Client</Text>
              <TouchableOpacity style={[styles.inputWrapper, errors.client && styles.inputError]} onPress={() => setShowClientModal(true)}>
                <User size={20} color={errors.client ? '#ff4444' : '#666'} />
                <Text style={styles.inputText}>{selectedClient?.name || 'Sélectionner un client'}</Text>
              </TouchableOpacity>
              {errors.client && <Text style={styles.errorText}>{errors.client}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bateau</Text>
              <TouchableOpacity style={[styles.inputWrapper, errors.boat && styles.inputError]} onPress={() => setShowBoatModal(true)}>
                <Boat size={20} color={errors.boat ? '#ff4444' : '#666'} />
                <Text style={styles.inputText}>{selectedBoat?.name || 'Sélectionner un bateau'}</Text>
              </TouchableOpacity>
              {errors.boat && <Text style={styles.errorText}>{errors.boat}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type de service</Text>
              <TouchableOpacity style={[styles.inputWrapper, errors.serviceCategory && styles.inputError]} onPress={() => setShowServiceCategoryModal(true)}>
                <FileText size={20} color={errors.serviceCategory ? '#ff4444' : '#666'} />
                <Text style={styles.inputText}>{selectedServiceCategory?.description1 || 'Sélectionner un type de service'}</Text>
              </TouchableOpacity>
              {errors.serviceCategory && <Text style={styles.errorText}>{errors.serviceCategory}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Statut</Text>
              <View style={styles.statusOptions}>
                {['en_attente', 'confirme', 'annule', 'termine'].map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      localAppointment.status === status && styles.statusOptionSelected
                    ]}
                    onPress={() => setLocalAppointment(prev => ({ ...prev, status: status as Appointment['status'] }))}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      localAppointment.status === status && styles.statusOptionTextSelected
                    ]}>
                      {status === 'en_attente' ? 'En attente' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Check size={20} color="white" />
              <Text style={styles.submitButtonText}>{initialAppointment.id ? 'Modifier' : 'Ajouter'}</Text>
            </TouchableOpacity>
          </ScrollView>

          <ClientSelectionModal />
          <BoatSelectionModal />
          <ServiceCategorySelectionModal />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
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
  scrollViewContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
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
  inputText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textArea: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  statusOptionSelected: {
    borderColor: '#0066CC',
    backgroundColor: '#f0f7ff',
  },
  statusOptionText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  statusOptionTextSelected: {
    color: '#0066CC',
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
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
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modalBody: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
});
