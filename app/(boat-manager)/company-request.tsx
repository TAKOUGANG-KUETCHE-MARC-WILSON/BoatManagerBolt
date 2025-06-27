import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Image, Modal, FlatList, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, Building, MapPin, FileText, Calendar, Clock, TriangleAlert as AlertTriangle, Bot as Boat, User, Send, ChevronRight, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

interface NauticalCompany {
  id: string;
  name: string;
  logo: string;
  location: string;
  rating: number;
  services: string[];
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  hasNewRequests?: boolean;
}

interface RequestForm {
  title: string;
  clientId: string;
  clientName: string;
  boatId: string;
  boatName: string;
  boatType: string;
  companyId?: string;
  companyName?: string;
  validUntil: string;
  services: Service[];
  location?: string;
  notes?: string;
  urgency: 'normal' | 'urgent';
  type: string;
  description: string;
  category: string;
  date: string;
  forClient: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string;
  amount: number;
}

interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  boats: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

// Mock clients data
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Jean Dupont',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    boats: [
      {
        id: '1',
        name: 'Le Grand Bleu',
        type: 'Voilier',
      },
    ],
  },
  {
    id: '2',
    name: 'Sophie Martin',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    email: 'sophie.martin@example.com',
    phone: '+33 6 23 45 67 89',
    boats: [
      {
        id: '2',
        name: 'Le Petit Prince',
        type: 'Yacht',
      },
      {
        id: '3',
        name: 'L\'Aventurier',
        type: 'Catamaran',
      },
    ],
  },
  {
    id: '3',
    name: 'Pierre Dubois',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    email: 'pierre.dubois@example.com',
    phone: '+33 6 34 56 78 90',
    boats: [
      {
        id: '4',
        name: 'Le Navigateur',
        type: 'Voilier',
      },
    ],
  },
];

// Mock companies data
const mockCompanies: NauticalCompany[] = [
  {
    id: 'nc1',
    name: 'Nautisme Pro',
    logo: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop',
    location: 'Port de Marseille',
    services: ['Maintenance', 'Réparation', 'Installation'],
    contactName: 'Thomas Leroy',
    contactEmail: 'contact@nautismepro.com',
    contactPhone: '+33 4 91 12 34 56',
  },
  {
    id: 'nc2',
    name: 'Marine Services',
    logo: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2070&auto=format&fit=crop',
    location: 'Port de Nice',
    services: ['Maintenance', 'Contrôle', 'Amélioration'],
    contactName: 'Julie Moreau',
    contactEmail: 'contact@marineservices.com',
    contactPhone: '+33 4 93 23 45 67',
  }
];

const serviceTypes = [
  'Entretien',
  'Amélioration',
  'Réparation / Panne',
  'Contrôle',
  'Gestion des accès',
  'Sécurité',
  'Représentation',
  'Achat/Vente',
  'Autre'
];

