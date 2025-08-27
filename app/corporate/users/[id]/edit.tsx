import { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image, Alert, Modal, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, Building, Shield, ImageIcon, X, Check, Trash } from 'lucide-react-native'; // Import Trash icon
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import { supabase } from '@/src/lib/supabase';

// Définition de l'avatar par défaut
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

// Fonctions utilitaires pour les URLs d'avatars
const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getStoragePathFromUrl = (url: string, bucketName: string) => {
  const publicMarker = `/storage/v1/object/public/${bucketName}/`;
  const signedMarker = `/storage/v1/object/sign/${bucketName}/`;

  let idx = url.indexOf(publicMarker);
  if (idx !== -1) {
    return url.substring(idx + publicMarker.length);
  }

  idx = url.indexOf(signedMarker);
  if (idx !== -1) {
    const pathWithToken = url.substring(idx + signedMarker.length);
    const tokenIndex = pathWithToken.indexOf('?token=');
    return tokenIndex !== -1 ? pathWithToken.substring(0, tokenIndex) : pathWithToken;
  }
  return null;
};

const getSignedImageUrl = async (imagePath: string, bucketName: string) => {
  if (!imagePath) return '';
  if (isHttpUrl(imagePath)) return imagePath;

  const { data, error } = await supabase
    .storage
    .from(bucketName)
    .createSignedUrl(imagePath, 60 * 60);

  if (error) {
    console.error(`Error creating signed URL for ${bucketName} image:`, error);
    return '';
  }
  return data?.signedUrl || '';
};

const deleteImageFromStorage = async (filePath: string, bucketName: string) => {
  if (filePath) {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    if (error) {
      console.warn(`Error deleting image from ${bucketName} storage:`, error);
    }
  }
};

interface CorporateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  roleName: string; // Display name of the role
  roleId: string; // ID of the role from corporate_roles table
  avatar: string;
}

interface CorporateRole {
  id: string;
  name: string;
  description: string;
}

const getRoleColor = (roleName: string): string => {
  switch (roleName.toLowerCase()) {
    case 'super-admin':
      return '#F59E0B';
    case 'admin':
      return '#0EA5E9';
    case 'secretary':
      return '#10B981';
    case 'operator':
      return '#8B5CF6';
    default:
      return '#666666';
  }
};

