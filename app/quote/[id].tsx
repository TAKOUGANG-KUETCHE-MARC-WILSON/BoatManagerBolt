import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Modal, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, CircleDot, Circle as XCircle, User, Bot as Boat, Building, Download, Ship, FileText, Euro } from 'lucide-react-native';
import { generateQuotePDF } from '@/utils/pdf';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'invoiced' | 'paid' | 'pending'; // Added 'pending' for clarity
type QuoteSource = 'boat_manager' | 'nautical_company';

interface Quote {
  id: string;
  reference: string;
  status: QuoteStatus;
  source: QuoteSource;
  date: string;
  validUntil: string;
  totalAmount: number;
  provider: {
    id: string;
    name: string;
    type: QuoteSource;
  };
  boat: {
    name: string;
    type: string;
  };
  services: Array<{
    name: string;
    description: string;
    amount: number;
  }>;
  invoiceReference?: string;
  invoiceDate?: string;
  depositAmount?: number;
  paymentDueDate?: string;
  file_url?: string; // Added for document-based quotes
}

// Mock data (updated to include a document-based quote)
const mockQuotes: Record<string, Quote> = {
  '1': {
    id: '1',
    reference: 'DEV-2024-001',
    status: 'pending',
    source: 'boat_manager',
    date: '2024-02-20',
    validUntil: '2024-03-20',
    totalAmount: 1500,
    provider: {
      id: 'bm1',
      name: 'Marie Martin',
      type: 'boat_manager'
    },
    boat: {
      name: 'Le Grand Bleu',
      type: 'Voilier'
    },
    services: [
      {
        name: 'Révision moteur',
        description: 'Révision complète du moteur',
        amount: 1000
      },
      {
        name: 'Changement filtres',
        description: 'Remplacement des filtres',
        amount: 500
      }
    ]
  },
  '2': {
    id: '2',
    reference: 'DEV-2024-002',
    status: 'accepted',
    source: 'nautical_company',
    date: '2024-02-19',
    validUntil: '2024-03-19',
    totalAmount: 2500,
    provider: {
      id: 'nc1',
      name: 'Nautisme Pro',
      type: 'nautical_company'
    },
    boat: {
      name: 'Le Grand Bleu',
      type: 'Voilier'
    },
    services: [
      {
        name: 'Installation GPS',
        description: 'Installation système GPS',
        amount: 2000
      },
      {
        name: 'Configuration',
        description: 'Configuration et test',
        amount: 500
      }
    ]
  },
  '3': {
    id: '3',
    reference: 'DEV-2024-003',
    status: 'invoiced',
    source: 'nautical_company',
    date: '2024-02-18',
    validUntil: '2024-03-18',
    totalAmount: 3500,
    provider: {
      id: 'nc1',
      name: 'Nautisme Pro',
      type: 'nautical_company'
    },
    boat: {
      name: 'Le Petit Prince',
      type: 'Yacht'
    },
    services: [
      {
        name: 'Réparation voile',
        description: 'Réparation grande voile',
        amount: 2500
      },
      {
        name: 'Vérification gréement',
        description: 'Contrôle complet',
        amount: 1000
      }
    ],
    invoiceReference: 'FAC-2024-003',
    invoiceDate: '2024-02-25',
    depositAmount: 1000,
    paymentDueDate: '2024-03-25'
  },
  '4': { // New document-based quote for testing
    id: '4',
    reference: 'DEV-2024-004',
    status: 'pending',
    source: 'boat_manager',
    date: '2024-03-01',
    validUntil: '2024-03-31',
    totalAmount: 800,
    provider: {
      id: 'bm2',
      name: 'Pierre Dubois',
      type: 'boat_manager'
    },
    boat: {
      name: 'Le Navigateur',
      type: 'Voilier'
    },
    services: [], // No services listed if it's a document
    file_url: 'https://www.africau.edu/images/default/sample.pdf' // Sample PDF URL
  }
};

