import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Image, Modal, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Image as ImageIcon, X, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client
import PortSelectionModal from '@/components/PortSelectionModal'; // Import the new component
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';








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
  place_de_port: string; // Added place_de_port
}




const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));




// Helper to get the public URL for an image in a specific bucket
const getPublicImageUrl = (filePath: string, bucketName: string): string => {
  if (!filePath) return '';
  // If it's already a full HTTP URL, return it directly
  if (isHttpUrl(filePath)) return filePath;




  // Otherwise, construct the public URL from the file path
  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
  return data?.publicUrl || '';
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
    portId: '',
    place_de_port: '', // Initialize place_de_port
  });
  const [errors, setErrors] = useState<Partial<BoatForm>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showPortModal, setShowPortModal] = useState(false);
  const [portSearch, setPortSearch] = useState('');
  const [availablePorts, setAvailablePorts] = useState<Array<{ id: string; name: string }>>([]);




  useEffect(() => {
  const fetchBoatData = async () => {
    if (!id || typeof id !== 'string') {
      setFetchError('ID du bateau manquant.');
      setLoading(false);
      return;
    }




    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from('boat')
        .select(`
          id,
          name,
          type,
          modele,
          annee_construction,
          type_moteur,
          temps_moteur,
          longueur,
          image,
          id_port,
          constructeur,
          ports(name),
          place_de_port
        `)
        .eq('id', id)
        .single();




      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          setFetchError('Bateau non trouvé.');
        } else {
          console.error('Error fetching boat:', error);
          setFetchError('Erreur lors du chargement du bateau.');
        }
        setLoading(false);
        return;
      }




      if (data) {
        // Use getPublicImageUrl to ensure we always get a public URL for display
        const publicPhotoUrl = getPublicImageUrl(data.image || '', 'boat.images');




        setForm({
          photo: publicPhotoUrl ||
            'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?q=80&w=2044&auto=format&fit=crop',
          name: data.name || '',
          type: data.type || '',
          manufacturer: data.constructeur || '',
          model: data.modele || '',
          constructionYear: data.annee_construction
            ? new Date(data.annee_construction).getFullYear().toString()
            : '',
          engine: data.type_moteur || '',
          engineHours: data.temps_moteur ? data.temps_moteur.toString() : '',
          length: data.longueur || '',
          homePort: data.ports?.name || '',
          portId: data.id_port?.toString() || '',
          place_de_port: data.place_de_port || '',
        });
        setPortSearch(data.ports?.name || '');
      } else {
        setFetchError('Bateau non trouvé.');
      }
    } catch (e) {
      console.error('Unexpected error fetching boat:', e);
      setFetchError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };




  const fetchPorts = async () => {
    const { data, error } = await supabase.from('ports').select('id, name');
    if (error) {
      console.error('Error fetching ports:', error);
    } else {
      setAvailablePorts(data.map(p => ({ id: p.id.toString(), name: p.name })));
    }
  };




  fetchBoatData();
  fetchPorts();
}, [id]);








  const handleChoosePhoto = async () => {
    try {
      if (!mediaPermission?.granted) {
        const permission = await requestMediaPermission();
        if (!permission.granted) {
          Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à votre galerie.');
          setShowPhotoModal(false);
          return;
        }
      }




      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });




      if (pickerResult.canceled || !pickerResult.assets?.length) {
        setShowPhotoModal(false);
        return;
      }




      const asset = pickerResult.assets[0];




      // Manipulate image and store local URI
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );




      setForm(prev => ({ ...prev, photo: manipulatedImage.uri })); // Store local URI
      setShowPhotoModal(false); // Close modal after selection
    } catch (e) {
      console.error('Erreur lors de la sélection de l\'image:', e);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image.');
      setShowPhotoModal(false);
    }
  };




  const handleDeletePhoto = async () => {
    // Check if the current photo URL is from Supabase Storage
    if (form.photo && form.photo.includes(getPublicImageUrl('', 'boat.images'))) { // Check against base public URL
      try {
        const filePath = form.photo.split(getPublicImageUrl('', 'boat.images'))[1]; // Extract path
        if (filePath) {
          const { error } = await supabase.storage
            .from('boat.images')
            .remove([filePath]);
          if (error) {
            console.error('Error deleting image from storage:', error);
            Alert.alert('Erreur', `Échec de la suppression de l'image du stockage: ${error.message}`);
            return;
          }
        }
      } catch (e: any) {
        console.error('Error processing image deletion:', e.message || e);
        Alert.alert('Erreur', `Une erreur est survenue lors de la suppression de l'image: ${e.message || 'Veuillez réessayer.'}`);
      }
    }
    setForm(prev => ({ ...prev, photo: '' })); // Reset to empty string
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
    if (!form.place_de_port.trim()) newErrors.place_de_port = 'La place de port est requise'; // Validate place_de_port




    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };




  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }




    setLoading(true);
    let finalImageUrl = form.photo; // Start with current photo URL




    // If photo is a local URI (newly selected), upload it to Supabase
    if (form.photo && !form.photo.startsWith('http')) {
      try {
        const fileName = `boat_images/${id}/${Date.now()}.jpeg`;
        const contentType = 'image/jpeg';




        // Read the file as base64
        const base64 = await FileSystem.readAsStringAsync(form.photo, {
          encoding: FileSystem.EncodingType.Base64,
        });
        // Convert base64 to Buffer (Uint8Array)
        const fileBuffer = Buffer.from(base64, 'base64');




        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('boat.images') // Specify the bucket name here
          .upload(fileName, fileBuffer, { // Use the fileBuffer
            contentType,
            upsert: true, // Use upsert to overwrite if file with same name exists
          });




        if (uploadError) {
          console.error('Erreur upload Supabase:', uploadError);
          Alert.alert('Erreur', `Échec du téléchargement de l'image: ${uploadError.message}`);
          setLoading(false);
          return;
        }




        // Get the public URL directly
        finalImageUrl = getPublicImageUrl(uploadData.path, 'boat.images');




      } catch (e) {
        console.error('Erreur lors du téléchargement de l\'image:', e);
        Alert.alert('Erreur', 'Une erreur est survenue lors du téléchargement de l\'image.');
        setLoading(false);
        return;
      }
    }




    try {
      const { error } = await supabase
        .from('boat')
        .update({
          name: form.name,
          type: form.type,
          modele: form.model,
          annee_construction: form.constructionYear ? `${form.constructionYear}-01-01` : null,
          type_moteur: form.engine,
          temps_moteur: form.engineHours ? form.engineHours : null,
          longueur: form.length,
          image: finalImageUrl, // Use the final public image URL
          id_port: parseInt(form.portId),
          constructeur: form.manufacturer,
          place_de_port: form.place_de_port, // Include place_de_port in update
        })
        .eq('id', id);




      if (error) {
        console.error('Error updating boat:', error);
        Alert.alert('Erreur', `Échec de la mise à jour du bateau: ${error.message}`);
      } else {
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
    } catch (e) {
      console.error('Unexpected error during boat update:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
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
          onPress: async () => {
            setLoading(true);
            try {
              // Delete image from storage first
              if (form.photo && form.photo.includes(getPublicImageUrl('', 'boat.images'))) { // Check against base public URL
                const filePath = form.photo.split(getPublicImageUrl('', 'boat.images'))[1]; // Extract path
                if (filePath) {
                  const { error: deleteImageError } = await supabase.storage
                    .from('boat.images')
                    .remove([filePath]);
                  if (deleteImageError) {
                    console.warn('Error deleting boat image from storage:', deleteImageError);
                  }
                }
              }




              // Then delete boat record
              const { error } = await supabase
                .from('boat')
                .delete()
                .eq('id', id);




              if (error) {
                console.error('Error deleting boat:', error);
                Alert.alert('Erreur', `Échec de la suppression du bateau: ${error.message}`);
              } else {
                Alert.alert(
                  'Succès',
                  'Le bateau a été supprimé avec succès.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.replace('/(tabs)/profile') // Redirect to profile after deletion
                    }
                  ]
                );
              }
            } catch (e) {
              console.error('Unexpected error during boat deletion:', e);
              Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };




  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Modifier le bateau</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Chargement des données...</Text>
        </View>
      </View>
    );
  }




  if (fetchError) {
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
          <Text style={styles.errorText}>{fetchError || 'Ce bateau n\'existe pas ou vous n\'avez pas les permissions pour le voir.'}</Text>
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
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
    <Stack.Screen options={{ headerShown: false }} />
    <StatusBar style="dark" backgroundColor="#fff" />




    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#1a1a1a" />
      </TouchableOpacity>




      <Text style={styles.title}>Modifier le bateau</Text>




      {/* Placeholder pour garder le titre parfaitement centré */}
      <View style={{ width: 36, height: 36 }} />
    </View>




    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Image source={{ uri: form.photo }} style={styles.boatImage} resizeMode="cover" />




      {/* Tabs for boat details - assuming these are part of the original file structure */}
      {/* You might need to uncomment and adjust these sections based on your actual file */}
      {/*
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'general' && styles.activeTab]}
          onPress={() => setActiveTab('general')}
        >
          <Text style={[styles.tabText, activeTab === 'general' && styles.activeTabText]}>
            Informations Générales
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
          onPress={() => setActiveTab('documents')}
        >
          <Text style={[styles.tabText, activeTab === 'documents' && styles.activeTabText]}>
            Documents Administratifs
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'technical' && styles.activeTab]}
          onPress={() => setActiveTab('technical')}
        >
          <Text style={[styles.tabText, activeTab === 'technical' && styles.activeTabText]}>
            Carnet de suivi technique
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
          onPress={() => setActiveTab('inventory')}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
            Inventaire du bateau
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'usage' && styles.activeTab]}
          onPress={() => setActiveTab('usage')}
        >
          <Text style={[styles.tabText, activeTab === 'usage' && styles.activeTabText]}>
            Type d'utilisation
          </Text>
        </TouchableOpacity>
      </View>
      */}




      {/* General Info Tab Content - assuming this is part of the original file structure */}
      {/* You might need to uncomment and adjust these sections based on your actual file */}
      {/*
      {activeTab === 'general' && (
        <View style={styles.tabContent}>
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ship size={20} color="#666" />
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>{form.type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Tag size={20} color="#666" />
              <Text style={styles.infoLabel}>Constructeur:</Text>
              <Text style={styles.infoValue}>{form.manufacturer}</Text>
            </mView>
            <View style={styles.infoRow}>
              <Info size={20} color="#666" />
              <Text style={styles.infoLabel}>Modèle:</Text>
              <Text style={styles.infoValue}>{form.model}</Text>
            </View>
            <View style={styles.infoRow}>
              <Calendar size={20} color="#666" />
              <Text style={styles.infoLabel}>Année de construction:</Text>
              <Text style={styles.infoValue}>{form.constructionYear}</Text>
            </View>
            <View style={styles.infoRow}>
              <Settings size={20} color="#666" />
              <Text style={styles.infoLabel}>Moteur:</Text>
              <Text style={styles.infoValue}>{form.engine}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={20} color="#666" />
              <Text style={styles.infoLabel}>Heures moteur:</Text>
              <Text style={styles.infoValue}>{form.engineHours}</Text>
            </View>
            <View style={styles.infoRow}>
              <Wrench size={20} color="#666" />
              <Text style={styles.infoLabel}>Longueur:</Text>
              <Text style={styles.infoValue}>{form.length}</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={20} color="#666" />
              <Text style={styles.infoLabel}>Port d'attache:</Text>
              <Text style={styles.infoValue}>{form.homePort}</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={20} color="#666" />
              <Text style={styles.infoLabel}>Place de port:</Text>
              <Text style={styles.infoValue}>{form.place_de_port}</Text>
            </View>
          </View>
        </View>
      )}
      */}




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
                onError={(e) => console.log('Image loading error:', e.nativeEvent.error, 'URL:', form.photo)}
                onLoad={() => console.log('Image loaded successfully. URL:', form.photo)}
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
  <TouchableOpacity
  onPress={() => setShowPortModal(true)}
  activeOpacity={0.7}
  style={[
    styles.inputWrapper,
    errors.homePort && styles.inputWrapperError
  ]}
>
  <MapPin size={20} color={errors.homePort ? '#ff4444' : '#666'} />
  <TextInput
    style={styles.portInput}
    value={form.homePort || ''}
    editable={false}
    pointerEvents="none" // désactive le focus, ne sort pas le clavier
    placeholder="Port d'attache"
    placeholderTextColor="#999"
  />
  {/* Removed ImageIcon as it's not used in the original code */}
</TouchableOpacity>
  {errors.homePort && <Text style={styles.errorText}>{errors.homePort}</Text>}
</View>




        <View style={styles.inputContainer}>
          <Text style={styles.label}>Place de port</Text>
          <View style={[styles.inputWrapper, errors.place_de_port && styles.inputWrapperError]}>
            <MapPin size={20} color={errors.place_de_port ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.input}
              value={form.place_de_port}
              onChangeText={(text) => setForm(prev => ({ ...prev, place_de_port: text }))}
              placeholder="ex: A12, Ponton B"
            />
          </View>
          {errors.place_de_port && <Text style={styles.errorText}>{errors.place_de_port}</Text>}
        </View>




        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
          )}
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
    </SafeAreaView>
  );
}




