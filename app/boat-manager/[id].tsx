import { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Modal, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Star, MapPin, Phone, Mail, Clock, Shield, Award, Briefcase, Ship, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  icon: any;
}

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

const services: Service[] = [
  {
    id: '1',
    name: 'Maintenance',
    description: 'Entretien régulier et préventif',
    icon: Ship,
  },
  {
    id: '2',
    name: 'Surveillance',
    description: 'Contrôle et sécurité',
    icon: Shield,
  },
  {
    id: '3',
    name: 'Assistance',
    description: 'Support 24/7',
    icon: Clock,
  },
];

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

  // Dans une vraie application, ces données viendraient d'une API
  const boatManager = {
    id,
    name: 'Marie Martin',
    title: 'Boat Manager Senior',
    location: 'Port de Marseille',
    rating: 4.8,
    reviewCount: 156,
    experience: '8 ans',
    certifications: ['Certification YBM', 'Expert Maritime'],
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop',
    cover: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop',
    phone: '+33 6 12 34 56 78',
    email: 'marie.martin@ybm.com',
  };

  const handleContact = () => {
    router.push('/(tabs)/messages');
  };

  // Memoized callback for submitting rating
  const handleSubmitRating = useCallback(() => {
    if (rating === 0) {
      alert('Veuillez sélectionner une note');
      return;
    }

    // Update mockReviews (global mock data)
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

    // Update boatManager.rating and reviewCount (modifying a local constant, won't trigger re-render of this component based on these changes)
    // In a real application, `boatManager` would likely be part of the component's state or managed by a global state/context,
    // and updating it would involve calling a `setState` function to trigger a re-render.
    const totalRatings = mockReviews.reduce((sum, review) => sum + review.rating, 0);
    boatManager.rating = parseFloat((totalRatings / mockReviews.length).toFixed(1));
    boatManager.reviewCount = mockReviews.length;

    alert('Votre évaluation a été enregistrée avec succès !');
    setShowRatingModal(false);
    setRating(0); // Reset rating
    setComment(''); // Reset comment
  }, [rating, comment, user]); // Dependencies for useCallback

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
        <Image source={{ uri: boatManager.avatar }} style={styles.avatar} />
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{boatManager.name}</Text>
          <Text style={styles.title}>{boatManager.title}</Text>

          <View style={styles.locationContainer}>
            <MapPin size={16} color="#666" />
            <Text style={styles.location}>{boatManager.location}</Text>
          </View>

          <View style={styles.ratingRow}>
            <StarRating rating={boatManager.rating} />
            <Text style={styles.ratingText}>
              {boatManager.rating} ({boatManager.reviewCount} avis)
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
              {boatManager.certifications.join(', ')}
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
        <View style={styles.reviewsContainer}>
          {mockReviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{review.author}</Text>
                <Text style={styles.reviewDate}>{review.date}</Text>
              </View>
              <StarRating rating={review.rating} />
              <Text style={styles.reviewComment}>{review.comment}</Text>
            </View>
          ))}
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
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
  commentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
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
});
