import { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, Alert, TextInput, Switch } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Phone, Mail, Calendar, Shield, Award, Ship, Wrench, PenTool as Tool, Gauge, Key, FileText, LogOut, Image as ImageIcon, X, Plus, Pencil, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

interface Service {
  id: string;
  name: string;
  description: string;
  icon: any; // Icons are still hardcoded as they are UI components
}

interface BoatManagerProfile {
  title: string;
  experience: string;
  certifications: string[];
  ports: {
    id: string;
    name: string;
    boatCount: number;
  }[];
  bio: string;
}

// Hardcoded service icons (map to fetched service names)
const serviceIconsMap = {
  'Maintenance': Wrench,
  'Amélioration': Tool,
  'Contrôle': Gauge,
  'Accès': Key,
  'Administratif': FileText,
  // Add other service types and their icons as needed
};

const avatars = {
  male: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
  female: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
  neutral: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop',
};

// Extracted EditProfileModal component
const EditProfileModal = memo(({ visible, onClose, formData, setFormData, handleSaveProfile, newCertification, setNewCertification, handleAddCertification }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Modifier mon profil</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={onClose}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalBody}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Votre fonction</Text>
            <TextInput
              style={styles.formInput}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Ex: Boat Manager Senior"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Expérience</Text>
            <TextInput
              style={styles.formInput}
              value={formData.experience}
              onChangeText={(text) => setFormData(prev => ({ ...prev, experience: text }))}
              placeholder="Ex: 8 ans"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Certifications</Text>
            <TextInput
              style={styles.formInput}
              value={formData.certifications}
              onChangeText={(text) => setFormData(prev => ({ ...prev, certifications: text }))}
              placeholder="Ex: Certification YBM, Expert Maritime"
            />
            <Text style={styles.helperText}>Séparez les certifications par des virgules</Text>
            
            <View style={styles.addCertificationContainer}>
              <TextInput
                style={styles.addCertificationInput}
                value={newCertification}
                onChangeText={setNewCertification}
                placeholder="Ajouter une certification"
              />
              <TouchableOpacity 
                style={styles.addCertificationButton}
                onPress={handleAddCertification}
              >
                <Plus size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Biographie</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
              placeholder="Parlez de vous et de votre expérience..."
              multiline
              numberOfLines={4}
            />
          </View>
        </ScrollView>
        
        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveProfile}
          >
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
))