export default function CompanyRequestScreen() {
  const { company: initialCompanyId, clientId: initialClientId, boatId: initialBoatId } = useLocalSearchParams<{
    company?: string;
    clientId?: string;
    boatId?: string;
  }>();
  
  const { user } = useAuth();
  
  // Définir la date de validité par défaut (30 jours à partir d'aujourd'hui)
  const defaultValidUntil = new Date();
  defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
  const defaultValidUntilStr = defaultValidUntil.toISOString().split('T')[0];
  
  const [form, setForm] = useState<RequestForm>({
    title: '',
    clientId: initialClientId || '',
    clientName: '',
    boatId: initialBoatId || '',
    boatName: '',
    boatType: '',
    companyId: initialCompanyId || '',
    companyName: '',
    validUntil: defaultValidUntilStr,
    services: [
      {
        id: '1',
        name: '',
        description: '',
        amount: 0
      }
    ],
    urgency: 'normal',
    type: '',
    description: '',
    category: 'Services',
    date: new Date().toISOString().split('T')[0],
    forClient: true
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof RequestForm | 'services', string>>>({});
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  // State to hold the selected client for the boat selection modal
  const [selectedClientForBoat, setSelectedClientForBoat] = useState<Client | null>(null);

  // Effet pour charger les données initiales
  useEffect(() => {
    if (initialClientId) {
      const client = mockClients.find(c => c.id === initialClientId);
      if (client) {
        setForm(prev => ({
          ...prev,
          clientId: client.id,
          clientName: client.name
        }));
        setSelectedClientForBoat(client); // Set selected client for boat modal
      }
    }
    
    if (initialBoatId) {
      const client = mockClients.find(c => 
        c.boats.some(b => b.id === initialBoatId)
      );
      
      if (client) {
        const boat = client.boats.find(b => b.id === initialBoatId);
        if (boat) {
          setForm(prev => ({
            ...prev,
            clientId: client.id,
            clientName: client.name,
            boatId: boat.id,
            boatName: boat.name,
            boatType: boat.type
          }));
          setSelectedClientForBoat(client); // Set selected client for boat modal
        }
      }
    }
    
    if (initialCompanyId) {
      const company = mockCompanies.find(c => c.id === initialCompanyId);
      if (company) {
        setForm(prev => ({
          ...prev,
          companyId: company.id,
          companyName: company.name
        }));
      }
    }
  }, [initialClientId, initialBoatId, initialCompanyId]);

  // Filtrer les clients en fonction de la recherche
  const filteredClients = mockClients.filter(client => {
    if (!clientSearchQuery) return true;
    const query = clientSearchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.boats.some(boat => boat.name.toLowerCase().includes(query))
    );
  });

  // Filtrer les entreprises en fonction de la recherche
  const filteredCompanies = mockCompanies.filter(company => {
    if (!companySearchQuery) return true;
    const query = companySearchQuery.toLowerCase();
    return (
      company.name.toLowerCase().includes(query) ||
      company.location.toLowerCase().includes(query) ||
      company.services.some(service => service.toLowerCase().includes(query))
    );
  });

  const handleSelectClient = (client: Client) => {
    setForm(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.name,
      boatId: '',
      boatName: '',
      boatType: ''
    }));
    setSelectedClientForBoat(client); // Update selected client for boat modal
    setShowClientModal(false);
    
    // Si le client n'a qu'un seul bateau, le sélectionner automatiquement
    if (client.boats.length === 1) {
      const boat = client.boats[0];
      setForm(prev => ({
        ...prev,
        boatId: boat.id,
        boatName: boat.name,
        boatType: boat.type
      }));
    } else {
      // Sinon, ouvrir le modal de sélection de bateau
      setShowBoatModal(true);
    }
  };

  const handleSelectBoat = (boat: Client['boats'][0]) => {
    setForm(prev => ({
      ...prev,
      boatId: boat.id,
      boatName: boat.name,
      boatType: boat.type
    }));
    setShowBoatModal(false);
  };

  const handleSelectCompany = (company: NauticalCompany) => {
    setForm(prev => ({
      ...prev,
      companyId: company.id,
      companyName: company.name
    }));
    setShowCompanyModal(false);
  };

  const handleSelectServiceType = (type: string) => {
    setForm(prev => ({ ...prev, type }));
    setShowServiceTypeModal(false);
    if (errors.type) {
      setErrors(prev => ({ ...prev, type: undefined }));
    }
  };

  const toggleUrgency = () => {
    setForm(prev => ({
      ...prev,
      urgency: prev.urgency === 'normal' ? 'urgent' : 'normal'
    }));
  };

  const toggleForClient = () => {
    setForm(prev => ({
      ...prev,
      forClient: !prev.forClient
    }));
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof RequestForm | 'services', string>> = {};
    
    if (!form.clientId) newErrors.clientId = 'Le client est requis';
    if (!form.boatId) newErrors.boatId = 'Le bateau est requis';
    if (!form.title.trim()) newErrors.title = 'Le titre est requis';
    if (!form.type.trim()) newErrors.type = 'Le type de service est requis';
    if (!form.description.trim()) newErrors.description = 'La description est requise';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Ici, vous enverriez normalement les données au serveur
      // Pour cette démo, nous simulons simplement une réponse réussie
      
      const message = form.forClient 
        ? `La demande a été créée avec succès au nom de ${form.clientName} et apparaîtra dans son suivi.` 
        : `La demande a été créée avec succès et sera traitée par vous-même.`;
      
      const additionalMessage = form.companyId 
        ? `\n\nLa demande a également été transmise à ${form.companyName}.` 
        : '';
      
      Alert.alert(
        'Demande envoyée',
        message + additionalMessage,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }
  };

  // Client selection modal
