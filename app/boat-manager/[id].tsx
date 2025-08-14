import { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, MapPin, Phone, Mail, Clock, Shield, Award, Briefcase, Ship, X, Wrench, PenTool as Tool, Gauge, Key, FileText, LogOut, Image as ImageIcon, } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

interface Review {
  id: string;
  author: string; // Derived from user's first_name, last_name
  rating: number;
  comment: string;
  date: string; // created_at
}

interface Service {
  id: string;
  name: string; // categorie_service.description1
  description: string; // categorie_service.description2
  icon: any; // Icons are still hardcoded as they are UI components
}

interface BoatManagerProfileData {
  id: string;
  name: string;
  title: string;
  location: string;
  rating?: number;
  reviewCount?: number;
  experience: string;
  certifications: string[];
  avatar: string;
  cover: string; // Assuming a default cover or fetched from somewhere
  phone: string;
  email: string;
  bio: string;
}

// Définition de l'avatar par défaut
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

// Fonctions utilitaires pour les URLs d'avatars
const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getSignedAvatarUrl = async (value?: string) => {
  if (!value) return '';
  // Si on a déjà une URL (signée ou publique), on la renvoie
  if (isHttpUrl(value)) return value;

  // Sinon value est un chemin du bucket (ex: "users/<id>/avatar.jpg")
  const { data, error } = await supabase
    .storage
    .from('avatars')
    .createSignedUrl(value, 60 * 60); // 1h de validité

  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
};

// Hardcoded service icons (map to fetched service names)
const serviceIconsMap = {
  'Maintenance': Wrench,
  'Amélioration': Tool,
  'Contrôle': Gauge,
  'Accès': Key,
  'Administratif': FileText,
  // Add other service types and their icons as needed
};

