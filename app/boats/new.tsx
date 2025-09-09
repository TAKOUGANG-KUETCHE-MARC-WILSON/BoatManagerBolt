// app/boats/new.tsx (version sans brouillon local)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Image as ImageIcon,
  X,
  MapPin,
  User as UserIcon,
  Phone,
  Mail,
  Info,
  Check,
  Ship,
  Calendar,
  Wrench,
  Clock,
  Ruler,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import PortSelectionModal from '@/components/PortSelectionModal';
import { supabase } from '@/src/lib/supabase';

type IconProps = { size?: number; color?: string };
type IconType = React.ComponentType<IconProps>;

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
  place_de_port: string;
}

interface BoatManagerDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string | null;
}

const BASELINE_WIDTH = 375;
const ms = (size: number, width: number) => Math.round((width / BASELINE_WIDTH) * size);

const PhotoModal = ({
  visible,
  onClose,
  onChoosePhoto,
  onDeletePhoto,
  hasPhoto,
}: {
  visible: boolean;
  onClose: () => void;
  onChoosePhoto: () => void;
  onDeletePhoto: () => void;
  hasPhoto: boolean;
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <Text style={modalStyles.title}>Photo du bateau</Text>

          <TouchableOpacity style={modalStyles.option} onPress={onChoosePhoto} accessibilityRole="button">
            <ImageIcon size={20} color="#0066CC" />
            <Text style={modalStyles.optionText}>Choisir dans la galerie</Text>
          </TouchableOpacity>

          {hasPhoto && (
            <TouchableOpacity
              style={[modalStyles.option, modalStyles.delete]}
              onPress={() => {
                onDeletePhoto();
                onClose();
              }}
              accessibilityRole="button"
            >
              <X size={20} color="#ff4444" />
              <Text style={modalStyles.deleteText}>Supprimer la photo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={modalStyles.cancel} onPress={onClose}>
            <Text style={modalStyles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function NewBoatScreen() {
  const { user, ports: availablePorts } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(width, insets.top), [width, insets.top]);

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
    place_de_port: '',
  });
  const [errors, setErrors] = useState<Partial<BoatForm>>({});
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [showPortModal, setShowPortModal] = useState(false);
  const [portSearch, setPortSearch] = useState('');
  const [selectedBoatManagerDetails, setSelectedBoatManagerDetails] = useState<BoatManagerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);

  // Récupérer le Boat Manager associé quand un port valide est choisi
  useEffect(() => {
    let active = true;
    const fetchBoatManagerDetails = async () => {
      try {
        if (!form.portId) {
          if (active) setSelectedBoatManagerDetails(null);
          return;
        }
        const parsedPortId = Number(form.portId);
        if (!Number.isFinite(parsedPortId)) return;

        const { data: userPorts, error: userPortsError } = await supabase
          .from('user_ports')
          .select('user_id')
          .eq('port_id', parsedPortId)
          .limit(1);

        if (userPortsError) {
          console.error('Error fetching user_ports:', userPortsError);
          if (active) setSelectedBoatManagerDetails(null);
          return;
        }

        if (userPorts && userPorts.length > 0) {
          const boatManagerId = userPorts[0].user_id;
          const { data: bmProfile, error: bmProfileError } = await supabase
            .from('users')
            .select('id, first_name, last_name, e_mail, phone, avatar')
            .eq('id', boatManagerId)
            .eq('profile', 'boat_manager')
            .maybeSingle();

          if (bmProfileError) {
            console.error('Error fetching boat manager profile:', bmProfileError);
            if (active) setSelectedBoatManagerDetails(null);
            return;
          }

          if (active) {
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
          }
        } else if (active) {
          setSelectedBoatManagerDetails(null);
        }
      } catch (e) {
        console.error('fetchBoatManagerDetails error:', e);
        if (active) setSelectedBoatManagerDetails(null);
      }
    };

    fetchBoatManagerDetails();
    return () => {
      active = false;
    };
  }, [form.portId]);

  const handleChoosePhoto = useCallback(async () => {
    try {
      if (!mediaPermission?.granted) {
        const res = await requestMediaPermission();
        if (!res.granted) {
          Alert.alert('Permission requise', "Veuillez autoriser l'accès à votre galerie.");
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

      // Compression + normalisation (JPEG)
      const manipulated = await ImageManipulator.manipulateAsync(
        asset.uri,
        [],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      setForm(prev => ({ ...prev, photo: manipulated.uri }));
    } catch (e) {
      console.error('Erreur image:', e);
      Alert.alert('Erreur', "Impossible de sélectionner l'image.");
    } finally {
      setShowPhotoModal(false);
    }
  }, [mediaPermission?.granted, requestMediaPermission]);

  const handleDeletePhoto = useCallback(async () => {
    try {
      if (form.photo && form.photo.startsWith('http')) {
        const url = form.photo;
        const publicRoot = supabase.storage.from('boat.images').getPublicUrl('').data.publicUrl;
        if (url.startsWith(publicRoot)) {
          const path = url.replace(publicRoot + '/', '');
          if (path) {
            const { error } = await supabase.storage.from('boat.images').remove([path]);
            if (error) {
              console.error('Error deleting image from storage:', error);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error processing image deletion:', e);
    } finally {
      setForm(prev => ({ ...prev, photo: '' }));
    }
  }, [form.photo]);

  const handleSelectPort = useCallback(
    (port: { id: string; name: string }) => {
      setForm(prev => ({ ...prev, portId: port.id, homePort: port.name }));
      setPortSearch(port.name);
      setShowPortModal(false);
      if (errors.homePort || errors.portId) {
        setErrors(prev => ({ ...prev, homePort: undefined, portId: undefined }));
      }
    },
    [errors.homePort, errors.portId]
  );

  const handlePortInputChange = useCallback((text: string) => {
    setPortSearch(text);
    setShowPortModal(true);
    setForm(prev => ({ ...prev, portId: '', homePort: text }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Partial<BoatForm> = {};

    const year = form.constructionYear.trim();
    const engineHours = form.engineHours.trim();
    const length = form.length.trim();

    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (!form.type.trim()) newErrors.type = 'Le type est requis';
    if (!form.manufacturer.trim()) newErrors.manufacturer = 'Le constructeur est requis';
    if (!length) newErrors.length = 'La longueur est requise';
    if (!form.homePort.trim()) newErrors.homePort = "Le port d'attache est requis";
    if (!form.portId) newErrors.portId = "Le port d'attache est requis";
    if (!form.place_de_port.trim()) newErrors.place_de_port = 'La place de port est requise';

    if (year && (!/^\d{4}$/.test(year) || +year < 1900 || +year > new Date().getFullYear() + 1)) {
      newErrors.constructionYear = "Format d'année invalide";
    }
    if (engineHours && !/^\d+(\.\d+)?$/.test(engineHours)) {
      newErrors.engineHours = 'Heures moteur invalides';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const uploadImageIfNeeded = useCallback(async (): Promise<string> => {
    if (!form.photo || form.photo.startsWith('http')) return form.photo || '';
    try {
      if (!user?.id) throw new Error('Utilisateur non authentifié');
      const base64 = await FileSystem.readAsStringAsync(form.photo, { encoding: FileSystem.EncodingType.Base64 });
      const buffer = Buffer.from(base64, 'base64');

      const fileName = `boat_images/${user.id}/${Date.now()}.jpeg`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('boat.images')
        .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('boat.images').getPublicUrl(uploadData.path);
      return publicUrlData.publicUrl;
    } catch (e: any) {
      console.error('uploadImageIfNeeded error:', e?.message || e);
      throw new Error("Échec de l'envoi de l'image");
    }
  }, [form.photo, user?.id]);

  const handleSubmit = useCallback(async () => {
    if (submitting.current) return;
    if (!validateForm()) return;
    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié.');
      return;
    }

    submitting.current = true;
    setIsLoading(true);

    try {
      const finalImageUrl = form.photo ? await uploadImageIfNeeded() : '';

      const { data, error } = await supabase
        .from('boat')
        .insert({
          id_user: user.id,
          name: form.name.trim(),
          type: form.type.trim(),
          modele: form.model.trim() || null,
          annee_construction: form.constructionYear ? `${form.constructionYear}-01-01` : null,
          type_moteur: form.engine.trim() || null,
          temps_moteur: form.engineHours ? form.engineHours : null,
          longueur: form.length.trim(),
          image: finalImageUrl || null,
          id_port: parseInt(form.portId, 10),
          constructeur: form.manufacturer.trim(),
          place_de_port: form.place_de_port.trim(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error inserting boat:', error);
        Alert.alert('Erreur', `Échec de l\'ajout du bateau: ${error.message}`);
      } else {
        Alert.alert('Succès', 'Votre bateau a été créé et rattaché au Boat Manager avec succès.', [
          { text: 'OK', onPress: () => router.replace(`/boats/${data.id}?from=signup`) },
        ]);
      }
    } catch (e: any) {
      console.error('Unexpected error during boat submission:', e?.message || e);
      Alert.alert('Erreur', e?.message || 'Une erreur inattendue est survenue.');
    } finally {
      setIsLoading(false);
      submitting.current = false;
    }
  }, [form, uploadImageIfNeeded, user?.id, validateForm]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Revenir en arrière"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={ms(22, width)} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Nouveau bateau</Text>
        </View>

        <View style={styles.form}>
          <FormRow
            label="Nom du bateau"
            icon={Ship}
            error={errors.name}
            value={form.name}
            onChangeText={t => setForm(p => ({ ...p, name: t }))}
            placeholder="ex: Le Grand Bleu"
            width={width}
          />

          <FormRow
            label="Type de bateau"
            icon={Ship}
            error={errors.type}
            value={form.type}
            onChangeText={t => setForm(p => ({ ...p, type: t }))}
            placeholder="ex: Voilier, Yacht, Catamaran"
            width={width}
          />

          <FormRow
            label="Constructeur"
            icon={Info}
            error={errors.manufacturer}
            value={form.manufacturer}
            onChangeText={t => setForm(p => ({ ...p, manufacturer: t }))}
            placeholder="ex: Bénéteau, Jeanneau"
            width={width}
          />

          <FormRow
            label="Modèle"
            icon={Info}
            value={form.model}
            onChangeText={t => setForm(p => ({ ...p, model: t }))}
            placeholder="ex: Oceanis 45"
            width={width}
          />

          <FormRow
            label="Année de construction"
            icon={Calendar}
            value={form.constructionYear}
            onChangeText={t => setForm(p => ({ ...p, constructionYear: t }))}
            placeholder="ex: 2020"
            keyboardType="numeric"
            error={errors.constructionYear}
            width={width}
          />

          <FormRow
            label="Moteur"
            icon={Wrench}
            value={form.engine}
            onChangeText={t => setForm(p => ({ ...p, engine: t }))}
            placeholder="ex: Volvo Penta D2-50"
            width={width}
          />

          <FormRow
            label="Heures moteur"
            icon={Clock}
            value={form.engineHours}
            onChangeText={t => setForm(p => ({ ...p, engineHours: t }))}
            placeholder="ex: 500"
            keyboardType="numeric"
            error={errors.engineHours}
            width={width}
          />

          <FormRow
            label="Longueur"
            icon={Ruler}
            value={form.length}
            onChangeText={t => setForm(p => ({ ...p, length: t }))}
            placeholder="ex: 12m"
            error={errors.length}
            width={width}
          />

          {/* Port d'attache + recherche */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Port d'attache</Text>
            <View style={[styles.inputWrapper, errors.homePort && styles.inputWrapperError]}>
              <MapPin size={ms(18, width)} color={errors.homePort ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
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
                  accessibilityLabel="Effacer le port saisi"
                >
                  <Text style={styles.clearButtonText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            {errors.homePort ? <Text style={styles.errorText}>{errors.homePort}</Text> : null}
            {errors.portId ? <Text style={styles.errorText}>{errors.portId}</Text> : null}
          </View>

          <FormRow
            label="Place de port"
            icon={MapPin}
            value={form.place_de_port}
            onChangeText={t => setForm(p => ({ ...p, place_de_port: t }))}
            placeholder="ex: A12, Ponton B"
            error={errors.place_de_port}
            width={width}
          />

          {selectedBoatManagerDetails && (
            <View style={styles.boatManagerInfo}>
              <View style={styles.boatManagerHeader}>
                <Info size={ms(18, width)} color="#0066CC" />
                <Text style={styles.boatManagerTitle}>Boat Manager assigné</Text>
              </View>
              <View style={styles.boatManagerDetails}>
                <View style={styles.boatManagerRow}>
                  <UserIcon size={ms(14, width)} color="#666" />
                  <Text style={styles.boatManagerText}>
                    {selectedBoatManagerDetails.firstName} {selectedBoatManagerDetails.lastName}
                  </Text>
                </View>
                <View style={styles.boatManagerRow}>
                  <Phone size={ms(14, width)} color="#666" />
                  <Text style={styles.boatManagerText}>{selectedBoatManagerDetails.phone}</Text>
                </View>
                <View style={styles.boatManagerRow}>
                  <Mail size={ms(14, width)} color="#666" />
                  <Text style={styles.boatManagerText}>{selectedBoatManagerDetails.email}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Photo */}
          <TouchableOpacity style={styles.photoContainer} onPress={() => setShowPhotoModal(true)} accessibilityRole="button">
            {form.photo ? (
              <>
                <Image source={{ uri: form.photo }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.deletePhotoButton} onPress={handleDeletePhoto} accessibilityLabel="Supprimer la photo">
                  <X size={ms(18, width)} color="white" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.photoPlaceholder}>
                <ImageIcon size={ms(28, width)} color="#666" />
                <Text style={styles.photoText}>Ajouter une photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, (isLoading || submitting.current) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading || submitting.current}
            accessibilityRole="button"
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Check size={ms(18, width)} color="white" />
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    </KeyboardAvoidingView>
  );
}

/** Sous-composant pour factoriser une rangée de champ texte */
function FormRow({
  label,
  icon: Icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  width,
}: {
  label: string;
  icon: IconType;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  error?: string;
  width: number;
}) {
  const styles = useMemo(() => makeStyles(width, 0), [width]);
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <Icon size={ms(18, width)} color={error ? '#ff4444' : '#666'} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function makeStyles(width: number, safeTop: number) {
  const p2 = ms(8, width);
  const p3 = ms(12, width);
  const p4 = ms(16, width);
  const p5 = ms(20, width);
  const radius = ms(12, width);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    contentContainer: { flexGrow: 1, paddingBottom: p5 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Math.max(safeTop, p3),
      paddingHorizontal: p4,
      paddingBottom: p3,
      backgroundColor: 'white',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#f0f0f0',
      minHeight: 56,
    },
    backButton: {
      padding: p2,
      marginRight: p3,
      borderRadius: ms(10, width),
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: { fontSize: ms(20, width), fontWeight: 'bold', color: '#1a1a1a' },

    form: { padding: p4, rowGap: p4 },

    inputContainer: { rowGap: p2 - 2 },
    label: { fontSize: ms(15.5, width), fontWeight: '500', color: '#1a1a1a', marginBottom: 4 },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'white',
      borderRadius: radius,
      borderWidth: 1,
      borderColor: '#e0e0e0',
      paddingHorizontal: p3,
      minHeight: 48,
    },
    inputWrapperError: { borderColor: '#ff4444', backgroundColor: '#fff5f5' },
    input: {
      flex: 1,
      marginLeft: p3,
      fontSize: ms(15, width),
      color: '#1a1a1a',
      height: '100%',
      ...Platform.select({ web: { outlineStyle: 'none' } }),
    },

    clearButton: { padding: p2 },
    clearButtonText: { fontSize: ms(18, width), color: '#666', fontWeight: 'bold' },
    errorText: { color: '#ff4444', fontSize: ms(12.5, width) },

    photoContainer: {
      width: '100%',
      height: ms(200, width),
      backgroundColor: 'white',
      borderRadius: radius,
      overflow: 'hidden',
      position: 'relative',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
        android: { elevation: 3 },
        web: { /* @ts-ignore */ boxShadow: '0 2px 6px rgba(0,0,0,0.08)' },
      }),
    },
    photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', rowGap: p2 },
    photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    deletePhotoButton: {
      position: 'absolute',
      top: p2,
      right: p2,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 20,
      padding: p2,
    },
    photoText: { fontSize: ms(14.5, width), color: '#666' },

    submitButton: {
      backgroundColor: '#0066CC',
      padding: p4,
      borderRadius: radius,
      alignItems: 'center',
      marginTop: p3,
      flexDirection: 'row',
      justifyContent: 'center',
      columnGap: p3,
      ...Platform.select({
        ios: { shadowColor: '#0066CC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
        android: { elevation: 4 },
        web: { /* @ts-ignore */ boxShadow: '0 4px 8px rgba(0,102,204,0.2)' },
      }),
    },
    submitButtonDisabled: { backgroundColor: '#94a3b8' },
    submitButtonText: { color: 'white', fontSize: ms(15.5, width), fontWeight: '600' },

    boatManagerInfo: { backgroundColor: '#f0f7ff', borderRadius: radius, padding: p4, rowGap: p3 },
    boatManagerHeader: { flexDirection: 'row', alignItems: 'center', columnGap: p2 },
    boatManagerTitle: { fontSize: ms(15.5, width), fontWeight: '600', color: '#0066CC' },
    boatManagerDetails: { rowGap: p2 },
    boatManagerRow: { flexDirection: 'row', alignItems: 'center', columnGap: p2 },
    boatManagerText: { fontSize: ms(13.5, width), color: '#1a1a1a' },
  });
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, rowGap: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  option: { flexDirection: 'row', alignItems: 'center', columnGap: 12, padding: 14, backgroundColor: '#f8f9fa', borderRadius: 12 },
  optionText: { fontSize: 16, color: '#1a1a1a' },
  delete: { backgroundColor: '#fff5f5' },
  deleteText: { fontSize: 16, color: '#ff4444' },
  cancel: { padding: 14, alignItems: 'center' },
  cancelText: { fontSize: 16, color: '#ff4444', fontWeight: '600' },
});



