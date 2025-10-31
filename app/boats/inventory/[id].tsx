// app/boats/inventory/[id].tsx


// --- Notifications & logs (prod-safe) ---
const GENERIC_ERR = "Une erreur est survenue. Veuillez réessayer.";
const GENERIC_LOAD_ERR = "Impossible de charger ces informations. Réessayez plus tard.";

const notifyError = () => {
  if (Platform.OS === 'android') {
    // @ts-ignore
    import('react-native').then(m => m.ToastAndroid?.show(GENERIC_ERR, m.ToastAndroid.LONG));
  } else {
    Alert.alert('Oups', GENERIC_ERR);
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

const logError = (scope: string, err: unknown) => {
  if (__DEV__) console.error(`[${scope}]`, err);
};





import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator, KeyboardAvoidingView, Modal, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Tag, Info, Calendar, FileText, X, User, Tool, Upload, Download, Trash, Check, Building, Search, ChevronRight } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/src/lib/supabase';
import { Buffer } from 'buffer';
import * as FileSystem from 'expo-file-system/legacy';
import CustomDateTimePicker from '@/components/CustomDateTimePicker';
import { useAuth } from '@/context/AuthContext';
import * as Sharing from 'expo-sharing'; // Importation de expo-sharing

// Polyfill (utile sur RN/Expo)
(global as any).Buffer = (global as any).Buffer || Buffer;

const BUCKET = 'inventory.documents';

// Récupère la clé interne du bucket à partir d'une URL publique
function extractPathFromPublicUrl(publicUrl: string, bucket = BUCKET) {
  try {
    const u = new URL(publicUrl);
    const marker = `/object/public/${bucket}/`;
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    return decodeURIComponent(u.pathname.slice(i + marker.length));
  } catch {
    return null;
  }
}

// Lit une URI locale (content://, file://) en ArrayBuffer pour éviter les Blobs vides
async function readUriAsArrayBuffer(uri: string, filename: string) {
  let src = uri;
  if (src.startsWith('content://')) {
    const dest = `${FileSystem.cacheDirectory}${Date.now()}-${filename}`;
    await FileSystem.copyAsync({ from: src, to: dest });
    src = dest;
  }
  // Web: fetch marche bien
  if (Platform.OS === 'web') {
    const ab = await (await fetch(src)).arrayBuffer();
    if (!ab.byteLength) throw new Error('Fichier vide (0 octet).');
    return ab;
  }
  // Mobile: lire en base64 puis convertir
  const base64 = await FileSystem.readAsStringAsync(src, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.byteLength) throw new Error('Fichier vide (0 octet).');
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

interface Document {
  id: string; // Client-side ID for list management (can be local or DB ID)
  name: string;
  type: string; // Mime type or custom type
  date: string; // YYYY-MM-DD
  uri: string; // Local URI for selected file or public URL for uploaded file
}

interface InventoryItemForm {
  id?: string; // Optional for new items
  name: string; // This will be the "equipmentType" from new.tsx
  description: string;
  installationDate: string;
  boat_id: string;
  installedById: number | null; // Renommé de performedById
  installedByLabel: string; // Renommé de performedByLabel
  documents: Document[];
}

type FormErrors = {
  name?: string;
  description?: string;
  installationDate?: string;
  installedBy?: string; // libellé d'erreur pour le sélecteur prestataire
  boat_id?: string;
};

type NauticalCompany = { id: string; name: string; location?: string };

// CompanySelectionModal component definition (moved outside)
const CompanySelectionModal = ({
  visible,
  loading,
  companies,
  query,
  onChangeQuery,
  onPick,
  onClose,
}: {
  visible: boolean;
  loading: boolean;
  companies: Array<{ id: string; name: string; location?: string }>;
  query: string;
  onChangeQuery: (v: string) => void;
  onPick: (choice: { id?: string; name: string }) => void;
  onClose: () => void;
}) => {
  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '88%' }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner une entreprise du nautisme</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une entreprise…"
              value={query}
              onChangeText={onChangeQuery}
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Liste */}
          <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled">
            {/* Option Moi-même */}
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => onPick({ name: 'Moi-même' })}
            >
              <View style={styles.modalItemContent}>
                <User size={20} color="#0066CC" />
                <Text style={styles.modalItemText}>Moi-même</Text>
              </View>
              <ChevronRight size={20} color="#666" />
            </TouchableOpacity>

            {loading ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <ActivityIndicator />
                <Text style={{ marginTop: 8, color: '#666' }}>Chargement…</Text>
              </View>
            ) : filtered.length > 0 ? (
              filtered.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.modalItem}
                  onPress={() => onPick({ id: c.id, name: c.name })}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemContent}>
                    <Building size={20} color="#0066CC" />
                    <View>
                      <Text style={styles.modalItemText}>{c.name}</Text>
                      {!!c.location && (
                        <Text style={styles.modalItemSubtext}>{c.location}</Text>
                      )}
                    </View>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyModalState}>
                <Text style={styles.emptyModalText}>Aucune entreprise trouvée.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};


