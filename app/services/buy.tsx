import { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ship, Euro, Info, Calendar, MapPin } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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


export default function BuyBoatScreen() {
  const { boatId, serviceCategoryId } = useLocalSearchParams<{ boatId: string; serviceCategoryId: string }>();
  const { user } = useAuth();

  const [yearRange, setYearRange] = useState({ min: '', max: '' });
  const [budgetRange, setBudgetRange] = useState({ min: '', max: '' });

  const handleSubmit = async (formData: any) => {
    if (!user?.id || !boatId || !serviceCategoryId) {
      Alert.alert('Erreur', 'Informations manquantes pour soumettre la demande.');
      return;
    }

    // Construct the description from form data and ranges
    let description = `Type de bateau: ${formData.boatType || 'Non spécifié'}`;
    description += ` ; Constructeur: ${formData.manufacturer || 'Non spécifié'}`;
    description += ` ; Modèle: ${formData.model || 'Non spécifié'}`;
    description += ` ; Zone de recherche: ${formData.location || 'Non spécifié'}`;
    description += ` ; Année de construction: ${yearRange.min || 'Min'} - ${yearRange.max || 'Max'}`;
    description += ` ; Budget: ${budgetRange.min || 'Min'}€ - ${budgetRange.max || 'Max'}€`;

    if (!description.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir au moins un critère de recherche.');
      return;
    }

    try {
      // Récupérer le Boat Manager associé au port du bateau
      const { data: boatData, error: boatError } = await supabase
        .from('boat')
        .select('id_port')
        .eq('id', boatId)
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

      const { error } = await supabase
        .from('service_request')
        .insert({
          id_client: user.id,
          id_boat: parseInt(boatId),
          id_service: parseInt(serviceCategoryId), // Utilise l'ID de la catégorie de service
          description: description,
          urgence: 'normal', // Default to normal urgency for this service
          statut: 'submitted', // Statut initial
          date: new Date().toISOString().split('T')[0], // Date du jour
          id_boat_manager: id_boat_manager, // Assigner le Boat Manager trouvé
        });

      if (error) {
        console.error('Error inserting service request:', error);
        Alert.alert('Erreur', `Échec de l'envoi de la demande: ${error.message}`);
      } else {
        Alert.alert('Succès', 'Votre demande a été envoyée avec succès !');
        router.back(); // Revenir à la page précédente
      }
    } catch (e) {
      console.error('Unexpected error during submission:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de l\'envoi de la demande.');
    }
  };

  const RangeInputs = () => (
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
                onChangeText={(text) => setYearRange(prev => ({ ...prev, min: text }))}
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
                onChangeText={(text) => setYearRange(prev => ({ ...prev, max: text }))}
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
                onChangeText={(text) => setBudgetRange(prev => ({ ...prev, min: text }))}
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
                onChangeText={(text) => setBudgetRange(prev => ({ ...prev, max: text }))}
                placeholder="Budget max"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      </View>
    </>
  );

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
            {
              name: 'location',
              label: 'Zone de recherche',
              placeholder: 'Méditerranée, Atlantique...',
              icon: MapPin,
            },
          ]}
          submitLabel="Soumettre ma demande"
          onSubmit={handleSubmit}
          customContent={<RangeInputs />}
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
