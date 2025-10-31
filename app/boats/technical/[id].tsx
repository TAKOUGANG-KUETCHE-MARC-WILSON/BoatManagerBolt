// app/boats/technical/[id].tsx

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  PenTool as Tool,
  User,
  FileText,
  Upload,
  X,
  Building,
  Search,
  ChevronRight,
  Download,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy'; 
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import { Buffer } from 'buffer';
import { supabase } from '@/src/lib/supabase';
import CustomDateTimePicker from '@/components/CustomDateTimePicker';
import { useAuth } from '@/context/AuthContext';

const BUCKET = 'technical.record.documents';
const MAX_FILE_SIZE = 60 * 1024 * 1024; // 25MB (limite soft pour éviter OOM)

// --- Notifications & logs (erreurs masquées côté client) ---
const GENERIC_ERR = "Une erreur est survenue. Veuillez réessayer.";
const GENERIC_LOAD_ERR = "Impossible de charger ces informations. Réessayez plus tard.";

const notifyError = (msg?: string) => {
  const text = msg || GENERIC_ERR;
  if (Platform.OS === 'android') {
    // @ts-ignore
    import('react-native').then(m => m.ToastAndroid?.show(text, m.ToastAndroid.LONG));
  } else {
    Alert.alert('Oups', text);
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

// Polyfill Buffer (utile sur RN/Expo)
(global as any).Buffer = (global as any).Buffer || Buffer;

// -------- Utils fichiers / storage --------




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

// Remplace caractères à risque dans le nom de fichier
function sanitizeFilename(name?: string) {
  return (name || 'fichier')
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

//const MAX_FILE_SIZE = 25 * 1024 * 1024;

async function safeGetInfo(uri: string): Promise<{ exists: boolean; size?: number }> {
  try {
    return await FileSystem.getInfoAsync(uri, { size: true }) as any;
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    // En dev SDK 54, le “deprecated” peut remonter en erreur : on l’ignore.
    if (msg.includes('deprecated') || msg.includes('expo-file-system')) {
      return { exists: true } as any;
    }
    throw e;
  }
}




/**
 * Force une vraie URI locale file://
 * - si on reçoit content:// => on copie dans le cache
 * - fallback: lecture base64 + réécriture si la copie échoue
 * - vérifie l'existence réelle du fichier copié
 */
async function ensureLocalFileUri(originalUri: string, filename?: string): Promise<string> {
  if (originalUri.startsWith('file://')) {
    try {
      const info = await safeGetInfo(originalUri);
      if (info.exists) return originalUri;
    } catch {}
  }

  const safe = sanitizeFilename(filename);
  const dest = `${FileSystem.cacheDirectory}${Date.now()}-${safe}`;

  if (originalUri.startsWith('content://')) {
    try {
      await FileSystem.copyAsync({ from: originalUri, to: dest });
      const info = await safeGetInfo(dest);
      if (!info.exists || (typeof info.size === 'number' && info.size === 0)) {
        throw new Error('copy-empty');
      }
      return dest;
    } catch (e1) {
      try {
        const base64 = await FileSystem.readAsStringAsync(originalUri, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.writeAsStringAsync(dest, base64, { encoding: FileSystem.EncodingType.Base64 });
        const info = await safeGetInfo(dest);
        if (!info.exists || (typeof info.size === 'number' && info.size === 0)) {
          throw new Error('write-empty');
        }
        return dest;
      } catch (e2) {
        logError('ensureLocalFileUri', { e1, e2, originalUri });
        throw new Error('Impossible d’accéder au fichier sélectionné.');
      }
    }
  }

  return originalUri;
}


// Lit une URI locale (content://, file://) en ArrayBuffer (Android/iOS)
async function readUriAsArrayBuffer(uri: string) {
  if (Platform.OS !== 'web') {
    try {
      const info = await safeGetInfo(uri);
      if (!info.exists) {
        logError('readUriAsArrayBuffer.exists=false', { uri });
        throw new Error('missing');
      }
      if (typeof info.size === 'number') {
        if (info.size === 0) {
          logError('readUriAsArrayBuffer.size=0', { uri });
          throw new Error('empty');
        }
        if (info.size > MAX_FILE_SIZE) {
          logError('readUriAsArrayBuffer.tooBig', { size: info.size, uri });
          throw new Error('too-big');
        }
      }
    } catch (pre) {
      // Tolère les “deprecated” en dev : on tente quand même la lecture base64.
      logError('readUriAsArrayBuffer.precheck', { pre, uri });
    }
  }

  try {
    if (Platform.OS === 'web') {
      const ab = await (await fetch(uri)).arrayBuffer();
      if (!ab.byteLength) throw new Error('empty-web');
      return ab;
    }
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const bytes = Buffer.from(base64, 'base64');
    if (!bytes.byteLength) throw new Error('empty');
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  } catch (e) {
    logError('readUriAsArrayBuffer', { e, uri });
    throw new Error('Échec de la lecture du fichier.');
  }
}

// -------- Types --------

interface TRDocument {
  id: string;
  name: string;
  type: string;
  date: string;
  uri: string;
}

interface TechnicalRecordForm {
  id?: string;
  title: string;
  description: string;
  date: string;                 // YYYY-MM-DD
  performedById: number | null; // id dans table users
  performedByLabel: string;     // "Moi-même" ou nom société
  documents: TRDocument[];
}

type NauticalCompany = { id: string; name: string; location?: string };

// -------- Modale sélection société --------

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
        <View style={styles.modalContent}>
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

          <ScrollView
            style={styles.modalList}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
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

// -------- Responsive helpers --------

function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isSmallPhone = width < 360;
  const scale = Math.min(Math.max(width / 390, 0.85), 1.2);
  return { width, height, isLandscape, isTablet, isSmallPhone, scale };
}

const toDate = (v?: string) => {
  const d = v ? new Date(v) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
};

// ============================= Screen =============================

export default function TechnicalRecordScreen() {
  const { id, boatId } = useLocalSearchParams<{ id: string; boatId: string }>();
  const isNewRecord = id === 'new';

  const { user } = useAuth();
  const [currentUserRowId, setCurrentUserRowId] = useState<number | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [form, setForm] = useState<TechnicalRecordForm>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    performedById: null,
    performedByLabel: 'Moi-même',
    documents: [],
  });

  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    date?: string;
    performedBy?: string;
  }>({});

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companies, setCompanies] = useState<NauticalCompany[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyQuery, setCompanyQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const { width, height, isLandscape, isTablet, isSmallPhone, scale } = useResponsive();

  const r = useMemo(
    () => ({
      headerTitle: { fontSize: isTablet ? 22 : 20 },
      formPadding: { padding: isTablet ? 24 : 16 },
      label: { fontSize: isTablet ? 18 : 16 },
      inputWrapper: { height: isTablet ? 56 : isSmallPhone ? 44 : 48 },
      inputText: { fontSize: 16 * scale },
      textArea: { fontSize: 16 * scale, minHeight: isTablet ? 140 : 120 },
      submitText: { fontSize: isTablet ? 18 : 16 },
      modalContent: {
        width: Math.min(width * 0.96, isTablet ? 640 : 520),
        maxHeight: isLandscape ? '88%' : '80%',
      },
      modalList: {
        maxHeight: Math.min(height * (isLandscape ? 0.6 : 0.5), 420),
      },
      docName: { fontSize: isTablet ? 15 : 14 },
      docDate: { fontSize: isTablet ? 13 : 12 },
    }),
    [width, height, isLandscape, isTablet, isSmallPhone, scale]
  );

  // Récupère l'id de l'utilisateur courant (table users)
  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from('users')
      .select('id')
      .eq('e_mail', user.email)
      .single()
      .then(({ data, error }) => {
        if (error) {
          logError('lookup users.id', error);
          return;
        }
        setCurrentUserRowId(data?.id ?? null);
      });
  }, [user?.email]);

  // Quand "Moi-même" est affiché, compléter performedById dès qu'on connaît l'id
  useEffect(() => {
    if (form.performedByLabel === 'Moi-même' && !form.performedById && currentUserRowId) {
      setForm(prev => ({ ...prev, performedById: currentUserRowId }));
    }
  }, [currentUserRowId]); // eslint-disable-line

  // Charger sociétés connectées aux ports de l'utilisateur
  const fetchNauticalCompaniesForUserPorts = useCallback(async () => {
    if (!currentUserRowId) return;
    setCompaniesLoading(true);
    try {
      const { data: userPorts, error: portsErr } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', currentUserRowId);
      if (portsErr) throw portsErr;

      const portIds = (userPorts || []).map(p => p.port_id);
      if (portIds.length === 0) {
        setCompanies([]);
        return;
      }

      const { data: links, error: linksErr } = await supabase
        .from('user_ports')
        .select('user_id, port_id')
        .in('port_id', portIds);
      if (linksErr) throw linksErr;

      const candidateIds = [...new Set((links || []).map(l => l.user_id))];
      if (candidateIds.length === 0) {
        setCompanies([]);
        return;
      }

      const { data: companiesData, error: compErr } = await supabase
        .from('users')
        .select('id, company_name, user_ports(port_id, ports(name))')
        .in('id', candidateIds)
        .eq('profile', 'nautical_company');
      if (compErr) throw compErr;

      const list = (companiesData || []).map((c: any) => ({
        id: String(c.id),
        name: c.company_name,
        location: c.user_ports?.[0]?.ports?.name ?? undefined,
      }));
      setCompanies(list);
    } catch (e) {
      logError('fetch companies', e);
      notifyError();
      setCompanies([]);
    } finally {
      setCompaniesLoading(false);
    }
  }, [currentUserRowId]);

  useEffect(() => {
    if (showCompanyModal) fetchNauticalCompaniesForUserPorts();
  }, [showCompanyModal, fetchNauticalCompaniesForUserPorts]);

  // Charger le dossier technique existant (si édition)
  useEffect(() => {
    const load = async () => {
      if (!boatId) {
        setFetchError('error');
        setLoading(false);
        return;
      }
      if (isNewRecord || typeof id !== 'string') {
        setLoading(false);
        return;
      }
      setLoading(true);
      setFetchError(null);
      try {
        const { data: recordData, error: recordError } = await supabase
          .from('boat_technical_records')
          .select('*')
          .eq('id', id)
          .eq('boat_id', boatId)
          .single();

        if (recordError || !recordData) {
          setFetchError('error');
          return;
        }

        const { data: documentsData } = await supabase
          .from('boat_technical_record_documents')
          .select('*')
          .eq('technical_record_id', id);

        setForm(prev => ({
          ...prev,
          id: String(recordData.id),
          title: recordData.title || '',
          description: recordData.description || '',
          date: recordData.date || '',
          performedById: recordData.performed_by ?? null,
          performedByLabel: recordData.performed_by_label || prev.performedByLabel || '',
          documents: (documentsData || []).map((doc: any) => ({
            id: String(doc.id),
            name: doc.name,
            type: doc.type,
            date: doc.date,
            uri: doc.file_url,
          })),
        }));

        // Fallback anciens enregistrements sans libellé
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
        logError('fetchTechnicalRecord', e);
        setFetchError('error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, boatId, isNewRecord]);

  // -------- Validation --------

  const validateForm = () => {
    const newErrors: typeof errors = {};
    if (!form.title.trim()) newErrors.title = 'Le titre est requis';
    if (!form.description.trim()) newErrors.description = 'La description est requise';
    if (!form.date.trim()) newErrors.date = 'La date est requise';
    if (!form.performedById) newErrors.performedBy = 'Le prestataire est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // -------- Documents --------

  const handleAddDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const localUri = await ensureLocalFileUri(asset.uri, asset.name);

      const newDocument: TRDocument = {
        id: `local-${Date.now()}`,
        name: sanitizeFilename(asset.name),
        type: asset.mimeType || 'application/octet-stream',
        date: new Date().toISOString().split('T')[0],
        uri: localUri,
      };

      setForm(prev => ({ ...prev, documents: [...prev.documents, newDocument] }));
    } catch (e) {
      logError('pickDocument', e);
      notifyError();
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    setForm(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== documentId),
    }));
  };

 const handleDownloadDocument = async (document: TRDocument) => {
  try {
    const filename = sanitizeFilename(document.name || 'document');
    const hasExt = /\.[a-z0-9]+$/i.test(filename);
    const finalName = hasExt ? filename : (
      document.type === 'application/pdf' ? `${filename}.pdf` : `${filename}`
    );

    if (document.uri.startsWith('http')) {
      // Option 1: ouvrir dans le navigateur (souvent nickel pour PDF)
      // @ts-ignore – WebBrowser vient d'expo-web-browser si tu veux l’ajouter
      // await WebBrowser.openBrowserAsync(document.uri);

      // Option 2: télécharger dans un dossier lisible puis partager/ouvrir
// Option 2: télécharger dans un dossier lisible puis partager/ouvrir
// 1) Tenter de récupérer la clé de stockage depuis l'URL stockée.
let downloadUrl = document.uri;
const maybeKey = extractPathFromPublicUrl(document.uri, BUCKET);

try {
  if (maybeKey) {
    // 2) Génère une URL signée fraîche (1h), compatible bucket privé.
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(maybeKey, 60 * 60, { download: finalName });

    if (!signErr && signed?.signedUrl) {
      downloadUrl = signed.signedUrl;
    }
  }
} catch (e) {
  logError('signed-url@download', e);
  // on tombera en fallback sur l’URL existante (document.uri) si nécessaire
}

// 3) Ensuite, on télécharge/partage à partir de downloadUrl
const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

if (!baseDir) {
  await Linking.openURL(downloadUrl);
  notifyInfo('Ouverture du document…');
  return;
}

const dlDir = baseDir + 'downloads/';
try { await FileSystem.makeDirectoryAsync(dlDir, { intermediates: true }); } catch (_) {}

const target = dlDir + finalName;
const { uri: downloadedUri } = await FileSystemLegacy.downloadAsync(downloadUrl, target);

await Sharing.shareAsync(downloadedUri, {
  mimeType: document.type || (finalName.endsWith('.pdf') ? 'application/pdf' : undefined),
  dialogTitle: 'Ouvrir le document',
});


    } else {
      // Fichier local déjà en cache (issu du picker) : on le partage direct
      await Sharing.shareAsync(document.uri, {
        mimeType: document.type,
        dialogTitle: 'Ouvrir le document',
      });
    }

    notifyInfo('Téléchargement prêt');
  } catch (e) {
    logError('downloadDocument', e);
    notifyError();
  }
};


  // -------- Submit / Delete --------

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!boatId) {
      notifyError();
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
            performed_by: form.performedById,
            performed_by_label: form.performedByLabel,
          })
          .select('id')
          .single();

        if (error) throw error;
        technicalRecordId = data!.id;
      } else {
        technicalRecordId = parseInt(id as string, 10);
        const { error } = await supabase
          .from('boat_technical_records')
          .update({
            title: form.title,
            description: form.description,
            date: form.date,
            performed_by: form.performedById,
            performed_by_label: form.performedByLabel,
          })
          .eq('id', technicalRecordId);
        if (error) throw error;
      }

      // Synchroniser documents (suppr retirés)
      const { data: existingDocs } = await supabase
        .from('boat_technical_record_documents')
        .select('id, file_url')
        .eq('technical_record_id', technicalRecordId);

      const onlineUris = form.documents.filter(d => d.uri.startsWith('http')).map(d => d.uri);
      const toDelete = (existingDocs || []).filter(d => !onlineUris.includes(d.file_url));

      for (const doc of toDelete) {
        const key = extractPathFromPublicUrl(doc.file_url, BUCKET);
        if (key) {
          const { error: delErr } = await supabase.storage.from(BUCKET).remove([key]);
          if (delErr) logError('storage.remove', delErr);
        }
        await supabase.from('boat_technical_record_documents').delete().eq('id', doc.id);
      }

      // Upload nouveaux fichiers
      for (const doc of form.documents) {
        if (doc.uri.startsWith('http')) continue;
        const safeName = sanitizeFilename(doc.name);

        let localUri = doc.uri;
        if (localUri.startsWith('content://')) {
          try {
            localUri = await ensureLocalFileUri(localUri, safeName);
          } catch (e) {
            logError('ensureLocalFileUri@submit', { e, localUri });
            notifyError();
            continue;
          }
        }

        // Double check d'existence/taille avant lecture
        try {
          const info = await FileSystem.getInfoAsync(localUri, { size: true });
          if (!info.exists) throw new Error('not-exists');
          if (typeof info.size === 'number' && info.size > MAX_FILE_SIZE) {
            throw new Error('too-big');
          }
        } catch (chk) {
          logError('pre-read check', { chk, localUri });
          notifyError();
          continue;
        }

        let arrayBuffer: ArrayBuffer;
        try {
          arrayBuffer = await readUriAsArrayBuffer(localUri);
        } catch (e) {
          logError('read@submit', { e, localUri });
          notifyError();
          continue;
        }

        const key = `${boatId}/${technicalRecordId}/${Date.now()}_${safeName}`;
       // Utilise un Uint8Array explicite
const u8 = new Uint8Array(arrayBuffer);
const { error: uploadError } = await supabase.storage
  .from(BUCKET)
  .upload(key, u8, {
    contentType: doc.type || 'application/octet-stream',
    upsert: false,
  });

       
if (uploadError) {
  logError('storage.upload', uploadError);
  notifyError();
  continue;
}

// getPublicUrl renvoie { data: { publicUrl } } (synchrone)
// URL signée (private-friendly)
const { data: signedData, error: signErr } = await supabase.storage
  .from(BUCKET)
  .createSignedUrl(key, 60 * 60, { download: safeName }); // 1h

if (signErr || !signedData?.signedUrl) {
  logError('storage.createSignedUrl', signErr);
  notifyError();
  continue;
}

const fileUrl = signedData.signedUrl;

// Si ta table a une colonne file_key (recommandé), on l’enregistre aussi.
// Sinon, tu peux laisser uniquement file_url.
const payload: any = {
  technical_record_id: technicalRecordId,
  name: safeName,
  type: doc.type,
  date: doc.date,
  file_url: fileUrl,
};
(payload as any).file_key = key; // ← enlève cette ligne si ta colonne n’existe pas

const { error: insertErr } = await supabase
  .from('boat_technical_record_documents')
  .insert(payload);



        if (insertErr) {
          logError('insert document row', insertErr);
          notifyError();
        }
      }

      Alert.alert(
        'Succès',
        isNewRecord ? "L'intervention a été ajoutée avec succès." : "L'intervention a été mise à jour avec succès.",
        [{ text: 'OK', onPress: () => router.push(`/boats/${boatId}`) }]
      );
    } catch (e) {
      logError('submitTechnicalRecord', e);
      notifyError();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      "Supprimer l'intervention",
      'Êtes-vous sûr de vouloir supprimer cette intervention ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { data: documentsData } = await supabase
                .from('boat_technical_record_documents')
                .select('id, file_url')
                .eq('technical_record_id', id);

              for (const doc of documentsData || []) {
                const key = extractPathFromPublicUrl(doc.file_url, BUCKET);
                if (key) {
                  const { error: delErr } = await supabase.storage.from(BUCKET).remove([key]);
                  if (delErr) logError('storage.remove', delErr);
                }
                await supabase.from('boat_technical_record_documents').delete().eq('id', doc.id);
              }

              const { error: deleteRecordError } = await supabase
                .from('boat_technical_records')
                .delete()
                .eq('id', id);
              if (deleteRecordError) throw deleteRecordError;

              Alert.alert('Succès', "L'intervention a été supprimée avec succès.", [
                { text: 'OK', onPress: () => router.push(`/boats/${boatId}`) },
              ]);
            } catch (e) {
              logError('deleteTechnicalRecord', e);
              notifyError();
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ---------------- RENDER ----------------

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerLeft} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, r.headerTitle]}>
            {isNewRecord ? 'Nouvelle intervention' : "Modifier l'intervention"}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerLeft} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, r.headerTitle]}>Erreur</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{GENERIC_LOAD_ERR}</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Header centré */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerLeft} onPress={() => router.back()}>
              <ArrowLeft size={24} color="#1a1a1a" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, r.headerTitle]}>
              {isNewRecord ? 'Nouvelle intervention' : "Modifier l'intervention"}
            </Text>
          </View>

          <View style={[styles.form, r.formPadding]}>
            {/* Titre */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, r.label]}>Titre de l'intervention</Text>
              <View style={[styles.inputWrapper, r.inputWrapper, errors.title && styles.inputWrapperError]}>
                <Tool size={20} color={errors.title ? '#ff4444' : '#666'} />
                <TextInput
                  style={[styles.input, r.inputText]}
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

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, r.label]}>Description</Text>
              <View style={[styles.textAreaWrapper, errors.description && styles.textAreaWrapperError]}>
                <FileText size={20} color={errors.description ? '#ff4444' : '#666'} style={styles.textAreaIcon} />
                <TextInput
                  style={[styles.textArea, r.textArea]}
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

            {/* Date */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, r.label]}>Date de l'intervention</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, r.inputWrapper, errors.date && styles.inputWrapperError]}
                onPress={() => setDatePickerVisible(true)}
              >
                <Calendar size={20} color={errors.date ? '#ff4444' : '#666'} />
                <Text style={[styles.input, r.inputText]}>
                  {form.date || 'Sélectionner une date'}
                </Text>
              </TouchableOpacity>
              {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
            </View>

            <CustomDateTimePicker
              isVisible={isDatePickerVisible}
              mode="date"
              value={toDate(form.date)}
              onConfirm={(d) => {
                setForm(prev => ({ ...prev, date: d.toISOString().split('T')[0] }));
                setDatePickerVisible(false);
              }}
              onCancel={() => setDatePickerVisible(false)}
            />

            {/* Prestataire */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, r.label]}>Réalisée par</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, r.inputWrapper, errors.performedBy && styles.inputWrapperError]}
                onPress={() => setShowCompanyModal(true)}
                activeOpacity={0.8}
              >
                <User size={20} color={errors.performedBy ? '#ff4444' : '#666'} />
                <Text
                  style={[styles.input, r.inputText, { textAlignVertical: 'center', paddingTop: 0 }]}
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
                const idNum = choice.id ? Number(choice.id) : (currentUserRowId ?? null);
                setForm(prev => ({
                  ...prev,
                  performedById: idNum,
                  performedByLabel: choice.name,
                }));
                setErrors(prev => ({ ...prev, performedBy: undefined }));
                setShowCompanyModal(false);
              }}
              onClose={() => setShowCompanyModal(false)}
            />

            {/* Documents */}
            <View style={styles.documentsSection}>
              <View style={styles.documentsSectionHeader}>
                <Text style={styles.documentsSectionTitle}>Documents associés</Text>
                <TouchableOpacity style={styles.addDocumentButton} onPress={handleAddDocument}>
                  <Upload size={20} color="#0066CC" />
                  <Text style={styles.addDocumentButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>

              {form.documents.length > 0 ? (
                <View style={styles.documentsList}>
                  {form.documents.map((document) => (
                    <View key={document.id} style={styles.documentItem}>
                      <View style={styles.documentInfo}>
                        <FileText size={20} color="#0066CC" />
                        <View style={styles.documentDetails}>
                          <Text style={[styles.documentName, r.docName]} numberOfLines={1} ellipsizeMode="tail">
                            {document.name}
                          </Text>
                          <Text style={[styles.documentDate, r.docDate]}>{document.date}</Text>
                        </View>
                      </View>
                      <View style={styles.documentActions}>
                        {document.uri.startsWith('http') && (
                          <TouchableOpacity
                            style={styles.downloadDocumentButton}
                            onPress={() => handleDownloadDocument(document)}
                          >
                            <Download size={20} color="#0066CC" />
                          </TouchableOpacity>
                        )}
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

            {/* Actions */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={[styles.submitButtonText, r.submitText]}>
                  {isNewRecord ? "Ajouter l'intervention" : 'Enregistrer les modifications'}
                </Text>
              )}
            </TouchableOpacity>

            {!isNewRecord && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Text style={[styles.deleteButtonText, r.submitText]}>Supprimer l'intervention</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================= Styles =============================

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: { flex: 1 },

  // Header vraiment centré
  headerRow: {
    height: 56,
    justifyContent: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    position: 'absolute',
    left: 12,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    position: 'absolute',
    left: 72,
    right: 72,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },

  form: {
    padding: 16,
    gap: 20,
  },
  inputContainer: { gap: 4 },
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
    ...Platform.select({ web: { outlineStyle: 'none' } }),
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

  errorText: { color: '#ff4444', fontSize: 12, marginLeft: 4 },

  // Documents
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
  addDocumentButton: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  addDocumentButtonText: { fontSize: 14, color: '#0066CC', fontWeight: '500' },
  documentsList: { gap: 12 },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  documentInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  documentDetails: { gap: 2, flex: 1 },
  documentName: { fontSize: 14, color: '#1a1a1a', fontWeight: '500', flexShrink: 1, marginRight: 8 },
  documentDate: { fontSize: 12, color: '#666' },
  documentActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  downloadDocumentButton: { padding: 4 },
  removeDocumentButton: { padding: 4 },

  noDocuments: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
  },
  noDocumentsText: { fontSize: 14, color: '#666' },

  // Boutons
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
  submitButtonDisabled: { backgroundColor: '#94a3b8' },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  deleteButton: {
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: { color: '#ff4444', fontSize: 16, fontWeight: '600' },

  // États chargement / erreur
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: '#666', fontSize: 16 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  errorText: { fontSize: 16, color: '#ff4444', textAlign: 'center' },
  errorButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  errorButtonText: { color: 'white', fontWeight: '600' },

  // Modale
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '96%',
    maxWidth: 640,
    maxHeight: '88%',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
      web: { boxShadow: '0 6px 18px rgba(0,0,0,0.12)' },
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
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
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
  searchInput: { flex: 1, fontSize: 16, color: '#1a1a1a', padding: 0 },
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
  modalItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalItemText: { fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  modalItemSubtext: { fontSize: 13, color: '#64748b', marginTop: 2 },
  emptyModalState: { padding: 32, alignItems: 'center' },
  emptyModalText: { fontSize: 15, color: '#666', textAlign: 'center' },
});
