import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Image, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, X, MapPin, Search, User, Phone, Mail, Info } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';

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
  homePort: string;
  portId: string;
}

interface Port {
  id: string;
  name: string;
  boatManagerId: string;
}

interface BoatManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  ports: string[];
}

const mockBoatManagers: BoatManager[] = [
  { id: 'bm1', name: 'Marie Martin', email: 'marie.martin@ybm.com', phone: '+33612345678', ports: ['p1'] },
  { id: 'bm2', name: 'Pierre Dubois', email: 'pierre.dubois@ybm.com', phone: '+33623456789', ports: ['p2'] },
  { id: 'bm3', name: 'Sophie Laurent', email: 'sophie.laurent@ybm.com', phone: '+33634567890', ports: ['p3'] },
  { id: 'bm4', name: 'Lucas Bernard', email: 'lucas.bernard@ybm.com', phone: '+33645678901', ports: ['p4'] },
];

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
  const { ports } = useAuth();
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
  const [showPortSuggestions, setShowPortSuggestions] = useState(false);
  const [portSearch, setPortSearch] = useState('');

  const filteredPorts = ports.filter(port => 
    port.name.toLowerCase().includes(portSearch.toLowerCase())
  );

  const selectedBoatManager = form.portId 
    ? mockBoatManagers.find(bm => 
        bm.ports.includes(form.portId)
      )
    : null;

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
    setShowPortSuggestions(false);
    if (errors.homePort) {
      setErrors(prev => ({ ...prev, homePort: undefined }));
    }
  };

  const handlePortInputChange = (text: string) => {
    setPortSearch(text);
    setShowPortSuggestions(true);
    setForm(prev => ({ ...prev, portId: '', homePort: text }));
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

  const handleSubmit = () => {
    if (validateForm()) {
      // Find the boat manager for the selected port
      const selectedPort = ports.find(port => port.id === form.portId);
      if (!selectedPort) {
        Alert.alert('Erreur', 'Port d\'attache invalide');
        return;
      }

      // Show confirmation with boat manager assignment
      Alert.alert(
        'Confirmation',
        'Votre bateau sera automatiquement rattaché au Boat Manager du port sélectionné. Voulez-vous continuer ?',
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Confirmer',
            onPress: () => {
              // Here you would typically save the boat data and create the association
              // For now, we'll just show a success message and navigate to the boat profile
              Alert.alert(
                'Succès',
                'Votre bateau a été créé et rattaché au Boat Manager avec succès.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.push(`/boats/1`) // Navigate to the boat profile page
                  }
                ]
              );
            }
          }
        ]
      );
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
              onFocus={() => setShowPortSuggestions(true)}
            />
            {portSearch.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setPortSearch('');
                  setForm(prev => ({ ...prev, portId: '', homePort: '' }));
                  setShowPortSuggestions(true);
                }}
              >
                <Text style={styles.clearButtonText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
          {showPortSuggestions && portSearch.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <View style={styles.suggestionsHeader}>
                <Search size={16} color="#666" />
                <Text style={styles.suggestionsTitle}>
                  {filteredPorts.length > 0 
                    ? `${filteredPorts.length} port${filteredPorts.length > 1 ? 's' : ''} trouvé${filteredPorts.length > 1 ? 's' : ''}`
                    : 'Aucun port trouvé'
                  }
                </Text>
              </View>
              <ScrollView style={styles.suggestionsList}>
                {filteredPorts.map((port) => (
                  <TouchableOpacity
                    key={port.id}
                    style={[
                      styles.suggestionItem,
                      port.id === form.portId && styles.selectedSuggestionItem
                    ]}
                    onPress={() => handleSelectPort(port)}
                  >
                    <MapPin 
                      size={16} 
                      color={port.id === form.portId ? '#0066CC' : '#666'} 
                    />
                    <Text style={[
                      styles.suggestionText,
                      port.id === form.portId && styles.selectedSuggestionText
                    ]}>
                      {port.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          {errors.homePort && <Text style={styles.errorText}>{errors.homePort}</Text>}
        </View>

        {selectedBoatManager && (
          <View style={styles.boatManagerInfo}>
            <View style={styles.boatManagerHeader}>
              <Info size={20} color="#0066CC" />
              <Text style={styles.boatManagerTitle}>Boat Manager assigné</Text>
            </View>
            <View style={styles.boatManagerDetails}>
              <View style={styles.boatManagerRow}>
                <User size={16} color="#666" />
                <Text style={styles.boatManagerText}>{selectedBoatManager.name}</Text>
              </View>
              <View style={styles.boatManagerRow}>
                <Phone size={16} color="#666" />
                <Text style={styles.boatManagerText}>{selectedBoatManager.phone}</Text>
              </View>
              <View style={styles.boatManagerRow}>
                <Mail size={16} color="#666" />
                <Text style={styles.boatManagerText}>{selectedBoatManager.email}</Text>
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
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>

      <PhotoModal 
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onChoosePhoto={handleChoosePhoto}
        onDeletePhoto={handleDeletePhoto}
        hasPhoto={!!form.photo}
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
  suggestionsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 4,
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
      web: {
        boxBoxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionsTitle: {
    fontSize: 14,
    color: '#666',
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedSuggestionItem: {
    backgroundColor: '#f0f7ff',
  },
  suggestionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  selectedSuggestionText: {
    color: '#0066CC',
    fontWeight: '500',
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

