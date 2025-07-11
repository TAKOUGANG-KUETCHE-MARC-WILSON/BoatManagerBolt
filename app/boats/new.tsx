import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Image, Modal, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, X, MapPin, Search, User, Phone, Mail, Info, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import PortSelectionModal from '@/components/PortSelectionModal';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

interface BoatForm {
  photo: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  constructionYear: string;
  engine: string;
  engineHours: string;
  length: string;
  homePort: string; // Display name for the port
  portId: string; // ID for the port in the database
}

interface BoatManagerDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
}

const PhotoModal = ({ visible, onClose, onChoosePhoto, onDeletePhoto, hasPhoto }: {
  visible: boolean;
  onClose: () => void;
  onChoosePhoto: () => void;
  onDeletePhoto: () => void;
  hasPhoto: boolean;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Photo du bateau</Text>

        <TouchableOpacity style={styles.modalOption} onPress={onChoosePhoto}>
          <ImageIcon size={24} color="#0066CC" />
          <Text style={styles.modalOptionText}>Choisir dans la galerie</Text>
        </TouchableOpacity>

        {hasPhoto && (
          <TouchableOpacity 
            style={[styles.modalOption, styles.deleteOption]} 
            onPress={() => {
              onDeletePhoto();
              onClose();
            }}
          >
            <X size={24} color="#ff4444" />
            <Text style={styles.deleteOptionText}>Supprimer la photo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.modalCancelButton}
          onPress={onClose}
        >
          <Text style={styles.modalCancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

export default function NewBoatScreen() {
  const { user, ports: availablePorts } = useAuth();
  const [form, setForm] = useState<BoatForm>({
    photo: '',
    name: '',
    type: '',
    manufacturer: '',
    model: '',
    constructionYear: '',
    engine: '',
    engineHours: '',
    length: '',
    homePort: '',
    portId: '',
  });
  const [errors, setErrors] = useState<Partial<BoatForm>>({});
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [showPortModal, setShowPortModal] = useState(false);
  const [portSearch, setPortSearch] = useState('');
  const [selectedBoatManagerDetails, setSelectedBoatManagerDetails] = useState<BoatManagerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch Boat Manager details when portId changes
  useEffect(() => {
    const fetchBoatManagerDetails = async () => {
      if (form.portId) {
        // Find the boat manager ID associated with the selected port
        const { data: userPorts, error: userPortsError } = await supabase
          .from('user_ports')
          .select('user_id')
          .eq('port_id', parseInt(form.portId))
          .limit(1); // Assuming one boat manager per port for simplicity

        if (userPortsError) {
          console.error('Error fetching user_ports:', userPortsError);
          setSelectedBoatManagerDetails(null);
          return;
        }

        if (userPorts && userPorts.length > 0) {
          const boatManagerId = userPorts[0].user_id;
          // Fetch boat manager's profile details
          const { data: bmProfile, error: bmProfileError } = await supabase
            .from('users')
            .select('id, first_name, last_name, e_mail, phone, avatar')
            .eq('id', boatManagerId)
            .eq('profile', 'boat_manager') // Ensure it's a boat manager
            .single();

          if (bmProfileError) {
            console.error('Error fetching boat manager profile:', bmProfileError);
            setSelectedBoatManagerDetails(null);
            return;
          }

          if (bmProfile) {
            setSelectedBoatManagerDetails({
              id: bmProfile.id,
              firstName: bmProfile.first_name,
              lastName: bmProfile.last_name,
              email: bmProfile.e_mail,
              phone: bmProfile.phone,
              avatar: bmProfile.avatar,
            });
          } else {
            setSelectedBoatManagerDetails(null);
          }
        } else {
          setSelectedBoatManagerDetails(null);
        }
      } else {
        setSelectedBoatManagerDetails(null);
      }
    };

    fetchBoatManagerDetails();
  }, [form.portId]);

  const handleChoosePhoto = async () => {
    if (!mediaPermission?.granted) {
      const permission = await requestMediaPermission();
      if (!permission.granted) return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled) {
      setForm(prev => ({ ...prev, photo: result.assets[0].uri }));
    }
    setShowPhotoModal(false);
  };

  const handleDeletePhoto = () => {
    setForm(prev => ({ ...prev, photo: '' }));
  };

  const handleSelectPort = (port: { id: string; name: string }) => {
    setForm(prev => ({ 
      ...prev, 
      portId: port.id,
      homePort: port.name 
    }));
    setPortSearch(port.name);
    setShowPortModal(false);
    if (errors.homePort) {
      setErrors(prev => ({ ...prev, homePort: undefined }));
    }
  };

  const handlePortInputChange = (text: string) => {
    setPortSearch(text);
    setShowPortModal(true); // Always show modal when typing
    setForm(prev => ({ ...prev, portId: '', homePort: text })); // Clear portId until a valid one is selected
  };

  const validateForm = () => {
    const newErrors: Partial<BoatForm> = {};
    
    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (!form.type.trim()) newErrors.type = 'Le type est requis';
    if (!form.manufacturer.trim()) newErrors.manufacturer = 'Le constructeur est requis';
    if (!form.length.trim()) newErrors.length = 'La longueur est requise';
    if (!form.portId) newErrors.homePort = 'Le port d\'attache est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      if (!user?.id) {
        Alert.alert('Erreur', 'Utilisateur non authentifié.');
        return;
      }

      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from('boat')
          .insert({
            id_user: user.id,
            name: form.name,
            type: form.type,
            modele: form.model,
            annee_construction: form.constructionYear ? `${form.constructionYear}-01-01` : null, // Assuming YYYY format, set to Jan 1st
            type_moteur: form.engine,
            temps_moteur: form.engineHours,
            longueur: form.length,
            image: form.photo,
            id_port: parseInt(form.portId),
            constructeur: form.manufacturer,
            // 'etat' is not in the form, assuming it has a default value in DB or is nullable
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error inserting boat:', error);
          Alert.alert('Erreur', `Échec de l'ajout du bateau: ${error.message}`);
        } else {
          Alert.alert(
            'Succès',
            'Votre bateau a été créé et rattaché au Boat Manager avec succès.',
            [
              {
                text: 'OK',
                onPress: () => router.push(`/boats/${data.id}`) // Navigate to the new boat's profile
              }
            ]
          );
        }
      } catch (e) {
        console.error('Unexpected error during boat submission:', e);
        Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Nouveau bateau</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nom du bateau</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={form.name}
            onChangeText={(text) => setForm(prev => ({ ...prev, name: text }))}
            placeholder="ex: Le Grand Bleu"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Type de bateau</Text>
          <TextInput
            style={[styles.input, errors.type && styles.inputError]}
            value={form.type}
            onChangeText={(text) => setForm(prev => ({ ...prev, type: text }))}
            placeholder="ex: Voilier, Yacht, Catamaran"
          />
          {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Constructeur</Text>
          <TextInput
            style={[styles.input, errors.manufacturer && styles.inputError]}
            value={form.manufacturer}
            onChangeText={(text) => setForm(prev => ({ ...prev, manufacturer: text }))}
            placeholder="ex: Bénéteau, Jeanneau"
          />
          {errors.manufacturer && <Text style={styles.errorText}>{errors.manufacturer}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Modèle</Text>
          <TextInput
            style={styles.input}
            value={form.model}
            onChangeText={(text) => setForm(prev => ({ ...prev, model: text }))}
            placeholder="ex: Oceanis 45"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Année de construction</Text>
          <TextInput
            style={styles.input}
            value={form.constructionYear}
            onChangeText={(text) => setForm(prev => ({ ...prev, constructionYear: text }))}
            placeholder="ex: 2020"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Moteur</Text>
          <TextInput
            style={styles.input}
            value={form.engine}
            onChangeText={(text) => setForm(prev => ({ ...prev, engine: text }))}
            placeholder="ex: Volvo Penta D2-50"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Heures moteur</Text>
          <TextInput
            style={styles.input}
            value={form.engineHours}
            onChangeText={(text) => setForm(prev => ({ ...prev, engineHours: text }))}
            placeholder="ex: 500"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Longueur</Text>
          <TextInput
            style={[styles.input, errors.length && styles.inputError]}
            value={form.length}
            onChangeText={(text) => setForm(prev => ({ ...prev, length: text }))}
            placeholder="ex: 12m"
          />
          {errors.length && <Text style={styles.errorText}>{errors.length}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Port d'attache</Text>
          <View style={[styles.inputWrapper, errors.homePort && styles.inputWrapperError]}>
            <MapPin size={20} color={errors.homePort ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.portInput}
              placeholder="Port d'attache"
              value={portSearch}
              onChangeText={handlePortInputChange}
              onFocus={() => setShowPortModal(true)}
            />
            {portSearch.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setPortSearch('');
                  setForm(prev => ({ ...prev, portId: '', homePort: '' }));
                  setSelectedBoatManagerDetails(null);
                }}
              >
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
          {errors.homePort && <Text style={styles.errorText}>{errors.homePort}</Text>}
        </View>

        {selectedBoatManagerDetails && (
          <View style={styles.boatManagerInfo}>
            <View style={styles.boatManagerHeader}>
              <Info size={20} color="#0066CC" />
              <Text style={styles.boatManagerTitle}>Boat Manager assigné</Text>
            </View>
            <View style={styles.boatManagerDetails}>
              <View style={styles.boatManagerRow}>
                <User size={16} color="#666" />
                <Text style={styles.boatManagerText}>{selectedBoatManagerDetails.firstName} {selectedBoatManagerDetails.lastName}</Text>
              </View>
              <View style={styles.boatManagerRow}>
                <Phone size={16} color="#666" />
                <Text style={styles.boatManagerText}>{selectedBoatManagerDetails.phone}</Text>
              </View>
              <View style={styles.boatManagerRow}>
                <Mail size={16} color="#666" />
                <Text style={styles.boatManagerText}>{selectedBoatManagerDetails.email}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Moved photo section to the bottom */}
        <TouchableOpacity 
          style={styles.photoContainer}
          onPress={() => setShowPhotoModal(true)}
        >
          {form.photo ? (
            <>
              <Image 
                source={{ uri: form.photo }}
                style={styles.photoPreview}
              />
              <TouchableOpacity
                style={styles.deletePhotoButton}
                onPress={handleDeletePhoto}
              >
                <X size={20} color="white" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.photoPlaceholder}>
              <ImageIcon size={32} color="#666" />
              <Text style={styles.photoText}>Ajouter une photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Check size={20} color="white" />
              <Text style={styles.submitButtonText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <PhotoModal 
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onChoosePhoto={handleChoosePhoto}
        onDeletePhoto={handleDeletePhoto}
        hasPhoto={!!form.photo}
      />
      <PortSelectionModal
        visible={showPortModal}
        onClose={() => setShowPortModal(false)}
        onSelectPort={handleSelectPort}
        selectedPortId={form.portId}
        portsData={availablePorts}
        searchQuery={portSearch}
        onSearchQueryChange={setPortSearch}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  form: {
    padding: 16,
    gap: 20,
  },
  photoContainer: {
    width: '100%',
    height: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    gap: 8,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  photoText: {
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#1a1a1a',
  },
  inputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#ff4444',
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
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  deleteOption: {
    backgroundColor: '#fff5f5',
  },
  deleteOptionText: {
    fontSize: 16,
    color: '#ff4444',
  },
  modalCancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 48,
  },
  portInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  boatManagerInfo: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  boatManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatManagerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  boatManagerDetails: {
    gap: 8,
  },
  boatManagerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatManagerText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
});
