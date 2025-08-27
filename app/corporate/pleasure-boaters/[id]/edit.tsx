import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, Filter, User, ChevronRight, X, Phone, Mail, MapPin, Bot as Boat, Plus, Edit, Trash } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import PortSelectionModal from '@/components/PortSelectionModal'; // Import PortSelectionModal

// Définition de l'avatar par défaut
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

// Fonctions utilitaires pour les URLs d'avatars (extraites du fichier de profil)
const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getSignedAvatarUrl = async (value?: string) => {
  if (!value) return '';
  if (isHttpUrl(value)) return value;

  const { data, error } = await supabase
    .storage
    .from('avatars')
    .createSignedUrl(value, 60 * 60); // 1h de validité

  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
};

// Interface pour un port avec son Boat Manager (tel qu'affiché/sélectionné dans l'UI)
interface EditablePort {
  portId: string;
  portName: string;
  assignedBmId: string | null;
  assignedBmName: string | null;
}

// Interface pour les données du formulaire du plaisancier
interface PleasureBoaterForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  ports: EditablePort[]; // Les ports du plaisancier avec le BM sélectionné
}

// Interface pour un Boat Manager (pour la sélection)
interface BoatManagerOption {
  id: string;
  name: string;
  ports: string[]; // Noms des ports gérés par ce BM
}

