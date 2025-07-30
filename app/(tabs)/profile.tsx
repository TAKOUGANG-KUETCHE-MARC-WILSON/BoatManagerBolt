import { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, Alert, TextInput, Switch, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { MapPin, Phone, Mail, Calendar, Shield, Award, Ship, Wrench, PenTool as Tool, Gauge, Key, FileText, LogOut, Image as ImageIcon, X, Plus, Pencil, User, Star, MessageSquare, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

// Interfaces pour les données récupérées
interface Service {
  id: string;
  name: string;
  description: string;
  icon: any; // Icons are still hardcoded as they are UI components
}

interface BoatDetails {
  id: string;
  name: string;
  type: string;
  image: string;
  lastService?: string;
  nextService?: string;
  status: 'active' | 'maintenance' | 'inactive'; // Correspond à boat.etat
}

interface ServiceHistory {
  id: string;
  date: string;
  type: string;
  description: string;
  status: 'completed' | 'in_progress' | 'cancelled' | 'submitted' | 'quote_sent' | 'quote_accepted' | 'scheduled' | 'to_pay' | 'paid'; // Correspond à service_request.statut
  boat: {
    id: string;
    name: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewedEntity: {
    id: string;
    name: string;
    avatar: string;
    type: 'boat_manager' | 'nautical_company';
    entityRating?: number;
    entityReviewCount?: number;
  };
}

interface BoatManagerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  rating?: number;
  reviewCount?: number;
  location?: string;
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

// Extracted EditProfileModal component (MODIFIED)
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
              placeholder="Votre prénom"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Nom</Text>
            <TextInput
              style={styles.formInput}
              value={formData.lastName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
              placeholder="Votre nom"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              style={styles.formInput}
              value={formData.email}
              onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
              placeholder="Votre email"
              keyboardType="email-address"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Téléphone</Text>
            <TextInput
              style={styles.formInput}
              value={formData.phone}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
              placeholder="Votre numéro de téléphone"
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

// Extracted PhotoModal component (unchanged)
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

// Extracted AvatarModal component (unchanged)
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
  const [selectedTab, setSelectedTab] = useState<'boats' | 'history' | 'reviews'>('boats');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  const [localAvatar, setLocalAvatar] = useState(user?.avatar || avatars.neutral);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [boats, setBoats] = useState<BoatDetails[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [mainBoatManager, setMainBoatManager] = useState<BoatManagerProfile | null>(null);

  // States for "Show More/Show Less"
  const [showAllBoats, setShowAllBoats] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getBoatStatusColor = (status: BoatDetails['status']) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'maintenance':
        return '#F59E0B';
      case 'inactive':
        return '#EF4444';
      default:
        return '#666666';
    }
  };

  const getBoatStatusLabel = (status: BoatDetails['status']) => {
    switch (status) {
      case 'active':
        return 'En service';
      case 'maintenance':
        return 'En maintenance';
      case 'inactive':
        return 'Hors service';
      default:
        return status;
    }
  };

  const getServiceStatusColor = (status: ServiceHistory['status']) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'cancelled':
        return '#EF4444';
      case 'submitted':
        return '#F97316';
      case 'quote_sent':
        return '#22C55E';
      case 'quote_accepted':
        return '#15803D';
      case 'scheduled':
        return '#2563EB';
      case 'to_pay':
        return '#EAB308';
      case 'paid':
        return '#a6acaf';
      default:
        return '#666666';
    }
  };

  const getServiceStatusLabel = (status: ServiceHistory['status']) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'in_progress':
        return 'En cours';
      case 'cancelled':
        return 'Annulé';
      case 'submitted':
        return 'Transmise';
      case 'quote_sent':
        return 'Devis envoyé';
      case 'quote_accepted':
        return 'Devis accepté';
      case 'scheduled':
        return 'Planifiée';
      case 'to_pay':
        return 'À régler';
      case 'paid':
        return 'Réglée';
      default:
        return status;
    }
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);
      if (!user?.id) {
        setError('Utilisateur non authentifié.');
        setLoading(false);
        return;
      }

      try {
        // Fetch user profile details
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name, e_mail, phone, avatar, created_at')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('Error fetching user profile:', userError);
          setError('Échec du chargement du profil utilisateur.');
          return;
        }

        if (userData) {
          setLocalAvatar(userData.avatar || avatars.neutral);
          setProfileData({
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.e_mail || '',
            phone: userData.phone || '',
          });
          setFormData({
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.e_mail || '',
            phone: userData.phone || '',
          });
        }

        // Fetch user's boats
        const { data: boatsData, error: boatsError } = await supabase
          .from('boat')
          .select('id, name, type, image, etat, annee_construction') // annee_construction pour simuler last/next service
          .eq('id_user', user.id);

        if (boatsError) {
          console.error('Error fetching user boats:', boatsError);
          setError('Échec du chargement des bateaux.');
          return;
        }

        const formattedBoats: BoatDetails[] = await Promise.all(boatsData.map(async (boat: any) => {
          // Simuler lastService basés sur annee_construction
          const lastServiceDate = boat.annee_construction ? new Date(boat.annee_construction) : null;

          return {
            id: boat.id.toString(),
            name: boat.name,
            type: boat.type,
            image: boat.image || 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop', // Default image
            lastService: lastServiceDate ? lastServiceDate.toISOString().split('T')[0] : undefined,
            status: boat.etat || 'active', // Assurez-vous que 'etat' est un des types définis
          };
        }));
        setBoats(formattedBoats);

        // Fetch service history
        const { data: serviceHistoryData, error: serviceHistoryError } = await supabase
          .from('service_request')
          .select(`
            id,
            date,
            description,
            statut,
            boat(id, name),
            categorie_service(description1)
          `)
          .eq('id_client', user.id)
          .order('date', { ascending: false });

        if (serviceHistoryError) {
          console.error('Error fetching service history:', serviceHistoryError);
          setError('Échec du chargement de l\'historique des services.');
          return;
        }

        const formattedServiceHistory: ServiceHistory[] = serviceHistoryData.map((req: any) => ({
          id: req.id.toString(),
          date: req.date,
          type: req.categorie_service?.description1 || 'N/A',
          description: req.description,
          status: req.statut || 'completed', // Assurez-vous que 'statut' est un des types définis
          boat: {
            id: req.boat.id.toString(),
            name: req.boat.name,
          },
        }));
        setServiceHistory(formattedServiceHistory);

        // Fetch reviews left by the user
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            service_request (
              id_client,
              id_boat_manager (id, first_name, last_name, avatar, rating, review_count),
              id_companie (id, company_name, avatar, rating, review_count)
            )
          `)
          .eq('service_request.id_client', user.id)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          console.error('Error fetching user reviews:', reviewsError);
          setError('Échec du chargement de vos avis.');
          return;
        }

        const formattedReviews: Review[] = reviewsData
          .filter(review => review.service_request)
          .map(review => {
            const sr = review.service_request;
            let reviewedEntity: Review['reviewedEntity'];

            if (sr.id_boat_manager) {
              reviewedEntity = {
                id: sr.id_boat_manager.id.toString(),
                name: `${sr.id_boat_manager.first_name} ${sr.id_boat_manager.last_name}`,
                avatar: sr.id_boat_manager.avatar || avatars.neutral,
                type: 'boat_manager',
                entityRating: sr.id_boat_manager.rating,
                entityReviewCount: sr.id_boat_manager.review_count,
              };
            } else if (sr.id_companie) {
              reviewedEntity = {
                id: sr.id_companie.id.toString(),
                name: sr.id_companie.company_name,
                avatar: sr.id_companie.avatar || 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop', // Default for company
                type: 'nautical_company',
                entityRating: sr.id_companie.rating,
                entityReviewCount: sr.id_companie.review_count,
              };
            } else {
              reviewedEntity = {
                id: 'unknown',
                name: 'Inconnu',
                avatar: avatars.neutral,
                type: 'boat_manager',
              };
            }

            return {
              id: review.id.toString(),
              rating: review.rating,
              comment: review.comment,
              createdAt: review.created_at,
              reviewedEntity: reviewedEntity,
            };
          });
        setMyReviews(formattedReviews);

        // Fetch main Boat Manager details
        const { data: userPorts, error: userPortsError } = await supabase
          .from('user_ports')
          .select('port_id')
          .eq('user_id', user.id)
          .limit(1);

        if (userPortsError) {
          console.error('Error fetching user ports:', userPortsError);
        }

        if (userPorts && userPorts.length > 0) {
          const primaryPortId = userPorts[0].port_id;
          const { data: bmPortAssignments, error: bmPortAssignmentsError } = await supabase
            .from('user_ports')
            .select('user_id')
            .eq('port_id', primaryPortId);

          if (bmPortAssignmentsError) {
            console.error('Error fetching BM port assignments:', bmPortAssignmentsError);
          }

          if (bmPortAssignments && bmPortAssignments.length > 0) {
            const bmIds = bmPortAssignments.map(pa => pa.user_id);
            const { data: bmData, error: bmError } = await supabase
              .from('users')
              .select('id, first_name, last_name, e_mail, phone, avatar, rating, review_count, user_ports(ports(name))')
              .in('id', bmIds)
              .eq('profile', 'boat_manager')
              .limit(1);

            if (bmError) {
              console.error('Error fetching main boat manager:', bmError);
            }

            if (bmData && bmData.length > 0) {
              const bm = bmData[0];
              const bmPortName = bm.user_ports && bm.user_ports.length > 0 ? bm.user_ports[0].ports.name : 'N/A';
              setMainBoatManager({
                id: bm.id.toString(),
                name: `${bm.first_name} ${bm.last_name}`,
                email: bm.e_mail,
                phone: bm.phone,
                avatar: bm.avatar || avatars.neutral,
                location: bmPortName,
                rating: bm.rating,
                reviewCount: bm.review_count,
              });
            }
          }
        }

      } catch (e) {
        console.error('Unexpected error fetching profile data:', e);
        setError('Une erreur inattendue est survenue lors du chargement du profil.');
      } finally {
        setLoading(false);
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

    if (!result.canceled && user?.id) {
      const uri = result.assets[0].uri;
      const fileName = `avatar_${user.id}_${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars') // Assuming you have an 'avatars' bucket
        .upload(fileName, blob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error uploading avatar:', uploadError);
        Alert.alert('Erreur', `Échec du téléchargement de l'avatar: ${uploadError.message}`);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
      const newAvatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar: newAvatarUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user avatar URL:', updateError);
        Alert.alert('Erreur', `Échec de la mise à jour de l'URL de l'avatar: ${updateError.message}`);
      } else {
        setLocalAvatar(newAvatarUrl);
        Alert.alert('Succès', 'Photo de profil mise à jour.');
      }
    }
    setShowPhotoModal(false);
  };

  const handleDeletePhoto = async () => {
    if (!user?.id || localAvatar === avatars.neutral) {
      Alert.alert('Info', 'Aucune photo personnalisée à supprimer.');
      return;
    }

    const fileName = localAvatar.split('/').pop();

    if (fileName) {
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([fileName]);

      if (deleteError) {
        console.error('Error deleting avatar from storage:', deleteError);
        Alert.alert('Erreur', `Échec de la suppression de l'avatar du stockage: ${deleteError.message}`);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar: avatars.neutral })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user avatar URL to default:', updateError);
      Alert.alert('Erreur', `Échec de la mise à jour de l'URL de l'avatar par défaut: ${updateError.message}`);
    } else {
      setLocalAvatar(avatars.neutral);
      Alert.alert('Succès', 'Photo de profil supprimée.');
    }
    setShowPhotoModal(false);
  };

  const handleSelectAvatar = async (type: keyof typeof avatars) => {
    const newAvatarUrl = avatars[type];
    if (!user?.id) return;

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar: newAvatarUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user avatar URL:', updateError);
      Alert.alert('Erreur', `Échec de la mise à jour de l'URL de l'avatar: ${updateError.message}`);
    } else {
      setLocalAvatar(newAvatarUrl);
      Alert.alert('Succès', 'Avatar mis à jour.');
    }
    setShowAvatarModal(false);
    setShowPhotoModal(false);
  };

  const handleEditProfile = () => {
    setFormData({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
    });
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
        first_name: formData.firstName,
        last_name: formData.lastName,
        e_mail: formData.email,
        phone: formData.phone,
        avatar: localAvatar,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erreur', `Impossible de mettre à jour le profil: ${error.message}`);
    } else {
      setProfileData(prev => ({
        ...prev,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
      }));
      setShowEditModal(false);
      Alert.alert('Succès', 'Votre profil a été mis à jour avec succès.');
    }
  };

  const handleAddCertification = () => {
    // This function is not used for Pleasure Boaters' profile editing
    // but kept for consistency if the modal is reused.
    if (newCertification.trim()) {
      setFormData(prev => ({
        ...prev,
        certifications: prev.certifications ? `${prev.certifications}, ${newCertification}` : newCertification,
      }));
      //setNewCertification('');
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

  if (error) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const displayedBoats = showAllBoats ? boats : boats.slice(0, 5);
  const displayedHistory = showAllHistory ? serviceHistory : serviceHistory.slice(0, 5);
  const displayedReviews = showAllReviews ? myReviews : myReviews.slice(0, 5);

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={{ uri: localAvatar }}
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
              ? formatDate(user.createdAt)
              : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Boat Manager Section */}
      {mainBoatManager && (
        <View style={styles.boatManagerSection}>
          <Text style={styles.sectionTitle}>Votre Boat Manager</Text>
          <View style={styles.boatManagerCard}>
            <View style={styles.boatManagerHeader}>
              <Image source={{ uri: mainBoatManager.avatar }} style={styles.boatManagerAvatar} />
              <View style={styles.boatManagerInfo}>
                <Text style={styles.boatManagerName}>{mainBoatManager.name}</Text>
                <View style={styles.ratingContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      fill={star <= Math.floor(mainBoatManager.rating || 0) ? '#FFC107' : 'none'}
                      color={star <= Math.floor(mainBoatManager.rating || 0) ? '#FFC107' : '#D1D5DB'}
                    />
                  ))}
                  <Text style={styles.ratingText}>{mainBoatManager.rating?.toFixed(1)} ({mainBoatManager.reviewCount} avis)</Text>
                </View>
                <Text style={styles.boatManagerLocation}>{mainBoatManager.location}</Text>
              </View>
            </View>
            <View style={styles.boatManagerContactInfo}>
              <View style={styles.contactInfoRow}>
                <Phone size={16} color="#666" />
                <Text style={styles.contactInfoText}>{mainBoatManager.phone}</Text>
              </View>
              <View style={styles.contactInfoRow}>
                <Mail size={16} color="#666" />
                <Text style={styles.contactInfoText}>{mainBoatManager.email}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.contactBoatManagerButton}
              onPress={() => router.push(`/(tabs)/messages?client=${mainBoatManager.id}`)}
            >
              <MessageSquare size={20} color="white" />
              <Text style={styles.contactBoatManagerText}>Contacter mon Boat Manager</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Settings Section (RE-ADDED) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/profile/privacy')}
        >
          <Shield size={20} color="#0066CC" />
          <Text style={styles.settingItemText}>Confidentialité</Text>
          <ChevronRight size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/profile/notifications')}
        >
          <Mail size={20} color="#0066CC" />
          <Text style={styles.settingItemText}>Notifications</Text>
          <ChevronRight size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'boats' && styles.activeTab]}
          onPress={() => setSelectedTab('boats')}
        >
          <Text style={[styles.tabText, selectedTab === 'boats' && styles.activeTabText]}>
            Mes bateaux
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
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'reviews' && styles.activeTab]}
          onPress={() => setSelectedTab('reviews')}
        >
          <Text style={[styles.tabText, selectedTab === 'reviews' && styles.activeTabText]}>
            Mes avis
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {selectedTab === 'boats' ? (
        <View style={styles.boatsContainer}>
          {displayedBoats.length > 0 ? (
            displayedBoats.map((boat) => (
              <View key={boat.id} style={styles.boatCard}>
                <Image source={{ uri: boat.image }} style={styles.boatImage} />
                <View style={styles.boatContent}>
                  <View style={styles.boatHeader}>
                    <View style={styles.boatInfo}>
                      <Text style={styles.boatName}>{boat.name}</Text>
                      <Text style={styles.boatType}>{boat.type}</Text>
                    </View>
                    <View style={[styles.boatStatusBadge, { backgroundColor: `${getBoatStatusColor(boat.status)}15` }]}>
                      <View style={[styles.statusDot, { backgroundColor: getBoatStatusColor(boat.status) }]} />
                      <Text style={[styles.boatStatusText, { color: getBoatStatusColor(boat.status) }]}>
                        {getBoatStatusLabel(boat.status)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.boatDetails}>
                    {boat.lastService && (
                      <View style={styles.boatDetailRow}>
                        <Calendar size={16} color="#666" />
                        <Text style={styles.boatDetailText}>
                          Dernier service : {formatDate(boat.lastService)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={styles.boatButton}
                    onPress={() => router.push(`/boats/${boat.id}`)}
                  >
                    <Text style={styles.boatButtonText}>Voir les détails</Text>
                    <ChevronRight size={20} color="#0066CC" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun bateau enregistré.</Text>
            </View>
          )}
          {boats.length > 5 && (
            <TouchableOpacity 
              style={styles.showMoreButton}
              onPress={() => setShowAllBoats(!showAllBoats)}
            >
              <Text style={styles.showMoreButtonText}>
                {showAllBoats ? 'Voir moins' : 'Voir plus'}
              </Text>
              {showAllBoats ? <ChevronUp size={20} color="#0066CC" /> : <ChevronDown size={20} color="#0066CC" />}
            </TouchableOpacity>
          )}
          {/* Always show "Ajouter un bateau" button */}
          <TouchableOpacity 
            style={styles.addSomethingButton}
            onPress={() => router.push('/boats/new')}
          >
            <Plus size={20} color="white" />
            <Text style={styles.addSomethingButtonText}>Ajouter un bateau</Text>
          </TouchableOpacity>
        </View>
      ) : selectedTab === 'history' ? (
        <View style={styles.historyContainer}>
          {displayedHistory.length > 0 ? (
            displayedHistory.map((service) => (
              <TouchableOpacity 
                key={service.id} 
                style={styles.serviceCard}
                onPress={() => router.push(`/request/${service.id}`)}
              >
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceType}>{service.type}</Text>
                    <Text style={styles.serviceDate}>{formatDate(service.date)}</Text>
                  </View>
                  <View style={[styles.serviceStatusBadge, { backgroundColor: `${getServiceStatusColor(service.status)}15` }]}>
                    <Text style={[styles.serviceStatusText, { color: getServiceStatusColor(service.status) }]}>
                      {getServiceStatusLabel(service.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.serviceDetails}>
                  <View style={styles.serviceBoat}>
                    <Ship size={16} color="#666" />
                    <Text style={styles.serviceBoatName}>{service.boat.name}</Text>
                  </View>
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                </View>

                <View style={styles.serviceFooter}>
                  <Text style={styles.viewDetails}>Voir les détails</Text>
                  <ChevronRight size={20} color="#0066CC" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun historique de service.</Text>
            </View>
          )}
          {serviceHistory.length > 5 && (
            <TouchableOpacity 
              style={styles.showMoreButton}
              onPress={() => setShowAllHistory(!showAllHistory)}
            >
              <Text style={styles.showMoreButtonText}>
                {showAllHistory ? 'Voir moins' : 'Voir plus'}
              </Text>
              {showAllHistory ? <ChevronUp size={20} color="#0066CC" /> : <ChevronDown size={20} color="#0066CC" />}
            </TouchableOpacity>
          )}
          {serviceHistory.length === 0 && (
            <TouchableOpacity 
              style={styles.addSomethingButton}
              onPress={() => router.push('/(tabs)/requests')}
            >
              <Plus size={20} color="white" />
              <Text style={styles.addSomethingButtonText}>Faire une demande</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : ( // Reviews tab
        <View style={styles.reviewsContainer}>
          {myReviews.length > 0 ? (
            myReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image source={{ uri: review.reviewedEntity.avatar }} style={styles.reviewedEntityAvatar} />
                  <View style={styles.reviewedEntityInfo}>
                    <Text style={styles.reviewedEntityName}>{review.reviewedEntity.name}</Text>
                    <Text style={styles.reviewedEntityType}>
                      {review.reviewedEntity.type === 'boat_manager' ? 'Boat Manager' : 'Entreprise du nautisme'}
                    </Text>
                  </View>
                </View>
                <View style={styles.ratingDisplay}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      fill={star <= review.rating ? '#FFC107' : 'none'}
                      color={star <= review.rating ? '#FFC107' : '#D1D5DB'}
                    />
                  ))}
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                <Text style={styles.reviewDate}>Le {formatDate(review.createdAt)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Vous n'avez pas encore laissé d'avis.</Text>
            </View>
          )}
          {myReviews.length > 5 && (
            <TouchableOpacity 
              style={styles.showMoreButton}
              onPress={() => setShowAllReviews(!showAllReviews)}
            >
              <Text style={styles.showMoreButtonText}>
                {showAllReviews ? 'Voir moins' : 'Voir plus'}
              </Text>
              {showAllReviews ? <ChevronUp size={20} color="#0066CC" /> : <ChevronDown size={20} color="#0066CC" />}
            </TouchableOpacity>
          )}
          {myReviews.length === 0 && (
            <TouchableOpacity 
              style={styles.addSomethingButton}
              onPress={() => router.push('/(tabs)/requests')}
            >
              <Plus size={20} color="white" />
              <Text style={styles.addSomethingButtonText}>Laisser un avis</Text>
            </TouchableOpacity>
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
  boatsContainer: {
    padding: 20,
    gap: 20,
  },
  boatCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
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
  boatImage: {
    width: '100%',
    height: 200,
  },
  boatContent: {
    padding: 16,
    gap: 16,
  },
  boatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  boatInfo: {
    flex: 1,
  },
  boatName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  boatType: {
    fontSize: 14,
    color: '#666',
  },
  boatStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  boatStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  boatDetails: {
    gap: 8,
  },
  boatDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatDetailText: {
    fontSize: 14,
    color: '#666',
  },
  boatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  boatButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  historyContainer: {
    padding: 20,
    gap: 16,
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
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
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  serviceInfo: {
    gap: 4,
  },
  serviceType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  serviceDate: {
    fontSize: 14,
    color: '#666',
  },
  serviceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  serviceDetails: {
    padding: 16,
    gap: 8,
  },
  serviceBoat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceBoatName: {
    fontSize: 14,
    color: '#666',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  serviceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  viewDetails: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  reviewsContainer: {
    padding: 20,
    gap: 16,
  },
  reviewCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    gap: 12,
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
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewedEntityAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  reviewedEntityInfo: {
    flex: 1,
  },
  reviewedEntityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewedEntityType: {
    fontSize: 14,
    color: '#666',
  },
  ratingDisplay: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
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
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  addSomethingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  addSomethingButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  boatManagerSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 16,
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
  boatManagerCard: {
    gap: 16,
  },
  boatManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  boatManagerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  boatManagerInfo: {
    flex: 1,
  },
  boatManagerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  boatManagerLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  boatManagerContactInfo: {
    gap: 8,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactInfoText: {
    fontSize: 14,
    color: '#666',
  },
  contactBoatManagerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  contactBoatManagerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    marginTop: 10,
  },
  showMoreButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
});
