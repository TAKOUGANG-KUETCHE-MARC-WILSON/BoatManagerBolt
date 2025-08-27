import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, Filter, User, ChevronRight, X, Phone, Mail, MapPin, Bot as Boat, Plus, Edit, Trash, Briefcase, Ship } from 'lucide-react-native';
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

// Interface pour les données du formulaire du Boat Manager
interface BoatManagerForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  jobTitle: string;
  experience: string;
  certifications: string[];
  bio: string;
  ports: EditablePort[];
  skills: string[]; // Added for skills (categorie_service.description1)
  boatTypes: string[]; // Added for boat types (static list for now)
}

// Interface pour un Boat Manager (pour la sélection)
interface BoatManagerOption {
  id: string;
  name: string;
  ports: string[]; // Noms des ports gérés par ce BM
}

// Interface pour les catégories de service (compétences)
interface ServiceCategory {
  id: number;
  description1: string;
}

// Hardcoded boat types (from app/corporate/boat-managers/new.tsx)
const staticBoatTypes = ['Voilier', 'Yacht', 'Catamaran', 'Motoryacht', 'Semi-rigide', 'Péniche'];

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

export default function EditBoatManagerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [formData, setFormData] = useState<BoatManagerForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: DEFAULT_AVATAR,
    jobTitle: '',
    experience: '',
    certifications: [],
    bio: '',
    ports: [],
    skills: [],
    boatTypes: [],
  });
  const [errors, setErrors] = useState<Partial<BoatManagerForm>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [allPorts, setAllPorts] = useState<{ id: string; name: string }[]>([]);
  const [allBoatManagers, setAllBoatManagers] = useState<BoatManagerOption[]>([]);
  const [allServiceCategories, setAllServiceCategories] = useState<ServiceCategory[]>([]); // For skills

  const [showBmSelectionModal, setShowBmSelectionModal] = useState(false);
  const [showPortSelectionModal, setShowPortSelectionModal] = useState(false); // New state for PortSelectionModal
  const [currentPortForBmSelection, setCurrentPortForBmSelection] = useState<EditablePort | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchBoatManagerData = async () => {
      if (!id || typeof id !== 'string') {
        setFetchError('ID du Boat Manager manquant.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      try {
        // 1. Fetch all ports
        const { data: portsData, error: portsError } = await supabase
          .from('ports')
          .select('id, name');
        if (portsError) {
          console.error('Error fetching ports:', portsError);
          throw portsError;
        }
        setAllPorts(portsData.map(p => ({ id: p.id.toString(), name: p.name })));

        // 2. Fetch all service categories (for skills)
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categorie_service')
          .select('id, description1');
        if (categoriesError) {
          console.error('Error fetching service categories:', categoriesError);
          throw categoriesError;
        }
        setAllServiceCategories(categoriesData);

        // 3. Fetch all other boat managers (for assignment modal)
        const { data: otherBmsData, error: otherBmsError } = await supabase
          .from('users')
          .select(`
            id,
            first_name,
            last_name,
            user_ports(port_id, ports(name))
          `)
          .eq('profile', 'boat_manager')
          .neq('id', id); // Exclude current BM from list of assignable BMs
        if (otherBmsError) {
          console.error('Error fetching other Boat Managers:', otherBmsError);
          throw otherBmsError;
        }

        const processedOtherBms: BoatManagerOption[] = otherBmsData.map(bm => ({
          id: bm.id,
          name: `${bm.first_name} ${bm.last_name}`,
          ports: bm.user_ports.map((up: any) => up.ports?.name).filter(Boolean),
        }));
        setAllBoatManagers(processedOtherBms);

        // 4. Fetch current Boat Manager details
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
            user_ports(port_id),
            user_categorie_service(categorie_service(description1))
          `)
          .eq('id', id)
          .eq('profile', 'boat_manager')
          .single();

        if (bmError) {
          console.error('Error fetching current Boat Manager:', bmError);
          setFetchError('Boat Manager non trouvé.');
          return;
        }

        const signedAvatar = await getSignedAvatarUrl(bmData.avatar);

        const bmPorts: EditablePort[] = bmData.user_ports.map((up: any) => {
          const portName = portsData.find(p => p.id === up.port_id)?.name || 'Port inconnu';
          // For the current BM, assignedBmId/Name would be null as they are the manager
          return {
            portId: up.port_id.toString(),
            portName: portName,
            assignedBmId: null,
            assignedBmName: null,
          };
        });

        const bmSkills: string[] = bmData.user_categorie_service.map((ucs: any) => ucs.categorie_service?.description1).filter(Boolean);

        setFormData({
          firstName: bmData.first_name,
          lastName: bmData.last_name,
          email: bmData.e_mail,
          phone: bmData.phone,
          avatar: signedAvatar || DEFAULT_AVATAR,
          jobTitle: bmData.job_title || '',
          experience: bmData.experience || '',
          certifications: bmData.certification || [],
          bio: bmData.bio || '',
          ports: bmPorts,
          skills: bmSkills,
          boatTypes: [], // Initialize as empty, as not stored in DB per BM
        });

      } catch (e: any) {
        console.error('Unexpected error fetching BM data:', e);
        setFetchError('Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
    };

    fetchBoatManagerData();
  }, [id]);

  const validateForm = () => {
    const newErrors: Partial<BoatManagerForm> = {};
    
    if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!formData.lastName.trim()) newErrors.lastName = 'Le nom est requis';
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Le téléphone est requis';
    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'La fonction est requise';
    if (!formData.experience.trim()) newErrors.experience = 'L\'expérience est requise';
    if (formData.certifications.length === 0) newErrors.certifications = 'Au moins une certification est requise';
    if (!formData.bio.trim()) newErrors.bio = 'La biographie est requise';
    if (formData.ports.length === 0) newErrors.ports = 'Au moins un port d\'attache est requis';
    if (formData.skills.length === 0) newErrors.skills = 'Au moins une compétence est requise';
    // No validation for boatTypes as they are not persisted

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // 1. Update Boat Manager's personal details
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          e_mail: formData.email,
          phone: formData.phone,
          job_title: formData.jobTitle,
          experience: formData.experience,
          certification: formData.certifications,
          bio: formData.bio,
        })
        .eq('id', id);

      if (userUpdateError) throw userUpdateError;

      // 2. Update Boat Manager's ports (delete existing, insert new ones)
      const { error: deletePortsError } = await supabase
        .from('user_ports')
        .delete()
        .eq('user_id', id);
      if (deletePortsError) throw deletePortsError;

      const newPortAssignments = formData.ports.map(p => ({
        user_id: id,
        port_id: parseInt(p.portId),
      }));
      const { error: insertPortsError } = await supabase
        .from('user_ports')
        .insert(newPortAssignments);
      if (insertPortsError) throw insertPortsError;

      // 3. Update Boat Manager's skills (delete existing, insert new ones)
      const { error: deleteSkillsError } = await supabase
        .from('user_categorie_service')
        .delete()
        .eq('user_id', id);
      if (deleteSkillsError) throw deleteSkillsError;

      const newSkillAssignments = formData.skills.map(skillDescription => {
        const category = allServiceCategories.find(cat => cat.description1 === skillDescription);
        if (!category) {
          console.warn(`Service category "${skillDescription}" not found in DB.`);
          return null;
        }
        return {
          user_id: id,
          categorie_service_id: category.id,
        };
      }).filter(Boolean); // Filter out nulls

      if (newSkillAssignments.length > 0) {
        const { error: insertSkillsError } = await supabase
          .from('user_categorie_service')
          .insert(newSkillAssignments);
        if (insertSkillsError) throw insertSkillsError;
      }

      Alert.alert('Succès', 'Le Boat Manager a été mis à jour avec succès.');
      router.back();

    } catch (e: any) {
      console.error('Error updating Boat Manager:', e);
      Alert.alert('Erreur', `Échec de la mise à jour du Boat Manager: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteManager = async () => {
    Alert.alert(
      'Supprimer le Boat Manager',
      'Êtes-vous sûr de vouloir supprimer ce Boat Manager ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // The ON DELETE CASCADE in the database should handle related records.
              // We only need to delete the user from the 'users' table.
              const { error: deleteUserError } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

              if (deleteUserError) {
                throw deleteUserError;
              }

              Alert.alert('Succès', 'Le Boat Manager a été supprimé avec succès.');
              router.back(); // Go back to the list, which will trigger a re-fetch
            } catch (e: any) {
              console.error('Error deleting Boat Manager:', e.message);
              Alert.alert('Erreur', `Échec de la suppression du Boat Manager: ${e.message}`);
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
    setShowPortSelectionModal(false); // Close the port selection modal after adding
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

  const toggleSkill = (skillDescription: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skillDescription)
        ? prev.skills.filter(s => s !== skillDescription)
        : [...prev.skills, skillDescription],
    }));
    if (errors.skills) setErrors(prev => ({ ...prev, skills: undefined }));
  };

  const toggleBoatType = (boatType: string) => {
    setFormData(prev => ({
      ...prev,
      boatTypes: prev.boatTypes.includes(boatType)
        ? prev.boatTypes.filter(bt => bt !== boatType)
        : [...prev.boatTypes, boatType],
    }));
    // No error validation for boatTypes as they are not persisted
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des données du Boat Manager...</Text>
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
        <Text style={styles.title}>Modifier le Boat Manager</Text>
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
          <Text style={styles.sectionTitle}>Informations professionnelles</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Fonction</Text>
            <View style={[styles.inputWrapper, errors.jobTitle && styles.inputWrapperError]}>
              <User size={20} color={errors.jobTitle ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.jobTitle}
                onChangeText={(text) => setFormData(prev => ({ ...prev, jobTitle: text }))}
                placeholder="Ex: Boat Manager Senior"
                autoCapitalize="words"
              />
            </View>
            {errors.jobTitle && <Text style={styles.errorText}>{errors.jobTitle}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Expérience</Text>
            <View style={[styles.inputWrapper, errors.experience && styles.inputWrapperError]}>
              <User size={20} color={errors.experience ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.experience}
                onChangeText={(text) => setFormData(prev => ({ ...prev, experience: text }))}
                placeholder="Ex: 8 ans d'expérience"
                // Removed keyboardType="numeric" to allow any character
              />
            </View>
            {errors.experience && <Text style={styles.errorText}>{errors.experience}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Certifications (séparées par des virgules)</Text>
            <View style={[styles.inputWrapper, errors.certifications && styles.inputWrapperError]}>
              <User size={20} color={errors.certifications ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.certifications.join(', ')}
                onChangeText={(text) => setFormData(prev => ({ ...prev, certifications: text.split(',').map(s => s.trim()).filter(s => s.length > 0) }))}
                placeholder="Ex: Certification YBM, Expert Maritime"
              />
            </View>
            {errors.certifications && <Text style={styles.errorText}>{errors.certifications}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Biographie</Text>
            <View style={[styles.inputWrapper, errors.bio && styles.inputWrapperError, styles.textAreaWrapper]}>
              <TextInput
                style={styles.textArea}
                value={formData.bio}
                onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
                placeholder="Parlez de vous et de votre expérience..."
                multiline
                numberOfLines={6} // Increased number of lines for larger area
                textAlignVertical="top"
              />
            </View>
            {errors.bio && <Text style={styles.errorText}>{errors.bio}</Text>}
          </View>
        </View>
        
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ports d'attache</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowPortSelectionModal(true)} // Changed to open PortSelectionModal
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

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Compétences</Text>
          {errors.skills && <Text style={styles.errorText}>{errors.skills}</Text>}
          <View style={styles.tagsContainer}>
            {allServiceCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.tag,
                  formData.skills.includes(category.description1) && styles.tagSelected
                ]}
                onPress={() => toggleSkill(category.description1)}
              >
                <Briefcase size={16} color={formData.skills.includes(category.description1) ? 'white' : '#0066CC'} />
                <Text style={[
                  styles.tagText,
                  formData.skills.includes(category.description1) && styles.tagTextSelected
                ]}>
                  {category.description1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Types de bateaux gérés</Text>
          {/* Note: These boat types are not persisted in the current DB schema for BMs */}
          <Text style={styles.helperText}>
            Ces informations ne sont pas stockées dans la base de données pour le moment.
          </Text>
          <View style={styles.tagsContainer}>
            {staticBoatTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.tag,
                  formData.boatTypes.includes(type) && styles.tagSelected
                ]}
                onPress={() => toggleBoatType(type)}
              >
                <Ship size={16} color={formData.boatTypes.includes(type) ? 'white' : '#0066CC'} />
                <Text style={[
                  styles.tagText,
                  formData.boatTypes.includes(type) && styles.tagTextSelected
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={handleDeleteManager}
        >
          <Trash size={20} color="#ff4444" />
          <Text style={styles.deleteAccountButtonText}>Supprimer le Boat Manager</Text>
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
        onSelectPort={handleAddPort} // Use the existing handleAddPort function
        selectedPortId={null} // No pre-selected port when adding
        portsData={allPorts}
        searchQuery={''} // No search query needed for this modal
        onSearchQueryChange={() => {}} // No search query change handler needed
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  tagSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  tagText: {
    fontSize: 14,
    color: '#0066CC',
  },
  tagTextSelected: {
    color: 'white',
  },
});

