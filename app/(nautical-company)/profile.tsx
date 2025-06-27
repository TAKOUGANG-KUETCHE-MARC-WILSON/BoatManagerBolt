// app/(nautical-company)/profile.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ship, Users, Phone, Mail, Calendar, LogOut, MapPin, Image as ImageIcon, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';

interface Service {
  id: string;
  name: string;
  description: string;
}

interface Port {
  id: string;
  name: string;
  boatCount: number;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'services' | 'ports'>('services');
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  const [companyProfile, setCompanyProfile] = useState({
    name: user?.companyName || 'Nautisme Pro',
    email: user?.email || 'contact@nautismepro.com',
    phone: '+33 6 12 34 56 78',
    address: '123 Avenue du Port, 13000 Marseille',
    memberSince: 'Janvier 2024',
    rating: 4.8,
    reviewCount: 156,
    profileImage: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop',
    title: 'Entreprise du nautisme spécialisée',
  });

  const [editForm, setEditForm] = useState({
    name: companyProfile.name,
    email: companyProfile.email,
    phone: companyProfile.phone,
    address: companyProfile.address,
    title: companyProfile.title,
  });

  const [services] = useState<Service[]>([
    {
      id: 'entretien',
      name: 'Entretien',
      description: 'Entretien régulier et préventif des bateaux',
    },
    {
      id: 'amelioration',
      name: 'Amélioration',
      description: 'Installation et mise à niveau d\'équipements',
    },
    {
      id: 'reparation',
      name: 'Réparation',
      description: 'Réparation de pannes et dommages',
    },
    {
      id: 'controle',
      name: 'Contrôle',
      description: 'Inspection technique et diagnostics',
    },
    {
      id: 'acces',
      name: 'Accès',
      description: 'Gestion des accès et sécurité',
    },
  ]);

  const [ports] = useState<Port[]>([
    {
      id: 'p1',
      name: 'Port de Marseille',
      boatCount: 25,
    },
    {
      id: 'p2',
      name: 'Port de Cassis',
      boatCount: 15,
    },
  ]);

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
      setCompanyProfile(prev => ({ ...prev, profileImage: result.assets[0].uri }));
    }
    setShowPhotoModal(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleEditProfile = () => {
    setEditForm({
      name: companyProfile.name,
      email: companyProfile.email,
      phone: companyProfile.phone,
      address: companyProfile.address,
      title: companyProfile.title,
    });
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = () => {
    setCompanyProfile(prev => ({
      ...prev,
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone,
      address: editForm.address,
      title: editForm.title,
    }));
    setShowEditProfileModal(false);
    Alert.alert('Succès', 'Votre profil a été mis à jour avec succès.');
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

  const EditProfileModal = () => (
    <Modal
      visible={showEditProfileModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditProfileModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Modifier mon profil</Text>
          
          <ScrollView style={styles.editFormContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nom ou raison sociale</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                placeholder="Nom ou raison sociale"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Fonction / Spécialité</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.title}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, title: text }))}
                placeholder="Fonction / Spécialité"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.email}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                placeholder="Email"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.phone}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                placeholder="Téléphone"
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Adresse</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.address}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, address: text }))}
                placeholder="Adresse"
                multiline
              />
            </View>
          </ScrollView>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowEditProfileModal(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalSaveButton}
              onPress={handleSaveProfile}
            >
              <Text style={styles.modalSaveText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Image 
              source={{ uri: companyProfile.profileImage }}
              style={styles.profileImage}
            />
            <TouchableOpacity 
              style={styles.editPhotoButton}
              onPress={() => setShowPhotoModal(true)}
            >
              <ImageIcon size={20} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>{companyProfile.name}</Text>
          <Text style={styles.profileTitle}>{companyProfile.title}</Text>
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={handleEditProfile}
          >
            <Text style={styles.editProfileText}>Modifier mon profil</Text>
          </TouchableOpacity>
          
          <View style={styles.profileInfoList}>
            <View style={styles.profileInfoItem}>
              <Mail size={20} color="#666" />
              <Text style={styles.profileInfoText}>{companyProfile.email}</Text>
            </View>
            <View style={styles.profileInfoItem}>
              <Phone size={20} color="#666" />
              <Text style={styles.profileInfoText}>{companyProfile.phone}</Text>
            </View>
            <View style={styles.profileInfoItem}>
              <MapPin size={20} color="#666" />
              <Text style={styles.profileInfoText}>{companyProfile.address}</Text>
            </View>
            <View style={styles.profileInfoItem}>
              <Calendar size={20} color="#666" />
              <Text style={styles.profileInfoText}>
                Membre depuis {companyProfile.memberSince}
              </Text>
            </View>
          </View>
        </View>

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

        {selectedTab === 'services' ? (
          <View style={styles.servicesContainer}>
            {services.map((service) => (
              <View key={service.id} style={styles.serviceCard}>
                <View style={styles.serviceIcon}>
                  <Ship size={24} color="#0066CC" />
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
            {ports.map((port) => (
              <View key={port.id} style={styles.portCard}>
                <View style={styles.portIcon}>
                  <Ship size={24} color="#0066CC" />
                </View>
                <View style={styles.portInfo}>
                  <Text style={styles.portName}>{port.name}</Text>
                  <View style={styles.portDetails}>
                    <View style={styles.portDetailRow}>
                      <Users size={16} color="#666" />
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

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#ff4444" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
      <PhotoModal />
      <EditProfileModal />
    </>
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
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editPhotoButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#0066CC',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'white',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  profileTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
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
  profileInfoList: {
    width: '100%',
    gap: 12,
  },
  profileInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileInfoText: {
    fontSize: 16,
    color: '#666',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
    padding: 16,
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
  flex: 1,
  backgroundColor: '#f1f5f9',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
},


  
  modalCancelText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
  },
  editFormContainer: {
    maxHeight: 400,
    padding: 16,
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
    minHeight: 48,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  modalSaveButton: {
  flex: 1,
  backgroundColor: '#0066CC',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
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

  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

