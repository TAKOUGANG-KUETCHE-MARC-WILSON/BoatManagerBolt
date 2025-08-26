import { useState, memo } from 'react'; // Import memo
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ship, Euro, Info, Calendar, MapPin } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';

async function getAchatVenteCategoryId() {
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

// Nouvelle fonction pour trouver le meilleur Boat Manager
async function findBestBoatManagerForClient(clientId: string): Promise<number | null> {
  // 1. Récupérer tous les ports associés au client
  const { data: clientPorts, error: clientPortsError } = await supabase
    .from('user_ports')
    .select('port_id')
    .eq('user_id', clientId);

  if (clientPortsError || !clientPorts || clientPorts.length === 0) {
    console.warn('Aucun port trouvé pour le client ou erreur lors de la récupération des ports du client:', clientPortsError);
    return null;
  }

  const clientPortIds = clientPorts.map(p => p.port_id);

  // 2. Trouver tous les Boat Managers associés à ces ports
  const { data: bmPortAssignments, error: bmPortAssignmentsError } = await supabase
    .from('user_ports')
    .select('user_id')
    .in('port_id', clientPortIds);

  if (bmPortAssignmentsError || !bmPortAssignments || bmPortAssignments.length === 0) {
    console.warn('Aucun Boat Manager trouvé pour les ports du client ou erreur lors de la récupération des affectations de BM:', bmPortAssignmentsError);
    return null;
  }

  const potentialBmIds = [...new Set(bmPortAssignments.map(bm => bm.user_id))];

  // Filtrer pour s'assurer qu'ils sont bien des profils 'boat_manager'
  const { data: actualBms, error: actualBmsError } = await supabase
    .from('users')
    .select('id')
    .in('id', potentialBmIds)
    .eq('profile', 'boat_manager');

  if (actualBmsError || !actualBms || actualBms.length === 0) {
    console.warn('Aucun Boat Manager réel trouvé parmi les utilisateurs potentiels ou erreur lors de la récupération des BMs réels:', actualBmsError);
    return null;
  }

  const finalPotentialBmIds = actualBms.map(bm => bm.id);

  if (finalPotentialBmIds.length === 0) {
    return null;
  }
  if (finalPotentialBmIds.length === 1) {
    return finalPotentialBmIds[0];
  }

  // 3. Compter les demandes de service pour chaque Boat Manager potentiel avec ce client
  const { data: serviceRequests, error: srError } = await supabase
    .from('service_request')
    .select('id_boat_manager, date')
    .eq('id_client', clientId)
    .in('id_boat_manager', finalPotentialBmIds);

  if (srError) {
    console.error('Erreur lors de la récupération des demandes de service pour le classement des BM:', srError);
    return null;
  }

  const bmStats = new Map<number, { count: number; lastRequestDate: string }>();

  // Initialiser les statistiques pour tous les BMs potentiels
  finalPotentialBmIds.forEach(bmId => {
    bmStats.set(bmId, { count: 0, lastRequestDate: '1970-01-01' });
  });

  // Remplir les statistiques à partir des demandes de service
  serviceRequests.forEach(req => {
    const bmId = req.id_boat_manager;
    if (bmId && bmStats.has(bmId)) {
      const currentStats = bmStats.get(bmId)!;
      bmStats.set(bmId, {
        count: currentStats.count + 1,
        lastRequestDate: req.date > currentStats.lastRequestDate ? req.date : currentStats.lastRequestDate,
      });
    }
  });

  // 4. Sélectionner le Boat Manager avec le plus de demandes (règle de départage: demande la plus récente, puis l'ID le plus bas)
  let bestBmId: number | null = null;
  let maxCount = -1;
  let latestDate = '1970-01-01';

  for (const [bmId, stats] of bmStats.entries()) {
    if (stats.count > maxCount) {
      maxCount = stats.count;
      latestDate = stats.lastRequestDate;
      bestBmId = bmId;
    } else if (stats.count === maxCount) {
      if (stats.lastRequestDate > latestDate) {
        latestDate = stats.lastRequestDate;
        bestBmId = bmId;
      } else if (stats.lastRequestDate === latestDate) {
        // Règle de départage: prendre celui avec l'ID le plus bas
        if (bestBmId === null || bmId < bestBmId) {
          bestBmId = bmId;
        }
      }
    }
  }

  return bestBmId;
}

// Déplacez la définition de RangeInputs en dehors du composant principal et utilisez memo
const RangeInputs = memo(({ yearRange, setYearRange, budgetRange, setBudgetRange }) => {
  return (
    <>
      {/* Fourchette d'années */}
      <View style={styles.rangeContainer}>
        <Text style={styles.rangeTitle}>Année de construction</Text>
        <View style={styles.rangeInputs}>
          <View style={styles.rangeInputWrapper}>
            <Text style={styles.rangeLabel}>De</Text>
            <View style={styles.inputWrapper}>
              <Calendar size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={yearRange.min}
                onChangeText={(text) => setYearRange(prev => ({ ...prev, min: text.replace(/[^0-9]/g, '') }))}
                placeholder="Année min"
                keyboardType="numeric" 
              />
            </View>
          </View>
          <View style={styles.rangeInputWrapper}>
            <Text style={styles.rangeLabel}>À</Text>
            <View style={styles.inputWrapper}>
              <Calendar size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={yearRange.max}
                onChangeText={(text) => setYearRange(prev => ({ ...prev, max: text.replace(/[^0-9]/g, '') }))}
                placeholder="Année max"
                keyboardType="numeric" 
              />
            </View>
          </View>
        </View>
      </View>

      {/* Fourchette de budget */}
      <View style={styles.rangeContainer}>
        <Text style={styles.rangeTitle}>Budget</Text>
        <View style={styles.rangeInputs}>
          <View style={styles.rangeInputWrapper}>
            <Text style={styles.rangeLabel}>De</Text>
            <View style={styles.inputWrapper}>
              <Euro size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={budgetRange.min}
                onChangeText={(text) => setBudgetRange(prev => ({ ...prev, min: text.replace(/[^0-9]/g, '') }))}
                placeholder="Budget min"
                keyboardType="numeric" 
              />
            </View>
          </View>
          <View style={styles.rangeInputWrapper}>
            <Text style={styles.rangeLabel}>À</Text>
            <View style={styles.inputWrapper}>
              <Euro size={20} color="#666" />
              <TextInput
                style={styles.input}
                value={budgetRange.max}
                onChangeText={(text) => setBudgetRange(prev => ({ ...prev, max: text.replace(/[^0-9]/g, '') }))}
                placeholder="Budget max"
                keyboardType="numeric" 
              />
            </View>
          </View>
        </View>
      </View>
    </>
  );
});

export default function BuyBoatScreen() {
  const params = useLocalSearchParams(); 
  const { user } = useAuth();

  // Déclarez les états yearRange et budgetRange ici, dans le composant parent
  // pour pouvoir y accéder dans handleSubmit
  const [yearRange, setYearRange] = useState({ min: '', max: '' });
  const [budgetRange, setBudgetRange] = useState({ min: '', max: '' });

  const handleSubmit = async (formData: any) => {
    if (!user?.id) {
      Alert.alert('Erreur', 'Utilisateur non authentifié. Veuillez vous connecter.');
      return;
    }

    // Construire la description détaillée de la demande
    let description = `Demande de recherche de bateau:\n`;
    description += `Type de bateau: ${formData.boatType || 'Non spécifié'}\n`;
    description += `Constructeur: ${formData.manufacturer || 'Non spécifié'}\n`;
    description += `Modèle: ${formData.model || 'Non spécifié'}\n`;
    description += `Année de construction: ${yearRange.min || 'Min'} - ${yearRange.max || 'Max'}\n`;
    description += `Budget: ${budgetRange.min || 'Min'}€ - ${budgetRange.max || 'Max'}€`;


    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir au moins un critère de recherche.');
      return;
    }

    try {
      // 1. Obtenir l'ID de la catégorie "Achat/Vente"
      const id_service = await getAchatVenteCategoryId();

      // 2. Résoudre le Boat Manager basé sur le port d'attache de l'utilisateur et son historique
      const id_boat_manager = await findBestBoatManagerForClient(user.id);

      // 3. Insérer la demande dans service_request
      const { error } = await supabase
        .from('service_request')
        .insert({
          id_client: user.id,
          id_boat: null, // Important: NULL car l'utilisateur ne possède pas encore ce bateau
          id_service: id_service,
          description: description,
          urgence: 'normal', // Par défaut à normal, peut être rendu configurable
          statut: 'submitted',
          date: new Date().toISOString().split('T')[0],
          id_boat_manager: id_boat_manager, // Peut être NULL si aucun BM n'est trouvé
          prix: null, // Le budget est dans la description, pas de prix unique ici
          // L'ID est auto-incrémenté, donc nous ne l'insérons pas.
          // Les autres champs (duree_estimee, id_companie, etat, note_add) sont null par défaut si non spécifiés.
        });

      if (error) {
        console.error('Error inserting service request:', error);
        Alert.alert('Erreur', `Échec de l'envoi de la demande: ${error.message}`);
      } else {
        Alert.alert('Succès', 'Votre demande de recherche a été envoyée avec succès !');
        router.back(); // Revenir à la page précédente
      }
    } catch (e) {
      console.error('Unexpected error during submission:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de l\'envoi de la demande.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <ServiceForm
          title="Rechercher un bateau"
          description="Précisez vos critères de recherche pour trouver le bateau idéal"
          fields={[
            {
              name: 'boatType',
              label: 'Type de bateau',
              placeholder: 'Voilier, Motoryacht, Catamaran...',
              icon: Ship,
            },
            {
              name: 'manufacturer',
              label: 'Constructeur',
              placeholder: 'Bénéteau, Jeanneau, Lagoon...',
              icon: Info,
            },
            {
              name: 'model',
              label: 'Modèle',
              placeholder: 'Oceanis, Sun Odyssey...',
              icon: Info,
            },
          ]}
          submitLabel="Soumettre ma demande"
          onSubmit={handleSubmit}
          // Passez les props yearRange, setYearRange, budgetRange, setBudgetRange à RangeInputs
          customContent={<RangeInputs yearRange={yearRange} setYearRange={setYearRange} budgetRange={budgetRange} setBudgetRange={setBudgetRange} />}
        />
      </View>
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
  rangeContainer: {
    marginBottom: 24,
  },
  rangeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  rangeInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  rangeInputWrapper: {
    flex: 1,
  },
  rangeLabel: {
    fontSize: 14,
    color: '#666',
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
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
  },
});
