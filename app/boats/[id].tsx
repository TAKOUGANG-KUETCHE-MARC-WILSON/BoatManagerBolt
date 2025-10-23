// app/boats/[id].tsx
import { useState, useEffect, useCallback, memo } from 'react'; // Ajoutez useCallback
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Image as ImageIcon, X, FileText, Calendar, PenTool as Tool, ClipboardList, Plus, Download, Upload, ChevronRight, Check, Radio, Briefcase, Anchor, Sailboat, Fish, Users, Chrome as Home, Trophy, CircleHelp as HelpCircle, Wrench, Ship, MapPin, Tag, Info, Clock, Settings, BookText, Edit } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client
import CustomDateTimePicker from '@/components/CustomDateTimePicker'; // Import CustomDateTimePicker
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Image, Modal, Alert, TextInput, ActivityIndicator, useWindowDimensions } from 'react-native'; // Assurez-vous que tous les imports sont là
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';


// --- Notifications & logs (prod-safe) ---
const notifyError = (msg: string) => {
  if (Platform.OS === 'android') {
    // Evite l'Alert bloquante sur Android
    // @ts-ignore
    import('react-native').then(m => m.ToastAndroid?.show(msg, m.ToastAndroid.LONG));
  } else {
    Alert.alert('Oups', msg);
  }
};


const notifyInfo = (msg: string) => {
  if (Platform.OS === 'android') {
    // @ts-ignore
    import('react-native').then(m => m.ToastAndroid?.show(msg, m.ToastAndroid.SHORT));
  } else {
    Alert.alert('', msg);
  }
};


const log = (...args: any[]) => { if (__DEV__) console.log(...args); };
const logError = (scope: string, err: unknown) => {
  if (__DEV__) console.error(`[${scope}]`, err);
  // Intégration Sentry/Bugsnag possible ici
};


// --- Helpers URL image bateau ---
const DEFAULT_BOAT_PHOTO = 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?q=80&w=2044&auto=format&fit=crop';
const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));


const getSignedBoatPhoto = async (value?: string) => {
  try {
    if (!value) return DEFAULT_BOAT_PHOTO;
    if (isHttpUrl(value)) return value;


    // cas "storage/v1/object/public/boat.images/xxx"
    const prefix = '/storage/v1/object/public/boat.images/';
    const idx = value.indexOf(prefix);
    if (idx !== -1) {
      const path = value.substring(idx + prefix.length);
      const { data, error } = await supabase.storage.from('boat.images').createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!error && data?.signedUrl) return data.signedUrl;
    }


    // cas chemin interne bucket: "boat.images/.../file.jpg"
    if (value.startsWith('boat.images/')) {
      const { data, error } = await supabase.storage.from('boat.images').createSignedUrl(value.replace('boat.images/', ''), 60 * 60 * 24 * 7);
      if (!error && data?.signedUrl) return data.signedUrl;
    }
  } catch (e) {
    logError('getSignedBoatPhoto', e);
  }
  return DEFAULT_BOAT_PHOTO;
};






interface BoatDetails {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  constructionYear: string;
  engine: string;
  engineHours: string;
  length: string;
  homePort: string;
  photo: string;
  place_de_port: string; // Added place_de_port
}


interface UserDocument {
  id: string;
  name: string;
  type: string;
  date: string;
  file_url: string;
}


interface TechnicalRecord {
  id: string;
  title: string;
  description: string;
  date: string;
  performedBy: string;
  documents?: UserDocument[]; // Assuming technical records can have documents
}


