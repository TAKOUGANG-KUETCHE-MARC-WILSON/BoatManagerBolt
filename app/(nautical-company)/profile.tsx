// app/(nautical-company)/profile.tsx
import { useState, useEffect, memo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, Alert, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ship, Users, Phone, Mail, Calendar, LogOut, MapPin, Image as ImageIcon, X, Plus, Pencil } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

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

interface NauticalCompanyProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  memberSince: string;
  profileImage: string;
  title: string; // Job title or specialization
  rating?: number;
  reviewCount?: number;
}

// Silhouette universelle
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

// Helper to extract path from a public URL or signed URL
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
  return null; // Not a recognized Supabase storage URL
};

// Helper to get a signed URL for an image
const getSignedImageUrl = async (imagePath: string, bucketName: string) => {
  if (!imagePath) return '';

  // If it's already a public URL (e.g., default avatar or direct public access), return as is
  if (imagePath.includes(`/storage/v1/object/public/${bucketName}/`)) {
    return imagePath;
  }

  // Otherwise, generate a signed URL from the path
  const { data, error } = await supabase
    .storage
    .from(bucketName)
    .createSignedUrl(imagePath, 60 * 60); // Valid for 1 hour

  if (error) {
    console.error(`Error creating signed URL for ${bucketName} image:`, error);
    return '';
  }
  return data?.signedUrl || '';
};

// Helper to delete image from Supabase Storage
const deleteImageFromStorage = async (imageUrl: string, bucketName: string) => {
  const filePath = getStoragePathFromUrl(imageUrl, bucketName);
  if (filePath) {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);
    if (error) {
      console.warn(`Error deleting image from ${bucketName} storage:`, error);
    }
  }
};


// Extracted EditProfileModal component
const EditProfileModal = memo(({ visible, onClose, formData, setFormData, handleSaveProfile }) => (
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
        
        <ScrollView style={styles.editFormContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Nom ou raison sociale</Text>
            <TextInput
              style={styles.formInput}
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
              placeholder="Nom ou raison sociale"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Fonction / Spécialité</Text>
            <TextInput
              style={styles.formInput}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Fonction / Spécialité"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              style={styles.formInput}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholder="Email"
              keyboardType="email-address"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Téléphone</Text>
            <TextInput
              style={styles.formInput}
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              placeholder="Téléphone"
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Adresse</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={formData.address}
              onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
              placeholder="Adresse"
              multiline
            />
          </View>
        </ScrollView>
        
        <View style={styles.modalActions}>
          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={onClose}
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
));

// Extracted PhotoModal component
// --- REMPLACE TOUTE la définition de PhotoModal par ceci ---
const PhotoModal = memo(({ visible, onClose, onChoosePhoto, onDeletePhoto, hasPhoto }) => {
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
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

            {hasPhoto ? (
              <TouchableOpacity style={[styles.modalOption, styles.deleteOption]} onPress={onDeletePhoto}>
                <X size={24} color="#ff4444" />
                <Text style={styles.modalOptionText}>Supprimer la photo</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});


export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'services' | 'ports'>('services');
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [companyProfile, setCompanyProfile] = useState<NauticalCompanyProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    title: '',
  });

  // defaultAvatar est déjà défini en dehors du composant

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      // Fetch user profile details
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, company_name, e_mail, phone, address, avatar, created_at, job_title, rating, review_count')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        setLoading(false);
        return;
      }

      if (userData) {
        const memberSinceDate = userData.created_at ? new Date(userData.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) : 'N/A';
        
        // Get signed URL for the avatar
        const avatarUrl = await getSignedImageUrl(userData.avatar || '', 'avatars');

        setCompanyProfile({
          id: userData.id.toString(),
          name: userData.company_name || 'N/A',
          email: userData.e_mail || 'N/A',
          phone: userData.phone || 'N/A',
          address: userData.address || 'N/A',
          memberSince: memberSinceDate,
          profileImage: avatarUrl || DEFAULT_AVATAR, // Use signed URL or DEFAULT_AVATAR
          title: userData.job_title || 'N/A',
          rating: userData.rating || 0,
          reviewCount: userData.review_count || 0,
        });

        setEditForm({
          name: userData.company_name || '',
          email: userData.e_mail || '',
          phone: userData.phone || '',
          address: userData.address || '',
          title: userData.job_title || '',
        });
      }

      // Fetch services offered by the nautical company
      const { data: userCategories, error: userCategoriesError } = await supabase
        .from('user_categorie_service')
        .select('categorie_service(id, description1, description2)')
        .eq('user_id', user.id);

      if (userCategoriesError) {
        console.error('Error fetching user service categories:', userCategoriesError);
      } else if (userCategories) {
        setServices(userCategories.map(uc => ({
          id: uc.categorie_service.id.toString(),
          name: uc.categorie_service.description1,
          description: uc.categorie_service.description2 || '',
        })));
      }

      // Fetch managed ports and boat counts
      const { data: userPortsData, error: userPortsError } = await supabase
        .from('user_ports')
        .select('port_id, ports(name)')
        .eq('user_id', user.id);

      if (userPortsError) {
        console.error('Error fetching user ports:', userPortsError);
      } else if (userPortsData) {
        const fetchedPorts = await Promise.all(userPortsData.map(async (up: any) => {
          const { count: boatCount, error: boatCountError } = await supabase
            .from('boat')
            .select('id', { count: 'exact' })
            .eq('id_port', up.port_id);

          if (boatCountError) {
            console.error(`Error fetching boat count for port ${up.ports.name}:`, boatCountError);
          }

          return {
            id: up.port_id.toString(),
            name: up.ports.name,
            boatCount: boatCount || 0,
          };
        }));
        setPorts(fetchedPorts);
      }
      setLoading(false);
    };

    fetchProfileData();
  }, [user]);

  // --- REMPLACE TOUTE la fonction handleChoosePhoto par ceci ---