const ClientSelectionModal = () => (
  <Modal
    visible={showClientModal}
    transparent
    animationType="slide"
    onRequestClose={() => setShowClientModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Sélectionner un client</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowClientModal(false)}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalList}>
          {mockClients.map(client => {
            return (
              <TouchableOpacity
                key={client.id}
                style={styles.modalItem}
                onPress={() => handleSelectClient(client)}
              >
                <View style={styles.modalItemContent}>
                  <User size={20} color="#0066CC" />
                  <Text style={styles.modalItemText}>
                    {String(client?.name ?? '')}
                  </Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// Boat selection modal
const BoatSelectionModal = ({ client }: { client: Client | null }) => (
  <Modal
    visible={showBoatModal}
    transparent
    animationType="slide"
    onRequestClose={() => setShowBoatModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Sélectionner un bateau</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowBoatModal(false)}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        {client ? (
          <ScrollView style={styles.modalList}>
            {client.boats.map(boat => {
              return (
                <TouchableOpacity
                  key={boat.id}
                  style={styles.modalItem}
                  onPress={() => handleSelectBoat(boat)}
                >
                  <View style={styles.modalItemContent}>
                    <Boat size={20} color="#0066CC" />
                    <View>
                      <Text style={styles.modalItemText}>
                        {String(boat?.name ?? '')}
                      </Text>
                      <Text style={styles.modalItemSubtext}>
                        {String(boat?.type ?? '')}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyModalState}>
            <Text style={styles.emptyModalText}>Veuillez d'abord sélectionner un client</Text>
          </View>
        )}
      </View>
    </View>
  </Modal>
);


  // Modal de sélection d'entreprise
  const CompanySelectionModal = () => (
    <Modal
      visible={showCompanyModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCompanyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner une entreprise</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCompanyModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une entreprise..."
              value={companySearchQuery}
              onChangeText={setCompanySearchQuery}
            />
          </View>
          
          <ScrollView style={styles.modalList}>
            {filteredCompanies.map((company) => (
              <TouchableOpacity
                key={company.id}
                style={styles.modalItem}
                onPress={() => handleSelectCompany(company)}
              >
                <View style={styles.modalItemContent}>
                  <Building size={20} color="#0066CC" />
                  <View>
                    <Text style={styles.modalItemText}>{company.name}</Text>
                    <Text style={styles.modalItemSubtext}>{company.location}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Modal de sélection du type de service
  const ServiceTypeModal = () => (
    <Modal
      visible={showServiceTypeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowServiceTypeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Type de service</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowServiceTypeModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            {serviceTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.modalItem}
                onPress={() => handleSelectServiceType(type)}
              >
                <Text style={styles.modalItemText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
        <Text style={styles.title}>Nouvelle Demande</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Informations client */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations client</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <User size={20} color="#0066CC" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Client</Text>
                  <TouchableOpacity onPress={() => setShowClientModal(true)}>
                    <Text style={form.clientName ? styles.infoValue : styles.infoPlaceholder}>
                      {form.clientName || 'Sélectionner un client'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {errors.clientId && <Text style={styles.errorText}>{errors.clientId}</Text>}
              
              <View style={styles.infoRow}>
                <Boat size={20} color="#0066CC" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Bateau</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      if (form.clientId) {
                        setShowBoatModal(true);
                      } else {
                        Alert.alert('Erreur', 'Veuillez d\'abord sélectionner un client');
                      }
                    }}
                  >
                    <Text style={form.boatName ? styles.infoValue : styles.infoPlaceholder}>
                      {form.boatName ? `${form.boatName} (${form.boatType})` : 'Sélectionner un bateau'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {errors.boatId && <Text style={styles.errorText}>{errors.boatId}</Text>}
            </View>
          </View>

          {/* Options de la demande */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Options de la demande</Text>
            
            <View style={styles.optionsCard}>
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Créer au nom du client</Text>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton, 
                    form.forClient ? styles.toggleButtonActive : styles.toggleButtonInactive
                  ]}
                  onPress={toggleForClient}
                >
                  <View style={[
                    styles.toggleIndicator, 
                    form.forClient ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive
                  ]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.optionDescription}>
                {form.forClient 
                  ? "La demande apparaîtra dans le suivi du client comme s'il l'avait créée lui-même." 
                  : "La demande sera traitée par vous-même et n'apparaîtra pas dans le suivi du client."}
              </Text>
              
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Transmettre à une entreprise</Text>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton, 
                    form.companyId ? styles.toggleButtonActive : styles.toggleButtonInactive
                  ]}
                  onPress={() => {
                    if (form.companyId) {
                      setForm(prev => ({ ...prev, companyId: '', companyName: '' }));
                    } else {
                      setShowCompanyModal(true);
                    }
                  }}
                >
                  <View style={[
                    styles.toggleIndicator, 
                    form.companyId ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive
                  ]} />
                </TouchableOpacity>
              </View>
              
              {form.companyId && (
                <View style={styles.selectedCompanyContainer}>
                  <Building size={16} color="#0066CC" />
                  <Text style={styles.selectedCompanyText}>{form.companyName}</Text>
                  <TouchableOpacity 
                    style={styles.changeCompanyButton}
                    onPress={() => setShowCompanyModal(true)}
                  >
                    <Text style={styles.changeCompanyText}>Changer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Détails de la demande */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails de la demande</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Titre de la demande</Text>
              <View style={[styles.inputWrapper, errors.title && styles.inputWrapperError]}>
                <FileText size={20} color={errors.title ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  value={form.title}
                  onChangeText={(text) => {
                    setForm(prev => ({ ...prev, title: text }));
                    if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
                  }}
                  placeholder="Titre de la demande"
                />
              </View>
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Type de service</Text>
              <TouchableOpacity 
                style={[styles.serviceTypeSelector, errors.type && styles.inputWrapperError]}
                onPress={() => setShowServiceTypeModal(true)}
              >
                <FileText size={20} color={errors.type ? '#ff4444' : '#666'} />
                <Text style={[styles.servicePlaceholder, form.type ? styles.serviceSelected : {}]}>
                  {form.type || 'Sélectionner un type de service'}
                </Text>
              </TouchableOpacity>
              {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <View style={[styles.textAreaWrapper, errors.description && styles.inputWrapperError]}>
                <TextInput
                  style={styles.textArea}
                  value={form.description}
                  onChangeText={(text) => {
                    setForm(prev => ({ ...prev, description: text }));
                    if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Description détaillée de la demande"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Lieu</Text>
              <View style={styles.inputWrapper}>
                <MapPin size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  value={form.location}
                  onChangeText={(text) => setForm(prev => ({ ...prev, location: text }))}
                  placeholder="Lieu de l'intervention (optionnel)"
                />
              </View>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Notes additionnelles</Text>
              <View style={styles.textAreaWrapper}>
                <TextInput
                  style={styles.textArea}
                  value={form.notes}
                  onChangeText={(text) => setForm(prev => ({ ...prev, notes: text }))}
                  placeholder="Notes additionnelles (optionnel)"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
            
            <View style={styles.urgencySelector}>
              <Text style={styles.urgencySelectorTitle}>Niveau d'urgence</Text>
              <View style={styles.urgencyOptions}>
                <TouchableOpacity 
                  style={[
                    styles.urgencyOption,
                    form.urgency === 'normal' && styles.urgencyOptionSelected
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, urgency: 'normal' }))}
                >
                  <Text style={[
                    styles.urgencyOptionText,
                    form.urgency === 'normal' && styles.urgencyOptionTextSelected
                  ]}>
                    Normal
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.urgencyOption,
                    form.urgency === 'urgent' && styles.urgencyOptionUrgentSelected
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, urgency: 'urgent' }))}
                >
                  <AlertTriangle 
                    size={16} 
                    color={form.urgency === 'urgent' ? 'white' : '#DC2626'} 
                  />
                  <Text style={[
                    styles.urgencyOptionText,
                    form.urgency === 'urgent' && styles.urgencyOptionUrgentTextSelected
                  ]}>
                    Urgent
                  </Text>
                </TouchableOpacity>
              </View>
              
              {form.urgency === 'urgent' && (
                <View style={styles.urgencyNote}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <Text style={styles.urgencyNoteText}>
                    En sélectionnant "Urgent", la demande sera traitée en priorité.
                  </Text>
                </View>
              )}
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Envoyer la demande</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <ClientSelectionModal />
      <BoatSelectionModal client={selectedClientForBoat} />
      <CompanySelectionModal />
      <ServiceTypeModal />
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
  content: {
    padding: 20,
    paddingBottom:  40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  infoCard: {
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  infoPlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
  },
  optionsCard: {
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
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: -8,
    marginBottom: 8,
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#0066CC',
  },
  toggleButtonInactive: {
    backgroundColor: '#e2e8f0',
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  toggleIndicatorActive: {
    backgroundColor: 'white',
    alignSelf: 'flex-end',
  },
  toggleIndicatorInactive: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  selectedCompanyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectedCompanyText: {
    flex: 1,
    fontSize: 14,
    color: '#0066CC',
  },
  changeCompanyButton: {
    padding: 4,
  },
  changeCompanyText: {
    fontSize: 14,
    color: '#0066CC',
    textDecorationLine: 'underline',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  textAreaWrapper: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
  },
  textArea: {
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  serviceTypeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 48,
  },
  servicePlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#94a3b8',
  },
  serviceSelected: {
    color: '#1a1a1a',
  },
  urgencySelector: {
    marginBottom: 24,
  },
  urgencySelectorTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  urgencyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  urgencyOptionSelected: {
    borderColor: '#0066CC',
    backgroundColor: '#f0f7ff',
  },
  urgencyOptionUrgentSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#DC2626',
  },
  urgencyOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  urgencyOptionTextSelected: {
    color: 'white',
  },
  urgencyOptionUrgentTextSelected: {
    color: 'white',
  },
  urgencyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  urgencyNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
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
  modalList: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
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
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalItemSubtext: {
    fontSize: 14,
    color: '#666',
  },
  emptyModalState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalCancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
  },
});
