import { useState, useEffect, useCallback, memo } from 'react';
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
  icon: any;
}

interface BoatManagerProfile {
  id: string;
  first_name: string;
  last_name: string;
  e_mail: string;
  phone: string;
  avatar: string;
  job_title: string; // New field for job title
  experience: string;
  certification: string[]; // Changed to 'certification' to match DB
  bio: string;
  rating: number;
  review_count: number;
  created_at: string;
  ports: Array<{
    id: string;
    name: string;
    boatCount: number; // This will be fetched separately
  }>;
}

const services: Service[] = [
  {
    id: '1',
    name: 'Maintenance',
    description: 'Entretien régulier et préventif des bateaux',
    icon: Wrench,
  },
  {
    id: '2',
    name: 'Amélioration',
    description: 'Installation et mise à niveau d\'équipements',
    icon: Tool,
  },
  {
    id: '3',
    name: 'Contrôle',
    description: 'Inspection technique et diagnostics',
    icon: Gauge,
  },
  {
    id: '4',
    name: 'Accès',
    description: 'Gestion des accès et sécurité',
    icon: Key,
  },
  {
    id: '5',
    name: 'Administratif',
    description: 'Assistance pour les démarches administratives',
    icon: FileText,
  },
];

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
              value={formData.job_title} // Changed from title to job_title
              onChangeText={(text) => setFormData(prev => ({ ...prev, job_title: text }))}
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
              value={formData.certification} // Changed from certifications to certification
              onChangeText={(text) => setFormData(prev => ({ ...prev, certification: text }))}
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
));

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
));

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
));

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'services' | 'ports'>('services');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  const [profile, setProfile] = useState<BoatManagerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // État pour le formulaire d'édition
  const [formData, setFormData] = useState({
    job_title: '',
    experience: '',
    bio: '',
    certification: '', // Changed to certification
  });

  // État pour gérer l'ajout de certification
  const [newCertification, setNewCertification] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*, user_ports(port_id, ports(id, name))') // Select user and their ports
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      // Process ports and boat counts
      const userPorts = data.user_ports || [];
      const processedPorts = await Promise.all(userPorts.map(async (up: any) => {
        const { count, error: countError } = await supabase
          .from('boat')
          .select('*', { count: 'exact', head: true })
          .eq('id_port', up.ports.id);

        if (countError) {
          console.error('Error fetching boat count:', countError);
          return { id: up.ports.id, name: up.ports.name, boatCount: 0 };
        }
        return { id: up.ports.id, name: up.ports.name, boatCount: count || 0 };
      }));

      setProfile({
        id: data.id,
        first_name: data.first_name,
        last_name: data.last_name,
        e_mail: data.e_mail,
        phone: data.phone,
        avatar: data.avatar,
        job_title: data.job_title || '',
        experience: data.experience || '',
        certification: data.certification || [],
        bio: data.bio || '',
        rating: data.rating || 0,
        review_count: data.review_count || 0,
        created_at: data.created_at,
        ports: processedPorts,
      });

      setFormData({
        job_title: data.job_title || '',
        experience: data.experience || '',
        bio: data.bio || '',
        certification: (data.certification || []).join(', '),
      });

      setLoading(false);
    };

    fetchProfile();
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
      // Update avatar in DB
      if (user?.id) {
        const { error } = await supabase
          .from('users')
          .update({ avatar: result.assets[0].uri })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating avatar:', error);
          Alert.alert('Erreur', 'Impossible de mettre à jour la photo de profil.');
        } else {
          setProfile(prev => prev ? { ...prev, avatar: result.assets[0].uri } : null);
        }
      }
    }
    setShowPhotoModal(false);
  };

  const handleDeletePhoto = async () => {
    // Reset to default neutral avatar in DB
    if (user?.id) {
      const { error } = await supabase
        .from('users')
        .update({ avatar: avatars.neutral })
        .eq('id', user.id);

      if (error) {
        console.error('Error deleting avatar:', error);
        Alert.alert('Erreur', 'Impossible de supprimer la photo de profil.');
      } else {
        setProfile(prev => prev ? { ...prev, avatar: avatars.neutral } : null);
      }
    }
    setShowPhotoModal(false);
  };

  const handleSelectAvatar = async (type: keyof typeof avatars) => {
    // Update avatar in DB
    if (user?.id) {
      const { error } = await supabase
        .from('users')
        .update({ avatar: avatars[type] })
        .eq('id', user.id);

      if (error) {
        console.error('Error selecting avatar:', error);
        Alert.alert('Erreur', 'Impossible de sélectionner l\'avatar.');
      } else {
        setProfile(prev => prev ? { ...prev, avatar: avatars[type] } : null);
      }
    }
    setShowAvatarModal(false);
    setShowPhotoModal(false); // Close PhotoModal after selecting avatar
  };

  const handleEditProfile = () => {
    if (profile) {
      setFormData({
        job_title: profile.job_title,
        experience: profile.experience,
        bio: profile.bio,
        certification: (profile.certification || []).join(', '),
      });
      setShowEditModal(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile?.id) return;

    const certificationsArray = formData.certification
      .split(',')
      .map(cert => cert.trim())
      .filter(cert => cert !== '');

    const { error } = await supabase
      .from('users')
      .update({
        job_title: formData.job_title,
        experience: formData.experience,
        bio: formData.bio,
        certification: certificationsArray,
      })
      .eq('id', profile.id);

    if (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour votre profil.');
    } else {
      setProfile(prev => prev ? {
        ...prev,
        job_title: formData.job_title,
        experience: formData.experience,
        bio: formData.bio,
        certification: certificationsArray,
      } : null);
      setShowEditModal(false);
      Alert.alert('Succès', 'Votre profil a été mis à jour avec succès.');
    }
  };

  const handleAddCertification = () => {
    if (newCertification.trim()) {
      setFormData(prev => ({
        ...prev,
        certification: prev.certification ? `${prev.certification}, ${newCertification}` : newCertification,
      }));
      setNewCertification('');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Chargement du profil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Profil non trouvé.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={{ uri: profile.avatar }} // Use profile.avatar here
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
          <Text style={styles.name}>{profile.first_name} {profile.last_name}</Text>
          <Text style={styles.title}>{profile.job_title}</Text>
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
          <Text style={styles.infoText}>{profile.e_mail}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone size={20} color="#0066CC" />
          <Text style={styles.infoText}>{profile.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Calendar size={20} color="#0066CC" />
          <Text style={styles.infoText}>Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</Text>
        </View>
      </View>

      {/* Biographie */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>À propos de moi</Text>
        <Text style={styles.bioText}>{profile.bio}</Text>
      </View>

      {/* Experience & Certifications */}
      <View style={styles.section}>
        <View style={styles.experienceItem}>
          <Shield size={20} color="#0066CC" />
          <View>
            <Text style={styles.experienceLabel}>Expérience</Text>
            <Text style={styles.experienceValue}>{profile.experience}</Text>
          </View>
        </View>
        <View style={styles.experienceItem}>
          <Award size={20} color="#0066CC" />
          <View>
            <Text style={styles.experienceLabel}>Certifications</Text>
            <Text style={styles.experienceValue}>
              {(profile.certification || []).join(', ')}
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
          {services.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceIcon}>
                <service.icon size={24} color="#0066CC" />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.portsContainer}>
          {profile.ports.map((port) => (
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
          ))}
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
        hasCustomPhoto={profile.avatar !== avatars.neutral}
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
    marginBottom: 16,
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
});

