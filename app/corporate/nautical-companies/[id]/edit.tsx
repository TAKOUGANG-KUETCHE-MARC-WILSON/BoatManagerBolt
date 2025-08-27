import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image, Alert, Modal, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building, Mail, Phone, MapPin, Check, X, Ship, Briefcase, Trash } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

interface Port {
  id: string;
  name: string;
}

interface ServiceCategory {
  id: number;
  description1: string;
}

interface NauticalCompanyForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  ports: { id: string; name: string }[]; // Array of selected ports
  skills: string[]; // Array of selected skill descriptions
  boatTypes: string[]; // Array of selected boat type descriptions
}

// Hardcoded boat types (not fetched from DB)
const staticBoatTypes = ['Voilier', 'Yacht', 'Catamaran', 'Motoryacht', 'Semi-rigide', 'Péniche'];

export default function EditNauticalCompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [formData, setFormData] = useState<NauticalCompanyForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    ports: [],
    skills: [],
    boatTypes: [],
  });
  const [errors, setErrors] = useState<Partial<NauticalCompanyForm>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [allPorts, setAllPorts] = useState<{ id: string; name: string }[]>([]);
  const [allServiceCategories, setAllServiceCategories] = useState<ServiceCategory[]>([]);

  // Fetch initial data
  useEffect(() => {
    const fetchNauticalCompanyData = async () => {
      if (!id || typeof id !== 'string') {
        setFetchError('ID de l\'entreprise manquant.');
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

        // 3. Fetch current Nautical Company details
        const { data: ncData, error: ncError } = await supabase
          .from('users')
          .select(`
            id,
            company_name,
            e_mail,
            phone,
            address,
            user_ports(port_id),
            user_categorie_service(categorie_service(description1))
          `)
          .eq('id', id)
          .eq('profile', 'nautical_company')
          .single();

        if (ncError) {
          console.error('Error fetching current Nautical Company:', ncError);
          setFetchError('Entreprise du nautisme non trouvée.');
          return;
        }

        const ncPorts = ncData.user_ports.map((up: any) => ({
          id: up.port_id.toString(),
          name: portsData.find(p => p.id === up.port_id)?.name || 'Port inconnu',
        }));

        const ncSkills = ncData.user_categorie_service.map((ucs: any) => ucs.categorie_service?.description1).filter(Boolean);

        setFormData({
          name: ncData.company_name || '',
          email: ncData.e_mail || '',
          phone: ncData.phone || '',
          address: ncData.address || '',
          ports: ncPorts,
          skills: ncSkills,
          boatTypes: [], // Not fetched from DB, will be managed by toggle
        });

      } catch (e: any) {
        console.error('Unexpected error fetching NC data:', e);
        setFetchError('Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
    };

    fetchNauticalCompanyData();
  }, [id]);

  const validateForm = () => {
    const newErrors: Partial<NauticalCompanyForm> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    }
    
    if (!formData.address.trim()) {
      newErrors.address = 'L\'adresse est requise';
    }
    
    if (formData.ports.length === 0) {
      newErrors.ports = 'Au moins un port d\'intervention est requis';
    }
    
    if (formData.skills.length === 0) {
      newErrors.skills = 'Au moins une compétence est requise';
    }
    
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
      // 1. Update Nautical Company's personal details
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          company_name: formData.name,
          e_mail: formData.email,
          phone: formData.phone,
          address: formData.address,
        })
        .eq('id', id);

      if (userUpdateError) throw userUpdateError;

      // 2. Update Nautical Company's ports (delete existing, insert new ones)
      const { error: deletePortsError } = await supabase
        .from('user_ports')
        .delete()
        .eq('user_id', id);
      if (deletePortsError) throw deletePortsError;

      const newPortAssignments = formData.ports.map(p => ({
        user_id: id,
        port_id: parseInt(p.id),
      }));
      const { error: insertPortsError } = await supabase
        .from('user_ports')
        .insert(newPortAssignments);
      if (insertPortsError) throw insertPortsError;

      // 3. Update Nautical Company's skills (delete existing, insert new ones)
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

      Alert.alert('Succès', 'L\'entreprise a été mise à jour avec succès.');
      router.back();

    } catch (e: any) {
      console.error('Error updating Nautical Company:', e);
      Alert.alert('Erreur', `Échec de la mise à jour de l'entreprise: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async () => {
    Alert.alert(
      'Supprimer l\'entreprise',
      'Êtes-vous sûr de vouloir supprimer cette entreprise ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // 1. Delete user_ports assignments
              const { error: deleteUserPortsError } = await supabase
                .from('user_ports')
                .delete()
                .eq('user_id', id);

              if (deleteUserPortsError) {
                throw deleteUserPortsError;
              }

              // 2. Delete user_categorie_service assignments
              const { error: deleteUserCategoriesError } = await supabase
                .from('user_categorie_service')
                .delete()
                .eq('user_id', id);

              if (deleteUserCategoriesError) {
                throw deleteUserCategoriesError;
              }

              // 3. Delete the user from the 'users' table
              const { error: deleteUserError } = await supabase
                .from('users')
                .delete()
                .eq('id', id);

              if (deleteUserError) {
                throw deleteUserError;
              }

              Alert.alert('Succès', 'L\'entreprise a été supprimée avec succès.');
              router.back(); // Go back to the list
            } catch (e: any) {
              console.error('Error deleting nautical company:', e.message);
              Alert.alert('Erreur', `Échec de la suppression de l'entreprise: ${e.message}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const togglePort = (port: Port) => {
    if (formData.ports.some(p => p.id === port.id)) {
      setFormData(prev => ({
        ...prev,
        ports: prev.ports.filter(p => p.id !== port.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        ports: [...prev.ports, port]
      }));
    }
    if (errors.ports) setErrors(prev => ({ ...prev, ports: undefined }));
  };

  const toggleSkill = (skill: string) => {
    if (formData.skills.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        skills: prev.skills.filter(s => s !== skill)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
    if (errors.skills) setErrors(prev => ({ ...prev, skills: undefined }));
  };

  const toggleBoatType = (type: string) => {
    if (formData.boatTypes.includes(type)) {
      setFormData(prev => ({
        ...prev,
        boatTypes: prev.boatTypes.filter(t => t !== type)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        boatTypes: [...prev.boatTypes, type]
      }));
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des données de l'entreprise...</Text>
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
        <Text style={styles.title}>Modifier l'entreprise</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Informations de l'entreprise</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nom de l'entreprise</Text>
            <View style={[styles.inputContainer, errors.name && styles.inputError]}>
              <Building size={20} color={errors.name ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Nom de l'entreprise"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
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
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Téléphone</Text>
            <View style={[styles.inputContainer, errors.phone && styles.inputError]}>
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
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Adresse</Text>
            <View style={[styles.inputContainer, errors.address && styles.inputError]}>
              <MapPin size={20} color={errors.address ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
                placeholder="Adresse complète"
              />
            </View>
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Ports d'intervention</Text>
          
          {errors.ports && <Text style={styles.errorText}>{errors.ports}</Text>}
          
          <View style={styles.checkboxGroup}>
            {allPorts.map((port) => (
              <TouchableOpacity 
                key={port.id}
                style={styles.checkboxRow}
                onPress={() => togglePort(port)}
              >
                <View style={[
                  styles.checkbox,
                  formData.ports.some(p => p.id === port.id) && styles.checkboxSelected
                ]}>
                  {formData.ports.some(p => p.id === port.id) && (
                    <Check size={16} color="white" />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{port.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
          <Check size={20} color="white" />
          <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={handleDeleteCompany}
        >
          <Trash size={20} color="#ff4444" />
          <Text style={styles.deleteAccountButtonText}>Supprimer l'entreprise</Text>
        </TouchableOpacity>
      </View>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 48,
  },
  inputError: {
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
  checkboxGroup: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#0066CC',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1a1a1a',
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
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 4,
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
  modalBody: {
    padding: 16,
    maxHeight: 400,
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
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalItemTextSelected: {
    color: '#0066CC',
    fontWeight: '500',
  },
  modalItemDescription: {
    fontSize: 12,
    color: '#666',
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

