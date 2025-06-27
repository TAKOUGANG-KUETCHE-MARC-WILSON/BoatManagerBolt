import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Building, Mail, Phone, MapPin, Check, X, Ship } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

interface Port {
  id: string;
  name: string;
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

export default function NewNauticalCompanyScreen() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPorts, setSelectedPorts] = useState<Port[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedBoatTypes, setSelectedBoatTypes] = useState<string[]>([]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
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
    
    if (selectedPorts.length === 0) {
      newErrors.ports = 'Au moins un port d\'intervention est requis';
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
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const toggleBoatType = (type: string) => {
    if (selectedBoatTypes.includes(type)) {
      setSelectedBoatTypes(selectedBoatTypes.filter(t => t !== type));
    } else {
      setSelectedBoatTypes([...selectedBoatTypes, type]);
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Simuler l'ajout d'une entreprise
      Alert.alert(
        'Succès',
        'L\'entreprise a été ajoutée avec succès',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Ajouter une entreprise</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
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
            <Text style={styles.submitButtonText}>Ajouter l'entreprise</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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