// --- Modale pour la sélection du Boat Manager ---
const BoatManagerSelectionModal = memo(({
  visible,
  onClose,
  availableBoatManagers,
  onSelectBm,
  currentSelectedBmId,
  portName,
}) => {
  const [searchBmQuery, setSearchBmQuery] = useState('');

  const filteredBms = availableBoatManagers.filter(bm =>
    bm.name.toLowerCase().includes(searchBmQuery.toLowerCase()) ||
    bm.ports.some(p => p.toLowerCase().includes(searchBmQuery.toLowerCase()))
  );

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
            <Text style={styles.modalTitle}>Sélectionner un Boat Manager pour {portName}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un Boat Manager..."
              value={searchBmQuery}
              onChangeText={setSearchBmQuery}
            />
          </View>

          <ScrollView style={styles.modalBody}>
            {filteredBms.length > 0 ? (
              filteredBms.map(bm => (
                <TouchableOpacity
                  key={bm.id}
                  style={[
                    styles.modalItem,
                    currentSelectedBmId === bm.id && styles.modalItemSelected
                  ]}
                  onPress={() => onSelectBm(bm)}
                >
                  <User size={20} color={currentSelectedBmId === bm.id ? '#0066CC' : '#666'} />
                  <View style={styles.modalItemInfo}>
                    <Text style={[
                      styles.modalItemText,
                      currentSelectedBmId === bm.id && styles.modalItemTextSelected
                    ]}>
                      {bm.name}
                    </Text>
                    <Text style={styles.modalItemSubtext}>{bm.ports.join(', ')}</Text>
                  </View>
                  {currentSelectedBmId === bm.id && (
                    <Check size={20} color="#0066CC" />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyModalText}>Aucun Boat Manager trouvé.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
});

export default function EditPleasureBoaterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [formData, setFormData] = useState<PleasureBoaterForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: DEFAULT_AVATAR,
    ports: [],
  });
  const [errors, setErrors] = useState<Partial<PleasureBoaterForm>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [allPorts, setAllPorts] = useState<{ id: string; name: string }[]>([]);
  const [allBoatManagers, setAllBoatManagers] = useState<BoatManagerOption[]>([]);

  const [showBmSelectionModal, setShowBmSelectionModal] = useState(false);
  const [showPortSelectionModal, setShowPortSelectionModal] = useState(false); // NEW STATE
  const [currentPortForBmSelection, setCurrentPortForBmSelection] = useState<EditablePort | null>(null);

  const [portSearch, setPortSearch] = useState(''); // NEW STATE for port search in modal

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!id) {
        console.log('DEBUG: ID du plaisancier est manquant.');
        setFetchError('ID du plaisancier manquant.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        console.log('DEBUG: Tentative de récupération du plaisancier avec ID:', id);
        // 1. Fetch all ports
        const { data: portsData, error: portsError } = await supabase
          .from('ports')
          .select('id, name');
        if (portsError) {
          console.error('DEBUG: Erreur lors de la récupération des ports:', portsError);
          throw portsError;
        }
        setAllPorts(portsData.map(p => ({ id: p.id.toString(), name: p.name })));

        // 2. Fetch all boat managers
        const { data: bmsData, error: bmsError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            user_ports(port_id, ports(name))
          `)
          .eq('profile', 'boat_manager');
        if (bmsError) {
          console.error('DEBUG: Erreur lors de la récupération des Boat Managers:', bmsError);
          throw bmsError;
        }

        const processedBms: BoatManagerOption[] = bmsData.map(bm => ({
          id: bm.id,
          name: `${bm.first_name} ${bm.last_name}`,
          ports: bm.user_ports.map((up: any) => up.ports?.name).filter(Boolean),
        }));
        setAllBoatManagers(processedBms);

        // 3. Fetch pleasure boater details
        const { data: boaterData, error: boaterError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            e_mail,
            phone,
            avatar,
            user_ports(port_id)
          `)
          .eq('id', id)
          .eq('profile', 'pleasure_boater')
          .single();

        if (boaterError) {
          console.log('DEBUG: Aucune donnée de plaisancier retournée pour l\'ID:', id);
          throw boaterError;
        }

        console.log('DEBUG: Données du plaisancier récupérées avec succès:', boaterData);
        const signedAvatar = await getSignedAvatarUrl(boaterData.avatar);

        // Populate form data
        const boaterPorts: EditablePort[] = boaterData.user_ports.map((up: any) => {
          const portName = portsData.find(p => p.id === up.port_id)?.name || 'Port inconnu';
          // Find a BM implicitly assigned to this port (for display purposes only)
          const bmForPort = processedBms.find(bm => bm.ports.includes(portName));
          return {
            portId: up.port_id.toString(),
            portName: portName,
            assignedBmId: bmForPort?.id || null,
            assignedBmName: bmForPort?.name || null,
          };
        });

        setFormData({
          firstName: boaterData.first_name,
          lastName: boaterData.last_name,
          email: boaterData.e_mail,
          phone: boaterData.phone,
          avatar: signedAvatar || DEFAULT_AVATAR,
          ports: boaterPorts,
        });

      } catch (e: any) {
        console.error('DEBUG: Erreur inattendue dans fetchInitialData:', e);
        setFetchError('Échec du chargement des données du plaisancier.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id]);

  const validateForm = () => {
    const newErrors: Partial<PleasureBoaterForm> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim()) newErrors.lastName = 'Le nom est requis';
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Le téléphone est requis';
    if (formData.ports.length === 0) newErrors.ports = 'Au moins un port d\'attache est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // 1. Update pleasure boater's personal details
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          e_mail: formData.email,
          phone: formData.phone,
          // avatar is not updated here, handled separately
        })
        .eq('id', id);

      if (userUpdateError) throw userUpdateError;

      // 2. Update pleasure boater's ports (delete existing, insert new ones)
      // First, delete all existing port assignments for this user
      const { error: deletePortsError } = await supabase
        .from('user_ports')
        .delete()
        .eq('user_id', id);
      if (deletePortsError) throw deletePortsError;

      // Then, insert the new port assignments
      const newPortAssignments = formData.ports.map(p => ({
        user_id: id,
        port_id: parseInt(p.portId),
        // Note: assignedBmId cannot be saved here with current schema
      }));
      const { error: insertPortsError } = await supabase
        .from('user_ports')
        .insert(newPortAssignments);
      if (insertPortsError) throw insertPortsError;

      Alert.alert('Succès', 'Le plaisancier a été mis à jour avec succès.');
      router.back();

    } catch (e: any) {
      console.error('Error updating pleasure boater:', e);
      Alert.alert('Erreur', `Échec de la mise à jour du plaisancier: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoater = async () => {
    Alert.alert(
      'Supprimer le plaisancier',
      'Êtes-vous sûr de vouloir supprimer ce plaisancier ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // 1. Delete the user (and all related data via ON DELETE CASCADE in DB)
              // The SQL commands provided previously (ON DELETE CASCADE) will handle
              // the deletion of related records in 'quotes', 'service_request', 'boat',
              // 'user_ports', 'reviews', 'quote_items', 'quote_documents',
              // 'boat_inventory', 'user_documents', 'boat_technical_records', 'boat_usage_types', etc.
              // if the foreign keys are correctly configured in the database.

              const { error: deleteUserError } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

              if (deleteUserError) {
                throw deleteUserError;
              }

              Alert.alert('Succès', 'Le plaisancier a été supprimé avec succès.');
              router.back(); // Go back to the list, which will trigger a re-fetch
            } catch (e: any) {
              console.error('Error deleting boater:', e.message);
              Alert.alert('Erreur', `Échec de la suppression du plaisancier: ${e.message}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleAddPort = (port: { id: string; name: string }) => {
    if (!formData.ports.some(p => p.portId === port.id)) {
      setFormData(prev => ({
        ...prev,
        ports: [...prev.ports, { portId: port.id, portName: port.name, assignedBmId: null, assignedBmName: null }]
      }));
      if (errors.ports) setErrors(prev => ({ ...prev, ports: undefined }));
    }
    
    setPortSearch(''); // Clear search after selection
    setShowPortSelectionModal(false); // Close the port selection modal
  };

  const handleRemovePort = (portId: string) => {
    setFormData(prev => ({
      ...prev,
      ports: prev.ports.filter(p => p.portId !== portId)
    }));
  };

  const handleSelectBmForPort = (selectedBm: BoatManagerOption) => {
    if (currentPortForBmSelection) {
      setFormData(prev => ({
        ...prev,
        ports: prev.ports.map(p =>
          p.portId === currentPortForBmSelection.portId
            ? { ...p, assignedBmId: selectedBm.id, assignedBmName: selectedBm.name }
            : p
        ),
      }));
    }
    setShowBmSelectionModal(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des données du plaisancier...</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{fetchError}</Text>
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
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Modifier le plaisancier</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <View style={styles.profileImageContainer}>
            <Image source={{ uri: formData.avatar }} style={styles.profileImage} />
            {/* Avatar editing logic would go here if needed */}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Prénom</Text>
            <View style={[styles.inputWrapper, errors.firstName && styles.inputWrapperError]}>
              <User size={20} color={errors.firstName ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                placeholder="Prénom"
                autoCapitalize="words"
              />
            </View>
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom</Text>
            <View style={[styles.inputWrapper, errors.lastName && styles.inputWrapperError]}>
              <User size={20} color={errors.lastName ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                placeholder="Nom"
                autoCapitalize="words"
              />
            </View>
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
              <Mail size={20} color={errors.email ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
              <Phone size={20} color={errors.phone ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                placeholder="Téléphone"
                keyboardType="phone-pad"
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>
        </View>
        
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ports d'attache</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowPortSelectionModal(true)} // CORRECTED: Open PortSelectionModal
            >
              <Plus size={20} color="#0066CC" />
              <Text style={styles.addButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
          
          {errors.ports && <Text style={styles.errorText}>{errors.ports}</Text>}
          
          {formData.ports.length > 0 ? (
            <View style={styles.portsList}>
              {formData.ports.map((port) => (
                <View key={port.portId} style={styles.portItem}>
                  <View style={styles.portInfo}>
                    <MapPin size={20} color="#0066CC" />
                    <Text style={styles.portName}>{port.portName}</Text>
                  </View>
                  <View style={styles.portActions}>
                    <TouchableOpacity
                      style={styles.assignBmButton}
                      onPress={() => {
                        setCurrentPortForBmSelection(port);
                        setShowBmSelectionModal(true);
                      }}
                    >
                      <User size={16} color="#0066CC" />
                      <Text style={styles.assignBmText}>
                        {port.assignedBmName || 'Assigner un BM'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removePortButton}
                      onPress={() => handleRemovePort(port.portId)}
                    >
                      <X size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun port d'attache assigné.</Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={handleDeleteBoater}
        >
          <Trash size={20} color="#ff4444" />
          <Text style={styles.deleteAccountButtonText}>Supprimer le plaisancier</Text>
        </TouchableOpacity>
      </View>

      <BoatManagerSelectionModal
        visible={showBmSelectionModal}
        onClose={() => setShowBmSelectionModal(false)}
        availableBoatManagers={allBoatManagers}
        onSelectBm={handleSelectBmForPort}
        currentSelectedBmId={currentPortForBmSelection?.assignedBmId || null}
        portName={currentPortForBmSelection?.portName || ''}
      />

      {/* Port Selection Modal */}
      <PortSelectionModal
        visible={showPortSelectionModal}
        onClose={() => setShowPortSelectionModal(false)}
        onSelectPort={handleAddPort}
        selectedPortId={null} // No pre-selected port when adding
        portsData={allPorts}
        searchQuery={portSearch}
        onSearchQueryChange={setPortSearch}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  form: {
    padding: 16,
    gap: 24,
  },
  formSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  profileImageContainer: {
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#0066CC',
  },
  inputContainer: {
    gap: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  portsList: {
    gap: 12,
  },
  portItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  portInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  portName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  portActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assignBmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'white',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  assignBmText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
  removePortButton: {
    padding: 4,
  },
  emptyState: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
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
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  deleteAccountButtonText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '500',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  modalBody: {
    padding: 16,
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalItemTextSelected: {
    color: '#0066CC',
    fontWeight: '500',
  },
  modalItemSubtext: {
    fontSize: 12,
    color: '#666',
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  textAreaWrapper: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    minHeight: 120, // Increased minHeight for biography
  },
  textArea: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    textAlignVertical: 'top',
  },
});