// Extracted and Memoized RatingModal component
const RatingModal = memo(({
  visible,
  onClose,
  rating,
  setRating,
  comment,
  setComment,
  onSubmit, // This will be handleSubmitRating from parent
  boatManagerName, // Pass only necessary data, not the whole object
  userFirstName,
  userLastName
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
            <Text style={styles.modalTitle}>Évaluer {boatManagerName}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.ratingServiceInfo}>
            <Text style={styles.ratingServiceTitle}>Boat Manager</Text>
            <Text style={styles.ratingServiceDescription}>
              Partagez votre expérience avec {boatManagerName}
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
            <Text style={styles.commentLabel}>Commentaire (optionnel)</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Partagez votre expérience..."
              multiline
              numberOfLines={4}
              textAlignVertical="top" // Ensure text starts from top
            />
          </View>

          <View style={styles.ratingActions}>
            <TouchableOpacity
              style={styles.ratingCancelButton}
              onPress={onClose}
            >
              <Text style={styles.ratingCancelText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.ratingSubmitButton,
                rating === 0 && styles.ratingSubmitButtonDisabled
              ]}
              onPress={onSubmit}
              disabled={rating === 0}
            >
              <Text style={styles.ratingSubmitText}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default function BoatManagerProfileScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'services' | 'reviews'>('services');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const [boatManager, setBoatManager] = useState<BoatManagerProfileData | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBoatManagerData = async () => {
      if (!id || typeof id !== 'string') {
        setError('ID du Boat Manager manquant.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch Boat Manager details
        const { data: bmData, error: bmError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            e_mail,
            phone,
            avatar,
            job_title,
            experience,
            certification,
            bio,
            rating,
            review_count,
            user_ports(ports(name))
          `)
          .eq('id', id)
          .eq('profile', 'boat_manager')
          .single();

        if (bmError || !bmData) {
          console.error('Error fetching Boat Manager:', bmError);
          setError('Boat Manager non trouvé.');
          setLoading(false);
          return;
        }

        const bmPortName = bmData.user_ports?.[0]?.ports?.name || 'N/A';
        const signedAvatarUrl = await getSignedAvatarUrl(bmData.avatar); // Get signed URL for avatar

        setBoatManager({
          id: bmData.id.toString(),
          name: `${bmData.first_name} ${bmData.last_name}`,
          title: bmData.job_title || 'Boat Manager',
          location: bmPortName,
          rating: bmData.rating,
          reviewCount: bmData.review_count,
          experience: bmData.experience || 'Non renseignée',
          certifications: bmData.certification || [],
          avatar: signedAvatarUrl || DEFAULT_AVATAR, // Use the signed URL or default
          cover: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop', // Default cover
          phone: bmData.phone || 'N/A',
          email: bmData.e_mail || 'N/A',
          bio: bmData.bio || 'Aucune biographie renseignée.',
        });

        // Fetch services offered by this Boat Manager
        const { data: bmServicesData, error: bmServicesError } = await supabase
          .from('user_categorie_service')
          .select('categorie_service(id, description1, description2)')
          .eq('user_id', id);

        if (bmServicesError) {
          console.error('Error fetching BM services:', bmServicesError);
        } else {
          setServices(bmServicesData.map(s => ({
            id: s.categorie_service.id.toString(),
            name: s.categorie_service.description1,
            description: s.categorie_service.description2 || '',
            icon: serviceIconsMap[s.categorie_service.description1] || Ship,
          })));
        }

        // Fetch reviews for this Boat Manager
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            service_request (
              id_client (first_name, last_name)
            )
          `)
          .eq('service_request.id_boat_manager', id)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          console.error('Error fetching reviews:', reviewsError);
        } else {
          // Filter out reviews where service_request or id_client is null
          const filteredAndFormattedReviews = reviewsData
            .filter(r => r.service_request && r.service_request.id_client)
            .map(r => ({
              id: r.id.toString(),
              rating: r.rating,
              comment: r.comment,
              date: new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
              author: `${r.service_request.id_client.first_name} ${r.service_request.id_client.last_name}`,
            }));
          setReviews(filteredAndFormattedReviews);
        }

      } catch (e) {
        console.error('Unexpected error:', e);
        setError('Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
    };

    fetchBoatManagerData();
  }, [id]);

  const handleContact = () => {
    router.push(`/(tabs)/messages?client=${id}`);
  };

  const handleSubmitRating = useCallback(async () => {
    if (rating === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner une note.');
      return;
    }
    if (!user?.id || !id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié ou Boat Manager non défini.');
      return;
    }

    try {
      const { data, error: insertError } = await supabase
        .from('user_reviews') // Targeting the user_reviews table
        .insert({
          reviewer_id: user.id, // ID of the logged-in user
          reviewed_user_id: id, // ID of the Boat Manager being reviewed
          rating: rating,
          comment: comment,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting review:', insertError);
        Alert.alert('Erreur', `Échec de l'envoi de l'avis: ${insertError.message}`);
      } else {
        // Update local reviews state
        setReviews(prev => [
          {
            id: data.id.toString(),
            author: `${user.firstName} ${user.lastName}`,
            rating: rating,
            comment: comment,
            date: new Date(data.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
          },
          ...prev,
        ]);

        // Optionally, update BM's average rating and review count in 'users' table
        const { data: currentBmStats, error: fetchStatsError } = await supabase
          .from('users')
          .select('rating, review_count')
          .eq('id', id)
          .single();

        if (!fetchStatsError && currentBmStats) {
          const newReviewCount = (currentBmStats.review_count || 0) + 1;
          const newTotalRating = ((currentBmStats.rating || 0) * (currentBmStats.review_count || 0)) + rating;
          const newAverageRating = newTotalRating / newReviewCount;

          await supabase
            .from('users')
            .update({
              rating: newAverageRating,
              review_count: newReviewCount,
            })
            .eq('id', id);
        }

        Alert.alert('Succès', 'Votre évaluation a été enregistrée avec succès !');
        setShowRatingModal(false);
        setRating(0); // Reset rating
        setComment(''); // Reset comment
      }
    } catch (e) {
      console.error('Unexpected error submitting review:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de l\'envoi de l\'avis.');
    }
  }, [rating, comment, user, id]);

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

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Chargement du profil du Boat Manager...</Text>
      </View>
    );
  }

  if (error || !boatManager) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>{error || 'Profil du Boat Manager introuvable.'}</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Cover Image */}
      <View style={styles.coverContainer}>
        <Image source={{ uri: boatManager.cover }} style={styles.coverImage} />
        <View style={styles.overlay} />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image 
          source={{ uri: boatManager.avatar }} 
          style={styles.avatar} 
          onError={(e) => {
            console.error('Error loading BM avatar:', e.nativeEvent.error, 'URL:', boatManager.avatar);
            // Fallback to default avatar if image fails to load
            setBoatManager(prev => ({ ...prev!, avatar: DEFAULT_AVATAR }));
          }}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{boatManager.name}</Text>
          <Text style={styles.title}>{boatManager.title}</Text>

          <View style={styles.locationContainer}>
            <MapPin size={16} color="#666" />
            <Text style={styles.location}>{boatManager.location}</Text>
          </View>

          <View style={styles.ratingRow}>
            <StarRating rating={boatManager.rating || 0} />
            <Text style={styles.ratingText}>
              {boatManager.rating?.toFixed(1)} ({boatManager.reviewCount} avis)
            </Text>
          </View>
        </View>
      </View>

      {/* Contact Buttons */}
      <View style={styles.contactButtons}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleContact}
        >
          <Text style={styles.contactButtonText}>Contacter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rateButton}
          onPress={() => setShowRatingModal(true)}
        >
          <Star size={20} color="#FFC107" />
          <Text style={styles.rateButtonText}>Évaluer</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Info */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Phone size={20} color="#0066CC" />
          <Text style={styles.infoText}>{boatManager.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Mail size={20} color="#0066CC" />
          <Text style={styles.infoText}>{boatManager.email}</Text>
        </View>
      </View>

      {/* Experience & Certifications */}
      <View style={styles.experienceSection}>
        <View style={styles.experienceItem}>
          <Briefcase size={20} color="#0066CC" />
          <View>
            <Text style={styles.experienceLabel}>Expérience</Text>
            <Text style={styles.experienceValue}>{boatManager.experience}</Text>
          </View>
        </View>
        <View style={styles.experienceItem}>
          <Award size={20} color="#0066CC" />
          <View>
            <Text style={styles.experienceLabel}>Certifications</Text>
            <Text style={styles.experienceValue}>
              {boatManager.certifications.length > 0 ? boatManager.certifications.join(', ') : 'Aucune'}
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
          style={[styles.tab, selectedTab === 'reviews' && styles.activeTab]}
          onPress={() => setSelectedTab('reviews')}
        >
          <Text style={[styles.tabText, selectedTab === 'reviews' && styles.activeTabText]}>
            Avis
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
        <View style={styles.reviewsContainer}>
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewAuthor}>{review.author}</Text>
                  <Text style={styles.reviewDate}>{review.date}</Text>
                </View>
                <StarRating rating={review.rating} />
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun avis pour ce Boat Manager.</Text>
            </View>
          )}
        </View>
      )}

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        rating={rating}
        setRating={setRating}
        comment={comment}
        setComment={setComment}
        onSubmit={handleSubmitRating}
        boatManagerName={boatManager.name}
        userFirstName={user?.firstName}
        userLastName={user?.lastName}
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
  errorButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  coverContainer: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: -40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: 'white',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
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
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  contactButtons: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  contactButton: {
    flex: 3,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  rateButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    padding: 16,
    borderRadius: 12,
  },
  rateButtonText: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  experienceSection: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewDate: {
    fontSize: 14,
    color: '#666',
  },
  reviewComment: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', // Centered vertically
    alignItems: 'center', // Centered horizontally
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16, // Rounded corners
    padding: 24, // Increased padding
    width: '90%', // Take up most of the width
    maxWidth: 400, // Max width for larger screens
    gap: 20, // Spacing between sections
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, // Increased shadow
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8, // Increased elevation
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // Stronger shadow
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // Spacing below header
  },
  modalTitle: {
    fontSize: 22, // Larger title
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8, // Padding for touch area
  },
  ratingServiceInfo: {
    marginBottom: 16, // Spacing below info
  },
  ratingServiceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  ratingServiceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center', // Center stars
    gap: 10, // Spacing between stars
    marginBottom: 16,
  },
  starIcon: {
    // No specific style needed here, size and fill are handled by props
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0066CC', // Highlighted color
    textAlign: 'center',
    marginBottom: 20,
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  commentInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 100, // Min height for textarea
    textAlignVertical: 'top',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  ratingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  ratingCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 14, // Increased padding
    borderRadius: 12, // Rounded corners
    alignItems: 'center',
  },
  ratingCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  ratingSubmitButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: 14, // Increased padding
    borderRadius: 12, // Rounded corners
    alignItems: 'center',
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