const statusConfig = {
  draft: {
    icon: FileText,
    color: '#94A3B8',
    label: 'Brouillon',
  },
  sent: {
    icon: Clock,
    color: '#F59E0B',
    label: 'Envoyé',
  },
  accepted: {
    icon: CheckCircle2,
    color: '#10B981',
    label: 'Accepté',
  },
  rejected: {
    icon: XCircle,
    color: '#EF4444',
    label: 'Refusé',
  },
  pending: {
    icon: Clock,
    color: '#F59E0B',
    label: 'En attente',
  },
  invoiced: {
    icon: FileText,
    color: '#3B82F6',
    label: 'Facturé',
  },
  paid: {
    icon: Euro,
    color: '#10B981',
    label: 'Payé',
  }
};

export default function QuoteDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [quote, setQuote] = useState<Quote | undefined>(mockQuotes[id as string]); // Use state to allow updates
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  if (!quote) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Devis non trouvé</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Ce devis n'existe pas.</Text>
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

  const status = statusConfig[quote.status];
  const StatusIcon = status.icon;
  const ProviderIcon = quote.source === 'boat_manager' ? User : Building;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const handleDownload = async () => {
    if (quote.file_url) {
      // If it's a document-based quote, open the URL directly
      if (Platform.OS === 'web') {
        window.open(quote.file_url, '_blank');
      } else {
        // For mobile, you might want to use Linking.openURL or a file viewer library
        Linking.openURL(quote.file_url).catch(err => console.error('Failed to open URL:', err));
      }
    } else {
      // Otherwise, generate PDF from services
      try {
        await generateQuotePDF({
          reference: quote.reference,
          date: quote.date,
          validUntil: quote.validUntil,
          provider: {
            name: quote.provider.name,
            type: quote.provider.type,
          },
          client: {
            name: user?.firstName + ' ' + user?.lastName || '',
            email: user?.email || '',
          },
          boat: quote.boat,
          services: quote.services,
          totalAmount: quote.totalAmount,
        });
      } catch (error) {
        Alert.alert('Erreur', "Une erreur est survenue lors du téléchargement du devis.");
      }
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      if (!quote.invoiceReference || !quote.invoiceDate || !quote.depositAmount) {
        Alert.alert('Erreur', "Les informations de facturation sont incomplètes.");
        return;
      }

      await generateQuotePDF({
        reference: quote.invoiceReference,
        date: quote.invoiceDate,
        validUntil: quote.validUntil,
        provider: {
          name: quote.provider.name,
          type: quote.provider.type,
        },
        client: {
          name: user?.firstName + ' ' + user?.lastName || '',
          email: user?.email || '',
        },
        boat: quote.boat,
        services: quote.services,
        totalAmount: quote.totalAmount,
        isInvoice: true,
        depositAmount: quote.depositAmount,
      });
    } catch (error) {
      Alert.alert('Erreur', "Une erreur est survenue lors du téléchargement de la facture.");
    }
  };

  const handleViewInvoice = () => {
    setShowInvoiceModal(true);
  };

  const handleAccept = () => {
    Alert.alert(
      'Accepter le devis',
      'Êtes-vous sûr de vouloir accepter ce devis ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Accepter',
          style: 'default',
          onPress: () => {
            // Update the quote status to accepted
            setQuote(prev => prev ? { ...prev, status: 'accepted' } : prev);
            // In a real app, you would also update the service_request status in the database
            // For example: supabase.from('service_request').update({ status: 'quote_accepted' }).eq('id', quote.requestId);
            
            Alert.alert(
              'Devis accepté',
              'Le devis a été accepté. L\'équipe corporate va maintenant générer une facture.',
              [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                }
              ]
            );
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Refuser le devis',
      'Êtes-vous sûr de vouloir refuser ce devis ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: () => {
            // Update the quote status to rejected
            setQuote(prev => prev ? { ...prev, status: 'rejected' } : prev);
            // In a real app, you would also update the service_request status in the database
            // For example: supabase.from('service_request').update({ status: 'quote_rejected' }).eq('id', quote.requestId);
            
            Alert.alert('Succès', 'Le devis a été refusé.');
            router.back();
          },
        },
      ]
    );
  };

  const handleModify = () => {
    router.push(`/quote/${quote.id}/edit`);
  };

  const handleSend = () => {
    Alert.alert(
      'Envoyer le devis',
      'Êtes-vous sûr de vouloir envoyer ce devis au client ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Envoyer',
          style: 'default',
          onPress: () => {
            // Update the quote status to pending
            setQuote(prev => prev ? { ...prev, status: 'pending' } : prev);
            
            Alert.alert('Succès', 'Le devis a été envoyé au client.');
            router.back();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le devis',
      'Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Succès', 'Le devis a été supprimé.');
            router.back();
          },
        },
      ]
    );
  };

  const handlePayInvoice = () => {
    setShowPaymentModal(true);
  };

  const handleProcessPayment = () => {
    // In a real app, this would process the payment via Stripe
    Alert.alert(
      'Paiement effectué',
      'Votre paiement a été traité avec succès.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Update the quote status to paid
            setQuote(prev => prev ? { ...prev, status: 'paid' } : prev);
            
            setShowPaymentModal(false);
            router.back();
          }
        }
      ]
    );
  };

  const handleMarkAsPaid = () => {
    Alert.alert(
      'Marquer comme payé',
      'Êtes-vous sûr de vouloir marquer cette facture comme payée ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Confirmer',
          style: 'default',
          onPress: () => {
            // Update the quote status to paid
            setQuote(prev => prev ? { ...prev, status: 'paid' } : prev);
            
            Alert.alert('Succès', 'La facture a été marquée comme payée.');
            router.back();
          },
        },
      ]
    );
  };

  const handleGenerateInvoice = () => {
    // In a real app, this would create an invoice in the corporate accounting system
    // For now, we'll simulate this process
    
    // Create invoice reference based on quote reference
    const invoiceReference = quote.reference.replace('DEV', 'FAC');
    const invoiceDate = new Date().toISOString().split('T')[0];
    const paymentDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Default deposit amount (30% of total)
    const depositAmount = Math.round(quote.totalAmount * 0.3);
    
    // Update the quote with invoice information
    setQuote(prev => prev ? {
      ...prev,
      status: 'invoiced',
      invoiceReference,
      invoiceDate,
      depositAmount,
      paymentDueDate,
    } : prev);
    
    Alert.alert(
      'Facture générée',
      'La facture a été générée avec succès et envoyée au client.',
      [
        {
          text: 'OK',
          onPress: () => router.back()
        }
      ]
    );
  };

  const PaymentModal = () => (
    <Modal
      visible={showPaymentModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPaymentModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Paiement de la facture</Text>
          
          <View style={styles.modalBody}>
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Référence :</Text>
              <Text style={styles.invoiceValue}>{quote.invoiceReference}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Montant total :</Text>
              <Text style={styles.invoiceValue}>{formatAmount(quote.totalAmount)}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Acompte à payer :</Text>
              <Text style={styles.invoiceValue}>{formatAmount(quote.depositAmount || 0)}</Text>
            </View>
            
            <View style={styles.paymentMethodContainer}>
              <Text style={styles.paymentMethodTitle}>Méthode de paiement</Text>
              <View style={styles.paymentMethod}>
                <View style={styles.paymentMethodRadio}>
                  <View style={styles.paymentMethodRadioInner} />
                </View>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodName}>Carte bancaire</Text>
                  <Text style={styles.paymentMethodDescription}>Paiement sécurisé par Stripe</Text>
                </View>
              </View>
              
              <View style={styles.cardInputContainer}>
                <Text style={styles.cardInputLabel}>Numéro de carte</Text>
                <TextInput
                  style={styles.cardInput}
                  placeholder="4242 4242 4242 4242"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.cardDetailsRow}>
                <View style={styles.cardInputContainer}>
                  <Text style={styles.cardInputLabel}>Date d'expiration</Text>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="MM/AA"
                  />
                </View>
                
                <View style={styles.cardInputContainer}>
                  <Text style={styles.cardInputLabel}>CVC</Text>
                  <TextInput
                    style={styles.cardInput}
                    placeholder="123"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowPaymentModal(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalConfirmButton}
              onPress={handleProcessPayment}
            >
              <Text style={styles.modalConfirmText}>Payer {formatAmount(quote.depositAmount || 0)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const InvoiceModal = () => (
    <Modal
      visible={showInvoiceModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowInvoiceModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Détails de la facture</Text>
          
          <View style={styles.modalBody}>
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Référence :</Text>
              <Text style={styles.invoiceValue}>{quote.invoiceReference}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Date d'émission :</Text>
              <Text style={styles.invoiceValue}>{formatDate(quote.invoiceDate || '')}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Montant total :</Text>
              <Text style={styles.invoiceValue}>{formatAmount(quote.totalAmount)}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Acompte :</Text>
              <Text style={styles.invoiceValue}>{formatAmount(quote.depositAmount || 0)}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Reste à payer :</Text>
              <Text style={styles.invoiceValue}>{formatAmount((quote.totalAmount || 0) - (quote.depositAmount || 0))}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Date d'échéance :</Text>
              <Text style={styles.invoiceValue}>{formatDate(quote.paymentDueDate || '')}</Text>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowInvoiceModal(false)}
            >
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalConfirmButton}
              onPress={() => {
                setShowInvoiceModal(false);
                handleDownloadInvoice();
              }}
            >
              <Text style={styles.modalConfirmText}>Télécharger</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
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
          {/* Quote Header */}
          <View style={styles.quoteHeader}>
            <View style={styles.quoteInfo}>
              <Text style={styles.quoteReference}>{quote.reference}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
                <StatusIcon size={16} color={status.color} />
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>
            <Text style={styles.quoteAmount}>{formatAmount(quote.totalAmount)}</Text>
          </View>

          {/* Provider Info */}
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

          {/* Boat Info */}
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
                  Émis le {formatDate(quote.date)}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Clock size={16} color="#666" />
                <Text style={styles.cardText}>
                  Valable jusqu'au {formatDate(quote.validUntil)}
                </Text>
              </View>
            </View>
          </View>

          {/* Conditional rendering for Services or Document */}
          {quote.file_url ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Document du devis</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <FileText size={16} color="#666" />
                  <Text style={styles.cardText}>Devis disponible en PDF</Text>
                </View>
                <TouchableOpacity 
                  style={styles.downloadButton}
                  onPress={handleDownload}
                >
                  <Download size={20} color="#0066CC" />
                  <Text style={styles.downloadButtonText}>Voir/Télécharger le PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Services Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Services</Text>
                {quote.services.map((service, index) => (
                  <View key={index} style={styles.serviceCard}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <Text style={styles.serviceDescription}>{service.description}</Text>
                    <Text style={styles.serviceAmount}>{formatAmount(service.amount)}</Text>
                  </View>
                ))}
              </View>

              {/* Total */}
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Total HT</Text>
                <Text style={styles.totalAmount}>{formatAmount(quote.totalAmount)}</Text>
              </View>
            </>
          )}

          {/* Invoice Info (if invoiced) */}
          {(quote.status === 'invoiced' || quote.status === 'paid') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informations de facturation</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <FileText size={16} color="#666" />
                  <Text style={styles.cardText}>
                    Facture {quote.invoiceReference}
                  </Text>
                </View>
                <View style={styles.cardRow}>
                  <Calendar size={16} color="#666" />
                  <Text style={styles.cardText}>
                    Émise le {formatDate(quote.invoiceDate || '')}
                  </Text>
                </View>
                <View style={styles.cardRow}>
                  <Euro size={16} color="#666" />
                  <Text style={styles.cardText}>
                    Acompte : {formatAmount(quote.depositAmount || 0)}
                  </Text>
                </View>
                <View style={styles.cardRow}>
                  <Clock size={16} color="#666" />
                  <Text style={styles.cardText}>
                    Échéance : {formatDate(quote.paymentDueDate || '')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Actions */}
          {user?.role === 'nautical_company' && (quote.status === 'draft' || quote.status === 'sent') ? (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Supprimer</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modifyButton}
                onPress={handleModify}
              >
                <Text style={styles.modifyButtonText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={handleSend}
              >
                <Text style={styles.sendButtonText}>Envoyer</Text>
              </TouchableOpacity>
            </View>
          ) : quote.status === 'pending' && user?.role === 'pleasure_boater' ? (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={handleReject}
              >
                <Text style={styles.rejectButtonText}>Refuser</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={handleAccept}
              >
                <Text style={styles.acceptButtonText}>Accepter</Text>
              </TouchableOpacity>
            </View>
          ) : quote.status === 'accepted' && user?.role === 'corporate' ? (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.invoiceButton}
                onPress={handleGenerateInvoice}
              >
                <Text style={styles.invoiceButtonText}>Déposer une facture</Text>
              </TouchableOpacity>
            </View>
          ) : quote.status === 'invoiced' && user?.role === 'corporate' ? (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.markAsPaidButton}
                onPress={handleMarkAsPaid}
              >
                <Text style={styles.markAsPaidButtonText}>Marquer comme payé</Text>
              </TouchableOpacity>
            </View>
          ) : quote.status === 'invoiced' && user?.role === 'pleasure_boater' ? (
            <View style={styles.actions}>
              <TouchableOpacity 
                style={styles.payButton}
                onPress={handlePayInvoice}
              >
                <Text style={styles.payButtonText}>Payer maintenant</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Download Buttons (always visible for generated quotes) */}
          {!quote.file_url && ( // Only show if not a document-based quote
            <View style={styles.downloadButtons}>
              <TouchableOpacity 
                style={styles.downloadButton}
                onPress={handleDownload}
              >
                <Download size={20} color="#0066CC" />
                <Text style={styles.downloadButtonText}>Télécharger le devis</Text>
              </TouchableOpacity>
            </View>
          )}

          {(quote.status === 'invoiced' || quote.status === 'paid') && (
            <TouchableOpacity 
              style={[styles.downloadButton, { backgroundColor: '#3B82F6', marginTop: 12 }]}
              onPress={handleViewInvoice}
            >
              <FileText size={20} color="white" />
              <Text style={[styles.downloadButtonText, { color: 'white' }]}>
                Voir la facture
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <PaymentModal />
      <InvoiceModal />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  quoteHeader: {
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    gap: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  quoteAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
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
  totalSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  invoiceButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(59, 130, 246, 0.2)',
      },
    }),
  },
  invoiceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  markAsPaidButton: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(16, 185, 129, 0.2)',
      },
    }),
  },
  markAsPaidButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  payButton: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(16, 185, 129, 0.2)',
      },
    }),
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
  },
  downloadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
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
  downloadButtons: {
    gap: 12,
  },
  modifyButton: {
    flex: 1,
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  modalBody: {
    gap: 16,
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 16,
    color: '#666',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  depositSummary: {
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 8,
  },
  depositText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  modalConfirmText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  invoiceDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
  },
  invoiceValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  paymentMethodContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    marginTop: 8,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  paymentMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0066CC',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: '#666',
  },
  cardInputContainer: {
    flex: 1,
    gap: 4,
  },
  cardInputLabel: {
    fontSize: 14,
    color: '#666',
  },
  cardInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});

