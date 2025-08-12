import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, ScrollView, TouchableOpacity, Platform, Animated, Image, Modal, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Wrench, MessagesSquare, Handshake as HandshakeIcon, Tag, ShoppingBag as Cart, PenTool as Tool, Hammer, Settings, Gauge, Key, Shield, FileText, ChevronDown, Plus, User, Phone, Mail, Star, Search, MapPin, X, ArrowLeft, Anchor, MessageSquare } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client
import TemporaryPortModal from '../../components/TemporaryPortModal'; // <-- Importation du nouveau composant

interface ServiceCategory {
  title: string;
  icon: any;
  color: string;
  services: Array<{
    name: string;
    icon: React.ComponentType<any>;
    route: string;
    description: string;
  }>;
}

interface Port {
  id: string;
  name: string;
}

interface BoatManagerDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  rating?: number;
  reviewCount?: number;
  location?: string; // This will now come from ports.name
  bio?: string; 
}

const serviceCategories: ServiceCategory[] = [
  {
    title: 'Maintenance',
    icon: Wrench,
    color: '#0EA5E9',
    services: [
      { 
        name: 'Entretien', 
        icon: Settings,
        route: '/services/maintenance',
        description: 'Entretien régulier et préventif'
      },
      { 
        name: 'Amélioration', 
        icon: Hammer,
        route: '/services/improvement',
        description: 'Optimisez votre bateau'
      },
      { 
        name: 'Réparation / Panne', 
        icon: Wrench,
        route: '/services/repair',
        description: 'Remise en état'
      },
      { 
        name: 'Contrôle', 
        icon: Gauge,
        route: '/services/control',
        description: 'Inspections de votre bateau'
      },
    ],
  },
  {
    title: 'Assistance',
    icon: MessagesSquare,
    color: '#10B981',
    services: [
      { 
        name: 'Accès à mon bateau', 
        icon: Key,
        route: '/services/access',
        description: 'Gestion des accès'
      },
      { 
        name: 'Sécurité', 
        icon: Shield,
        route: '/services/security',
        description: 'Protection et surveillance'
      },
      { 
        name: 'Représentation', 
        icon: FileText,
        route: '/services/administrative',
        description: 'Délégation de vos intérêts'
      },
    ],
  },
  {
    title: 'Achat/Vente',
    icon: HandshakeIcon,
    color: '#4F46E5',
    services: [
      { 
        name: 'Je vends mon bateau', 
        icon: Tag,
        route: '/services/sell',
        description: 'Mettez votre bateau en vente'
      },
      { 
        name: 'Je cherche un bateau', 
        icon: Cart,
        route: '/services/buy',
        description: 'Trouvez le bateau idéal'
      },
    ],
  },
];

