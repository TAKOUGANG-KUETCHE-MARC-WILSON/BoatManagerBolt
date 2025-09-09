import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  TextInput,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CircleCheck as CheckCircle2,
  X,
  CircleAlert as AlertCircle,
  CircleDot,
  Circle as XCircle,
  User,
  Bot as Boat,
  Building,
  Download,
  Ship,
  FileText,
  Euro,
  MessageSquare,
  Upload,
  MapPin,
  Phone,
  Mail,
  Search,
  ChevronRight,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateQuotePDF } from '@/utils/pdf';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';


// === Constantes & helpers responsive ===
const BASELINE_WIDTH = 375;
const ms = (size: number, width: number) => Math.round((width / BASELINE_WIDTH) * size);


// Fixed IBAN and BIC for Boat Managers (fallback)
const FIXED_BM_IBAN = 'FR76 1027 8089 8800 0226 8600 282';
const FIXED_BM_BIC = 'CMCIFR2A';


// --- Types ---
type RequestStatus =
  | 'submitted'
  | 'accepted'
  | 'in_progress'
  | 'forwarded'
  | 'quote_sent'
  | 'quote_accepted'
  | 'scheduled'
  | 'completed'
  | 'ready_to_bill'
  | 'to_pay'
  | 'paid'
  | 'cancelled';
type RequestSource = 'pleasure_boater' | 'boat_manager' | 'nautical_company';


interface RequestData {
  id: string;
  title: string;
  type: string;
  service_category_id?: number;
  status: RequestStatus;
  urgency: 'normal' | 'urgent';
  date: string;
  description: string;
  price?: number;
  notes?: string;
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
    id_port?: number;
  };
  boatManager?: {
    id: string;
    name: string;
    profile: string;
    iban?: string;
    bic?: string;
  };
  company?: {
    id: string;
    name: string;
    profile: string;
    iban?: string;
    bic?: string;
  };
  quote_file_url?: string;
  invoice_reference?: string;
  invoice_date?: string;
  deposit_amount?: number;
  payment_due_date?: string;
}


interface NauticalCompany {
  id: string;
  name: string;
  logo: string;
  location: string;
  rating?: number;
  categories: Array<{ id: number; description1: string }>;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  hasNewRequests?: boolean;
  ports: Array<{ id: number; name: string }>;
}


// --- UI config status ---
const statusConfig = {
  submitted: { icon: Clock, color: '#F97316', label: 'Nouvelle' },
  in_progress: { icon: CircleDot, color: '#3B82F6', label: 'En cours' },
  accepted: { icon: CircleDot, color: '#3B82F6', label: 'En cours' },
  forwarded: { icon: Upload, color: '#A855F7', label: 'Transmise' },
  quote_sent: { icon: FileText, color: '#22C55E', label: 'Devis envoyé' },
  quote_accepted: { icon: CheckCircle2, color: '#15803D', label: 'Devis accepté' },
  scheduled: { icon: Calendar, color: '#2563EB', label: 'Planifiée' },
  completed: { icon: CheckCircle2, color: '#0EA5E9', label: 'Terminée' },
  ready_to_bill: { icon: Upload, color: '#6366F1', label: 'Bon à facturer' },
  to_pay: { icon: Euro, color: '#EAB308', label: 'À régler' },
  paid: { icon: CheckCircle2, color: '#a6acaf', label: 'Réglée' },
  cancelled: { icon: XCircle, color: '#DC2626', label: 'Annulée' },
} as const;


// --- Actions disponibles selon rôle & statut ---
const getAvailableActions = (userRole: string | undefined, requestStatus: RequestStatus, requestData: RequestData) => {
  const actions: string[] = [];


  if (requestData.quote_file_url || (requestStatus === 'quote_sent' && requestData.price)) {
    actions.push('download_quote');
  }
  if (requestData.invoice_reference && (requestStatus === 'to_pay' || requestStatus === 'paid')) {
    actions.push('view_invoice');
  }


  switch (userRole) {
    case 'pleasure_boater':
      if (requestStatus === 'quote_sent') actions.push('accept_quote', 'reject_quote');
      if (requestStatus === 'to_pay') actions.push('pay_invoice');
      actions.push('view_details');
      break;


    case 'boat_manager':
      if (requestStatus === 'submitted') actions.push('take_charge', 'forward_to_company', 'delete_request');
      else if (requestStatus === 'in_progress') actions.push('forward_to_company', 'create_quote', 'mark_as_completed');
      else if (requestStatus === 'forwarded') actions.push('remind_company');
      else if (requestStatus === 'quote_sent') actions.push('modify_quote', 'remind_client');
      else if (requestStatus === 'quote_accepted') actions.push('schedule_intervention', 'mark_as_completed');
      else if (requestStatus === 'scheduled') actions.push('mark_as_completed');
      else if (requestStatus === 'completed') actions.push('ready_for_billing');
      else if (requestStatus === 'to_pay') actions.push('remind_client');
      else if (requestStatus === 'cancelled') actions.push('archive_request');
      actions.push('message_client');
      break;


    case 'nautical_company':
      if (requestStatus === 'submitted') actions.push('take_charge', 'create_quote', 'reject_request');
      else if (requestStatus === 'in_progress') actions.push('create_quote', 'mark_as_completed');
      else if (requestStatus === 'quote_sent') actions.push('modify_quote', 'remind_client');
      else if (requestStatus === 'quote_accepted') actions.push('schedule_intervention', 'mark_as_completed');
      else if (requestStatus === 'scheduled') actions.push('mark_as_completed');
      else if (requestStatus === 'completed') actions.push('ready_for_billing');
      else if (requestStatus === 'to_pay') actions.push('remind_client');
      else if (requestStatus === 'cancelled') actions.push('archive_request');
      actions.push('message_client');
      break;


    case 'corporate':
      if (
        requestStatus === 'in_progress' ||
        requestStatus === 'forwarded' ||
        requestStatus === 'quote_sent' ||
        requestStatus === 'quote_accepted' ||
        requestStatus === 'scheduled' ||
        requestStatus === 'completed'
      ) {
        actions.push('view_details');
      }
      if (requestStatus === 'ready_to_bill') actions.push('generate_invoice');
      else if (requestStatus === 'to_pay') actions.push('mark_as_paid');
      else if (requestStatus === 'cancelled' || requestStatus === 'paid') actions.push('archive_request');
      actions.push('message_client');
      break;
  }


  return actions;
};


