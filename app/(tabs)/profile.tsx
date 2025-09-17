const GENERIC_ERR = "Une erreur est survenue. Veuillez réessayer.";
const GENERIC_LOAD_ERR = "Impossible de charger ces informations. Réessayez plus tard.";

const notifyError = () => {
  if (Platform.OS === 'android') {
    // @ts-ignore
    import('react-native').then(m => m.ToastAndroid?.show(GENERIC_ERR, m.ToastAndroid.LONG));
  } else {
    Alert.alert('Oups', GENERIC_ERR);
  }
};
const notifyInfo = (msg: string) => {
  if (Platform.OS === 'android') {
    // @ts-ignore
    import('react-native').then(m => m.ToastAndroid?.show(msg, m.ToastAndroid.SHORT));
  } else {
    Alert.alert('', msg);
  }
};
const logError = (scope: string, err: unknown) => {
  if (__DEV__) console.error(`[${scope}]`, err);
};







import { useState, useEffect, memo, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, Alert, TextInput, ActivityIndicator } from 'react-native';
import { router, Redirect, Stack } from 'expo-router';
import { Phone, Mail, Calendar, Shield, Ship, Wrench, PenTool as Tool, Gauge, Key, FileText, LogOut, Image as ImageIcon, X, Plus, Pencil, Star, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';




const isHttpUrl = (v?: string) =>
  !!v && (v.startsWith('http://') || v.startsWith('https://'));

// Extrait { bucket, path } d’une URL Supabase (public ou sign)
function extractBucketAndPathFromSupabaseUrl(url: string) {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
  if (!m) return null;
  const [, bucket, path] = m;
  return { bucket, path };
}

const getSignedAvatarUrl = async (value?: string) => {
  if (!value) return '';

  const raw = `${value}`.trim();

  // Si on te passe déjà une URL http(s)
  if (isHttpUrl(raw)) {
    // Si c’est une URL Supabase, on re-signe proprement
    const bp = extractBucketAndPathFromSupabaseUrl(raw);
    if (bp) {
      const { data, error } = await supabase.storage.from(bp.bucket).createSignedUrl(bp.path, 60 * 60);
      if (error || !data?.signedUrl) return '';
      return data.signedUrl;
    }
    // URL externe classique → on la garde telle quelle
    return raw;
  }

  // Sinon c’est un chemin de bucket (ex: "users/1/avatar.jpg")
  const path = raw.replace(/^\/+/, '');
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
};

// Helper to extract path from a public URL
const pathFromPublicUrl = (url: string) => {
  const marker = '/storage/v1/object/public/avatars/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length); // ex: users/<id>/<file>.jpg
};

// Helper to extract path from a signed URL (for boat images)
const pathFromSignedBoatImageUrl = (url: string) => {
  const publicMarker = '/storage/v1/object/public/boat.images/';
  const signedMarker = '/storage/v1/object/sign/boat.images/';

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
  return null;
};

// Helper to get a signed URL for a boat image
const getSignedBoatImageUrl = async (imageDbValue: string) => {
  if (!imageDbValue) return '';

  let rawPath = imageDbValue;

  if (imageDbValue.includes('/storage/v1/object/public/boat.images/')) {
    const publicMarker = '/storage/v1/object/public/boat.images/';
    const publicIdx = imageDbValue.indexOf(publicMarker);
    if (publicIdx !== -1) {
      rawPath = imageDbValue.substring(publicIdx + publicMarker.length);
    } else {
      return imageDbValue;
    }
  } else if (imageDbValue.includes('/storage/v1/object/sign/boat.images/')) {
    const signedMarker = '/storage/v1/object/sign/boat.images/';
    const signedIdx = imageDbValue.indexOf(signedMarker);
    if (signedIdx !== -1) {
      const pathWithToken = imageDbValue.substring(signedIdx + signedMarker.length);
      const tokenIndex = pathWithToken.indexOf('?token=');
      rawPath = tokenIndex !== -1 ? pathWithToken.substring(0, tokenIndex) : pathWithToken;
    } else {
      return imageDbValue;
    }
  }

  const { data, error } = await supabase.storage.from('boat.images').createSignedUrl(rawPath, 60 * 60);
  if (error) {
   logError('boatImage.signUrl', { error, rawPath });
   return '';
  }
  return data?.signedUrl || '';
};

export const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

// Types
interface Service {
  id: string;
  name: string;
  description: string;
  icon: any;
}

interface BoatDetails {
  id: string;
  name: string;
  type: string;
  image: string;
  lastService?: string;
  nextService?: string;
  status: 'active' | 'maintenance' | 'inactive';
}

interface ServiceHistory {
  id: string;
  date: string;
  type: string;
  description: string;
  status: 'completed' | 'in_progress' | 'cancelled' | 'submitted' | 'quote_sent' | 'quote_accepted' | 'scheduled' | 'to_pay' | 'paid';
  boat?: { id: string; name: string };
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

const serviceIconsMap = {
  Entretien: Wrench,
  Amélioration: Tool,
  Contrôle: Gauge,
  Accès: Key,
  Administratif: FileText,
};

// Modals
const EditProfileModal = memo(({ visible, onClose, formData, setFormData, handleSaveProfile }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Modifier mon profil</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Prénom</Text>
            <TextInput
              style={styles.formInput}
              value={formData.firstName}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, firstName: text }))}
              placeholder="Votre prénom"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Nom</Text>
            <TextInput
              style={styles.formInput}
              value={formData.lastName}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, lastName: text }))}
              placeholder="Votre nom"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Email</Text>
            <TextInput
              style={styles.formInput}
              value={formData.email}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, email: text }))}
              placeholder="Votre email"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Téléphone</Text>
            <TextInput
              style={styles.formInput}
              value={formData.phone}
              onChangeText={(text) => setFormData((prev) => ({ ...prev, phone: text }))}
              placeholder="Votre numéro de téléphone"
              keyboardType="phone-pad"
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));

