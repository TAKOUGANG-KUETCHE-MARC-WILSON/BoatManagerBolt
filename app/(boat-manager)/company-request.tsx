// app/(boat-manager)/company-request.tsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Building,
  MapPin,
  FileText,
  TriangleAlert as AlertTriangle,
  Bot as Boat,
  User,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

// ================================
// Helpers & constants
// ================================
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';
const safeLower = (v?: string | null) => (v || '').toLowerCase();
const todayStr = () => new Date().toISOString().split('T')[0];

// (optionnel si un jour tu affiches les avatars)
const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));
const getSignedAvatarUrl = async (value?: string) => {
  try {
    if (!value) return DEFAULT_AVATAR;
    if (isHttpUrl(value)) return value;
    const { data } = await supabase.storage.from('avatars').createSignedUrl(value, 60 * 60);
    return data?.signedUrl || DEFAULT_AVATAR;
  } catch {
    return DEFAULT_AVATAR;
  }
};

// ================================
// Types
// ================================
interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  boats: Array<{
    id: string;
    name: string;
    type: string;
    place_de_port?: string;
  }>;
}

interface NauticalCompany {
  id: string;
  name: string;
  logo: string;
  location: string; // port commun (compact)
  rating?: number;
  categories: Array<{ id: number; description1: string }>;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  hasNewRequests?: boolean;
  ports: Array<{ id: number; name: string }>;
}

interface Service {
  id: string;
  name: string;
  description: string;
  amount: number;
}

interface RequestForm {
  title: string;
  clientId: string;
  clientName: string;
  boatId: string;
  boatName: string;
  boatType: string;
  companyId?: string;
  companyName?: string;
  validUntil: string;
  services: Service[];
  location?: string;
  notes?: string;
  urgency: 'normal' | 'urgent';
  type: string; // description1
  description: string;
  category: string;
  date: string;
  forClient: boolean;
}

