import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator, KeyboardAvoidingView, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, PenTool as Tool, User, FileText, Plus, Upload, X, Building, Search, ChevronRight } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client
import * as FileSystem from 'expo-file-system';
import CustomDateTimePicker from '@/components/CustomDateTimePicker';
import { useAuth } from '@/context/AuthContext';
import { Buffer } from 'buffer';
const BUCKET = 'technical.record.documents';
// Polyfill (utile sur RN/Expo)
(global as any).Buffer = (global as any).Buffer || Buffer;


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


interface TechnicalRecordForm {
  id?: string;
  title: string;
  description: string;
  date: string;                 // YYYY-MM-DD
  performedById: number | null; // ✅ nouvel ID users
  performedByLabel: string;     // "Moi-même" ou nom de société
  documents: Array<{
    id: string;
    name: string;
    type: string;
    date: string;
    uri: string;
  }>;
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner une entreprise du nautisme</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

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

          <ScrollView style={styles.modalList} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            <TouchableOpacity style={styles.modalItem} onPress={() => onPick({ name: 'Moi-même' })}>
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
                <TouchableOpacity key={c.id} style={styles.modalItem} onPress={() => onPick({ id: c.id, name: c.name })} activeOpacity={0.7}>
                  <View style={styles.modalItemContent}>
                    <Building size={20} color="#0066CC" />
                    <View>
                      <Text style={styles.modalItemText}>{c.name}</Text>
                      {!!c.location && <Text style={styles.modalItemSubtext}>{c.location}</Text>}
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



export default function TechnicalRecordScreen() {
  const toDate = (v?: string) => {
  const d = v ? new Date(v) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
};
  const { id, boatId } = useLocalSearchParams<{ id: string; boatId: string }>();
  const isNewRecord = id === 'new';
  const [form, setForm] = useState<TechnicalRecordForm>({
  title: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  performedById: null,
  performedByLabel: '',
  documents: [],
});


const { user } = useAuth();

type NauticalCompany = { id: string; name: string; location?: string };
const [showCompanyModal, setShowCompanyModal] = useState(false);
const [companies, setCompanies] = useState<NauticalCompany[]>([]);
const [companiesLoading, setCompaniesLoading] = useState(false);
const [companyQuery, setCompanyQuery] = useState('');

const [currentUserRowId, setCurrentUserRowId] = useState<number | null>(null);

useEffect(() => {
  if (!user?.email) return;
  supabase.from('users').select('id').eq('e_mail', user.email).single()
    .then(({ data }) => setCurrentUserRowId(data?.id ?? null));
}, [user?.email]);

// ↓ même fonction que dans l’autre écran
const fetchNauticalCompaniesForUserPorts = async () => {
  if (!currentUserRowId) return;               // ✅
  setCompaniesLoading(true);
  try {
    const { data: userPorts, error: portsErr } = await supabase
      .from('user_ports')
      .select('port_id')
      .eq('user_id', currentUserRowId);
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


useEffect(() => { if (showCompanyModal) fetchNauticalCompaniesForUserPorts(); }, [showCompanyModal]);


  type FormErrors = {
  title?: string;
  description?: string;
  date?: string;
  performedBy?: string; // libellé d'erreur pour le sélecteur prestataire
};

const [errors, setErrors] = useState<FormErrors>({});

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

const [isDatePickerVisible, setDatePickerVisible] = useState(false);

const handleDateConfirm = (date: Date) => {
  setForm(prev => ({ ...prev, date: date.toISOString().split('T')[0] }));
  setDatePickerVisible(false);
};


  useEffect(() => {
    const fetchTechnicalRecord = async () => {
      if (!boatId) {
        setFetchError('ID du bateau manquant. Impossible de charger ou d\'ajouter un enregistrement technique.');
        setLoading(false);
        return;
      }

      if (!isNewRecord && typeof id === 'string') {
        setLoading(true);
        setFetchError(null);
        try {
          const { data: recordData, error: recordError } = await supabase
            .from('boat_technical_records')
            .select('*')
            .eq('id', id)
            .eq('boat_id', boatId)
            .single();

          if (recordError) {
            if (recordError.code === 'PGRST116') { // No rows found
              setFetchError('Enregistrement technique non trouvé.');
            } else {
              console.error('Error fetching technical record:', recordError);
              setFetchError('Erreur lors du chargement de l\'enregistrement technique.');
            }
            setLoading(false);
            return;
          }

          const { data: documentsData, error: documentsError } = await supabase
            .from('boat_technical_record_documents')
            .select('*')
            .eq('technical_record_id', id);

          if (documentsError) {
            console.error('Error fetching technical record documents:', documentsError);
            // Continue even if documents fail to load, main record is more important
          }

          setForm({
  id: recordData.id.toString(),
  title: recordData.title || '',
  description: recordData.description || '',
  date: recordData.date || '',
  performedById: recordData.performed_by ?? null,            // ✅ nouvel ID
  performedByLabel: recordData.performed_by_label || '',     // ✅ le libellé
  documents: (documentsData || []).map(doc => ({
    id: doc.id.toString(),
    name: doc.name,
    type: doc.type,
    date: doc.date,
    uri: doc.file_url,
  })),
});
// Fallback si anciens enregistrements sans performed_by_label
if (!recordData.performed_by_label && recordData.performed_by) {
  const { data: u } = await supabase
    .from('users')
    .select('company_name, first_name, last_name')
    .eq('id', recordData.performed_by)
    .single();

  const guess =
    u?.company_name ||
    [u?.first_name, u?.last_name].filter(Boolean).join(' ') ||
    'Moi-même';

  setForm(prev => ({ ...prev, performedByLabel: guess }));
}

        } catch (e) {
          console.error('Unexpected error fetching technical record:', e);
          setFetchError('Une erreur inattendue est survenue.');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchTechnicalRecord();
  }, [id, boatId, isNewRecord]);

  useEffect(() => {
  if (form.performedByLabel === 'Moi-même' && !form.performedById && currentUserRowId) {
    setForm(prev => ({ ...prev, performedById: currentUserRowId }));
  }
}, [currentUserRowId]); // ✅


  const validateForm = () => {
  const newErrors: FormErrors = {};
  if (!form.title.trim()) newErrors.title = 'Le titre est requis';
  if (!form.description.trim()) newErrors.description = 'La description est requise';
  if (!form.date.trim()) newErrors.date = 'La date est requise';
  if (!form.performedById) newErrors.performedBy = 'Le prestataire est requis';
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

      const newDocument = {
        id: `doc-${Date.now()}`, // Client-side unique ID
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
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sélection du document');
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

    if (!boatId) {
      Alert.alert('Erreur', 'ID du bateau manquant. Impossible d\'ajouter l\'équipement.');
      return;
    }

    setLoading(true);
    try {
      let technicalRecordId: number;
      
      if (isNewRecord) {
  const { data, error } = await supabase
    .from('boat_technical_records')
    .insert({
      boat_id: parseInt(boatId),
      title: form.title,
      description: form.description,
      date: form.date,
      performed_by: form.performedById,           // ✅ ID users
      performed_by_label: form.performedByLabel,  // ✅ libellé (ex: "Moi-même")
    })
    .select('id')
          .single();

        if (error) {
          console.error('Error inserting technical record:', error);
          Alert.alert('Erreur', `Échec de l'ajout de l'intervention: ${error.message}`);
          setLoading(false);
          return;
        }
        technicalRecordId = data.id;
      } else {
        technicalRecordId = parseInt(id as string);
         const { error } = await supabase
    .from('boat_technical_records')
    .update({
      title: form.title,
      description: form.description,
      date: form.date,
      performed_by: form.performedById,           // ✅
      performed_by_label: form.performedByLabel,  // ✅
    })
    .eq('id', technicalRecordId);

        if (error) {
          console.error('Error updating technical record:', error);
          Alert.alert('Erreur', `Échec de la mise à jour de l'intervention: ${error.message}`);
          setLoading(false);
          return;
        }
      }

      // Handle documents: upload new ones, keep existing ones, delete removed ones
const { data: existingDocs } = await supabase
  .from('boat_technical_record_documents')
  .select('id, file_url')
  .eq('technical_record_id', technicalRecordId);

// URIs déjà en ligne (dans ton formulaire)
const uploadedUris = form.documents
  .filter(d => d.uri.startsWith('http'))
  .map(d => d.uri);

// À supprimer = ce qui est en base mais n’est plus dans le formulaire
const documentsToDelete = (existingDocs || []).filter(
  d => !uploadedUris.includes(d.file_url)
);


for (const doc of documentsToDelete) {
  const key = extractPathFromPublicUrl(doc.file_url, BUCKET);
  if (key) {
    const { error: delErr } = await supabase.storage.from(BUCKET).remove([key]);
    if (delErr) console.warn('Storage delete error:', delErr);
  }
  await supabase.from('boat_technical_record_documents').delete().eq('id', doc.id);
}


      // Upload new documents and insert/update records
      for (const doc of form.documents) {
  if (doc.uri.startsWith('http')) continue; // déjà en ligne

  // IMPORTANT: la "key" ne doit PAS contenir le nom du bucket
  const key = `${boatId}/${technicalRecordId}/${Date.now()}_${doc.name}`;

  // Lire en ArrayBuffer (fiable sur Android/iOS)
  const arrayBuffer = await readUriAsArrayBuffer(doc.uri, doc.name);
  // (facultatif) console.log('byteLength', arrayBuffer.byteLength);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(key, arrayBuffer, {
      contentType: doc.type || 'application/octet-stream',
      upsert: false,
    });

  if (uploadError) {
    console.error('Error uploading document file:', uploadError);
    Alert.alert('Erreur', `Échec du téléchargement du document ${doc.name}: ${uploadError.message}`);
    continue;
  }

  const fileUrl = supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;

  const { error: docInsertError } = await supabase
    .from('boat_technical_record_documents')
    .insert({
      technical_record_id: technicalRecordId,
      name: doc.name,
      type: doc.type,
      date: doc.date,
      file_url: fileUrl,
    });

  if (docInsertError) {
    console.error('Error inserting document record:', docInsertError);
    Alert.alert('Erreur', `Échec de l'enregistrement du document ${doc.name}: ${docInsertError.message}`);
  }
}


      Alert.alert(
        'Succès',
        isNewRecord ? 'L\'intervention a été ajoutée avec succès.' : 'L\'intervention a été mise à jour avec succès.',
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

  const handleDelete = async () => {
    Alert.alert(
      'Supprimer l\'intervention',
      'Êtes-vous sûr de vouloir supprimer cette intervention ? Cette action est irréversible.',
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
                .from('boat_technical_record_documents')
                .select('id, file_url')
                .eq('technical_record_id', id);

              if (fetchDocsError) {
                console.warn('Error fetching documents for deletion:', fetchDocsError);
              } else if (documentsData) {
                for (const doc of documentsData) {
  const key = extractPathFromPublicUrl(doc.file_url, BUCKET);
  if (key) {
    const { error: delErr } = await supabase.storage.from(BUCKET).remove([key]);
    if (delErr) console.warn('Storage delete error:', delErr);
  }
  await supabase.from('boat_technical_record_documents').delete().eq('id', doc.id);
}

              }

              // 2. Delete the main technical record
              const { error: deleteRecordError } = await supabase
                .from('boat_technical_records')
                .delete()
                .eq('id', id);

              if (deleteRecordError) {
                console.error('Error deleting technical record:', deleteRecordError);
                Alert.alert('Erreur', `Échec de la suppression de l'intervention: ${deleteRecordError.message}`);
              } else {
                Alert.alert(
                  'Succès',
                  'L\'intervention a été supprimée avec succès.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.push(`/boats/${boatId}`)
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
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isNewRecord ? 'Nouvelle intervention' : 'Modifier l\'intervention'}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Erreur</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{fetchError}</Text>
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
          <Text style={styles.title}>
            {isNewRecord ? 'Nouvelle intervention' : 'Modifier l\'intervention'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Titre de l'intervention</Text>
            <View style={[styles.inputWrapper, errors.title && styles.inputWrapperError]}>
              <Tool size={20} color={errors.title ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(text) => {
                  setForm(prev => ({ ...prev, title: text }));
                  if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
                }}
                placeholder="ex: Entretien moteur, Remplacement voile"
              />
            </View>
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
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
                placeholder="Description détaillée de l'intervention"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.inputContainer}>
  <Text style={styles.label}>Date de l'intervention</Text>
  <TouchableOpacity
    style={[styles.inputWrapper, errors.date && styles.inputWrapperError]}
    onPress={() => setDatePickerVisible(true)}
  >
    <Calendar size={20} color={errors.date ? '#ff4444' : '#666'} />
    <Text style={styles.input}>{form.date || 'Sélectionner une date'}</Text>
  </TouchableOpacity>
  {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
</View>

<CustomDateTimePicker
  isVisible={isDatePickerVisible}
  mode="date"
  value={toDate(form.date)}
  onConfirm={handleDateConfirm}
  onCancel={() => setDatePickerVisible(false)}
/>


          <View style={styles.inputContainer}>
  <Text style={styles.label}>Réalisée par</Text>
  <TouchableOpacity
    style={[styles.inputWrapper, errors.performedBy && styles.inputWrapperError]}
    onPress={() => setShowCompanyModal(true)}
    activeOpacity={0.8}
  >
    <User size={20} color={errors.performedBy ? '#ff4444' : '#666'} />
    <Text
  style={[styles.input, { textAlignVertical: 'center', paddingTop: 0 }]}
  numberOfLines={1}
  ellipsizeMode="tail"
>
  {form.performedByLabel || 'Sélectionner une entreprise du nautisme'}
</Text>
  </TouchableOpacity>
  {errors.performedBy && <Text style={styles.errorText}>{errors.performedBy}</Text>}
</View>

<CompanySelectionModal
  visible={showCompanyModal}
  loading={companiesLoading}
  companies={companies}
  query={companyQuery}
  onChangeQuery={setCompanyQuery}
  onPick={(choice) => {
  // Afficher le libellé tout de suite, même si l'ID n'est pas encore dispo
  const id = choice.id ? Number(choice.id) : (currentUserRowId ?? null);
  setForm(prev => ({
    ...prev,
    performedById: id,                 // peut être null si "Moi-même" mais non résolu
    performedByLabel: choice.name,     // affichage immédiat
  }));
  setErrors(prev => ({ ...prev, performedBy: undefined }));
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
              <Text style={styles.submitButtonText}>
                {isNewRecord ? 'Ajouter l\'intervention' : 'Enregistrer les modifications'}
              </Text>
            )}
          </TouchableOpacity>

          {!isNewRecord && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>Supprimer l'intervention</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  // ⬇️ AJOUTER DANS const styles = StyleSheet.create({ ... })
  // --- états chargement / erreur ---
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#666',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  errorButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 8,
  },
  errorButtonText: {
    color: 'white',
    fontWeight: '600',
  },

  // --- styles de la modale société (identiques à l’autre écran) ---
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
