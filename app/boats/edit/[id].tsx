import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Image, Modal, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

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
}

// This would typically come from your API or database
const boatsData = {
  '1': {
    photo: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop',
    name: 'Le Grand Bleu',
    type: 'Voilier',
    manufacturer: 'Bénéteau',
    model: 'Oceanis 45',
    constructionYear: '2020',
    engine: 'Volvo Penta D2-50',
    engineHours: '500',
    length: '12m',
    homePort: 'Port de Marseille',
  },
  '2': {
    photo: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?q=80&w=2044&auto=format&fit=crop',
    name: 'Le Petit Prince',
    type: 'Yacht',
    manufacturer: 'Jeanneau',
    model: 'Sun Odyssey 410',
    constructionYear: '2022',
    engine: 'Yanmar 4JH45',
    engineHours: '200',
    length: '15m',
    homePort: 'Port de Nice',
  },
};

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

export default function EditBoatScreen() {
  const { id } = useLocalSearchParams();
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
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
  });

  useEffect(() => {
    // Load boat data based on ID
    if (id && typeof id === 'string' && boatsData[id]) {
      setForm(boatsData[id]);
    }
  }, [id]);

  const [errors, setErrors] = useState<Partial<BoatForm>>({});

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

  const validateForm = () => {
    const newErrors: Partial<BoatForm> = {};
    
    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (!form.type.trim()) newErrors.type = 'Le type est requis';
    if (!form.manufacturer.trim()) newErrors.manufacturer = 'Le constructeur est requis';
    if (!form.length.trim()) newErrors.length = 'La longueur est requise';
    if (!form.homePort.trim()) newErrors.homePort = 'Le port d\'attache est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Here you would typically update the boat data
      Alert.alert(
        'Succès',
        'Les modifications ont été enregistrées avec succès.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le bateau',
      'Êtes-vous sûr de vouloir supprimer ce bateau ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // Here you would typically delete the boat
            Alert.alert(
              'Succès',
              'Le bateau a été supprimé avec succès.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(tabs)/profile')
                }
              ]
            );
          },
        },
      ]
    );
  };

  if (!id || typeof id !== 'string' || !boatsData[id]) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Bateau non trouvé</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ce bateau n'existe pas.</Text>
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Modifier le bateau</Text>
      </View>

      <View style={styles.form}>
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
          <TextInput
            style={[styles.input, errors.homePort && styles.inputError]}
            value={form.homePort}
            onChangeText={(text) => setForm(prev => ({ ...prev, homePort: text }))}
            placeholder="ex: Port de Marseille"
          />
          {errors.homePort && <Text style={styles.errorText}>{errors.homePort}</Text>}
        </View>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>Supprimer le bateau</Text>
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
});