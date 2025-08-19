import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Modal, TextInput, Linking } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, CircleCheck as CheckCircle2, X, CircleAlert as AlertCircle, CircleDot, Circle as XCircle, User, Bot as Boat, Building, Download, Ship, FileText, Euro, MessageSquare, Upload, MapPin, Phone, Mail, Search, ChevronRight } from 'lucide-react-native';
import { generateQuotePDF } from '@/utils/pdf';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';

// --- Interfaces et configurations des statuts ---

// Types de statuts possibles pour une demande (plus générique que juste "quote")
type RequestStatus = 'submitted' | 'in_progress' | 'forwarded' | 'quote_sent' | 'quote_accepted' | 'scheduled' | 'completed' | 'ready_to_bill' | 'to_pay' | 'paid' | 'cancelled';
type RequestSource = 'pleasure_boater' | 'boat_manager' | 'nautical_company'; // Qui a initié la demande

interface RequestData {
  id: string;
  title: string; // Description de la demande
  type: string; // Catégorie de service (ex: Maintenance, Amélioration)
  service_category_id?: number; // ID de la catégorie de service
  status: RequestStatus;
  urgency: 'normal' | 'urgent';
  date: string; // Date de la demande
  description: string; // Description détaillée
  price?: number; // Prix estimé ou total du devis/facture
  notes?: string; // Notes additionnelles, peut contenir des infos de facture/devis PDF
  
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
  };
  boat: {
    id: string;
    name: string;
    type: string;
    place_de_port?: string;
    id_port?: number; // ID du port du bateau
  };
  
  // Informations sur les acteurs impliqués (Boat Manager, Entreprise)
  boatManager?: {
    id: string;
    name: string;
    profile: string;
  };
  company?: {
    id: string;
    name: string;
    profile: string;
  };

  // Informations spécifiques au devis/facture si applicable
  quote_file_url?: string; // URL du PDF duvis si déposé
  invoice_reference?: string;
  invoice_date?: string;
  deposit_amount?: number;
  payment_due_date?: string;
}

interface NauticalCompany {
  id: string;
  name: string;
  logo: string;
  location: string; // Port name
  rating?: number;
  categories: Array<{ id: number; description1: string; }>;
  contactEmail?: string;
  contactPhone?: string;
}

// Configuration des statuts avec icônes et couleurs
const statusConfig = {
  submitted: { icon: Clock, color: '#F97316', label: 'Nouvelle' },
  in_progress: { icon: CircleDot, color: '#3B82F6', label: 'En cours' },
  forwarded: { icon: Upload, color: '#A855F7', label: 'Transmise' },
  quote_sent: { icon: FileText, color: '#22C55E', label: 'Devis envoyé' },
  quote_accepted: { icon: CheckCircle2, color: '#15803D', label: 'Devis accepté' },
  scheduled: { icon: Calendar, color: '#2563EB', label: 'Planifiée' },
  completed: { icon: CheckCircle2, color: '#0EA5E9', label: 'Terminée' },
  ready_to_bill: { icon: Upload, color: '#6366F1', label: 'Bon à facturer' },
  to_pay: { icon: Euro, color: '#EAB308', label: 'À régler' },
  paid: { icon: CheckCircle2, color: '#a6acaf', label: 'Réglée' },
  cancelled: { icon: XCircle, color: '#DC2626', label: 'Annulée' },
};

