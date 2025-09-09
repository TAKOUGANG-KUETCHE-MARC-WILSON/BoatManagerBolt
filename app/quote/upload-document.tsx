// app/(boat-manager)/quote/upload-document.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Upload,
  FileText,
  User,
  Bot as Boat,
  Calendar,
  X,
  Euro,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode as decodeBase64 } from 'base64-arraybuffer';

import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';

// ---------- Utils: notifications & logs (masque côté client) ----------
const notifyError = (msg: string) => {
  if (Platform.OS === 'android') {
    // @ts-ignore
    import('react-native').then(({ ToastAndroid }) => ToastAndroid.show(msg, ToastAndroid.LONG));
  } else {
    // @ts-ignore
    import('react-native').then(({ Alert }) => Alert.alert('Oups', msg));
  }
};
const notifyInfo = (msg: string) => {
  if (Platform.OS === 'android') {
    // @ts-ignore
    import('react-native').then(({ ToastAndroid }) => ToastAndroid.show(msg, ToastAndroid.SHORT));
  } else {
    // @ts-ignore
    import('react-native').then(({ Alert }) => Alert.alert('', msg));
  }
};
const devError = (scope: string, err: unknown) => { if (__DEV__) console.error(`[${scope}]`, err); };

// ---------- Types ----------
interface QuoteUploadForm {
  requestId: string;
  title: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  boatId: string;
  boatName: string;
  boatType: string;
  validUntil: string;
  file?: { name: string; uri: string; type: string };
  quoteId?: number;
  notes?: string;
  amount?: number;
}

