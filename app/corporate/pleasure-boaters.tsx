import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, User, ChevronRight, X, Phone, Mail, MapPin, Bot as Boat, Plus, Edit, Trash } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

console.log('DEBUG: Fichier pleasure-boaters.tsx chargé.');

// Définition de l'avatar par défaut
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

// Fonctions utilitaires pour les URLs d'avatars (extraites du fichier de profil)
const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getSignedAvatarUrl = async (value?: string) => {
  console.log('DEBUG: getSignedAvatarUrl appelé avec:', value);
  if (!value) return '';
  if (isHttpUrl(value)) return value;

  const { data, error } = await supabase
    .storage
    .from('avatars')
    .createSignedUrl(value, 60 * 60); // 1h de validité

  if (error || !data?.signedUrl) {
    console.error('DEBUG: Erreur getSignedAvatarUrl:', error);
    return '';
  }
  console.log('DEBUG: getSignedAvatarUrl succès:', data.signedUrl);
  return data.signedUrl;
};

// Interface pour les données brutes du plaisancier récupérées de Supabase
interface RawPleasureBoater {
  id: string;
  first_name: string;
  last_name: string;
  avatar: string;
  e_mail: string;
  phone: string;
  status: 'active' | 'pending' | 'inactive'; // Corresponds to 'status' in DB
  last_login?: string; // Corresponds to 'last_contact' in DB
  created_at: string;
  boat: Array<{
    id: string;
    name: string;
    type: string;
    place_de_port?: string;
  }>;
  user_ports: Array<{
    port_id: number;
    ports: { name: string };
  }>;
}

// Interface pour les données de port traitées pour l'affichage
interface ProcessedPort {
  id: string;
  name: string;
  boatManagerId: string | null;
  boatManagerName: string | null;
}

// Interface pour le plaisancier final après traitement
interface PleasureBoater {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  ports: ProcessedPort[];
  boats: Array<{
    id: string;
    name: string;
    type: string;
    place_de_port?: string;
  }>;
  createdAt: string;
  lastLogin?: string;
  status: 'active' | 'pending' | 'inactive';
}

type SortKey = 'name' | 'port';

// Fonction utilitaire pour formater les dates (déplacée en dehors du composant principal)
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

