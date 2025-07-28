import { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, Alert, TextInput, Switch } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Phone, Mail, Calendar, Shield, Award, Ship, Wrench, PenTool as Tool, Gauge, Key, FileText, LogOut, Image as ImageIcon, X, Plus, Pencil, User, Users, Star, ChevronRight, Settings, Tag, Info, Hash } from 'lucide-react-native';
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
  bio: string;
  ports: {
    id: string;
    name: string;
    boatCount: number;
  }[];
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

interface InventoryItem {
  id: string;
  category: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  notes?: string;
}

interface ServiceHistory {
  id: string;
  date: string;
  type: string;
  provider: {
    id: string;
    name: string;
    type: 'boat_manager' | 'nautical_company';
    image: string;
  };
  status: 'completed' | 'in_progress';
  rated: boolean;
}

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
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

// Mock inventory data for the profile page (keeping as mock as no DB table defined)
const mockInventory: InventoryItem[] = [
  {
    id: 'i1',
    category: 'Navigation',
    name: 'GPS',
    brand: 'Garmin',
    model: 'GPSMAP 1243xsv',
    serialNumber: 'GAR123456',
    purchaseDate: '2020-06-15',
    notes: 'Installé sur le tableau de bord'
  },
  {
    id: 'i2',
    category: 'Sécurité',
    name: 'Gilets de sauvetage',
    brand: 'Plastimo',
    purchaseDate: '2020-05-20',
    notes: '6 gilets adultes'
  },
  {
    id: 'i3',
    category: 'Moteur',
    name: 'Hélice de secours',
    brand: 'Volvo',
    model: 'P2-50',
    purchaseDate: '2021-03-10'
  }
];

// Mock reviews for the RatingModal (keeping as mock for client-side simulation)
const mockReviews: Review[] = [
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
      <ScrollView style={styles.modalContent}> {/* Changed to ScrollView */}
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
      </ScrollView>
    </View>
  </Modal>
))

