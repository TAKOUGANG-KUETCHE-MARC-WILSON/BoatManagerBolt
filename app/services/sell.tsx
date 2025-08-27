import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Modal, Image, Alert } from 'react-native';
import { Ship, Euro, Info, Calendar, Wrench, Clock, Ruler, MapPin, ChevronRight, X, Bot as Boat, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';
import { useAuth } from '@/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';


async function getEntretienCategoryId() {
  const { data, error } = await supabase
    .from('categorie_service')
    .select('id')
    .ilike('description1', 'Achat/Vente') // insensible à la casse, exact
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('La catégorie "Achat/Vente" est introuvable dans categorie_service.description1');
  }
  return Number(data.id);
}

// Choisit le boat manager selon tes règles : port → compétence → historique
async function resolveBoatManagerForRequest(params: {
  boatId: number;
  serviceId: number;
  clientId: number;
}): Promise<number | null> {
  const { boatId, serviceId, clientId } = params;

  // a) Port du bateau
  const { data: boatRow, error: boatErr } = await supabase
    .from('boat')
    .select('id_port')
    .eq('id', boatId)
    .single();
  if (boatErr || !boatRow) return null;

  // b) Tous les users rattachés au port
  const { data: portUsers, error: puErr } = await supabase
    .from('user_ports')
    .select('user_id')
    .eq('port_id', boatRow.id_port);
  if (puErr || !portUsers?.length) return null;

  const portUserIds = [...new Set(portUsers.map(u => Number(u.user_id)))];

  // ✅ c) Filtrer par profil "boat_manager"
  const { data: bmUsers, error: bmErr } = await supabase
    .from('users')
    .select('id')
    .in('id', portUserIds)
    .eq('profile', 'boat_manager');
  if (bmErr) return null;

  const boatManagerIds = bmUsers?.map(u => Number(u.id)) ?? [];
  if (boatManagerIds.length === 0) return null;
  if (boatManagerIds.length === 1) return boatManagerIds[0];

  // d) Filtrer par compétence (service) parmi les boat managers
  const { data: capableRows, error: capErr } = await supabase
    .from('user_categorie_service')
    .select('user_id')
    .eq('categorie_service_id', serviceId)
    .in('user_id', boatManagerIds);

  const capableIds = !capErr && capableRows?.length
    ? [...new Set(capableRows.map(r => Number(r.user_id)))]
    : [];

  if (capableIds.length === 1) return capableIds[0];

  // e) Historique client parmi les candidats (priorité: nb de demandes, puis date récente, puis id croissant)
  const candidates = capableIds.length ? capableIds : boatManagerIds;

  const { data: historyRows, error: histErr } = await supabase
    .from('service_request')
    .select('id_boat_manager, date')
    .eq('id_client', clientId)
    .in('id_boat_manager', candidates);

  if (!histErr && historyRows?.length) {
    const stats = new Map<number, { count: number; lastDate: string }>();
    for (const row of historyRows) {
      const mid = Number(row.id_boat_manager);
      if (!mid) continue;
      const prev = stats.get(mid) ?? { count: 0, lastDate: '1970-01-01' };
      const d = (row.date ?? '1970-01-01') as string;
      stats.set(mid, {
        count: prev.count + 1,
        lastDate: d > prev.lastDate ? d : prev.lastDate,
      });
    }
    if (stats.size) {
      const best = [...stats.entries()].sort((a, b) => {
        const [idA, sA] = a, [idB, sB] = b;
        if (sB.count !== sA.count) return sB.count - sA.count;
        if (sB.lastDate !== sA.lastDate) return (sB.lastDate > sA.lastDate ? 1 : -1);
        return idA - idB;
      })[0]?.[0];
      if (best) return best;
    }
  }

  // f) Fallback déterministe
  candidates.sort((a, b) => a - b);
  return candidates[0] ?? null;
}


interface BoatDetails {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  constructionYear: string;
  engine: string;
  engineHours: string;
  length: string;
  homePort: string;
  image: string;
  id_port: number; // Added for Supabase mapping
}

