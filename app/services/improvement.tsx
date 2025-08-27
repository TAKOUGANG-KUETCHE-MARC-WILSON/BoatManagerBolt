import { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { PenTool as Tool, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';


async function getEntretienCategoryId() {
  const { data, error } = await supabase
    .from('categorie_service')
    .select('id')
    .ilike('description1', 'Amélioration') // insensible à la casse, exact
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('La catégorie "Amélioration" est introuvable dans categorie_service.description1');
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

// Extracted UrgencySelector component
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

export default function ImprovementScreen() {
  const { boatId, serviceCategoryId } = useLocalSearchParams<{ boatId: string; serviceCategoryId: string }>();
  const { user } = useAuth();

  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'urgent'>('normal');

  const handleSubmit = async (formData: any) => {
    if (!user?.id || !boatId || !serviceCategoryId) {
      Alert.alert('Erreur', 'Informations manquantes pour soumettre la demande.');
      return;
    }

    const description = formData.improvementType ? formData.improvementType.trim() : '';

    if (!description) {
      Alert.alert('Erreur', 'Veuillez décrire les améliorations que vous souhaitez apporter.');
      return;
    }

    try {
      const id_service = await getEntretienCategoryId(); // Get the specific service category ID

      const id_boat_manager = await resolveBoatManagerForRequest({
        boatId: Number(boatId),
        serviceId: id_service,
        clientId: Number(user.id),
      });

      const { error } = await supabase
        .from('service_request')
        .insert({
          id_client: user.id,
          id_boat: parseInt(boatId),
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <ServiceForm
          title="Amélioration de votre bateau"
          description="Décrivez les améliorations que vous souhaitez apporter à votre bateau"
          fields={[
            {
              name: 'improvementType',
              label: "",
              placeholder: "Décrivez les améliorations que vous souhaitez apporter à votre bateau",
              icon: Tool,
              multiline: true,
            },
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
    flex: 1,
    height: '100%'
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
    color: '#0066CC',
  },
  urgencyOptionUrgentTextSelected: {
    color: 'white',
  },
  urgencyNote: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  }
});
