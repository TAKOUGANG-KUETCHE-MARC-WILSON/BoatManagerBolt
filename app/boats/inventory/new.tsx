import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator, KeyboardAvoidingView, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, PenTool as Tool, User, FileText, Upload, X, Building, Search, ChevronRight } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import CustomDateTimePicker from '@/components/CustomDateTimePicker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client
import { Buffer } from 'buffer';
(global as any).Buffer = (global as any).Buffer || Buffer;

const STORAGE_BUCKET = 'inventory.documents';


async function readUriAsArrayBuffer(uri: string, filename: string) {
  let src = uri;

  // Android: content:// → copie vers un file:// lisible
  if (src.startsWith('content://')) {
    const dest = `${FileSystem.cacheDirectory}${Date.now()}-${filename}`;
    await FileSystem.copyAsync({ from: src, to: dest });
    src = dest;
  }

  // Web: fetch marche
  if (Platform.OS === 'web') {
    const ab = await (await fetch(src)).arrayBuffer();
    if (!ab.byteLength) throw new Error('Fichier vide (0 octet).');
    return ab;
  }

  // Mobile: lire en base64 puis convertir → évite les blobs vides
  const base64 = await FileSystem.readAsStringAsync(src, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.byteLength) throw new Error('Fichier vide (0 octet).');

  // retourne un ArrayBuffer propre
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}



interface InventoryDocument {
  id: string; // Client-side ID for list management
  name: string;
  type: string; // Mime type or custom type
  date: string; // YYYY-MM-DD
  uri: string; // Local URI for selected file
}

// On sépare les erreurs du type du form pour être libres
type FormErrors = {
  equipmentType?: string;
  description?: string;
  installationDate?: string;
  installedBy?: string; // message pour l'UI
};

interface InventoryItemForm {
  equipmentType: string;       // ira dans "name"
  description: string;
  installationDate: string;
  installedById: number | null;   // id users (FK)
  installedByLabel: string;       // affichage "Moi-même" / nom de la société
  documents: InventoryDocument[];
}


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
          <ScrollView style={styles.modalList} contentContainerStyle={{ paddingBottom: 24 }}
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



export default function NewInventoryItemScreen() {
  const { boatId } = useLocalSearchParams<{ boatId: string }>();
  const [form, setForm] = useState<InventoryItemForm>({
  equipmentType: '',
  description: '',
  installationDate: new Date().toISOString().split('T')[0],
  installedById: null,
  installedByLabel: '',
  documents: [],
});
const [errors, setErrors] = useState<FormErrors>({});
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
  const newErrors: FormErrors = {};

  if (!form.equipmentType.trim())
    newErrors.equipmentType = 'Le type d\'équipement est requis';
  if (!form.description.trim())
    newErrors.description = 'La description est requise';
  if (!form.installationDate.trim())
    newErrors.installationDate = 'La date d\'installation est requise';
  if (!form.installedById)
    newErrors.installedBy = 'Le prestataire est requis';

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

      const file = result.assets[0];
      const newDocument: InventoryDocument = {
  id: `doc-${Date.now()}`,
  name: file.name,
  type: file.mimeType || 'unknown',
  date: new Date().toISOString().split('T')[0],
  uri: file.uri,
};

      setForm(prev => ({
        ...prev,
        documents: [...prev.documents, newDocument],
      }));
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sélection du document.');
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    setForm(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== documentId),
    }));
  };

  const { user } = useAuth();

  // Id numérique de la table public.users pour "Moi-même"
const [currentUserRowId, setCurrentUserRowId] = useState<number | null>(null);

useEffect(() => {
  if (!user?.email) return;
  // Récupère l'id INT de `public.users` à partir de l'email de l'utilisateur auth
  supabase
    .from('users')
    .select('id')
    .eq('e_mail', user.email)
    .single()
    .then(({ data, error }) => {
      if (error) {
        console.warn('Lookup users.id by e_mail failed:', error);
        return;
      }
      setCurrentUserRowId(data?.id ?? null);
    });
}, [user?.email]);


type NauticalCompany = { id: string; name: string; location?: string };

const [showCompanyModal, setShowCompanyModal] = useState(false);
const [companies, setCompanies] = useState<NauticalCompany[]>([]);
const [companiesLoading, setCompaniesLoading] = useState(false);
const [companyQuery, setCompanyQuery] = useState('');

