import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image, Alert, Modal, Switch, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, MapPin, Check, X, Plus, Key, Send, Lock, Ship, Briefcase, Building } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import supabase
import bcrypt from 'bcryptjs'; // Import bcryptjs

interface Port {
  id: string;
  name: string;
}

interface ServiceCategory {
  id: number;
  description1: string;
}

// Modal pour configurer les options d'email
const EmailOptionsModal = ({
  showEmailOptionsModal,
  setShowEmailOptionsModal,
  emailSubject,
  setEmailSubject,
  emailMessage,
  setEmailMessage,
  passwordExpiryDays,
  setPasswordExpiryDays,
  errors,
  setErrors,
}) => {
  const validateEmailOptions = () => {
    const newErrors: Record<string, string> = {};
    if (!emailSubject.trim()) {
      newErrors.emailSubject = 'L\'objet de l\'email est requis';
    }
    if (!emailMessage.trim()) {
      newErrors.emailMessage = 'Le message de l\'email est requis';
    }
    if (!passwordExpiryDays.trim() || isNaN(Number(passwordExpiryDays)) || Number(passwordExpiryDays) <= 0) {
      newErrors.passwordExpiryDays = 'La durée de validité doit être un nombre positif';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveEmailOptions = () => {
    if (validateEmailOptions()) {
      setShowEmailOptionsModal(false);
    }
  };

  return (
    <Modal
      visible={showEmailOptionsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEmailOptionsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Options d'envoi d'email</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowEmailOptionsModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Objet de l'email</Text>
              <View style={[styles.inputContainer, errors.emailSubject && styles.inputError]}>
                <Mail size={20} color={errors.emailSubject ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  value={emailSubject}
                  onChangeText={(text) => { setEmailSubject(text); setErrors(prev => ({ ...prev, emailSubject: undefined })); }}
                  placeholder="Objet de l'email"
                />
              </View>
              {errors.emailSubject && <Text style={styles.errorText}>{errors.emailSubject}</Text>}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Message</Text>
              <View style={[styles.textAreaContainer, errors.emailMessage && styles.inputError]}>
                <TextInput
                  style={styles.textArea}
                  value={emailMessage}
                  onChangeText={(text) => { setEmailMessage(text); setErrors(prev => ({ ...prev, emailMessage: undefined })); }}
                  placeholder="Message de l'email"
                  multiline
                  numberOfLines={8}
                />
              </View>
              <Text style={styles.helperText}>
                Utilisez {'{email}'} et {'{password}'} comme variables pour les identifiants.
              </Text>
              {errors.emailMessage && <Text style={styles.errorText}>{errors.emailMessage}</Text>}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Validité du mot de passe temporaire (jours)</Text>
              <View style={[styles.inputContainer, errors.passwordExpiryDays && styles.inputError]}>
                <Key size={20} color={errors.passwordExpiryDays ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  value={passwordExpiryDays}
                  onChangeText={(text) => { setPasswordExpiryDays(text); setErrors(prev => ({ ...prev, passwordExpiryDays: undefined })); }}
                  placeholder="Nombre de jours"
                  keyboardType="numeric"
                />
              </View>
              {errors.passwordExpiryDays && <Text style={styles.errorText}>{errors.passwordExpiryDays}</Text>}
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowEmailOptionsModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSaveEmailOptions}
            >
              <Check size={20} color="white" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// New Multi-select Port Selection Modal
const MultiPortSelectionModal = ({
  showPortModal,
  setShowPortModal,
  allPorts,
  selectedPorts,
  setSelectedPorts,
  isFetchingPorts,
}) => {
  const [tempSelectedPorts, setTempSelectedPorts] = useState<Port[]>(selectedPorts);

  useEffect(() => {
    setTempSelectedPorts(selectedPorts);
  }, [selectedPorts]);

  const togglePortSelection = (port: Port) => {
    setTempSelectedPorts(prev => {
      if (prev.some(p => p.id === port.id)) {
        return prev.filter(p => p.id !== port.id);
      } else {
        return [...prev, port];
      }
    });
  };

  const handleConfirmSelection = () => {
    setSelectedPorts(tempSelectedPorts);
    setShowPortModal(false);
  };

  return (
    <Modal
      visible={showPortModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner les ports</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowPortModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {isFetchingPorts ? (
              <ActivityIndicator size="large" color="#0066CC" />
            ) : allPorts.length > 0 ? (
              allPorts.map((port) => (
                <TouchableOpacity 
                  key={port.id}
                  style={[
                    styles.modalItem,
                    tempSelectedPorts.some(p => p.id === port.id) && styles.modalItemSelected
                  ]}
                  onPress={() => togglePortSelection(port)}
                >
                  <MapPin size={20} color={tempSelectedPorts.some(p => p.id === port.id) ? '#0066CC' : '#666'} />
                  <Text style={[
                    styles.modalItemText,
                    tempSelectedPorts.some(p => p.id === port.id) && styles.modalItemTextSelected
                  ]}>
                    {port.name}
                  </Text>
                  {tempSelectedPorts.some(p => p.id === port.id) && (
                    <Check size={20} color="#0066CC" />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyModalText}>Aucun port disponible.</Text>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowPortModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleConfirmSelection}
            >
              <Check size={20} color="white" />
              <Text style={styles.saveButtonText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


export default function NewNauticalCompanyScreen() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedPorts, setSelectedPorts] = useState<Port[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedBoatTypes, setSelectedBoatTypes] = useState<string[]>([]);

  // Modals visibility
  const [showPortModal, setShowPortModal] = useState(false); // For multi-select port modal
  const [showEmailOptionsModal, setShowEmailOptionsModal] = useState(false);

  // Data from Supabase
  const [allPorts, setAllPorts] = useState<Port[]>([]);
  const [allServiceCategories, setAllServiceCategories] = useState<ServiceCategory[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false); // For form submission
  const [isFetchingPorts, setIsFetchingPorts] = useState(true); // For initial port fetch
  const [isFetchingServiceCategories, setIsFetchingServiceCategories] = useState(true); // For initial service categories fetch

  // Email options
  const [sendCredentials, setSendCredentials] = useState(true);
  const [emailSubject, setEmailSubject] = useState('Bienvenue sur Your Boat Manager');
  const [emailMessage, setEmailMessage] = useState(
    'Bonjour,\n\n' +
    'Votre compte a été créé sur la plateforme Your Boat Manager.\n\n' +
    'Voici vos identifiants de connexion :\n' +
    '- Email : {email}\n' +
    '- Mot de passe temporaire : {password}\n\n' +
    'Lors de votre première connexion, vous serez invité à changer votre mot de passe.\n\n' +
    'Cordialement,\n' +
    'L\'équipe Your Boat Manager'
  );
  const [passwordExpiryDays, setPasswordExpiryDays] = useState('7');

  // Hardcoded boat types (not fetched from DB)
  const boatTypes = ['Voilier', 'Yacht', 'Catamaran', 'Motoryacht', 'Semi-rigide', 'Péniche'];

  // Fetch all ports and service categories on component mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch Ports
      setIsFetchingPorts(true);
      const { data: portsData, error: portsError } = await supabase.from('ports').select('id, name');
      if (portsError) {
        console.error('Error fetching ports:', portsError);
        Alert.alert('Erreur', 'Impossible de charger les ports.');
      } else {
        setAllPorts(portsData.map(p => ({ id: p.id.toString(), name: p.name })));
      }
      setIsFetchingPorts(false);

      // Fetch Service Categories
      setIsFetchingServiceCategories(true);
      const { data: categoriesData, error: categoriesError } = await supabase.from('categorie_service').select('id, description1');
      if (categoriesError) {
        console.error('Error fetching service categories:', categoriesError);
        Alert.alert('Erreur', 'Impossible de charger les catégories de service.');
      } else {
        setAllServiceCategories(categoriesData);
      }
      setIsFetchingServiceCategories(false);
    };
    fetchData();
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Le nom de l\'entreprise est requis';
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

    if (!formData.password.trim()) {
      newErrors.password = 'Le mot de passe est requis';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    
    if (selectedPorts.length === 0) { // Validate selectedPorts
      newErrors.ports = 'Au moins un port d\'intervention est requis';
    }
    
    if (selectedSkills.length === 0) {
      newErrors.skills = 'Au moins une compétence est requise';
    }
    
    if (selectedBoatTypes.length === 0) {
      newErrors.boatTypes = 'Au moins un type de bateau est requis';
    }
    
    if (sendCredentials) {
      if (!emailSubject.trim()) {
        newErrors.emailSubject = 'L\'objet de l\'email est requis';
      }
      
      if (!emailMessage.trim()) {
        newErrors.emailMessage = 'Le message de l\'email est requis';
      }
      
      if (!passwordExpiryDays.trim() || isNaN(Number(passwordExpiryDays)) || Number(passwordExpiryDays) <= 0) {
        newErrors.passwordExpiryDays = 'La durée de validité doit être un nombre positif';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPortSelection = () => {
    setShowPortModal(true);
  };

  const handleRemovePort = (portId: string) => {
    setSelectedPorts(prev => prev.filter(p => p.id !== portId));
    if (errors.ports && selectedPorts.length === 1) { // If this was the last port
      setErrors(prev => ({ ...prev, ports: 'Au moins un port d\'intervention est requis' }));
    }
  };

  const toggleSkill = (skillDescription: string) => {
    if (selectedSkills.includes(skillDescription)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skillDescription));
    } else {
      setSelectedSkills([...selectedSkills, skillDescription]);
    }
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
    if (errors.boatTypes) {
      setErrors(prev => ({ ...prev, boatTypes: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        const hashedPassword = await bcrypt.hash(formData.password, 10);
        
        // 1. Check if user already exists
        const { data: existingUsers, error: existingUserError } = await supabase
          .from('users')
          .select('id')
          .eq('e_mail', formData.email);

        if (existingUserError) {
          throw new Error("Erreur lors de la vérification de l'utilisateur existant.");
        }
        if (existingUsers && existingUsers.length > 0) {
          throw new Error('Un compte avec cet email existe déjà.');
        }

        // 2. Create the new nautical company user
        const { data: newUser, error: userInsertError } = await supabase
          .from('users')
          .insert({
            e_mail: formData.email,
            password: hashedPassword,
            company_name: formData.companyName,
            first_name: formData.companyName, // Use companyName for first_name
            last_name: 'Company', // Use a generic value for last_name
            phone: formData.phone,
            address: formData.address,
            profile: 'nautical_company',
            status: 'active', // New users are active by default
            last_login: new Date().toISOString(), // Set initial last_login
            avatar: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop', // Default NC avatar
          })
          .select('id')
          .single();

        if (userInsertError) {
          console.error('Error inserting user profile:', userInsertError);
          throw new Error('Échec de la création du profil utilisateur.');
        }

        // 3. Assign ports to the new user
        const userPortInserts = selectedPorts.map((port) => ({
          user_id: newUser.id,
          port_id: parseInt(port.id),
        }));

        const { error: userPortsInsertError } = await supabase
          .from('user_ports')
          .insert(userPortInserts);

        if (userPortsInsertError) {
          console.error('Error inserting user ports:', userPortsInsertError);
          throw new Error("Échec de l'affectation des ports à l'utilisateur.");
        }

        // 4. Assign skills (service categories) to the new user
        const skillInserts = selectedSkills.map(skillDescription => {
          const category = allServiceCategories.find(cat => cat.description1 === skillDescription);
          if (!category) {
            console.warn(`Service category "${skillDescription}" not found in DB.`);
            return null;
          }
          return {
            user_id: newUser.id,
            categorie_service_id: category.id,
          };
        }).filter(Boolean); // Filter out nulls

        if (skillInserts.length > 0) {
          const { error: userSkillsInsertError } = await supabase
            .from('user_categorie_service')
            .insert(skillInserts);

          if (userSkillsInsertError) {
            console.error('Error inserting user skills:', userSkillsInsertError);
            throw new Error("Échec de l'affectation des compétences à l'utilisateur.");
          }
        }

        // 5. Simulate email sending
        if (sendCredentials) {
          const temporaryPassword = formData.password; // Using the provided password for simulation
          const personalizedMessage = emailMessage
            .replace('{email}', formData.email)
            .replace('{password}', temporaryPassword);
          
          Alert.alert(
            'Email envoyé (simulation)',
            `Objet: ${emailSubject}\n\nMessage:\n${personalizedMessage}\n\nMot de passe temporaire: ${temporaryPassword}\nValidité: ${passwordExpiryDays} jours`
          );
        }

        Alert.alert(
          'Succès',
          'L\'entreprise du nautisme a été ajoutée avec succès.',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );

      } catch (error: any) {
        console.error('Submission error:', error);
        Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de l\'ajout de l\'entreprise du nautisme.');
      } finally {
        setIsLoading(false);
      }
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
              <View style={[styles.inputContainer, errors.companyName && styles.inputError]}>
                <Building size={20} color={errors.companyName ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  value={formData.companyName}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, companyName: text }))}
                  placeholder="Nom de l'entreprise"
                />
              </View>
              {errors.companyName && <Text style={styles.errorText}>{errors.companyName}</Text>}
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

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                <Lock size={20} color={errors.password ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                  placeholder="Mot de passe"
                  secureTextEntry
                />
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>
          </View>
          
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ports d'intervention</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddPortSelection}
              >
                <Plus size={20} color="#0066CC" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
            
            {errors.ports && <Text style={styles.errorText}>{errors.ports}</Text>}
            
            {selectedPorts.length > 0 ? (
              <View style={styles.tagsContainer}>
                {selectedPorts.map((port) => (
                  <TouchableOpacity 
                    key={port.id}
                    style={styles.tag}
                    onPress={() => handleRemovePort(port.id)}
                  >
                    <MapPin size={16} color="#0066CC" />
                    <Text style={styles.tagText}>{port.name}</Text>
                    <X size={16} color="#666" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyAssignments}>
                <Text style={styles.emptyAssignmentsText}>
                  Aucun port d'intervention assigné. Cliquez sur "Ajouter" pour en ajouter un.
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Compétences</Text>
            
            {errors.skills && <Text style={styles.errorText}>{errors.skills}</Text>}
            
            <View style={styles.tagsContainer}>
              {isFetchingServiceCategories ? (
                <ActivityIndicator size="small" color="#0066CC" />
              ) : allServiceCategories.length > 0 ? (
                allServiceCategories.map((category) => (
                  <TouchableOpacity 
                    key={category.id}
                    style={[
                      styles.tag,
                      selectedSkills.includes(category.description1) && styles.tagSelected
                    ]}
                    onPress={() => toggleSkill(category.description1)}
                  >
                    <Briefcase size={16} color={selectedSkills.includes(category.description1) ? 'white' : '#0066CC'} />
                    <Text style={[
                      styles.tagText,
                      selectedSkills.includes(category.description1) && styles.tagTextSelected
                    ]}>
                      {category.description1}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyTagsText}>Aucune compétence disponible.</Text>
              )}
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
          
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Options de création de compte</Text>
            </View>
            
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Envoyer les identifiants par email</Text>
                <Text style={styles.optionDescription}>
                  Un email contenant les identifiants de connexion sera envoyé à l'entreprise
                </Text>
              </View>
              <Switch
                value={sendCredentials}
                onValueChange={setSendCredentials}
                trackColor={{ false: '#e0e0e0', true: '#bfdbfe' }}
                thumbColor={sendCredentials ? '#0066CC' : '#fff'}
                ios_backgroundColor="#e0e0e0"
              />
            </View>
            
            {sendCredentials && (
              <TouchableOpacity 
                style={styles.configureEmailButton}
                onPress={() => setShowEmailOptionsModal(true)}
              >
                <Send size={20} color="#0066CC" />
                <Text style={styles.configureEmailText}>Configurer l'email</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Check size={20} color="white" />
                <Text style={styles.submitButtonText}>Ajouter l'entreprise</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Port Selection Modal */}
      <MultiPortSelectionModal
        showPortModal={showPortModal}
        setShowPortModal={setShowPortModal}
        allPorts={allPorts}
        selectedPorts={selectedPorts}
        setSelectedPorts={setSelectedPorts}
        isFetchingPorts={isFetchingPorts}
      />

      {/* Email Options Modal */}
      <EmailOptionsModal
        showEmailOptionsModal={showEmailOptionsModal}
        setShowEmailOptionsModal={setShowEmailOptionsModal}
        emailSubject={emailSubject}
        setEmailSubject={setEmailSubject}
        emailMessage={emailMessage}
        setEmailMessage={setEmailMessage}
        passwordExpiryDays={passwordExpiryDays}
        setPasswordExpiryDays={setPasswordExpiryDays}
        errors={errors}
        setErrors={setErrors}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  textAreaContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  textArea: {
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 120,
    textAlignVertical: 'top',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 4,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  assignmentsList: {
    gap: 12,
  },
  assignmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  assignmentInfo: {
    flex: 1,
    gap: 8,
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
  boatManagerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boatManagerName: {
    fontSize: 14,
    color: '#0066CC',
  },
  assignmentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editAssignmentButton: {
    padding: 8,
  },
  editAssignmentText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  removeAssignmentButton: {
    padding: 8,
  },
  emptyAssignments: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyAssignmentsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
  configureEmailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  configureEmailText: {
    fontSize: 14,
    color: '#0066CC',
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
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  saveButton: {
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
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
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
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
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
  emptyTagsText: {
    fontSize: 14,
    color: '#666',
    paddingVertical: 8,
  }
});