// --- Modale pour les détails du plaisancier ---
const BoaterDetailsModal = memo(({
  visible,
  onClose,
  selectedBoater,
  handleEditBoater,
}) => {
  console.log('DEBUG: Rendu de BoaterDetailsModal. Visible:', visible, 'Boater:', selectedBoater?.firstName);
  if (!visible || !selectedBoater) {
    return null;
  }

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
            <Text style={styles.modalTitle}>Détails du plaisancier</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.userProfileHeader}>
              <Image source={{ uri: selectedBoater.avatar }} style={styles.userProfileImage} />
              <View style={styles.userProfileInfo}>
                <Text style={styles.userProfileName}>
                  {selectedBoater.firstName} {selectedBoater.lastName}
                </Text>
                <Text style={styles.userProfileDate}>
                  Membre depuis {formatDate(selectedBoater.createdAt)}
                </Text>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Informations de contact</Text>

              <View style={styles.detailItem}>
                <Mail size={20} color="#0066CC" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedBoater.email}</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <Phone size={20} color="#0066CC" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Téléphone</Text>
                  <Text style={styles.detailValue}>{selectedBoater.phone}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Ports d'attache et Boat Managers</Text>

              {selectedBoater.ports.map((port, index) => (
                <View key={index} style={styles.portItem}>
                  <MapPin size={20} color="#0066CC" />
                  <View style={styles.portInfo}>
                    <Text style={styles.portName}>{port.name}</Text>
                    <View style={styles.boatManagerInfo}>
                      <User size={16} color="#0066CC" />
                      <Text style={styles.boatManagerName}>{port.boatManagerName || 'Non assigné'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Bateaux</Text>

              {selectedBoater.boats.length > 0 ? (
                selectedBoater.boats.map((boat) => (
                  <View key={boat.id} style={styles.boatItem}>
                    <Boat size={20} color="#0066CC" />
                    <View style={styles.boatInfo}>
                      <Text style={styles.boatName}>{boat.name}</Text>
                      <Text style={styles.boatType}>{boat.type}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyModalText}>Aucun bateau enregistré.</Text>
              )}
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.detailsSectionTitle}>Activité</Text>

              <View style={styles.activityItem}>
                <Text style={styles.activityLabel}>Dernière connexion</Text>
                <Text style={styles.activityValue}>
                  {selectedBoater.lastLogin ? formatDate(selectedBoater.lastLogin) : 'Jamais'}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.editButton} // Only one button: "Modifier"
                onPress={handleEditBoater}
              >
                <Edit size={20} color="white" />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// --- Modale de confirmation de suppression ---
const DeleteConfirmModal = memo(({
  visible,
  onClose,
  confirmDeleteBoater,
}) => {
  console.log('DEBUG: Rendu de DeleteConfirmModal. Visible:', visible);
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalContent}>
          <Text style={styles.confirmModalTitle}>Confirmer la suppression</Text>
          <Text style={styles.confirmModalText}>
            Êtes-vous sûr de vouloir supprimer ce plaisancier ? Cette action est irréversible.
          </Text>

          <View style={styles.confirmModalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmDeleteButton}
              onPress={confirmDeleteBoater}
            >
              <Text style={styles.confirmDeleteButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

export default function PleasureBoatersScreen () {
  console.log('DEBUG: Début du composant PleasureBoatersScreen');
  const { user, loading: authLoading } = useAuth();
  const [pleasureBoaters, setPleasureBoaters] = useState<PleasureBoater[]>([]);
  const [filteredBoaters, setFilteredBoaters] = useState<PleasureBoater[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedBoater, setSelectedBoater] = useState<PleasureBoater | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<TextInput>(null); // Create a ref for the TextInput

  // Get unique ports for filtering (from fetched data)
  const uniquePorts = useMemo(() => {
    const ports = new Set<string>();
    pleasureBoaters.forEach(boater => {
      boater.ports.forEach(port => ports.add(port.name));
    });
    return Array.from(ports);
  }, [pleasureBoaters]);

  const fetchPleasureBoaters = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log('DEBUG: Début de fetchPleasureBoaters');

    try {
      // 1. Fetch all pleasure boaters with their boats and user_ports
      const { data: rawBoaters, error: boaterError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          avatar,
          e_mail,
          phone,
          status,
          last_login,
          created_at,
          boat(id, name, type, place_de_port),
          user_ports(port_id, ports(name))
        `)
        .eq('profile', 'pleasure_boater');

      if (boaterError) throw boaterError;
      console.log('DEBUG: Données brutes des plaisanciers récupérées:', rawBoaters);

      // 2. Fetch all boat managers and their port assignments
      const { data: rawBoatManagers, error: bmError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          user_ports(port_id)
        `)
        .eq('profile', 'boat_manager');

      if (bmError) throw bmError;
      console.log('DEBUG: Boat Managers bruts récupérés:', rawBoatManagers);

      // Create a map of port_id to boat_manager_name
      const portToBmMap = new Map<number, { id: string; name: string }>();
      rawBoatManagers.forEach(bm => {
        bm.user_ports.forEach(up => {
          portToBmMap.set(up.port_id, { id: bm.id, name: `${bm.first_name} ${bm.last_name}` });
        });
      });
      console.log('DEBUG: Map portToBmMap créée:', portToBmMap);

      // 3. Process raw boater data
      const processedBoaters: PleasureBoater[] = await Promise.all(rawBoaters.map(async (rawBoater: RawPleasureBoater) => {
        const avatarUrl = await getSignedAvatarUrl(rawBoater.avatar);

        const processedPorts: ProcessedPort[] = rawBoater.user_ports.map(up => {
          const bmInfo = portToBmMap.get(up.port_id);
          return {
            id: up.port_id.toString(),
            name: up.ports.name,
            boatManagerId: bmInfo?.id || null,
            boatManagerName: bmInfo?.name || null,
          };
        });

        return {
          id: rawBoater.id,
          firstName: rawBoater.first_name,
          lastName: rawBoater.last_name,
          email: rawBoater.e_mail,
          phone: rawBoater.phone,
          avatar: avatarUrl || DEFAULT_AVATAR,
          ports: processedPorts,
          boats: rawBoater.boat || [],
          createdAt: rawBoater.created_at,
          lastLogin: rawBoater.last_login || undefined,
          status: rawBoater.status,
        };
      }));
      console.log('DEBUG: Plaisanciers traités:', processedBoaters);

      setPleasureBoaters(processedBoaters);
      console.log('DEBUG: pleasureBoaters mis à jour. Nombre:', processedBoaters.length);

    } catch (e: any) {
      console.error('DEBUG: Erreur dans fetchPleasureBoaters:', e.message);
      setError('Échec du chargement des plaisanciers.');
    } finally {
      setLoading(false);
      console.log('DEBUG: Fin de fetchPleasureBoaters. Loading:', false);
    }
  }, []);

  // Use useFocusEffect to re-fetch pleasure boaters when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('DEBUG: useFocusEffect déclenché.');
      fetchPleasureBoaters();
      // No cleanup needed for this effect, as it's just fetching data
    }, [fetchPleasureBoaters]) // Dependency on the memoized fetch function
  );

  // Apply filters and sorting
  useEffect(() => {
    console.log('DEBUG: Exécution du useEffect de filtrage/tri');
    let result = [...pleasureBoaters];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(boater =>
        `${boater.firstName} ${boater.lastName}`.toLowerCase().includes(query) ||
        boater.email.toLowerCase().includes(query) ||
        boater.phone.toLowerCase().includes(query) ||
        boater.ports.some(port => port.name.toLowerCase().includes(query)) ||
        boater.ports.some(port => (port.boatManagerName || '').toLowerCase().includes(query)) ||
        boater.boats.some(boat => boat.name.toLowerCase().includes(query))
      );
    }

    // Apply port filter
    if (selectedPort) {
      result = result.filter(boater => boater.ports.some(port => port.name === selectedPort));
    }

    // Apply sorting
    result.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (sortKey) {
        case 'name':
          // MODIFICATION ICI : Tri par nom de famille
          valueA = a.lastName.toLowerCase();
          valueB = b.lastName.toLowerCase();
          break;
        case 'port':
          valueA = a.ports[0]?.name.toLowerCase() || '';
          valueB = b.ports[0]?.name.toLowerCase() || '';
          break;
        default:
          // Fallback to sorting by full name if sortKey is not 'name' or 'port'
          valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
      }

      if (valueA < valueB) return sortAsc ? -1 : 1;
      if (valueA > valueB) return sortAsc ? 1 : -1;
      return 0;
    });

    setFilteredBoaters(result);
    console.log('DEBUG: filteredBoaters mis à jour. Nombre:', result.length);
  }, [pleasureBoaters, searchQuery, selectedPort, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    console.log('DEBUG: handleSort appelé avec la clé:', key);
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleViewDetails = (boater: PleasureBoater) => {
    console.log('DEBUG: handleViewDetails appelé pour le plaisancier:', boater.id);
    setSelectedBoater(boater);
    setShowDetailsModal(true);
  };

  const handleAddBoater = () => {
    console.log('DEBUG: handleAddBoater appelé.');
    router.push('/corporate/pleasure-boaters/new');
  };

  const handleEditBoater = () => {
    console.log('DEBUG: handleEditBoater appelé pour le plaisancier:', selectedBoater?.id);
    if (selectedBoater) {
      setShowDetailsModal(false);
      router.push(`/corporate/pleasure-boaters/${selectedBoater.id}/edit`);
    }
  };

  const handleDeleteBoater = () => {
    console.log('DEBUG: handleDeleteBoater appelé.');
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteBoater = async () => {
    console.log('DEBUG: confirmDeleteBoater appelé pour le plaisancier:', selectedBoater?.id);
    if (!selectedBoater) return;

    setLoading(true);
    try {
      // 1. Get all related IDs for cascade deletion
      const { data: boaterBoats, error: boatsError } = await supabase
        .from('boat')
        .select('id')
        .eq('id_user', selectedBoater.id);
      if (boatsError) throw boatsError;
      const boatIds = boaterBoats.map(b => b.id);
      console.log('DEBUG: Bateaux du plaisancier à supprimer:', boatIds);

      const { data: boaterServiceRequests, error: srError } = await supabase
        .from('service_request')
        .select('id')
        .eq('id_client', selectedBoater.id);
      if (srError) throw srError;
      const serviceRequestIds = boaterServiceRequests.map(sr => sr.id);
      console.log('DEBUG: Demandes de service du plaisancier à supprimer:', serviceRequestIds);

      const { data: boaterQuotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id')
        .eq('id_client', selectedBoater.id);
      if (quotesError) throw quotesError;
      const quoteIds = boaterQuotes.map(q => q.id);
      console.log('DEBUG: Devis du plaisancier à supprimer:', quoteIds);

      // 2. Delete from leaf tables upwards
      // Delete quote_items and quote_documents related to quotes
      if (quoteIds.length > 0) {
        console.log('DEBUG: Suppression des quote_items pour les devis:', quoteIds);
        await supabase.from('quote_items').delete().in('quote_id', quoteIds);
        console.log('DEBUG: Suppression des quote_documents pour les devis:', quoteIds);
        await supabase.from('quote_documents').delete().in('quote_id', quoteIds);
      }

      // Delete reviews related to service_requests
      if (serviceRequestIds.length > 0) {
        console.log('DEBUG: Suppression des reviews pour les demandes de service:', serviceRequestIds);
        await supabase.from('reviews').delete().in('service_request_id', serviceRequestIds);
      }

      // Delete boat_inventory, user_documents, boat_technical_records, boat_usage_types related to boats
      if (boatIds.length > 0) {
        console.log('DEBUG: Suppression des boat_inventory pour les bateaux:', boatIds);
        await supabase.from('boat_inventory').delete().in('boat_id', boatIds);
        console.log('DEBUG: Suppression des user_documents pour les bateaux:', boatIds);
        await supabase.from('user_documents').delete().in('id_boat', boatIds);
        console.log('DEBUG: Suppression des boat_technical_records pour les bateaux:', boatIds);
        await supabase.from('boat_technical_records').delete().in('boat_id', boatIds);
        console.log('DEBUG: Suppression des boat_usage_types pour les bateaux:', boatIds);
        await supabase.from('boat_usage_types').delete().in('boat_id', boatIds);
      }

      // 3. Delete main records
      console.log('DEBUG: Suppression des devis principaux:', quoteIds);
      await supabase.from('quotes').delete().in('id', quoteIds);
      console.log('DEBUG: Suppression des demandes de service principales:', serviceRequestIds);
      await supabase.from('service_request').delete().in('id', serviceRequestIds);
      console.log('DEBUG: Suppression des bateaux principaux:', boatIds);
      await supabase.from('boat').delete().in('id', boatIds);
      console.log('DEBUG: Suppression des user_ports pour le plaisancier:', selectedBoater.id);
      await supabase.from('user_ports').delete().eq('user_id', selectedBoater.id);

      // 4. Finally, delete the user
      console.log('DEBUG: Suppression de l\'utilisateur plaisancier:', selectedBoater.id);
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', selectedBoater.id);

      if (deleteUserError) {
        throw deleteUserError;
      }

      Alert.alert('Succès', 'Le plaisancier a été supprimé avec succès.');
      setShowDeleteConfirmModal(false);
      setShowDetailsModal(false);
      fetchPleasureBoaters(); // Re-fetch the list to update UI
    } catch (e: any) {
      console.error('DEBUG: Erreur lors de la suppression du plaisancier:', e.message);
      Alert.alert('Erreur', `Échec de la suppression du plaisancier: ${e.message}`);
    } finally {
      setLoading(false);
      console.log('DEBUG: Fin de confirmDeleteBoater. Loading:', false);
    }
  };

  if (authLoading) {
    console.log('DEBUG: Auth loading, affichage de l\'indicateur.');
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement de l'authentification...</Text>
      </View>
    );
  }

  if (!user) {
    console.log('DEBUG: Utilisateur non authentifié, affichage du message d\'erreur.');
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Accès non autorisé. Veuillez vous connecter.</Text>
      </View>
    );
  }

  if (loading) {
    console.log('DEBUG: Données des plaisanciers en cours de chargement.');
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des plaisanciers...</Text>
      </View>
    );
  }

  if (error) {
    console.log('DEBUG: Erreur lors du chargement des plaisanciers:', error);
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Plaisanciers</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddBoater}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TouchableOpacity // Wrap Search icon and TextInput in TouchableOpacity
          style={styles.searchInputContainer}
          onPress={() => searchInputRef.current?.focus()} // Focus TextInput on press
        >
          <Search size={20} color="#666" />
          <TextInput
            ref={searchInputRef} // Assign ref to TextInput
            style={styles.searchInput}
            placeholder="Rechercher un plaisancier..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </TouchableOpacity>

        {showFilters && (
          <View style={styles.filtersContainer}>
            <Text style={styles.filterTitle}>Port d'attache</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  selectedPort === null && styles.filterOptionSelected
                ]}
                onPress={() => setSelectedPort(null)}
              >
                <Text style={styles.filterOptionText}>Tous</Text>
              </TouchableOpacity>

              {uniquePorts.map((port) => (
                <TouchableOpacity
                  key={port}
                  style={[
                    styles.filterOption,
                    selectedPort === port && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedPort(port)}
                >
                  <MapPin size={16} color="#0066CC" />
                  <Text style={styles.filterOptionText}>{port}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? "#0066CC" : "#666"} />
        </TouchableOpacity>
      </View>

      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortKey === 'name' && styles.sortButtonActive]}
          onPress={() => handleSort('name')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'name' && styles.sortButtonTextActive]}>
            Nom {sortKey === 'name' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sortButton, sortKey === 'port' && styles.sortButtonActive]}
          onPress={() => handleSort('port')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'port' && styles.sortButtonTextActive]}>
            Port {sortKey === 'port' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.boatersList}>
        {filteredBoaters.length > 0 ? (
          filteredBoaters.map((boater) => (
            <TouchableOpacity
              key={boater.id}
              style={styles.boaterCard}
              onPress={() => handleViewDetails(boater)}
            >
              <View style={styles.boaterInfo}>
                <Text style={styles.boaterName}>
                  {boater.firstName} {boater.lastName}
                </Text>
                <Text style={styles.boaterPort}>
                  {boater.ports.map(port => port.name).join(', ')}
                </Text>
              </View>
              <ChevronRight size={24} color="#0066CC" />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <User size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucun plaisancier trouvé</Text>
            <Text style={styles.emptyStateText}>
              Aucun plaisancier ne correspond à vos critères de recherche.
            </Text>
          </View>
        )}
      </ScrollView>

      <BoaterDetailsModal
        visible={showDetailsModal}
        onClose={() => {
          console.log('DEBUG: Fermeture de BoaterDetailsModal.');
          setShowDetailsModal(false);
        }}
        selectedBoater={selectedBoater}
        handleEditBoater={handleEditBoater}
      />
      <DeleteConfirmModal
        visible={showDeleteConfirmModal}
        onClose={() => {
          console.log('DEBUG: Fermeture de DeleteConfirmModal.');
          setShowDeleteConfirmModal(false);
        }}
        confirmDeleteBoater={confirmDeleteBoater}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
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
  searchInputContainer: { // New style for the TouchableOpacity wrapper
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc', // Changed to match the input background
    borderRadius: 12,
    borderWidth: 1, // Added border to match input style
    borderColor: '#e2e8f0', // Added border color
    paddingHorizontal: 12, // Adjusted padding
    height: 48, // Fixed height
  },
  searchInput: {
    flex: 1,
    marginLeft: 8, // Adjusted margin
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  filtersContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
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
  filterTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  sortButtonActive: {
    backgroundColor: '#f0f7ff',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#0066CC',
    fontWeight: '500',
  },
  boatersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  boaterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  boaterInfo: {
    flex: 1,
  },
  boaterName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  boaterPort: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
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
  confirmModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    padding: 24,
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
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  confirmModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  userProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  userProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userProfileInfo: {
    flex: 1,
  },
  userProfileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userProfileDate: {
    fontSize: 14,
    color: '#666',
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  portItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  portInfo: {
    flex: 1,
  },
  portName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  boatManagerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatManagerName: {
    fontSize: 14,
    color: '#0066CC',
  },
  boatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  boatInfo: {
    flex: 1,
  },
  boatName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  boatType: {
    fontSize: 14,
    color: '#666',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityLabel: {
    fontSize: 14,
    color: '#666',
  },
  activityValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 8,
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
  editButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxBoxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
      },
    }),
  },
  deleteButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});

