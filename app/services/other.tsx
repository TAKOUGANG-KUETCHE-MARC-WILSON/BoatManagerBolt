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
    .ilike('description1', 'Autre') // insensible à la casse, exact
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    throw new Error('La catégorie "Autre" est introuvable dans categorie_service.description1');
  }
  return Number(data.id);
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

export default function OtherScreen() {
  const { boatId, serviceCategoryId } = useLocalSearchParams<{ boatId: string; serviceCategoryId: string }>();
  const { user } = useAuth();

  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'urgent'>('normal');
  const [detailedDescription, setDetailedDescription] = useState('');

  const handleSubmit = async (formData: any) => {
    if (!user?.id || !boatId || !serviceCategoryId) {
      Alert.alert('Erreur', 'Informations manquantes pour soumettre la demande.');
      return;
    }

    if (!detailedDescription.trim()) {
      Alert.alert('Erreur', 'Veuillez décrire votre demande.');
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
          description: detailedDescription,
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
          title="Autre demande"
          description="Décrivez votre besoin spécifique"
          fields={[]}
          submitLabel="Envoyer"
          onSubmit={handleSubmit}
          customContent={
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description détaillée de votre demande</Text>
                <View style={styles.textAreaWrapper}>
                  <TextInput
                    style={styles.textArea}
                    value={detailedDescription}
                    onChangeText={setDetailedDescription}
                    placeholder="Décrivez en détail votre demande (ex: besoin d'un expert maritime, recherche de place de port, etc.)"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              <UrgencySelector
                urgencyLevel={urgencyLevel}
                setUrgencyLevel={setUrgencyLevel}
                componentStyles={styles}
              />
            </>
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
