import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image, Alert, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, Building, Shield, ImageIcon, X, Check, Lock } from 'lucide-react-native'; // Import Lock icon
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import supabase
import bcrypt from 'bcryptjs'; // Import bcryptjs

interface CorporateUserForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  role: 'super-admin' | 'admin' | 'secretary' | 'operator'; // This will be the display role
  avatar: string;
  password?: string; // Add password to the interface
}

interface RoleOption {
  value: 'super-admin' | 'admin' | 'secretary' | 'operator';
  label: string;
}

interface CorporateRole {
  id: string;
  name: string;
  description: string;
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

// Modal pour la sélection du rôle Corporate
const CorporateRoleSelectionModal = ({
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
    password: '', // Initialize password
  });
  const [errors, setErrors] = useState<Partial<CorporateUserForm>>({});
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [isLoading, setIsLoading] = useState(false); // Set to true initially for data loading

  const [corporateRoles, setCorporateRoles] = useState<CorporateRole[]>([]);
  const [selectedCorporateRoleId, setSelectedCorporateRoleId] = useState<string | null>(null);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);


  useEffect(() => {
    const fetchCorporateRoles = async () => {
      setIsLoadingRoles(true);
      const { data, error } = await supabase
        .from('corporate_roles')
        .select('id, name, description')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching corporate roles:', error);
        Alert.alert('Erreur', 'Impossible de charger les rôles Corporate.');
      } else {
        setCorporateRoles(data);
        // Optionally pre-select a default role if needed
        if (data.length > 0 && !selectedCorporateRoleId) {
          setSelectedCorporateRoleId(data[0].id);
          setFormData(prev => ({ ...prev, role: data[0].name.toLowerCase().replace(/\s/g, '_') as CorporateUserForm['role'] }));
        }
      }
      setIsLoadingRoles(false);
    };

    fetchCorporateRoles();
  }, []);


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
    
    if (!formData.firstName?.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Le nom est requis';
    if (!formData.email?.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    if (!formData.phone?.trim()) newErrors.phone = 'Le téléphone est requis';
    if (!formData.department?.trim()) newErrors.department = 'Le département est requis';
    if (!selectedCorporateRoleId) newErrors.role = 'Le rôle est requis'; // Validate selected role ID
    if (!formData.password?.trim()) newErrors.password = 'Le mot de passe est requis'; // Validate password
    if (formData.password && formData.password.length < 6) newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(formData.password!, 10); // Use ! to assert non-null

        // 1. Check if user already exists
        const { data: existingUsers, error: existingUserError } = await supabase
          .from('users')
          .select('id')
          .eq('e_mail', formData.email);

        if (existingUserError) {
          throw new Error("Erreur lors de la vérification de l'utilisateur existant.");
        }
        if (existingUsers && existingUsers.length > 0) {
          throw new Error('Un compte avec cet email existe déjà.');
        }

        // 2. Create the new corporate user
        const { data: newUser, error: userInsertError } = await supabase
          .from('users')
          .insert({
            first_name: formData.firstName,
            last_name: formData.lastName,
            e_mail: formData.email,
            phone: formData.phone,
            department: formData.department,
            profile: 'corporate', // Set profile to 'corporate'
            corporate_role_id: selectedCorporateRoleId, // Assign the selected corporate role ID
            avatar: formData.avatar,
            password: hashedPassword, // Include the hashed password
            status: 'active', // New users are active by default
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (userInsertError) {
          console.error('Error inserting user profile:', userInsertError);
          throw new Error('Échec de la création du profil utilisateur.');
        }

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
      } catch (error: any) {
        console.error('Submission error:', error);
        Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de l\'ajout de l\'utilisateur Corporate.');
      } finally {
        setIsLoading(false);
      }
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

  const handleSelectCorporateRole = (role: CorporateRole) => {
    setSelectedCorporateRoleId(role.id);
    setFormData(prev => ({ ...prev, role: role.name.toLowerCase().replace(/\s/g, '_') as CorporateUserForm['role'] }));
    setShowRoleModal(false);
    if (errors.role) setErrors(prev => ({ ...prev, role: undefined }));
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
              <Text style={[styles.input, styles.roleInputText, !selectedCorporateRoleId && styles.placeholderText]}>
                {selectedCorporateRoleId ? corporateRoles.find(r => r.id === selectedCorporateRoleId)?.name : 'Sélectionner un rôle'}
              </Text>
            </TouchableOpacity>
            {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mot de passe</Text>
            <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
              <Lock size={20} color={errors.password ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                placeholder="Mot de passe"
                secureTextEntry
              />
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
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
      <CorporateRoleSelectionModal
        visible={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSelectRole={handleSelectCorporateRole}
        corporateRoles={corporateRoles}
        selectedRoleId={selectedCorporateRoleId}
        isLoadingRoles={isLoadingRoles}
      />
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
});