const handleChoosePhoto = async () => {
  try {
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

    if (result.canceled || !user?.id) {
      setShowPhotoModal(false);
      return;
    }

    // 1) Normaliser l'image (JPEG) et récupérer base64
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

    // 2) Upload (bytes) avec un chemin stable dans le bucket "avatars"
    const bytes = Buffer.from(manipulated.base64, 'base64');
    const filePath = `users/${user.id}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, bytes, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      Alert.alert('Erreur', `Échec du téléchargement de l'avatar: ${uploadError.message}`);
      setShowPhotoModal(false);
      return;
    }

    // 3) Mettre à jour la BDD avec le CHEMIN brut (pas l'URL)
    const { error: updateDbError } = await supabase
      .from('users')
      .update({ avatar: filePath })
      .eq('id', user.id);

    if (updateDbError) {
      console.error('Error updating user avatar path in DB:', updateDbError);
      Alert.alert('Erreur', `Échec de la mise à jour du chemin avatar: ${updateDbError.message}`);
      setShowPhotoModal(false);
      return;
    }

    // 4) Générer une URL signée fraîche pour l'affichage
    const newSignedUrl = await getSignedImageUrl(filePath, 'avatars');
    const signedWithBust = newSignedUrl ? `${newSignedUrl}&v=${Date.now()}` : DEFAULT_AVATAR;

    setCompanyProfile(prev =>
      prev ? { ...prev, profileImage: signedWithBust } : prev
    );

    Alert.alert('Succès', 'Photo de profil mise à jour.');
  } catch (e: any) {
    console.error('Upload avatar error:', e);
    Alert.alert('Erreur', e?.message ?? 'Impossible de mettre à jour la photo.');
  } finally {
    setShowPhotoModal(false);
  }
};


  // --- REMPLACE TOUTE la fonction handleDeletePhoto par ceci ---
const handleDeletePhoto = async () => {
  try {
    if (!user?.id) {
      Alert.alert('Info', 'Aucune photo personnalisée à supprimer.');
      return;
    }

    const filePath = `users/${user.id}/avatar.jpg`;

    // supprimer dans le storage (ignore l'erreur si fichier absent)
    await supabase.storage.from('avatars').remove([filePath]).catch(() => {});

    // vider la colonne en BDD
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar: '' })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user avatar to default:', updateError);
      Alert.alert('Erreur', `Échec de la mise à jour de l'avatar: ${updateError.message}`);
      return;
    }

    // remettre le fallback local
    setCompanyProfile(prev => prev ? { ...prev, profileImage: DEFAULT_AVATAR } : prev);
    Alert.alert('Succès', 'Photo de profil supprimée.');
  } finally {
    setShowPhotoModal(false);
  }
};


  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const handleEditProfile = () => {
    if (companyProfile) {
      setEditForm({
        name: companyProfile.name,
        email: companyProfile.email,
        phone: companyProfile.phone,
        address: companyProfile.address,
        title: companyProfile.title,
      });
      setShowEditProfileModal(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({
        company_name: editForm.name,
        e_mail: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        job_title: editForm.title,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erreur', `Impossible de mettre à jour le profil: ${error.message}`);
    } else {
      setCompanyProfile(prev => prev ? {
        ...prev,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        title: editForm.title,
      } : null);
      setShowEditProfileModal(false);
      Alert.alert('Succès', 'Votre profil a été mis à jour avec succès.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (!companyProfile) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Profil non trouvé.</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Image 
              key={companyProfile.profileImage} // Use key to force re-render on image change
              source={{ uri: companyProfile.profileImage }}
              style={styles.profileImage}
              onError={({ nativeEvent: { error: imgError } }) => {
                console.log('Error loading profile image:', imgError);
                // Fallback to default avatar if image fails to load
                setCompanyProfile(prev => prev ? { ...prev, profileImage: DEFAULT_AVATAR } : null);
              }}
            />
            <TouchableOpacity 
              style={styles.editPhotoButton}
              onPress={() => setShowPhotoModal(true)}
            >
              <Pencil size={20} color="white" />
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
            {services.length > 0 ? (
              services.map((service) => (
                <View key={service.id} style={styles.serviceCard}>
                  <View style={styles.serviceIcon}>
                    <Ship size={24} color="#0066CC" />
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
            {ports.length > 0 ? (
              ports.map((port) => (
                <View key={port.id} style={styles.portCard}>
                  <View style={styles.portIcon}>
                    <MapPin size={24} color="#0066CC" />
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
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucun port géré.</Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#ff4444" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
      <EditProfileModal 
        visible={showEditProfileModal}
        onClose={() => setShowEditProfileModal(false)}
        formData={editForm}
        setFormData={setEditForm}
        handleSaveProfile={handleSaveProfile}
      />
      <PhotoModal 
        visible={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onChoosePhoto={handleChoosePhoto}
        onDeletePhoto={handleDeletePhoto}
        hasPhoto={companyProfile.profileImage !== DEFAULT_AVATAR}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
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
    color: '#666',
    fontWeight: '500',
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
});