export default function ProfileScreen() {
  const { isAuthenticated, user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'boats' | 'ports' | 'satisfaction' | 'inventory'>('boats');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false); // Initial state should be false
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

  const [boats, setBoats] = useState<Boat[]>([]); // Initialize as empty array
  const [boatManagers, setBoatManagers] = useState<BoatManager[]>([]); // Initialize as empty array
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]); // Initialize as empty array

  // New state for inventory item modal
  const [showInventoryDetailModal, setShowInventoryDetailModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceHistory | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;

      // Set initial user profile data from AuthContext
      setLocalAvatar(user.avatar || avatars.neutral);
      setFormData({
        title: user.job_title || '', // Assuming job_title exists on user object from AuthContext
        experience: user.experience || '', // Assuming experience exists
        bio: user.bio || '', // Assuming bio exists
        certifications: (user.certification || []).join(', '), // Assuming certification exists
      });

      // Fetch user's boats
      const { data: boatsData, error: boatsError } = await supabase
        .from('boat')
        .select('id, name, type, longueur, image') // Assuming 'longueur' maps to 'length'
        .eq('id_user', user.id);

      if (boatsError) {
        console.error('Error fetching user boats:', boatsError);
      } else {
        setBoats(boatsData.map(b => ({
          id: b.id.toString(),
          name: b.name,
          type: b.type,
          length: b.longueur,
          image: b.image || 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop', // Default image
        })));
      }

      // Fetch user's ports and associated Boat Managers
      const { data: userPortsData, error: userPortsError } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', user.id);

      if (userPortsError) {
        console.error('Error fetching user ports:', userPortsError);
      } else {
        const portIds = userPortsData.map(p => p.port_id);
        if (portIds.length > 0) {
          const { data: portsData, error: portsError } = await supabase
            .from('ports')
            .select('id, name');

          if (portsError) {
            console.error('Error fetching ports:', portsError);
          } else {
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

          // Fetch Boat Managers associated with these ports
          const { data: bmPortAssignments, error: bmPortAssignmentsError } = await supabase
            .from('user_ports')
            .select('user_id')
            .in('port_id', portIds);

          if (bmPortAssignmentsError) {
            console.error('Error fetching BM port assignments:', bmPortAssignmentsError);
          } else {
            const uniqueBmIds = [...new Set(bmPortAssignments.map(pa => pa.user_id))];
            if (uniqueBmIds.length > 0) {
              const { data: fetchedBms, error: bmFetchError } = await supabase
                .from('users')
                .select('id, first_name, last_name, avatar, user_ports(ports(name))')
                .in('id', uniqueBmIds)
                .eq('profile', 'boat_manager');

              if (bmFetchError) {
                console.error('Error fetching associated Boat Managers:', bmFetchError);
              } else {
                setBoatManagers(fetchedBms.map(bm => ({
                  id: bm.id.toString(),
                  name: `${bm.first_name} ${bm.last_name}`,
                  image: bm.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
                  rating: 4.8, // Mock rating, fetch from reviews later
                  location: bm.user_ports && bm.user_ports.length > 0 ? bm.user_ports[0].ports.name : 'N/A',
                })));
              }
            }
          }
        }
      }

      // Fetch service history
      const { data: serviceHistoryData, error: serviceHistoryError } = await supabase
        .from('service_request')
        .select(`
          id,
          date,
          statut,
          description,
          categorie_service(description1),
          users_provider:id_companie(first_name, last_name, company_name, profile, avatar),
          users_bm:id_boat_manager(first_name, last_name, profile, avatar)
        `)
        .eq('id_client', user.id)
        .order('date', { ascending: false });

      if (serviceHistoryError) {
        console.error('Error fetching service history:', serviceHistoryError);
      } else {
        setServiceHistory(serviceHistoryData.map(sr => {
          const providerUser = sr.users_provider || sr.users_bm;
          const providerName = providerUser?.profile === 'nautical_company' ? providerUser.company_name : `${providerUser?.first_name || ''} ${providerUser?.last_name || ''}`;
          const providerType = providerUser?.profile || 'unknown';

          return {
            id: sr.id.toString(),
            date: sr.date,
            type: sr.categorie_service?.description1 || 'N/A',
            description: sr.description,
            provider: {
              id: providerUser?.id.toString() || '',
              name: providerName,
              type: providerType as 'boat_manager' | 'nautical_company',
              image: providerUser?.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
            },
            status: sr.statut as 'completed' | 'in_progress', // Assuming these statuses
            rated: false, // This needs to be fetched from a reviews table
          };
        }));
      }
    };

    fetchProfileData();
  }, [user]);

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
    
  const handleChoosePhoto = async () => {
    // Request media library permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Veuillez autoriser l\'accès à votre galerie pour choisir une photo. Vous pouvez le faire dans les réglages de votre appareil.'
      );
      return;
    }

    // Launch image library
    try {
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
    } catch (error) {
      console.error('Error launching image picker:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la galerie d\'images. Veuillez réessayer.');
    } finally {
      setShowPhotoModal(false);
    }
  };

  const handleDeletePhoto = () => {
    setLocalAvatar(avatars.neutral); // Set to default neutral avatar
    // In a real app, you would also remove the avatar from Supabase Storage and update the user's avatar URL to null/default in the database
    // For now, just update local state
    setShowPhotoModal(false);
  };

  const handleSelectAvatar = (type: keyof typeof avatars) => {
    setLocalAvatar(avatars[type]);
    // In a real app, you would also update the user's avatar URL in the database
    // For now, just update local state
    setShowAvatarModal(false);
    setShowPhotoModal(false);
  };

  const handleEditProfile = () => {
    setFormData({
      title: profile.title,
      experience: profile.experience,
      bio: profile.bio,
      certifications: (profile.certifications || []).join(', '), // Ensure certifications is an array
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

  const handleRateService = (service: ServiceHistory) => {
    setSelectedService(service);
    setRating(0);
    setComment('');
    setShowRatingModal(true);
  };

  const handleSubmitRating = () => {
    if (rating === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note');
      return;
    }

    // In a real application, you would send this rating to your backend
    alert('Votre évaluation a été enregistrée avec succès !');
    setShowRatingModal(false);
    
    // Add the new review to the mock list (simulation)
    mockReviews.unshift({
      id: Date.now().toString(),
      author: `${user?.firstName} ${user?.lastName}`,
      rating,
      comment,
      date: new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    });
    
    // Update average rating (simulation) - this won't persist
    // const totalRatings = mockReviews.reduce((sum, review) => sum + review.rating, 0);
    // boatManager.rating = parseFloat((totalRatings / mockReviews.length).toFixed(1));
    // boatManager.reviewCount = mockReviews.length;
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

  const RatingModal = ({ boatManagerName }: { boatManagerName: string }) => (
    <Modal
      visible={showRatingModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowRatingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Évaluer {boatManagerName}</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowRatingModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.ratingServiceInfo}>
            <Text style={styles.ratingServiceTitle}>{selectedService?.type}</Text>
            <Text style={styles.ratingServiceDescription}>
              {selectedService?.description}
            </Text>
          </View>
          
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
              >
                <Star
                  size={40}
                  color="#FFC107"
                  fill={star <= rating ? '#FFC107' : 'none'}
                  style={styles.starIcon}
                />
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.ratingLabel}>
            {rating === 0 ? 'Sélectionnez une note' : 
             rating === 1 ? 'Très insatisfait' :
             rating === 2 ? 'Insatisfait' :
             rating === 3 ? 'Correct' :
             rating === 4 ? 'Satisfait' : 'Très satisfait'}
          </Text>
          
          <View style={styles.commentContainer}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Partagez votre expérience..."
              multiline
              numberOfLines={4}
            />
          </View>
          
          <View style={styles.ratingActions}>
            <TouchableOpacity 
              style={styles.ratingCancelButton}
              onPress={() => setShowRatingModal(false)}
            >
              <Text style={styles.ratingCancelText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.ratingSubmitButton,
                rating === 0 && styles.ratingSubmitButtonDisabled
              ]}
              onPress={handleSubmitRating}
              disabled={rating === 0}
            >
              <Text style={styles.ratingSubmitText}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const ProfileHeader = () => (
    <View style={styles.profileHeader}>
      <View style={styles.profileImageContainer}>
        <Image 
          source={{ uri: localAvatar }} // Use localAvatar here
          style={styles.profileImage} 
        />
        <TouchableOpacity 
          style={styles.editPhotoButton}
          onPress={() => setShowPhotoModal(true)} // Only open modal on press
        >
          <Pencil size={16} color="white" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.profileName}>
        {user?.firstName} {user?.lastName}
      </Text>
      
      <View style={styles.profileInfoList}>
        <View style={styles.profileInfoItem}>
          <Mail size={20} color="#666" />
          <Text style={styles.profileInfoText}>{user?.email}</Text>
        </View>
        <View style={styles.profileInfoItem}>
          <Phone size={20} color="#666" />
          <Text style={styles.profileInfoText}>{user?.phone || 'N/A'}</Text> {/* Display phone number */}
        </View>
        <View style={styles.profileInfoItem}>
          <Calendar size={20} color="#666" />
          <Text style={styles.profileInfoText}>Membre depuis {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</Text>
        </View>
      </View>
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
              <TouchableOpacity
                key={boat.id} 
                style={styles.boatCard}
                onPress={() => router.push(`/boats/${boat.id}`)}
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
              <Text style={styles.emptyStateText}>Aucun bateau enregistré.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const PortsSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <MapPin size={24} color="#0066CC" />
          <Text style={styles.sectionTitle}>Mes ports d'attache</Text>
        </View>
      </View>
      
      <View style={styles.portsContainer}>
        {profile.ports.length > 0 ? (
          profile.ports.map((port) => (
            <View key={port.id} style={styles.portCard}>
              <MapPin size={24} color="#0066CC" />
              <View style={styles.portInfo}>
                <Text style={styles.portName}>{port.name}</Text>
                <Text style={styles.portAddress}>{port.name}</Text> {/* Assuming address is same as name for simplicity */}
              </View>
              <ChevronRight size={20} color="#666" />
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun port d'attache enregistré.</Text>
          </View>
        )}
      </View>
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
                <View>
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
              
              {service.status === 'completed' && !service.rated && (
                <TouchableOpacity 
                  style={styles.rateButton}
                  onPress={() => handleRateService(service)}
                >
                  <Star size={16} color="#F59E0B" />
                  <Text style={styles.rateButtonText}>Évaluer ce service</Text>
                </TouchableOpacity>
              )}
              
              {service.rated && (
                <View style={styles.ratedBadge}>
                  <Star size={16} color="#10B981" fill="#10B981" />
                  <Text style={styles.ratedBadgeText}>Service évalué</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun historique de service.</Text>
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
            <TouchableOpacity
              key={manager.id} 
              style={styles.managerCard}
              onPress={() => router.push(`/boat-manager/${manager.id}`)}
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
            <Text style={styles.emptyStateText}>Aucun Boat Manager trouvé.</Text>
          </View>
        )}
      </View>
    </View>
  );

  const InventoryTab = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Anchor size={24} color="#0066CC" />
          <Text style={styles.sectionTitle}>Inventaire du bateau</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push(`/boats/inventory/new?boatId=${boats[0]?.id || '1'}`)}
        >
          <Plus size={20} color="#0066CC" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.inventoryList}>
        {mockInventory.length > 0 ? (
          mockInventory.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.inventoryItemCard}
              onPress={() => {
                setShowInventoryDetailModal(true);
                setSelectedInventoryItem(item);
              }}
            >
              <View style={styles.inventoryItemHeader}>
                <Text style={styles.inventoryItemName}>{item.name}</Text>
                <View style={styles.inventoryItemCategoryBadge}>
                  <Text style={styles.inventoryItemCategoryText}>{item.category}</Text>
                </View>
              </View>
              <Text style={styles.inventoryItemDetails}>
                {item.brand} {item.model} {item.serialNumber}
              </Text>
              <ChevronRight size={20} color="#666" style={styles.inventoryItemChevron} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Anchor size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucun équipement</Text>
            <Text style={styles.emptyStateText}>
              Ajoutez les équipements présents sur votre bateau.
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const InventoryItemDetailModal = () => (
    <Modal
      visible={showInventoryDetailModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowInventoryDetailModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détails de l'équipement</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowInventoryDetailModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedInventoryItem ? (
            <ScrollView style={styles.modalBody}>
              <View style={styles.inventoryDetailCard}>
                <View style={styles.inventoryDetailHeader}>
                  <Text style={styles.inventoryDetailName}>{selectedInventoryItem.name}</Text>
                  <View style={styles.inventoryDetailCategoryBadge}>
                    <Text style={styles.inventoryDetailCategoryText}>{selectedInventoryItem.category}</Text>
                  </View>
                </View>

                {selectedInventoryItem.brand && (
                  <View style={styles.inventoryDetailRow}>
                    <Tag size={16} color="#666" />
                    <Text style={styles.inventoryDetailLabel}>Marque:</Text>
                    <Text style={styles.inventoryDetailValue}>{selectedInventoryItem.brand}</Text>
                  </View>
                )}
                {selectedInventoryItem.model && (
                  <View style={styles.inventoryDetailRow}>
                    <Info size={16} color="#666" />
                    <Text style={styles.detailLabel}>Modèle:</Text>
                    <Text style={styles.inventoryDetailValue}>{selectedInventoryItem.model}</Text>
                  </View>
                )}
                {selectedInventoryItem.serialNumber && (
                  <View style={styles.inventoryDetailRow}>
                    <Hash size={16} color="#666" />
                    <Text style={styles.inventoryDetailLabel}>Numéro de série:</Text>
                    <Text style={styles.inventoryDetailValue}>{selectedInventoryItem.serialNumber}</Text>
                  </View>
                )}
                {selectedInventoryItem.purchaseDate && (
                  <View style={styles.inventoryDetailRow}>
                    <Calendar size={16} color="#666" />
                    <Text style={styles.inventoryDetailLabel}>Date d'achat:</Text>
                    <Text style={styles.inventoryDetailValue}>{selectedInventoryItem.purchaseDate}</Text>
                  </View>
                )}
                {selectedInventoryItem.notes && (
                  <View style={styles.inventoryDetailNotesContainer}>
                    <FileText size={16} color="#666" />
                    <Text style={styles.inventoryDetailNotesLabel}>Notes:</Text>
                    <Text style={styles.inventoryDetailNotesText}>{selectedInventoryItem.notes}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.modalBody}>
              <Text style={styles.emptyModalText}>Aucun détail d'équipement sélectionné.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
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
        onPress={() => router.push('/profile/edit')}
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
            style={[styles.tab, selectedTab === 'inventory' && styles.activeTab]}
            onPress={() => setSelectedTab('inventory')}
          >
            <Text style={[styles.tabText, selectedTab === 'inventory' && styles.activeTabText]}>
              Inventaire
            </Text>
          </TouchableOpacity>
         
        </View>
        
        {/* Tab Content */}
        {selectedTab === 'boats' && <BoatsList />}
        {selectedTab === 'ports' && <PortsSection />}
        {selectedTab === 'inventory' && <InventoryTab />}
       
        
        {/* These sections are always visible regardless of the selected tab */}
        <BoatManagersList />
        <AccountSettings />
      </ScrollView>
      <PhotoModal 
        visible={showPhotoModal} // Control visibility with state
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
      {selectedService && <RatingModal boatManagerName={selectedService.provider.name} />}
      <InventoryItemDetailModal />
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
    marginBottom: 4,
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
    justifyContent: 'center', // Ensure it's centered
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16, // Unified borderRadius
    padding: 24,
    gap: 16,
    width: '90%', // Added width
    maxWidth: 500, // Added maxWidth
    maxHeight: '90%', // Adjusted maxHeight to allow more content
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
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
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
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
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
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
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
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
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
        boxBoxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
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

