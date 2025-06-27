import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, TextInput } from 'react-native';
import { PenTool as Tool, Wrench, Settings, Gauge, Bot as Boat, Navigation, Check, TriangleAlert as AlertTriangle, Calendar } from 'lucide-react-native';
import { router } from 'expo-router';
import ServiceForm from '@/components/ServiceForm';

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
}

export default function MaintenanceScreen() {
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'urgent'>('normal');
  const [checkItems, setCheckItems] = useState<CheckItem[]>([
    { id: 'engine', label: 'Entretien moteur', checked: false },
    { id: 'accastillage', label: 'Entretien accastillage', checked: false },
    { id: 'electrical', label: 'Entretien électrique', checked: false },
    { id: 'hull', label: 'Entretien coque', checked: false },
    { id: 'rigging', label: 'Entretien gréement', checked: false },
    { id: 'cleaning', label: 'Nettoyage', checked: false },
  ]);
  
  const [otherText, setOtherText] = useState('');
  const [otherChecked, setOtherChecked] = useState(false);

  const handleToggleCheck = (id: string) => {
    setCheckItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };
  
  const handleToggleOther = () => {
    setOtherChecked(!otherChecked);
  };

  const handleSubmit = (formData: any) => {
    // Add checked items to form data
    const selectedItems = checkItems
      .filter(item => item.checked)
      .map(item => item.label);
    
    const formDataWithChecks = {
      ...formData,
      selectedItems,
      other: otherChecked ? otherText : null,
      urgencyLevel
    };
    
    console.log('Form submitted:', formDataWithChecks);
    // Handle form submission
  };

  const CheckboxList = () => (
    <View style={styles.checkboxContainer}>
      {checkItems.map(item => (
        <TouchableOpacity 
          key={item.id}
          style={styles.checkboxRow}
          onPress={() => handleToggleCheck(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
            {item.checked && <Check size={16} color="white" />}
          </View>
          <Text style={styles.checkboxLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}
      
      {/* Other option with text input */}
      <TouchableOpacity 
        style={styles.checkboxRow}
        onPress={() => handleToggleOther()}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, otherChecked && styles.checkboxChecked]}>
          {otherChecked && <Check size={16} color="white" />}
        </View>
        <Text style={styles.checkboxLabel}>Autre demande d'entretien</Text>
      </TouchableOpacity>
      
      {otherChecked && (
        <View style={styles.otherInputContainer}>
          <TextInput
            style={styles.otherInput}
            value={otherText}
            onChangeText={setOtherText}
            placeholder="Précisez votre demande"
            multiline
          />
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <ServiceForm
          title="Demande d'entretien"
          description="Sélectionnez le type d'entretien souhaité"
          fields={[]}
          submitLabel="Envoyer"
          onSubmit={handleSubmit}
          customContent={
            <>
              <CheckboxList />
              <View style={styles.urgencySelector}>
                <Text style={styles.urgencySelectorTitle}>Niveau d'urgence</Text>
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
  checkboxContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0066CC',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0066CC',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  otherInputContainer: {
    marginLeft: 36,
    marginTop: 4,
  },
  otherInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
    minHeight: 80,
    textAlignVertical: 'top',
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
  }
});