// Extracted UrgencySelector component for consistency
const UrgencySelector = ({ urgencyLevel, setUrgencyLevel, componentStyles }) => {
  return (
    <View style={componentStyles.urgencySelector}>
      <Text style={componentStyles.urgencyLabel}>Niveau d'urgence</Text>
      <View style={componentStyles.urgencyOptions}>
        <TouchableOpacity
          style={[
            componentStyles.urgencyOption,
            urgencyLevel === 'normal' && componentStyles.urgencyOptionSelected
          ]}
          onPress={() => setUrgencyLevel('normal')}
        >
          <Text style={[
            componentStyles.urgencyOptionText,
            urgencyLevel === 'normal' && componentStyles.urgencyOptionTextSelected
          ]}>
            Normal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            componentStyles.urgencyOption,
            urgencyLevel === 'urgent' && componentStyles.urgencyOptionUrgentSelected
          ]}
          onPress={() => setUrgencyLevel('urgent')}
        >
          <AlertTriangle
            size={16}
            color={urgencyLevel === 'urgent' ? 'white' : '#DC2626'}
          />
          <Text style={[
            componentStyles.urgencyOptionText,
            urgencyLevel === 'urgent' && componentStyles.urgencyOptionUrgentTextSelected
          ]}>
            Urgent
          </Text>
        </TouchableOpacity>
      </View>

      {urgencyLevel === 'urgent' && (
        <View style={componentStyles.urgencyNote}>
          <AlertTriangle size={16} color="#DC2626" />
          <Text style={componentStyles.urgencyNoteText}>
            En sélectionnant "Urgent", votre demande sera traitée en priorité.
          </Text>
        </View>
      )}
    </View>
  );
};