// ================================
// Component
// ================================
export default function CompanyRequestScreen() {
  const { company: initialCompanyId, clientId: initialClientId, boatId: initialBoatId } =
    useLocalSearchParams<{ company?: string; clientId?: string; boatId?: string }>();
  const { user } = useAuth();
  const userId = user?.id ? String(user.id) : undefined;

  // default validUntil = +30 j
  const defaultValidUntil = new Date();
  defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
  const defaultValidUntilStr = defaultValidUntil.toISOString().split('T')[0];

  const initialFormState: RequestForm = {
    title: '',
    clientId: initialClientId || '',
    clientName: '',
    boatId: initialBoatId || '',
    boatName: '',
    boatType: '',
    companyId: initialCompanyId || '',
    companyName: '',
    validUntil: defaultValidUntilStr,
    services: [{ id: '1', name: '', description: '', amount: 0 }],
    urgency: 'normal',
    type: '',
    description: '',
    category: 'Services',
    date: todayStr(),
    forClient: true,
  };

  const [form, setForm] = useState<RequestForm>(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  const [errors, setErrors] = useState<Partial<Record<keyof RequestForm | 'services', string>>>({});

  // modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);

  // search
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  // data
  const [fetchedServiceTypes, setFetchedServiceTypes] = useState<string[]>([]);
  const [allNauticalCompanies, setAllNauticalCompanies] = useState<NauticalCompany[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [selectedClientForBoat, setSelectedClientForBoat] = useState<Client | null>(null);

  // pour maj place_de_port uniquement si changé
  const [initialBoatPlaceDePort, setInitialBoatPlaceDePort] = useState<string | undefined>(undefined);

  // ================================
  // Fetchers
  // ================================
  const fetchAllClients = useCallback(async () => {
    if (!userId || user?.role !== 'boat_manager') return;

    try {
      // ports du BM
      const { data: bmPorts, error: bmPortsError } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', userId);
      if (bmPortsError) throw bmPortsError;

      const managedPortIds = (bmPorts || []).map((p) => p.port_id);
      if (!managedPortIds.length) {
        setAllClients([]);
        return;
      }

      // ids des clients sur ces ports
      const { data: clientPortAssignments, error: clientPortError } = await supabase
        .from('user_ports')
        .select('user_id')
        .in('port_id', managedPortIds);
      if (clientPortError) throw clientPortError;

      const uniqueClientIds = Array.from(new Set((clientPortAssignments || []).map((c) => c.user_id)));
      if (!uniqueClientIds.length) {
        setAllClients([]);
        return;
      }

      // profils clients + bateaux
      const { data: clientsData, error: clientsError } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar, e_mail, phone, boat(id, name, type, place_de_port)')
        .in('id', uniqueClientIds)
        .eq('profile', 'pleasure_boater');
      if (clientsError) throw clientsError;

      const normalized: Client[] = await Promise.all(
        (clientsData || []).map(async (c: any) => ({
          id: String(c.id),
          name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
          avatar: await getSignedAvatarUrl(c.avatar),
          email: c.e_mail || '',
          phone: c.phone || '',
          boats: c.boat || [],
        }))
      );

      setAllClients(normalized);
    } catch (e) {
      // on masque côté UI, on log minimalement
      console.warn('clients fetch error');
      setAllClients([]);
    }
  }, [userId, user?.role]);

  const fetchServiceTypes = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('categorie_service').select('description1');
      if (error) throw error;
      setFetchedServiceTypes((data || []).map((d) => d.description1).filter(Boolean));
    } catch {
      console.warn('service types fetch error');
      setFetchedServiceTypes([]);
    }
  }, []);

  const fetchNauticalCompaniesForType = useCallback(
    async (selectedType: string) => {
      if (!userId || !selectedType) {
        setAllNauticalCompanies([]);
        return;
      }
      try {
        // ports du BM
        const { data: bmPorts, error: bmPortsError } = await supabase
          .from('user_ports')
          .select('port_id')
          .eq('user_id', userId);
        if (bmPortsError) throw bmPortsError;

        const managedPortIds = (bmPorts || []).map((p) => p.port_id);
        if (!managedPortIds.length) {
          setAllNauticalCompanies([]);
          return;
        }

        // id de la catégorie sélectionnée
        const { data: serviceCategory, error: catErr } = await supabase
          .from('categorie_service')
          .select('id')
          .eq('description1', selectedType)
          .single();
        if (catErr || !serviceCategory) {
          setAllNauticalCompanies([]);
          return;
        }
        const serviceId = serviceCategory.id;

        // entreprises + catégories + ports
        const { data: companyUsers, error: companyUsersError } = await supabase
          .from('users')
          .select(
            `
            id, company_name, avatar, address, e_mail, phone,
            user_categorie_service(categorie_service_id, categorie_service(description1)),
            user_ports(port_id, ports(name))
          `
          )
          .eq('profile', 'nautical_company');
        if (companyUsersError) throw companyUsersError;

        const companies: NauticalCompany[] = [];
        for (const company of companyUsers || []) {
          const portIds = (company.user_ports || []).map((up: any) => up.port_id);
          const hasCommonPort = portIds.some((pid: number) => managedPortIds.includes(pid));

          const serviceIds = (company.user_categorie_service || []).map(
            (ucs: any) => ucs.categorie_service_id
          );
          const offersSelectedService = serviceIds.includes(serviceId);

          if (!hasCommonPort || !offersSelectedService) continue;

          const firstCommon = (company.user_ports || []).find((up: any) =>
            managedPortIds.includes(up.port_id)
          );
          const portName = firstCommon?.ports?.name || '';

          companies.push({
            id: String(company.id),
            name: company.company_name,
            logo: await getSignedAvatarUrl(company.avatar),
            location: portName,
            contactEmail: company.e_mail || '',
            contactPhone: company.phone || '',
            categories:
              (company.user_categorie_service || []).map((ucs: any) => ({
                id: ucs.categorie_service_id,
                description1: ucs.categorie_service?.description1 || '',
              })) ?? [],
            ports:
              (company.user_ports || []).map((up: any) => ({
                id: up.port_id,
                name: up.ports?.name || '',
              })) ?? [],
          });
        }

        setAllNauticalCompanies(companies);
      } catch {
        console.warn('companies fetch error');
        setAllNauticalCompanies([]);
      }
    },
    [userId]
  );

  // ================================
  // Initial load
  // ================================
  useEffect(() => {
    fetchAllClients();
    fetchServiceTypes();

    // par défaut : le BM lui-même si aucune entreprise fournie
    if (user && !initialCompanyId) {
      setForm((prev) => ({
        ...prev,
        companyId: String(user.id),
        companyName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Pré-remplissage client/bateau selon les params initiaux
  useEffect(() => {
    if (!allClients.length) return;

    if (initialClientId) {
      const client = allClients.find((c) => c.id === String(initialClientId));
      if (client) {
        setForm((prev) => ({ ...prev, clientId: client.id, clientName: client.name }));
        setSelectedClientForBoat(client);
      }
    }

    if (initialBoatId) {
      const client = allClients.find((c) => c.boats.some((b) => b.id === String(initialBoatId)));
      const boat = client?.boats.find((b) => b.id === String(initialBoatId));
      if (client && boat) {
        setForm((prev) => ({
          ...prev,
          clientId: client.id,
          clientName: client.name,
          boatId: boat.id,
          boatName: boat.name,
          boatType: boat.type,
          location: boat.place_de_port || '',
        }));
        setSelectedClientForBoat(client);
        setInitialBoatPlaceDePort(boat.place_de_port);
      }
    }
  }, [allClients, initialClientId, initialBoatId]);

  // Recharger les entreprises quand le type change
  useEffect(() => {
    fetchNauticalCompaniesForType(form.type);
  }, [form.type, fetchNauticalCompaniesForType]);

  // ================================
  // Filters
  // ================================
  const filteredClients = useMemo(() => {
    const q = safeLower(clientSearchQuery);
    if (!q) return allClients;
    return allClients.filter(
      (c) =>
        safeLower(c.name).includes(q) ||
        safeLower(c.email).includes(q) ||
        (c.boats || []).some((b) => safeLower(b.name).includes(q))
    );
  }, [allClients, clientSearchQuery]);

  const filteredCompanies = useMemo(() => {
    const q = safeLower(companySearchQuery);
    return allNauticalCompanies.filter((company) => {
      const matchesSearch =
        !q ||
        safeLower(company.name).includes(q) ||
        safeLower(company.location).includes(q);
      const matchesServiceType =
        !form.type ||
        (company.categories || []).some((cat) => cat.description1 === form.type);
      return matchesSearch && matchesServiceType;
    });
  }, [allNauticalCompanies, companySearchQuery, form.type]);

  // ================================
  // UI Handlers
  // ================================
  const handleSelectClient = (client: Client) => {
    setForm((prev) => ({
      ...prev,
      clientId: client.id,
      clientName: client.name,
      boatId: '',
      boatName: '',
      boatType: '',
      location: '',
    }));
    setSelectedClientForBoat(client);
    setShowClientModal(false);

    // auto-sélection si 1 seul bateau
    if (client.boats.length === 1) {
      const boat = client.boats[0];
      setForm((prev) => ({
        ...prev,
        boatId: boat.id,
        boatName: boat.name,
        boatType: boat.type,
        location: boat.place_de_port || '',
      }));
      setInitialBoatPlaceDePort(boat.place_de_port);
    } else {
      setShowBoatModal(true);
    }
  };

  const handleSelectBoat = (boat: Client['boats'][0]) => {
    setForm((prev) => ({
      ...prev,
      boatId: boat.id,
      boatName: boat.name,
      boatType: boat.type,
      location: boat.place_de_port || '',
    }));
    setInitialBoatPlaceDePort(boat.place_de_port);
    setShowBoatModal(false);
  };

  const handleSelectCompany = (company: NauticalCompany) => {
    setForm((prev) => ({ ...prev, companyId: company.id, companyName: company.name }));
    setShowCompanyModal(false);
  };

  const handleSelectServiceType = (type: string) => {
    setForm((prev) => ({ ...prev, type }));
    setShowServiceTypeModal(false);
    setCompanySearchQuery('');
    if (errors.type) setErrors((prev) => ({ ...prev, type: undefined }));
  };

  const toggleForClient = () => {
    setForm((prev) => ({ ...prev, forClient: !prev.forClient }));
  };

  // ================================
  // Validation & Submit
  // ================================
  const validateForm = () => {
    const newErrors: Partial<Record<keyof RequestForm | 'services', string>> = {};
    if (!form.clientId) newErrors.clientId = 'Le client est requis';
    if (!form.boatId && form.type !== 'Achat/Vente') newErrors.boatId = 'Le bateau est requis';
    if (!form.title.trim()) newErrors.title = 'Le titre est requis';
    if (!form.type.trim()) newErrors.type = 'Le type de service est requis';
    if (!form.description.trim()) newErrors.description = 'La description est requise';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // 1) MAJ place_de_port si changé
      if (form.boatId && form.location !== initialBoatPlaceDePort) {
        const { error: updateBoatError } = await supabase
          .from('boat')
          .update({ place_de_port: form.location || null })
          .eq('id', form.boatId);
        if (updateBoatError) {
          console.warn('boat update error');
          Alert.alert('Erreur', "Impossible de mettre à jour la place de port du bateau.");
          setSubmitting(false);
          return;
        }
      }

      // 2) id du service
      const { data: serviceCategory, error: serviceCategoryError } = await supabase
        .from('categorie_service')
        .select('id')
        .eq('description1', form.type)
        .single();

      if (serviceCategoryError || !serviceCategory) {
        console.warn('service category lookup error');
        Alert.alert('Erreur', "Type de service introuvable.");
        setSubmitting(false);
        return;
      }

      // 3) insert service_request
      const payload = {
        id_client: form.clientId,
        id_service: serviceCategory.id,
        description: form.description,
        id_boat: form.boatId ? Number(form.boatId) : null, // adapte si UUID côté DB
        id_companie: form.companyId || null,
        id_boat_manager: userId,
        duree_estimee: null,
        prix: null,
        statut: 'submitted',
        urgence: form.urgency,
        date: form.date,
        etat: 'pending',
        note_add: form.notes || null,
      };

      const { error } = await supabase.from('service_request').insert([payload]);

      if (error) {
        console.warn('service request insert error');
        Alert.alert('Erreur', "La demande n'a pas pu être créée. Réessayez.");
        setSubmitting(false);
        return;
      }

      const message = form.forClient
        ? `La demande a été créée au nom de ${form.clientName} et apparaîtra dans son suivi.`
        : `La demande a été créée et sera traitée par vous-même.`;

      const additional = form.companyId ? `\n\nLa demande a été transmise à ${form.companyName}.` : '';

      Alert.alert('Demande envoyée', message + additional, [
        {
          text: 'OK',
          onPress: () => {
            setForm(initialFormState);
            setErrors({});
            setSelectedClientForBoat(null);
            setSubmitting(false);
            router.back();
          },
        },
      ]);
    } catch {
      console.warn('submit error');
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
      setSubmitting(false);
    }
  };

  // ================================
  // Modals (inline components)
  // ================================
  const ClientSelectionModal = () => (
    <Modal
      visible={showClientModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowClientModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un client</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowClientModal(false)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalList}>
            {filteredClients.map((client) => (
              <TouchableOpacity
                key={client.id}
                style={styles.modalItem}
                onPress={() => handleSelectClient(client)}
              >
                <View style={styles.modalItemContent}>
                  <User size={20} color="#0066CC" />
                  <Text style={styles.modalItemText}>{client.name || ''}</Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const BoatSelectionModal = ({ client }: { client: Client | null }) => (
    <Modal
      visible={showBoatModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBoatModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un bateau</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowBoatModal(false)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {client && client.boats.length > 0 ? (
            <ScrollView style={styles.modalList}>
              {client.boats.map((boat) => (
                <TouchableOpacity
                  key={boat.id}
                  style={styles.modalItem}
                  onPress={() => handleSelectBoat(boat)}
                >
                  <View style={styles.modalItemContent}>
                    <Boat size={20} color="#0066CC" />
                    <View>
                      <Text style={styles.modalItemText}>{boat.name || ''}</Text>
                      <Text style={styles.modalItemSubtext}>{boat.type || ''}</Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyModalState}>
              <Text style={styles.emptyModalText}>
                {client
                  ? "Cet utilisateur n'a pas de bateau enregistré."
                  : "Veuillez d'abord sélectionner un client."}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const CompanySelectionModal = () => (
    <Modal
      visible={showCompanyModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCompanyModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner une entreprise</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCompanyModal(false)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une entreprise..."
              value={companySearchQuery}
              onChangeText={setCompanySearchQuery}
            />
          </View>

          <ScrollView style={styles.modalList}>
            {filteredCompanies.length > 0 ? (
              filteredCompanies.map((company) => (
                <TouchableOpacity
                  key={company.id}
                  style={styles.modalItem}
                  onPress={() => handleSelectCompany(company)}
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
                  {form.type
                    ? `Aucune entreprise ne propose "${form.type}" sur vos ports.`
                    : 'Aucune entreprise trouvée.'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const ServiceTypeModal = () => (
    <Modal
      visible={showServiceTypeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowServiceTypeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Type de service</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowServiceTypeModal(false)}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalList}>
            {fetchedServiceTypes.map((type) => (
              <TouchableOpacity key={type} style={styles.modalItem} onPress={() => handleSelectServiceType(type)}>
                <Text style={styles.modalItemText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ================================
  // Render
  // ================================
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Nouvelle Demande</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Infos client */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations client</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <User size={20} color="#0066CC" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Client</Text>
                  <TouchableOpacity onPress={() => setShowClientModal(true)}>
                    <Text style={form.clientName ? styles.infoValue : styles.infoPlaceholder}>
                      {form.clientName || 'Sélectionner un client'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {errors.clientId && <Text style={styles.errorText}>{errors.clientId}</Text>}

              <View style={styles.infoRow}>
                <Boat size={20} color="#0066CC" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Bateau</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (form.clientId) setShowBoatModal(true);
                      else Alert.alert('Info', "Veuillez d'abord sélectionner un client.");
                    }}
                  >
                    <Text style={form.boatName ? styles.infoValue : styles.infoPlaceholder}>
                      {form.boatName ? `${form.boatName} (${form.boatType})` : 'Sélectionner un bateau'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {errors.boatId && <Text style={styles.errorText}>{errors.boatId}</Text>}
            </View>
          </View>

          {/* Détails */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails de la demande</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Titre de la demande</Text>
              <View style={[styles.inputWrapper, errors.title && styles.inputWrapperError]}>
                <FileText size={20} color={errors.title ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  value={form.title}
                  onChangeText={(text) => {
                    setForm((prev) => ({ ...prev, title: text }));
                    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="Titre de la demande"
                />
              </View>
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Type de service</Text>
              <TouchableOpacity
                style={[styles.serviceTypeSelector, errors.type && styles.inputWrapperError]}
                onPress={() => setShowServiceTypeModal(true)}
              >
                <FileText size={20} color={errors.type ? '#ff4444' : '#666'} />
                <Text style={[styles.servicePlaceholder, form.type ? styles.serviceSelected : {}]}>
                  {form.type || 'Sélectionner un type de service'}
                </Text>
              </TouchableOpacity>
              {errors.type && <Text style={styles.errorText}>{errors.type}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <View style={[styles.textAreaWrapper, errors.description && styles.inputWrapperError]}>
                <TextInput
                  style={styles.textArea}
                  value={form.description}
                  onChangeText={(text) => {
                    setForm((prev) => ({ ...prev, description: text }));
                    if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Description détaillée de la demande"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Lieu (place de port)</Text>
              <View style={styles.inputWrapper}>
                <MapPin size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  value={form.location}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, location: text }))}
                  placeholder="Place de port"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Notes additionnelles</Text>
              <View style={styles.textAreaWrapper}>
                <TextInput
                  style={styles.textArea}
                  value={form.notes}
                  onChangeText={(text) => setForm((prev) => ({ ...prev, notes: text }))}
                  placeholder="Notes additionnelles (optionnel)"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.urgencySelector}>
              <Text style={styles.urgencySelectorTitle}>Niveau d'urgence</Text>
              <View style={styles.urgencyOptions}>
                <TouchableOpacity
                  style={[
                    styles.urgencyOption,
                    form.urgency === 'normal' && styles.urgencyOptionSelected,
                  ]}
                  onPress={() => setForm((prev) => ({ ...prev, urgency: 'normal' }))}
                >
                  <Text
                    style={[
                      styles.urgencyOptionText,
                      form.urgency === 'normal' && styles.urgencyOptionTextSelected,
                    ]}
                  >
                    Normal
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.urgencyOption,
                    form.urgency === 'urgent' && styles.urgencyOptionUrgentSelected,
                  ]}
                  onPress={() => setForm((prev) => ({ ...prev, urgency: 'urgent' }))}
                >
                  <AlertTriangle size={16} color={form.urgency === 'urgent' ? 'white' : '#DC2626'} />
                  <Text
                    style={[
                      styles.urgencyOptionText,
                      form.urgency === 'urgent' && styles.urgencyOptionUrgentTextSelected,
                    ]}
                  >
                    Urgent
                  </Text>
                </TouchableOpacity>
              </View>

              {form.urgency === 'urgent' && (
                <View style={styles.urgencyNote}>
                  <AlertTriangle size={16} color="#DC2626" />
                  <Text style={styles.urgencyNoteText}>
                    En sélectionnant "Urgent", la demande sera traitée en priorité.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Options de la demande</Text>

            <View style={styles.optionsCard}>
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Créer au nom du client</Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    form.forClient ? styles.toggleButtonActive : styles.toggleButtonInactive,
                  ]}
                  onPress={toggleForClient}
                >
                  <View
                    style={[
                      styles.toggleIndicator,
                      form.forClient ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive,
                    ]}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.optionDescription}>
                {form.forClient
                  ? "La demande apparaîtra dans le suivi du client comme s'il l'avait créée lui-même."
                  : "La demande sera traitée par vous-même et n'apparaîtra pas dans le suivi du client."}
              </Text>

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Transmettre à une entreprise</Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    form.companyId ? styles.toggleButtonActive : styles.toggleButtonInactive,
                  ]}
                  onPress={() => {
                    if (form.companyId) {
                      setForm((prev) => ({ ...prev, companyId: '', companyName: '' }));
                    } else {
                      setShowCompanyModal(true);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.toggleIndicator,
                      form.companyId ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {form.companyId && (
                <View style={styles.selectedCompanyContainer}>
                  <Building size={16} color="#0066CC" />
                  <Text style={styles.selectedCompanyText}>{form.companyName}</Text>
                  <TouchableOpacity
                    style={styles.changeCompanyButton}
                    onPress={() => setShowCompanyModal(true)}
                  >
                    <Text style={styles.changeCompanyText}>Changer</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Envoi en cours…' : 'Envoyer la demande'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      <ClientSelectionModal />
      <BoatSelectionModal client={selectedClientForBoat} />
      <CompanySelectionModal />
      <ServiceTypeModal />
    </View>
  );
}

// ================================
// Styles
// ================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: { padding: 8, marginRight: 16 },
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
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
    }),
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 14, color: '#666' },
  infoValue: { fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  infoPlaceholder: { fontSize: 16, color: '#94a3b8' },

  optionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
    }),
  },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionLabel: { fontSize: 16, fontWeight: '500', color: '#1a1a1a' },
  optionDescription: { fontSize: 14, color: '#666', marginTop: -8, marginBottom: 8 },

  toggleButton: { width: 50, height: 28, borderRadius: 14, padding: 2, justifyContent: 'center' },
  toggleButtonActive: { backgroundColor: '#0066CC' },
  toggleButtonInactive: { backgroundColor: '#e2e8f0' },
  toggleIndicator: { width: 24, height: 24, borderRadius: 12 },
  toggleIndicatorActive: { backgroundColor: 'white', alignSelf: 'flex-end' },
  toggleIndicatorInactive: { backgroundColor: 'white', alignSelf: 'flex-start' },

  selectedCompanyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectedCompanyText: { flex: 1, fontSize: 14, color: '#0066CC' },
  changeCompanyButton: { padding: 4 },
  changeCompanyText: { fontSize: 14, color: '#0066CC', textDecorationLine: 'underline' },

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
  inputWrapperError: { borderColor: '#ff4444', backgroundColor: '#fff5f5' },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  textAreaWrapper: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
  },
  textArea: { fontSize: 16, color: '#1a1a1a', minHeight: 120, textAlignVertical: 'top' },

  serviceTypeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 48,
  },
  servicePlaceholder: { flex: 1, marginLeft: 8, fontSize: 16, color: '#94a3b8' },
  serviceSelected: { color: '#1a1a1a' },

  urgencySelector: { marginBottom: 24 },
  urgencySelectorTitle: { fontSize: 16, fontWeight: '500', color: '#1a1a1a', marginBottom: 12 },
  urgencyOptions: { flexDirection: 'row', gap: 12 },
  urgencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  urgencyOptionSelected: { borderColor: '#0066CC', backgroundColor: '#f0f7ff' },
  urgencyOptionUrgentSelected: { borderColor: '#DC2626', backgroundColor: '#DC2626' },
  urgencyOptionText: { fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  urgencyOptionTextSelected: { color: 'white' },
  urgencyOptionUrgentTextSelected: { color: 'white' },
  urgencyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  urgencyNoteText: { flex: 1, fontSize: 14, color: '#DC2626', lineHeight: 20 },

  errorText: { color: '#ff4444', fontSize: 12, marginTop: 4, marginLeft: 4 },

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
  submitButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  closeButton: { padding: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({ web: { outlineStyle: 'none' } }),
  },
  modalList: { padding: 16 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)' },
    }),
  },
  modalItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalItemText: { fontSize: 16, color: '#1a1a1a' },
  modalItemSubtext: { fontSize: 14, color: '#666' },
  emptyModalState: { padding: 40, alignItems: 'center' },
  emptyModalText: { fontSize: 16, color: '#666', textAlign: 'center' },
});
