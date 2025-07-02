import { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Image, Modal, Alert, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, X, FileText, Calendar, PenTool as Tool, Clipboard, Plus, Download, Upload, ChevronRight, Check, Radio, Briefcase, Anchor, Sailboat, Fish, Users, Chrome as Home, Trophy, CircleHelp as HelpCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context/AuthContext';

interface BoatDetails {
  photo: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  constructionYear: string;
  engine: string;
  engineHours: string;
  length: string;
  homePort: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  date: string;
  file: string;
}

interface TechnicalRecord {
  id: string;
  title: string;
  description: string;
  date: string;
  performedBy: string;
  documents?: Document[];
}

interface InventoryItem {
  id: string;
  category: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  notes?: string;
}

interface UsageType {
  legalNature: 'personal' | 'professional' | null;
  ownershipStatus: 'full_ownership' | 'joint_ownership' | 'financial_lease' | null;
  leaseType?: string;
  leaseEndDate?: string;
  usagePurposes: {
    leisure: boolean;
    fishing: boolean;
    cruising: boolean;
    charter: boolean;
    competition: boolean;
    permanentHousing: boolean;
    other: boolean;
    otherDescription?: string;
  };
}

// This would typically come from your API or database
const boatsData = {
  '1': {
    photo: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop',
    name: 'Le Grand Bleu',
    type: 'Voilier',
    manufacturer: 'Bénéteau',
    model: 'Oceanis 45',
    constructionYear: '2020',
    engine: 'Volvo Penta D2-50',
    engineHours: '500',
    length: '12m',
    homePort: 'Port de Marseille',
  },
  '2': {
    photo: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?q=80&w=2044&auto=format&fit=crop',
    name: 'Le Petit Prince',
    type: 'Yacht',
    manufacturer: 'Jeanneau',
    model: 'Sun Odyssey 410',
    constructionYear: '2022',
    engine: 'Yanmar 4JH45',
    engineHours: '200',
    length: '15m',
    homePort: 'Port de Nice',
  },
};

// Sample documents
const mockDocuments: Record<string, Document[]> = {
  '1': [
    {
      id: 'd1',
      name: 'Acte de francisation',
      type: 'administrative',
      date: '2020-05-15',
      file: 'acte_francisation.pdf'
    },
    {
      id: 'd2',
      name: 'Assurance',
      type: 'administrative',
      date: '2024-01-10',
      file: 'assurance_2024.pdf'
    },
    {
      id: 'd3',
      name: 'Place de port',
      type: 'administrative',
      date: '2024-01-05',
      file: 'place_port_2024.pdf'
    }
  ],
  '2': [
    {
      id: 'd4',
      name: 'Acte de francisation',
      type: 'administrative',
      date: '2022-03-20',
      file: 'acte_francisation.pdf'
    },
    {
      id: 'd5',
      name: 'Assurance',
      type: 'administrative',
      date: '2024-01-15',
      file: 'assurance_2024.pdf'
    }
  ]
};

// Sample technical records
const mockTechnicalRecords: Record<string, TechnicalRecord[]> = {
  '1': [
    {
      id: 't1',
      title: 'Entretien moteur',
      description: 'Révision complète du moteur et changement des filtres',
      date: '2023-11-15',
      performedBy: 'Nautisme Pro',
      documents: [
        {
          id: 'td1',
          name: 'Facture entretien moteur',
          type: 'invoice',
          date: '2023-11-15',
          file: 'facture_entretien_moteur.pdf'
        }
      ]
    },
    {
      id: 't2',
      title: 'Remplacement voile',
      description: 'Remplacement de la grand-voile',
      date: '2023-08-10',
      performedBy: 'Marine Services',
      documents: [
        {
          id: 'td2',
          name: 'Facture voile',
          type: 'invoice',
          date: '2023-08-10',
          file: 'facture_voile.pdf'
        }
      ]
    }
  ],
  '2': [
    {
      id: 't3',
      title: 'Installation GPS',
      description: 'Installation d\'un nouveau système GPS',
      date: '2023-12-05',
      performedBy: 'Nautisme Pro',
      documents: [
        {
          id: 'td3',
          name: 'Facture GPS',
          type: 'invoice',
          date: '2023-12-05',
          file: 'facture_gps.pdf'
        }
      ]
    }
  ]
};

// Sample inventory items
const mockInventory: Record<string, InventoryItem[]> = {
  '1': [
    {
      id: 'i1',
      category: 'Navigation',
      name: 'GPS',
      brand: 'Garmin',
      model: 'GPSMAP 1243xsv',
      serialNumber: 'GAR123456',
      purchaseDate: '2020-06-15',
      notes: 'Installé sur le tableau de bord'
    },
    {
      id: 'i2',
      category: 'Sécurité',
      name: 'Gilets de sauvetage',
      brand: 'Plastimo',
      purchaseDate: '2020-05-20',
      notes: '6 gilets adultes'
    },
    {
      id: 'i3',
      category: 'Moteur',
      name: 'Hélice de secours',
      brand: 'Volvo',
      model: 'P2-50',
      purchaseDate: '2021-03-10'
    }
  ],
  '2': [
    {
      id: 'i4',
      category: 'Navigation',
      name: 'Radar',
      brand: 'Raymarine',
      model: 'Quantum 2',
      serialNumber: 'RAY987654',
      purchaseDate: '2022-04-10'
    },
    {
      id: 'i5',
      category: 'Confort',
      name: 'Climatisation',
      brand: 'Webasto',
      model: 'BlueCool S',
      serialNumber: 'WEB456789',
      purchaseDate: '2022-05-15'
    }
  ]
};

// Sample usage type data
const mockUsageTypes: Record<string, UsageType> = {
  '1': {
    legalNature: 'personal',
    ownershipStatus: 'full_ownership',
    usagePurposes: {
      leisure: true,
      fishing: false,
      cruising: true,
      charter: false,
      competition: false,
      permanentHousing: false,
      other: false
    }
  },
  '2': {
    legalNature: 'professional',
    ownershipStatus: 'financial_lease',
    leaseType: 'Crédit-bail',
    leaseEndDate: '15-05-2027',
    usagePurposes: {
      leisure: false,
      fishing: false,
      cruising: false,
      charter: true,
      competition: false,
      permanentHousing: false,
      other: false
    }
  }
};

// Extracted and memoized UsageTypeTab component
const UsageTypeTab = memo(({
  usageType,
  setUsageType,
  leaseType,
  setLeaseType,
  leaseEndDate,
  setLeaseEndDate,
  otherUsageDescription,
  setOtherUsageDescription,
  handleToggleUsagePurpose,
  handleSaveUsageType,
}) => {
  const handleSetLegalNature = useCallback((nature: 'personal' | 'professional') => {
    setUsageType(prev => ({
      ...prev,
      legalNature: nature
    }));
  }, [setUsageType]);

  const handleSetOwnershipStatus = useCallback((status: 'full_ownership' | 'joint_ownership' | 'financial_lease') => {
    setUsageType(prev => ({
      ...prev,
      ownershipStatus: status
    }));
  }, [setUsageType]);

  return (
    <View style={styles.tabContent}>
      {/* Legal Nature Section */}
      <View style={styles.usageSection}>
        <Text style={styles.usageSectionTitle}>Nature juridique de l'utilisation</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleSetLegalNature('personal')}
          >
            <View style={styles.radioContainer}>
              {usageType.legalNature === 'personal' ? (
                <View style={styles.radioChecked}>
                  <View style={styles.radioInner} />
                </View>
              ) : (
                <View style={styles.radioUnchecked} />
              )}
            </View>
            <Text style={styles.optionText}>Particulier</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleSetLegalNature('professional')}
          >
            <View style={styles.radioContainer}>
              {usageType.legalNature === 'professional' ? (
                <View style={styles.radioChecked}>
                  <View style={styles.radioInner} />
                </View>
              ) : (
                <View style={styles.radioUnchecked} />
              )}
            </View>
            <Text style={styles.optionText}>Professionnel</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Ownership Status Section */}
      <View style={styles.usageSection}>
        <Text style={styles.usageSectionTitle}>Statut de l'utilisateur</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleSetOwnershipStatus('full_ownership')}
          >
            <View style={styles.radioContainer}>
              {usageType.ownershipStatus === 'full_ownership' ? (
                <View style={styles.radioChecked}>
                  <View style={styles.radioInner} />
                </View>
              ) : (
                <View style={styles.radioUnchecked} />
              )}
            </View>
            <Text style={styles.optionText}>Pleine propriété</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleSetOwnershipStatus('joint_ownership')}
          >
            <View style={styles.radioContainer}>
              {usageType.ownershipStatus === 'joint_ownership' ? (
                <View style={styles.radioChecked}>
                  <View style={styles.radioInner} />
                </View>
              ) : (
                <View style={styles.radioUnchecked} />
              )}
            </View>
            <Text style={styles.optionText}>Indivision</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleSetOwnershipStatus('financial_lease')}
          >
            <View style={styles.radioContainer}>
              {usageType.ownershipStatus === 'financial_lease' ? (
                <View style={styles.radioChecked}>
                  <View style={styles.radioInner} />
                </View>
              ) : (
                <View style={styles.radioUnchecked} />
              )}
            </View>
            <Text style={styles.optionText}>Location financière</Text>
          </TouchableOpacity>
          
          {usageType.ownershipStatus === 'financial_lease' && (
            <View style={styles.leaseDetailsContainer}>
              <View style={styles.leaseDetailRow}>
                <Text style={styles.leaseDetailLabel}>Type de contrat:</Text>
                <TextInput
                  style={styles.leaseDetailInput}
                  value={leaseType}
                  onChangeText={setLeaseType}
                  placeholder="Type de contrat"
                />
              </View>
              <View style={styles.leaseDetailRow}>
                <Text style={styles.leaseDetailLabel}>Échéance:</Text>
                <TextInput
                  style={styles.leaseDetailInput}
                  value={leaseEndDate}
                  onChangeText={setLeaseEndDate}
                  placeholder="JJ-MM-AAAA"
                  keyboardType="numeric"
                  inputMode="numeric"
                />
              </View>
            </View>
          )}
        </View>
      </View>
      
      {/* Usage Purposes Section */}
      <View style={styles.usageSection}>
        <Text style={styles.usageSectionTitle}>Utilisation</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleToggleUsagePurpose('leisure')}
          >
            <View style={styles.checkboxContainer}>
              {usageType.usagePurposes.leisure ? (
                <View style={styles.checkboxChecked}>
                  <Check size={16} color="white" />
                </View>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
            </View>
            <View style={styles.optionIconTextContainer}>
              <Sailboat size={20} color="#0066CC" />
              <Text style={styles.optionText}>Loisir</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleToggleUsagePurpose('fishing')}
          >
            <View style={styles.checkboxContainer}>
              {usageType.usagePurposes.fishing ? (
                <View style={styles.checkboxChecked}>
                  <Check size={16} color="white" />
                </View>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
            </View>
            <View style={styles.optionIconTextContainer}>
              <Fish size={20} color="#0066CC" />
              <Text style={styles.optionText}>Pêche</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleToggleUsagePurpose('cruising')}
          >
            <View style={styles.checkboxContainer}>
              {usageType.usagePurposes.cruising ? (
                <View style={styles.checkboxChecked}>
                  <Check size={16} color="white" />
                </View>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
            </View>
            <View style={styles.optionIconTextContainer}>
              <Anchor size={20} color="#0066CC" />
              <Text style={styles.optionText}>Promenade</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleToggleUsagePurpose('charter')}
          >
            <View style={styles.checkboxContainer}>
              {usageType.usagePurposes.charter ? (
                <View style={styles.checkboxChecked}>
                  <Check size={16} color="white" />
                </View>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
            </View>
            <View style={styles.optionIconTextContainer}>
              <Users size={20} color="#0066CC" />
              <Text style={styles.optionText}>Charter/Location</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleToggleUsagePurpose('competition')}
          >
            <View style={styles.checkboxContainer}>
              {usageType.usagePurposes.competition ? (
                <View style={styles.checkboxChecked}>
                  <Check size={16} color="white" />
                </View>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
            </View>
            <View style={styles.optionIconTextContainer}>
              <Trophy size={20} color="#0066CC" />
              <Text style={styles.optionText}>Compétition</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleToggleUsagePurpose('permanentHousing')}
          >
            <View style={styles.checkboxContainer}>
              {usageType.usagePurposes.permanentHousing ? (
                <View style={styles.checkboxChecked}>
                  <Check size={16} color="white" />
                </View>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
            </View>
            <View style={styles.optionIconTextContainer}>
              <Home size={20} color="#0066CC" />
              <Text style={styles.optionText}>Habitat permanent</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionRow}
            onPress={() => handleToggleUsagePurpose('other')}
          >
            <View style={styles.checkboxContainer}>
              {usageType.usagePurposes.other ? (
                <View style={styles.checkboxChecked}>
                  <Check size={16} color="white" />
                </View>
              ) : (
                <View style={styles.checkboxUnchecked} />
              )}
            </View>
            <View style={styles.optionIconTextContainer}>
              <HelpCircle size={20} color="#0066CC" />
              <Text style={styles.optionText}>Autre</Text>
            </View>
          </TouchableOpacity>
          
          {usageType.usagePurposes.other && (
            <View style={styles.otherUsageContainer}>
              <TextInput
                style={styles.otherUsageInput}
                value={otherUsageDescription}
                onChangeText={setOtherUsageDescription}
                placeholder="Précisez l'utilisation"
                multiline
              />
            </View>
          )}
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.saveUsageButton}
        onPress={handleSaveUsageType}
      >
        <Text style={styles.saveUsageButtonText}>Enregistrer</Text>
      </TouchableOpacity>
    </View>
  );
});

export default function BoatProfileScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'documents' | 'technical' | 'inventory' | 'usage'>('general');
  const [boatDetails, setBoatDetails] = useState<BoatDetails | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [technicalRecords, setTechnicalRecords] = useState<TechnicalRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usageType, setUsageType] = useState<UsageType>({
    legalNature: null,
    ownershipStatus: null,
    usagePurposes: {
      leisure: false,
      fishing: false,
      cruising: false,
      charter: false,
      competition: false,
      permanentHousing: false,
      other: false
    }
  });
  
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false);
  const [showAddTechnicalRecordModal, setShowAddTechnicalRecordModal] = useState(false);
  const [showAddInventoryItemModal, setShowAddInventoryItemModal] = useState(false);
  const [leaseType, setLeaseType] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [otherUsageDescription, setOtherUsageDescription] = useState('');
  

  useEffect(() => {
    // Load boat data based on ID
    if (id && typeof id === 'string' && boatsData[id]) {
      setBoatDetails(boatsData[id]);
      setDocuments(mockDocuments[id] || []);
      setTechnicalRecords(mockTechnicalRecords[id] || []);
      setInventory(mockInventory[id] || []);
      setUsageType(mockUsageTypes[id] || {
        legalNature: null,
        ownershipStatus: null,
        usagePurposes: {
          leisure: false,
          fishing: false,
          cruising: false,
          charter: false,
          competition: false,
          permanentHousing: false,
          other: false
        }
      });
      
      // Set lease details if available
      if (mockUsageTypes[id]?.leaseType) {
        setLeaseType(mockUsageTypes[id].leaseType || '');
      }
      if (mockUsageTypes[id]?.leaseEndDate) {
        setLeaseEndDate(mockUsageTypes[id].leaseEndDate || '');
      }
      
      // Set other usage description if available
      if (mockUsageTypes[id]?.usagePurposes.other && mockUsageTypes[id]?.usagePurposes.otherDescription) {
        setOtherUsageDescription(mockUsageTypes[id].usagePurposes.otherDescription || '');
      }
    }
  }, [id]);

  const handleEditBoat = () => {
    if (id) {
      router.push(`/boats/edit/${id}`);
    }
  };

  const handleAddDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const newDocument: Document = {
        id: `d${Date.now()}`,
        name: result.assets[0].name,
        type: 'administrative',
        date: new Date().toISOString().split('T')[0],
        file: result.assets[0].uri,
      };

      setDocuments(prev => [...prev, newDocument]);
      setShowAddDocumentModal(false);
      
      Alert.alert('Succès', 'Document ajouté avec succès');
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sélection du document.');
    }
  };

  const handleAddTechnicalRecord = () => {
    router.push(`/boats/technical/new?boatId=${id}`);
  };


  
  const handleAddInventoryItem = () => {
    router.push(`/boats/inventory/new?boatId=${id}`);
  };

  const handleOpenInventory = () => {
    router.push(`/boats/inventory?boatId=${id}`);
  };

  const handleViewDocument = (document: Document) => {
    router.push(`/boats/document/${document.id}?boatId=${id}`);
  };

  const handleViewTechnicalRecord = (record: TechnicalRecord) => {
    router.push(`/boats/technical/${record.id}?boatId=${id}`);
  };

  const handleViewInventoryItem = (item: InventoryItem) => {
    router.push(`/boats/inventory/${item.id}?boatId=${id}`);
  };
  
  const handleToggleUsagePurpose = useCallback((purpose: keyof UsageType['usagePurposes']) => {
    setUsageType(prev => ({
      ...prev,
      usagePurposes: {
        ...prev.usagePurposes,
        [purpose]: !prev.usagePurposes[purpose]
      }
    }));
  }, [setUsageType]);
  
  const handleSaveUsageType = useCallback(() => {
    // Create updated usage type with all fields
    const updatedUsageType: UsageType = {
      ...usageType,
      leaseType: usageType.ownershipStatus === 'financial_lease' ? leaseType : undefined,
      leaseEndDate: usageType.ownershipStatus === 'financial_lease' ? leaseEndDate : undefined,
      usagePurposes: {
        ...usageType.usagePurposes,
        otherDescription: usageType.usagePurposes.other ? otherUsageDescription : undefined
      }
    };
    
    // In a real app, you would save this to your backend
    console.log('Saving usage type:', updatedUsageType);
    
    // Update the mock data for this example
    if (id && typeof id === 'string') {
      mockUsageTypes[id] = updatedUsageType;
    }
    
    Alert.alert('Succès', 'Les informations d\'utilisation ont été enregistrées avec succès');
  }, [usageType, leaseType, leaseEndDate, otherUsageDescription, id]);

  if (!id || typeof id !== 'string' || !boatDetails) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Bateau non trouvé</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ce bateau n'existe pas.</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const AddDocumentModal = () => (
    <Modal
      visible={showAddDocumentModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAddDocumentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Ajouter un document</Text>
          
          <TouchableOpacity style={styles.modalOption} onPress={handleAddDocument}>
            <FileText size={24} color="#0066CC" />
            <Text style={styles.modalOptionText}>Sélectionner un document</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowAddDocumentModal(false)}
          >
            <Text style={styles.modalCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const AddTechnicalRecordModal = () => (
    <Modal
      visible={showAddTechnicalRecordModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAddTechnicalRecordModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Ajouter une intervention</Text>
          
          <TouchableOpacity style={styles.modalOption} onPress={handleAddTechnicalRecord}>
            <Tool size={24} color="#0066CC" />
            <Text style={styles.modalOptionText}>Nouvelle intervention</Text>
          </TouchableOpacity>


          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowAddTechnicalRecordModal(false)}
          >
            <Text style={styles.modalCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const AddInventoryItemModal = () => (
    <Modal
      visible={showAddInventoryItemModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAddInventoryItemModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Ajouter un équipement</Text>
          
          <TouchableOpacity style={styles.modalOption} onPress={handleAddInventoryItem}>
            <Plus size={24} color="#0066CC" />
            <Text style={styles.modalOptionText}>Nouvel équipement</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalOption} onPress={handleOpenInventory}>
            <Clipboard size={24} color="#0066CC" />
            <Text style={styles.modalOptionText}>Inventaire complet</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.modalCancelButton}
            onPress={() => setShowAddInventoryItemModal(false)}
          >
            <Text style={styles.modalCancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const GeneralInfoTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nom</Text>
          <Text style={styles.infoValue}>{boatDetails.name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Type</Text>
          <Text style={styles.infoValue}>{boatDetails.type}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Constructeur</Text>
          <Text style={styles.infoValue}>{boatDetails.manufacturer}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Modèle</Text>
          <Text style={styles.infoValue}>{boatDetails.model}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Année de construction</Text>
          <Text style={styles.infoValue}>{boatDetails.constructionYear}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Moteur</Text>
          <Text style={styles.infoValue}>{boatDetails.engine}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Heures moteur</Text>
          <Text style={styles.infoValue}>{boatDetails.engineHours}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Longueur</Text>
          <Text style={styles.infoValue}>{boatDetails.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Port d'attache</Text>
          <Text style={styles.infoValue}>{boatDetails.homePort}</Text>
        </View>
      </View>
    </View>
  );

  const DocumentsTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowAddDocumentModal(true)}
      >
        <Plus size={20} color="#0066CC" />
        <Text style={styles.addButtonText}>Ajouter un document</Text>
      </TouchableOpacity>

      {documents.length > 0 ? (
        <View style={styles.documentsList}>
          {documents.map((document) => (
            <TouchableOpacity 
              key={document.id} 
              style={styles.documentCard}
              onPress={() => handleViewDocument(document)}
            >
              <View style={styles.documentIcon}>
                <FileText size={24} color="#0066CC" />
              </View>
              <View style={styles.documentInfo}>
                <Text style={styles.documentName}>{document.name}</Text>
                <Text style={styles.documentDate}>{document.date}</Text>
              </View>
              <TouchableOpacity style={styles.documentAction}>
                <Download size={20} color="#0066CC" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <FileText size={48} color="#ccc" />
          <Text style={styles.emptyStateTitle}>Aucun document</Text>
          <Text style={styles.emptyStateText}>
            Ajoutez vos documents administratifs comme l'acte de francisation, l'assurance, etc.
          </Text>
        </View>
      )}
    </View>
  );

  const TechnicalRecordsTab = () => (
    <View style={styles.tabContent}>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowAddTechnicalRecordModal(true)}
      >
        <Plus size={20} color="#0066CC" />
        <Text style={styles.addButtonText}>Ajouter une intervention</Text>
      </TouchableOpacity>

      {technicalRecords.length > 0 ? (
        <View style={styles.recordsList}>
          {technicalRecords.map((record) => (
            <TouchableOpacity 
              key={record.id} 
              style={styles.recordCard}
              onPress={() => handleViewTechnicalRecord(record)}
            >
              <View style={styles.recordHeader}>
                <View style={styles.recordTitleContainer}>
                  <Tool size={20} color="#0066CC" />
                  <Text style={styles.recordTitle}>{record.title}</Text>
                </View>
                <Text style={styles.recordDate}>{record.date}</Text>
              </View>
              <Text style={styles.recordDescription} numberOfLines={2}>
                {record.description}
              </Text>
              <View style={styles.recordFooter}>
                <Text style={styles.recordPerformedBy}>
                  Réalisé par: {record.performedBy}
                </Text>
                {record.documents && record.documents.length > 0 && (
                  <View style={styles.recordDocuments}>
                    <FileText size={16} color="#666" />
                    <Text style={styles.recordDocumentsText}>
                      {record.documents.length} document{record.documents.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
              <ChevronRight size={20} color="#0066CC" style={styles.recordChevron} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Tool size={48} color="#ccc" />
          <Text style={styles.emptyStateTitle}>Aucune intervention</Text>
          <Text style={styles.emptyStateText}>
            Ajoutez les interventions techniques réalisées sur votre bateau
          </Text>
        </View>
      )}
    </View>
  );

  const InventoryTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.inventoryActions}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddInventoryItemModal(true)}
        >
          <Plus size={20} color="#0066CC" />
          <Text style={styles.addButtonText}>Ajouter un équipement</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checklistButton}
          onPress={handleOpenInventory}
        >
          <Clipboard size={20} color="#0066CC" />
          <Text style={styles.checklistButtonText}>Inventaire complet</Text>
        </TouchableOpacity>
      </View>

      {inventory.length > 0 ? (
        <View style={styles.inventoryList}>
          {inventory.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.inventoryCard}
              onPress={() => handleViewInventoryItem(item)}
            >
              <View style={styles.inventoryHeader}>
                <View style={styles.inventoryCategoryBadge}>
                  <Text style={styles.inventoryCategoryText}>{item.category}</Text>
                </View>
                {item.purchaseDate && (
                  <Text style={styles.inventoryDate}>{item.purchaseDate}</Text>
                )}
              </View>
              <Text style={styles.inventoryName}>{item.name}</Text>
              {(item.brand || item.model) && (
                <Text style={styles.inventoryDetails}>
                  {item.brand}{item.brand && item.model ? ' - ' : ''}{item.model}
                </Text>
              )}
              {item.serialNumber && (
                <View style={styles.inventorySerialNumber}>
                  <Text style={styles.inventorySerialNumberText}>
                    S/N: {item.serialNumber}
                  </Text>
                </View>
              )}
              <ChevronRight size={20} color="#0066CC" style={styles.inventoryChevron} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Clipboard size={48} color="#ccc" />
          <Text style={styles.emptyStateTitle}>Aucun équipement</Text>
          <Text style={styles.emptyStateText}>
            Ajoutez les équipements présents sur votre bateau
          </Text>
        </View>
      )}
    </View>
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
        <Text style={styles.title}>{boatDetails.name}</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditBoat}
        >
          <Text style={styles.editButtonText}>Modifier</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.photoContainer}>
          <Image 
            source={{ uri: boatDetails.photo }}
            style={styles.photoPreview}
          />
          <View style={styles.boatTypeOverlay}>
            <Text style={styles.boatTypeText}>{boatDetails.type}</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'general' && styles.activeTab]}
            onPress={() => setActiveTab('general')}
          >
            <Text style={[styles.tabText, activeTab === 'general' && styles.activeTabText]}>
              Informations Générales
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'documents' && styles.activeTab]}
            onPress={() => setActiveTab('documents')}
          >
            <Text style={[styles.tabText, activeTab === 'documents' && styles.activeTabText]}>
              Documents Administratifs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'technical' && styles.activeTab]}
            onPress={() => setActiveTab('technical')}
          >
            <Text style={[styles.tabText, activeTab === 'technical' && styles.activeTabText]}>
              Carnet de suivi technique
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'inventory' && styles.activeTab]}
            onPress={() => setActiveTab('inventory')}
          >
            <Text style={[styles.tabText, activeTab === 'inventory' && styles.activeTabText]}>
              Inventaire du bateau
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'usage' && styles.activeTab]}
            onPress={() => setActiveTab('usage')}
          >
            <Text style={[styles.tabText, activeTab === 'usage' && styles.activeTabText]}>
              Type d'utilisation
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'general' && <GeneralInfoTab />}
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'technical' && <TechnicalRecordsTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'usage' && (
          <UsageTypeTab
            usageType={usageType}
            setUsageType={setUsageType}
            leaseType={leaseType}
            setLeaseType={setLeaseType}
            leaseEndDate={leaseEndDate}
            setLeaseEndDate={setLeaseEndDate}
            otherUsageDescription={otherUsageDescription}
            setOtherUsageDescription={setOtherUsageDescription}
            handleToggleUsagePurpose={handleToggleUsagePurpose}
            handleSaveUsageType={handleSaveUsageType}
          />
        )}
      </ScrollView>

      <AddDocumentModal />
      <AddTechnicalRecordModal />
      <AddInventoryItemModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    padding: 8,
  },
  editButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  photoContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  boatTypeOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  boatTypeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'white',
    paddingHorizontal: 8,
  },
  tab: {
    paddingVertical: 16,
    paddingHorizontal: 8,
    width: '50%',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
  },
  infoSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    maxWidth: '60%',
    textAlign: 'right',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  inventoryActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  checklistButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  checklistButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  documentsList: {
    gap: 12,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
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
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  documentDate: {
    fontSize: 14,
    color: '#666',
  },
  documentAction: {
    padding: 8,
  },
  recordsList: {
    gap: 12,
  },
  recordCard: {
    backgroundColor: 'white',
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
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  recordDate: {
    fontSize: 14,
    color: '#666',
  },
  recordDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordPerformedBy: {
    fontSize: 14,
    color: '#0066CC',
  },
  recordDocuments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordDocumentsText: {
    fontSize: 12,
    color: '#666',
  },
  recordChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  inventoryList: {
    gap: 12,
  },
  inventoryCard: {
    backgroundColor: 'white',
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
  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inventoryCategoryBadge: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  inventoryCategoryText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
  inventoryDate: {
    fontSize: 12,
    color: '#666',
  },
  inventoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  inventoryDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  inventorySerialNumber: {
    backgroundColor: '#f8fafc',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  inventorySerialNumberText: {
    fontSize: 12,
    color: '#666',
  },
  inventoryChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
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
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Usage Type Tab Styles
  usageSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  usageSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  optionIconTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  radioContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioUnchecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  radioChecked: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0066CC',
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxUnchecked: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#0066CC',
  },
  checkboxChecked: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaseDetailsContainer: {
    marginLeft: 36,
    marginTop: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  leaseDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaseDetailLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  leaseDetailInput: {
    flex: 1,
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'white',
  },
  otherUsageContainer: {
    marginLeft: 36,
    marginTop: 8,
  },
  otherUsageInput: {
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveUsageButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
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
  saveUsageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

