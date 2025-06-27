import { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ship, Euro, Ruler, MapPin, Search, Info, Calendar } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';

export default function BuyBoatScreen() {
  const [yearRange, setYearRange] = useState({ min: '', max: '' });
  const [budgetRange, setBudgetRange] = useState({ min: '', max: '' });

  const handleSubmit = (formData: any) => {
    // Ajouter les fourchettes d'année et de budget aux données du formulaire
    const formDataWithRanges = {
      ...formData,
      yearRange,
      budgetRange
    };
    
    console.log('Form submitted:', formDataWithRanges);
    // Handle form submission
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