interface InventoryItem {
  id: string;
  category: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string; // Changed from serialNumber to serial_number
  purchase_date?: string; // Changed from purchaseDate to purchase_date
  notes?: string;
  description?: string
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


// Extracted and memoized UsageTypeTab component
const UsageTypeTab = memo(({
  boatId, // Pass boatId to save usage type
  usageType,
  setUsageType,
  leaseType,
  setLeaseType,
  leaseEndDate,
  setLeaseEndDate,
  otherUsageDescription,
  setOtherUsageDescription,
}) => {
  const [isLeaseEndDatePickerVisible, setIsLeaseEndDatePickerVisible] = useState(false);


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


  const handleToggleUsagePurpose = useCallback((purpose: keyof UsageType['usagePurposes']) => {
    setUsageType(prev => ({
      ...prev,
      usagePurposes: {
        ...prev.usagePurposes,
        [purpose]: !prev.usagePurposes[purpose]
      }
    }));
  }, [setUsageType]);


  const handleSaveUsageType = useCallback(async () => {
  if (!boatId) {
    notifyError('ID du bateau manquant pour enregistrer ces informations.');
    return;
  }


  const updatedUsageType: UsageType = {
    ...usageType,
    leaseType: usageType.ownershipStatus === 'financial_lease' ? leaseType : undefined,
    leaseEndDate: usageType.ownershipStatus === 'financial_lease' ? leaseEndDate : undefined,
    usagePurposes: {
      ...usageType.usagePurposes,
      otherDescription: usageType.usagePurposes.other ? otherUsageDescription : undefined,
    },
  };


  try {
    const { error } = await supabase
      .from('boat_usage_types')
      .upsert(
        {
          boat_id: Number(boatId),
          legal_nature: updatedUsageType.legalNature,
          ownership_status: updatedUsageType.ownershipStatus,
          lease_type: updatedUsageType.leaseType,
          lease_end_date: updatedUsageType.leaseEndDate,
          usage_purposes: updatedUsageType.usagePurposes,
          other_description: updatedUsageType.usagePurposes.otherDescription,
        },
        { onConflict: 'boat_id' }
      )
      .select()
      .single();


    if (error) {
      logError('saveUsageType', error);
      notifyError(`Échec de l'enregistrement (${error.message}).`);
    } else {
      notifyInfo('Type d’utilisation enregistré ✅');
    }
  } catch (e) {
    logError('saveUsageType', e);
    notifyError('Erreur inattendue lors de l’enregistrement.');
  }
}, [boatId, usageType, leaseType, leaseEndDate, otherUsageDescription]);


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
                <TouchableOpacity onPress={() => setIsLeaseEndDatePickerVisible(true)} style={styles.leaseDetailInput}>
                  <Text>{leaseEndDate || 'JJ-MM-AAAA'}</Text>
                </TouchableOpacity>
                <CustomDateTimePicker
                  isVisible={isLeaseEndDatePickerVisible}
                  mode="date"
                  value={leaseEndDate ? new Date(leaseEndDate) : new Date()}
                  onConfirm={(date) => {
                    setLeaseEndDate(date.toISOString().split('T')[0]);
                    setIsLeaseEndDatePickerVisible(false);
                  }}
                  onCancel={() => setIsLeaseEndDatePickerVisible(false)}
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
  const [documents, setDocuments] = useState<UserDocument[]>([]);
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
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);


  // Move fetchBoatData outside useEffect to be reusable and memoized
  const fetchBoatData = useCallback(async () => {
    if (!id || typeof id !== 'string') {
      setFetchError('ID du bateau manquant.');
      setLoading(false);
      return;
    }


    setLoading(true);
    setFetchError(null);
    try {
      // Fetch main boat details
      const { data: boatData, error: boatError } = await supabase
        .from('boat')
        .select(`
            id,
            name,
            type,
            constructeur,
            modele,
            annee_construction,
            type_moteur,
            temps_moteur,
            longueur,
            image,
            id_port,
            ports(name),
            place_de_port
          `)
        .eq('id', id)
        .single();


      if (boatError) {
        if (boatError.code === 'PGRST116') {
          setFetchError('Bateau non trouvé.');
        } else {
          console.error('Error fetching boat:', boatError);
          setFetchError('Erreur lors du chargement du bateau.');
        }
        setLoading(false);
        return;
      }


      if (boatData) {
        // MODIFIÉ : Utilisation de getSignedBoatPhoto pour obtenir l'URL de la photo
        const photoUrl = await getSignedBoatPhoto(boatData.image || '');
       
        setBoatDetails({
          id: boatData.id.toString(),
          name: boatData.name || 'N/A',
          type: boatData.type || 'N/A',
          manufacturer: boatData.constructeur || 'N/A',
          model: boatData.modele || 'N/A',
          constructionYear: boatData.annee_construction ? new Date(boatData.annee_construction).getFullYear().toString() : 'N/A',
          engine: boatData.type_moteur || 'N/A',
          engineHours: boatData.temps_moteur || 'N/A',
          length: boatData.longueur || 'N/A',
          homePort: boatData.ports?.name || 'N/A',
          // MODIFIÉ : Utilisation de photoUrl ou de l'URL de secours
          photo: photoUrl, // getSignedBoatPhoto retourne déjà DEFAULT_BOAT_PHOTO si pas d'image
          place_de_port: boatData.place_de_port || 'N/A',
        });


        // Fetch inventory items
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('boat_inventory')
          .select('id, name, description, brand, model, serial_number, purchase_date, notes')
          .eq('boat_id', id);


        if (inventoryError) {
          console.error('Error fetching inventory:', inventoryError);
        } else {
          setInventory(inventoryData.map(item => ({
            id: item.id.toString(),
            name: item.name,
            category: item.category || 'Général',
            description: item.description,
            brand: item.brand || undefined,
            model: item.model || undefined,
            serial_number: item.serial_number || undefined,
            purchase_date: item.purchase_date || undefined,
            notes: item.notes || undefined,
          })));
        }


        // Fetch user documents
        const { data: documentsData, error: documentsError } = await supabase
          .from('user_documents')
          .select('id, name, type, date, file_url')
          .eq('id_boat', id);


        if (documentsError) {
          console.error('Error fetching documents:', documentsError);
        } else {
          setDocuments(documentsData.map(doc => ({
            id: doc.id.toString(),
            name: doc.name,
            type: doc.type,
            date: doc.date,
            file_url: doc.file_url,
          })));
        }


        // Fetch technical records
        const { data: technicalRecordsData, error: technicalRecordsError } = await supabase
          .from('boat_technical_records')
          .select('id, title, description, date, performed_by')
          .eq('boat_id', id);


        if (technicalRecordsError) {
          console.error('Error fetching technical records:', technicalRecordsError);
        } else {
          setTechnicalRecords(technicalRecordsData.map(record => ({
            id: record.id.toString(),
            title: record.title,
            description: record.description,
            date: record.date,
            performedBy: record.performed_by,
          })));
        }


        // Fetch usage type
        const { data: usageTypeData, error: usageTypeError } = await supabase
          .from('boat_usage_types')
          .select('*')
          .eq('boat_id', id)
          .single();


        if (usageTypeError && usageTypeError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching usage type:', usageTypeError);
        } else if (usageTypeData) {
          setUsageType({
            legalNature: usageTypeData.legal_nature,
            ownershipStatus: usageTypeData.ownership_status,
            leaseType: usageTypeData.lease_type || undefined,
            leaseEndDate: usageTypeData.lease_end_date || undefined,
            usagePurposes: usageTypeData.usage_purposes || {
              leisure: false, fishing: false, cruising: false, charter: false,
              competition: false, permanentHousing: false, other: false
            },
            otherDescription: usageTypeData.other_description || undefined,
          });
          setLeaseType(usageTypeData.lease_type || '');
          setLeaseEndDate(usageTypeData.lease_end_date || '');
          setOtherUsageDescription(usageTypeData.other_description || '');
        }


      } else {
        setFetchError('Bateau non trouvé.');
      }
    } catch (e) {
      console.error('Unexpected error fetching boat data:', e);
      setFetchError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }, [id, user]); // Re-fetch if user changes (e.g., permissions)


  // Use useFocusEffect to re-fetch data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchBoatData();
      // No cleanup needed for this effect, as it's just fetching data
    }, [fetchBoatData]) // Dependency: fetchBoatData (which is memoized)
  );


  const handleEditBoat = () => {
    router.push(`/boats/edit/${id}`);
  };


  const handleAddDocument = () => {
    router.push(`/boats/document/new?boatId=${id}`);
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


  const handleViewDocument = (document: UserDocument) => {
    router.push(`/boats/document/${document.id}?boatId=${id}`);
  };


  const handleViewTechnicalRecord = (record: TechnicalRecord) => {
    router.push(`/boats/technical/${record.id}?boatId=${id}`);
  };


  const handleViewInventoryItem = (item: InventoryItem) => {
    router.push(`/boats/inventory/${item.id}?boatId=${id}`);
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" backgroundColor="#fff" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Chargement...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Chargement des données du bateau...</Text>
        </View>
      </View>
      </SafeAreaView>
    );
  }


  if (fetchError || !boatDetails) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" backgroundColor="#fff" />
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
          <Text style={styles.errorText}>{fetchError || 'Ce bateau n\'existe pas ou vous n\'avez pas les permissions pour le voir.'}</Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
       </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
    <Stack.Screen options={{ headerShown: false }} />
    <StatusBar style="dark" backgroundColor="#fff" />
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
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
          <Edit size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>


      <Image
    source={{ uri: boatDetails.photo }}
    style={styles.boatImage}
    resizeMode="cover"
  />


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


      {activeTab === 'general' && (
        <View style={styles.tabContent}>
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ship size={20} color="#666" />
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>{boatDetails.type}</Text>
            </View>
            <View style={styles.infoRow}>
              <Tag size={20} color="#666" />
              <Text style={styles.infoLabel}>Constructeur:</Text>
              <Text style={styles.infoValue}>{boatDetails.manufacturer}</Text>
            </View>
            <View style={styles.infoRow}>
              <Info size={20} color="#666" />
              <Text style={styles.infoLabel}>Modèle:</Text>
              <Text style={styles.infoValue}>{boatDetails.model}</Text>
            </View>
            <View style={styles.infoRow}>
              <Calendar size={20} color="#666" />
              <Text style={styles.infoLabel}>Année de construction:</Text>
              <Text style={styles.infoValue}>{boatDetails.constructionYear}</Text>
            </View>
            <View style={styles.infoRow}>
              <Settings size={20} color="#666" />
              <Text style={styles.infoLabel}>Moteur:</Text>
              <Text style={styles.infoValue}>{boatDetails.engine}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={20} color="#666" />
              <Text style={styles.infoLabel}>Heures moteur:</Text>
              <Text style={styles.infoValue}>{boatDetails.engineHours}</Text>
            </View>
            <View style={styles.infoRow}>
              <Wrench size={20} color="#666" />
              <Text style={styles.infoLabel}>Longueur:</Text>
              <Text style={styles.infoValue}>{boatDetails.length}</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={20} color="#666" />
              <Text style={styles.infoLabel}>Port d'attache:</Text>
              <Text style={styles.infoValue}>{boatDetails.homePort}</Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={20} color="#666" />
              <Text style={styles.infoLabel}>Place de port:</Text>
              <Text style={styles.infoValue}>{boatDetails.place_de_port}</Text>
            </View>
          </View>
        </View>
      )}


      {activeTab === 'documents' && (
        <View style={styles.tabContent}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddDocument}>
            <Plus size={20} color="#0066CC" />
            <Text style={styles.addButtonText}>Ajouter un document</Text>
          </TouchableOpacity>


          {documents.length > 0 ? (
            <View style={styles.documentsList}>
              {documents.map((doc) => (
                <TouchableOpacity key={doc.id} style={styles.documentCard} onPress={() => handleViewDocument(doc)}>
                  <View style={styles.documentIcon}>
                    <FileText size={24} color="#0066CC" />
                  </View>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentName}>{doc.name}</Text>
                    <Text style={styles.documentDate}>{doc.date}</Text>
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
      )}


      {activeTab === 'technical' && (
        <View style={styles.tabContent}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddTechnicalRecord}>
            <Plus size={20} color="#0066CC" />
            <Text style={styles.addButtonText}>Ajouter une intervention</Text>
          </TouchableOpacity>


          {technicalRecords.length > 0 ? (
            <View style={styles.recordsList}>
              {technicalRecords.map((record) => (
                <TouchableOpacity key={record.id} style={styles.recordCard} onPress={() => handleViewTechnicalRecord(record)}>
                  <View style={styles.recordIcon}>
                    <Tool size={24} color="#0066CC" />
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordTitle}>{record.title}</Text>
                    <Text style={styles.recordSubtitle}>{record.date} - {record.performedBy}</Text>
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


      )}


      {activeTab === 'inventory' && (
        <View style={styles.tabContent}>
          <View style={styles.inventoryActions}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddInventoryItem}
            >
              <Plus size={20} color="#0066CC" />
              <Text style={styles.addButtonText}>Ajouter un équipement</Text>
            </TouchableOpacity>


            {/* <TouchableOpacity
              style={styles.checklistButton}
              onPress={handleOpenInventory}
            >
              <ClipboardList size={20} color="#0066CC" />
              <Text style={styles.checklistButtonText}>Inventaire complet</Text>
            </TouchableOpacity> */}
          </View>


          {inventory.length > 0 ? (
            <View style={styles.inventoryList}>
              {inventory.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.inventoryCard}
                  onPress={() => handleViewInventoryItem(item)}
                >
                  <View style={styles.inventoryIcon}>
                    <ClipboardList size={24} color="#0066CC" />
                  </View>
                  <View style={styles.inventoryInfo}>
                    <Text style={styles.inventoryName}>{item.name}</Text>
                    <Text style={styles.inventoryDetails}>
                      {item.brand}{item.brand && item.model ? ' - ' : ''}{item.model}
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#0066CC" style={styles.inventoryChevron} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <ClipboardList size={48} color="#ccc" />
              <Text style={styles.emptyStateTitle}>Aucun équipement</Text>
              <Text style={styles.emptyStateText}>
                Ajoutez les équipements présents sur votre bateau
              </Text>
            </View>
          )}
        </View>
      )}


      {activeTab === 'usage' && (
        <UsageTypeTab
          boatId={id}
          usageType={usageType}
          setUsageType={setUsageType}
          leaseType={leaseType}
          setLeaseType={setLeaseType}
          leaseEndDate={leaseEndDate}
          setLeaseEndDate={setLeaseEndDate}
          otherUsageDescription={otherUsageDescription}
          setOtherUsageDescription={setOtherUsageDescription}
        />
      )}
    </ScrollView>
    </SafeAreaView>


  );
}


const styles = StyleSheet.create({
   safeArea: {
    flex: 1,
    backgroundColor: '#fff', // même couleur que le header
  },


  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    flex: 1,
    textAlign: 'center',
  },
  editButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: '#f5f6fa',
    marginLeft: 12,
  },
  editButtonText: {
    color: '#0066CC',
    fontWeight: '600',
    fontSize: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  inventoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  inventoryInfo: {
    flex: 1,
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
    marginBottom: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  deleteOption: {
    backgroundColor: '#fff5f5',
  },
  deleteOptionText: {
    fontSize: 16,
    color: '#ff4444',
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
  boatImage: {
  width: '90%',
  height: 210,
  borderRadius: 20,
  alignSelf: 'center',
  marginVertical: 14,
  backgroundColor: '#e5eaf0',
  ...Platform.select({
    ios: {
      shadowColor: '#0066CC',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
    web: {
      boxShadow: '0 6px 20px rgba(0, 102, 204, 0.08)',
    },
  }),
},
  saveUsageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});