// ---------- Screen ----------
export default function UploadQuoteDocumentScreen() {
  const insets = useSafeAreaInsets();
  const rawParams = useLocalSearchParams();
  const { user } = useAuth();

  // Normaliser tous les params (string | string[] -> string)
  const params = useMemo(() => {
    const obj: Record<string, string> = {};
    Object.entries(rawParams).forEach(([k, v]) => (obj[k] = Array.isArray(v) ? (v[0] ?? '') : (v ?? '')));
    return obj;
  }, [rawParams]);

  const requestId = params.requestId || '';
  const clientId  = params.clientId  || '';
  const clientName= params.clientName|| '';
  const clientEmail=params.clientEmail|| '';
  const boatId    = params.boatId    || '';
  const boatName  = params.boatName  || '';
  const boatType  = params.boatType  || '';

  const [form, setForm] = useState<QuoteUploadForm>({
    requestId,
    title: requestId ? `Devis pour demande #${requestId}` : '',
    clientId,
    clientName,
    clientEmail,
    boatId,
    boatName,
    boatType,
    validUntil: new Date().toISOString().split('T')[0],
    notes: '',
    amount: undefined,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof QuoteUploadForm, string>>>({});
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ---------- Chargement initial ----------
  useEffect(() => {
    let alive = true;
    const fetchInitialData = async () => {
      if (!requestId || !clientId || !boatId) {
        notifyError('Données manquantes pour charger le devis.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1) Service request (cohérence)
        const { data: reqData, error: reqError } = await supabase
          .from('service_request')
          .select(`
            id, description,
            users!id_client(first_name, last_name, e_mail),
            boat(name, type)
          `)
          .eq('id', parseInt(requestId))
          .maybeSingle();

        if (reqError) devError('fetch service_request', reqError);

        if (reqData && alive) {
          setForm(prev => ({
            ...prev,
            clientName: `${reqData.users?.first_name ?? ''} ${reqData.users?.last_name ?? ''}`.trim() || prev.clientName,
            clientEmail: reqData.users?.e_mail || prev.clientEmail,
            boatName: reqData.boat?.name || prev.boatName,
            boatType: reqData.boat?.type || prev.boatType,
            title: prev.title || reqData.description || `Devis pour demande #${requestId}`,
          }));
        }

        // 2) Devis existant lié à la request
        const { data: existingQuote, error: quoteError } = await supabase
          .from('quotes')
          .select('id, file_url, total_incl_tax, valid_until, description')
          .eq('service_request_id', parseInt(requestId))
          .maybeSingle();

        if (quoteError) devError('fetch existing quote', quoteError);

        if (existingQuote && alive) {
          setForm(prev => ({
            ...prev,
            quoteId: existingQuote.id,
            file: existingQuote.file_url
              ? { name: existingQuote.file_url.split('/').pop() || 'document.pdf', uri: existingQuote.file_url, type: 'application/pdf' }
              : prev.file,
            amount: typeof existingQuote.total_incl_tax === 'number' ? existingQuote.total_incl_tax : prev.amount,
            validUntil: existingQuote.valid_until || prev.validUntil,
            notes: existingQuote.description || prev.notes,
          }));
        }
      } catch (e) {
        devError('initialize', e);
        notifyError('Impossible de charger les informations.');
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchInitialData();
    return () => { alive = false; };
  }, [requestId, clientId, boatId]);

  // ---------- Sélection de fichier ----------
  const handleSelectFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = result.assets[0];
      setForm(prev => ({
        ...prev,
        file: { name: file.name, uri: file.uri, type: file.mimeType || 'application/pdf' },
      }));
      if (errors.file) setErrors(prev => ({ ...prev, file: undefined }));
    } catch (e) {
      devError('selectFile', e);
      notifyError('Sélection du fichier impossible.');
    }
  }, [errors.file]);

  // ---------- Validation & submit ----------
  const validateForm = () => {
    const newErrors: Partial<Record<keyof QuoteUploadForm, string>> = {};
    if (!form.file) newErrors.file = 'Le fichier du devis est requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) setShowConfirmModal(true);
  };

  // Upsert 1 ligne "forfait" + calcul total HT
  const upsertSingleQuoteItemAndSum = useCallback(async (
    quoteId: number,
    label: string,
    description: string,
    amount?: number
  ) => {
    const price = Number(amount ?? 0);

    const { data: items, error: itemsErr } = await supabase
      .from('quote_items')
      .select('id, position')
      .eq('quote_id', quoteId)
      .order('position', { ascending: true });
    if (itemsErr) throw itemsErr;

    if (!items || items.length === 0) {
      const { error: insertErr } = await supabase.from('quote_items').insert({
        quote_id: quoteId,
        position: 1,
        label: label || 'Prestation (document)',
        description: description || 'Devis déposé (document)',
        quantity: 1,
        unit: 'forfait',
        unit_price: price,
        discount_percent: 0,
        tax_rate: null,
        line_total_excl_tax: price,
      });
      if (insertErr) throw insertErr;
    } else {
      const first = items[0];
      const { error: updErr } = await supabase
        .from('quote_items')
        .update({
          label: label || 'Prestation (document)',
          description: description || 'Devis déposé (document)',
          quantity: 1,
          unit: 'forfait',
          unit_price: price,
          discount_percent: 0,
          tax_rate: null,
          line_total_excl_tax: price,
        })
        .eq('id', first.id);
      if (updErr) throw updErr;
    }

    const { data: rows, error: sumErr } = await supabase
      .from('quote_items')
      .select('quantity, unit_price, discount_percent')
      .eq('quote_id', quoteId);
    if (sumErr) throw sumErr;

    const subtotal = (rows || []).reduce((s, r) => {
      const q = Number(r.quantity ?? 0);
      const up = Number(r.unit_price ?? 0);
      const disc = Number(r.discount_percent ?? 0) / 100;
      return s + q * up * (1 - disc);
    }, 0);

    return { subtotal };
  }, []);

  const handleConfirmSubmit = useCallback(async () => {
    setShowConfirmModal(false);
    setLoading(true);

    if (!form.requestId || !form.clientId || !user?.id) {
      notifyError('Informations manquantes pour envoyer le devis.');
      setLoading(false);
      return;
    }

    try {
      let quoteIdToUse = form.quoteId;
      let fileUrl: string | null = null;

      // 1) S’assurer qu’un devis existe
      if (!quoteIdToUse) {
        const clientIdNum = parseInt(form.clientId);
        if (Number.isNaN(clientIdNum)) throw new Error('clientId invalide');
        const boatIdNum = form.boatId ? parseInt(form.boatId) : null;

        const role = (user as any)?.role;
        const uidNum = Number((user as any)?.id) || null;

        const { data: newQuote, error: insertQuoteError } = await supabase
          .from('quotes')
          .insert({
            reference: `DEV-${form.requestId}-${Date.now()}`,
            status: 'draft',
            service_request_id: parseInt(form.requestId),
            id_client: clientIdNum,
            id_boat: boatIdNum,
            id_boat_manager: role === 'boat_manager' ? uidNum : null,
            id_companie: role === 'nautical_company' ? uidNum : null,
            provider_type: role === 'boat_manager' ? 'boat_manager' : 'nautical_company',
            title: form.title,
            description: form.notes || 'Devis fourni par document',
            valid_until: form.validUntil,
            currency: 'EUR',
            subtotal_excl_tax: 0,
            tax_amount: 0,
            total_incl_tax: 0,
          })
          .select('id')
          .single();

        if (insertQuoteError || !newQuote) throw insertQuoteError || new Error('create quote failed');
        quoteIdToUse = newQuote.id;
      }

      // 2) Upload PDF (content:// + base64 → bytes)
      if (form.file) {
        const ext = (form.file.name.split('.').pop() || 'pdf').toLowerCase();
        const storagePath = `quotes/${form.requestId}/${Date.now()}.${ext}`;

        let fileUri = form.file.uri;
        if (fileUri.startsWith('content://')) {
          const dest = `${FileSystem.cacheDirectory}${Date.now()}-${form.file.name}`;
          await FileSystem.copyAsync({ from: fileUri, to: dest });
          fileUri = dest;
        }

        const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        const bytes = new Uint8Array(decodeBase64(base64));
        if (!bytes.byteLength) throw new Error('PDF vide');

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('quotes')
          .upload(storagePath, bytes, { contentType: form.file.type || 'application/pdf', upsert: true });
        if (uploadError || !uploadData?.path) throw uploadError || new Error('upload failed');

        const { data: pub } = supabase.storage.from('quotes').getPublicUrl(uploadData.path);
        fileUrl = pub.publicUrl;
      }

      // 3) Upsert 1 ligne + subtotal
      const { subtotal } = await upsertSingleQuoteItemAndSum(
        quoteIdToUse!,
        form.title || 'Prestation (document)',
        form.notes || 'Devis déposé (document)',
        form.amount
      );

      // 4) Update quote (file + totaux + statut)
      const { error: updateQuoteError } = await supabase
        .from('quotes')
        .update({
          file_url: fileUrl,
          valid_until: form.validUntil,
          description: form.notes || 'Devis fourni par document',
          subtotal_excl_tax: subtotal,
          tax_amount: 0,
          total_incl_tax: subtotal,
          status: 'sent',
        })
        .eq('id', quoteIdToUse);
      if (updateQuoteError) throw updateQuoteError;

      // 5) Historiser le document (optionnel)
      if (fileUrl && form.file) {
        const { error: insertDocError } = await supabase
          .from('quote_documents')
          .insert({
            name: form.file.name,
            type: form.file.type,
            file_url: fileUrl,
            quote_id: quoteIdToUse,
          });
        if (insertDocError) devError('quote_documents insert (non-bloquant)', insertDocError);
      }

      // 6) Mettre à jour la demande liée
      const { error: updateRequestError } = await supabase
        .from('service_request')
        .update({
          statut: 'quote_sent',
          prix: subtotal,
          note_add: `Devis PDF: ${fileUrl || 'document fourni'}`,
        })
        .eq('id', parseInt(form.requestId));
      if (updateRequestError) devError('update service_request (non-bloquant)', updateRequestError);

      notifyInfo('Devis envoyé ✅');
      router.push(`/request/${form.requestId}`);
    } catch (e) {
      devError('handleConfirmSubmit', e);
      notifyError('Impossible d’envoyer le devis.');
    } finally {
      setLoading(false);
    }
  }, [form, user, upsertSingleQuoteItemAndSum]);

  // ---------- UI ----------
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Revenir en arrière"
          onPress={() => {
            try { router.back(); } catch (e) { devError('nav:back', e); notifyError('Retour impossible.'); }
          }}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Déposer un devis</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View style={styles.content}>
          {/* Infos client/bateau */}
          <View className="section">
            <Text style={styles.sectionTitle}>Informations client</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <User size={20} color="#0066CC" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Client</Text>
                  <Text style={styles.infoValue}>{form.clientName || 'Non spécifié'}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Boat size={20} color="#0066CC" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Bateau</Text>
                  <Text style={styles.infoValue}>
                    {form.boatName ? `${form.boatName} (${form.boatType})` : 'Non spécifié'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Upload */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fichier du devis</Text>

            <TouchableOpacity
              style={[styles.fileUploadButton, errors.file && styles.fileUploadButtonError]}
              onPress={handleSelectFile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={errors.file ? '#ff4444' : '#0066CC'} size="small" />
              ) : (
                <Upload size={24} color={errors.file ? '#ff4444' : '#0066CC'} />
              )}
              <Text style={[styles.fileUploadText, errors.file && styles.fileUploadTextError]}>
                {form.file ? form.file.name : 'Sélectionner un fichier PDF'}
              </Text>
            </TouchableOpacity>
            {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}

            {form.file && (
              <View style={styles.selectedFileContainer}>
                <FileText size={20} color="#0066CC" />
                <Text style={styles.selectedFileName}>{form.file.name}</Text>
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={() => setForm(prev => ({ ...prev, file: undefined }))}
                >
                  <X size={20} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Montant du devis (€) - Optionnel</Text>
              <View style={styles.amountInputContainer}>
                <Euro size={20} color="#666" />
                <TextInput
                  style={styles.amountInput}
                  value={form.amount !== undefined ? String(form.amount) : ''}
                  onChangeText={(text) => {
                    const filteredText = text.replace(/[^0-9.]/g, '');
                    setForm(prev => ({ ...prev, amount: filteredText ? parseFloat(filteredText) : undefined }));
                  }}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date de validité - Optionnel</Text>
              <View style={styles.inputWrapper}>
                <Calendar size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  value={form.validUntil}
                  onChangeText={(text) => setForm(prev => ({ ...prev, validUntil: text }))}
                  placeholder="AAAA-MM-JJ"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Notes additionnelles - Optionnel</Text>
              <View style={styles.textAreaWrapper}>
                <TextInput
                  style={styles.textArea}
                  value={form.notes}
                  onChangeText={(text) => setForm(prev => ({ ...prev, notes: text }))}
                  placeholder="Ajoutez une note pour le client"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.submitButtonText}>Envoyer le devis</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        form={form}
      />
    </View>
  );
}

// ---------- Confirmation Modal ----------
interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  form: QuoteUploadForm;
}
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ visible, onClose, onConfirm, form }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Confirmer l'envoi</Text>
        <Text style={styles.modalSubtitle}>
          Vous êtes sur le point d'envoyer un devis à {form.clientName}.
        </Text>

        <View style={styles.confirmationDetails}>
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Client:</Text>
            <Text style={styles.confirmationValue}>{form.clientName}</Text>
          </View>
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Bateau:</Text>
            <Text style={styles.confirmationValue}>
              {form.boatName} {form.boatType ? `(${form.boatType})` : ''}
            </Text>
          </View>
          <View style={styles.confirmationRow}>
            <Text style={styles.confirmationLabel}>Fichier:</Text>
            <Text style={styles.confirmationValue}>{form.file?.name || 'N/A'}</Text>
          </View>
          {typeof form.amount === 'number' && (
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Montant:</Text>
              <Text style={styles.confirmationValue}>{form.amount.toFixed(2)} €</Text>
            </View>
          )}
          {form.validUntil && (
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Validité:</Text>
              <Text style={styles.confirmationValue}>
                {new Date(form.validUntil).toLocaleDateString('fr-FR')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalConfirmButton} onPress={onConfirm}>
            <Text style={styles.modalConfirmText}>Envoyer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  backButton: { padding: 8, marginRight: 12 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },

  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 16 },

  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 16, color: '#1a1a1a', fontWeight: '500' },

  inputContainer: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: '500', color: '#1a1a1a', marginBottom: 8 },

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
  input: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1a1a1a', height: '100%' },

  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 48,
  },
  amountInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1a1a1a', height: '100%' },

  textAreaWrapper: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
  },
  textArea: { fontSize: 16, color: '#1a1a1a', minHeight: 120, textAlignVertical: 'top' },

  errorText: { color: '#ff4444', fontSize: 12, marginTop: 4, marginLeft: 4 },

  fileUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    padding: 24,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  fileUploadButtonError: { backgroundColor: '#fff5f5', borderColor: '#ff4444' },
  fileUploadText: { fontSize: 16, color: '#0066CC', fontWeight: '500' },
  fileUploadTextError: { color: '#ff4444' },

  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  selectedFileName: { flex: 1, fontSize: 14, color: '#0066CC', marginLeft: 12 },
  removeFileButton: { padding: 4 },

  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#0066CC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)' },
    }),
  },
  submitButtonDisabled: { backgroundColor: '#94a3b8' },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 8 },
  modalSubtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalCancelButton: { flex: 1, backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: '#666', fontWeight: '500' },
  modalConfirmButton: { flex: 1, backgroundColor: '#0066CC', padding: 16, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { fontSize: 16, color: 'white', fontWeight: '600' },

  confirmationDetails: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 24 },
  confirmationRow: { flexDirection: 'row', marginBottom: 12 },
  confirmationLabel: { fontSize: 14, color: '#666', width: 80 },
  confirmationValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '500', flex: 1 },
});
