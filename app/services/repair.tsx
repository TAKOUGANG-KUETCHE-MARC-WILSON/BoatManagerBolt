import { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, TextInput } from 'react-native';
import { PenTool as Tool, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';

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

export default function RepairScreen() {
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'urgent'>('normal');
  const [detailedDescription, setDetailedDescription] = useState('');

  const handleSubmit = (formData: any) => {
    const formDataWithDetails = {
      ...formData,
      detailedDescription, // Include the new detailed description
      urgencyLevel
    };

    console.log('Form submitted:', formDataWithDetails);
    // Handle form submission
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <ServiceForm
          title="Réparation/Panne de votre bateau"
          description="Décrivez le problème rencontré"
          fields={[
            {
              name: 'issueType',
              label: "Nature de la panne",
              placeholder: "ex: Panne moteur, fuite, problème électrique...",
              icon: Tool,
            },
          ]}
          submitLabel="Envoyer"
          onSubmit={handleSubmit}
          customContent={
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description détaillée du problème</Text>
                <View style={styles.textAreaWrapper}>
                  <TextInput
                    style={styles.textArea}
                    value={detailedDescription}
                    onChangeText={setDetailedDescription}
                    placeholder="Décrivez en détail le problème rencontré, les symptômes, quand cela a commencé, etc."
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
