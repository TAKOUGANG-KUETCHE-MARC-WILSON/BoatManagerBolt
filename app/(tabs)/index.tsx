// app/(tabs)/index.tsx

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, ScrollView, TouchableOpacity, Platform, Animated, Image, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { Wrench, MessagesSquare, Handshake as HandshakeIcon, Tag, ShoppingBag as Cart, PenTool as Tool, Hammer, Settings, Gauge, Key, Shield, FileText, ChevronDown, Phone, Mail, Star, MapPin, X, ArrowLeft, Anchor, MessageSquare, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client
import TemporaryPortModal from '../../components/TemporaryPortModal'; // <-- Importation du nouveau composant

interface ServiceCategory {
  id: number; // Added for Supabase mapping
  title: string;
  icon: any;
  color: string;
  services: Array<{
    id: number; // Added for Supabase mapping
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

interface BoatDetails {
  id: string;
  name: string;
  type: string;
  image: string; // Added for boat image URL
  portName: string; // Added for boat's port name
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

const AVATAR_BUCKET = 'avatars';
const BOAT_BUCKET = 'boat.images';
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

const DEFAULT_BOAT_IMAGE =
  'https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?q=80&w=1600&auto=format&fit=crop';

const devLog   = (...a: any[]) => { if (__DEV__) console.log(...a); };
const devError = (...a: any[]) => { if (__DEV__) console.error(...a); };

/** Wrap générique : n'émet jamais d'exception, renvoie un fallback si erreur */
async function safeQuery<T>(
  fn: () => Promise<{ data: T; error: any }>,
  fallback: T
): Promise<T> {
  try {
    const { data, error } = await fn();
    if (error || data == null) return fallback;
    return data;
  } catch (e) {
    devError('safeQuery error:', e);
    return fallback;
  }
}

/** Timeout doux pour éviter les promesses qui pendent */
function withTimeout<T>(p: Promise<T>, ms = 10_000): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ]) as Promise<T>;
}


const isHttpUrl = (v?: string) =>
  !!v && (v.startsWith('http://') || v.startsWith('https://'));

// Extrait { bucket, path } d'une URL Supabase (public ou sign), sinon renvoie null
function extractBucketAndPathFromSupabaseUrl(url: string) {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
  if (!m) return null;
  const [, bucket, path] = m;
  return { bucket, path };
}



function inferBucketFromPath(path: string) {
  if (path.startsWith('boat.images/')) return BOAT_BUCKET;
  if (path.startsWith('avatars/')) return AVATAR_BUCKET;
  // si tu stockes sans préfixe de bucket, garde un défaut
  return AVATAR_BUCKET;
}
async function getAvatarUrl(value?: string | null): Promise<string> {
  if (!value || !`${value}`.trim()) return DEFAULT_AVATAR;

  const raw = `${value}`.trim();

  // 1) Si c'est déjà une URL http(s)
  if (isHttpUrl(raw)) {
    const bp = extractBucketAndPathFromSupabaseUrl(raw);
    if (!bp) return raw; // URL externe → on laisse tel quel
    const signed = await safeQuery(
      () => supabase.storage.from(bp.bucket).createSignedUrl(bp.path, 60 * 60),
      { signedUrl: '' } as any
    );
    return signed?.signedUrl || DEFAULT_AVATAR;
  }

  // 2) Chemin brut "bucket/chemin/dans/bucket"
  const path = raw.replace(/^\/+/, '');
  const bucket = inferBucketFromPath(path);
  const relative = path.startsWith(bucket + '/')
    ? path.slice(bucket.length + 1)
    : path;

  const signed = await safeQuery(
    () => supabase.storage.from(bucket).createSignedUrl(relative, 60 * 60),
    { signedUrl: '' } as any
  );
  return signed?.signedUrl || DEFAULT_AVATAR;
}


const serviceCategories: ServiceCategory[] = [
  {
    id: 1, // Corresponds to 'Maintenance' category in Supabase
    title: 'Maintenance',
    icon: Wrench,
    color: '#0EA5E9',
    services: [
      { 
        id: 101, // Corresponds to 'Entretien' service in Supabase
        name: 'Entretien', 
        icon: Settings,
        route: '/services/maintenance',
        description: 'Entretien régulier et préventif'
      },
      { 
        id: 102, // Corresponds to 'Amélioration' service in Supabase
        name: 'Amélioration', 
        icon: Hammer,
        route: '/services/improvement',
        description: 'Optimisez votre bateau'
      },
      { 
        id: 103, // Corresponds to 'Réparation / Panne' service in Supabase
        name: 'Réparation / Panne', 
        icon: Wrench,
        route: '/services/repair',
        description: 'Remise en état'
      },
      { 
        id: 104, // Corresponds to 'Contrôle' service in Supabase
        name: 'Contrôle', 
        icon: Gauge,
        route: '/services/control',
        description: 'Inspections de votre bateau'
      },
    ],
  },
  {
    id: 2, // Corresponds to 'Assistance' category in Supabase
    title: 'Assistance',
    icon: MessagesSquare,
    color: '#10B981',
    services: [
      { 
        id: 201, // Corresponds to 'Gestion des accès' service in Supabase
        name: 'Gestion des accès', // Renamed from 'Accès à mon bateau'
        icon: Key,
        route: '/services/access',
        description: 'Gestion des accès'
      },
      { 
        id: 202, // Corresponds to 'Sécurité' service in Supabase
        name: 'Sécurité', 
        icon: Shield,
        route: '/services/security',
        description: 'Protection et surveillance'
      },
      { 
        id: 203, // Corresponds to 'Représentation' service in Supabase
        name: 'Représentation', 
        icon: FileText,
        route: '/services/administrative',
        description: 'Délégation de vos intérêts'
      },
      {
        id: 204, // New service for 'Autre'
        name: 'Autre',
        icon: Tool, // Using a generic tool icon
        route: '/services/other', // Assuming a generic 'other' service screen
        description: 'Demande de service non listée'
      }
    ],
  },
  {
    id: 3, // Corresponds to 'Achat/Vente' category in Supabase
    title: 'Achat/Vente',
    icon: HandshakeIcon,
    color: '#4F46E5',
    services: [
      { 
        id: 301, // Corresponds to 'Je vends mon bateau' service in Supabase
        name: 'Je vends mon bateau', 
        icon: Tag,
        route: '/services/sell',
        description: 'Mettez votre bateau en vente'
      },
      { 
        id: 302, // Corresponds to 'Je cherche un bateau' service in Supabase
        name: 'Je cherche un bateau', 
        icon: Cart,
        route: '/services/buy', // <-- Modifié pour pointer directement vers buy.tsx
        description: 'Trouvez le bateau idéal'
      },
    ],
  },
];

function ServiceCategoryCard({ category, onServicePress }: { category: ServiceCategory, onServicePress: (category: ServiceCategory, service: ServiceCategory['services'][0]) => void }) {
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
                onPress={() => onServicePress(category, service)} // Modified to use onServicePress
              >
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

  // New states for boat selection
  const [userBoats, setUserBoats] = useState<BoatDetails[]>([]);
  const [showBoatSelectionModal, setShowBoatSelectionModal] = useState(false);
  const [selectedServiceForRequest, setSelectedServiceForRequest] = useState<{ category: ServiceCategory, service: ServiceCategory['services'][0] } | null>(null);


  useEffect(() => {
  let alive = true; // ← évite setState après unmount

  const fetchInitialData = async () => {
    if (!user?.id) return;

    // 1) ports de l’utilisateur
    const userPorts = await withTimeout(
      safeQuery(() =>
        supabase.from('user_ports').select('port_id').eq('user_id', user.id),
        [] as Array<{ port_id: number }>
      )
    ).catch(() => [] as Array<{ port_id: number }>);
    const portIds = userPorts.map(p => p.port_id);

    // 2) tous les ports (pour la modale)
    const portsData = await withTimeout(
      safeQuery(() => supabase.from('ports').select('id, name'), [] as Array<{ id: number; name: string }>)
    ).catch(() => [] as Array<{ id: number; name: string }>);

    if (!alive) return;
    const portsList = portsData.map(p => ({ id: String(p.id), name: p.name }));
    setAllPorts(portsList);
    const portsById = new Map(portsList.map(p => [p.id, p.name]));

    // 3) BMs associés aux ports
    if (portIds.length) {
      const bmPortAssignments = await withTimeout(
        safeQuery(() =>
          supabase.from('user_ports').select('user_id, port_id').in('port_id', portIds),
          [] as Array<{ user_id: string | number; port_id: number }>
        )
      ).catch(() => [] as Array<{ user_id: string | number; port_id: number }>);

      const bmIds = [...new Set(bmPortAssignments.map(bm => bm.user_id))];
      if (bmIds.length) {
        const bmsData = await withTimeout(
          safeQuery(() =>
            supabase
              .from('users')
              .select('id, first_name, last_name, e_mail, phone, avatar, rating, review_count, bio')
              .in('id', bmIds)
              .eq('profile', 'boat_manager'),
            [] as any[]
          )
        ).catch(() => [] as any[]);

        const formattedBms = await Promise.all(
          bmsData.map(async (bm) => {
            const assignedPortId = bmPortAssignments.find(x => x.user_id === bm.id)?.port_id?.toString();
            const bmPortName = assignedPortId ? (portsById.get(assignedPortId) ?? 'N/A') : 'N/A';
            const avatarUrl = await getAvatarUrl(bm.avatar);
            return {
              id: String(bm.id),
              name: `${bm.first_name} ${bm.last_name}`,
              email: bm.e_mail,
              phone: bm.phone,
              avatar: avatarUrl || DEFAULT_AVATAR,
              location: bmPortName,
              rating: bm.rating,
              reviewCount: bm.review_count,
              bio: bm.bio || 'Boat Manager à votre écoute',
            } as BoatManagerDetails;
          })
        );
        if (!alive) return;
        setAssociatedBoatManagers(formattedBms);
      }
    }

    // 4) Bateaux utilisateur
    const boatsData = await withTimeout(
      safeQuery(() =>
        supabase
          .from('boat')
          .select('id, name, type, image, id_port, ports(name)')
          .eq('id_user', user.id),
        [] as any[]
      )
    ).catch(() => [] as any[]);

    const formattedBoats = await Promise.all(
      boatsData.map(async (boat: any) => {
        const img = await getAvatarUrl(boat.image);
        return {
          id: String(boat.id),
          name: boat.name,
          type: boat.type,
          image: img || DEFAULT_BOAT_IMAGE,
          portName: boat.ports?.name || 'Port non spécifié',
        } as BoatDetails;
      })
    );
    if (!alive) return;
    setUserBoats(formattedBoats);
  };

  fetchInitialData().catch(devError);
  return () => { alive = false; };
}, [user]); // Added allPorts to dependencies

  useEffect(() => {
  let alive = true;

  (async () => {
    if (!selectedTemporaryPortId) {
      setSelectedTemporaryPort(null);
      setTemporaryBoatManagers([]);
      return;
    }

    const port = allPorts.find(p => p.id === selectedTemporaryPortId);
    if (!port) {
      setSelectedTemporaryPort(null);
      setTemporaryBoatManagers([]);
      return;
    }
    setSelectedTemporaryPort(port);

    const bmPortAssignments = await withTimeout(
      safeQuery(
        () =>
          supabase
            .from('user_ports')
            .select('user_id, ports(name)')
            .eq('port_id', Number(port.id)),
        [] as Array<{ user_id: string | number; ports?: { name?: string } }>
      )
    ).catch(() => [] as Array<{ user_id: string | number; ports?: { name?: string } }>);

    const bmIds = [...new Set(bmPortAssignments.map(r => r.user_id))];
    if (!bmIds.length) { setTemporaryBoatManagers([]); return; }

    const bmsData = await withTimeout(
      safeQuery(
        () =>
          supabase
            .from('users')
            .select('id, first_name, last_name, e_mail, phone, avatar, rating, review_count, bio')
            .in('id', bmIds)
            .eq('profile', 'boat_manager'),
        [] as any[]
      )
    ).catch(() => [] as any[]);

    const formatted = await Promise.all(
      bmsData.map(async (bm: any) => {
        const avatarUrl = await getAvatarUrl(bm.avatar);
        const portName = bmPortAssignments.find(a => a.user_id === bm.id)?.ports?.name ?? port.name;
        return {
          id: String(bm.id),
          name: `${bm.first_name} ${bm.last_name}`,
          email: bm.e_mail,
          phone: bm.phone,
          avatar: avatarUrl || DEFAULT_AVATAR,
          location: portName,
          rating: bm.rating,
          reviewCount: bm.review_count,
          bio: bm.bio || 'Boat Manager à votre écoute',
        } as BoatManagerDetails;
      })
    );

    if (!alive) return;
    setTemporaryBoatManagers(formatted);
  })().catch(devError);

  return () => { alive = false; };
}, [selectedTemporaryPortId, allPorts]);


  // Filter ports based on search query for the modal
  const filteredPorts = allPorts.filter(port =>
  (port.name ?? '').toLowerCase().includes((temporaryPortSearch ?? '').toLowerCase())
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
      devError('Erreur vérification escale :', error);
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

  const handleContactBoatManager = async (bmId: string) => {
  if (!user?.id) return;

  try {
    // 1. Vérifier si une conversation existe déjà (avec exactement ces 2 membres)
    const { data: existingConversations, error: convError } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (convError) {
      devError('Erreur recherche conversation existante:', convError);
      return;
    }

    let conversationId: number | null = null;

    if (existingConversations?.length) {
      const convIds = existingConversations.map(c => c.conversation_id);

      // Vérifie si le BM est aussi dans l'une de ces conversations
      const { data: bmMemberships, error: bmError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', bmId)
        .in('conversation_id', convIds);

      if (!bmError && bmMemberships?.length) {
        conversationId = bmMemberships[0].conversation_id;
      }
    }

    // 2. Si pas de conversation existante → en créer une
    if (!conversationId) {
      const { data: newConv, error: newConvError } = await supabase
        .from('conversations')
        .insert({ is_group: false, // ✅ on garde juste ça
    title: null,  })
        .select('id')
        .single();

      if (newConvError || !newConv) {
        devError('Erreur création conversation:', newConvError);
        return;
      }

      conversationId = newConv.id;

      // Ajouter les 2 membres
      const { error: membersError } = await supabase
        .from('conversation_members')
        .insert([
          { conversation_id: conversationId, user_id: user.id },
          { conversation_id: conversationId, user_id: bmId }
        ]);

      if (membersError) {
        devError('Erreur ajout membres conversation:', membersError);
        return;
      }
    }

    // 3. Redirection vers la conversation
    const targetPath = '/(tabs)/messages';
    const targetParams = { conversationId: conversationId.toString() };
    console.log('Attempting to navigate to:', targetPath, 'with params:', targetParams); // Ligne ajoutée
    router.push({
      pathname: targetPath,
      params: targetParams
    });

  } catch (e) {
    devError('Erreur handleContactBoatManager:', e);
  }
}



// Si TemporaryPortSection est une fonction imbriquée dans HomeScreen, 'user' est déjà accessible.
// Si elle était extraite en dehors, il faudrait la passer en prop.
const TemporaryPortSection = () => {
  // MODIFICATION ICI : Ajouter la condition de rendu
  // Si l'utilisateur n'est pas connecté, ne rien rendre
  if (!user) { // 'user' est accessible depuis la portée de HomeScreen
    return null;
  }

  return (
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
                    source={{ uri: bm.avatar || DEFAULT_AVATAR }}
                    style={styles.temporaryBoatManagerAvatar}
                    onError={() => {
                      if (bm.avatar !== DEFAULT_AVATAR) {
                        setTemporaryBoatManagers(prev =>
                          prev.map(m => m.id === bm.id ? { ...m, avatar: DEFAULT_AVATAR } : m)
                        );
                      }
                    }}
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
                  style={styles.contactBoatManagerButton}
                  onPress={() => handleContactBoatManager(bm.id)}
                >
                  <MessageSquare size={20} color="white" />
                  <Text style={styles.contactBoatManagerText}>Contacter</Text>
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
};

  // Handler for service category/service press
  const handleServiceRequestInitiation = (category: ServiceCategory, service: ServiceCategory['services'][0]) => {
    if (!user?.id) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour effectuer une demande de service.');
      router.push('/login');
      return;
    }

    // Si le service est "Je cherche un bateau", naviguer directement
    if (service.id === 302) { // ID pour "Je cherche un bateau"
      router.push({
        pathname: service.route, // app/services/buy.tsx
        params: {
          serviceCategoryId: service.id, // Passer l'ID de la catégorie de service
        },
      });
      return; // Arrêter la fonction ici
    }

    // Pour les autres services, la logique de sélection de bateau reste la même
    if (userBoats.length === 0) {
      Alert.alert(
        'Aucun bateau enregistré',
        'Veuillez ajouter un bateau à votre profil avant de faire une demande de service.',
        [{ text: 'Ajouter un bateau', onPress: () => router.push('/boats/new') }]
      );
      return;
    }

    setSelectedServiceForRequest({ category, service });

    if (userBoats.length === 1) {
      // Si un seul bateau, le sélectionner automatiquement
      router.push({
        pathname: service.route,
        params: {
          boatId: userBoats[0].id,
          serviceCategoryId: service.id,
        },
      });
    } else {
      // Si plusieurs bateaux, afficher la modale de sélection
      setShowBoatSelectionModal(true);
    }
  };

  const handleSelectBoatForRequest = (boat: BoatDetails) => {
    if (selectedServiceForRequest) {
      router.push({
        pathname: selectedServiceForRequest.service.route,
        params: {
          boatId: boat.id,
          serviceCategoryId: selectedServiceForRequest.service.id,
        },
      });
      setShowBoatSelectionModal(false);
      setSelectedServiceForRequest(null);
    }
  };

  const BoatSelectionModal = () => (
    <Modal
      visible={showBoatSelectionModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBoatSelectionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un bateau</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowBoatSelectionModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.boatList}>
  {userBoats.map((boat) => (
    <TouchableOpacity
      key={boat.id}
      style={styles.boatItem}
      onPress={() => handleSelectBoatForRequest(boat)}
      activeOpacity={0.8}
    >
      <Image
  source={{ uri: boat.image }}
  style={styles.boatItemImage}
  onError={() => {
    setUserBoats(prev =>
      prev.map(b => b.id === boat.id ? { ...b, image: DEFAULT_BOAT_IMAGE } : b)
    );
  }}
/>

      {/* ← Regroupe tout le texte dans une View, et CHAQUE morceau est un <Text> */}
      <View style={styles.boatItemInfo}>
        <Text style={styles.boatItemName}>{String(boat.name ?? '')}</Text>
        <Text style={styles.boatItemDetails}>{String(boat.type ?? '')}</Text>
        <Text style={styles.boatItemPort}>{String(boat.portName ?? '')}</Text>
      </View>

      <View>
        <ChevronRight size={20} color="#666" />
      </View>
    </TouchableOpacity>
  ))}
</ScrollView>
        </View>
      </View>
    </Modal>
  );


  return (
    <ScrollView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?q=80&w=2044&auto=format&fit=crop' }}
        style={styles.heroBackground}>
        <View style={styles.overlay} />
        {/* <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity> */}
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
            <ServiceCategoryCard key={index} category={category} onServicePress={handleServiceRequestInitiation} />
          ))}
        </View>
        
        {/* Vos Boat Managers Section (MODIFIED) */}
        {associatedBoatManagers.length > 0 && (
          <View style={styles.boatManagerSection}>
            <Text style={styles.boatManagerTitle}>Vos Boat Managers</Text>
            {associatedBoatManagers.map((bm) => (
              <View key={bm.id} style={styles.boatManagerCard}>
                <View style={styles.boatManagerHeader}>
                 <Image
  source={{ uri: bm.avatar || DEFAULT_AVATAR }}
  style={styles.boatManagerAvatar}
  onError={() => {
    if (bm.avatar !== DEFAULT_AVATAR) {
      // remplace seulement l’avatar du BM en erreur
      setAssociatedBoatManagers(prev =>
        prev.map(m => m.id === bm.id ? { ...m, avatar: DEFAULT_AVATAR } : m)
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
                    <Text style={styles.boatManagerRole}>Boat Manager</Text>
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
        {!!user && <TemporaryPortSection />}
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

      <BoatSelectionModal />
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
    justifyContent: 'center',
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
    gap: 2,
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
  temporaryBoatManagerContactInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  // Styles for BoatSelectionModal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
  boatList: {
    padding: 16,
  },
  boatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  boatItemImage: { // New style for boat image in modal
    width: 80,
    height: 80,
    marginRight: 12,
    resizeMode: 'cover',
  },
  boatItemInfo: {
    flex: 1,
    paddingVertical: 8, // Add some vertical padding
  },
  boatItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  boatItemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  boatItemPort: { // New style for port name
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});