const fetchNauticalCompaniesForUserPorts = async () => {
  if (!user?.id) return;
  setCompaniesLoading(true);
  try {
    const { data: userPorts, error: portsErr } = await supabase
      .from('user_ports')
      .select('port_id')
      .eq('user_id', user.id);
    if (portsErr) throw portsErr;

    const portIds = (userPorts || []).map(p => p.port_id);
    if (portIds.length === 0) { setCompanies([]); return; }

    const { data: links, error: linksErr } = await supabase
      .from('user_ports')
      .select('user_id, port_id')
      .in('port_id', portIds);
    if (linksErr) throw linksErr;

    const candidateIds = [...new Set((links || []).map(l => l.user_id))];
    if (candidateIds.length === 0) { setCompanies([]); return; }

    const { data: companiesData, error: compErr } = await supabase
      .from('users')
      .select('id, company_name, user_ports(port_id, ports(name))')
      .in('id', candidateIds)
      .eq('profile', 'nautical_company');
    if (compErr) throw compErr;

    const list = (companiesData || []).map((c: any) => ({
      id: String(c.id),
      name: c.company_name,
      location: (c.user_ports?.[0]?.ports?.name) ?? undefined,
    }));
    setCompanies(list);
  } catch (e) {
    console.error('Error fetching nautical companies:', e);
    Alert.alert('Erreur', 'Impossible de charger les entreprises du nautisme de votre port.');
    setCompanies([]);
  } finally {
    setCompaniesLoading(false);
  }
};