export default function SellBoatScreen() {
  const { boatId: initialBoatId, serviceCategoryId } = useLocalSearchParams<{ boatId: string; serviceCategoryId: string }>();
  const { user, isAuthenticated } = useAuth();

  const [showBoatSelector, setShowBoatSelector] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<BoatDetails | null>(null);
  const [userBoats, setUserBoats] = useState<BoatDetails[]>([]);
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'urgent'>('normal');


  // `initialValues` est un objet qui sera passé à ServiceForm pour pré-remplir les champs.
  // Il est mis à jour chaque fois que `selectedBoat` change.
  const initialValues = useMemo(() => ({
    boatName:         selectedBoat?.name             ?? '',
    boatType:         selectedBoat?.type             ?? '',
    manufacturer:     selectedBoat?.manufacturer     ?? '',
    model:            selectedBoat?.model            ?? '',
    constructionYear: selectedBoat?.constructionYear ?? '',
    engine:           selectedBoat?.engine           ?? '',
    engineHours:      selectedBoat?.engineHours      ?? '',
    length:           selectedBoat?.length           ?? '',
    homePort:         selectedBoat?.homePort         ?? '',
  }), [selectedBoat]);


  // Fetch user's boats when component mounts
  useEffect(() => {
    const fetchUserBoats = async () => {
      if (isAuthenticated && user?.id) {
        const { data, error } = await supabase
          .from('boat')
          .select('id, name, type, constructeur, modele, annee_construction, type_moteur, temps_moteur, longueur, id_port, image, ports(name)')
          .eq('id_user', user.id);

        if (error) {
          console.error('Error fetching user boats:', error);
          Alert.alert('Erreur', 'Impossible de charger vos bateaux.');
        } else {
          const fetchedBoats: BoatDetails[] = data.map(b => ({
            id: b.id.toString(),
            name: b.name,
            type: b.type,
            manufacturer: b.constructeur || '',
            model: b.modele || '',
            constructionYear: b.annee_construction ? new Date(b.annee_construction).getFullYear().toString() : '',
            engine: b.type_moteur || '',
            engineHours: b.temps_moteur ? b.temps_moteur.toString() : '',
            length: b.longueur || '',
            homePort: b.ports?.name || '',
            image: b.image || 'https://images.pexels.com/photos/163236/boat-yacht-marina-dock-163236.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
            id_port: b.id_port,
          }));
          setUserBoats(fetchedBoats);

          // If initialBoatId is provided, try to pre-select it
          if (initialBoatId) {
            const preSelected = fetchedBoats.find(b => b.id === initialBoatId);
            if (preSelected) {
              setSelectedBoat(preSelected);
            }
          }
        }
      }
    };
    fetchUserBoats();
  }, [isAuthenticated, user?.id, initialBoatId]);

  const handleSubmit = async (formData: any) => {
    if (!user?.id || !serviceCategoryId) {
      Alert.alert('Erreur', 'Informations manquantes pour soumettre la demande.');
      return;
    }

    const boatToSell = selectedBoat || {
      id: '', // Will be ignored if not selected
      name: formData.boatName || '',
      type: formData.boatType || '',
      manufacturer: formData.manufacturer || '',
      model: formData.model || '',
      constructionYear: formData.constructionYear || '',
      engine: formData.engine || '',
      engineHours: formData.engineHours || '',
      length: formData.length || '',
      homePort: formData.homePort || '',
      image: '', // Not directly from form
      id_port: 0, // Not directly from form
    };

    let description = `Vente de bateau: ${boatToSell.name || 'Non spécifié'} (${boatToSell.type || 'Non spécifié'})`;
    description += ` ; Constructeur: ${boatToSell.manufacturer || 'Non spécifié'}`;
    description += ` ; Modèle: ${boatToSell.model || 'Non spécifié'}`;
    description += ` ; Année: ${boatToSell.constructionYear || 'Non spécifié'}`;
    description += ` ; Moteur: ${boatToSell.engine || 'Non spécifié'}`;
    description += ` ; Heures moteur: ${boatToSell.engineHours || 'Non spécifié'}`;
    description += ` ; Longueur: ${boatToSell.length || 'Non spécifié'}`;
    description += ` ; Port d'attache: ${boatToSell.homePort || 'Non spécifié'}`;

    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez fournir des détails sur le bateau à vendre.');
      return;
    }

    try {
      // Determine the boat ID to associate with the service request
      // If a boat was selected from the user's existing boats, use its ID.
      // Otherwise, if the user filled out the form manually, we need to use the initialBoatId
      // passed from the previous screen (if any), or handle it as a new boat not yet in DB.
      // For simplicity, we'll use selectedBoat.id if available, otherwise initialBoatId.
      const finalBoatId = selectedBoat?.id || initialBoatId;

      if (!finalBoatId) {
        Alert.alert('Erreur', 'Impossible d\'associer la demande à un bateau. Veuillez sélectionner un bateau ou vous assurer que l\'ID du bateau est fourni.');
        return;
      }

      // Récupérer le Boat Manager associé au port du bateau
      const { data: boatData, error: boatError } = await supabase
        .from('boat')
        .select('id_port')
        .eq('id', finalBoatId)
        .single();

      if (boatError || !boatData) {
        console.error('Error fetching boat port:', boatError);
        Alert.alert('Erreur', 'Impossible de récupérer les informations du port du bateau.');
        return;
      }

      const { data: bmPortAssignment, error: bmPortAssignmentError } = await supabase
        .from('user_ports')
        .select('user_id')
        .eq('port_id', boatData.id_port)
        .limit(1); // Prend le premier Boat Manager trouvé pour ce port

      let id_boat_manager = null;
      if (!bmPortAssignmentError && bmPortAssignment.length > 0) {
        id_boat_manager = bmPortAssignment[0].user_id;
      }

      const id_service = await getEntretienCategoryId();

      const { error } = await supabase
        .from('service_request')
        .insert({
          id_client: user.id,
          id_boat: parseInt(finalBoatId),
          id_service: id_service, // Utilise l'ID de la catégorie de service
          description: description,
          urgence: urgencyLevel,
          statut: 'submitted', // Statut initial
          date: new Date().toISOString().split('T')[0], // Date du jour
          id_boat_manager: id_boat_manager, // Assigner le Boat Manager trouvé
        });

      if (error) {
        console.error('Error inserting service request:', error);
        Alert.alert('Erreur', `Échec de l'envoi de la demande: ${error.message}`);
      }
    } catch (e) {
      console.error('Unexpected error during submission:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de l\'envoi de la demande.');
    }
  };

  const handleSelectBoat = (boat: BoatDetails) => {
    setSelectedBoat(boat);
    setShowBoatSelector(false);
  };

  const BoatSelectorModal = () => (
    <Modal
      visible={showBoatSelector}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBoatSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un bateau</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowBoatSelector(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.boatList}>
            {userBoats.map(boat => (
              <TouchableOpacity
                key={boat.id}
                style={styles.boatItem}
                onPress={() => handleSelectBoat(boat)}
              >
                <Image source={{ uri: boat.image }} style={styles.boatImage} />
                <View style={styles.boatItemInfo}>
                  <Text style={styles.boatItemName}>{boat.name}</Text>
                  <Text style={styles.boatItemDetails}>
                    {boat.type} • {boat.manufacturer} {boat.model}
                  </Text>
                  <Text style={styles.boatItemDetails}>
                    {boat.length} • {boat.constructionYear}
                  </Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const BoatSelector = () => (
    <View style={styles.boatSelectorContainer}>
      <Text style={styles.boatSelectorTitle}>Sélectionner un bateau existant</Text>
      <Text style={styles.boatSelectorDescription}>
        Vous pouvez sélectionner un de vos bateaux existants ou remplir les informations manuellement.
      </Text>

      <TouchableOpacity
        style={styles.selectBoatButton}
        onPress={() => setShowBoatSelector(true)}
      >
        <Boat size={20} color="#0066CC" />
        <Text style={styles.selectBoatButtonText}>
          {selectedBoat ? `${selectedBoat.name} (${selectedBoat.type})` : "Sélectionner un bateau"}
        </Text>
        <ChevronRight size={20} color="#0066CC" />
      </TouchableOpacity>

      {selectedBoat && (
        <TouchableOpacity
          style={styles.clearSelectionButton}
          onPress={() => setSelectedBoat(null)}
        >
          <Text style={styles.clearSelectionText}>Effacer la sélection</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {isAuthenticated && userBoats.length > 0 && <BoatSelector />}

        <ServiceForm
          key={selectedBoat?.id || 'manual'} // La clé force le re-rendu du formulaire quand le bateau sélectionné change
          title="Je souhaite vendre mon bateau"
          description="Remplissez le formulaire ci-dessous pour mettre en vente votre bateau"
          initialValues={initialValues} // Les valeurs initiales sont passées ici
          fields={[
            { name: 'boatName',         label: 'Nom du bateau',          placeholder: 'ex: Le Grand Bleu', icon: Boat },
            { name: 'boatType',         label: 'Type de bateau',         placeholder: 'ex: Voilier…',      icon: Ship },
            { name: 'manufacturer',     label: 'Constructeur',           placeholder: 'ex: Bénéteau…',     icon: Info },
            { name: 'model',            label: 'Modèle',                 placeholder: 'ex: Oceanis 45',    icon: Info },
            { name: 'constructionYear', label: 'Année de construction',  placeholder: 'ex: 2020',          icon: Calendar, keyboardType: 'numeric' },
            { name: 'engine',           label: 'Moteur',                 placeholder: 'ex: Volvo Penta…',  icon: Wrench },
            { name: 'engineHours',      label: 'Heures moteur',          placeholder: 'ex: 500',            icon: Clock, keyboardType: 'numeric' },
            { name: 'length',           label: 'Longueur',               placeholder: 'ex: 12m',            icon: Ruler },
            { name: 'homePort',         label: "Port d'attache",         placeholder: 'ex: Marseille…',     icon: MapPin },
          ]}
          submitLabel="Envoyer"
          onSubmit={handleSubmit}
          customContent={
            <UrgencySelector
              urgencyLevel={urgencyLevel}
              setUrgencyLevel={setUrgencyLevel}
              componentStyles={styles}
            />
          }
        />
      </View>

      <BoatSelectorModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
  },
  boatSelectorContainer: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  boatSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 8,
  },
  boatSelectorDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  selectBoatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectBoatButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#0066CC',
    marginLeft: 12,
  },
  clearSelectionButton: {
    alignSelf: 'center',
    marginTop: 12,
    padding: 8,
  },
  clearSelectionText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
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
  boatList: {
    padding: 16,
  },
  boatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  boatImage: {
    width: 80,
    height: 80,
  },
  boatItemInfo: {
    flex: 1,
    padding: 12,
  },
  boatItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  boatItemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  urgencySelector: {
    marginBottom: 24,
  },
  urgencyLabel: {
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
    flex: 1,
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
});
