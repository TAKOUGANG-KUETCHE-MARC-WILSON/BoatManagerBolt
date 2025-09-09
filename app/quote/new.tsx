// app/(boat-manager)/quote/new.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, Plus, Trash, Bot as Boat, User, Calendar, FileText, Euro } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { generateQuotePDF } from '@/utils/pdf';
import * as FileSystem from 'expo-file-system';
import { decode as decodeBase64 } from 'base64-arraybuffer';

// ---------- Notifs + logs (erreurs masquées côté client) ----------
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
interface Service {
  id: string;
  name: string;
  description: string;
  amount: number;
}
interface QuoteForm {
  client: { id: string; name: string; email: string };
  boat: { id: string; name: string; type: string };
  validUntil: string;
  services: Service[];
  requestId?: string;
  quoteId?: number;
}

// ---------- Utilitaires ----------
const generateQuoteReference = (requestId?: string, clientId?: string) => {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return `DEV-${requestId || clientId || 'GEN'}-${stamp}`;
};

export default function NewQuoteScreen() {
  const insets = useSafeAreaInsets();
  const rawParams = useLocalSearchParams();
  const { user } = useAuth();

  // Normalise les params (string | string[] -> string)
  const params = useMemo(() => {
    const obj: Record<string, string> = {};
    Object.entries(rawParams).forEach(([k, v]) => {
      obj[k] = Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
    });
    return obj;
  }, [rawParams]);

  const depClientId   = params.clientId || '';
  const depClientName = params.clientName || '';
  const depClientEmail= params.clientEmail || '';
  const depBoatId     = params.boatId || '';
  const depBoatName   = params.boatName || '';
  const depBoatType   = params.boatType || '';
  const depRequestId  = params.requestId || '';

  const getProviderFields = () => {
    const role = (user as any)?.role;
    const uid = Number((user as any)?.id) || null;
    if (role === 'nautical_company') return { provider_type: 'nautical_company' as const, id_boat_manager: null, id_companie: uid };
    return { provider_type: 'boat_manager' as const, id_boat_manager: uid, id_companie: null };
  };

  const [form, setForm] = useState<QuoteForm>({
    client: { id: '', name: '', email: '' },
    boat: { id: '', name: '', type: '' },
    validUntil: '',
    services: [{ id: 'temp-1', name: '', description: '', amount: 0 }],
    requestId: '',
    quoteId: undefined,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, any>>({});

  // ---------- Init: préremplissage + chargement/creation du devis principal ----------
  useEffect(() => {
    let alive = true;

    const initializeQuote = async () => {
      setIsLoading(true);
      let currentQuoteId: number | undefined;
      let initialServices: Service[] = [];

      // Pré-remplir infos
      setForm(prev => {
        const next = { ...prev };
        next.client = { id: depClientId || prev.client.id, name: depClientName || prev.client.name, email: depClientEmail || prev.client.email };
        next.boat   = { id: depBoatId || prev.boat.id, name: depBoatName || prev.boat.name, type: depBoatType || prev.boat.type };
        next.requestId = depRequestId || prev.requestId;
        if (!prev.validUntil) {
          const d = new Date(); d.setDate(d.getDate() + 30);
          next.validUntil = d.toISOString().split('T')[0];
        }
        return next;
      });

      try {
        // 1) Devis existant lié à la demande ?
        if (depRequestId) {
          const { data: existingQuote, error: fetchQuoteError } = await supabase
            .from('quotes')
            .select('id, valid_until')
            .eq('service_request_id', parseInt(depRequestId))
            .maybeSingle();

          if (fetchQuoteError && fetchQuoteError.code !== 'PGRST116') {
            devError('fetchQuote', fetchQuoteError);
            notifyError('Chargement du devis impossible.');
          }

          if (existingQuote?.id) {
            currentQuoteId = existingQuote.id;
            if (!alive) return;
            setForm(prev => ({ ...prev, quoteId: currentQuoteId, validUntil: existingQuote.valid_until || prev.validUntil }));

            // Items existants
            const { data: existingItems, error: fetchItemsError } = await supabase
              .from('quote_items')
              .select('id, label, description, unit_price')
              .eq('quote_id', currentQuoteId)
              .order('position', { ascending: true });

            if (fetchItemsError) devError('fetchItems', fetchItemsError);
            if (existingItems?.length) {
              initialServices = existingItems.map(it => ({
                id: String(it.id),
                name: it.label,
                description: it.description || '',
                amount: it.unit_price || 0,
              }));
            }
          }
        }

        // 2) Sinon, créer un brouillon
        if (!currentQuoteId) {
          const { provider_type, id_boat_manager, id_companie } = getProviderFields();

          // Validation minimale: client obligatoire (numérique)
          const clientIdNum = parseInt(depClientId);
          if (Number.isNaN(clientIdNum)) {
            notifyError("Client manquant. Impossible de créer le devis.");
            return;
          }
          const boatIdNum = depBoatId ? parseInt(depBoatId) : null;

          const reference = generateQuoteReference(depRequestId, depClientId);
          const clientLabel = depClientName || 'Client';
          const title = depBoatName ? `Devis - ${clientLabel} / ${depBoatName}` : `Devis - ${clientLabel}`;
          const validUntilForInsert = form.validUntil?.trim() || new Date().toISOString().split('T')[0];

          const { data: newQuoteRow, error: createQuoteError } = await supabase
            .from('quotes')
            .insert({
              reference,
              valid_until: validUntilForInsert,
              service_request_id: depRequestId ? parseInt(depRequestId) : null,
              id_client: clientIdNum,
              id_boat: boatIdNum,
              id_boat_manager,
              id_companie,
              provider_type,
              title,
              status: 'draft',
              currency: 'EUR',
              subtotal_excl_tax: 0,
              tax_amount: 0,
              total_incl_tax: 0,
            })
            .select('id')
            .single();

          if (createQuoteError || !newQuoteRow?.id) {
            devError('createQuote', createQuoteError);
            notifyError('Impossible de créer le devis.');
            return;
          }
          currentQuoteId = newQuoteRow.id;
          if (!alive) return;
          setForm(prev => ({ ...prev, quoteId: currentQuoteId }));
        }

        // 3) Services init
        if (!alive) return;
        if (initialServices.length > 0) {
          setForm(prev => ({ ...prev, services: initialServices }));
        } else {
          setForm(prev => ({ ...prev, services: [{ id: 'temp-1', name: '', description: '', amount: 0 }] }));
        }
      } catch (e) {
        devError('initializeQuote', e);
        notifyError("Initialisation du devis impossible.");
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    initializeQuote();
    return () => { alive = false; };
  }, [depRequestId, depClientId, depClientName, depClientEmail, depBoatId, depBoatName, depBoatType, user]);

  // ---------- Helpers services ----------
  const validateService = (s: Service) => {
    const errs: any = {};
    if (!s.name.trim()) errs.name = 'Le nom du service est requis';
    if (!s.description.trim()) errs.description = 'La description est requise';
    if (s.amount <= 0) errs.amount = 'Le montant doit être > 0';
    return errs;
  };

  const addService = useCallback(async () => {
    if (!form.quoteId) { notifyError("Devis non initialisé."); return; }

    const last = form.services[form.services.length - 1];
    const serviceErrors = validateService(last);
    if (Object.keys(serviceErrors).length > 0) {
      setErrors(prev => ({ ...prev, [`service-${last.id}`]: serviceErrors }));
      notifyError('Complétez le service en cours avant.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Persiste le dernier service s'il est temporaire
      if (last.id.startsWith('temp-')) {
        const { data: newItem, error } = await supabase
          .from('quote_items')
          .insert({
            quote_id: form.quoteId,
            label: last.name,
            description: last.description,
            unit_price: last.amount,
            quantity: 1,
            position: form.services.length,
          })
          .select('id')
          .single();
        if (error || !newItem) throw error;
        setForm(prev => ({
          ...prev,
          services: prev.services.map(s => s.id === last.id ? ({ ...s, id: String(newItem.id) }) : s),
        }));
      }

      // Ajoute une nouvelle ligne vide
      setForm(prev => ({
        ...prev,
        services: [...prev.services, { id: `temp-${Date.now()}`, name: '', description: '', amount: 0 }],
      }));
      setErrors({});
    } catch (e) {
      devError('addService', e);
      notifyError("Ajout de service impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }, [form.quoteId, form.services]);

  const removeService = useCallback(async (id: string) => {
    if (form.services.length <= 1) { notifyError('Au moins un service est requis.'); return; }
    setIsSubmitting(true);
    try {
      if (!id.startsWith('temp-')) {
        const { error } = await supabase.from('quote_items').delete().eq('id', parseInt(id));
        if (error) throw error;
      }
      setForm(prev => ({ ...prev, services: prev.services.filter(s => s.id !== id) }));
    } catch (e) {
      devError('removeService', e);
      notifyError("Suppression du service impossible.");
    } finally {
      setIsSubmitting(false);
    }
  }, [form.services]);

  const updateService = useCallback(async (id: string, field: keyof Service, value: string | number) => {
    setForm(prev => ({ ...prev, services: prev.services.map(s => s.id === id ? { ...s, [field]: value } : s) }));

    // Nettoie erreurs locales pour ce champ
    setErrors(prev => {
      const n = { ...prev };
      if (n[`service-${id}`]?.[field]) {
        delete n[`service-${id}`][field];
        if (Object.keys(n[`service-${id}`]).length === 0) delete n[`service-${id}`];
      }
      return n;
    });

    // Persiste si déjà en DB
    if (!id.startsWith('temp-')) {
      try {
        const dbField =
          field === 'amount' ? 'unit_price' :
          field === 'name'   ? 'label'      :
          field;
        const { error } = await supabase.from('quote_items').update({ [dbField]: value }).eq('id', parseInt(id));
        if (error) throw error;
      } catch (e) {
        devError('updateService', e);
      }
    }
  }, []);

  const totalAmount = useMemo(
    () => form.services.reduce((sum, s) => sum + (Number(s.amount) || 0), 0),
    [form.services]
  );

  // ---------- Soumission finale ----------
  const handleSubmit = useCallback(async () => {
    if (!form.quoteId) { notifyError("Devis non initialisé."); return; }

    const last = form.services[form.services.length - 1];
    const serviceErrors = validateService(last);
    if (Object.keys(serviceErrors).length > 0) {
      setErrors(prev => ({ ...prev, [`service-${last.id}`]: serviceErrors }));
      notifyError('Complétez le dernier service.');
      return;
    }

    // Persiste toutes les lignes temporaires
    for (const s of form.services) {
      if (s.id.startsWith('temp-')) {
        try {
          const { data: newItem, error } = await supabase
            .from('quote_items')
            .insert({
              quote_id: form.quoteId,
              label: s.name,
              description: s.description,
              unit_price: s.amount,
              quantity: 1,
              position: form.services.indexOf(s) + 1,
            })
            .select('id')
            .single();
          if (error || !newItem) throw error;
          setForm(prev => ({
            ...prev,
            services: prev.services.map(x => x.id === s.id ? ({ ...x, id: String(newItem.id) }) : x),
          }));
        } catch (e) {
          devError('persistTempService', e);
          notifyError("Sauvegarde des services impossible.");
          return;
        }
      }
    }

    if (totalAmount <= 0) { notifyError('Le total doit être supérieur à 0.'); return; }

    setIsSubmitting(true);
    try {
      // 1) Génère le PDF → renvoie un chemin local (file://…)
      const providerFields = getProviderFields();
      const providerName =
        (user?.firstName || '') + (user?.lastName ? ` ${user.lastName}` : '') ||
        (providerFields.provider_type === 'nautical_company' ? 'Entreprise' : 'Boat Manager');

      const localPdfPath = await generateQuotePDF({
        reference: generateQuoteReference(form.requestId, form.client.id),
        date: new Date().toISOString().split('T')[0],
        validUntil: form.validUntil,
        provider: { name: providerName, type: providerFields.provider_type },
        client: form.client,
        boat: { id: form.boat.id || 'N/A', name: form.boat.name || '—', type: form.boat.type || '' },
        services: form.services,
        totalAmount,
      });
      if (!localPdfPath) { notifyError('Génération du PDF impossible.'); return; }

      // 2) Lit le fichier en base64 puis en Uint8Array
      const base64Pdf = await FileSystem.readAsStringAsync(localPdfPath, { encoding: FileSystem.EncodingType.Base64 });
      const bytes = new Uint8Array(decodeBase64(base64Pdf));

      // 3) Upload Supabase (chemin structuré)
      const fileName = `quote_${form.quoteId}_${Date.now()}.pdf`;
      const storagePath = `quotes/${form.quoteId}/${fileName}`;
      const { data: up, error: uploadError } = await supabase.storage
        .from('quotes')
        .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: true });
      if (uploadError || !up?.path) {
        devError('uploadPdf', uploadError);
        notifyError('Téléversement du PDF impossible.');
        return;
      }
      const { data: pub } = supabase.storage.from('quotes').getPublicUrl(up.path);
      const pdfUrl = pub.publicUrl;

      // 4) Met à jour la table quotes
      const { error: qErr } = await supabase
        .from('quotes')
        .update({
          file_url: pdfUrl,
          status: 'sent',
          total_incl_tax: totalAmount,
          subtotal_excl_tax: totalAmount,
        })
        .eq('id', form.quoteId);
      if (qErr) {
        devError('updateQuote', qErr);
        notifyError('Finalisation du devis impossible.');
        return;
      }

      // 5) Met à jour la service_request liée (si présente)
      if (form.requestId) {
        const { error: rErr } = await supabase
          .from('service_request')
          .update({
            statut: 'quote_sent',
            prix: totalAmount,
            note_add: `Devis créé et envoyé: ${pdfUrl}`,
          })
          .eq('id', parseInt(form.requestId));
        if (rErr) devError('updateRequest', rErr);
      }

      notifyInfo('Devis créé et envoyé ✅');
      router.back();
    } catch (e) {
      devError('handleSubmit', e);
      notifyError('Une erreur est survenue lors de la création du devis.');
    } finally {
      setIsSubmitting(false);
    }
  }, [form, totalAmount, user]);

  // ---------- UI ----------
  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement du devis...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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
        <Text style={styles.title}>Nouveau devis</Text>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {/* Info demande (optionnel) */}
        {!!form.requestId && (
          <View style={styles.requestInfoCard}>
            <View style={styles.requestInfoHeader}>
              <FileText size={20} color="#0066CC" />
              <Text style={styles.requestInfoTitle}>Devis lié à une demande</Text>
            </View>
            <Text style={styles.requestInfoText}>
              Ce devis est lié à la demande #{form.requestId}. Le client sera notifié à l’envoi.
            </Text>
          </View>
        )}

        {/* Client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <User size={20} color="#0066CC" />
              <Text style={styles.cardTitle}>Informations client</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom</Text>
              <TextInput style={styles.input} value={form.client.name} editable={false} />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={[styles.input, { backgroundColor: '#e2e8f0' }]} value={form.client.email} editable={false} />
            </View>
          </View>
        </View>

        {/* Bateau */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bateau</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Boat size={20} color="#0066CC" />
              <Text style={styles.cardTitle}>Informations bateau</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom</Text>
              <TextInput style={styles.input} value={form.boat.name || '— Aucun bateau lié —'} editable={false} />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Type</Text>
              <TextInput style={styles.input} value={form.boat.type || '—'} editable={false} />
            </View>
          </View>
        </View>

        {/* Validité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Validité</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Calendar size={20} color="#0066CC" />
              <Text style={styles.cardTitle}>Date de validité</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Valable jusqu’au</Text>
              <TextInput
                style={styles.input}
                value={form.validUntil}
                onChangeText={(text) => setForm(prev => ({ ...prev, validUntil: text }))}
                placeholder="AAAA-MM-JJ"
              />
            </View>
          </View>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services</Text>
            <TouchableOpacity style={styles.addServiceButton} onPress={addService} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator size="small" color="#0066CC" /> : <Plus size={20} color="#0066CC" />}
              <Text style={styles.addServiceButtonText}>Ajouter un service</Text>
            </TouchableOpacity>
          </View>

          {form.services.map((service, index) => (
            <View key={service.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Service {index + 1}</Text>
                {form.services.length > 1 && (
                  <TouchableOpacity style={styles.removeServiceButton} onPress={() => removeService(service.id)} disabled={isSubmitting}>
                    <Trash size={20} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Nom du service</Text>
                <TextInput
                  style={[styles.input, errors[`service-${service.id}`]?.name && styles.inputError]}
                  value={service.name}
                  onChangeText={(text) => updateService(service.id, 'name', text)}
                  placeholder="Nom du service"
                  editable={!isSubmitting}
                />
                {errors[`service-${service.id}`]?.name && <Text style={styles.errorText}>{errors[`service-${service.id}`].name}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors[`service-${service.id}`]?.description && styles.inputError]}
                  value={service.description}
                  onChangeText={(text) => updateService(service.id, 'description', text)}
                  placeholder="Description du service"
                  multiline
                  numberOfLines={3}
                  editable={!isSubmitting}
                />
                {errors[`service-${service.id}`]?.description && <Text style={styles.errorText}>{errors[`service-${service.id}`].description}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Montant (€)</Text>
                <View style={styles.amountInputContainer}>
                  <Euro size={20} color="#666" />
                  <TextInput
                    style={[styles.amountInput, errors[`service-${service.id}`]?.amount && styles.inputError]}
                    value={String(service.amount)}
                    onChangeText={(text) => {
                      const amount = text.replace(/[^0-9.]/g, '');
                      updateService(service.id, 'amount', parseFloat(amount) || 0);
                    }}
                    placeholder="0.00"
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>
                {errors[`service-${service.id}`]?.amount && <Text style={styles.errorText}>{errors[`service-${service.id}`].amount}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total TTC</Text>
          <Text style={styles.totalAmount}>{totalAmount.toFixed(2)} €</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.submitButtonText}>Créer le devis</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },

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

  content: { paddingHorizontal: 20, paddingTop: 20 },

  requestInfoCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  requestInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  requestInfoTitle: { fontSize: 16, fontWeight: '600', color: '#0066CC' },
  requestInfoText: { fontSize: 14, color: '#1a1a1a', lineHeight: 20 },

  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 16 },

  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },

  inputContainer: { gap: 8 },
  label: { fontSize: 14, color: '#666' },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputError: { borderColor: '#ff4444', backgroundColor: '#fff5f5' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  amountInput: { flex: 1, padding: 12, fontSize: 16, color: '#1a1a1a', marginLeft: 8 },

  addServiceButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  addServiceButtonText: { fontSize: 14, color: '#0066CC', fontWeight: '500' },
  removeServiceButton: { padding: 8 },

  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  totalLabel: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  totalAmount: { fontSize: 24, fontWeight: 'bold', color: '#0066CC' },

  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#0066CC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 8px rgba(0,102,204,0.2)' },
    }),
  },
  submitButtonDisabled: { backgroundColor: '#94a3b8' },
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#ff4444', fontSize: 12, marginTop: 4, marginLeft: 4 },
});
