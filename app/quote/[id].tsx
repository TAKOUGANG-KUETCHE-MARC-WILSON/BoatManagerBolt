// app/(boat-manager)/quotes/[id].tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User as UserIcon,
  Bot as Boat,
  Building,
  Download,
  Ship,
  FileText,
  Mail,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/src/lib/supabase';
import { generateQuotePDF } from '@/utils/pdf';

// ---------- Notifs + logs (masquage côté client) ----------
const notifyError = (msg: string) => {
  if (Platform.OS === 'android') {
    // @ts-ignore dynamic import to avoid top-level require on web
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
const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };
const devError = (scope: string, err: unknown) => { if (__DEV__) console.error(`[${scope}]`, err); };
const maskAndNotify = (scope: string, err: unknown, userMsg = 'Une erreur est survenue.') => {
  devError(scope, err);
  notifyError(userMsg);
};

// ---------- Types ----------
interface QuoteItem {
  id: string;
  label: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  line_total_excl_tax: number;
}
interface QuoteData {
  id: string;
  reference: string;
  title?: string;
  description?: string;
  status: string;
  valid_until?: string | null;
  total_incl_tax: number;
  currency: string | null;
  file_url?: string | null;
  created_at: string;

  client: { id: string; name: string; email: string };
  boat: { id: string; name: string; type: string | null };
  provider: { id: string; name: string; type: 'boat_manager' | 'nautical_company' };
  items: QuoteItem[];
}

// ---------- Écran ----------
export default function QuoteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);

  // Formatters
  const fmtDate = useCallback((d?: string | null) => {
    if (!d) return 'N/A';
    try {
      return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  }, []);
  const fmtMoney = useCallback((amount: number, currency?: string | null) => {
    const cur = currency || 'EUR';
    try {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cur }).format(amount ?? 0);
    } catch {
      return `${(amount ?? 0).toFixed(2)} ${cur}`;
    }
  }, []);

  // Fetch
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!id) {
        notifyError('ID du devis manquant.');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .select(`
            *,
            id_client(id, first_name, last_name, e_mail),
            id_boat(id, name, type),
            id_boat_manager(id, first_name, last_name),
            id_companie(id, company_name)
          `)
          .eq('id', Number(id))
          .single();

        if (quoteError || !quoteData) throw quoteError || new Error('Devis introuvable');

        // Items
        const { data: itemsData, error: itemsError } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', Number(quoteData.id))
          .order('position', { ascending: true });

        if (itemsError) devError('fetch quote_items', itemsError);

        // Provider
        const provider =
          quoteData.id_boat_manager
            ? {
                id: String(quoteData.id_boat_manager.id),
                name: `${quoteData.id_boat_manager.first_name} ${quoteData.id_boat_manager.last_name}`.trim(),
                type: 'boat_manager' as const,
              }
            : quoteData.id_companie
            ? {
                id: String(quoteData.id_companie.id),
                name: quoteData.id_companie.company_name,
                type: 'nautical_company' as const,
              }
            : { id: 'unknown', name: 'Inconnu', type: 'boat_manager' as const };

        const mapped: QuoteData = {
          id: String(quoteData.id),
          reference: quoteData.reference,
          title: quoteData.title || `Devis ${quoteData.reference}`,
          description: quoteData.description || '',
          status: quoteData.status,
          valid_until: quoteData.valid_until,
          total_incl_tax: Number(quoteData.total_incl_tax || 0),
          currency: quoteData.currency || 'EUR',
          file_url: quoteData.file_url || null,
          created_at: quoteData.created_at,

          client: {
            id: String(quoteData.id_client?.id ?? ''),
            name: `${quoteData.id_client?.first_name ?? ''} ${quoteData.id_client?.last_name ?? ''}`.trim(),
            email: String(quoteData.id_client?.e_mail ?? ''),
          },
          boat: {
            id: String(quoteData.id_boat?.id ?? ''),
            name: String(quoteData.id_boat?.name ?? ''),
            type: quoteData.id_boat?.type ?? null,
          },
          provider,
          items:
            (itemsData || []).map((it: any) => ({
              id: String(it.id),
              label: it.label,
              description: it.description ?? '',
              quantity: Number(it.quantity || 0),
              unit_price: Number(it.unit_price || 0),
              discount_percent: Number(it.discount_percent || 0),
              line_total_excl_tax: Number(it.line_total_excl_tax || 0),
            })) ?? [],
        };

        if (!alive) return;
        setQuote(mapped);
      } catch (e) {
        maskAndNotify('fetchQuoteDetails', e, 'Chargement du devis impossible.');
        if (alive) setQuote(null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [id]);

  const handleDownloadQuote = useCallback(async () => {
    if (!quote) return;
    try {
      if (quote.file_url) {
        // Ouvrir l’URL du PDF existant
        if (Platform.OS === 'web') {
          // @ts-ignore window exists on web
          const w = typeof window !== 'undefined' ? window : null;
          w?.open(quote.file_url, '_blank');
        } else {
          const ok = await Linking.canOpenURL(quote.file_url);
          if (!ok) throw new Error("Lien invalide");
          await Linking.openURL(quote.file_url);
        }
        return;
      }

      // Générer le PDF à la volée si pas de fichier lié
      await generateQuotePDF({
        reference: quote.reference,
        date: quote.created_at,
        validUntil: quote.valid_until || quote.created_at,
        provider: quote.provider,
        client: quote.client,
        boat: quote.boat,
        services: quote.items.map(i => ({
          name: i.label,
          description: i.description || '',
          amount: i.line_total_excl_tax,
        })),
        totalAmount: quote.total_incl_tax,
        isInvoice: false,
      });
      notifyInfo('Devis généré.');
    } catch (e) {
      maskAndNotify('handleDownloadQuote', e, 'Téléchargement du devis impossible.');
    }
  }, [quote]);

  // ---------- UI ----------
  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des détails du devis...</Text>
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Devis introuvable.</Text>
        <TouchableOpacity style={[styles.downloadButton, { marginTop: 16 }]} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0066CC" />
          <Text style={styles.downloadButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ProviderIcon = quote.provider.type === 'nautical_company' ? Building : UserIcon;

  return (
    <View style={styles.container}>
      {/* Header safe-area to avoid overlap with status bar / clock */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>Détails du devis</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* En-tête devis */}
          <View style={styles.quoteHeaderCard}>
            <View style={styles.quoteInfo}>
              <Text style={styles.quoteReference}>{quote.reference}</Text>
              {!!quote.title && <Text style={styles.quoteTitle}>{quote.title}</Text>}
              {!!quote.description && <Text style={styles.quoteDescription}>{quote.description}</Text>}
            </View>
            <Text style={styles.quoteAmount}>{fmtMoney(quote.total_incl_tax, quote.currency)}</Text>
          </View>

          {/* Prestataire */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prestataire</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <ProviderIcon size={16} color="#666" />
                <Text style={styles.cardText}>{quote.provider.name}</Text>
              </View>
              <View style={styles.cardRow}>
                <Building size={16} color="#666" />
                <Text style={styles.cardText}>
                  {quote.provider.type === 'boat_manager' ? 'Boat Manager' : 'Entreprise du nautisme'}
                </Text>
              </View>
            </View>
          </View>

          {/* Client */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <UserIcon size={16} color="#666" />
                <Text style={styles.cardText}>{quote.client.name || '—'}</Text>
              </View>
              <View style={styles.cardRow}>
                <Mail size={16} color="#666" />
                <Text style={styles.cardText}>{quote.client.email || '—'}</Text>
              </View>
            </View>
          </View>

          {/* Bateau */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bateau</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Boat size={16} color="#666" />
                <Text style={styles.cardText}>{quote.boat.name || '—'}</Text>
              </View>
              <View style={styles.cardRow}>
                <Ship size={16} color="#666" />
                <Text style={styles.cardText}>{quote.boat.type || '—'}</Text>
              </View>
            </View>
          </View>

          {/* Dates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dates</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Calendar size={16} color="#666" />
                <Text style={styles.cardText}>Émis le {fmtDate(quote.created_at)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Clock size={16} color="#666" />
                <Text style={styles.cardText}>Valable jusqu’au {fmtDate(quote.valid_until)}</Text>
              </View>
            </View>
          </View>

          {/* Lignes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détail des services</Text>
            {quote.items.length > 0 ? (
              quote.items.map((item) => (
                <View key={item.id} style={styles.serviceCard}>
                  <Text style={styles.serviceName}>{item.label}</Text>
                  {!!item.description && <Text style={styles.serviceDescription}>{item.description}</Text>}
                  <Text style={styles.serviceAmount}>{fmtMoney(item.line_total_excl_tax, quote.currency)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.card}><Text style={styles.cardText}>Aucun détail de service disponible.</Text></View>
            )}
          </View>

          {/* Télécharger */}
          <View style={styles.downloadButtonContainer}>
            <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadQuote}>
              <Download size={20} color="#0066CC" />
              <Text style={styles.downloadButtonText}>Télécharger le devis</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
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
    // ombre légère
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  backButton: { padding: 8, marginRight: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },

  content: { padding: 20 },

  quoteHeaderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  quoteInfo: { gap: 8, marginBottom: 8 },
  quoteReference: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  quoteTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  quoteDescription: { fontSize: 14, color: '#666' },
  quoteAmount: { fontSize: 24, fontWeight: 'bold', color: '#0066CC', textAlign: 'right' },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },

  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardText: { fontSize: 14, color: '#1a1a1a' },

  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  serviceDescription: { fontSize: 14, color: '#666', marginBottom: 12 },
  serviceAmount: { fontSize: 16, fontWeight: '600', color: '#0066CC', textAlign: 'right' },

  downloadButtonContainer: { marginTop: 20, alignItems: 'center' },
  downloadButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#f0f7ff', padding: 16, borderRadius: 12, minWidth: '80%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  downloadButtonText: { fontSize: 16, fontWeight: '600', color: '#0066CC' },
});
