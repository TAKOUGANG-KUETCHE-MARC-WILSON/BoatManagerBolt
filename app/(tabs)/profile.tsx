import { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ship, Users, Phone, Mail, Calendar, LogOut, MapPin, Image as ImageIcon, X, Plus, Pencil, Briefcase, Anchor, Star, ChevronRight, Settings, User, Tag, Info, Hash, FileText as FileTextIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

interface ServiceHistory {
  id: string;
  date: string;
  type: string;
  description: string;
  provider: {
    id: string;
    name: string;
    type: 'boat_manager' | 'nautical_company';
    image: string;
  };
  status: 'completed' | 'in_progress';
}

interface BoatManager {
  id: string;
  name: string;
  image: string;
  rating: number;
  location: string;
}

interface Boat {
  id: string;
  name: string;
  type: string;
  length: string;
  image: string;
}

const avatars = {
  male: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
  female: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
  neutral: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop',
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
        
        <ScrollView style={styles.modalBody}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Prénom</Text>
            <TextInput
              style={styles.formInput}
              value={formData.firstName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
              placeholder="Prénom"
            />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Nom</Text>
            <TextInput
              style={styles.formInput}
              value={formData.lastName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
              placeholder="Nom"
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
  const { isAuthenticated, user, logout } = useAuth();
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'boats' | 'ports' | 'history' | 'settings'>('boats');
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [showEditModal, setShowEditModal] = useState(false);

  const [userProfile, setUserProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    memberSince: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
    profileImage: user?.avatar || avatars.neutral
  });

  const [boats, setBoats] = useState<Boat[]>([]);
  const [userPorts, setUserPorts] = useState<any[]>([]); // Store user's ports with BM info
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [boatManagers, setBoatManagers] = useState<BoatManager[]>([]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;

      // Update local userProfile state from auth context
      setUserProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        memberSince: user.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
        profileImage: user.avatar || avatars.neutral
      });

      // Fetch Boats
      const { data: boatsData, error: boatsError } = await supabase
        .from('boat')
        .select('id, name, type, longueur, image')
        .eq('id_user', user.id);

      if (boatsError) {
        console.error('Error fetching boats:', boatsError);
      } else {
        setBoats(boatsData.map(b => ({
          id: b.id.toString(),
          name: b.name,
          type: b.type,
          length: b.longueur,
          image: b.image || 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop', // Default image
        })));
      }

      // Fetch User Ports and associated Boat Managers
      const { data: userPortsData, error: userPortsError } = await supabase
        .from('user_ports')
        .select('port_id, ports(name)')
        .eq('user_id', user.id);

      if (userPortsError) {
        console.error('Error fetching user ports:', userPortsError);
      } else {
        const fetchedUserPorts = await Promise.all(userPortsData.map(async (up: any) => {
          const { data: bmData, error: bmError } = await supabase
            .from('user_ports')
            .select('user_id')
            .eq('port_id', up.port_id)
            .limit(1); // Assuming one BM per port for simplicity

          let boatManagerDetails: BoatManager | undefined;
          if (!bmError && bmData && bmData.length > 0) {
            const { data: bmProfile, error: bmProfileError } = await supabase
              .from('users')
              .select('id, first_name, last_name, avatar, e_mail, phone, rating')
              .eq('id', bmData[0].user_id)
              .eq('profile', 'boat_manager')
              .single();

            if (!bmProfileError && bmProfile) {
              boatManagerDetails = {
                id: bmProfile.id.toString(),
                name: `${bmProfile.first_name} ${bmProfile.last_name}`,
                image: bmProfile.avatar || avatars.neutral,
                rating: bmProfile.rating || 0,
                location: up.ports.name,
              };
            }
          }
          return {
            port: up.ports.name,
            boatManager: boatManagerDetails,
          };
        }));
        setUserPorts(fetchedUserPorts);
        setBoatManagers(fetchedUserPorts.map(p => p.boatManager).filter(Boolean) as BoatManager[]);
      }

      // Fetch Service History
      const { data: serviceRequestsData, error: serviceRequestsError } = await supabase
        .from('service_request')
        .select(`
          id,
          date,
          description,
          statut,
          id_boat(name),
          id_companie(company_name, avatar, profile),
          id_boat_manager(first_name, last_name, avatar, profile),
          categorie_service(description1)
        `)
        .eq('id_client', user.id)
        .order('date', { ascending: false });

      if (serviceRequestsError) {
        console.error('Error fetching service history:', serviceRequestsError);
      } else {
        setServiceHistory(serviceRequestsData.map((sr: any) => {
          let providerName = '';
          let providerType: 'boat_manager' | 'nautical_company' = 'boat_manager'; // Default
          let providerImage = '';
          let providerId = '';

          if (sr.id_companie) {
            providerName = sr.id_companie.company_name;
            providerType = 'nautical_company';
            providerImage = sr.id_companie.avatar || avatars.neutral;
            providerId = sr.id_companie.id;
          } else if (sr.id_boat_manager) {
            providerName = `${sr.id_boat_manager.first_name} ${sr.id_boat_manager.last_name}`;
            providerType = 'boat_manager';
            providerImage = sr.id_boat_manager.avatar || avatars.neutral;
            providerId = sr.id_boat_manager.id;
          }

          return {
            id: sr.id.toString(),
            date: sr.date,
            type: sr.categorie_service?.description1 || 'N/A',
            description: sr.description,
            status: sr.statut === 'completed' ? 'completed' : 'in_progress', // Simplify status
            boat: {
              id: sr.id_boat?.id.toString() || '',
              name: sr.id_boat?.name || 'N/A',
            },
            provider: {
              id: providerId,
              name: providerName,
              type: providerType,
              image: providerImage,
            },
          };
        }));
      }
    };

    fetchProfileData();
  }, [user]);

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
      const newAvatarUri = result.assets[0].uri;
      setUserProfile(prev => ({ ...prev, profileImage: newAvatarUri }));
      // Update Supabase
      if (user?.id) {
        const { error } = await supabase
          .from('users')
          .update({ avatar: newAvatarUri })
          .eq('id', user.id);
        if (error) console.error('Error updating avatar:', error);
      }
    }
    setShowPhotoModal(false);
  };

  const handleDeletePhoto = async () => {
    setUserProfile(prev => ({ ...prev, profileImage: avatars.neutral })); // Set to default neutral avatar
    // Update Supabase
    if (user?.id) {
      const { error } = await supabase
        .from('users')
        .update({ avatar: avatars.neutral }) // Set to default avatar URL
        .eq('id', user.id);
      if (error) console.error('Error deleting avatar:', error);
    }
    setShowPhotoModal(false);
  };

  const handleSelectAvatar = async (type: keyof typeof avatars) => {
    const newAvatarUri = avatars[type];
    setUserProfile(prev => ({ ...prev, profileImage: newAvatarUri }));
    // Update Supabase
    if (user?.id) {
      const { error } = await supabase
        .from('users')
        .update({ avatar: newAvatarUri })
        .eq('id', user.id);
      if (error) console.error('Error selecting avatar:', error);
    }
    setShowAvatarModal(false);
    setShowPhotoModal(false); // Close PhotoModal after selecting avatar
  };

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ],
      { cancelable: true }
    );
  };
    
  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({
        first_name: userProfile.firstName,
        last_name: userProfile.lastName,
        e_mail: userProfile.email,
        phone: userProfile.phone,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erreur', `Impossible de mettre à jour le profil: ${error.message}`);
    } else {
      setShowEditModal(false);
      Alert.alert('Succès', 'Votre profil a été mis à jour avec succès.');
    }
  };

  const StarRating = ({ rating }: { rating: number }) => (
    <View style={styles.ratingContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          fill={star <= rating ? '#FFC107' : 'none'}
          color={star <= rating ? '#FFC107' : '#D1D5DB'}
        />
      ))}
    </View>
  );

  const ProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.profileImageContainer}>
        <Image 
          source={{ uri: userProfile.profileImage }} 
          style={styles.profileImage} 
        />
        <TouchableOpacity 
          style={styles.editPhotoButton}
          onPress={() => setShowPhotoModal(true)}
        >
          <Pencil size={16} color="white" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.profileName}>
        {userProfile.firstName} {userProfile.lastName}
      </Text>
      
      <View style={styles.profileInfoList}>
        <View style={styles.profileInfoItem}>
          <Mail size={20} color="#666" />
          <Text style={styles.profileInfoText}>{userProfile.email}</Text>
        </View>
        <View style={styles.profileInfoItem}>
          <Phone size={20} color="#666" />
          <Text style={styles.profileInfoText}>{userProfile.phone}</Text>
        </View>
        <View style={styles.profileInfoItem}>
          <Calendar size={20} color="#666" />
          <Text style={styles.profileInfoText}>Membre depuis {userProfile.memberSince}</Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.editProfileButton}
        onPress={handleEditProfile}
      >
        <Text style={styles.editProfileText}>Modifier mon profil</Text>
      </TouchableOpacity>
    </View>
  );

  const BoatsList = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Ship size={24} color="#0066CC" />
          <Text style={styles.sectionTitle}>Mes Bateaux</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/boats/new')} // Added onPress handler
        >
          <Plus size={20} color="#0066CC" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.boatsContainer}>
          {boats.length > 0 ? (
            boats.map((boat) => (
              <TouchableOpacity // Added TouchableOpacity here
                key={boat.id} 
                style={styles.boatCard}
                onPress={() => router.push(`/boats/${boat.id}`)} // Added onPress handler
              >
                <Image source={{ uri: boat.image }} style={styles.boatImage} />
                <View style={styles.boatInfo}>
                  <View style={styles.boatHeader}>
                    <Text style={styles.boatName}>{boat.name}</Text>
                    <ChevronRight size={20} color="#666" />
                  </View>
                  <Text style={styles.boatDetails}>{boat.type} • {boat.length}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Boat size={48} color="#ccc" />
              <Text style={styles.emptyStateTitle}>Aucun bateau</Text>
              <Text style={styles.emptyStateText}>
                Ajoutez votre premier bateau pour commencer à gérer vos services.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const PortsSection = () => (
    <View style={styles.portsContainer}>
      <Text style={styles.portTitle}>Mes ports d'attache</Text>
      {userPorts.length > 0 ? (
        userPorts.map((portData, index) => (
          <View key={index} style={styles.portCard}>
            <MapPin size={24} color="#0066CC" />
            <View style={styles.portInfo}>
              <Text style={styles.portName}>{portData.port}</Text>
              {portData.boatManager && (
                <Text style={styles.portAddress}>Boat Manager: {portData.boatManager.name}</Text>
              )}
            </View>
            <ChevronRight size={20} color="#666" />
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <MapPin size={48} color="#ccc" />
          <Text style={styles.emptyStateTitle}>Aucun port d'attache</Text>
          <Text style={styles.emptyStateText}>
            Ajoutez un port d'attache pour être mis en relation avec un Boat Manager.
          </Text>
        </View>
      )}
    </View>
  );

  const ServiceHistoryList = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Star size={24} color="#0066CC" />
          <Text style={styles.sectionTitle}>Historique des services</Text>
        </View>
      </View>
      
      <View style={styles.serviceHistoryList}>
        {serviceHistory.length > 0 ? (
          serviceHistory.map((service) => (
            <TouchableOpacity 
              key={service.id} 
              style={styles.serviceHistoryCard}
              onPress={() => router.push(`/request/${service.id}`)}
            >
              <View style={styles.serviceHistoryHeader}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceHistoryType}>{service.type}</Text>
                  <Text style={styles.serviceHistoryDate}>
                    {new Date(service.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={[
                  styles.serviceHistoryStatus,
                  service.status === 'completed' ? styles.statusCompleted : styles.statusInProgress
                ]}>
                  <Text style={[
                    styles.serviceHistoryStatusText,
                    service.status === 'completed' ? styles.statusCompletedText : styles.statusInProgressText
                  ]}>
                    {service.status === 'completed' ? 'Terminé' : 'En cours'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.serviceHistoryDescription}>{service.description}</Text>
              
              <View style={styles.serviceHistoryProvider}>
                <Image 
                  source={{ uri: service.provider.image }} 
                  style={styles.serviceHistoryProviderImage} 
                />
                <View style={styles.serviceHistoryProviderInfo}>
                  <Text style={styles.serviceHistoryProviderName}>{service.provider.name}</Text>
                  <Text style={styles.serviceHistoryProviderType}>
                    {service.provider.type === 'boat_manager' ? 'Boat Manager' : 'Entreprise nautique'}
                  </Text>
                </View>
              </View>
              
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FileTextIcon size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucun historique de service</Text>
            <Text style={styles.emptyStateText}>
              Vos demandes de service et interventions passées apparaîtront ici.
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const BoatManagersList = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Users size={24} color="#0066CC" />
          <Text style={styles.sectionTitle}>Mes Boat Managers</Text>
        </View>
      </View>
      
      <View style={styles.managersList}>
        {boatManagers.length > 0 ? (
          boatManagers.map((manager) => (
            <TouchableOpacity // Added TouchableOpacity here
              key={manager.id} 
              style={styles.managerCard}
              onPress={() => router.push(`/boat-manager/${manager.id}`)} // Added onPress handler
            >
              <Image source={{ uri: manager.image }} style={styles.managerImage} />
              <View style={styles.managerInfo}>
                <Text style={styles.managerName}>{manager.name}</Text>
                <View style={styles.managerDetails}>
                  <StarRating rating={Math.floor(manager.rating)} />
                  <Text style={styles.managerDetails}> • {manager.location}</Text>
                </View>
              </View>
              <ChevronRight size={20} color="#666" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Users size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucun Boat Manager</Text>
            <Text style={styles.emptyStateText}>
              Vos Boat Managers assignés apparaîtront ici.
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const AccountSettings = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Settings size={24} color="#0066CC" />
          <Text style={styles.sectionTitle}>Paramètres du compte</Text>
        </View>
      </View>
      
      <TouchableOpacity style={styles.settingItem}
        onPress={() => setShowEditModal(true)}
        >
        <Text style={styles.settingText}>Modifier mon profil</Text>
        <ChevronRight size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.settingItem}
        onPress={() => router.push('/profile/notifications')}>
        <Text style={styles.settingText}>Notifications</Text>
        <ChevronRight size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.settingItem}
       onPress={() => router.push('/profile/privacy')}>
        <Text style={styles.settingText}>Confidentialité</Text>
        <ChevronRight size={20} color="#666" />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.settingItem, styles.logoutButton]}
        onPress={handleLogout}
      >
        <View style={styles.logoutContent}>
          <LogOut size={20} color="#ff4444" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Bienvenue sur Your Boat Manager</Text>
          <Text style={styles.subtitle}>
            Créez votre compte pour accéder à tous nos services
          </Text>
          
          <TouchableOpacity 
            style={styles.signupButton}
            onPress={() => router.push('/signup')}
          >
            <Plus size={20} color="white" />
            <Text style={styles.signupButtonText}>Créer un compte plaisancier</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginLinkText}>
              Déjà un compte ? Connectez-vous
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <ProfileHeader />
        
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'boats' && styles.activeTab]}
            onPress={() => setSelectedTab('boats')}
          >
            <Text style={[styles.tabText, selectedTab === 'boats' && styles.activeTabText]}>
              Mes Bateaux
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'ports' && styles.activeTab]}
            onPress={() => setSelectedTab('ports')}
          >
            <Text style={[styles.tabText, selectedTab === 'ports' && styles.activeTabText]}>
              Mes ports
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'history' && styles.activeTab]}
            onPress={() => setSelectedTab('history')}
          >
            <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>
              Historique
            </Text>
          </TouchableOpacity>
         
        </View>
        
        {/* Tab Content */}
        {selectedTab === 'boats' && <BoatsList />}
        {selectedTab === 'ports' && <PortsSection />}
        {selectedTab === 'history' && <ServiceHistoryList />}
       
        
        {/* These sections are always visible regardless of the selected tab */}
        <BoatManagersList />
        <AccountSettings />
      </ScrollView>
      <PhotoModal />
      <AvatarModal />
      <EditProfileModal 
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        formData={userProfile}
        setFormData={setUserProfile}
        handleSaveProfile={handleSaveProfile}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  signupButton: {
    backgroundColor: '#0066CC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 16,
    padding: 8,
  },
  loginLinkText: {
    color: '#0066CC',
    fontSize: 14,
  },
  profileHeader: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
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
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  boatsContainer: {
    paddingRight: 24,
    gap: 16,
  },
  boatCard: {
    width: 280,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  boatImage: {
    width: '100%',
    height: 160,
  },
  boatInfo: {
    padding: 16,
  },
  boatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  boatName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  boatDetails: {
    fontSize: 14,
    color: '#666',
  },
  managersList: {
    gap: 16,
  },
  managerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  managerImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  managerInfo: {
    flex: 1,
  },
  managerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  managerDetails: {
    fontSize: 14,
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  logoutButton: {
    borderBottomWidth: 0,
    marginTop: 8,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
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
    gap: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
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
  portsContainer: {
    padding: 24,
    backgroundColor: 'white',
    marginTop: 16,
  },
  portTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  portCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  portInfo: {
    flex: 1,
  },
  portName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  portAddress: {
    fontSize: 14,
    color: '#666',
  },
  serviceHistoryList: {
    gap: 16,
  },
  serviceHistoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
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
        boxBoxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  serviceHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceHistoryType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  serviceHistoryDate: {
    fontSize: 14,
    color: '#666',
  },
  serviceHistoryStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusInProgress: {
    backgroundColor: '#DBEAFE',
  },
  serviceHistoryStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusCompletedText: {
    color: '#10B981',
  },
  statusInProgressText: {
    color: '#3B82F6',
  },
  serviceHistoryDescription: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  serviceHistoryProvider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  serviceHistoryProviderImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  serviceHistoryProviderInfo: {
    flex: 1,
  },
  serviceHistoryProviderName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  serviceHistoryProviderType: {
    fontSize: 12,
    color: '#666',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  rateButtonText: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '500',
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ratedBadgeText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  },
  ratingServiceInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  ratingServiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  ratingServiceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ratingServiceProvider: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starIcon: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  commentContainer: {
    marginBottom: 16,
  },
  commentInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  ratingActions: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  ratingCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  ratingSubmitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0066CC',
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
        boxBoxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  ratingSubmitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  ratingSubmitText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  inventoryList: {
    gap: 16,
  },
  inventoryItemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
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
        boxBoxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  inventoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inventoryItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  inventoryItemCategoryBadge: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  inventoryItemCategoryText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
  inventoryItemDetails: {
    fontSize: 14,
    color: '#666',
  },
  inventoryItemChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
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
        boxBoxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  inventoryDetailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  inventoryDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inventoryDetailName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  inventoryDetailCategoryBadge: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  inventoryDetailCategoryText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  inventoryDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  inventoryDetailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    width: 120,
  },
  inventoryDetailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  inventoryDetailNotesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  inventoryDetailNotesLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    width: 120,
  },
  inventoryDetailNotesText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 24,
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});

// Mock data for reviews
const mockReviews = [
  {
    id: '1',
    author: 'Jean Dupont',
    rating: 5,
    comment: 'Excellent service, très professionnel et réactif.',
    date: '15 février 2024',
  },
  {
    id: '2',
    author: 'Marie Martin',
    rating: 4,
    comment: 'Très bonne expérience, je recommande.',
    date: '10 février 2024',
  },
  {
    id: '3',
    author: 'Pierre Durand',
    rating: 5,
    comment: 'Service impeccable et conseils avisés.',
    date: '5 février 2024',
  },
];

// Mock data for boat manager
const boatManager = {
  id: '1',
  name: 'Marie Martin',
  rating: 4.8,
  reviewCount: 156,
};