// Modal pour la sélection du rôle Corporate
const CorporateRoleSelectionModal = memo(({
  visible,
  onClose,
  onSelectRole,
  corporateRoles,
  selectedRoleId,
  isLoadingRoles,
}) => {
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
            <Text style={styles.modalTitle}>Sélectionner un rôle</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {isLoadingRoles ? (
              <ActivityIndicator size="large" color="#0066CC" />
            ) : corporateRoles.length > 0 ? (
              corporateRoles.map((role) => (
                <TouchableOpacity 
                  key={role.id}
                  style={[
                    styles.modalItem,
                    selectedRoleId === role.id && styles.modalItemSelected
                  ]}
                  onPress={() => onSelectRole(role)}
                >
                  <Shield size={20} color={selectedRoleId === role.id ? '#0066CC' : '#666'} />
                  <View style={styles.modalItemTextContainer}>
                    <Text style={[
                      styles.modalItemText,
                      selectedRoleId === role.id && styles.modalItemTextSelected
                    ]}>
                      {role.name}
                    </Text>
                    <Text style={styles.modalItemDescription}>{role.description}</Text>
                  </View>
                  {selectedRoleId === role.id && (
                    <Check size={20} color="#0066CC" />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyModalText}>Aucun rôle disponible.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

// PhotoModal component definition
const PhotoModal = memo(({ visible, onClose, onChoosePhoto, onDeletePhoto, hasPhoto }: {
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
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Photo de profil</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16 }}>
          <TouchableOpacity style={styles.modalOption} onPress={onChoosePhoto}>
            <ImageIcon size={24} color="#0066CC" />
            <Text style={styles.modalOptionText}>Choisir dans la galerie</Text>
          </TouchableOpacity>

          {hasPhoto && (
            <TouchableOpacity 
              style={[styles.modalOption, styles.deleteOption]} 
              onPress={onDeletePhoto}
            >
              <X size={24} color="#ff4444" />
              <Text style={styles.modalOptionText}>Supprimer la photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));


export default function EditCorporateUserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [formData, setFormData] = useState<Partial<CorporateUserForm>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    roleName: '',
    roleId: '',
    avatar: DEFAULT_AVATAR,
  });
  const [errors, setErrors] = useState<Partial<CorporateUserForm>>({});
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false); // New state for delete confirmation modal

  const [corporateRoles, setCorporateRoles] = useState<CorporateRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!id || typeof id !== 'string') {
        Alert.alert('Erreur', 'ID utilisateur manquant.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Fetch all corporate roles first
        const { data: rolesData, error: rolesError } = await supabase
          .from('corporate_roles')
          .select('id, name, description')
          .order('name', { ascending: true });

        if (rolesError) {
          console.error('Error fetching corporate roles:', rolesError);
          Alert.alert('Erreur', 'Impossible de charger les rôles Corporate.');
          setIsLoadingRoles(false);
          return;
        }
        setCorporateRoles(rolesData);
        setIsLoadingRoles(false);

        // Fetch user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            e_mail,
            phone,
            department,
            corporate_role_id,
            avatar
          `)
          .eq('id', id)
          .eq('profile', 'corporate')
          .single();

        if (userError) {
          console.error('Error fetching user data:', userError);
          Alert.alert('Erreur', 'Utilisateur Corporate non trouvé.');
          return;
        }

        const signedAvatar = await getSignedImageUrl(userData.avatar || '', 'avatars');
        const userRole = rolesData.find(role => role.id === userData.corporate_role_id);

        setFormData({
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          email: userData.e_mail || '',
          phone: userData.phone || '',
          department: userData.department || '',
          roleName: userRole?.name || '',
          roleId: userData.corporate_role_id || '',
          avatar: signedAvatar || DEFAULT_AVATAR,
        });

      } catch (e) {
        console.error('Unexpected error fetching user data:', e);
        Alert.alert('Erreur', 'Une erreur inattendue est survenue lors du chargement des données.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [id]);

  const handleChoosePhoto = async () => {
    if (!mediaPermission?.granted) {
      const permission = await requestMediaPermission();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à votre galerie.');
        setShowPhotoModal(false);
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      setShowPhotoModal(false);
      return;
    }

    const asset = result.assets[0];
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    if (!manipulated.base64) {
      Alert.alert('Erreur', 'Conversion image échouée.');
      setShowPhotoModal(false);
      return;
    }

    const bytes = Buffer.from(manipulated.base64, 'base64');
    const filePath = `users/${id}/avatar.jpg`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, bytes, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { error: updateDbError } = await supabase
        .from('users')
        .update({ avatar: filePath })
        .eq('id', id);

      if (updateDbError) throw updateDbError;

      const newSignedUrl = await getSignedImageUrl(filePath, 'avatars');
      setFormData(prev => ({ ...prev, avatar: newSignedUrl || DEFAULT_AVATAR }));

      Alert.alert('Succès', 'Photo de profil mise à jour.');
    } catch (e: any) {
      console.error('Upload avatar error:', e);
      Alert.alert('Erreur', e?.message ?? 'Impossible de mettre à jour la photo.');
    } finally {
      setShowPhotoModal(false);
    }
  };

  const handleDeletePhoto = async () => {
    try {
      if (!id) return;

      const filePath = `users/${id}/avatar.jpg`;
      await deleteImageFromStorage(filePath, 'avatars');

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar: '' })
        .eq('id', id);

      if (updateError) throw updateError;

      setFormData(prev => ({ ...prev, avatar: DEFAULT_AVATAR }));
      Alert.alert('Succès', 'Photo de profil supprimée.');
    } catch (e: any) {
      console.error('Error deleting photo:', e);
      Alert.alert('Erreur', e?.message ?? 'Impossible de supprimer la photo.');
    } finally {
      setShowPhotoModal(false);
    }
  };

  const validateForm = () => {
    const newErrors: Partial<CorporateUserForm> = {};
    
    if (!formData.firstName?.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Le nom est requis';
    if (!formData.email?.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    if (!formData.phone?.trim()) newErrors.phone = 'Le téléphone est requis';
    if (!formData.department?.trim()) newErrors.department = 'Le département est requis';
    if (!formData.roleId) newErrors.roleId = 'Le rôle est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          e_mail: formData.email,
          phone: formData.phone,
          department: formData.department,
          corporate_role_id: formData.roleId,
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating user:', error);
        Alert.alert('Erreur', `Échec de la mise à jour de l'utilisateur: ${error.message}`);
      } else {
        Alert.alert(
          'Succès',
          'L\'utilisateur Corporate a été mis à jour avec succès.',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (e) {
      console.error('Unexpected error during submission:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCorporateRole = (role: CorporateRole) => {
    setFormData(prev => ({ ...prev, roleName: role.name, roleId: role.id }));
    setShowRoleModal(false);
    if (errors.roleId) setErrors(prev => ({ ...prev, roleId: undefined }));
  };

  const handleDeleteUser = () => {
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      // Delete user's avatar from storage if it exists
      if (formData.avatar && formData.avatar !== DEFAULT_AVATAR) {
        const filePath = getStoragePathFromUrl(formData.avatar, 'avatars');
        if (filePath) {
          await deleteImageFromStorage(formData.avatar, 'avatars');
        }
      }

      // Delete the user from the 'users' table
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (deleteUserError) {
        throw deleteUserError;
      }

      Alert.alert('Succès', 'L\'utilisateur Corporate a été supprimé avec succès.');
      setShowDeleteConfirmModal(false);
      router.back(); // Go back to the list of corporate users
    } catch (e: any) {
      console.error('Error deleting corporate user:', e.message);
      Alert.alert('Erreur', `Échec de la suppression de l'utilisateur: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Modifier l'utilisateur Corporate</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Chargement des données...</Text>
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
        <Text style={styles.title}>Modifier l'utilisateur Corporate</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <View style={styles.profileImageContainer}>
            <Image 
              source={{ uri: formData.avatar }} 
              style={styles.profileImage} 
            />
            <TouchableOpacity 
              style={styles.editPhotoButton}
              onPress={() => setShowPhotoModal(true)}
            >
              <ImageIcon size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prénom</Text>
            <View style={[styles.inputWrapper, errors.firstName && styles.inputWrapperError]}>
              <User size={20} color={errors.firstName ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                placeholder="Prénom"
                autoCapitalize="words"
              />
            </View>
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom</Text>
            <View style={[styles.inputWrapper, errors.lastName && styles.inputWrapperError]}>
              <User size={20} color={errors.lastName ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                placeholder="Nom"
                autoCapitalize="words"
              />
            </View>
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
              <Mail size={20} color={errors.email ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
              <Phone size={20} color={errors.phone ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                placeholder="Téléphone"
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informations professionnelles</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Département</Text>
            <View style={[styles.inputWrapper, errors.department && styles.inputWrapperError]}>
              <Building size={20} color={errors.department ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.department}
                onChangeText={(text) => setFormData(prev => ({ ...prev, department: text }))}
                placeholder="Département (ex: Support, Finance)"
              />
            </View>
            {errors.department && <Text style={styles.errorText}>{errors.department}</Text>}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Rôle</Text>
            <TouchableOpacity 
              style={[styles.inputWrapper, errors.roleId && styles.inputWrapperError]}
              onPress={() => setShowRoleModal(true)}
            >
              <Shield size={20} color={errors.roleId ? '#ff4444' : '#666'} />
              <Text style={[styles.input, styles.roleInputText, !formData.roleName && styles.placeholderText]}>
                {formData.roleName || 'Sélectionner un rôle'}
              </Text>
            </TouchableOpacity>
            {errors.roleId && <Text style={styles.errorText}>{errors.roleId}</Text>}
          </View>
        </View>

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
              <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={handleDeleteUser}
        >
          <Trash size={20} color="#ff4444" />
          <Text style={styles.deleteAccountButtonText}>Supprimer l'utilisateur</Text>
        </TouchableOpacity>
      </View>

      <PhotoModal 
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onChoosePhoto={handleChoosePhoto}
        onDeletePhoto={handleDeletePhoto}
        hasPhoto={formData.avatar !== DEFAULT_AVATAR}
      />
      <CorporateRoleSelectionModal
        visible={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSelectRole={handleSelectCorporateRole}
        corporateRoles={corporateRoles}
        selectedRoleId={formData.roleId}
        isLoadingRoles={isLoadingRoles}
      />
      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Confirmer la suppression</Text>
            <Text style={styles.confirmModalText}>
              Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
            </Text>
            
            <View style={styles.confirmModalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowDeleteConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmDeleteButton}
                onPress={confirmDeleteUser}
              >
                <Text style={styles.confirmDeleteButtonText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  form: {
    padding: 16,
    gap: 24,
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 16,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  profileImageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#0066CC',
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0066CC',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
  },
  inputContainer: {
    gap: 4,
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
  inputWrapperError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  roleInputText: {
    color: '#1a1a1a',
  },
  placeholderText: {
    color: '#94a3b8',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
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
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
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
    maxHeight: '80%',
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
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  modalItemTextContainer: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalItemTextSelected: {
    color: '#0066CC',
    fontWeight: '500',
  },
  modalItemDescription: {
    fontSize: 12,
    color: '#666',
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  deleteAccountButtonText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '500',
  },
  confirmModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    padding: 24,
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
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  confirmModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});