function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;          // iPad / grandes phablettes
  const isSmallPhone = width < 360;       // vieux/mini téléphones

  // Échelle douce autour d’une base ~390px (iPhone 12)
  const scale = Math.min(Math.max(width / 390, 0.85), 1.2);

  return { width, height, isLandscape, isTablet, isSmallPhone, scale };
}


export default function InventoryItemDetailScreen() {
  const { id, boatId } = useLocalSearchParams<{ id: string; boatId: string }>();
  const isNewRecord = id === 'new';
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [currentUserRowId, setCurrentUserRowId] = useState<number | null>(null);
  const [form, setForm] = useState<InventoryItemForm>({
    name: '',
    description: '',
    installationDate: new Date().toISOString().split('T')[0],
    installedById: null, // Renommé
    installedByLabel: '', // Renommé
    boat_id: boatId || '',
    documents: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  const [companies, setCompanies] = useState<NauticalCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyQuery, setCompanyQuery] = useState('');

  const { user } = useAuth();

  const { width, height, isLandscape, isTablet, isSmallPhone, scale } = useResponsive();

// styles additionnels calculés (à fusionner avec styles.* au rendu)
const r = useMemo(() => ({
  // Titre / header
  title: { fontSize: isTablet ? 24 : isSmallPhone ? 18 : 20 },

  // Form
  form: { padding: isTablet ? 24 : 16 },
  label: { fontSize: isTablet ? 18 : 16 },
  inputWrapper: { height: isTablet ? 56 : isSmallPhone ? 44 : 48 },
  input: { fontSize: 16 * scale },
  textArea: { fontSize: 16 * scale, minHeight: isTablet ? 140 : 120 },

  // Modale (sélecteur d’entreprise)
  modalContent: {
    width: Math.min(width * 0.95, isTablet ? 640 : 500),
    maxHeight: isLandscape ? '90%' : '80%',
  },
  modalBody: {
    maxHeight: Math.min(height * (isLandscape ? 0.6 : 0.5), 380),
  },

  // Liste de documents
  documentName: { fontSize: isTablet ? 15 : 14 },
  documentDate: { fontSize: isTablet ? 13 : 12 },

  // Boutons
  submitButton: { paddingVertical: isTablet ? 18 : 16 },
  submitButtonText: { fontSize: isTablet ? 18 : 16 },
  deleteButtonText: { fontSize: isTablet ? 18 : 16 },
}), [width, height, isLandscape, isTablet, isSmallPhone, scale]);


  // Fetch current user's row ID
  useEffect(() => {
    if (!user?.email) return;
    supabase.from('users').select('id').eq('e_mail', user.email).single()
      .then(({ data, error }) => {
        if (error) {
          console.warn('Lookup users.id by e_mail failed:', error);
          return;
        }
        setCurrentUserRowId(data?.id ?? null);
      });
  }, [user?.email]);

  // Fetch nautical companies for the modal (and for fetchInventoryItem)
  const fetchNauticalCompanies = useCallback(async () => {
    // No need for companiesLoading state here, as it's managed by the outer loading state
    // if (!user?.id) return; // Ensure user is logged in
    // if (companiesLoading) return; // Prevent multiple fetches
    // setLoading(true); // This will be handled by the main useEffect
    try {
      const { data: userPortsData, error: userPortsError } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', user.id);

      if (userPortsError) {
        console.error('Error fetching user ports:', userPortsError);
        Alert.alert('Erreur', 'Impossible de charger les ports de l\'utilisateur.');
        setCompanies([]);
        return;
      }

      const userPortIds = userPortsData.map(p => p.port_id);

      const { data: companiesData, error } = await supabase
       .from('users')
       .select('id, company_name, user_ports(port_id, ports(name)), address')
       .eq('profile', 'nautical_company');

      if (error) {
        console.error('Error fetching nautical companies:', error);
        Alert.alert('Erreur', 'Impossible de charger les entreprises du nautisme.');
        setCompanies([]);
        return;
      }

      const filteredCompanies = (companiesData || []).filter(company =>
        company.user_ports?.some((up: any) => userPortIds.includes(up.port_id))
      );

      setCompanies(filteredCompanies.map(c => ({
        id: c.id.toString(),
        name: c.company_name,
        location: c.user_ports?.[0]?.ports?.name || undefined
      })));

    } catch (e) {
      console.error('Unexpected error fetching nautical companies:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors du chargement des entreprises.');
    }
    // finally { setLoading(false); } // Handled by main useEffect
  }, [user?.id]); // Depend on user.id

  // Main useEffect to fetch all necessary data
  useEffect(() => {
    if (!boatId) {
      setFetchError("ID du bateau manquant. Impossible de charger ou d'ajouter un équipement.");
      setLoading(false);
      return;
    }

    // Set loading to true at the very beginning of this effect
    setLoading(true);
    setFetchError(null);

    const loadAllData = async () => {
      try {
        await fetchNauticalCompanies(); // Fetch companies first

        if (!isNewRecord) {
          // Only fetch item data if it's an existing record
          const { data: itemData, error: itemError } = await supabase
            .from('boat_inventory')
            .select('id, name, description, installation_date, installed_by, installed_by_label, boat_id')
            .eq('id', id)
            .eq('boat_id', boatId)
            .single();

          if (itemError) {
           setFetchError('error'); // on ne stocke pas le détail ; l’UI affichera GENERIC_LOAD_ERR

            setLoading(false); // Ensure loading is false on error
            return;
          }

          const { data: documentsData } = await supabase
            .from('boat_inventory_documents')
            .select('*')
            .eq('inventory_item_id', id);

          let resolvedInstalledByLabel = itemData.installed_by_label || '';
          let resolvedInstalledById = itemData.installed_by ?? null;

          // If installedByLabel is missing but ID is present, try to resolve it
          if (!resolvedInstalledByLabel && resolvedInstalledById) {
            if (resolvedInstalledById === currentUserRowId) {
              resolvedInstalledByLabel = 'Moi-même';
            } else {
              // Find the company from the already fetched `companies` list
              const company = companies.find(c => Number(c.id) === resolvedInstalledById);
              resolvedInstalledByLabel = company?.name || 'Utilisateur inconnu';
            }
          }

          setForm({
            id: itemData.id.toString(),
            name: itemData.name || '',
            description: itemData.description || '',
            installationDate: itemData.installation_date || '',
            installedById: resolvedInstalledById,
            installedByLabel: resolvedInstalledByLabel,
            boat_id: itemData.boat_id.toString(),
            documents: (documentsData || []).map(doc => ({
              id: doc.id.toString(),
              name: doc.name,
              type: doc.type,
              date: doc.date,
              uri: doc.file_url,
            })),
          });
        } else {
          // For new records, ensure installedByLabel is set to 'Moi-même' by default
          setForm(prev => ({
            ...prev,
            installedById: currentUserRowId,
            installedByLabel: 'Moi-même',
          }));
        }
      } catch (e) {
        setFetchError('Erreur inattendue');
        console.error(e);
      } finally {
        setLoading(false); // Always set loading to false
      }
    };

    // Only run loadAllData if user is available (which implies currentUserRowId will be set)
    // and if it's an existing record or a new record that needs initial setup.
    if (user?.id) { // Check for user.id to ensure auth context is ready
      loadAllData();
    } else if (isNewRecord) { // If it's a new record and user is not yet loaded, still set loading to false
      setLoading(false);
    }

  }, [id, boatId, isNewRecord, currentUserRowId, user?.id, fetchNauticalCompanies]); // Add fetchNauticalCompanies to dependencies

  const toDate = (v?: string) => {
    const d = v ? new Date(v) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (!form.description.trim()) newErrors.description = 'La description est requise';
    if (!form.installationDate.trim()) newErrors.installationDate = 'La date d\'installation est requise';
    if (!form.installedById || !form.installedByLabel) {
      newErrors.installedBy = 'Le prestataire est requis';
    }
    if (!form.boat_id) newErrors.boat_id = 'L\'ID du bateau est manquant.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const newDocument: Document = {
        id: `local-${Date.now()}`, // Client-side unique ID
        name: result.assets[0].name,
        type: result.assets[0].mimeType || 'application/octet-stream',
        date: new Date().toISOString().split('T')[0],
        uri: result.assets[0].uri,
      };

      setForm(prev => ({
        ...prev,
        documents: [...(prev.documents || []), newDocument],
      }));
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sélection du document.');
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      if (Platform.OS === 'web') {
        // Pour le web, ouvrir l'URL du document dans un nouvel onglet
        const pdfWindow = window.open(document.uri, '_blank');
        if (!pdfWindow) {
          throw new Error('Échec de l\'ouverture du document dans une nouvelle fenêtre. Vérifiez si les pop-ups sont bloqués.');
        }
      } else {
        // Pour mobile, télécharger le fichier et le partager
        const filename = document.name;
        const fileUri = FileSystem.cacheDirectory + filename;

        // Télécharger le fichier
        const { uri: downloadedUri } = await FileSystem.downloadAsync(
          document.uri,
          fileUri
        );

        // Partager le fichier
        await Sharing.shareAsync(downloadedUri, {
          mimeType: document.type,
          UTI: document.type === 'application/pdf' ? '.pdf' : undefined, // Spécifier l'UTI pour les PDF
        });
      }
      Alert.alert('Succès', 'Le document a été téléchargé.');
    } catch (error: any) {
      logError('downloadInventoryDoc', error);
      notifyError();

    }
  };

  const handleRemoveDocument = (documentId: string) => {
    setForm(prev => ({
      ...prev,
      documents: prev.documents?.filter(doc => doc.id !== documentId) || [],
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!form.boat_id) {
      Alert.alert('Erreur', 'ID du bateau manquant. Impossible d\'ajouter l\'équipement.');
      return;
    }

    setLoading(true);
    try {
      let inventoryItemId: number;

      if (isNewRecord) {
        const { data, error } = await supabase
          .from('boat_inventory')
          .insert({
            boat_id: parseInt(form.boat_id),
            name: form.name,
            description: form.description,
            installation_date: form.installationDate,
            installed_by: form.installedById,
            installed_by_label: form.installedByLabel,
          })
          .select('id')
          .single();

        if (error) {
          logError('insertInventoryItem', error);
          notifyError(); // message générique
          setLoading(false);
          return;
        }
        inventoryItemId = data.id;
      } else {
        inventoryItemId = parseInt(id as string);
        const { error } = await supabase
          .from('boat_inventory')
          .update({
            name: form.name,
            description: form.description,
            installation_date: form.installationDate,
            installed_by: form.installedById,
            installed_by_label: form.installedByLabel,
          })
          .eq('id', inventoryItemId);

        if (error) {
          logError('updateInventoryItem', error);
          notifyError();
          setLoading(false);
          return;
        }
      }

      // Handle documents: upload new ones, keep existing ones, delete removed ones
      const { data: existingDocs } = await supabase
        .from('boat_inventory_documents')
        .select('id, file_url')
        .eq('inventory_item_id', inventoryItemId);

      const uploadedUris = form.documents
        .filter(d => d.uri.startsWith('http'))
        .map(d => d.uri);

      const documentsToDelete = (existingDocs || []).filter(
        d => !uploadedUris.includes(d.file_url)
      );

      for (const doc of documentsToDelete) {
        const key = extractPathFromPublicUrl(doc.file_url, BUCKET);
        if (key) {
          const { error: delErr } = await supabase.storage.from(BUCKET).remove([key]);
          if (delErr) console.warn('Storage delete error:', delErr);
        }
        await supabase.from('boat_inventory_documents').delete().eq('id', doc.id);
      }

      // Upload new documents and insert records
      for (const doc of form.documents) {
        if (doc.uri.startsWith('http')) continue; // Already online

        const key = `${form.boat_id}/${inventoryItemId}/${Date.now()}_${doc.name}`;

        const arrayBuffer = await readUriAsArrayBuffer(doc.uri, doc.name);

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(key, arrayBuffer, {
            contentType: doc.type || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          logError('uploadInventoryDoc', uploadError);
          notifyError();
          continue;
        }

        const fileUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;

        const { error: docInsertError } = await supabase
          .from('boat_inventory_documents')
          .insert({
            inventory_item_id: inventoryItemId,
            name: doc.name,
            type: doc.type,
            date: doc.date,
            file_url: fileUrl,
          });

        if (docInsertError) {
          console.error('Error inserting inventory document record:', docInsertError);
          Alert.alert('Erreur', `Échec de l'enregistrement du document ${doc.name}: ${docInsertError.message}`);
        }
      }

      Alert.alert(
        'Succès',
        isNewRecord ? 'L\'équipement a été ajouté avec succès.' : 'L\'équipement a été mis à jour avec succès.',
        [
          {
            text: 'OK',
            onPress: () => router.push(`/boats/${form.boat_id}`)
          }
        ]
      );
    } catch (e) {
      console.error('Unexpected error during submission:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Supprimer l\'équipement',
      'Êtes-vous sûr de vouloir supprimer cet équipement ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setFetchError(null);
            try {
              // 1. Delete associated documents from storage and database
              const { data: documentsData, error: fetchDocsError } = await supabase
                .from('boat_inventory_documents')
                .select('id, file_url')
                .eq('inventory_item_id', id);

              if (fetchDocsError) {
                console.warn('Error fetching documents for deletion:', fetchDocsError);
              } else if (documentsData) {
                for (const doc of documentsData) {
                  const key = extractPathFromPublicUrl(doc.file_url, BUCKET);
                  if (key) {
                    const { error: delErr } = await supabase.storage.from(BUCKET).remove([key]);
                    if (delErr) console.warn('Storage delete error:', delErr);
                  }
                  await supabase.from('boat_inventory_documents').delete().eq('id', doc.id);
                }
              }

              // 2. Delete the main inventory item record
              const { error: deleteRecordError } = await supabase
                .from('boat_inventory')
                .delete()
                .eq('id', id);

              if (deleteRecordError) {
                console.error('Error deleting inventory item record:', deleteRecordError);
                Alert.alert('Erreur', `Échec de la suppression de l'équipement: ${deleteRecordError.message}`);
              } else {
                Alert.alert(
                  'Succès',
                  'L\'équipement a été supprimé avec succès.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.push(`/boats/${form.boat_id}`)
                    }
                  ]
                );
              }
            } catch (e) {
              console.error('Unexpected error during deletion:', e);
              Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de la suppression.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>

        <Text style={styles.title}>
          {isNewRecord ? 'Nouvel équipement' : 'Modifier l\'équipement'}
        </Text>

        {/* placeholder pour garder le titre centré */}
        <View style={{ width: 36, height: 36 }} />
      </View>

      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    </SafeAreaView>
  );
}

  if (fetchError) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Erreur</Text>
        <View style={{ width: 36, height: 36 }} />
      </View>

      <View style={styles.errorContainer}>
        {/* on MASQUE le détail technique */}
        <Text style={styles.errorText}>{GENERIC_LOAD_ERR}</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


  return (
   <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
    <Stack.Screen options={{ headerShown: false }} />
    <StatusBar style="dark" backgroundColor="#fff" />

    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>

          <Text style={styles.title}>
            {isNewRecord ? 'Nouvel équipement' : 'Modifier l\'équipement'}
          </Text>

          {/* placeholder droite pour centrage parfait */}
          <View style={{ width: 36, height: 36 }} />
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom de l'équipement</Text>
            <View style={[styles.inputWrapper, errors.name && styles.inputWrapperError]}>
              <Tag size={20} color={errors.name ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(text) => {
                  setForm(prev => ({ ...prev, name: text }));
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
                placeholder="ex: GPS, Pompe de cale, Gilet de sauvetage"
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <View style={styles.textAreaWrapper}>
              <FileText size={20} color="#666" style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                value={form.description}
                onChangeText={(text) => setForm(prev => ({ ...prev, description: text }))}
                placeholder="Description détaillée de l'équipement"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date d'installation</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, errors.installationDate && styles.inputWrapperError]}
              onPress={() => setDatePickerVisible(true)}
            >
              <Calendar size={20} color={errors.installationDate ? '#ff4444' : '#666'} />
              <Text style={styles.input}>
                {form.installationDate || 'Sélectionner une date'}
              </Text>
            </TouchableOpacity>
            {errors.installationDate && <Text style={styles.errorText}>{errors.installationDate}</Text>}
          </View>

          <CustomDateTimePicker
            isVisible={isDatePickerVisible}
            mode="date"
            value={new Date(form.installationDate)}
            onConfirm={(date) => {
              setForm(prev => ({ ...prev, installationDate: date.toISOString().split('T')[0] }));
              setDatePickerVisible(false);
            }}
            onCancel={() => setDatePickerVisible(false)}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Installé par</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, errors.installedBy && styles.inputWrapperError]}
              onPress={() => setShowCompanyModal(true)}
            >
              <User size={20} color={errors.installedBy ? '#ff4444' : '#666'} />
              <Text style={styles.input}>
                {form.installedByLabel || 'Sélectionner...'}
              </Text>
            </TouchableOpacity>
            {errors.installedBy && (
              <Text style={styles.errorText}>{errors.installedBy}</Text>
            )}
          </View>

          <CompanySelectionModal
            visible={showCompanyModal}
            loading={companiesLoading}
            companies={companies}
            query={companyQuery}
            onChangeQuery={(text) => setCompanyQuery(text)}
            onPick={(choice) => {
              setForm((prev) => ({
                ...prev,
                installedById: choice.id ? Number(choice.id) : currentUserRowId,
                installedByLabel: choice.name,
              }));
              setErrors((prev) => ({ ...prev, installedBy: undefined }));
              setShowCompanyModal(false);
            }}
            onClose={() => setShowCompanyModal(false)}
          />


          <View style={styles.documentsSection}>
            <View style={styles.documentsSectionHeader}>
              <Text style={styles.documentsSectionTitle}>Documents associés</Text>
              <TouchableOpacity
                style={styles.addDocumentButton}
                onPress={handleAddDocument}
              >
                <Upload size={20} color="#0066CC" />
                <Text style={styles.addDocumentButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {form.documents && form.documents.length > 0 ? (
              <View style={styles.documentsList}>
                {form.documents.map((document) => (
                  <View key={document.id} style={styles.documentItem}>
                    <View style={styles.documentInfo}>
                      <FileText size={20} color="#0066CC" />
                      <View style={styles.documentDetails}>
                        <Text style={styles.documentName} numberOfLines={1} ellipsizeMode="tail">{document.name}</Text>
                        <Text style={styles.documentDate}>{document.date}</Text>
                      </View>
                    </View>
                    <View style={styles.documentActions}>
                      <TouchableOpacity
                        style={styles.downloadDocumentButton}
                        onPress={() => handleDownloadDocument(document)}
                      >
                        <Download size={20} color="#0066CC" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeDocumentButton}
                        onPress={() => handleRemoveDocument(document.id)}
                      >
                        <X size={16} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noDocuments}>
                <Text style={styles.noDocumentsText}>Aucun document associé</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isNewRecord ? 'Ajouter l\'équipement' : 'Enregistrer les modifications'}
              </Text>
            )}
          </TouchableOpacity>

          {!isNewRecord && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>Supprimer l'équipement</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
     </SafeAreaView>
  );
}

const styles = StyleSheet.create({

safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // container, scrollView : inchangés
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',   // <-- pour centrer le titre visuellement
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    flex: 1,                           // <-- le titre prend l'espace central
  },


  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
 
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  
  form: {
    padding: 16,
    gap: 20,
  },
  inputContainer: {
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
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
    height: '100%',
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
    minHeight: 120,
  },
  textAreaWrapperError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  textAreaIcon: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  textArea: {
    flex: 1,
    marginLeft: 28,
    fontSize: 16,
    color: '#1a1a1a',
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 4,
  },
  documentsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  documentsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  documentsSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  addDocumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  addDocumentButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  documentsList: {
    gap: 12,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  documentDetails: {
    gap: 2,
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
   flexShrink: 1, // Ajouté: Permet au texte de se réduire si nécessaire
    marginRight: 8, // Ajouté: Marge pour éviter le chevauchement avec le bouton
  },
  documentDate: {
    fontSize: 12,
    color: '#666',
  },
  documentActions: { // Nouveau style pour le conteneur des actions
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Espace entre les boutons
  },
  downloadDocumentButton: { // Nouveau style pour le bouton de téléchargement
    padding: 4,
  },
  removeDocumentButton: {
    padding: 4,
  },
  removeDocumentButtonText: {
    fontSize: 14,
    color: '#ff4444',
  },
  noDocuments: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
  },
  noDocumentsText: {
    fontSize: 14,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
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
    color: '#ff4444',
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
    marginLeft: 8,
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
});
