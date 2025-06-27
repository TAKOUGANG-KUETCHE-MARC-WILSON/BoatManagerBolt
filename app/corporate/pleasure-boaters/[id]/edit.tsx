import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image, Alert, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, Mail, Phone, MapPin, Check, X, Plus } from 'lucide-react-native';
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

interface PleasureBoater {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  ports: Array<{
    id: string;
    name: string;
    boatManagerId: string;
    boatManagerName: string;
  }>;
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

// Mock plaisanciers pour récupérer les données
const mockPleasureBoaters: Record<string, PleasureBoater> = {
  'pb1': {
    id: 'pb1',
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    ports: [
      {
        id: 'p1',
        name: 'Port de Marseille',
        boatManagerId: 'bm1',
        boatManagerName: 'Marie Martin'
      },
      {
        id: 'p2',
        name: 'Port de Nice',
        boatManagerId: 'bm2',
        boatManagerName: 'Pierre Dubois'
      }
    ]
  },
  'pb2': {
    id: 'pb2',
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie.martin@example.com',
    phone: '+33 6 23 45 67 89',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    ports: [
      {
        id: 'p1',
        name: 'Port de Marseille',
        boatManagerId: 'bm1',
        boatManagerName: 'Marie Martin'
      }
    ]
  }
};

export default function EditPleasureBoaterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuler le chargement des données du plaisancier
    if (id && typeof id === 'string' && mockPleasureBoaters[id]) {
      const boater = mockPleasureBoaters[id];
      
      setFormData({
        firstName: boater.firstName,
        lastName: boater.lastName,
        email: boater.email,
        phone: boater.phone,
      });
      
      // Convertir les ports en portAssignments
      const assignments = boater.ports.map(port => ({
        portId: port.id,
        portName: port.name,
        boatManagerId: port.boatManagerId,
        boatManagerName: port.boatManagerName
      }));
      
      setPortAssignments(assignments);
      setLoading(false);
    } else {
      // Rediriger si l'ID n'est pas valide
      Alert.alert(
        'Erreur',
        'Plaisancier non trouvé',
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
    
    if (portAssignments.length === 0) {
      newErrors.ports = 'Au moins un port d\'attache est requis';
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
      
      setPortAssignments([...portAssignments, newAssignment]);
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
      // Simuler la mise à jour d'un plaisancier
      Alert.alert(
        'Succès',
        'Le plaisancier a été mis à jour avec succès',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }
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
          <Text style={styles.title}>Modifier le plaisancier</Text>
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
        <Text style={styles.title}>Modifier le plaisancier</Text>
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
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Check size={20} color="white" />
            <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PortSelectionModal />
      <BoatManagerSelectionModal />
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
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalItemTextSelected: {
    color: '#0066CC',
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