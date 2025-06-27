import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { PenTool as Tool, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';
import { useState } from 'react';

export default function RepairScreen() {
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'urgent'>('normal');

  const handleSubmit = (formData: any) => {
    // Add urgency level to form data
    const formDataWithUrgency = {
      ...formData,
      urgencyLevel
    };
    
    console.log('Form submitted:', formDataWithUrgency);
    // Handle form submission
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <ServiceForm
          title="Réparation/Panne de votre bateau"
          fields={[
            {
              name: 'issueType',
              label: "Nature de la panne",
              placeholder: "Description",
              icon: Tool,
              multiline: true,
            },
          ]}
          submitLabel="Envoyer"
          onSubmit={handleSubmit}
          customContent={
            <>
              <View style={styles.spacer} />
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description détaillée du problème</Text>
                <View style={styles.inputWrapper}>
                  <Tool size={20} color="#666" />
                  <Text style={styles.placeholder}>Problème rencontré</Text>
                </View>
              </View>
              
              <View style={styles.spacer} />
              
              <View style={styles.urgencySelector}>
                <Text style={styles.urgencyLabel}>Niveau d'urgence</Text>
                <View style={styles.urgencyOptions}>
                  <TouchableOpacity 
                    style={[
                      styles.urgencyOption,
                      urgencyLevel === 'normal' && styles.urgencyOptionSelected
                    ]}
                    onPress={() => setUrgencyLevel('normal')}
                  >
                    <Text style={[
                      styles.urgencyOptionText,
                      urgencyLevel === 'normal' && styles.urgencyOptionTextSelected
                    ]}>
                      Normal
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.urgencyOption,
                      urgencyLevel === 'urgent' && styles.urgencyOptionUrgentSelected
                    ]}
                    onPress={() => setUrgencyLevel('urgent')}
                  >
                    <AlertTriangle 
                      size={16} 
                      color={urgencyLevel === 'urgent' ? 'white' : '#DC2626'} 
                    />
                    <Text style={[
                      styles.urgencyOptionText,
                      urgencyLevel === 'urgent' && styles.urgencyOptionUrgentTextSelected
                    ]}>
                      Urgent
                    </Text>
                  </TouchableOpacity>
                </View>
                
                {urgencyLevel === 'urgent' && (
                  <View style={styles.urgencyNote}>
                    <AlertTriangle size={16} color="#DC2626" />
                    <Text style={styles.urgencyNoteText}>
                      En sélectionnant "Urgent", votre demande sera traitée en priorité.
                    </Text>
                  </View>
                )}
              </View>
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
  spacer: {
    height: 24, // Espace uniforme entre les sections
  },
  inputContainer: {
    marginBottom: 0, // Supprimé pour utiliser le spacer à la place
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
    paddingVertical: 16,
    minHeight: 100,
  },
  placeholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#94a3b8',
  },
  urgencySelector: {
    marginBottom: 0, // Supprimé pour uniformiser l'espacement
  },
  urgencyLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
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