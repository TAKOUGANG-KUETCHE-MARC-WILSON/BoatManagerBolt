import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, MapPin, Check, X, Ship } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import PortSelectionModal from '@/components/PortSelectionModal'; // Import the new component

interface Port {
  id: string;
  name: string;
}

interface BoatManager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  ports: string[];
  portIds: string[];
  rating: number;
  reviewCount: number;
  skills: string[];
  boatTypes: string[];
}

// Mock data
const mockPorts: Port[] = [
  { id: 'p1', name: 'Port de Marseille' },
  { id: 'p2', name: 'Port de Nice' },
  { id: 'p3', name: 'Port de Cannes' },
  { id: 'p4', name: 'Port de Saint-Tropez' },
];

const boatTypes = ['Voilier', 'Yacht', 'Catamaran', 'Motoryacht', 'Semi-rigide', 'Péniche'];
const skills = ['Entretien', 'Amélioration', 'Réparation', 'Contrôle', 'Gestion des accès', 'Sécurité', 'Représentation', 'Achat/Vente'];

// Mock boat managers pour récupérer les données
const mockBoatManagers: Record<string, BoatManager> = {
  'bm1': {
    id: 'bm1',
    firstName: 'Marie',
    lastName: 'Martin',
    email: 'marie.martin@ybm.com',
    phone: '+33 6 12 34 56 78',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop',
    ports: ['Port de Marseille'],
    portIds: ['p1'],
    rating: 4.8,
    reviewCount: 36,
    skills: ['Entretien', 'Amélioration', 'Réparation'],
    boatTypes: ['Voilier', 'Yacht', 'Catamaran']
  },
  'bm2': {
    id: 'bm2',
    firstName: 'Pierre',
    lastName: 'Dubois',
    email: 'pierre.dubois@ybm.com',
    phone: '+33 6 23 45 67 89',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    ports: ['Port de Nice'],
    portIds: ['p2'],
    rating: 4.6,
    reviewCount: 24,
    skills: ['Entretien', 'Contrôle', 'Sécurité'],
    boatTypes: ['Voilier', 'Yacht']
  }
};

export default function EditBoatManagerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPorts, setSelectedPorts] = useState<Port[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedBoatTypes, setSelectedBoatTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPortModal, setShowPortModal] = useState(false); // State for the modal
  const [portSearchQuery, setPortSearchQuery] = useState(''); // State for search in modal

  useEffect(() => {
    // Simuler le chargement des données du boat manager
    if (id && typeof id === 'string' && mockBoatManagers[id]) {
      const manager = mockBoatManagers[id];
      
      setFormData({
        firstName: manager.firstName,
        lastName: manager.lastName,
        email: manager.email,
        phone: manager.phone,
      });
      
      // Sélectionner les ports
      const managerPorts = mockPorts.filter(port => manager.portIds.includes(port.id));
      setSelectedPorts(managerPorts);
      
      // Sélectionner les compétences et types de bateaux
      setSelectedSkills(manager.skills);
      setSelectedBoatTypes(manager.boatTypes);
      
      setLoading(false);
    } else {
      // Rediriger si l'ID n'est pas valide
      Alert.alert(
        'Erreur',
        'Boat Manager non trouvé',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }
  }, [id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Le prénom est requis';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Le nom est requis';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est requis';
    }
    
    if (selectedPorts.length === 0) {
      newErrors.ports = 'Au moins un port d\'attache est requis';
    }
    
    if (selectedSkills.length === 0) {
      newErrors.skills = 'Au moins une compétence est requise';
    }
    
    if (selectedBoatTypes.length === 0) {
      newErrors.boatTypes = 'Au moins un type de bateau est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const togglePort = (port: Port) => {
    if (selectedPorts.some(p => p.id === port.id)) {
      setSelectedPorts(selectedPorts.filter(p => p.id !== port.id));
    } else {
      setSelectedPorts([...selectedPorts, port]);
    }
    // Clear port-related error if any
    if (errors.ports) {
      setErrors(prev => ({ ...prev, ports: undefined }));
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
    // Clear skill-related error if any
    if (errors.skills) {
      setErrors(prev => ({ ...prev, skills: undefined }));
    }
  };

  const toggleBoatType = (type: string) => {
    if (selectedBoatTypes.includes(type)) {
      setSelectedBoatTypes(selectedBoatTypes.filter(t => t !== type));
    } else {
      setSelectedBoatTypes([...selectedBoatTypes, type]);
    }
    // Clear boatType-related error if any
    if (errors.boatTypes) {
      setErrors(prev => ({ ...prev, boatTypes: undefined }));
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Simuler la mise à jour d'un Boat Manager
      Alert.alert(
        'Succès',
        'Le Boat Manager a été mis à jour avec succès',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Modifier le Boat Manager</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
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
        <Text style={styles.title}>Modifier le Boat Manager</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Informations personnelles</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Prénom</Text>
              <View style={[styles.inputContainer, errors.firstName && styles.inputError]}>
                <User size={20} color={errors.firstName ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  value={formData.firstName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
                  placeholder="Prénom"
                />
              </View>
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nom</Text>
              <View style={[styles.inputContainer, errors.lastName && styles.inputError]}>
                <User size={20} color={errors.lastName ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  value={formData.lastName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
                  placeholder="Nom"
                />
              </View>
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
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
          </View>
          
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Ports d'attache</Text>
            
            {errors.ports && <Text style={styles.errorText}>{errors.ports}</Text>}
            
            <View style={styles.checkboxGroup}>
              {mockPorts.map((port) => (
                <TouchableOpacity 
                  key={port.id}
                  style={styles.checkboxRow}
                  onPress={() => togglePort(port)}
                >
                  <View style={[
                    styles.checkbox,
                    selectedPorts.some(p => p.id === port.id) && styles.checkboxSelected
                  ]}>
                    {selectedPorts.some(p => p.id === port.id) && (
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
              {skills.map((skill) => (
                <TouchableOpacity 
                  key={skill}
                  style={[
                    styles.tag,
                    selectedSkills.includes(skill) && styles.tagSelected
                  ]}
                  onPress={() => toggleSkill(skill)}
                >
                  <Text style={[
                    styles.tagText,
                    selectedSkills.includes(skill) && styles.tagTextSelected
                  ]}>
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Types de bateaux</Text>
            
            {errors.boatTypes && <Text style={styles.errorText}>{errors.boatTypes}</Text>}
            
            <View style={styles.tagsContainer}>
              {boatTypes.map((type) => (
                <TouchableOpacity 
                  key={type}
                  style={[
                    styles.tag,
                    selectedBoatTypes.includes(type) && styles.tagSelected
                  ]}
                  onPress={() => toggleBoatType(type)}
                >
                  <Ship size={16} color={selectedBoatTypes.includes(type) ? 'white' : '#0066CC'} />
                  <Text style={[
                    styles.tagText,
                    selectedBoatTypes.includes(type) && styles.tagTextSelected
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
        </View>
      </ScrollView>

      <PortSelectionModal
        visible={showPortModal}
        onClose={() => setShowPortModal(false)}
        onSelectPort={togglePort} // Use togglePort directly
        selectedPortId={selectedPorts.length > 0 ? selectedPorts[0].id : null} // Pass the first selected port ID
        portsData={mockPorts}
        searchQuery={portSearchQuery}
        onSearchQueryChange={setPortSearchQuery}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
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
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
