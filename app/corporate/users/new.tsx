import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image, Modal, Alert, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, MapPin, Check, X, Plus, ImageIcon, Building, Shield } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';

interface CorporateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  role: 'super-admin' | 'admin' | 'secretary' | 'operator';
  avatar: string;
}

interface RoleOption {
  value: 'super-admin' | 'admin' | 'secretary' | 'operator';
  label: string;
}

const roleOptions: RoleOption[] = [
  { value: 'super-admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'secretary', label: 'Secrétaire' },
  { value: 'operator', label: 'Opérateur' },
];

const getRoleName = (role: CorporateUserForm['role']): string => {
  return roleOptions.find(option => option.value === role)?.label || role;
};

const getRoleColor = (role: CorporateUserForm['role']): string => {
  switch (role) {
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

export default function NewCorporateUserScreen() {
  const { user } = useAuth();
  const [formData, setFormData] = useState<CorporateUserForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    role: 'operator', // Default role
    avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop', // Default neutral avatar
  });
  const [errors, setErrors] = useState<Partial<CorporateUserForm>>({});
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [isLoading, setIsLoading] = useState(false);

  const handleChoosePhoto = async () => {
    if (!mediaPermission?.granted) {
      const permission = await requestMediaPermission();
      if (!permission.granted) return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setFormData(prev => ({ ...prev, avatar: result.assets[0].uri }));
    }
    setShowPhotoModal(false);
  };

  const handleDeletePhoto = () => {
    setFormData(prev => ({ ...prev, avatar: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop' })); // Reset to default neutral avatar
  };

  const validateForm = () => {
    const newErrors: Partial<CorporateUserForm> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim()) newErrors.lastName = 'Le nom est requis';
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Le téléphone est requis';
    if (!formData.department.trim()) newErrors.department = 'Le département est requis';
    if (!formData.role) newErrors.role = 'Le rôle est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setIsLoading(true);
      // Simulate API call to add new user
      setTimeout(() => {
        Alert.alert(
          'Succès',
          'L\'utilisateur Corporate a été ajouté avec succès.',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
        setIsLoading(false);
      }, 1500);
    }
  };

  const PhotoModal = () => (
    <Modal
      visible={showPhotoModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPhotoModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Photo de profil</Text>

          <TouchableOpacity style={styles.modalOption} onPress={handleChoosePhoto}>
            <ImageIcon size={24} color="#0066CC" />
            <Text style={styles.modalOptionText}>Choisir dans la galerie</Text>
          </TouchableOpacity>

          {formData.avatar !== 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop' && (
            <TouchableOpacity 
              style={[styles.modalOption, styles.deleteOption]} 
              onPress={() => {
                handleDeletePhoto();
                setShowPhotoModal(false);
              }}
            >
              <X size={24} color="#ff4444" />
              <Text style={styles.deleteOptionText}>Supprimer la photo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowPhotoModal(false)}
          >
            <Text style={styles.modalCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const RoleSelectionModal = () => (
    <Modal
      visible={showRoleModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowRoleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un rôle</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowRoleModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {roleOptions.map((roleOption) => (
              <TouchableOpacity 
                key={roleOption.value}
                style={[
                  styles.modalItem,
                  formData.role === roleOption.value && styles.modalItemSelected
                ]}
                onPress={() => {
                  setFormData(prev => ({ ...prev, role: roleOption.value }));
                  setShowRoleModal(false);
                  if (errors.role) setErrors(prev => ({ ...prev, role: undefined }));
                }}
              >
                <Shield size={20} color={formData.role === roleOption.value ? '#0066CC' : '#666'} />
                <Text style={[
                  styles.modalItemText,
                  formData.role === roleOption.value && styles.modalItemTextSelected
                ]}>
                  {roleOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Ajouter un utilisateur Corporate</Text>
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
              style={[styles.inputWrapper, errors.role && styles.inputWrapperError]}
              onPress={() => setShowRoleModal(true)}
            >
              <Shield size={20} color={errors.role ? '#ff4444' : '#666'} />
              <Text style={[styles.input, styles.roleInputText, !formData.role && styles.placeholderText]}>
                {formData.role ? getRoleName(formData.role) : 'Sélectionner un rôle'}
              </Text>
            </TouchableOpacity>
            {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
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
              <Text style={styles.submitButtonText}>Ajouter l'utilisateur</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <PhotoModal />
      <RoleSelectionModal />
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
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
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
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
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
  modalBody: {
    padding: 16,
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
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalItemTextSelected: {
    color: '#0066CC',
    fontWeight: '500',
  },
});
