import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Modal, Alert, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ship, Users, Phone, Mail, Calendar, LogOut, MapPin, Image as ImageIcon, X, Plus, Pencil, Briefcase, Anchor, Star, ChevronRight, Settings, User, Tag, Info, Hash, FileText as FileTextIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
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
  rated: boolean;
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

const avatars = {
  male: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
  female: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
  neutral: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=2080&auto=format&fit=crop',
};

// Mock inventory data for the profile page
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

export default function ProfileScreen() {
  const { isAuthenticated, user, logout } = useAuth();
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'boats' | 'ports' | 'satisfaction' | 'inventory'>('boats');
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceHistory | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // New state for inventory item modal
  const [showInventoryDetailModal, setShowInventoryDetailModal] = useState(false);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null);

  const [userProfile, setUserProfile] = useState({
    firstName: user?.firstName || 'Jean',
    lastName: user?.lastName || 'Dupont',
    email: user?.email || 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    memberSince: 'Janvier 2024',
    profileImage: avatars.neutral
  });

  const [boats] = useState<Boat[]>([
    {
      id: '1',
      name: 'Le Grand Bleu',
      type: 'Voilier',
      length: '12m',
      image: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop'
    },
    {
      id: '2',
      name: 'Le Petit Prince',
      type: 'Yacht',
      length: '15m',
      homePort: 'Port de Nice',
      image: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?q=80&w=2044&auto=format&fit=crop'
    }
  ]);

  const [boatManagers] = useState<BoatManager[]>([
    {
      id: '1',
      name: 'Marie Martin',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop',
      rating: 4.8,
      location: 'Marseille'
    },
    {
      id: '2',
      name: 'Pierre Dubois',
      image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
      rating: 4.9,
      location: 'Nice'
    }
  ]);

  const [serviceHistory] = useState<ServiceHistory[]>([
    {
      id: 's1',
      date: '2024-05-15',
      type: 'Maintenance',
      description: 'Entretien moteur',
      provider: {
        id: '1',
        name: 'Marie Martin',
        type: 'boat_manager',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop'
      },
      status: 'completed',
      rated: false
    },
    {
      id: 's2',
      date: '2024-04-20',
      type: 'Réparation',
      description: 'Réparation voile',
      provider: {
        id: 'nc1',
        name: 'Nautisme Pro',
        type: 'nautical_company',
        image: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop'
      },
      status: 'completed',
      rated: true
    },
    {
      id: 's3',
      date: '2024-06-10',
      type: 'Installation',
      description: 'Installation GPS',
      provider: {
        id: 'nc1',
        name: 'Nautisme Pro',
        type: 'nautical_company',
        image: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop'
      },
      status: 'in_progress',
      rated: false
    }
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
      setUserProfile(prev => ({ ...prev, profileImage: result.assets[0].uri }));
    }
    setShowPhotoModal(false);
  };

  const handleSelectAvatar = (type: keyof typeof avatars) => {
    setUserProfile(prev => ({ ...prev, profileImage: avatars[type] }));
    setShowAvatarModal(false);
    setShowPhotoModal(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
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

    // Dans une vraie application, vous enverriez cette note à votre backend
    alert('Votre évaluation a été enregistrée avec succès !');
    setShowRatingModal(false);
    
    // Ajouter la nouvelle évaluation à la liste (simulation)
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
    
    // Mettre à jour la note moyenne (simulation)
    const totalRatings = mockReviews.reduce((sum, review) => sum + review.rating, 0);
    boatManager.rating = parseFloat((totalRatings / mockReviews.length).toFixed(1));
    boatManager.reviewCount = mockReviews.length;
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

  const RatingModal = () => (
    <Modal
      visible={showRatingModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowRatingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Évaluer {selectedService?.provider.name}</Text>
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
            <Text style={styles.commentLabel}>Commentaire (optionnel)</Text>
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
            style={styles.modalOption} 
            onPress={() => {
              setShowAvatarModal(true);
              setShowPhotoModal(false);
            }}
          >
            <User size={24} color="#0066CC" />
            <Text style={styles.modalOptionText}>Choisir un avatar</Text>
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

  const AvatarModal = () => (
    <Modal
      visible={showAvatarModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAvatarModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choisir un avatar</Text>
          
          <TouchableOpacity 
            style={styles.avatarOption} 
            onPress={() => handleSelectAvatar('male')}
          >
            <Image 
              source={{ uri: avatars.male }} 
              style={styles.avatarPreview} 
            />
            <Text style={styles.avatarOptionText}>Avatar Homme</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.avatarOption} 
            onPress={() => handleSelectAvatar('female')}
          >
            <Image 
              source={{ uri: avatars.female }} 
              style={styles.avatarPreview} 
            />
            <Text style={styles.avatarOptionText}>Avatar Femme</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.avatarOption} 
            onPress={() => handleSelectAvatar('neutral')}
          >
            <Image 
              source={{ uri: avatars.neutral }} 
              style={styles.avatarPreview} 
            />
            <Text style={styles.avatarOptionText}>Avatar Neutre</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowAvatarModal(false)}
          >
            <Text style={styles.modalCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
                    <Text style={styles.inventoryDetailLabel}>Modèle:</Text>
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
                    <FileTextIcon size={16} color="#666" />
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
          {boats.map((boat) => (
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
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const PortsSection = () => (
    <View style={styles.portsContainer}>
      <Text style={styles.portTitle}>Mon port d'attache</Text>
      <View style={styles.portCard}>
        <MapPin size={24} color="#0066CC" />
        <View style={styles.portInfo}>
          <Text style={styles.portName}>Port de Marseille</Text>
          <Text style={styles.portAddress}>Quai du Port, 13000 Marseille</Text>
        </View>
        <ChevronRight size={20} color="#666" />
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
        {serviceHistory.map((service) => (
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
        ))}
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
        {boatManagers.map((manager) => (
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
        ))}
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
                setSelectedInventoryItem(item);
                setShowInventoryDetailModal(true);
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
          <TouchableOpacity 
            style={[styles.tab, selectedTab === 'satisfaction' && styles.activeTab]}
            onPress={() => setSelectedTab('satisfaction')}
          >
            <Text style={[styles.tabText, selectedTab === 'satisfaction' && styles.activeTabText]}>
              Ma satisfaction
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Tab Content */}
        {selectedTab === 'boats' && <BoatsList />}
        {selectedTab === 'ports' && <PortsSection />}
        {selectedTab === 'inventory' && <InventoryTab />}
        {selectedTab === 'satisfaction' && <ServiceHistoryList />}
        
        {/* These sections are always visible regardless of the selected tab */}
        <BoatManagersList />
        <AccountSettings />
      </ScrollView>
      <PhotoModal />
      <AvatarModal />
      <RatingModal />
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
        boxBoxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
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

