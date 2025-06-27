import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image, Alert, Modal, Switch } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, MapPin, Check, X, Plus, Key, Send } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

interface BoatManager {
  id: string;
  name: string;
}

interface Port {
  id: string;
  name: string;
  boatManagerId: string;
}

interface PortAssignment {
  portId: string;
  portName: string;
  boatManagerId: string;
  boatManagerName: string;
}

// Mock data
const mockPorts: Port[] = [
  { id: 'p1', name: 'Port de Marseille', boatManagerId: 'bm1' },
  { id: 'p2', name: 'Port de Nice', boatManagerId: 'bm2' },
  { id: 'p3', name: 'Port de Cannes', boatManagerId: 'bm3' },
  { id: 'p4', name: 'Port de Saint-Tropez', boatManagerId: 'bm4' },
];

const mockBoatManagers: BoatManager[] = [
  { id: 'bm1', name: 'Marie Martin' },
  { id: 'bm2', name: 'Pierre Dubois' },
  { id: 'bm3', name: 'Sophie Laurent' },
  { id: 'bm4', name: 'Lucas Bernard' },
];

export default function NewPleasureBoaterScreen() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [portAssignments, setPortAssignments] = useState<PortAssignment[]>([]);
  const [showPortModal, setShowPortModal] = useState(false);
  const [showBoatManagerModal, setShowBoatManagerModal] = useState(false);
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [selectedBoatManager, setSelectedBoatManager] = useState<BoatManager | null>(null);
  const [editingAssignmentIndex, setEditingAssignmentIndex] = useState<number | null>(null);
  
  // Options d'envoi d'email
  const [sendCredentials, setSendCredentials] = useState(true);
  const [showEmailOptionsModal, setShowEmailOptionsModal] = useState(false);
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
    
    if (portAssignments.length === 0) {
      newErrors.ports = 'Au moins un port d\'attache est requis';
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

  const handleSelectPort = (port: Port) => {
    setSelectedPort(port);
    
    // Trouver automatiquement le Boat Manager associé au port
    const boatManager = mockBoatManagers.find(bm => bm.id === port.boatManagerId);
    if (boatManager) {
      setSelectedBoatManager(boatManager);
    } else {
      setSelectedBoatManager(null);
    }
    
    setShowPortModal(false);
    
    // Si on est en mode ajout, ouvrir directement le modal de sélection du Boat Manager
    if (editingAssignmentIndex === null) {
      setShowBoatManagerModal(true);
    }
  };

  const handleSelectBoatManager = (boatManager: BoatManager) => {
    setSelectedBoatManager(boatManager);
    setShowBoatManagerModal(false);
    
    // Si on est en mode ajout, ajouter l'assignation
    if (editingAssignmentIndex === null && selectedPort) {
      const newAssignment: PortAssignment = {
        portId: selectedPort.id,
        portName: selectedPort.name,
        boatManagerId: boatManager.id,
        boatManagerName: boatManager.name
      };
      
      // Vérifier si cette assignation existe déjà
      const exists = portAssignments.some(
        a => a.portId === selectedPort.id && a.boatManagerId === boatManager.id
      );
      
      if (!exists) {
        setPortAssignments([...portAssignments, newAssignment]);
      } else {
        Alert.alert('Attention', 'Cette assignation existe déjà.');
      }
      
      setSelectedPort(null);
      setSelectedBoatManager(null);
    } 
    // Si on est en mode édition, mettre à jour l'assignation
    else if (editingAssignmentIndex !== null && selectedPort) {
      const updatedAssignments = [...portAssignments];
      updatedAssignments[editingAssignmentIndex] = {
        portId: selectedPort.id,
        portName: selectedPort.name,
        boatManagerId: boatManager.id,
        boatManagerName: boatManager.name
      };
      
      setPortAssignments(updatedAssignments);
      setEditingAssignmentIndex(null);
      setSelectedPort(null);
      setSelectedBoatManager(null);
    }
  };

  const handleAddPortAssignment = () => {
    setEditingAssignmentIndex(null);
    setSelectedPort(null);
    setSelectedBoatManager(null);
    setShowPortModal(true);
  };

  const handleEditPortAssignment = (index: number) => {
    const assignment = portAssignments[index];
    const port = mockPorts.find(p => p.id === assignment.portId);
    const boatManager = mockBoatManagers.find(bm => bm.id === assignment.boatManagerId);
    
    if (port) {
      setSelectedPort(port);
    }
    
    if (boatManager) {
      setSelectedBoatManager(boatManager);
    }
    
    setEditingAssignmentIndex(index);
    setShowPortModal(true);
  };

  const handleRemovePortAssignment = (index: number) => {
    const updatedAssignments = [...portAssignments];
    updatedAssignments.splice(index, 1);
    setPortAssignments(updatedAssignments);
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Générer un mot de passe temporaire aléatoire
      const temporaryPassword = generateTemporaryPassword();
      
      // Simuler l'ajout d'un plaisancier
      if (sendCredentials) {
        // Remplacer les variables dans le message
        const personalizedMessage = emailMessage
          .replace('{email}', formData.email)
          .replace('{password}', temporaryPassword);
        
        // Simuler l'envoi d'email
        console.log('Envoi d\'email à', formData.email);
        console.log('Objet:', emailSubject);
        console.log('Message:', personalizedMessage);
        console.log('Mot de passe temporaire:', temporaryPassword);
        console.log('Validité du mot de passe:', passwordExpiryDays, 'jours');
        
        Alert.alert(
          'Succès',
          `Le plaisancier a été ajouté avec succès et les identifiants ont été envoyés à ${formData.email}`,
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        Alert.alert(
          'Succès',
          'Le plaisancier a été ajouté avec succès',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      }
    }
  };

  // Générer un mot de passe temporaire aléatoire
  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Modal pour sélectionner un port
  const PortSelectionModal = () => (
    <Modal
      visible={showPortModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un port</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowPortModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {mockPorts.map((port) => (
              <TouchableOpacity 
                key={port.id}
                style={[
                  styles.modalItem,
                  selectedPort?.id === port.id && styles.modalItemSelected
                ]}
                onPress={() => handleSelectPort(port)}
              >
                <MapPin size={20} color={selectedPort?.id === port.id ? '#0066CC' : '#666'} />
                <Text style={[
                  styles.modalItemText,
                  selectedPort?.id === port.id && styles.modalItemTextSelected
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

  // Modal pour sélectionner un Boat Manager
  const BoatManagerSelectionModal = () => (
    <Modal
      visible={showBoatManagerModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBoatManagerModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un Boat Manager</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowBoatManagerModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {mockBoatManagers.map((manager) => (
              <TouchableOpacity 
                key={manager.id}
                style={[
                  styles.modalItem,
                  selectedBoatManager?.id === manager.id && styles.modalItemSelected
                ]}
                onPress={() => handleSelectBoatManager(manager)}
              >
                <User size={20} color={selectedBoatManager?.id === manager.id ? '#0066CC' : '#666'} />
                <Text style={[
                  styles.modalItemText,
                  selectedBoatManager?.id === manager.id && styles.modalItemTextSelected
                ]}>
                  {manager.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Modal pour configurer les options d'email
  const EmailOptionsModal = () => (
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
                  onChangeText={setEmailSubject}
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
                  onChangeText={setEmailMessage}
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
                  onChangeText={setPasswordExpiryDays}
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
              onPress={() => setShowEmailOptionsModal(false)}
            >
              <Check size={20} color="white" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Ajouter un plaisancier</Text>
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Ports d'attache et Boat Managers</Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddPortAssignment}
              >
                <Plus size={20} color="#0066CC" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
            
            {errors.ports && <Text style={styles.errorText}>{errors.ports}</Text>}
            
            {portAssignments.length > 0 ? (
              <View style={styles.assignmentsList}>
                {portAssignments.map((assignment, index) => (
                  <View key={index} style={styles.assignmentItem}>
                    <View style={styles.assignmentInfo}>
                      <View style={styles.portInfo}>
                        <MapPin size={16} color="#0066CC" />
                        <Text style={styles.portName}>{assignment.portName}</Text>
                      </View>
                      <View style={styles.boatManagerInfo}>
                        <User size={16} color="#0066CC" />
                        <Text style={styles.boatManagerName}>{assignment.boatManagerName}</Text>
                      </View>
                    </View>
                    <View style={styles.assignmentActions}>
                      <TouchableOpacity 
                        style={styles.editAssignmentButton}
                        onPress={() => handleEditPortAssignment(index)}
                      >
                        <Text style={styles.editAssignmentText}>Modifier</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.removeAssignmentButton}
                        onPress={() => handleRemovePortAssignment(index)}
                      >
                        <X size={16} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyAssignments}>
                <Text style={styles.emptyAssignmentsText}>
                  Aucun port d'attache assigné. Cliquez sur "Ajouter" pour en ajouter un.
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Options de création de compte</Text>
            </View>
            
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionLabel}>Envoyer les identifiants par email</Text>
                <Text style={styles.optionDescription}>
                  Un email contenant les identifiants de connexion sera envoyé au plaisancier
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
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Check size={20} color="white" />
            <Text style={styles.submitButtonText}>Ajouter le plaisancier</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PortSelectionModal />
      <BoatManagerSelectionModal />
      <EmailOptionsModal />
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
        boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
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
});