function ServiceCategoryCard({ category }: { category: ServiceCategory }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [rotateAnimation] = useState(new Animated.Value(0));

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    Animated.spring(rotateAnimation, {
      toValue: isExpanded ? 0 : 1,
      useNativeDriver: true,
    }).start();
  };

  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const animatedStyle = {
    transform: [{ rotate: rotateInterpolate }],
  };

  return (
    <View style={styles.categoryCard}>
      <TouchableOpacity 
        style={[styles.categoryHeader, { backgroundColor: `${category.color}15` }]}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
          <category.icon size={24} color="white" />
        </View>
        <View style={styles.categoryHeaderText}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
        </View>
        <Animated.View style={animatedStyle}>
          <ChevronDown size={24} color={category.color} />
        </Animated.View>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={styles.servicesList}>
          {category.services.map((service, index) => (
            <View key={index} style={styles.serviceRow}>
              <TouchableOpacity
                style={styles.serviceCard}
                onPress={() => router.push(service.route)}>
                <View style={[styles.serviceIcon, { backgroundColor: `${category.color}15` }]}>
                  <service.icon size={24} color={category.color} />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [associatedBoatManagers, setAssociatedBoatManagers] = useState<BoatManagerDetails[]>([]);
  const [selectedTemporaryPort, setSelectedTemporaryPort] = useState<Port | null>(null);
  const [temporaryBoatManagers, setTemporaryBoatManagers] = useState<BoatManagerDetails[]>([]); // Changed to array
  
  // Temporary port selection
  const [showTemporaryPortModal, setShowTemporaryPortModal] = useState(false);
  const [temporaryPortSearch, setTemporaryPortSearch] = useState('');
  const [selectedTemporaryPortId, setSelectedTemporaryPortId] = useState<string | null>(null);
  
  const [allPorts, setAllPorts] = useState<Port[]>([]); // All ports for the modal
  const [userHomePortId, setUserHomePortId] = useState<string | null>(null); // To store the user's home port ID

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return;

      // 1. Récupérer tous les ports du client
      const { data: userPorts, error: userPortsError } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', user.id);

      if (userPortsError) {
        console.error('Error fetching user ports:', userPortsError);
        return;
      }

      const portIds = userPorts ? userPorts.map(p => p.port_id) : [];

      // 2. Récupérer tous les ports pour la modale (non filtrés)
      const { data: portsData, error: portsError } = await supabase
        .from('ports')
        .select('id, name');

      if (portsError) {
        console.error('Error fetching all ports:', portsError);
      } else {
        setAllPorts(portsData.map(p => ({ id: p.id.toString(), name: p.name })));
      }

      // 3. Récupérer tous les Boat Managers associés aux ports de l'utilisateur
      if (portIds.length > 0) {
        const { data: bmPortAssignments, error: bmPortAssignmentsError } = await supabase
          .from('user_ports')
          .select('user_id, port_id')
          .in('port_id', portIds);

        if (bmPortAssignmentsError) {
          console.error('Error fetching BM assignments:', bmPortAssignmentsError);
          return;
        }

        const bmIds = [...new Set(bmPortAssignments.map(bm => bm.user_id))]; // Unique BM IDs

        if (bmIds.length > 0) {
          const { data: bmsData, error: bmsError } = await supabase
            .from('users')
            .select('id, first_name, last_name, e_mail, phone, avatar, rating, review_count, bio')
            .in('id', bmIds)
            .eq('profile', 'boat_manager');

          if (bmsError) {
            console.error('Error fetching BMs details:', bmsError);
            return;
          }

          const formattedBms: BoatManagerDetails[] = await Promise.all(bmsData.map(async bm => {
            const bmPort = allPorts.find(p => p.id === bmPortAssignments.find(bmpa => bmpa.user_id === bm.id)?.port_id.toString());
            return {
              id: bm.id.toString(),
              name: `${bm.first_name} ${bm.last_name}`,
              email: bm.e_mail,
              phone: bm.phone,
              avatar: bm.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
              location: bmPort?.name || 'N/A',
              rating: bm.rating,
              reviewCount: bm.review_count,
              bio: bm.bio || 'Boat Manager professionnel',
            };
          }));
          setAssociatedBoatManagers(formattedBms);
        }
      }
    };

    fetchInitialData();
  }, [user, allPorts]); // Added allPorts to dependencies

  useEffect(() => {
    const fetchTemporaryBms = async () => {
      if (selectedTemporaryPortId) {
        const port = allPorts.find(p => p.id === selectedTemporaryPortId);
        if (port) {
          setSelectedTemporaryPort(port);

          const { data: bmPortAssignments, error: bmPortAssignmentsError } = await supabase
            .from('user_ports')
            .select('user_id, ports(name)') // Select port name here
            .eq('port_id', parseInt(port.id));

          if (bmPortAssignmentsError) {
            console.error('Erreur chargement BM escale:', bmPortAssignmentsError);
            setTemporaryBoatManagers([]);
            return;
          }

          const bmIds = bmPortAssignments.map(bmpa => bmpa.user_id);

          if (bmIds.length > 0) {
            const { data: bmsData, error: bmsError } = await supabase
              .from('users')
              .select('id, first_name, last_name, e_mail, phone, avatar, rating, review_count, bio')
              .in('id', bmIds)
              .eq('profile', 'boat_manager');

            if (bmsError) {
              console.error('Erreur chargement BM:', bmsError);
              setTemporaryBoatManagers([]);
              return;
            }

            const formattedBms: BoatManagerDetails[] = bmsData.map(bm => ({
              id: bm.id.toString(),
              name: `${bm.first_name} ${bm.last_name}`,
              email: bm.e_mail,
              phone: bm.phone,
              avatar: bm.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
              location: bmPortAssignments.find(p => p.user_id === bm.id)?.ports?.name || port.name, // Use port name from assignment if available
              rating: bm.rating,
              reviewCount: bm.review_count,
              bio: bm.bio || 'Boat Manager à votre écoute',
            }));
            setTemporaryBoatManagers(formattedBms);
          } else {
            setTemporaryBoatManagers([]);
          }
        }
      } else {
        setSelectedTemporaryPort(null);
        setTemporaryBoatManagers([]);
      }
    };

    fetchTemporaryBms();
  }, [selectedTemporaryPortId, allPorts]);

  // Filter ports based on search query for the modal
  const filteredPorts = allPorts.filter(port =>
    port.name.toLowerCase().includes(temporaryPortSearch.toLowerCase())
  );

  const handleSelectTemporaryPort = async (port: Port) => {
    // Vérifie si le port sélectionné est le port d'attache principal de l'utilisateur
    if (port.id === userHomePortId) {
      Alert.alert("Port déjà rattaché", "Vous êtes déjà rattaché à ce port d'attache principal.");
      return;
    }

    // Vérifie si le client est déjà en escale sur ce port (user_ports)
    const { data: existingPort, error } = await supabase
      .from('user_ports')
      .select('port_id')
      .eq('user_id', user?.id)
      .eq('port_id', parseInt(port.id)) // Convertir en int pour la comparaison
      .maybeSingle();

    if (error) {
      console.error('Erreur vérification escale :', error);
    }

    if (existingPort) {
      Alert.alert("Port déjà sélectionné", "Vous êtes déjà en escale sur ce port.");
      return;
    }

    // Si tout est OK, on sélectionne
    setSelectedTemporaryPortId(port.id);
    setShowTemporaryPortModal(false);
    setTemporaryPortSearch('');
  };

  const handleClearTemporaryPort = () => {
    setSelectedTemporaryPortId(null);
    setSelectedTemporaryPort(null);
    setTemporaryBoatManagers([]);
  };

  const handleContactBoatManager = (bmId: string) => {
    router.push(`/(tabs)/messages?client=${bmId}`);
  };

  const TemporaryPortSection = () => (
    <View style={styles.temporaryPortSection}>
      <View style={styles.temporaryPortHeader}>
        <MapPin size={24} color="#0066CC" />
        <Text style={styles.temporaryPortTitle}>Vous êtes en déplacement</Text>
      </View>
      
      <Text style={styles.temporaryPortDescription}>
        Rentrez en contact avec le Boat Manager du port où vous êtes en escale.
      </Text>
      
      {selectedTemporaryPort ? (
        <View style={styles.selectedTemporaryPortContainer}>
          <View style={styles.selectedTemporaryPortHeader}>
            <View style={styles.selectedTemporaryPortInfo}>
              <MapPin size={20} color="#0066CC" />
              <Text style={styles.selectedTemporaryPortName}>{selectedTemporaryPort.name}</Text>
            </View>
            <TouchableOpacity 
              style={styles.clearTemporaryPortButton}
              onPress={handleClearTemporaryPort}
            >
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          {temporaryBoatManagers.length > 0 ? (
            temporaryBoatManagers.map(bm => (
              <View key={bm.id} style={styles.temporaryBoatManagerCard}>
                <View style={styles.temporaryBoatManagerHeader}>
                  <Image 
                    source={{ uri: bm.avatar }} 
                    style={styles.temporaryBoatManagerAvatar} 
                  />
                  <View style={styles.temporaryBoatManagerInfo}>
                    <Text style={styles.temporaryBoatManagerName}>{bm.name}</Text>
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
                    <Text style={styles.temporaryBoatManagerRole}>Boat Manager</Text>
                  </View>
                </View>
                
                <View style={styles.temporaryBoatManagerContactInfo}>
                  <View style={styles.temporaryContactRow}>
                    <Phone size={16} color="#666" />
                    <Text style={styles.temporaryContactText}>{bm.phone}</Text>
                  </View>
                  <View style={styles.temporaryContactRow}>
                    <Mail size={16} color="#666" />
                    <Text style={styles.temporaryContactText}>{bm.email}</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.contactTemporaryBoatManagerButton}
                  onPress={() => handleContactBoatManager(bm.id)}
                >
                  <Text style={styles.contactTemporaryBoatManagerText}>Contacter</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.noTemporaryBm}>
              <Text style={styles.noTemporaryBmText}>Aucun Boat Manager trouvé pour ce port.</Text>
            </View>
          )}
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.selectTemporaryPortButton}
          onPress={() => setShowTemporaryPortModal(true)}
        >
          <MapPin size={20} color="#0066CC" />
          <Text style={styles.selectTemporaryPortText}>Sélectionner votre port d'escale</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?q=80&w=2044&auto=format&fit=crop' }}
        style={styles.heroBackground}>
        <View style={styles.overlay} />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.heroContent}>
          <Anchor size={40} color="white" style={styles.heroIcon} />
          <Text style={styles.heroTitle}>Your Boat Manager</Text>
          <Text style={styles.heroSubtitle}>Facilitateur de plaisance</Text>
        </View>
      </ImageBackground>

      <View style={styles.nationalNetworkBanner}>
        <Text style={styles.nationalNetworkText}>Un Réseau National à votre service</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.servicesContainer}>
          {serviceCategories.map((category, index) => (
            <ServiceCategoryCard key={index} category={category} />
          ))}
        </View>
        
        {/* Vos Boat Managers Section (MODIFIED) */}
        {associatedBoatManagers.length > 0 && (
          <View style={styles.boatManagerSection}>
            <Text style={styles.boatManagerTitle}>Vos Boat Managers</Text>
            {associatedBoatManagers.map((bm) => (
              <View key={bm.id} style={styles.boatManagerCard}>
                <View style={styles.boatManagerHeader}>
                  <Image source={{ uri: bm.avatar }} style={styles.boatManagerAvatar} />
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
                <TouchableOpacity 
                  style={styles.contactBoatManagerButton}
                  onPress={() => handleContactBoatManager(bm.id)}
                >
                  <MessageSquare size={20} color="white" />
                  <Text style={styles.contactBoatManagerText}>Contacter</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Temporary Port Section */}
        <TemporaryPortSection />
      </View>
      
      <TemporaryPortModal
        visible={showTemporaryPortModal}
        onClose={() => setShowTemporaryPortModal(false)}
        onSelectPort={handleSelectTemporaryPort}
        allPorts={allPorts}
        userHomePortId={userHomePortId}
        temporaryPortSearch={temporaryPortSearch}
        setTemporaryPortSearch={setTemporaryPortSearch}
        selectedTemporaryPortId={selectedTemporaryPortId}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  heroBackground: {
    height: 280,
    justifyContent: 'space-between',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backButton: {
    padding: 16,
    zIndex: 1,
  },
  heroContent: {
    padding: 24,
    alignItems: 'center',
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  nationalNetworkBanner: {
    backgroundColor: '#212B54',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nationalNetworkText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  servicesContainer: {
    gap: 24,
    marginBottom: 24,
  },
  categoryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
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
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryHeaderText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  servicesList: {
    padding: 16,
    gap: 12,
    backgroundColor: '#f8fafc',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
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
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
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
    lineHeight: 20,
  },
  quickAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Boat Manager Section Styles
  boatManagerSection: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: 'white',
    padding: 20,
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
  boatManagerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  boatManagerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  boatManagerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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
  boatManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  boatManagerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  boatManagerInfo: {
    flex: 1,
  },
  boatManagerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  boatManagerLocation: {
    fontSize: 14,
    color: '#666',
  },
  boatManagerContactInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  contactInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactInfoText: {
    fontSize: 14,
    color: '#666',
  },
  boatManagerPromise: {
    fontSize: 16,
    color: '#1a1a1a',
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#0066CC',
    paddingLeft: 16,
  },
  contactBoatManagerButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12, // Reduced padding
    paddingHorizontal: 16, // Reduced padding
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row', // Align icon and text
    justifyContent: 'center', // Center content
    gap: 8, // Space between icon and text
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
  contactBoatManagerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Temporary Port Section Styles
  temporaryPortSection: {
    backgroundColor: '#f0f7ff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
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
  temporaryPortHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  temporaryPortTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
  },
  temporaryPortDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  selectTemporaryPortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066CC',
    gap: 8,
  },
  selectTemporaryPortText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  selectedTemporaryPortContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    gap: 16,
  },
  selectedTemporaryPortHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedTemporaryPortInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTemporaryPortName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  clearTemporaryPortButton: {
    padding: 4,
  },
  temporaryBoatManagerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    gap: 16,
    marginBottom: 12, // Added margin-bottom for spacing between multiple BMs
  },
  temporaryBoatManagerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  temporaryBoatManagerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  temporaryBoatManagerInfo: {
    flex: 1,
  },
  temporaryBoatManagerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  temporaryBoatManagerRole: {
    fontSize: 14,
    color: '#666',
  },
  temporaryBoatManagerContactInfo: {
    gap: 8,
  },
  temporaryContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  temporaryContactText: {
    fontSize: 14,
    color: '#666',
  },
  contactTemporaryBoatManagerButton: {
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactTemporaryBoatManagerText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  noTemporaryBm: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
  },
  noTemporaryBmText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Styles from previous response for other sections
  // ... (keep existing styles for header, profile info, tabs, boats, history, reviews, logout)
  // Ensure these are correctly merged with the new styles
  // For brevity, I'm omitting the unchanged styles here, but they should be present in the actual file.
});