// Charge la liste à l’ouverture de la modale
useEffect(() => {
  if (showCompanyModal) fetchNauticalCompaniesForUserPorts();
}, [showCompanyModal]);


  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!boatId) {
      Alert.alert('Erreur', 'ID du bateau manquant. Impossible d\'ajouter l\'équipement.');
      return;
    }

    setLoading(true);
    try {
      // 1. Insert the main inventory item
      const { data: inventoryItem, error: inventoryError } = await supabase
  .from('boat_inventory')
  .insert({
    boat_id: Number(boatId),
    name: form.equipmentType,                 // ✅ la table a "name"
    description: form.description,
    installation_date: form.installationDate,
    installed_by: form.installedById!,        // déjà validé par validateForm()
  })
  .select('id')
  .single();

      if (inventoryError) {
        console.error('Error inserting inventory item:', inventoryError);
        Alert.alert('Erreur', `Échec de l'ajout de l'équipement: ${inventoryError.message}`);
        setLoading(false);
        return;
      }

      // 2. Upload and insert associated documents
      for (const [i, doc] of form.documents.entries()) {
  // Chemin propre (ne PAS inclure le nom du bucket)
  const safeName = doc.name.replace(/[^\w.\-]/g, '_');
  const filePath = `${boatId}/${inventoryItem.id}/${Date.now()}_${i}_${safeName}`;

  // Lire en ArrayBuffer (fiable RN)
  let uri = doc.uri; // tu peux garder tel quel, le helper gère content://
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await readUriAsArrayBuffer(uri, safeName);
  } catch (e) {
    console.error('Lecture fichier KO:', e);
    Alert.alert('Erreur', `Fichier invalide ou vide: ${doc.name}`);
    continue;
  }

  const contentType = doc.type && doc.type !== 'unknown'
    ? doc.type
    : 'application/octet-stream';

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload KO:', uploadError);
    Alert.alert('Erreur', `Échec du téléchargement de ${doc.name}: ${uploadError.message}`);
    continue;
  }

  // URL publique (bucket public) — si bucket privé, voir NOTE plus bas
  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  const fileUrl = publicUrlData?.publicUrl;
  if (!fileUrl) {
    console.error('Public URL introuvable pour', filePath);
    Alert.alert('Erreur', `URL publique introuvable pour ${doc.name}.`);
    continue;
  }

  // Insertion de la ligne document (sans .select().single() pour éviter 404 RLS)
  const { error: docInsertError } = await supabase
    .from('boat_inventory_documents')
    .insert({
      inventory_item_id: inventoryItem.id,
      name: doc.name,
      type: contentType,
      date: doc.date,   // 'YYYY-MM-DD'
      file_url: fileUrl, // ✅ on enregistre bien l’URL
    });

  if (docInsertError) {
    console.error('Insert doc KO:', docInsertError);
    Alert.alert('Erreur', `Échec de l'enregistrement de ${doc.name}`);
    // on continue quand même avec les autres fichiers
  }
}


      Alert.alert(
        'Succès',
        'L\'équipement a été ajouté avec succès.',
        [
          {
            text: 'OK',
            onPress: () => router.push(`/boats/${boatId}`)
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

  // util pour parser en Date sûre
const toDate = (v?: string) => {
  const d = v ? new Date(v) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
};

const handleDateConfirm = (date: Date) => {
  setForm(prev => ({ ...prev, installationDate: date.toISOString().split('T')[0] }));
  setDatePickerVisible(false);
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Nouvel équipement</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Type d'équipement</Text>
            <View style={[styles.inputWrapper, errors.equipmentType && styles.inputWrapperError]}>
              <Tool size={20} color={errors.equipmentType ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={form.equipmentType}
                onChangeText={(text) => {
                  setForm(prev => ({ ...prev, equipmentType: text }));
                  if (errors.equipmentType) setErrors(prev => ({ ...prev, equipmentType: undefined }));
                }}
                placeholder="ex: GPS, Pompe de cale, Gilet de sauvetage"
              />
            </View>
            {errors.equipmentType && <Text style={styles.errorText}>{errors.equipmentType}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <View style={[styles.textAreaWrapper, errors.description && styles.textAreaWrapperError]}>
              <FileText size={20} color={errors.description ? '#ff4444' : '#666'} style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                value={form.description}
                onChangeText={(text) => {
                  setForm(prev => ({ ...prev, description: text }));
                  if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
                }}
                placeholder="Description détaillée de l'équipement (marque, modèle, numéro de série...)"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
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

           <View style={styles.inputContainer}>
  <Text style={styles.label}>Installée par</Text>
   <TouchableOpacity
     style={[styles.inputWrapper, errors.installedBy && styles.inputWrapperError]}
    onPress={() => setShowCompanyModal(true)}
     activeOpacity={0.8}
   >
     <User size={20} color={errors.installedBy ? '#ff4444' : '#666'} />
<Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 0 }]}>
  {form.installedByLabel || 'Sélectionner une entreprise du nautisme'}
</Text>
   </TouchableOpacity>
   {errors.installedBy && <Text style={styles.errorText}>{errors.installedBy}</Text>}
 </View>

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
                        <Text style={styles.documentName}>{document.name}</Text>
                        <Text style={styles.documentDate}>{document.date}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeDocumentButton}
                      onPress={() => handleRemoveDocument(document.id)}
                    >
                      <X size={16} color="#ff4444" />
                    </TouchableOpacity>
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
              <Text style={styles.submitButtonText}>Ajouter l'équipement</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

       <CustomDateTimePicker
    isVisible={isDatePickerVisible}
    mode="date"
   value={toDate(form.installationDate)}   // <-- un vrai Date
   onConfirm={handleDateConfirm}           // <-- reconverti en string
   onCancel={() => setDatePickerVisible(false)}
 />

    <CompanySelectionModal
  visible={showCompanyModal}
  loading={companiesLoading}
  companies={companies}
  query={companyQuery}
  onChangeQuery={setCompanyQuery}
  onPick={(choice) => {
  // Si "Moi-même" et qu'on n'a pas encore trouvé l'id numérique, on bloque proprement
  if (!choice.id && !currentUserRowId) {
    Alert.alert(
      'Compte manquant',
      "Impossible de retrouver votre identifiant interne. Réessayez plus tard."
    );
    return;
  }
  const id = choice.id ? Number(choice.id) : (currentUserRowId as number); 
  setForm(prev => ({
    ...prev,
    installedById: id,
    installedByLabel: choice.name,
  }));
  setErrors(prev => ({ ...prev, installedBy: undefined }));
  setShowCompanyModal(false);
}}
  onClose={() => setShowCompanyModal(false)}
/>


    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  },
  documentDetails: {
    gap: 2,
  },
  documentName: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  documentDate: {
    fontSize: 12,
    color: '#666',
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
   modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
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
  closeButton: { padding: 4 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eef2f7',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
  },

  modalList: { maxHeight: 480 },

  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: 'white',
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  modalItemSubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  emptyModalState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyModalText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
});