// Fonction pour déterminer les actions disponibles en fonction du rôle et du statut
const getAvailableActions = (userRole: string | undefined, requestStatus: RequestStatus, requestData: RequestData) => {
  const actions: string[] = [];

  // Actions communes (téléchargement de devis/facture si URL existe)
  if (requestData.quote_file_url || (requestStatus === 'quote_sent' && requestData.price)) {
    actions.push('download_quote');
  }
  if (requestData.invoice_reference && (requestStatus === 'to_pay' || requestStatus === 'paid')) {
    actions.push('view_invoice');
  }

  switch (userRole) {
    case 'pleasure_boater':
      if (requestStatus === 'quote_sent') {
        actions.push('accept_quote', 'reject_quote');
      } else if (requestStatus === 'to_pay') {
        actions.push('pay_invoice');
      }
      // Plaisancier peut toujours voir les détails de sa demande
      actions.push('view_details');
      break;

    case 'boat_manager':
      if (requestStatus === 'submitted') {
        actions.push('take_charge', 'forward_to_company', 'delete_request');
      } else if (requestStatus === 'in_progress') {
        actions.push('forward_to_company', 'create_quote', 'mark_as_completed');
      } else if (requestStatus === 'forwarded') {
        actions.push('remind_company');
      } else if (requestStatus === 'quote_sent') {
        actions.push('modify_quote', 'remind_client');
      } else if (requestStatus === 'quote_accepted') {
        actions.push('schedule_intervention', 'mark_as_completed');
      } else if (requestStatus === 'scheduled') {
        actions.push('mark_as_completed');
      } else if (requestStatus === 'completed') {
        actions.push('ready_for_billing');
      } else if (requestStatus === 'to_pay') {
        actions.push('remind_client');
      } else if (requestStatus === 'cancelled') {
        actions.push('archive_request');
      }
      actions.push('message_client'); // Peut toujours envoyer un message au client
      break;

    case 'nautical_company':
      if (requestStatus === 'submitted') {
        actions.push('take_charge', 'create_quote', 'reject_request');
      } else if (requestStatus === 'in_progress') {
        actions.push('create_quote', 'mark_as_completed');
      } else if (requestStatus === 'quote_sent') {
        actions.push('modify_quote', 'remind_client');
      } else if (requestStatus === 'quote_accepted') {
        actions.push('schedule_intervention', 'mark_as_completed');
      } else if (requestStatus === 'scheduled') {
        actions.push('mark_as_completed');
      } else if (requestStatus === 'completed') {
        actions.push('ready_for_billing');
      } else if (requestStatus === 'to_pay') {
        actions.push('remind_client');
      } else if (requestStatus === 'cancelled') {
        actions.push('archive_request');
      }
      actions.push('message_client'); // Peut toujours envoyer un message au client
      break;

    case 'corporate':
      if (requestStatus === 'in_progress' || requestStatus === 'forwarded' || requestStatus === 'quote_sent' || requestStatus === 'quote_accepted' || requestStatus === 'scheduled' || requestStatus === 'completed') {
        actions.push('view_details'); // Corporate peut voir les détails à toutes les étapes actives
      }
      if (requestStatus === 'ready_to_bill') {
        actions.push('generate_invoice');
      } else if (requestStatus === 'to_pay') {
        actions.push('mark_as_paid');
      } else if (requestStatus === 'cancelled' || requestStatus === 'paid') {
        actions.push('archive_request');
      }
      actions.push('message_client'); // Peut toujours envoyer un message au client
      break;
  }

  return actions;
};

