import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, User, Bot as Boat, Building, Download, Ship, FileText, Euro, Mail } from 'lucide-react-native';
import { generateQuotePDF } from '@/utils/pdf'; // Garder pour la génération de PDF si nécessaire
import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';


// --- Interfaces pour les données du devis ---


interface QuoteItem {
  id: string;
  label: string; // Nom du service
  description?: string; // Description du service
  quantity: number;
  unit_price: number;
  discount_percent: number;
  line_total_excl_tax: number; // Montant de la ligne
}


interface QuoteData {
  id: string;
  reference: string;
  title?: string; // Titre du devis
  description?: string; // Description générale du devis
  status: string; // Statut du devis (draft, sent, accepted, etc.)
  valid_until?: string; // Date de validité
  total_incl_tax: number; // Montant total TTC
  currency: string; // Devise
  file_url?: string; // URL du PDF du devis si déposé
  created_at: string;


  client: {
    id: string;
    name: string;
    email: string;
  };
  boat: {
    id: string;
    name: string;
    type: string;
  };
  provider: {
    id: string;
    name: string;
    type: 'boat_manager' | 'nautical_company';
  };
  items: QuoteItem[]; // Les lignes de devis
}


// --- Composant principal ---


export default function QuoteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quote, setQuote] = useState<QuoteData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchQuoteDetails = async () => {
      if (!id) {
        setError("ID du devis manquant.");
        setLoading(false);
        return;
      }


      setLoading(true);
      setError(null);
      try {
        // 1. Récupérer les détails du devis principal
        const { data: quoteData, error: quoteError } = await supabase
          .from('quotes')
          .select(`
            *,
            id_client(id, first_name, last_name, e_mail),
            id_boat(id, name, type),
            id_boat_manager(id, first_name, last_name),
            id_companie(id, company_name)
          `)
          .eq('id', id)
          .single();


        if (quoteError) {
          console.error('Error fetching quote:', quoteError);
          setError('Erreur lors du chargement du devis.');
          setLoading(false);
          return;
        }


        if (!quoteData) {
          setError('Devis non trouvé.');
          setLoading(false);
          return;
        }


        // 2. Récupérer les lignes de devis (quote_items)
        const { data: itemsData, error: itemsError } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', quoteData.id)
          .order('position', { ascending: true });


        if (itemsError) {
          console.error('Error fetching quote items:', itemsError);
          // Continuer même si les items ne sont pas chargés, le devis principal est plus important
        }


        // Déterminer le fournisseur du devis
        let providerInfo: QuoteData['provider'];
        if (quoteData.id_boat_manager) {
          providerInfo = {
            id: quoteData.id_boat_manager.id.toString(),
            name: `${quoteData.id_boat_manager.first_name} ${quoteData.id_boat_manager.last_name}`,
            type: 'boat_manager',
          };
        } else if (quoteData.id_companie) {
          providerInfo = {
            id: quoteData.id_companie.id.toString(),
            name: quoteData.id_companie.company_name,
            type: 'nautical_company',
          };
        } else {
          providerInfo = { id: 'unknown', name: 'Inconnu', type: 'boat_manager' };
        }


        setQuote({
          id: quoteData.id,
          reference: quoteData.reference,
          title: quoteData.title || `Devis ${quoteData.reference}`,
          description: quoteData.description,
          status: quoteData.status,
          valid_until: quoteData.valid_until,
          total_incl_tax: quoteData.total_incl_tax,
          currency: quoteData.currency,
          file_url: quoteData.file_url,
          created_at: quoteData.created_at,
          client: {
            id: quoteData.id_client.id.toString(),
            name: `${quoteData.id_client.first_name} ${quoteData.id_client.last_name}`,
            email: quoteData.id_client.e_mail,
          },
          boat: {
            id: quoteData.id_boat.id.toString(),
            name: quoteData.id_boat.name,
            type: quoteData.id_boat.type,
          },
          provider: providerInfo,
          items: itemsData ? itemsData.map(item => ({
            id: item.id.toString(),
            label: item.label,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            line_total_excl_tax: item.line_total_excl_tax,
          })) : [],
        });


      } catch (e) {
        console.error('Unexpected error fetching quote details:', e);
        setError('Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
    };


    fetchQuoteDetails();
  }, [id]);


  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };


  const formatAmount = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };


  const handleDownloadQuote = async () => {
    if (!quote) return;


    if (quote.file_url) {
      // Si un fichier PDF est déjà lié, le télécharger directement
      if (Platform.OS === 'web') {
        window.open(quote.file_url, '_blank');
      } else {
        Linking.openURL(quote.file_url).catch(err => console.error('Failed to open URL:', err));
      }
    } else {
      // Sinon, générer le PDF à la volée à partir des données
      try {
        await generateQuotePDF({
          reference: quote.reference,
          date: quote.created_at,
          validUntil: quote.valid_until || quote.created_at, // Utiliser created_at si valid_until est null
          provider: quote.provider,
          client: quote.client,
          boat: quote.boat,
          services: quote.items.map(item => ({
            name: item.label,
            description: item.description || '',
            amount: item.line_total_excl_tax,
          })),
          totalAmount: quote.total_incl_tax,
          isInvoice: false, // C'est un devis
        });
        Alert.alert('Succès', 'Devis généré et téléchargé.');
      } catch (error) {
        Alert.alert('Erreur', "Une erreur est survenue lors de la génération du devis.");
      }
    }
  };


  // --- Rendu du composant ---


  if (loading || !quote) {
    return (
      <View style={[styles.container, styles.centered]}>
        {loading ? <Text>Chargement des détails du devis...</Text> : <Text>{error || 'Devis non trouvé.'}</Text>}
      </View>
    );
  }


  const ProviderIcon = quote.provider.type === 'boat_manager' ? User : Building;


  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Détails du devis</Text>
      </View>


      <View style={styles.content}>
        {/* En-tête du devis */}
        <View style={styles.quoteHeaderCard}>
          <View style={styles.quoteInfo}>
            <Text style={styles.quoteReference}>{quote.reference}</Text>
            <Text style={styles.quoteTitle}>{quote.title}</Text>
            <Text style={styles.quoteDescription}>{quote.description}</Text>
          </View>
          <Text style={styles.quoteAmount}>{formatAmount(quote.total_incl_tax, quote.currency)}</Text>
        </View>


        {/* Informations du prestataire */}
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


        {/* Informations client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <User size={16} color="#666" />
              <Text style={styles.cardText}>{quote.client.name}</Text>
            </View>
            <View style={styles.cardRow}>
              <Mail size={16} color="#666" />
              <Text style={styles.cardText}>{quote.client.email}</Text>
            </View>
          </View>
        </View>


        {/* Informations bateau */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bateau</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Boat size={16} color="#666" />
              <Text style={styles.cardText}>{quote.boat.name}</Text>
            </View>
            <View style={styles.cardRow}>
              <Ship size={16} color="#666" />
              <Text style={styles.cardText}>{quote.boat.type}</Text>
            </View>
          </View>
        </View>


        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <View style={styles.card}>
            <View style={styles.cardRow}>
              <Calendar size={16} color="#666" />
              <Text style={styles.cardText}>
                Émis le {formatDate(quote.created_at)}
              </Text>
            </View>
            <View style={styles.cardRow}>
              <Clock size={16} color="#666" />
              <Text style={styles.cardText}>
                Valable jusqu'au {formatDate(quote.valid_until)}
              </Text>
            </View>
          </View>
        </View>


        {/* Lignes de devis (items) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail des services</Text>
          {quote.items.length > 0 ? (
            quote.items.map((item) => (
              <View key={item.id} style={styles.serviceCard}>
                <Text style={styles.serviceName}>{item.label}</Text>
                {item.description && <Text style={styles.serviceDescription}>{item.description}</Text>}
                <Text style={styles.serviceAmount}>{formatAmount(item.line_total_excl_tax, quote.currency)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardText}>Aucun détail de service disponible.</Text>
            </View>
          )}
        </View>


        {/* Bouton de téléchargement du devis */}
        <View style={styles.downloadButtonContainer}>
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownloadQuote}
          >
            <Download size={20} color="#0066CC" />
            <Text style={styles.downloadButtonText}>Télécharger le devis</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    padding: 20,
  },
  quoteHeaderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
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
  quoteInfo: {
    gap: 8,
    marginBottom: 8,
  },
  quoteReference: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  quoteTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  quoteDescription: {
    fontSize: 14,
    color: '#666',
  },
  quoteAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 12,
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
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  serviceAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
    textAlign: 'right',
  },
  downloadButtonContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
    minWidth: '80%',
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
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
});