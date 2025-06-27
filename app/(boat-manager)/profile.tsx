import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, TextInput, Alert } from 'react-native';
import { MapPin, Phone, Mail, Calendar, Shield, Award, Ship, Wrench, PenTool as Tool, Gauge, Key, FileText, LogOut, Image as ImageIcon, X, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

interface Service {
  id: string;
  name: string;
  description: string;
  icon: any;
}

interface BoatManagerProfile {
  title: string; // Ajout du champ title pour la fonction
  experience: string;
  certifications: string[];
  ports: {
    id: string;
    name: string;
    boatCount: number;
  }[];
  bio: string; // Ajout d'un champ pour la biographie
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

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'services' | 'ports'>('services');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  // Simuler les données du Boat Manager
  const [profile, setProfile] = useState<BoatManagerProfile>({
    title: 'Boat Manager Senior', // Titre/fonction du Boat Manager
    experience: '8 ans',
    certifications: ['Certification YBM', 'Expert Maritime'],
    bio: "Je suis à votre disposition pour vous accompagner dans tous vos projets nautiques et garantir une expérience sans souci sur l'eau.",
    ports: [
      {
        id: 'p1',
        name: 'Port de Marseille',
        boatCount: 12,
      },
      {
        id: 'p2',
        name: 'Port de Cassis',
        boatCount: 8,
      },
    ],
  });

  // État pour le formulaire d'édition
  const [formData, setFormData] = useState({
    title: profile.title,
    experience: profile.experience,
    bio: profile.bio,
    certifications: profile.certifications.join(', '), // Convertir le tableau en chaîne pour l'édition
  });

  // État pour gérer l'ajout de certification
  const [newCertification, setNewCertification] = useState('');

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

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
      // Ici, vous mettriez à jour l'avatar de l'utilisateur
      console.log('Photo selected:', result.assets[0].uri);
    }
    setShowPhotoModal(false);
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

  const handleSaveProfile = () => {
    // Convertir la chaîne de certifications en tableau
    const certificationsArray = formData.certifications
      .split(',')
      .map(cert => cert.trim())
      .filter(cert => cert !== '');

    setProfile(prev => ({
      ...prev,
      title: formData.title,
      experience: formData.experience,
      bio: formData.bio,
      certifications: certificationsArray,
    }));
    setShowEditModal(false);
    Alert.alert('Succès', 'Votre profil a été mis à jour avec succès.');
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

  // Modal pour éditer le profil
  const EditProfileModal = () => (
    <Modal
      visible={showEditModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier mon profil</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowEditModal(false)}
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
              onPress={() => setShowEditModal(false)}
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
  );

  // Modal pour choisir une photo
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

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={{ uri: user?.avatar }} 
            style={styles.avatar}
          />
          <TouchableOpacity 
            style={styles.editPhotoButton}
            onPress={() => setShowPhotoModal(true)}
          >
            <ImageIcon size={20} color="white" />
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
          <Text style={styles.infoText}>+33 6 12 34 56 78</Text>
        </View>
        <View style={styles.infoRow}>
          <Calendar size={20} color="#0066CC" />
          <Text style={styles.infoText}>Membre depuis janvier 2024</Text>
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
              {profile.certifications.join(', ')}
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

      <EditProfileModal />
      <PhotoModal />
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
});