// Extracted PhotoModal component
const PhotoModal = memo(({ visible, onClose, onChoosePhoto, onDeletePhoto, hasCustomPhoto, onSelectAvatar }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Photo de profil</Text>

        <TouchableOpacity style={styles.modalOption} onPress={onChoosePhoto}>
          <ImageIcon size={24} color="#0066CC" />
          <Text style={styles.modalOptionText}>Choisir dans la galerie</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.modalOption} onPress={onSelectAvatar}>
          <User size={24} color="#0066CC" />
          <Text style={styles.modalOptionText}>Choisir un avatar</Text>
        </TouchableOpacity>
        
        {hasCustomPhoto && (
          <TouchableOpacity 
            style={[styles.modalOption, styles.deleteOption]} 
            onPress={onDeletePhoto}
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
))

// Extracted AvatarModal component
const AvatarModal = memo(({ visible, onClose, onSelectAvatar }) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Choisir un avatar</Text>
        
        <TouchableOpacity 
          style={styles.avatarOption} 
          onPress={() => onSelectAvatar('male')}
        >
          <Image 
            source={{ uri: avatars.male }} 
            style={styles.avatarPreview} 
          />
          <Text style={styles.avatarOptionText}>Avatar Homme</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.avatarOption} 
          onPress={() => onSelectAvatar('female')}
        >
          <Image 
            source={{ uri: avatars.female }} 
            style={styles.avatarPreview} 
          />
          <Text style={styles.avatarOptionText}>Avatar Femme</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.avatarOption} 
          onPress={() => onSelectAvatar('neutral')}
        >
          <Image 
            source={{ uri: avatars.neutral }} 
            style={styles.avatarPreview} 
          />
          <Text style={styles.avatarOptionText}>Avatar Neutre</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.modalCancelButton}
          onPress={onClose}
        >
          <Text style={styles.modalCancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
))

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'services' | 'ports'>('services');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  const [localAvatar, setLocalAvatar] = useState(user?.avatar || avatars.neutral);

  const [profile, setProfile] = useState<BoatManagerProfile>({
    title: '',
    experience: '',
    certifications: [],
    bio: '',
    ports: [],
  });

  const [services, setServices] = useState<Service[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    experience: '',
    bio: '',
    certifications: '',
  });

  const [newCertification, setNewCertification] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;

      // Fetch user profile details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('first_name, last_name, e_mail, phone, avatar, job_title, experience, certification, bio, created_at')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        return;
      }

      if (userData) {
        setLocalAvatar(userData.avatar || avatars.neutral);
        setProfile(prev => ({
          ...prev,
          title: userData.job_title || '',
          experience: userData.experience || '',
          certifications: userData.certification || [],
          bio: userData.bio || '',
        }));
        setFormData({
          title: userData.job_title || '',
          experience: userData.experience || '',
          bio: userData.bio || '',
          certifications: (userData.certification || []).join(', '),
        });
      }

      // Fetch managed ports and boat counts
      const { data: userPortsData, error: userPortsError } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', user.id);

      if (userPortsError) {
        console.error('Error fetching user ports:', userPortsError);
        return;
      }

      const portIds = userPortsData.map(p => p.port_id);
      if (portIds.length > 0) {
        const { data: portsData, error: portsError } = await supabase
          .from('ports')
          .select('id, name');

        if (portsError) {
          console.error('Error fetching ports:', portsError);
          return;
        }

        const fetchedPorts = await Promise.all(portsData
          .filter(p => portIds.includes(p.id))
          .map(async (port) => {
            const { count: boatCount, error: boatCountError } = await supabase
              .from('boat')
              .select('id', { count: 'exact' })
              .eq('id_port', port.id);

            if (boatCountError) {
              console.error(`Error fetching boat count for port ${port.name}:`, boatCountError);
            }

            return {
              id: port.id.toString(),
              name: port.name,
              boatCount: boatCount || 0,
            };
          })
        );
        setProfile(prev => ({ ...prev, ports: fetchedPorts }));
      }

      // Fetch services offered by the boat manager
      const { data: userCategories, error: userCategoriesError } = await supabase
        .from('user_categorie_service')
        .select('categorie_service(id, description1, description2)')
        .eq('user_id', user.id);

      if (userCategoriesError) {
        console.error('Error fetching user service categories:', userCategoriesError);
        return;
      }

      if (userCategories) {
        const fetchedServices: Service[] = userCategories.map(uc => ({
          id: uc.categorie_service.id.toString(),
          name: uc.categorie_service.description1,
          description: uc.categorie_service.description2 || '',
          icon: serviceIconsMap[uc.categorie_service.description1] || Ship, // Default to Ship icon if not found
        }));
        setServices(fetchedServices);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleChoosePhoto = async () => {
    if (!mediaPermission?.granted) {
      const permission = await requestMediaPermission();
      if (!permission.granted) {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à votre galerie pour choisir une photo.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setLocalAvatar(result.assets[0].uri); // Update local avatar state
      // In a real app, you would also upload this to Supabase Storage and update the user's avatar URL in the database
    }
    setShowPhotoModal(false);
  };

  const handleDeletePhoto = () => {
    setLocalAvatar(avatars.neutral); // Set to default neutral avatar
    // In a real app, you would also remove the avatar from Supabase Storage and update the user's avatar URL to null/default in the database
    setShowPhotoModal(false);
  };

  const handleSelectAvatar = (type: keyof typeof avatars) => {
    setLocalAvatar(avatars[type]);
    // In a real app, you would also update the user's avatar URL in the database
    setShowAvatarModal(false);
    setShowPhotoModal(false); // Close PhotoModal after selecting avatar
  };

  const handleEditProfile = () => {
    setFormData({
      title: profile.title,
      experience: profile.experience,
      bio: profile.bio,
      certifications: profile.certifications.join(', '),
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié.');
      return;
    }

    const certificationsArray = formData.certifications
      .split(',')
      .map(cert => cert.trim())
      .filter(cert => cert !== '');

    const { error } = await supabase
      .from('users')
      .update({
        job_title: formData.title,
        experience: formData.experience,
        bio: formData.bio,
        certification: certificationsArray,
        avatar: localAvatar, // Save the selected avatar URL
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erreur', `Impossible de mettre à jour le profil: ${error.message}`);
    } else {
      setProfile(prev => ({
        ...prev,
        title: formData.title,
        experience: formData.experience,
        bio: formData.bio,
        certifications: certificationsArray,
      }));
      setShowEditModal(false);
      Alert.alert('Succès', 'Votre profil a été mis à jour avec succès.');
    }
  };

  const handleAddCertification = () => {
    if (newCertification.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: prev.certifications ? `${prev.certifications}, ${newCertification}` : newCertification,
      }));
      setNewCertification('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={{ uri: localAvatar }} // Use localAvatar here
            style={styles.avatar}
          />
          <TouchableOpacity 
            style={styles.editPhotoButton}
            onPress={() => setShowPhotoModal(true)}
          >
            <Pencil size={16} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={styles.title}>{profile.title}</Text>
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={handleEditProfile}
          >
            <Text style={styles.editProfileText}>Modifier mon profil</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Mail size={20} color="#0066CC" />
          <Text style={styles.infoText}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone size={20} color="#0066CC" />
          <Text style={styles.infoText}>{user?.phone || 'N/A'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Calendar size={20} color="#0066CC" />
          <Text style={styles.infoText}>
            Membre depuis{' '}
            {user?.createdAt && !isNaN(new Date(user.createdAt).getTime())
              ? new Date(user.createdAt).toISOString().split('T')[0] // Format as YYYY-MM-DD
              : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Biographie */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos de moi</Text>
        <Text style={styles.bioText}>{profile.bio || 'Aucune biographie renseignée.'}</Text>
      </View>

      {/* Experience & Certifications */}
      <View style={styles.section}>
        <View style={styles.experienceItem}>
          <Shield size={20} color="#0066CC" />
          <View>
            <Text style={styles.experienceLabel}>Expérience</Text>
            <Text style={styles.experienceValue}>{profile.experience || 'Non renseignée'}</Text>
          </View>
        </View>
        <View style={styles.experienceItem}>
          <Award size={20} color="#0066CC" />
          <View>
            <Text style={styles.experienceLabel}>Certifications</Text>
            <Text style={styles.experienceValue}>
              {profile.certifications.length > 0 ? profile.certifications.join(', ') : 'Aucune certification'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'services' && styles.activeTab]}
          onPress={() => setSelectedTab('services')}
        >
          <Text style={[styles.tabText, selectedTab === 'services' && styles.activeTabText]}>
            Services
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'ports' && styles.activeTab]}
          onPress={() => setSelectedTab('ports')}
        >
          <Text style={[styles.tabText, selectedTab === 'ports' && styles.activeTabText]}>
            Ports
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {selectedTab === 'services' ? (
        <View style={styles.servicesContainer}>
          {services.length > 0 ? (
            services.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceIcon}>
                  {/* MODIFIED LINE: Render the icon component using JSX syntax */}
                  {service.icon && <service.icon size={24} color="#0066CC" />} 
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun service configuré.</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.portsContainer}>
          {profile.ports.length > 0 ? (
            profile.ports.map((port) => (
              <View key={port.id} style={styles.portCard}>
                <View style={styles.portIcon}>
                  <Ship size={24} color="#0066CC" />
                </View>
                <View style={styles.portInfo}>
                  <Text style={styles.portName}>{port.name}</Text>
                  <View style={styles.portDetails}>
                    <View style={styles.portDetailRow}>
                      <MapPin size={16} color="#666" />
                      <Text style={styles.portDetailText}>{port.name}</Text>
                    </View>
                    <View style={styles.portDetailRow}>
                      <Ship size={16} color="#666" />
                      <Text style={styles.portDetailText}>
                        {port.boatCount} bateau{port.boatCount > 1 ? 'x' : ''}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun port géré.</Text>
            </View>
          )}
        </View>
      )}

      {/* Logout Button */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <LogOut size={20} color="#ff4444" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <EditProfileModal 
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        formData={formData}
        setFormData={setFormData}
        handleSaveProfile={handleSaveProfile}
        newCertification={newCertification}
        setNewCertification={setNewCertification}
        handleAddCertification={handleAddCertification}
      />
      <PhotoModal 
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onChoosePhoto={handleChoosePhoto}
        onDeletePhoto={handleDeletePhoto}
        hasCustomPhoto={localAvatar !== avatars.neutral}
        onSelectAvatar={() => setShowAvatarModal(true)}
      />
      <AvatarModal 
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSelectAvatar={handleSelectAvatar}
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
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0066CC',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'white',
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  editProfileButton: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editProfileText: {
    color: '#0066CC',
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  bioText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  experienceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  experienceLabel: {
    fontSize: 14,
    color: '#666',
  },
  experienceValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: '600',
  },
  servicesContainer: {
    padding: 20,
    gap: 16,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
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
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
  },
  portsContainer: {
    padding: 20,
    gap: 16,
  },
  portCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
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
  portIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  portInfo: {
    flex: 1,
  },
  portName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  portDetails: {
    gap: 4,
  },
  portDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portDetailText: {
    fontSize: 14,
    color: '#666',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    margin: 20,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff4444',
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
    marginBottom: 16,
    padding: 16,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 4,
  },
  addCertificationContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  addCertificationInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  addCertificationButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
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
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
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
  avatarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  avatarPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