// --- Composant principal ---

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<RequestData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // États pour la modale de sélection d'entreprise
  const [showCompanySelectionModal, setShowCompanySelectionModal] = useState(false);
  const [nauticalCompaniesForSelection, setNauticalCompaniesForSelection] = useState<NauticalCompany[]>([]);
  const [loadingNauticalCompanies, setLoadingNauticalCompanies] = useState(false);
  const [nauticalCompanySearchQuery, setNauticalCompanySearchQuery] = useState('');

  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!id) {
        setError("ID de la demande manquant.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('service_request')
          .select(`
            id,
            description,
            statut,
            urgence,
            date,
            prix,
            note_add,
            id_client(id, first_name, last_name, e_mail, phone, avatar),
            boat(id, name, type, place_de_port, id_port),
            id_boat_manager(id, first_name, last_name, profile),
            id_companie(id, company_name, profile),
            categorie_service(description1, id)
          `)
          .eq('id', parseInt(id))
          .single();

        if (fetchError) {
          console.error('Error fetching service request:', fetchError);
          setError('Erreur lors du chargement de la demande.');
          setLoading(false);
          return;
        }

        if (!data) {
          setError('Demande non trouvée.');
          setLoading(false);
          return;
        }

        let boatManagerInfo: RequestData['boatManager'] | undefined;
        if (data.id_boat_manager) {
          boatManagerInfo = {
            id: data.id_boat_manager.id.toString(),
            name: `${data.id_boat_manager.first_name} ${data.id_boat_manager.last_name}`,
            profile: data.id_boat_manager.profile,
          };
        }

        let companyInfo: RequestData['company'] | undefined;
        if (data.id_companie) {
          companyInfo = {
            id: data.id_companie.id.toString(),
            name: data.id_companie.company_name,
            profile: data.id_companie.profile,
          };
        }

        let quoteFileUrl: string | undefined;
        let invoiceReference: string | undefined;
        let invoiceDate: string | undefined;
        let depositAmount: number | undefined;
        let paymentDueDate: string | undefined;

        if (data.note_add) {
          const fileUrlMatch = data.note_add.match(/Devis PDF: (https?:\/\/\S+)/);
          if (fileUrlMatch) {
            quoteFileUrl = fileUrlMatch[1];
          }
          const invoiceRefMatch = data.note_add.match(/Facture (\S+) • (\d{4}-\d{2}-\d{2})/);
          if (invoiceRefMatch) {
            invoiceReference = invoiceRefMatch[1];
            invoiceDate = invoiceRefMatch[2];
          }
          const depositMatch = data.note_add.match(/Acompte: (\d+(\.\d+)?)/);
          if (depositMatch) {
            depositAmount = parseFloat(depositMatch[1]);
          }
          const paymentDueDateMatch = data.note_add.match(/Date d'échéance: (\d{4}-\d{2}-\d{2})/);
          if (paymentDueDateMatch) {
            paymentDueDate = paymentDueDateMatch[1];
          }
        }

        setRequest({
          id: data.id.toString(),
          title: data.description || 'Demande de service',
          type: data.categorie_service?.description1 || 'Général',
          service_category_id: data.categorie_service?.id,
          status: data.statut as RequestStatus,
          urgency: data.urgence as 'normal' | 'urgent',
          date: data.date,
          description: data.description,
          price: data.prix || 0,
          notes: data.note_add,
          client: {
            id: data.id_client?.id?.toString() || '',
            name: `${data.id_client?.first_name || ''} ${data.id_client?.last_name || ''}`,
            email: data.id_client?.e_mail || '',
            phone: data.id_client?.phone || '',
            avatar: data.id_client?.avatar || '',
          },
          boat: {
            id: data.boat?.id?.toString() || '',
            name: data.boat?.name || '',
            type: data.boat?.type || '',
            place_de_port: data.boat?.place_de_port || '',
            id_port: data.boat?.id_port || undefined,
          },
          boatManager: boatManagerInfo,
          company: companyInfo,
          quote_file_url: quoteFileUrl,
          invoice_reference: invoiceReference,
          invoice_date: invoiceDate,
          deposit_amount: depositAmount,
          payment_due_date: paymentDueDate,
        });
      } catch (e) {
        console.error('Unexpected error fetching request details:', e);
        setError('Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [id]);

  const currentStatusConfig = request ? statusConfig[request.status] : null;
  const StatusIcon = currentStatusConfig ? currentStatusConfig.icon : null;

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

  // --- Handlers pour les actions des boutons ---

  const handleDownloadQuote = async () => {
    if (!request) return;
    if (request.quote_file_url) {
      if (Platform.OS === 'web') {
        window.open(request.quote_file_url, '_blank');
      } else {
        Linking.openURL(request.quote_file_url).catch(err => console.error('Failed to open URL:', err));
      }
    } else if (request.status === 'quote_sent' && request.price) {
      // Générer le PDF à la volée si pas d'URL de fichier
      try {
        await generateQuotePDF({
          reference: `DEV-${request.id}`,
          date: request.date,
          validUntil: request.payment_due_date || new Date().toISOString().split('T')[0], // Utiliser payment_due_date comme validUntil si dispo
          provider: {
            name: request.company?.name || request.boatManager?.name || 'Prestataire inconnu',
            type: request.company ? 'nautical_company' : (request.boatManager ? 'boat_manager' : 'boat_manager'),
          },
          client: request.client,
          boat: request.boat,
          services: [{ name: request.type, description: request.description, amount: request.price }],
          totalAmount: request.price,
        });
        Alert.alert('Succès', 'Devis généré et téléchargé.');
      } catch (error) {
        Alert.alert('Erreur', "Une erreur est survenue lors de la génération du devis.");
      }
    }
  };

  const handleViewInvoice = () => {
    setShowInvoiceModal(true);
  };

  const handleAcceptQuote = async () => {
    if (!request || !id) return;
    Alert.alert(
      'Accepter le devis',
      'Êtes-vous sûr de vouloir accepter ce devis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Accepter',
          onPress: async () => {
            const { error: updateError } = await supabase
              .from('service_request')
              .update({ statut: 'quote_accepted' })
              .eq('id', parseInt(id));
            if (updateError) {
              Alert.alert('Erreur', `Impossible d'accepter le devis: ${updateError.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'quote_accepted' } : prev);
              Alert.alert('Succès', 'Devis accepté !');
            }
          },
        },
      ]
    );
  };

  const handleRejectQuote = async () => {
    if (!request || !id) return;
    Alert.alert(
      'Refuser le devis',
      'Êtes-vous sûr de vouloir refuser ce devis ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Refuser',
          style: 'destructive',
          onPress: async () => {
            const { error: updateError } = await supabase
              .from('service_request')
              .update({ statut: 'cancelled' }) // Changed to 'cancelled' as per workflow
              .eq('id', parseInt(id));

            if (updateError) {
              Alert.alert('Erreur', `Impossible de refuser le devis: ${updateError.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'cancelled' } : prev);
              Alert.alert('Succès', 'Devis refusé.');
            }
          },
        },
      ]
    );
  };

  const handlePayInvoice = () => {
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (!request || !id) return;
    Alert.alert(
      'Paiement effectué',
      'Votre paiement a été traité avec succès.',
      [
        {
          text: 'OK',
          onPress: async () => {
            const { error: updateError } = await supabase
              .from('service_request')
              .update({ statut: 'paid' })
              .eq('id', parseInt(id));
            if (updateError) {
              Alert.alert('Erreur', `Impossible de marquer comme payé: ${updateError.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'paid' } : prev);
              setShowPaymentModal(false);
            }
          }
        }
      ]
    );
  };

  const handleTakeCharge = async () => {
    if (!request || !id || !user?.id) return;
    Alert.alert(
      'Prendre en charge',
      'Voulez-vous prendre en charge cette demande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error: updateError } = await supabase
              .from('service_request')
              .update({ statut: 'in_progress' })
              .eq('id', parseInt(id));
            if (updateError) {
              Alert.alert('Erreur', `Impossible de prendre en charge: ${updateError.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'in_progress' } : prev);
              Alert.alert('Succès', 'Demande prise en charge.');
            }
          },
        },
      ]
    );
  };

  const handleForwardToCompany = async () => {
    if (!request || typeof request.boat.id_port !== 'number' || typeof request.service_category_id !== 'number') {
      Alert.alert('Erreur', 'Informations manquantes ou invalides pour filtrer les entreprises (port ou service).');
      return;
    }

    const boatPortId = request.boat.id_port;
    const serviceCategoryId = request.service_category_id;

    setLoadingNauticalCompanies(true);
    setNauticalCompanySearchQuery('');
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('users')
        .select(`
          id,
          company_name,
          avatar,
          e_mail,
          phone,
          user_ports!inner(port_id, ports(name)),
          user_categorie_service!inner(categorie_service_id, categorie_service(description1))
        `)
        .eq('profile', 'nautical_company')
        .eq('user_ports.port_id', boatPortId) // Filtrage sur la colonne de la table de jointure
        .eq('user_categorie_service.categorie_service_id', serviceCategoryId); // Filtrage sur la colonne de la table de jointure

      if (companiesError) {
        console.error('Error fetching nautical companies:', companiesError);
        Alert.alert('Erreur', `Impossible de charger les entreprises: ${companiesError.message}`);
        setNauticalCompaniesForSelection([]);
      } else {
        const formattedCompanies: NauticalCompany[] = companiesData.map((company: any) => ({
          id: company.id.toString(),
          name: company.company_name,
          logo: company.avatar || 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop', // Default logo
          location: company.user_ports[0]?.ports?.name || 'N/A', // Assuming one port for display
          contactEmail: company.e_mail,
          contactPhone: company.phone,
          categories: company.user_categorie_service.map((ucs: any) => ({
            id: ucs.categorie_service_id,
            description1: ucs.categorie_service.description1,
          })),
        }));
        setNauticalCompaniesForSelection(formattedCompanies);
      }
    } catch (e) {
      console.error('Unexpected error fetching nautical companies:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors du chargement des entreprises.');
      setNauticalCompaniesForSelection([]);
    } finally {
      setLoadingNauticalCompanies(false);
      setShowCompanySelectionModal(true);
    }
  };

  const handleSelectNauticalCompany = async (company: NauticalCompany) => {
    if (!request || !id) return;

    Alert.alert(
      'Confirmer la transmission',
      `Voulez-vous transmettre cette demande à ${company.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error: updateError } = await supabase
              .from('service_request')
              .update({
                statut: 'forwarded',
                id_companie: company.id,
              })
              .eq('id', parseInt(id));

            if (updateError) {
              Alert.alert('Erreur', `Impossible de transmettre la demande: ${updateError.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'forwarded', company: { id: company.id, name: company.name, profile: 'nautical_company' } } : prev);
              Alert.alert('Succès', `Demande transmise à ${company.name}.`);
              setShowCompanySelectionModal(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateQuote = () => {
    if (!request) return;
    router.push({
      pathname: '/quote/new', // Ou '/(boat-manager)/quote-upload' si c'est le point d'entrée
      params: {
        clientId: request.client.id,
        clientName: request.client.name,
        clientEmail: request.client.email,
        boatId: request.boat.id,
        boatName: request.boat.name,
        boatType: request.boat.type,
        requestId: request.id,
      }
    });
  };

  const handleMarkAsCompleted = async () => {
    if (!request || !id) return;
    Alert.alert(
      'Marquer comme terminée',
      'Êtes-vous sûr de vouloir marquer cette demande comme terminée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error: updateError } = await supabase
              .from('service_request')
              .update({ statut: 'completed' })
              .eq('id', parseInt(id));
            if (updateError) {
              Alert.alert('Erreur', `Impossible de marquer comme terminée: ${updateError.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'completed' } : prev);
              Alert.alert('Succès', 'Demande marquée comme terminée.');
            }
          },
        },
      ]
    );
  };

  const handleReadyForBilling = async () => {
    if (!request || !id) return;
    Alert.alert(
      'Bon à facturer',
      'Marquer cette demande comme prête à être facturée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error: updateError } = await supabase
              .from('service_request')
              .update({ statut: 'ready_to_bill' })
              .eq('id', parseInt(id));
            if (updateError) {
              Alert.alert('Erreur', `Impossible de marquer comme bon à facturer: ${updateError.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'ready_to_bill' } : prev);
              Alert.alert('Succès', 'Demande marquée comme bon à facturer.');
            }
          },
        },
      ]
    );
  };

  const handleGenerateInvoice = async () => {
    if (!request || !id) return;
    // Logique de génération de facture (similaire à handleGenerateInvoice dans quote/[id].tsx)
    const invoiceReference = `FAC-${request.id}`;
    const invoiceDate = new Date().toISOString().split('T')[0];
    const paymentDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const depositAmount = Math.round((request.price || 0) * 0.3); // Exemple 30% acompte

    const { error: updateError } = await supabase
      .from('service_request')
      .update({
        statut: 'to_pay',
        note_add: `Facture ${invoiceReference} • ${invoiceDate} | Acompte: ${depositAmount} | Date d'échéance: ${paymentDueDate}`
      })
      .eq('id', parseInt(id));

    if (updateError) {
      Alert.alert('Erreur', `Impossible de générer la facture: ${updateError.message}`);
    } else {
      setRequest(prev => prev ? {
        ...prev,
        status: 'to_pay',
        invoice_reference: invoiceReference,
        invoice_date: invoiceDate,
        deposit_amount: depositAmount,
        payment_due_date: paymentDueDate,
      } : prev);
      Alert.alert('Succès', 'Facture générée et envoyée au client.');
    }
  };

  const handleMarkAsPaid = async () => {
    if (!request || !id) return;
    Alert.alert(
      'Marquer comme payé',
      'Êtes-vous sûr de vouloir marquer cette facture comme payée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error: updateError } = await supabase
              .from('service_request')
              .update({ statut: 'paid' })
              .eq('id', parseInt(id));
            if (updateError) {
              Alert.alert('Erreur', `Impossible de marquer comme payé: ${updateError.message}`);
            } else {
              setRequest(prev => prev ? { ...prev, status: 'paid' } : prev);
              Alert.alert('Succès', 'Facture marquée comme payée.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteRequest = async () => {
    if (!request || !id) return;
    Alert.alert(
      'Supprimer la demande',
      'Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await supabase
              .from('service_request')
              .delete()
              .eq('id', parseInt(id));
            if (deleteError) {
              Alert.alert('Erreur', `Impossible de supprimer la demande: ${deleteError.message}`);
            } else {
              Alert.alert('Succès', 'Demande supprimée.');
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleArchiveRequest = async () => {
    if (!request || !id) return;
    Alert.alert(
      'Archiver la demande',
      'Êtes-vous sûr de vouloir archiver cette demande ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            // Dans une vraie application, vous changeriez un statut 'archived' ou déplaceriez la demande
            Alert.alert('Succès', 'Demande archivée.');
            router.back();
          },
        },
      ]
    );
  };

  const handleMessageClient = () => {
    if (!request) return;
    router.push(`/(tabs)/messages?client=${request.client.id}`);
  };

  const handleScheduleIntervention = () => {
    if (!request) return;
    router.push({
      pathname: '/appointment/[id]', // Naviguer vers la page de création/édition de rendez-vous
      params: {
        clientId: request.client.id,
        clientName: request.client.name,
        boatId: request.boat.id,
        boatName: request.boat.name,
        boatType: request.boat.type,
        requestId: request.id,
        // Pré-remplir d'autres champs si nécessaire
      }
    });
  };

  // --- Modals ---

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
              <Text style={styles.invoiceValue}>{request?.invoice_reference}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Montant total :</Text>
              <Text style={styles.invoiceValue}>{formatAmount(request?.price || 0)}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Acompte à payer :</Text>
              <Text style={styles.invoiceValue}>{formatAmount(request?.deposit_amount || 0)}</Text>
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
              <Text style={styles.modalConfirmText}>Payer {formatAmount(request?.deposit_amount || 0)}</Text>
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
              <Text style={styles.invoiceValue}>{request?.invoice_reference}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Date d'émission :</Text>
              <Text style={styles.invoiceValue}>{formatDate(request?.invoice_date || '')}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Montant total :</Text>
              <Text style={styles.invoiceValue}>{formatAmount(request?.price || 0)}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Acompte :</Text>
              <Text style={styles.invoiceValue}>{formatAmount(request?.deposit_amount || 0)}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Reste à payer :</Text>
              <Text style={styles.invoiceValue}>{formatAmount((request?.price || 0) - (request?.deposit_amount || 0))}</Text>
            </View>
            
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Date d'échéance :</Text>
              <Text style={styles.invoiceValue}>{formatDate(request?.payment_due_date || '')}</Text>
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
              onPress={async () => {
                setShowInvoiceModal(false);
                // Générer le PDF de la facture à la volée
                try {
                  await generateQuotePDF({
                    reference: request?.invoice_reference || `FAC-${request?.id}`,
                    date: request?.invoice_date || new Date().toISOString().split('T')[0],
                    validUntil: request?.payment_due_date || new Date().toISOString().split('T')[0],
                    provider: {
                      name: request?.company?.name || request?.boatManager?.name || 'Prestataire inconnu',
                      type: request?.company ? 'nautical_company' : (request?.boatManager ? 'boat_manager' : 'boat_manager'),
                    },
                    client: request?.client || { id: '', name: 'Client inconnu', email: '' },
                    boat: request?.boat || { id: '', name: 'Bateau inconnu', type: '' },
                    services: [{ name: request?.type || 'Service', description: request?.description || '', amount: request?.price || 0 }],
                    totalAmount: request?.price || 0,
                    isInvoice: true,
                    depositAmount: request?.deposit_amount,
                    paymentDueDate: request?.payment_due_date,
                  });
                  Alert.alert('Succès', 'Facture générée et téléchargée.');
                } catch (error) {
                  Alert.alert('Erreur', "Une erreur est survenue lors de la génération de la facture.");
                }
              }}
            >
              <Text style={styles.modalConfirmText}>Télécharger</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const NauticalCompanySelectionModal = () => (
    <Modal
      visible={showCompanySelectionModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCompanySelectionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner une entreprise</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCompanySelectionModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une entreprise..."
              value={nauticalCompanySearchQuery}
              onChangeText={setNauticalCompanySearchQuery}
            />
          </View>
          
          <ScrollView style={styles.modalList}>
            {loadingNauticalCompanies ? (
              <View style={styles.emptyModalState}>
                <Text style={styles.emptyModalText}>Chargement des entreprises...</Text>
              </View>
            ) : nauticalCompaniesForSelection.length > 0 ? (
              nauticalCompaniesForSelection
                .filter(company => company.name.toLowerCase().includes(nauticalCompanySearchQuery.toLowerCase()))
                .map((company) => (
                  <TouchableOpacity
                    key={company.id}
                    style={styles.modalItem}
                    onPress={() => handleSelectNauticalCompany(company)}
                  >
                    <View style={styles.modalItemContent}>
                      <Building size={20} color="#0066CC" />
                      <View>
                        <Text style={styles.modalItemText}>{company.name}</Text>
                        <Text style={styles.modalItemSubtext}>{company.location}</Text>
                      </View>
                    </View>
                    <ChevronRight size={20} color="#666" />
                  </TouchableOpacity>
                ))
            ) : (
              <View style={styles.emptyModalState}>
                <Text style={styles.emptyModalText}>
                  Aucune entreprise trouvée pour ce port et ce service.
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // --- Rendu du composant ---

  if (loading || !request || !currentStatusConfig || !StatusIcon) {
    return (
      <View style={[styles.container, styles.centered]}>
        {loading ? <Text>Chargement des détails de la demande...</Text> : <Text>{error || 'Demande non trouvée.'}</Text>}
      </View>
    );
  }

  const availableActions = getAvailableActions(user?.role, request.status, request);

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
          <Text style={styles.title}>Détails de la demande</Text>
        </View>

        <View style={styles.content}>
          {/* En-tête de la demande */}
          <View style={styles.requestHeaderCard}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestTitle}>{request.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${currentStatusConfig.color}15` }]}>
                <StatusIcon size={16} color={currentStatusConfig.color} />
                <Text style={[styles.statusText, { color: currentStatusConfig.color }]}>
                  {currentStatusConfig.label}
                </Text>
              </View>
            </View>
            {request.price !== undefined && (
              <Text style={styles.requestPrice}>{formatAmount(request.price)}</Text>
            )}
          </View>

          {/* Informations générales */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations générales</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <FileText size={16} color="#666" />
                <Text style={styles.cardText}>Type: {request.type}</Text>
              </View>
              <View style={styles.cardRow}>
                <Calendar size={16} color="#666" />
                <Text style={styles.cardText}>Date: {formatDate(request.date)}</Text>
              </View>
              <View style={styles.cardRow}>
                <AlertCircle size={16} color="#666" />
                <Text style={styles.cardText}>Urgence: {request.urgency === 'urgent' ? 'Urgent' : 'Normal'}</Text>
              </View>
              <View style={styles.cardRow}>
                <MessageSquare size={16} color="#666" />
                <Text style={styles.cardText}>Description: {request.description}</Text>
              </View>
              {request.boat.place_de_port && (
                <View style={styles.cardRow}>
                  <MapPin size={16} color="#666" />
                  <Text style={styles.cardText}>Lieu: {request.boat.place_de_port}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Informations client */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <User size={16} color="#666" />
                <Text style={styles.cardText}>{request.client.name}</Text>
              </View>
              <View style={styles.cardRow}>
                <Mail size={16} color="#666" />
                <Text style={styles.cardText}>{request.client.email}</Text>
              </View>
              <View style={styles.cardRow}>
                <Phone size={16} color="#666" />
                <Text style={styles.cardText}>{request.client.phone}</Text>
              </View>
            </View>
          </View>

          {/* Informations bateau */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bateau</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Boat size={16} color="#666" />
                <Text style={styles.cardText}>{request.boat.name}</Text>
              </View>
              <View style={styles.cardRow}>
                <Ship size={16} color="#666" />
                <Text style={styles.cardText}>{request.boat.type}</Text>
              </View>
            </View>
          </View>

          {/* Informations Boat Manager / Entreprise (si applicable) */}
          {(request.boatManager || request.company) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acteurs impliqués</Text>
              <View style={styles.card}>
                {request.boatManager && (
                  <View style={styles.cardRow}>
                    <User size={16} color="#0066CC" />
                    <Text style={styles.cardText}>Boat Manager: {request.boatManager.name}</Text>
                  </View>
                )}
                {request.company && (
                  <View style={styles.cardRow}>
                    <Building size={16} color="#8B5CF6" />
                    <Text style={styles.cardText}>Entreprise: {request.company.name}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Section Devis/Facture si applicable */}
          {(request.quote_file_url || request.invoice_reference) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Documents liés</Text>
              <View style={styles.card}>
                {request.quote_file_url && (
                  <View style={styles.cardRow}>
                    <FileText size={16} color="#666" />
                    <Text style={styles.cardText}>Devis PDF disponible</Text>
                  </View>
                )}
                {request.invoice_reference && (
                  <>
                    <View style={styles.cardRow}>
                      <FileText size={16} color="#666" />
                      <Text style={styles.cardText}>Facture: {request.invoice_reference}</Text>
                    </View>
                    <View style={styles.cardRow}>
                      <Calendar size={16} color="#666" />
                      <Text style={styles.cardText}>Date facture: {formatDate(request.invoice_date || '')}</Text>
                    </View>
                    {request.deposit_amount !== undefined && (
                      <View style={styles.cardRow}>
                        <Euro size={16} color="#666" />
                        <Text style={styles.cardText}>Acompte: {formatAmount(request.deposit_amount)}</Text>
                      </View>
                    )}
                    {request.payment_due_date && (
                      <View style={styles.cardRow}>
                        <Clock size={16} color="#666" />
                        <Text style={styles.cardText}>Échéance: {formatDate(request.payment_due_date)}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          )}

          {/* Boutons d'action dynamiques */}
          <View style={styles.actionsContainer}>
            {availableActions.includes('download_quote') && (
              <TouchableOpacity style={styles.actionButton} onPress={handleDownloadQuote}>
                <Download size={20} color="#0066CC" />
                <Text style={styles.actionButtonText}>Télécharger Devis</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('view_invoice') && (
              <TouchableOpacity style={styles.actionButton} onPress={handleViewInvoice}>
                <FileText size={20} color="#0066CC" />
                <Text style={styles.actionButtonText}>Voir Facture</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('accept_quote') && (
              <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAcceptQuote}>
                <CheckCircle2 size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Accepter Devis</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('reject_quote') && (
              <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={handleRejectQuote}>
                <XCircle size={20} color="#EF4444" />
                <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Refuser Devis</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('pay_invoice') && (
              <TouchableOpacity style={[styles.actionButton, styles.payButton]} onPress={handlePayInvoice}>
                <Euro size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Payer Facture</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('take_charge') && (
              <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleTakeCharge}>
                <CheckCircle2 size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Prendre en charge</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('forward_to_company') && (
              <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleForwardToCompany}>
                <Building size={20} color="#0066CC" />
                <Text style={styles.actionButtonText}>Transmettre à Entreprise</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('create_quote') && (
              <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleCreateQuote}>
                <FileText size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Créer Devis</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('mark_as_completed') && (
              <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleMarkAsCompleted}>
                <CheckCircle2 size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Marquer comme terminée</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('ready_for_billing') && (
              <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleReadyForBilling}>
                <Upload size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Bon à facturer</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('generate_invoice') && (
              <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleGenerateInvoice}>
                <Euro size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Générer Facture</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('mark_as_paid') && (
              <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleMarkAsPaid}>
                <CheckCircle2 size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Marquer comme payé</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('delete_request') && (
              <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={handleDeleteRequest}>
                <XCircle size={20} color="#EF4444" />
                <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Supprimer Demande</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('archive_request') && (
              <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleArchiveRequest}>
                <FileText size={20} color="#0066CC" />
                <Text style={styles.actionButtonText}>Archiver Demande</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('message_client') && (
              <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleMessageClient}>
                <MessageSquare size={20} color="#0066CC" />
                <Text style={styles.actionButtonText}>Message Client</Text>
              </TouchableOpacity>
            )}
            {availableActions.includes('schedule_intervention') && (
              <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleScheduleIntervention}>
                <Calendar size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Planifier Intervention</Text>
              </TouchableOpacity>
            )}
            {/* Ajoutez d'autres actions ici selon les besoins */}
          </View>
        </View>
      </ScrollView>
      <PaymentModal />
      <InvoiceModal />
      <NauticalCompanySelectionModal />
    </>
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
  requestHeaderCard: {
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
  requestInfo: {
    gap: 8,
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 18,
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
  requestPrice: {
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
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    justifyContent: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f7ff',
    minWidth: '48%', // Pour avoir deux boutons par ligne
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
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
  },
  primaryButton: {
    backgroundColor: '#0066CC',
  },
  secondaryButton: {
    backgroundColor: '#f0f7ff',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#fff5f5',
  },
  payButton: {
    backgroundColor: '#10B981',
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
    justifyContent: 'space-between',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    marginHorizontal: 0, // Override default margin
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  modalList: {
    maxHeight: 300,
    paddingHorizontal: 0, // Override default padding
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  modalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalItemSubtext: {
    fontSize: 14,
    color: '#666',
  },
  emptyModalState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});