// --- Composant principal ---
export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(width, insets.top), [width, insets.top]);


  const [request, setRequest] = useState<RequestData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);


  // Sélection d’entreprise
  const [showCompanySelectionModal, setShowCompanySelectionModal] = useState(false);
  const [nauticalCompaniesForSelection, setNauticalCompaniesForSelection] = useState<NauticalCompany[]>([]);
  const [loadingNauticalCompanies, setLoadingNauticalCompanies] = useState(false);
  const [nauticalCompanySearchQuery, setNauticalCompanySearchQuery] = useState('');


  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!id) {
        setError('ID de la demande manquant.');
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
            id_boat_manager(id, first_name, last_name, profile, iban, bic),
            id_companie(id, company_name, profile, iban, bic),
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
            iban: data.id_boat_manager.iban,
            bic: data.id_boat_manager.bic,
          };
        }


        let companyInfo: RequestData['company'] | undefined;
        if (data.id_companie) {
          companyInfo = {
            id: data.id_companie.id.toString(),
            name: data.id_companie.company_name,
            profile: data.id_companie.profile,
            iban: data.id_companie.iban,
            bic: data.id_companie.bic,
          };
        }


        let quoteFileUrl: string | undefined;
        let invoiceReference: string | undefined;
        let invoiceDate: string | undefined;
        let depositAmount: number | undefined;
        let paymentDueDate: string | undefined;


        if (data.note_add) {
          const fileUrlMatch = data.note_add.match(/Devis PDF: (https?:\/\/\S+)/);
          if (fileUrlMatch) quoteFileUrl = fileUrlMatch[1];
          const invoiceRefMatch = data.note_add.match(/Facture (\S+) • (\d{4}-\d{2}-\d{2})/);
          if (invoiceRefMatch) {
            invoiceReference = invoiceRefMatch[1];
            invoiceDate = invoiceRefMatch[2];
          }
          const depositMatch = data.note_add.match(/Acompte: (\d+(\.\d+)?)/);
          if (depositMatch) depositAmount = parseFloat(depositMatch[1]);
          const paymentDueDateMatch = data.note_add.match(/Date d'échéance: (\d{4}-\d{2}-\d{2})/);
          if (paymentDueDateMatch) paymentDueDate = paymentDueDateMatch[1];
        }


        setRequest({
          id: data.id.toString(),
          title: data.description || 'Demande de service',
          type: data.categorie_service?.description1 || 'Général',
          service_category_id: data.categorie_service?.id,
          status: String(data.statut).toLowerCase() as RequestStatus,
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


  // Statut affiché selon rôle
  const rawStatus = request?.status as RequestStatus | undefined;
  const isForwardedForThisCompany =
    rawStatus === 'forwarded' && user?.role === 'nautical_company' && request?.company?.id && String(request.company.id) === String(user?.id);


  const displayStatus: RequestStatus | undefined = rawStatus
    ? user?.role === 'nautical_company' && rawStatus === 'accepted'
      ? 'in_progress'
      : isForwardedForThisCompany
      ? 'submitted'
      : rawStatus
    : undefined;


  const currentStatusConfig = displayStatus ? statusConfig[displayStatus] : null;
  const StatusIcon = currentStatusConfig ? currentStatusConfig.icon : null;


  const formatDate = (dateString: string) =>
    dateString
      ? new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';


  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);


  // --- Handlers actions ---
  const handleDownloadQuote = async () => {
    if (!request) return;
    if (request.quote_file_url) {
      if (Platform.OS === 'web') {
        window.open(request.quote_file_url, '_blank');
      } else {
        Linking.openURL(request.quote_file_url).catch(err => console.error('Failed to open URL:', err));
      }
    } else if (request.status === 'quote_sent' && request.price) {
      try {
        await generateQuotePDF({
          reference: `DEV-${request.id}`,
          date: request.date,
          validUntil: request.payment_due_date || new Date().toISOString().split('T')[0],
          provider: {
            name: request.company?.name || request.boatManager?.name || 'Prestataire inconnu',
            type: request.company ? 'nautical_company' : request.boatManager ? 'boat_manager' : 'boat_manager',
          },
          client: request.client,
          boat: request.boat,
          services: [{ name: request.type, description: request.description, amount: request.price }],
          totalAmount: request.price,
        });
        Alert.alert('Succès', 'Devis généré et téléchargé.');
      } catch {
        Alert.alert('Erreur', 'Une erreur est survenue lors de la génération du devis.');
      }
    }
  };


  const handleViewInvoice = () => setShowInvoiceModal(true);


  const handleAcceptQuote = async () => {
    if (!request || !id) return;
    Alert.alert('Accepter le devis', 'Êtes-vous sûr de vouloir accepter ce devis ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Accepter',
        onPress: async () => {
          const { error: updateError } = await supabase.from('service_request').update({ statut: 'quote_accepted' }).eq('id', parseInt(id));
          if (updateError) Alert.alert('Erreur', `Impossible d'accepter le devis: ${updateError.message}`);
          else {
            setRequest(prev => (prev ? { ...prev, status: 'quote_accepted' } : prev));
            Alert.alert('Succès', 'Devis accepté !');
          }
        },
      },
    ]);
  };


  const handleRejectQuote = async () => {
    if (!request || !id) return;
    Alert.alert('Refuser le devis', 'Êtes-vous sûr de vouloir refuser ce devis ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Refuser',
        style: 'destructive',
        onPress: async () => {
          const { error: updateError } = await supabase.from('service_request').update({ statut: 'cancelled' }).eq('id', parseInt(id));
          if (updateError) Alert.alert('Erreur', `Impossible de refuser le devis: ${updateError.message}`);
          else {
            setRequest(prev => (prev ? { ...prev, status: 'cancelled' } : prev));
            Alert.alert('Succès', 'Devis refusé.');
          }
        },
      },
    ]);
  };


  const handlePayInvoice = () => setShowPaymentModal(true);


  const handleProcessPayment = async () => {
    if (!request || !id) return;
    Alert.alert('Virement enregistré', 'Votre virement a été enregistré. Le statut de la demande a été mis à jour.', [
      {
        text: 'OK',
        onPress: async () => {
          const { error: updateError } = await supabase.from('service_request').update({ statut: 'paid' }).eq('id', parseInt(id));
          if (updateError) Alert.alert('Erreur', `Impossible de marquer comme payé: ${updateError.message}`);
          else {
            setRequest(prev => (prev ? { ...prev, status: 'paid' } : prev));
            setShowPaymentModal(false);
          }
        },
      },
    ]);
  };


  const handleTakeCharge = async () => {
    if (!request || !id || !user?.id) return;
    Alert.alert('Prendre en charge', 'Voulez-vous prendre en charge cette demande ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          const payload = user?.role === 'nautical_company' ? { statut: 'accepted' } : { statut: 'in_progress' };
          const { error: updateError } = await supabase.from('service_request').update(payload).eq('id', parseInt(id));
          if (updateError) Alert.alert('Erreur', `Impossible de prendre en charge: ${updateError.message}`);
          else {
            setRequest(prev =>
              prev ? { ...prev, status: user?.role === 'nautical_company' ? 'accepted' : 'in_progress' } : prev,
            );
            Alert.alert('Succès', 'Demande prise en charge.');
          }
        },
      },
    ]);
  };


  const handleForwardToCompany = async () => {
    if (!request || typeof request.boat.id_port !== 'number' || typeof request.service_category_id !== 'number') {
      Alert.alert('Erreur', 'Infos manquantes pour filtrer les entreprises (port ou service).');
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
        .eq('user_ports.port_id', boatPortId)
        .eq('user_categorie_service.categorie_service_id', serviceCategoryId);


      if (companiesError) {
        console.error('Error fetching nautical companies:', companiesError);
        Alert.alert('Erreur', `Impossible de charger les entreprises: ${companiesError.message}`);
        setNauticalCompaniesForSelection([]);
      } else {
        const formattedCompanies: NauticalCompany[] = companiesData.map((company: any) => ({
          id: company.id.toString(),
          name: company.company_name,
          logo:
            company.avatar ||
            'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop',
          location: company.user_ports[0]?.ports?.name || 'N/A',
          contactEmail: company.e_mail,
          contactPhone: company.phone,
          categories: company.user_categorie_service.map((ucs: any) => ({
            id: ucs.categorie_service_id,
            description1: ucs.categorie_service.description1,
          })),
          ports: company.user_ports?.map((p: any) => ({ id: p.port_id, name: p.ports?.name })) ?? [],
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


    Alert.alert('Confirmer la transmission', `Voulez-vous transmettre cette demande à ${company.name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          const { error: updateError } = await supabase
            .from('service_request')
            .update({ statut: 'forwarded', id_companie: company.id })
            .eq('id', parseInt(id));


          if (updateError) {
            Alert.alert('Erreur', `Impossible de transmettre la demande: ${updateError.message}`);
          } else {
            setRequest(prev =>
              prev ? { ...prev, status: 'forwarded', company: { id: company.id, name: company.name, profile: 'nautical_company' } } : prev,
            );
            Alert.alert('Succès', `Demande transmise à ${company.name}.`);
            setShowCompanySelectionModal(false);
          }
        },
      },
    ]);
  };


  const handleCreateQuote = () => {
    if (!request) return;
    router.push({
      pathname: '/quote/select-method',
      params: {
        requestId: request.id,
        clientId: request.client.id,
        clientName: request.client.name,
        clientEmail: request.client.email,
        boatId: request.boat.id,
        boatName: request.boat.name,
        boatType: request.boat.type,
      },
    });
  };


  const handleMarkAsCompleted = async () => {
    if (!request || !id) return;
    Alert.alert('Marquer comme terminée', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          const { error: updateError } = await supabase.from('service_request').update({ statut: 'completed' }).eq('id', parseInt(id));
          if (updateError) Alert.alert('Erreur', `Impossible: ${updateError.message}`);
          else {
            setRequest(prev => (prev ? { ...prev, status: 'completed' } : prev));
            Alert.alert('Succès', 'Demande marquée comme terminée.');
          }
        },
      },
    ]);
  };


  const handleReadyForBilling = async () => {
    if (!request || !id) return;
    Alert.alert('Bon à facturer', 'Marquer cette demande comme prête à être facturée ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          const { error: updateError } = await supabase.from('service_request').update({ statut: 'ready_to_bill' }).eq('id', parseInt(id));
          if (updateError) Alert.alert('Erreur', `Impossible: ${updateError.message}`);
          else {
            setRequest(prev => (prev ? { ...prev, status: 'ready_to_bill' } : prev));
            Alert.alert('Succès', 'Demande marquée comme bon à facturer.');
          }
        },
      },
    ]);
  };


  const handleGenerateInvoice = async () => {
    if (!request || !id) return;
    const invoiceReference = `FAC-${request.id}`;
    const invoiceDate = new Date().toISOString().split('T')[0];
    const paymentDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const depositAmount = Math.round((request.price || 0) * 0.3);


    const { error: updateError } = await supabase
      .from('service_request')
      .update({
        statut: 'to_pay',
        note_add: `Facture ${invoiceReference} • ${invoiceDate} | Acompte: ${depositAmount} | Date d'échéance: ${paymentDueDate}`,
      })
      .eq('id', parseInt(id));


    if (updateError) {
      Alert.alert('Erreur', `Impossible de générer la facture: ${updateError.message}`);
    } else {
      setRequest(prev =>
        prev
          ? {
              ...prev,
              status: 'to_pay',
              invoice_reference: invoiceReference,
              invoice_date: invoiceDate,
              deposit_amount: depositAmount,
              payment_due_date: paymentDueDate,
            }
          : prev,
      );
      Alert.alert('Succès', 'Facture générée et envoyée au client.');
    }
  };


  const handleMarkAsPaid = async () => {
    if (!request || !id) return;
    Alert.alert('Marquer comme payé', 'Êtes-vous sûr ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          const { error: updateError } = await supabase.from('service_request').update({ statut: 'paid' }).eq('id', parseInt(id));
          if (updateError) Alert.alert('Erreur', `Impossible: ${updateError.message}`);
          else {
            setRequest(prev => (prev ? { ...prev, status: 'paid' } : prev));
            Alert.alert('Succès', 'Facture marquée comme payée.');
          }
        },
      },
    ]);
  };


  const handleDeleteRequest = async () => {
    if (!request || !id) return;
    Alert.alert('Supprimer la demande', 'Action irréversible. Confirmez ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const { error: deleteError } = await supabase.from('service_request').delete().eq('id', parseInt(id));
          if (deleteError) Alert.alert('Erreur', `Impossible: ${deleteError.message}`);
          else {
            Alert.alert('Succès', 'Demande supprimée.');
            router.back();
          }
        },
      },
    ]);
  };


  const handleArchiveRequest = async () => {
    if (!request || !id) return;
    Alert.alert('Archiver la demande', 'Êtes-vous sûr de vouloir archiver ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          Alert.alert('Succès', 'Demande archivée.');
          router.back();
        },
      },
    ]);
  };


  const handleMessageClient = () => {
    if (!request) return;
    router.push(`/(tabs)/messages?client=${request.client.id}`);
  };


  const handleScheduleIntervention = () => {
    if (!request) {
      Alert.alert('Erreur', 'Aucune demande sélectionnée pour la planification.');
      return;
    }
    let pathname = '';
    if (user?.role === 'boat_manager') pathname = '/(boat-manager)/planning';
    else if (user?.role === 'nautical_company') pathname = '/(nautical-company)/planning';
    else {
      Alert.alert('Accès refusé', "Vous n'avez pas les permissions pour planifier.");
      return;
    }
    router.push({
      pathname,
      params: {
        requestId: request.id,
        clientId: request.client.id,
        clientName: request.client.name,
        clientEmail: request.client.email,
        boatId: request.boat.id,
        boatName: request.boat.name,
        boatType: request.boat.type,
        appointmentDescription: request.description,
        appointmentDate: request.date,
      },
    });
  };


  // --- Modals ---
  const PaymentModal = () => (
    <Modal visible={showPaymentModal} transparent animationType="slide" onRequestClose={() => setShowPaymentModal(false)}>
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
              <Text style={styles.paymentMethodTitle}>Informations de virement</Text>
              {request?.company?.iban && request?.company?.bic ? (
                <>
                  <View style={styles.paymentMethod}>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodName}>IBAN :</Text>
                      <Text style={styles.paymentMethodDescription}>{request.company.iban}</Text>
                    </View>
                  </View>
                  <View style={styles.paymentMethod}>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodName}>BIC :</Text>
                      <Text style={styles.paymentMethodDescription}>{request.company.bic}</Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.paymentMethod}>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodName}>IBAN :</Text>
                      <Text style={styles.paymentMethodDescription}>{FIXED_BM_IBAN}</Text>
                    </View>
                  </View>
                  <View style={styles.paymentMethod}>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={styles.paymentMethodName}>BIC :</Text>
                      <Text style={styles.paymentMethodDescription}>{FIXED_BM_BIC}</Text>
                    </View>
                  </View>
                </>
              )}
              <Text style={styles.paymentMethodDescription}>
                Veuillez effectuer le virement vers le compte ci-dessus depuis votre application bancaire habituelle.
              </Text>
            </View>
          </View>


          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowPaymentModal(false)}>
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>


            <TouchableOpacity style={styles.modalConfirmButton} onPress={handleProcessPayment}>
              <Text style={styles.modalConfirmText}>Virement effectué</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );


  const InvoiceModal = () => (
    <Modal visible={showInvoiceModal} transparent animationType="slide" onRequestClose={() => setShowInvoiceModal(false)}>
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
              <Text style={styles.invoiceValue}>
                {formatAmount((request?.price || 0) - (request?.deposit_amount || 0))}
              </Text>
            </View>
            <View style={styles.invoiceDetail}>
              <Text style={styles.invoiceLabel}>Date d'échéance :</Text>
              <Text style={styles.invoiceValue}>{formatDate(request?.payment_due_date || '')}</Text>
            </View>
          </View>


          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowInvoiceModal(false)}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>


            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={async () => {
                setShowInvoiceModal(false);
                try {
                  await generateQuotePDF({
                    reference: request?.invoice_reference || `FAC-${request?.id}`,
                    date: request?.invoice_date || new Date().toISOString().split('T')[0],
                    validUntil: request?.payment_due_date || new Date().toISOString().split('T')[0],
                    provider: {
                      name: request?.company?.name || request?.boatManager?.name || 'Prestataire inconnu',
                      type: request?.company ? 'nautical_company' : request?.boatManager ? 'boat_manager' : 'boat_manager',
                    },
                    client: request?.client || { id: '', name: 'Client inconnu', email: '' },
                    boat: request?.boat || { id: '', name: 'Bateau inconnu', type: '' },
                    services: [
                      { name: request?.type || 'Service', description: request?.description || '', amount: request?.price || 0 },
                    ],
                    totalAmount: request?.price || 0,
                    isInvoice: true,
                    depositAmount: request?.deposit_amount,
                    paymentDueDate: request?.payment_due_date,
                  });
                  Alert.alert('Succès', 'Facture générée et téléchargée.');
                } catch {
                  Alert.alert('Erreur', 'Une erreur est survenue lors de la génération de la facture.');
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
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCompanySelectionModal(false)}>
              <X size={ms(22, width)} color="#666" />
            </TouchableOpacity>
          </View>


          <View style={styles.searchContainer}>
            <Search size={ms(18, width)} color="#666" />
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
                .map(company => (
                  <TouchableOpacity key={company.id} style={styles.modalItem} onPress={() => handleSelectNauticalCompany(company)}>
                    <View style={styles.modalItemContent}>
                      <Building size={ms(18, width)} color="#0066CC" />
                      <View>
                        <Text style={styles.modalItemText}>{company.name}</Text>
                        <Text style={styles.modalItemSubtext}>{company.location}</Text>
                      </View>
                    </View>
                    <ChevronRight size={ms(18, width)} color="#666" />
                  </TouchableOpacity>
                ))
            ) : (
              <View style={styles.emptyModalState}>
                <Text style={styles.emptyModalText}>Aucune entreprise trouvée pour ce port et ce service.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );


  // --- Rendu ---
  if (loading || !request || !currentStatusConfig || !StatusIcon) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>{loading ? 'Chargement des détails de la demande...' : error || 'Demande non trouvée.'}</Text>
      </View>
    );
  }


  // pour l’helper d’actions, traite 'accepted' comme 'in_progress' pour tout le monde
  const actionsStatus: RequestStatus = (rawStatus === 'accepted' ? 'in_progress' : displayStatus) as RequestStatus;
  const availableActions = getAvailableActions(user?.role, actionsStatus, request);


  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Revenir en arrière"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ArrowLeft size={ms(22, width)} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Détails de la demande</Text>
        </View>


        <View style={styles.content}>
          {/* En-tête */}
          <View style={styles.requestHeaderCard}>
            <View style={styles.requestInfo}>
              <Text style={styles.requestTitle}>{request.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${currentStatusConfig.color}15` }]}>
                <StatusIcon size={ms(14, width)} color={currentStatusConfig.color} />
                <Text style={[styles.statusText, { color: currentStatusConfig.color }]}>{currentStatusConfig.label}</Text>
              </View>
            </View>
            {typeof request.price === 'number' && <Text style={styles.requestPrice}>{formatAmount(request.price)}</Text>}
          </View>


          {/* Infos générales */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations générales</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <FileText size={ms(14, width)} color="#666" />
                <Text style={styles.cardText}>Type: {request.type}</Text>
              </View>
              <View style={styles.cardRow}>
                <Calendar size={ms(14, width)} color="#666" />
                <Text style={styles.cardText}>Date: {formatDate(request.date)}</Text>
              </View>
              <View style={styles.cardRow}>
                <AlertCircle size={ms(14, width)} color="#666" />
                <Text style={styles.cardText}>Urgence: {request.urgency === 'urgent' ? 'Urgent' : 'Normal'}</Text>
              </View>
              <View style={styles.cardRow}>
                <MessageSquare size={ms(14, width)} color="#666" />
                <Text style={styles.cardText}>Description: {request.description}</Text>
              </View>
              {!!request.boat.place_de_port && (
                <View style={styles.cardRow}>
                  <MapPin size={ms(14, width)} color="#666" />
                  <Text style={styles.cardText}>Lieu: {request.boat.place_de_port}</Text>
                </View>
              )}
            </View>
          </View>


          {/* Client */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <User size={ms(14, width)} color="#666" />
                <Text style={styles.cardText}>{request.client.name}</Text>
              </View>
              <View style={styles.cardRow}>
                <Mail size={ms(14, width)} color="#666" />
                <Text style={styles.cardText}>{request.client.email}</Text>
              </View>
              <View style={styles.cardRow}>
                <Phone size={ms(14, width)} color="#666" />
                <Text style={styles.cardText}>{request.client.phone}</Text>
              </View>
            </View>
          </View>


          {/* Bateau */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bateau</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Boat size={ms(14, width)} color="#666" />
                <Text style={styles.cardText}>{request.boat.name}</Text>
              </View>
              <View style={styles.cardRow}>
                <Ship size={ms(14, width)} color="#666" />
                <Text style={styles.cardText}>{request.boat.type}</Text>
              </View>
            </View>
          </View>


          {/* Acteurs */}
          {(request.boatManager || request.company) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acteurs impliqués</Text>
              <View style={styles.card}>
                {request.boatManager && (
                  <View style={styles.cardRow}>
                    <User size={ms(14, width)} color="#0066CC" />
                    <Text style={styles.cardText}>Boat Manager: {request.boatManager.name}</Text>
                  </View>
                )}
                {request.company && (
                  <View style={styles.cardRow}>
                    <Building size={ms(14, width)} color="#8B5CF6" />
                    <Text style={styles.cardText}>Entreprise: {request.company.name}</Text>
                  </View>
                )}
              </View>
            </View>
          )}


          {/* Documents */}
          {(request.quote_file_url || request.invoice_reference) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Documents liés</Text>
              <View style={styles.card}>
                {request.quote_file_url && (
                  <View style={styles.cardRow}>
                    <FileText size={ms(14, width)} color="#666" />
                    <Text style={styles.cardText}>Devis PDF disponible</Text>
                  </View>
                )}
                {request.invoice_reference && (
                  <>
                    <View style={styles.cardRow}>
                      <FileText size={ms(14, width)} color="#666" />
                      <Text style={styles.cardText}>Facture: {request.invoice_reference}</Text>
                    </View>
                    <View style={styles.cardRow}>
                      <Calendar size={ms(14, width)} color="#666" />
                      <Text style={styles.cardText}>Date facture: {formatDate(request.invoice_date || '')}</Text>
                    </View>
                    {typeof request.deposit_amount === 'number' && (
                      <View style={styles.cardRow}>
                        <Euro size={ms(14, width)} color="#666" />
                        <Text style={styles.cardText}>Acompte: {formatAmount(request.deposit_amount)}</Text>
                      </View>
                    )}
                    {request.payment_due_date && (
                      <View style={styles.cardRow}>
                        <Clock size={ms(14, width)} color="#666" />
                        <Text style={styles.cardText}>Échéance: {formatDate(request.payment_due_date)}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          )}


          {/* Actions */}
          <View style={styles.actionsContainer}>
            {availableActions.includes('download_quote') && (
              <ActionBtn onPress={handleDownloadQuote} text="Télécharger Devis" icon={<Download size={ms(18, width)} color="#0066CC" />} />
            )}
            {availableActions.includes('view_invoice') && (
              <ActionBtn onPress={handleViewInvoice} text="Voir Facture" icon={<FileText size={ms(18, width)} color="#0066CC" />} />
            )}
            {availableActions.includes('accept_quote') && (
              <ActionBtn
                onPress={handleAcceptQuote}
                text="Accepter Devis"
                variant="positive"
                icon={<CheckCircle2 size={ms(18, width)} color="white" />}
              />
            )}
            {availableActions.includes('reject_quote') && (
              <ActionBtn
                onPress={handleRejectQuote}
                text="Refuser Devis"
                variant="dangerOutline"
                icon={<XCircle size={ms(18, width)} color="#EF4444" />}
              />
            )}
            {availableActions.includes('pay_invoice') && (
              <ActionBtn onPress={handlePayInvoice} text="Payer Facture" variant="positive" icon={<Euro size={ms(18, width)} color="white" />} />
            )}
            {availableActions.includes('take_charge') && (
              <ActionBtn
                onPress={handleTakeCharge}
                text="Prendre en charge"
                variant="primary"
                icon={<CheckCircle2 size={ms(18, width)} color="white" />}
              />
            )}
            {availableActions.includes('forward_to_company') && (
              <ActionBtn
                onPress={handleForwardToCompany}
                text="Transmettre à Entreprise"
                icon={<Building size={ms(18, width)} color="#0066CC" />}
              />
            )}
            {availableActions.includes('create_quote') && (
              <ActionBtn
                onPress={handleCreateQuote}
                text="Créer/modifier Devis"
                variant="primary"
                icon={<FileText size={ms(18, width)} color="white" />}
              />
            )}
            {availableActions.includes('mark_as_completed') && (
              <ActionBtn
                onPress={handleMarkAsCompleted}
                text="Marquer comme terminée"
                variant="primary"
                icon={<CheckCircle2 size={ms(18, width)} color="white" />}
              />
            )}
            {availableActions.includes('ready_for_billing') && (
              <ActionBtn
                onPress={handleReadyForBilling}
                text="Bon à facturer"
                variant="primary"
                icon={<Upload size={ms(18, width)} color="white" />}
              />
            )}
            {availableActions.includes('generate_invoice') && (
              <ActionBtn
                onPress={handleGenerateInvoice}
                text="Générer Facture"
                variant="primary"
                icon={<Euro size={ms(18, width)} color="white" />}
              />
            )}
            {availableActions.includes('mark_as_paid') && (
              <ActionBtn
                onPress={handleMarkAsPaid}
                text="Marquer comme payé"
                variant="primary"
                icon={<CheckCircle2 size={ms(18, width)} color="white" />}
              />
            )}
            {availableActions.includes('delete_request') && (
              <ActionBtn
                onPress={handleDeleteRequest}
                text="Supprimer Demande"
                variant="dangerOutline"
                icon={<XCircle size={ms(18, width)} color="#EF4444" />}
              />
            )}
            {availableActions.includes('archive_request') && (
              <ActionBtn onPress={handleArchiveRequest} text="Archiver Demande" icon={<FileText size={ms(18, width)} color="#0066CC" />} />
            )}
            {availableActions.includes('message_client') && (
              <ActionBtn onPress={handleMessageClient} text="Message Client" icon={<MessageSquare size={ms(18, width)} color="#0066CC" />} />
            )}
            {availableActions.includes('schedule_intervention') && (
              <ActionBtn
                onPress={handleScheduleIntervention}
                text="Planifier Intervention"
                variant="primary"
                icon={<Calendar size={ms(18, width)} color="white" />}
              />
            )}
          </View>
        </View>
      </ScrollView>


      <PaymentModal />
      <InvoiceModal />
      <NauticalCompanySelectionModal />
    </>
  );
}


// --- Bouton d’action réutilisable ---
function ActionBtn({
  onPress,
  text,
  icon,
  variant = 'secondary',
}: {
  onPress: () => void;
  text: string;
  icon: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'positive' | 'dangerOutline';
}) {
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(width, 0), [width]);


  const base = [styles.actionButton];
  if (variant === 'primary') base.push(styles.primaryButton);
  else if (variant === 'positive') base.push(styles.acceptButton);
  else if (variant === 'dangerOutline') base.push(styles.rejectButton);


  const textStyle = [
    styles.actionButtonText,
    (variant === 'primary' || variant === 'positive') && { color: 'white' },
    variant === 'dangerOutline' && { color: '#EF4444' },
  ];


  return (
    <TouchableOpacity style={base} onPress={onPress} accessibilityRole="button">
      {icon}
      <Text style={textStyle}>{text}</Text>
    </TouchableOpacity>
  );
}


// --- Styles responsive ---
function makeStyles(width: number, safeTop: number) {
  const p2 = ms(8, width);
  const p3 = ms(12, width);
  const p4 = ms(16, width);
  const p5 = ms(20, width);
  const radius = ms(12, width);


  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    scrollContent: { paddingBottom: p5 },
    centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Math.max(safeTop, p3),
      paddingHorizontal: p4,
      paddingBottom: p3,
      backgroundColor: 'white',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#f0f0f0',
      minHeight: 56,
    },
    backButton: {
      padding: p2,
      marginRight: p3,
      borderRadius: ms(10, width),
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: { fontSize: ms(20, width), fontWeight: 'bold', color: '#1a1a1a' },


    content: { padding: p4 },


    requestHeaderCard: {
      backgroundColor: 'white',
      borderRadius: radius,
      padding: p4,
      marginBottom: p4,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
        android: { elevation: 2 },
        web: { /* @ts-ignore */ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
      }),
    },
    requestInfo: { rowGap: p2, marginBottom: p2 },
    requestTitle: { fontSize: ms(18, width), fontWeight: '600', color: '#1a1a1a' },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 16,
      columnGap: 4,
      alignSelf: 'flex-start',
    },
    statusText: { fontSize: ms(12, width), fontWeight: '500' },
    requestPrice: { fontSize: ms(22, width), fontWeight: 'bold', color: '#0066CC', textAlign: 'right' },


    section: { marginBottom: p4 },
    sectionTitle: { fontSize: ms(15.5, width), fontWeight: '600', color: '#1a1a1a', marginBottom: ms(10, width) },


    card: {
      backgroundColor: 'white',
      borderRadius: radius,
      padding: p4,
      rowGap: p3,
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
        android: { elevation: 2 },
        web: { /* @ts-ignore */ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
      }),
    },
    cardRow: { flexDirection: 'row', alignItems: 'center', columnGap: p2 },
    cardText: { fontSize: ms(14, width), color: '#1a1a1a' },


    actionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: p3,
      marginTop: ms(6, width),
      justifyContent: 'center',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      columnGap: p2,
      padding: p3,
      borderRadius: radius,
      backgroundColor: '#f0f7ff',
      minWidth: '48%',
      ...Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
        android: { elevation: 2 },
        web: { /* @ts-ignore */ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
      }),
    },
    actionButtonText: { fontSize: ms(14, width), fontWeight: '600', color: '#0066CC' },
    primaryButton: { backgroundColor: '#0066CC' },
    acceptButton: { backgroundColor: '#10B981' },
    rejectButton: { backgroundColor: '#fff5f5' },


    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: p4 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: p3 },
    closeButton: { padding: p2 },
    modalTitle: { fontSize: ms(18, width), fontWeight: 'bold', color: '#1a1a1a', marginBottom: p3 },
    modalBody: { rowGap: p3, marginBottom: p4 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', columnGap: p3 },
    modalCancelButton: { flex: 1, backgroundColor: '#f1f5f9', padding: p4 - 4, borderRadius: radius, alignItems: 'center' },
    modalCancelText: { fontSize: ms(15, width), color: '#666', fontWeight: '500' },
    modalConfirmButton: {
      flex: 1,
      backgroundColor: '#0066CC',
      padding: p4 - 4,
      borderRadius: radius,
      alignItems: 'center',
      ...Platform.select({
        ios: { shadowColor: '#0066CC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
        android: { elevation: 4 },
        web: { /* @ts-ignore */ boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)' },
      }),
    },
    modalConfirmText: { fontSize: ms(15, width), color: 'white', fontWeight: '600' },


    invoiceDetail: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#f0f0f0',
      paddingVertical: p2,
    },
    invoiceLabel: { fontSize: ms(13, width), color: '#666' },
    invoiceValue: { fontSize: ms(13, width), fontWeight: '500', color: '#1a1a1a' },


    paymentMethodContainer: { backgroundColor: '#f8fafc', borderRadius: radius, padding: p4, rowGap: p3, marginTop: p2 },
    paymentMethodTitle: { fontSize: ms(15, width), fontWeight: '600', color: '#1a1a1a', marginBottom: p2 },
    paymentMethod: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: p2,
      backgroundColor: 'white',
      padding: p3,
      borderRadius: ms(10, width),
      borderWidth: 1,
      borderColor: '#0066CC',
    },
    paymentMethodInfo: { flex: 1 },
    paymentMethodName: { fontSize: ms(13.5, width), fontWeight: '500', color: '#1a1a1a' },
    paymentMethodDescription: { fontSize: ms(12.5, width), color: '#666' },


    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#f8fafc',
      marginBottom: p3,
      paddingHorizontal: p3,
      paddingVertical: p2,
      borderRadius: radius,
      columnGap: p2,
      borderWidth: 1,
      borderColor: '#e2e8f0',
    },
    searchInput: {
      flex: 1,
      fontSize: ms(15, width),
      color: '#1a1a1a',
      ...Platform.select({ web: { outlineStyle: 'none' } }),
    },
    modalList: { maxHeight: ms(320, width) },
    modalItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: p3,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#f0f0f0',
      columnGap: p3,
    },
    modalItemContent: { flexDirection: 'row', alignItems: 'center', columnGap: p2 },
    modalItemText: { fontSize: ms(15, width), color: '#1a1a1a' },
    modalItemSubtext: { fontSize: ms(13, width), color: '#666' },
    emptyModalState: { padding: p5 * 2, alignItems: 'center' },
    emptyModalText: { fontSize: ms(15, width), color: '#666', textAlign: 'center' },
  });
}