const styles = StyleSheet.create({
   safeArea: {
    flex: 1,
    backgroundColor: '#fff', // comme le header
  },
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',   // <-- clé pour le centrage du titre
    paddingVertical: 12,               // plus besoin de paddingTop manuel
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#0066CC',
    shadowOpacity: 0.10,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f5f6fa',
    marginRight: 12,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0066CC',
    letterSpacing: 1,
  },
  editButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f5f6fa',
    marginLeft: 12,
  },
  editButtonText: {
    color: '#0066CC',
    fontWeight: '600',
    fontSize: 16,
  },
  form: {
    padding: 18,
    gap: 20,
  },
  photoContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    resizeMode: 'cover',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff4444',
    borderRadius: 999,
    padding: 10,
    zIndex: 10,
    elevation: 3,
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f0f7ff',
  },
  photoText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
    opacity: 0.9,
  },
  inputContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 4,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e0e7ef',
    paddingHorizontal: 14,
    height: 50,
    shadowColor: '#0066CC',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  inputWrapperError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#22223b',
    fontWeight: '500',
    height: '100%',
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  portInput: {
  flex: 1,
  marginLeft: 8,
  fontSize: 16,
  height: '100%',
  fontWeight: '500',
  textAlignVertical: 'center',
  includeFontPadding: false,
  paddingVertical: 0,   // Essaye avec 0 ou 2, ajuste si besoin
},
  clearButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginLeft: 4,
  },
  clearButtonText: {
    fontSize: 20,
    color: '#aaa',
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 13,
    color: '#ff4444',
    marginLeft: 4,
    marginTop: 2,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 10,
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#8cb6e6',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#ff4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 28,
    gap: 20,
    shadowColor: '#22223b',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
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
    gap: 14,
    padding: 14,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 2,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  deleteOption: {
    backgroundColor: '#fff5f5',
  },
  deleteOptionText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
  },
  modalCancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 40,
  },
  loadingText: {
    fontSize: 17,
    color: '#0066CC',
    fontWeight: '600',
    marginTop: 14,
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
    borderRadius: 10,
    marginTop: 16,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});









