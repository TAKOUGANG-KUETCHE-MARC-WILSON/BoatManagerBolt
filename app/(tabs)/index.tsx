import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, ScrollView, TouchableOpacity, Platform, Animated, Image, Modal, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Wrench, MessagesSquare, Handshake as HandshakeIcon, Tag, ShoppingBag as Cart, PenTool as Tool, Hammer, Settings, Gauge, Key, Shield, FileText, ChevronDown, Plus, User, Phone, Mail, Star, Search, MapPin, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

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
  location?: string; // This will now come from ports.name
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

function BoatManagerSection({ boatManager }: { boatManager: BoatManagerDetails | null }) {
  const handleContactBoatManager = () => {
    router.push('/(tabs)/messages');
  };
  
  if (!boatManager) {
    return null; // Or a placeholder if no BM is assigned
  }

  return (
    <View style={styles.boatManagerSection}>
      <Text style={styles.boatManagerTitle}>Votre Boat Manager</Text>
      <Text style={styles.boatManagerSubtitle}>
        La satisfaction de vos besoins
      </Text>
      
      <View style={styles.boatManagerCard}>
        <View style={styles.boatManagerHeader}>
          <Image source={{ uri: boatManager.avatar }} style={styles.boatManagerAvatar} />
          <View style={styles.boatManagerInfo}>
            <Text style={styles.boatManagerName}>{boatManager.name}</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  fill={star <= Math.floor(boatManager.rating || 0) ? '#FFC107' : 'none'}
                  color={star <= Math.floor(boatManager.rating || 0) ? '#FFC107' : '#D1D5DB'}
                />
              ))}
              <Text style={styles.ratingText}>{boatManager.rating}</Text>
            </View>
            <Text style={styles.boatManagerLocation}>{boatManager.location}</Text>
          </View>
        </View>
        
        <View style={styles.boatManagerContactInfo}>
          <View style={styles.contactInfoRow}>
            <Phone size={16} color="#666" />
            <Text style={styles.contactInfoText}>{boatManager.phone}</Text>
          </View>
          <View style={styles.contactInfoRow}>
            <Mail size={16} color="#666" />
            <Text style={styles.contactInfoText}>{boatManager.email}</Text>
          </View>
        </View>
        
        <Text style={styles.boatManagerPromise}>
          "Je suis à votre disposition pour vous accompagner dans tous vos projets nautiques et garantir une expérience sans souci sur l'eau."
        </Text>
        
        <TouchableOpacity 
          style={styles.contactBoatManagerButton}
          onPress={handleContactBoatManager}
        >
          <Text style={styles.contactBoatManagerText}>Contacter mon Boat Manager</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const [mainBoatManager, setMainBoatManager] = useState<BoatManagerDetails | null>(null);
  
  // Temporary port selection
  const [showTemporaryPortModal, setShowTemporaryPortModal] = useState(false);
  const [temporaryPortSearch, setTemporaryPortSearch] = useState('');
  const [selectedTemporaryPortId, setSelectedTemporaryPortId] = useState<string | null>(null);
  const [selectedTemporaryPort, setSelectedTemporaryPort] = useState<Port | null>(null);
  const [temporaryBoatManager, setTemporaryBoatManager] = useState<BoatManagerDetails | null>(null);
  
  const [availablePorts, setAvailablePorts] = useState<Port[]>([]);
  const [allBoatManagers, setAllBoatManagers] = useState<BoatManagerDetails[]>([]);
  const [userHomePortId, setUserHomePortId] = useState<string | null>(null); // To store the user's home port ID

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.id) return;

      // 1. Fetch ALL ports the current user is associated with
      const { data: userAssociatedPorts, error: userAssociatedPortsError } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', user.id);

      if (userAssociatedPortsError) {
        console.error('Error fetching user associated ports:', userAssociatedPortsError);
        return;
      }

      const userPortIds = new Set(userAssociatedPorts.map(up => up.port_id.toString()));

      // Determine the primary port for the main Boat Manager section (if any)
      // This part can remain as is, or be adjusted if a specific "primary" port is needed.
      // For now, let's assume the first one found is "primary" for the BM section display.
      let primaryPortId: string | null = null;
      if (userAssociatedPorts && userAssociatedPorts.length > 0) {
        primaryPortId = userAssociatedPorts[0].port_id.toString();
        setUserHomePortId(primaryPortId); // Store user's home port ID

        // Fetch Boat Manager for the user's home port
        const { data: bmPortAssignments, error: bmPortAssignmentsError } = await supabase
          .from('user_ports')
          .select('user_id')
          .eq('port_id', parseInt(primaryPortId));

        if (bmPortAssignmentsError) {
          console.error('Error fetching BM port assignments:', bmPortAssignmentsError);
          return;
        }

        if (bmPortAssignments && bmPortAssignments.length > 0) {
          const bmIds = bmPortAssignments.map(pa => pa.user_id);
          const { data: bmData, error: bmError } = await supabase
            .from('users')
            .select('id, first_name, last_name, e_mail, phone, avatar, user_ports(ports(name))') // Select user_ports relation to get port name
            .in('id', bmIds)
            .eq('profile', 'boat_manager')
            .limit(1); // Get one BM for the primary port

          if (bmError) {
            console.error('Error fetching main boat manager:', bmError);
            return;
          }

          if (bmData && bmData.length > 0) {
            const bm = bmData[0];
            const bmPortName = bm.user_ports && bm.user_ports.length > 0 ? bm.user_ports[0].ports.name : 'N/A';
            setMainBoatManager({
              id: bm.id.toString(),
              name: `${bm.first_name} ${bm.last_name}`,
              email: bm.e_mail,
              phone: bm.phone,
              avatar: bm.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
              location: bmPortName,
              rating: 4.8, // Mock rating for now, fetch from reviews later
            });
          }
        }
      }

      // Fetch all ports
      const { data: portsData, error: portsError } = await supabase
        .from('ports')
        .select('id, name');

      if (portsError) {
        console.error('Error fetching all ports:', portsError);
        return;
      }

      // Filter out ports the user is ALREADY associated with
      const filteredAvailablePorts = portsData
        .filter(p => !userPortIds.has(p.id.toString())) // Exclude all ports the user is associated with
        .map(p => ({ id: p.id.toString(), name: p.name }));
      setAvailablePorts(filteredAvailablePorts);

      // Fetch all boat managers for the temporary section
      const { data: allBmData, error: allBmError } = await supabase
        .from('users')
        .select('id, first_name, last_name, e_mail, phone, avatar, user_ports(ports(name))') // Select user_ports relation
        .eq('profile', 'boat_manager');

      if (allBmError) {
        console.error('Error fetching all boat managers:', allBmError);
        return;
      }
      setAllBoatManagers(allBmData.map(bm => ({
        id: bm.id.toString(),
        name: `${bm.first_name} ${bm.last_name}`,
        email: bm.e_mail,
        phone: bm.phone,
        avatar: bm.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
        location: bm.user_ports && bm.user_ports.length > 0 ? bm.user_ports[0].ports.name : 'N/A',
        rating: 4.8, // Mock rating for now
      })));
    };

    fetchInitialData();
  }, [user]);

  // Filter ports based on search query for the modal
  const filteredPorts = availablePorts.filter(port => 
    port.name.toLowerCase().includes(temporaryPortSearch.toLowerCase())
  );

  // Effect to update the temporary Boat Manager when a port is selected
  useEffect(() => {
    const updateTemporaryBm = async () => {
      if (selectedTemporaryPortId) {
        const port = availablePorts.find(p => p.id === selectedTemporaryPortId);
        if (port) {
          setSelectedTemporaryPort(port);
          
          // Find the boat manager associated with this specific port
          const { data: bmPortAssignments, error: bmPortAssignmentsError } = await supabase
            .from('user_ports')
            .select('user_id, ports(name)') // Select port name here
            .eq('port_id', parseInt(port.id))
            .limit(1);

          if (bmPortAssignmentsError) {
            console.error('Error fetching BM for temporary port:', bmPortAssignmentsError);
            setTemporaryBoatManager(null);
            return;
          }

          if (bmPortAssignments && bmPortAssignments.length > 0) {
            const bmId = bmPortAssignments[0].user_id;
            const bm = allBoatManagers.find(manager => manager.id === bmId);
            if (bm) {
                setTemporaryBoatManager({
                    ...bm,
                    location: bmPortAssignments[0].ports.name // Override location with the specific port name
                });
            } else {
                setTemporaryBoatManager(null);
            }
          } else {
            setTemporaryBoatManager(null);
          }
        }
      } else {
        setSelectedTemporaryPort(null);
        setTemporaryBoatManager(null);
      }
    };
    updateTemporaryBm();
  }, [selectedTemporaryPortId, availablePorts, allBoatManagers]);

  const handleSelectTemporaryPort = (port: Port) => {
    setSelectedTemporaryPortId(port.id);
    setShowTemporaryPortModal(false);
    setTemporaryPortSearch('');
  };

  const handleClearTemporaryPort = () => {
    setSelectedTemporaryPortId(null);
    setSelectedTemporaryPort(null);
    setTemporaryBoatManager(null);
  };

  const handleContactTemporaryBoatManager = () => {
    if (temporaryBoatManager) {
      router.push('/(tabs)/messages');
    }
  };

  const TemporaryPortModal = () => (
    <Modal
      visible={showTemporaryPortModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowTemporaryPortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un port</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowTemporaryPortModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un port..."
              value={temporaryPortSearch}
              onChangeText={setTemporaryPortSearch}
            />
          </View>
          
          <ScrollView style={styles.portsList}>
            {filteredPorts.map((port) => (
              <TouchableOpacity
                key={port.id}
                style={[
                  styles.portItem,
                  selectedTemporaryPortId === port.id && styles.selectedPortItem
                ]}
                onPress={() => handleSelectTemporaryPort(port)}
              >
                <MapPin size={20} color={selectedTemporaryPortId === port.id ? "#0066CC" : "#666"} />
                <Text style={[
                  styles.portItemText,
                  selectedTemporaryPortId === port.id && styles.selectedPortItemText
                ]}>
                  {port.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

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
          
          {temporaryBoatManager && (
            <View style={styles.temporaryBoatManagerCard}>
              <View style={styles.temporaryBoatManagerHeader}>
                <Image 
                  source={{ uri: temporaryBoatManager.avatar }} 
                  style={styles.temporaryBoatManagerAvatar} 
                />
                <View style={styles.temporaryBoatManagerInfo}>
                  <Text style={styles.temporaryBoatManagerName}>{temporaryBoatManager.name}</Text>
                  <Text style={styles.temporaryBoatManagerRole}>Boat Manager</Text>
                </View>
              </View>
              
              <View style={styles.temporaryBoatManagerContactInfo}>
                <View style={styles.temporaryContactRow}>
                  <Phone size={16} color="#666" />
                  <Text style={styles.temporaryContactText}>{temporaryBoatManager.phone}</Text>
                </View>
                <View style={styles.temporaryContactRow}>
                  <Mail size={16} color="#666" />
                  <Text style={styles.temporaryContactText}>{temporaryBoatManager.email}</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.contactTemporaryBoatManagerButton}
                onPress={handleContactTemporaryBoatManager}
              >
                <Text style={styles.contactTemporaryBoatManagerText}>Contacter</Text>
              </TouchableOpacity>
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
        style={styles.hero}>
        <View style={styles.heroOverlay}>
          <Text style={styles.heroText}>Your Boat Manager</Text>
          <Text style={styles.heroSubtext}>Facilitateur de plaisance</Text>
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
        
        {/* Boat Manager Section */}
        <BoatManagerSection boatManager={mainBoatManager} />
        
        {/* Temporary Port Section */}
        {user && <TemporaryPortSection />}
      </View>
      
      <TemporaryPortModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  hero: {
    height: 220,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  heroSubtext: {
    color: 'white',
    fontSize: 18,
    marginTop: 8,
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
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
    paddingVertical: 16,
    paddingHorizontal: 24,
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
  // Modal Styles
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
    maxHeight: '80%',
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
  modalCloseButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  portsList: {
    flex: 1,
  },
  portItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  portItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  selectedPortItem: {
    backgroundColor: '#f0f7ff',
  },
  selectedPortItemText: {
    color: '#0066CC',
    fontWeight: '500',
  },
});

