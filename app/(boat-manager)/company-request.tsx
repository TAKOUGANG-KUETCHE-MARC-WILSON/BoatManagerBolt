import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Modal, TextInput, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Search, Building, MapPin, FileText, Calendar, Clock, TriangleAlert as AlertTriangle, Bot as Boat, User, Send, ChevronRight, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Assurez-vous que supabase est importé

// Interfaces mises à jour pour correspondre aux données Supabase
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
    place_de_port?: string; // Added place_de_port to boat interface
  }>;
}

interface NauticalCompany {
  id: string;
  name: string;
  logo: string;
  location: string; // This will be the common port name for display
  rating?: number; // Optional as it might not always be available
  categories: Array<{ id: number; description1: string; }>; // Changed from services: string[]
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  hasNewRequests?: boolean;
  ports: Array<{ id: number; name: string; }>; // All ports the company operates in
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
  type: string; // description1 of the service category
  description: string;
  category: string;
  date: string;
  forClient: boolean;
}

interface Service {
  id: string;
  name: string;
  description: string;
  amount: number;
}

export default function CompanyRequestScreen() {
  const { company: initialCompanyId, clientId: initialClientId, boatId: initialBoatId } = useLocalSearchParams<{
    company?: string;
    clientId?: string;
    boatId?: string;
  }>();
  
  const { user } = useAuth();
  
  // Définir la date de validité par défaut (30 jours à partir d'aujourd'hui)
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
    services: [
      {
        id: '1',
        name: '',
        description: '',
        amount: 0
      }
    ],
    urgency: 'normal',
    type: '',
    description: '',
    category: 'Services',
    date: new Date().toISOString().split('T')[0],
    forClient: true
  };

  const [form, setForm] = useState<RequestForm>(initialFormState);
  
  const [errors, setErrors] = useState<Partial<Record<keyof RequestForm | 'services', string>>>({});
  const [showClientModal, setShowClientModal] = useState(false);
  const [showBoatModal, setShowBoatModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  // New state for fetched service types (from current BM's categories)
  const [fetchedServiceTypes, setFetchedServiceTypes] = useState<string[]>([]);
  // New state for all nautical companies (fetched once)
  const [allNauticalCompanies, setAllNauticalCompanies] = useState<NauticalCompany[]>([]);
  // State for actual clients fetched from DB
  const [allClients, setAllClients] = useState<Client[]>([]);

  // State to hold the selected client for the boat selection modal
  const [selectedClientForBoat, setSelectedClientForBoat] = useState<Client | null>(null);

  // Store initial boat place_de_port to check for changes
  const [initialBoatPlaceDePort, setInitialBoatPlaceDePort] = useState<string | undefined>(undefined);

  // Effet pour charger les données initiales
  useEffect(() => {
    const fetchAllClients = async () => {
      if (!user || user.role !== 'boat_manager') return;

      try {
        // 1. Get ports managed by the current Boat Manager
        const { data: bmPorts, error: bmPortsError } = await supabase
          .from('user_ports')
          .select('port_id')
          .eq('user_id', user.id);

        if (bmPortsError) throw bmPortsError;
        const managedPortIds = bmPorts.map(p => p.port_id);

        if (managedPortIds.length === 0) {
          setAllClients([]);
          return;
        }

        // 2. Get client IDs associated with these ports
        const { data: clientPortAssignments, error: clientPortError } = await supabase
          .from('user_ports')
          .select('user_id')
          .in('port_id', managedPortIds);

        if (clientPortError) throw clientPortError;
        const uniqueClientIds = [...new Set(clientPortAssignments.map(cpa => cpa.user_id))];

        if (uniqueClientIds.length === 0) {
          setAllClients([]);
          return;
        }

        // 3. Fetch client details and their boats
        const { data: clientsData, error: clientsError } = await supabase
          .from('users')
          .select('id, first_name, last_name, avatar, e_mail, phone, boat(id, name, type, place_de_port)')
          .in('id', uniqueClientIds)
          .eq('profile', 'pleasure_boater');

        if (clientsError) throw clientsError;

        setAllClients(clientsData.map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          avatar: c.avatar,
          email: c.e_mail,
          phone: c.phone,
          boats: c.boat || []
        })) as Client[]);

      } catch (e) {
        console.error('Error fetching all clients:', e);
      }
    };

    // Fetch service types from the database (for current BM's categories)
    const fetchServiceTypes = async () => {
      // Fetch ALL categories from categorie_service
      const { data, error } = await supabase
        .from('categorie_service')
        .select('description1');
      if (error) {
        console.error('Error fetching all service categories:', error);
      } else {
        setFetchedServiceTypes(data.map(cat => cat.description1));
      }
    };

    // Fetch all nautical companies
    const fetchNauticalCompanies = async () => {
  if (!user || !localAppointment.type) return;

  try {
    // 1. Ports du boat manager
    const { data: bmPorts, error: bmPortsError } = await supabase
      .from('user_ports')
      .select('port_id')
      .eq('user_id', user.id);

    if (bmPortsError) throw bmPortsError;
    const managedPortIds = bmPorts.map(p => p.port_id);

    if (managedPortIds.length === 0) {
      setAllNauticalCompanies([]);
      return;
    }

    // 2. Récupérer l’ID du service sélectionné
    const { data: serviceCategory, error: serviceCategoryError } = await supabase
      .from('categorie_service')
      .select('id')
      .eq('description1', localAppointment.type)
      .single();

    if (serviceCategoryError || !serviceCategory) {
      console.error('Erreur service:', serviceCategoryError);
      setAllNauticalCompanies([]);
      return;
    }

    const serviceId = serviceCategory.id;

    // 3. Récupérer les entreprises liées à ce service
    const { data: companyUsers, error: companyUsersError } = await supabase
      .from('users')
      .select(`
        id, company_name, avatar, address, e_mail, phone,
        user_categorie_service(categorie_service_id),
        user_ports(port_id, ports(name))
      `)
      .eq('profile', 'nautical_company');

    if (companyUsersError) throw companyUsersError;

    const companiesForBM: NauticalCompany[] = [];

    for (const company of companyUsers) {
      const portIds = company.user_ports.map((up: any) => up.port_id);
      const hasCommonPort = portIds.some(pid => managedPortIds.includes(pid));

      const serviceIds = company.user_categorie_service.map((ucs: any) => ucs.categorie_service_id);
      const offersSelectedService = serviceIds.includes(serviceId);

      if (hasCommonPort && offersSelectedService) {
        const portName = company.user_ports.find((up: any) =>
          managedPortIds.includes(up.port_id))?.ports?.name || '';

        companiesForBM.push({
          id: company.id.toString(),
          name: company.company_name,
          logo: company.avatar,
          location: portName,
          contactEmail: company.e_mail,
          contactPhone: company.phone,
          categories: [{ id: serviceId, description1: localAppointment.type }],
          ports: company.user_ports.map((up: any) => ({ id: up.port_id, name: up.ports.name })),
        });
      }
    }

    setAllNauticalCompanies(companiesForBM);

  } catch (e) {
    console.error('Erreur lors du fetch des entreprises :', e);
    setAllNauticalCompanies([]);
  }
};


    fetchAllClients();
    fetchServiceTypes();
    fetchNauticalCompanies();

    // Default to Boat Manager as provider if no initial company is set
    if (user && !initialCompanyId) {
      setForm(prev => ({
        ...prev,
        companyId: user.id, // Assuming user.id is the BM's ID
        companyName: `${user.firstName} ${user.lastName}`, // BM's name
        type: '', // Default service type should be empty
        description: '', // Default description should be empty
      }));
    }
  }, [initialClientId, initialBoatId, initialCompanyId, user]);

  // Effect to pre-fill client and boat if initial IDs are present and allClients is loaded
  useEffect(() => {
    if (allClients.length > 0) {
      if (initialClientId) {
        const client = allClients.find(c => c.id === initialClientId);
        if (client) {
          setForm(prev => ({
            ...prev,
            clientId: client.id,
            clientName: client.name
          }));
          setSelectedClientForBoat(client);
        }
      }
      
      if (initialBoatId) {
        const client = allClients.find(c => 
          c.boats.some(b => b.id === initialBoatId)
        );
        
        if (client) {
          const boat = client.boats.find(b => b.id === initialBoatId);
          if (boat) {
            setForm(prev => ({
              ...prev,
              clientId: client.id,
              clientName: client.name,
              boatId: boat.id,
              boatName: boat.name,
              boatType: boat.type,
              location: boat.place_de_port || ''
            }));
            setSelectedClientForBoat(client);
            setInitialBoatPlaceDePort(boat.place_de_port); // Store initial value
          }
        }
      }
    }
  }, [allClients, initialClientId, initialBoatId]);


  // Filtrer les clients en fonction de la recherche
  const filteredClients = allClients.filter(client => {
    if (!clientSearchQuery) return true;
    const query = clientSearchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(query) ||
      client.email.toLowerCase().includes(query) ||
      client.boats.some(boat => boat.name.toLowerCase().includes(query))
    );
  });

  // Filtrer les entreprises en fonction de la recherche ET du type de service sélectionné
  const filteredCompanies = allNauticalCompanies.filter(company => {
    const query = companySearchQuery.toLowerCase();
    const matchesSearch = !query || company.name.toLowerCase().includes(query) ||
                          company.location.toLowerCase().includes(query);
    
    // Filter by selected service type (form.type)
    const matchesServiceType = !form.type || company.categories.some(category => category.description1 === form.type);

    return matchesSearch && matchesServiceType;
  });

  const handleSelectClient = (client: Client) => {
    setForm(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.name,
      boatId: '',
      boatName: '',
      boatType: '',
      location: '' // Clear location when client changes
    }));
    setSelectedClientForBoat(client); // Update selected client for boat modal
    setShowClientModal(false);
    
    // Si le client n'a qu'un seul bateau, le sélectionner automatiquement
    if (client.boats.length === 1) {
      const boat = client.boats[0];
      setForm(prev => ({
        ...prev,
        boatId: boat.id,
        boatName: boat.name,
        boatType: boat.type,
        location: boat.place_de_port || '' // Pre-fill location with place_de_port
      }));
      setInitialBoatPlaceDePort(boat.place_de_port); // Store initial value
    } else {
      // Sinon, ouvrir le modal de sélection de bateau
      setShowBoatModal(true);
    }
  };

  const handleSelectBoat = (boat: Client['boats'][0]) => {
    setForm(prev => ({
      ...prev,
      boatId: boat.id,
      boatName: boat.name,
      boatType: boat.type,
      location: boat.place_de_port || '' // Pre-fill location with place_de_port
    }));
    setInitialBoatPlaceDePort(boat.place_de_port); // Store initial value
    setShowBoatModal(false);
  };

  const handleSelectCompany = (company: NauticalCompany) => {
    setForm(prev => ({
      ...prev,
      companyId: company.id,
      companyName: company.name
    }));
    setShowCompanyModal(false);
  };

  const handleSelectServiceType = (type: string) => {
    setForm(prev => ({ ...prev, type }));
    setShowServiceTypeModal(false);
    setCompanySearchQuery(''); // Reset company search query when service type changes
    if (errors.type) {
      setErrors(prev => ({ ...prev, type: undefined }));
    }
  };

  const toggleUrgency = () => {
    setForm(prev => ({
      ...prev,
      urgency: prev.urgency === 'normal' ? 'urgent' : 'normal'
    }));
  };

  const toggleForClient = () => {
    setForm(prev => ({
      ...prev,
      forClient: !prev.forClient
    }));
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof RequestForm | 'services', string>> = {};
    
    if (!form.clientId) newErrors.clientId = 'Le client est requis';
    if (!form.boatId && form.type !== 'Achat/Vente') {
      newErrors.boatId = 'Le bateau est requis';
    }
    if (!form.title.trim()) newErrors.title = 'Le titre est requis';
    if (!form.type.trim()) newErrors.type = 'Le type de service est requis';
    if (!form.description.trim()) newErrors.description = 'La description est requise';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      // 1. Update place_de_port in 'boat' table if changed
      if (form.boatId && form.location !== initialBoatPlaceDePort) {
        const { error: updateBoatError } = await supabase
          .from('boat')
          .update({ place_de_port: form.location })
          .eq('id', form.boatId);

        if (updateBoatError) {
          console.error('Error updating boat place_de_port:', updateBoatError);
          Alert.alert('Erreur', `Impossible de mettre à jour la place de port du bateau: ${updateBoatError.message}`);
          return;
        }
      }

      // 2. Lookup service_id from categorie_service table
      const { data: serviceCategory, error: serviceCategoryError } = await supabase
        .from('categorie_service')
        .select('id')
        .eq('description1', form.type)
        .single();

      if (serviceCategoryError || !serviceCategory) {
        console.error('Error fetching service category ID:', serviceCategoryError);
        Alert.alert('Erreur', 'Impossible de trouver l\'ID du service sélectionné.');
        return;
      }

      const serviceId = serviceCategory.id;

      // 3. Prepare data for insertion into service_request
      const serviceRequestData = {
        id_client: form.clientId,
        id_service: serviceId,
        description: form.description,
        id_boat: form.boatId ? parseInt(form.boatId) : null,
        id_companie: form.companyId || null, // Can be null if not transmitted to a company
        id_boat_manager: user?.id, // Current Boat Manager's ID
        // duree_estimee, prix, statut, etat, avis_client are not in form, set defaults or null
        duree_estimee: null,
        prix: null,
        statut: 'submitted', // Default status
        urgence: form.urgency,
        date: form.date,
        etat: 'pending', // Default state
       // avis_client: null,
        note_add: form.notes || null,
        // place_de_port is NOT inserted into service_request
      };

      const { data, error } = await supabase
        .from('service_request')
        .insert([serviceRequestData]);

      if (error) {
        console.error('Error inserting service request:', error);
        Alert.alert('Erreur', `Échec de la création de la demande: ${error.message}`);
      } else {
        const message = form.forClient 
          ? `La demande a été créée avec succès au nom de ${form.clientName} et apparaîtra dans son suivi.` 
          : `La demande a été créée avec succès et sera traitée par vous-même.`;
        
        const additionalMessage = form.companyId 
          ? `\n\nLa demande a également été transmise à ${form.companyName}.` 
          : '';
        
        Alert.alert(
          'Demande envoyée',
          message + additionalMessage,
          [
            {
              text: 'OK',
              onPress: () => {
                setForm(initialFormState); // Reset form fields
                setErrors({}); // Clear errors
                setSelectedClientForBoat(null); // Clear selected client for boat modal
                router.back();
              }
            }
          ]
        );
      }
    }
  };

  // Client selection modal
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
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowClientModal(false)}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalList}>
          {filteredClients.map(client => {
            return (
              <TouchableOpacity
                key={client.id}
                style={styles.modalItem}
                onPress={() => handleSelectClient(client)}
              >
                <View style={styles.modalItemContent}>
                  <User size={20} color="#0066CC" />
                  <Text style={styles.modalItemText}>
                    {String(client?.name ?? '')}
                  </Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

// Boat selection modal
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
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowBoatModal(false)}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>
        
        {client && client.boats.length > 0 ? (
          <ScrollView style={styles.modalList}>
            {client.boats.map(boat => {
              return (
                <TouchableOpacity
                  key={boat.id}
                  style={styles.modalItem}
                  onPress={() => handleSelectBoat(boat)}
                >
                  <View style={styles.modalItemContent}>
                    <Boat size={20} color="#0066CC" />
                    <View>
                      <Text style={styles.modalItemText}>
                        {String(boat?.name ?? '')}
                      </Text>
                      <Text style={styles.modalItemSubtext}>
                        {String(boat?.type ?? '')}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyModalState}>
            <Text style={styles.emptyModalText}>
              {client ? "Cet utilisateur n'a pas de bateau enregistré." : "Veuillez d'abord sélectionner un client."}
            </Text>
          </View>
        )}
      </View>
    </View>
  </Modal>
);


  // Modal de sélection d'entreprise
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
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCompanyModal(false)}
            >
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
                  {form.type ? `Aucune entreprise ne propose le service "${form.type}" sur ce port.` : 'Aucune entreprise trouvée.'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Modal de sélection du type de service
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
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowServiceTypeModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            {fetchedServiceTypes.map((type) => ( // Utilisation de fetchedServiceTypes
              <TouchableOpacity
                key={type}
                style={styles.modalItem}
                onPress={() => handleSelectServiceType(type)}
              >
                <Text style={styles.modalItemText}>{type}</Text>
              </TouchableOpacity>
            ))}


          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Nouvelle Demande</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Informations client */}
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
                      if (form.clientId) {
                        setShowBoatModal(true);
                      } else {
                        Alert.alert('Erreur', 'Veuillez d\'abord sélectionner un client');
                      }
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

          {/* Détails de la demande */}
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
                    setForm(prev => ({ ...prev, title: text }));
                    if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
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
                    setForm(prev => ({ ...prev, description: text }));
                    if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
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
                  onChangeText={(text) => setForm(prev => ({ ...prev, location: text }))}
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
                  onChangeText={(text) => setForm(prev => ({ ...prev, notes: text }))}
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
                    form.urgency === 'normal' && styles.urgencyOptionSelected
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, urgency: 'normal' }))}
                >
                  <Text style={[
                    styles.urgencyOptionText,
                    form.urgency === 'normal' && styles.urgencyOptionTextSelected
                  ]}>
                    Normal
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.urgencyOption,
                    form.urgency === 'urgent' && styles.urgencyOptionUrgentSelected
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, urgency: 'urgent' }))}
                >
                  <AlertTriangle 
                    size={16} 
                    color={form.urgency === 'urgent' ? 'white' : '#DC2626'} 
                  />
                  <Text style={[
                    styles.urgencyOptionText,
                    form.urgency === 'urgent' && styles.urgencyOptionUrgentTextSelected
                  ]}>
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

          {/* Options de la demande */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Options de la demande</Text>
            
            <View style={styles.optionsCard}>
              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Créer au nom du client</Text>
                <TouchableOpacity 
                  style={[
                    styles.toggleButton, 
                    form.forClient ? styles.toggleButtonActive : styles.toggleButtonInactive
                  ]}
                  onPress={toggleForClient}
                >
                  <View style={[
                    styles.toggleIndicator, 
                    form.forClient ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive
                  ]} />
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
                    form.companyId ? styles.toggleButtonActive : styles.toggleButtonInactive
                  ]}
                  onPress={() => {
                    if (form.companyId) {
                      setForm(prev => ({ ...prev, companyId: '', companyName: '' }));
                    } else {
                      setShowCompanyModal(true);
                    }
                  }}
                >
                  <View style={[
                    styles.toggleIndicator, 
                    form.companyId ? styles.toggleIndicatorActive : styles.toggleIndicatorInactive
                  ]} />
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
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Envoyer la demande</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <ClientSelectionModal />
      <BoatSelectionModal client={selectedClientForBoat} />
      <CompanySelectionModal />
      <ServiceTypeModal />
    </View>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom:  40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 16,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  infoPlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
  },
  optionsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 16,
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
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: -8,
    marginBottom: 8,
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#0066CC',
  },
  toggleButtonInactive: {
    backgroundColor: '#e2e8f0',
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  toggleIndicatorActive: {
    backgroundColor: 'white',
    alignSelf: 'flex-end',
  },
  toggleIndicatorInactive: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  selectedCompanyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectedCompanyText: {
    flex: 1,
    fontSize: 14,
    color: '#0066CC',
  },
  changeCompanyButton: {
    padding: 4,
  },
  changeCompanyText: {
    fontSize: 14,
    color: '#0066CC',
    textDecorationLine: 'underline',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
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
  },
  textArea: {
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 120,
    textAlignVertical: 'top',
  },
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
  servicePlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#94a3b8',
  },
  serviceSelected: {
    color: '#1a1a1a',
  },
  urgencySelector: {
    marginBottom: 24,
  },
  urgencySelectorTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  urgencyOptions: {
    flexDirection: 'row',
    gap: 12,
  },
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
  urgencyOptionSelected: {
    borderColor: '#0066CC',
    backgroundColor: '#f0f7ff',
  },
  urgencyOptionUrgentSelected: {
    borderColor: '#DC2626',
    backgroundColor: '#DC2626',
  },
  urgencyOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  urgencyOptionTextSelected: {
    color: 'white',
  },
  urgencyOptionUrgentTextSelected: {
    color: 'white',
  },
  urgencyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
  },
  urgencyNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
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
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center', // Changed from 'flex-end' to 'center'
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 24, // Changed from borderTopLeftRadius/borderTopRightRadius
    width: '90%', // Added width
    maxWidth: 500, // Added maxWidth
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
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
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  modalList: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
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
  modalCancelButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
  },
});