const PhotoModal = memo(({ visible, onClose, onChoosePhoto, onDeletePhoto, hasCustomPhoto }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Photo de profil</Text>

        <TouchableOpacity style={styles.modalOption} onPress={onChoosePhoto}>
          <ImageIcon size={24} color="#0066CC" />
          <Text style={styles.modalOptionText}>Choisir dans la galerie</Text>
        </TouchableOpacity>

        {hasCustomPhoto && (
          <TouchableOpacity style={[styles.modalOption, styles.deleteOption]} onPress={onDeletePhoto}>
            <X size={24} color="#ff4444" />
            <Text style={styles.modalOptionText}>Supprimer la photo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
          <Text style={styles.modalCancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
));

const AvatarModal = memo(({ visible, onClose, onSelectAvatar }) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View />
    </Modal>
  );
});

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  // ✅ Tous les hooks AVANT tout return conditionnel
  const didRetryAvatarRef = useRef(false);

  const [selectedTab, setSelectedTab] = useState<'boats' | 'history' | 'reviews'>('boats');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions(); // ✅ move up

  const [avatarPath, setAvatarPath] = useState<string>(''); // BDD (chemin)
  const [localAvatar, setLocalAvatar] = useState<string>(''); // URL signée pour <Image />

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
  const [associatedBoatManagers, setAssociatedBoatManagers] = useState<BoatManagerProfile[]>([]);

  // États "voir plus"
  const [showAllBoats, setShowAllBoats] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  // Redirection si pas connecté (pas de return avant les hooks)
  useEffect(() => {
    if (!user?.id) {
      router.replace('/(tabs)/welcome-unauthenticated'); // ton écran est app/login.tsx
    }
  }, [user]);

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

  const fetchProfileData = useCallback(async () => {
    // ✅ Garde-fou: si pas d'utilisateur, ne charge rien
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Profil
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('first_name, last_name, e_mail, phone, avatar, created_at')
        .eq('id', user.id)
        .single();

      if (userError) {
        logError('fetchProfile.user', userError);
        setError('error');
        return;
      }

      if (userData) {
        let path = '';
        if (userData.avatar) {
          if (isHttpUrl(userData.avatar)) {
            path = pathFromPublicUrl(userData.avatar) || '';
          } else {
            path = userData.avatar;
          }
        }
        setAvatarPath(path);

        const signed = await getSignedAvatarUrl(path);
        setLocalAvatar(signed || '');

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

      // Bateaux
      const { data: boatsData, error: boatsError } = await supabase
        .from('boat')
        .select('id, name, type, image, etat, annee_construction')
        .eq('id_user', user.id);

      if (boatsError) {
       logError('fetchProfile.boats', boatsError);
        setError('error');
        return;
      }

      const formattedBoats: BoatDetails[] = await Promise.all(
        (boatsData || []).map(async (boat: any) => {
          let imageUrl = '';
          if (boat.image) {
            imageUrl = await getSignedBoatImageUrl(boat.image);
          } else {
            imageUrl =
              'https://images.pexels.com/photos/163236/boat-yacht-marina-dock-163236.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
          }

          return {
            id: boat.id.toString(),
            name: boat.name,
            type: boat.type,
            image: imageUrl,
            status: boat.etat || 'active',
          };
        })
      );

      setBoats(formattedBoats);

      // Historique de services
      const { data: serviceHistoryData, error: serviceHistoryError } = await supabase
        .from('service_request')
        .select(
          `
          id,
          date,
          description,
          statut,
          boat(id, name),
          categorie_service(description1)
        `
        )
        .eq('id_client', user.id)
        .order('date', { ascending: false });

      if (serviceHistoryError) {
        logError('fetchProfile.history', serviceHistoryError);
        setError('error');
        return;
      }

      const formattedServiceHistory: ServiceHistory[] = (serviceHistoryData || []).map((req: any) => ({
        id: req.id.toString(),
        date: req.date,
        type: req.categorie_service?.description1 || 'N/A',
        description: req.description,
        status: req.statut || 'completed',
        boat: req.boat
          ? {
              id: req.boat.id.toString(),
              name: req.boat.name,
            }
          : undefined,
      }));
      setServiceHistory(formattedServiceHistory);

      // Avis
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select(
          `
          id,
          rating,
          comment,
          created_at,
          service_request (
            id_client,
            id_boat_manager (id, first_name, last_name, avatar, rating, review_count),
            id_companie (id, company_name, avatar, rating, review_count)
          )
        `
        )
        .eq('service_request.id_client', user.id)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        logError('fetchProfile.reviews', reviewsError);
        setError('error');
        return;
      }

      const formattedReviews: Review[] = await Promise.all(
        (reviewsData || [])
          .filter((review) => review.service_request)
          .map(async (review) => {
            const sr = review.service_request;
            const isBM = !!sr.id_boat_manager;
            const name = isBM
              ? `${sr.id_boat_manager.first_name} ${sr.id_boat_manager.last_name}`
              : sr.id_companie?.company_name || 'Inconnu';

            const rawAvatar = isBM ? sr.id_boat_manager.avatar : sr.id_companie?.avatar;
            const signed = await getSignedAvatarUrl(rawAvatar);

            const reviewedEntity: Review['reviewedEntity'] = {
              id: (isBM ? sr.id_boat_manager.id : sr.id_companie?.id)?.toString?.() || 'unknown',
              name,
              avatar: signed || DEFAULT_AVATAR,
              type: isBM ? 'boat_manager' : 'nautical_company',
              entityRating: isBM ? sr.id_boat_manager.rating : sr.id_companie?.rating,
              entityReviewCount: isBM ? sr.id_boat_manager.review_count : sr.id_companie?.review_count,
            };

            return {
              id: review.id.toString(),
              rating: review.rating,
              comment: review.comment,
              createdAt: review.created_at,
              reviewedEntity,
            };
          })
      );

      setMyReviews(formattedReviews);

      // Associer les Boat Managers (ports en commun)
      const { data: allUserPorts, error: allPortsError } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', user.id);

      if (allPortsError) {
        console.error('Erreur récupération des ports client :', allPortsError);
        setAssociatedBoatManagers([]);
        return;
      }

      if (!allUserPorts || allUserPorts.length === 0) {
        setAssociatedBoatManagers([]);
        return;
      }

      const portIds = allUserPorts.map((p) => p.port_id);

      const { data: allPortUsers, error: portUsersError } = await supabase
        .from('user_ports')
        .select('user_id, port_id')
        .in('port_id', portIds);

      if (portUsersError) {
        console.error('Erreur récupération des users des ports :', portUsersError);
        setAssociatedBoatManagers([]);
        return;
      }

      const allBmIds = [...new Set((allPortUsers || []).map((pu) => pu.user_id))];

      const { data: allBms, error: bmError } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar, phone, e_mail, rating, review_count, user_ports(port_id, ports(name))')
        .in('id', allBmIds)
        .eq('profile', 'boat_manager');

      if (bmError) {
        console.error('Erreur chargement Boat Managers :', bmError);
        setAssociatedBoatManagers([]);
        return;
      }

      if (!allBms || allBms.length === 0) {
        setAssociatedBoatManagers([]);
        return;
      }

      const associatedBMsWithLocation = await Promise.all(
        (allBms ?? []).map(async (bm) => {
          const { data: bmPortLink } = await supabase
            .from('user_ports')
            .select('port_id')
            .eq('user_id', bm.id)
            .order('port_id', { ascending: true })
            .limit(1);

          let portName = 'Port inconnu';
          if (bmPortLink && bmPortLink.length > 0) {
            const { data: portData } = await supabase.from('ports').select('name').eq('id', bmPortLink[0].port_id).single();
            if (portData?.name) portName = portData.name;
          }

          const signed = await getSignedAvatarUrl(bm.avatar);

          return {
            id: bm.id.toString(),
            name: `${bm.first_name} ${bm.last_name}`,
            email: bm.e_mail,
            phone: bm.phone,
            avatar: signed || DEFAULT_AVATAR,
            rating: bm.rating,
            reviewCount: bm.review_count,
            location: portName,
          };
        })
      );

      setAssociatedBoatManagers(associatedBMsWithLocation);
    } catch (e) {
      logError('fetchProfile.unexpected', e);
      setError('error');
    } finally {
      setLoading(false);
    }
  }, [user]); // Dependency on 'user'

  // Use useFocusEffect to re-fetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
      // No cleanup needed for this effect, as it's just fetching data
    }, [fetchProfileData]) // Dependency on the memoized fetch function
  );

  // ✅ Pas de navigation ici, l'effet ci-dessus s’en charge
  const handleLogout = () => {
    logout();
  };

  // --- helpers upload avatar ---
  const handleChoosePhoto = async () => {
    try {
      if (!mediaPermission?.granted) {
        const p = await requestMediaPermission();
        if (!p.granted) {
          Alert.alert('Permission requise', 'Autorisez l’accès à la galerie.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        // @ts-ignore compat
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled || !user?.id) {
        setShowPhotoModal(false);
        return;
      }

      const asset = result.assets[0];

      const manipulated = await ImageManipulator.manipulateAsync(asset.uri, [], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      });
      if (!manipulated.base64) {
        notifyError();
        return;
      }

      const bytes = Buffer.from(manipulated.base64, 'base64');
      const path = `users/${user.id}/avatar.jpg`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('users').update({ avatar: path }).eq('id', user.id);
      if (dbErr) throw dbErr;

      setAvatarPath(path);

      const { data: signedData, error: signedErr } = await supabase.storage.from('avatars').createSignedUrl(path, 60 * 60);
      if (signedErr || !signedData?.signedUrl) throw signedErr || new Error('Signed URL manquante');

      setLocalAvatar(signedData.signedUrl);
      Alert.alert('Succès', 'Photo de profil mise à jour.');
    } catch (e: any) {
      logError('avatar.upload', e);
      notifyError();
} finally {
      setShowPhotoModal(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié.');
      return;
    }

    const path = `users/${user.id}/avatar.jpg`;

    await supabase.storage.from('avatars').remove([path]).catch(() => {});
    const { error: updateError } = await supabase.from('users').update({ avatar: '' }).eq('id', user.id);

    if (updateError) {
     logError('avatar.clear', updateError);
  notifyError();
  return;
    }
    setAvatarPath('');
    setLocalAvatar(DEFAULT_AVATAR);
    Alert.alert('Succès', 'Photo de profil supprimée.');
  }

  const handleBoatImageError = useCallback(async (boatId: string, currentImageUrl: string) => {
    if (__DEV__) console.log(`Erreur de chargement pour le bateau ${boatId}...`);
    const imagePath = pathFromSignedBoatImageUrl(currentImageUrl);
    if (imagePath) {
      const newSignedUrl = await getSignedBoatImageUrl(imagePath);
      if (newSignedUrl && newSignedUrl !== currentImageUrl) {
        setBoats((prevBoats) => prevBoats.map((b) => (b.id === boatId ? { ...b, image: newSignedUrl } : b)));
        console.log(`URL du bateau ${boatId} mise à jour.`);
      } else {
        console.log(`Impossible de re-générer une nouvelle URL pour le bateau ${boatId}.`);
      }
    } else {
      console.log(`L'URL du bateau ${boatId} n'est pas une URL signée valide.`);
    }
  }, []);

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
        avatar: avatarPath || '',
      })
      .eq('id', user.id);

    if (error) {
      logError('profile.update', error);
  notifyError();
} else {
      setProfileData((prev) => ({
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

  // ✅ Rendu de fallback en cas de redirection
  if (!user?.id) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Redirection vers la page de connexion…</Text>
      </View>
    </SafeAreaView>
  );
}

  if (loading) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    </SafeAreaView>
  );
}

 if (error) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={[styles.container, styles.loadingContainer]}>
        {/* on masque le détail technique */}
        <Text style={styles.errorText}>{GENERIC_LOAD_ERR}</Text>
      </View>
    </SafeAreaView>
  );
}

  const displayedBoats = showAllBoats ? boats : boats.slice(0, 5);
  const displayedHistory = showAllHistory ? serviceHistory : serviceHistory.slice(0, 5);
  const displayedReviews = showAllReviews ? myReviews : myReviews.slice(0, 5);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
    <Stack.Screen options={{ headerShown: false }} />
    <StatusBar style="dark" backgroundColor="#fff" />

    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image
            key={localAvatar}
            source={{ uri: localAvatar && localAvatar.trim() !== '' ? localAvatar : DEFAULT_AVATAR }}
            style={styles.avatar}
            onError={async () => {
              if (didRetryAvatarRef.current) {
                setLocalAvatar('');
                return;
              }
              didRetryAvatarRef.current = true;

              if (avatarPath) {
                const u = await getSignedAvatarUrl(avatarPath);
                setLocalAvatar(u || '');
              } else {
                setLocalAvatar('');
              }
            }}
          />
          <TouchableOpacity style={styles.editPhotoButton} onPress={() => setShowPhotoModal(true)}>
            <Pencil size={16} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
          <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
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
            {user?.createdAt && !isNaN(new Date(user.createdAt).getTime()) ? formatDate(user.createdAt) : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Section : Vos Boat Managers */}
      {associatedBoatManagers.length > 0 && (
        <View style={styles.boatManagerSection}>
          <Text style={styles.sectionTitle}>Vos Boat Managers</Text>
          {associatedBoatManagers.map((bm) => (
            <TouchableOpacity key={bm.id} style={styles.boatManagerCard} onPress={() => router.push(`/boat-manager/${bm.id}`)}>
              <View style={styles.boatManagerHeader}>
                <Image
                  source={{ uri: bm.avatar || DEFAULT_AVATAR }}
                  style={styles.boatManagerAvatar}
                  onError={() => {
                    if (bm.avatar !== DEFAULT_AVATAR) {
                      setAssociatedBoatManagers((prev) =>
                        prev.map((m) => (m.id === bm.id ? { ...m, avatar: DEFAULT_AVATAR } : m))
                      );
                    }
                  }}
                />
                <View style={styles.boatManagerInfo}>
                  <Text style={styles.boatManagerName}>{bm.name}</Text>
                  <View style={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        fill={star <= Math.floor(bm.rating || 0) ? '#FFC107' : 'none'}
                        color={star <= Math.floor(bm.rating || 0) ? '#FFC107' : '#D1D5DB'}
                      />
                    ))}
                    <Text style={styles.ratingText}>
                      {bm.rating ? `${bm.rating.toFixed(1)} (${bm.reviewCount} avis)` : 'N/A'}
                    </Text>
                  </View>
                  <Text style={styles.boatManagerLocation}>{bm.location}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, selectedTab === 'boats' && styles.activeTab]} onPress={() => setSelectedTab('boats')}>
          <Text style={[styles.tabText, selectedTab === 'boats' && styles.activeTabText]}>Mes bateaux</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, selectedTab === 'history' && styles.activeTab]} onPress={() => setSelectedTab('history')}>
          <Text style={[styles.tabText, selectedTab === 'history' && styles.activeTabText]}>Historique</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, selectedTab === 'reviews' && styles.activeTab]} onPress={() => setSelectedTab('reviews')}>
          <Text style={[styles.tabText, selectedTab === 'reviews' && styles.activeTabText]}>Mes avis</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {selectedTab === 'boats' ? (
        <View style={styles.boatsContainer}>
          <View style={styles.boatsHeader}>
            <Text style={styles.sectionTitle}>Mes bateaux</Text>
            <TouchableOpacity style={styles.addBoatButton} onPress={() => router.push('/boats/new')}>
              <Plus size={20} color="white" />
              <Text style={styles.addBoatButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
          {displayedBoats.length > 0 ? (
            displayedBoats.map((boat) => (
              <TouchableOpacity key={boat.id} style={styles.boatCard} activeOpacity={0.86} onPress={() => router.push(`/boats/${boat.id}`)}>
                <Image
                  key={boat.image}
                  source={{ uri: boat.image }}
                  style={styles.boatImage}
                  onError={({ nativeEvent: { error: imgError } }) => {
                    console.log(`Error loading boat image for boat ${boat.id}:`, imgError);
                    handleBoatImageError(boat.id, boat.image);
                  }}
                />
                <View style={styles.boatContent}>
                  <View style={styles.boatHeader}>
                    <View style={styles.boatInfo}>
                      <Text style={styles.boatName}>{boat.name}</Text>
                      <Text style={styles.boatType}>{boat.type}</Text>
                    </View>
                  </View>

                  <View style={styles.boatDetails} />
                  <View style={styles.boatButton}>
                    <Text style={styles.boatButtonText}>Voir les détails</Text>
                    <ChevronRight size={20} color="#0066CC" />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun bateau enregistré.</Text>
            </View>
          )}
          {boats.length > 5 && (
            <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAllBoats(!showAllBoats)}>
              <Text style={styles.showMoreButtonText}>{showAllBoats ? 'Voir moins' : 'Voir plus'}</Text>
              {showAllBoats ? <ChevronUp size={20} color="#0066CC" /> : <ChevronDown size={20} color="#0066CC" />}
            </TouchableOpacity>
          )}
        </View>
      ) : selectedTab === 'history' ? (
        <View style={styles.historyContainer}>
          {displayedHistory.length > 0 ? (
            displayedHistory.map((service) => (
              <TouchableOpacity key={service.id} style={styles.serviceCard} onPress={() => router.push(`/request/${service.id}`)}>
                <View style={styles.serviceHeader}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceType}>{service.type}</Text>
                    <Text style={styles.serviceDate}>{formatDate(service.date)}</Text>
                  </View>
                  <View style={[styles.serviceStatusBadge, { backgroundColor: `${getServiceStatusColor(service.status)}15` }]}>
                    <Text style={[styles.serviceStatusText, { color: getServiceStatusColor(service.status) }]}>{getServiceStatusLabel(service.status)}</Text>
                  </View>
                </View>

                <View style={styles.serviceDetails}>
                  {service.boat && (
                    <View style={styles.serviceBoat}>
                      <Ship size={16} color="#666" />
                      <Text style={styles.serviceBoatName}>{service.boat.name}</Text>
                    </View>
                  )}
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
            <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAllHistory(!showAllHistory)}>
              <Text style={styles.showMoreButtonText}>{showAllHistory ? 'Voir moins' : 'Voir plus'}</Text>
              {showAllHistory ? <ChevronUp size={20} color="#0066CC" /> : <ChevronDown size={20} color="#0066CC" />}
            </TouchableOpacity>
          )}
          {serviceHistory.length === 0 && (
            <TouchableOpacity style={styles.addSomethingButton} onPress={() => router.push('/(tabs)/requests')}>
              <Plus size={20} color="white" />
              <Text style={styles.addSomethingButtonText}>Faire une demande</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.reviewsContainer}>
          {myReviews.length > 0 ? (
            myReviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image
                    source={{
                      uri:
                        review.reviewedEntity.avatar && review.reviewedEntity.avatar.trim() !== ''
                          ? review.reviewedEntity.avatar
                          : DEFAULT_AVATAR,
                    }}
                    style={styles.reviewedEntityAvatar}
                    onError={() => {
                      setMyReviews((prev) =>
                        prev.map((r) =>
                          r.id === review.id ? { ...r, reviewedEntity: { ...r.reviewedEntity, avatar: DEFAULT_AVATAR } } : r
                        )
                      );
                    }}
                  />
                  <View style={styles.reviewedEntityInfo}>
                    <Text style={styles.reviewedEntityName}>{review.reviewedEntity.name}</Text>
                    <Text style={styles.reviewedEntityType}>
                      {review.reviewedEntity.type === 'boat_manager' ? 'Boat Manager' : 'Entreprise du nautisme'}
                    </Text>
                  </View>
                </View>
                <View style={styles.ratingDisplay}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={16} fill={star <= review.rating ? '#FFC107' : 'none'} color={star <= review.rating ? '#FFC107' : '#D1D5DB'} />
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
            <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAllReviews(!showAllReviews)}>
              <Text style={styles.showMoreButtonText}>{showAllReviews ? 'Voir moins' : 'Voir plus'}</Text>
              {showAllReviews ? <ChevronUp size={20} color="#0066CC" /> : <ChevronDown size={20} color="#0066CC" />}
            </TouchableOpacity>
          )}
          {myReviews.length === 0 && (
            <TouchableOpacity style={styles.addSomethingButton} onPress={() => router.push('/(tabs)/requests')}>
              <Plus size={20} color="white" />
              <Text style={styles.addSomethingButtonText}>Laisser un avis</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Paramètres + Logout */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Paramètres</Text>
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/profile/privacy')}>
          <Shield size={20} color="#0066CC" />
          <Text style={styles.settingItemText}>Confidentialité</Text>
          <ChevronRight size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/profile/notifications')}>
          <Mail size={20} color="#0066CC" />
          <Text style={styles.settingItemText}>Notifications</Text>
          <ChevronRight size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color="#ff4444" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>

      <EditProfileModal visible={showEditModal} onClose={() => setShowEditModal(false)} formData={formData} setFormData={setFormData} handleSaveProfile={handleSaveProfile} />
      <PhotoModal visible={showPhotoModal} onClose={() => setShowPhotoModal(false)} onChoosePhoto={handleChoosePhoto} onDeletePhoto={handleDeletePhoto} hasCustomPhoto={Boolean(avatarPath)} />
    </ScrollView>
     </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666', marginTop: 10 },
  errorText: { fontSize: 16, color: '#ff4444' },
  header: {
    backgroundColor: 'white',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileImageContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
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
  profileInfo: { alignItems: 'center' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 4 },
  title: { fontSize: 16, color: '#666', marginBottom: 12 },
  editProfileButton: { backgroundColor: '#f0f7ff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  editProfileText: { color: '#0066CC', fontWeight: '500' },
  section: { backgroundColor: 'white', padding: 20, marginTop: 16, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  bioText: { fontSize: 16, color: '#666', lineHeight: 24 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 16, color: '#1a1a1a' },
  experienceItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  experienceLabel: { fontSize: 14, color: '#666' },
  experienceValue: { fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  tabs: { flexDirection: 'row', backgroundColor: 'white', marginTop: 16 },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#0066CC' },
  tabText: { fontSize: 16, color: '#666' },
  activeTabText: { color: '#0066CC', fontWeight: '600' },
  boatsContainer: { padding: 20, gap: 20 },
  boatsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  addBoatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 0, paddingHorizontal: 0, borderRadius: 0 },
  addBoatButtonText: { color: '#0066CC', fontSize: 16, fontWeight: '600' },
  boatCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
    }),
  },
  boatImage: { width: '100%', aspectRatio: 16 / 9, resizeMode: 'cover' },
  boatContent: { padding: 16, gap: 8 },
  boatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  boatInfo: { flex: 1 },
  boatName: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  boatType: { fontSize: 14, color: '#666' },
  boatStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  boatStatusText: { fontSize: 12, fontWeight: '500' },
  boatDetails: { gap: 8 },
  boatDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boatDetailText: { fontSize: 14, color: '#666' },
  boatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  boatButtonText: { fontSize: 14, color: '#0066CC', fontWeight: '500' },
  historyContainer: { padding: 20, gap: 16 },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
    }),
  },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  serviceInfo: { gap: 4 },
  serviceType: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  serviceDate: { fontSize: 14, color: '#666' },
  serviceStatusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  serviceStatusText: { fontSize: 12, fontWeight: '500' },
  serviceDetails: { padding: 16, gap: 8 },
  serviceBoat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceBoatName: { fontSize: 14, color: '#666' },
  serviceDescription: { fontSize: 14, color: '#1a1a1a', lineHeight: 20 },
  serviceFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  viewDetails: { fontSize: 14, color: '#0066CC', fontWeight: '500' },
  reviewsContainer: { padding: 20, gap: 16 },
  reviewCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
    }),
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewedEntityAvatar: { width: 48, height: 48, borderRadius: 24 },
  reviewedEntityInfo: { flex: 1 },
  reviewedEntityName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  reviewedEntityType: { fontSize: 14, color: '#666' },
  ratingDisplay: { flexDirection: 'row', gap: 2 },
  reviewComment: { fontSize: 14, color: '#1a1a1a', lineHeight: 20 },
  reviewDate: { fontSize: 12, color: '#94a3b8', textAlign: 'right' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, margin: 20, backgroundColor: '#fff5f5', borderRadius: 12 },
  logoutText: { fontSize: 16, color: '#ff4444', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' },
    }),
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 16, padding: 16 },
  closeButton: { padding: 4 },
  modalBody: { padding: 16, maxHeight: 400 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 14, fontWeight: '500', color: '#1a1a1a', marginBottom: 8 },
  formInput: { backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, fontSize: 16, color: '#1a1a1a' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  helperText: { fontSize: 12, color: '#666', marginTop: 4, marginLeft: 4 },
  addCertificationContainer: { flexDirection: 'row', marginTop: 8, gap: 8 },
  addCertificationInput: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, fontSize: 16, color: '#1a1a1a' },
  addCertificationButton: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#0066CC', justifyContent: 'center', alignItems: 'center' },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 12 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelButtonText: { fontSize: 16, color: '#666', fontWeight: '500' },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0066CC',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#0066CC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)' },
    }),
  },
  saveButtonText: { fontSize: 16, color: 'white', fontWeight: '500' },
  modalOption: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 12, marginBottom: 12 },
  modalOptionText: { fontSize: 16, color: '#1a1a1a' },
  deleteOption: { backgroundColor: '#fff5f5' },
  deleteOptionText: { fontSize: 16, color: '#ff4444' },
  modalCancelButton: { padding: 16, alignItems: 'center', marginTop: 8 },
  modalCancelText: { fontSize: 16, color: '#ff4444', fontWeight: '600' },
  avatarOption: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 12, marginBottom: 12 },
  avatarPreview: { width: 48, height: 48, borderRadius: 24 },
  avatarOptionText: { fontSize: 16, color: '#1a1a1a', flex: 1 },
  emptyState: { padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: 12, gap: 12 },
  emptyStateText: { fontSize: 16, color: '#666', textAlign: 'center' },
  addSomethingButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0066CC', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, marginTop: 10 },
  addSomethingButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  boatManagerSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
    }),
  },
  boatManagerCard: { gap: 16, marginBottom: 16 },
  boatManagerHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  boatManagerAvatar: { width: 60, height: 60, borderRadius: 30 },
  boatManagerInfo: { flex: 1 },
  boatManagerName: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 14, color: '#666' },
  boatManagerLocation: { fontSize: 14, color: '#666', marginTop: 4 },
  boatManagerContactInfo: { gap: 8 },
  contactInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactInfoText: { fontSize: 14, color: '#666' },
  contactBoatManagerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0066CC', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, marginTop: 10 },
  contactBoatManagerText: { color: 'white', fontSize: 14, fontWeight: '600' },
  showMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, backgroundColor: '#f0f7ff', borderRadius: 12, marginTop: 10 },
  showMoreButtonText: { fontSize: 16, color: '#0066CC', fontWeight: '600' },
  settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  settingItemText: { flex: 1, fontSize: 16, color: '#1a1a1a' },
  otherBoatManagersSection: {
    marginTop: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
    }),
  },
  otherBMCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  otherBMAvatar: { width: 48, height: 48, borderRadius: 24 },
  otherBMInfo: { flex: 1 },
  otherBMName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  otherBMLocation: { fontSize: 14, color: '#666' },
  otherBMContactButton: { padding: 8 },
});
