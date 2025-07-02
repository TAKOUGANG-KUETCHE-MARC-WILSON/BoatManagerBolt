import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, TextInput } from 'react-native';
import { PenTool as Tool, Wrench, Settings, Gauge, Bot as Boat, Navigation, Check, TriangleAlert as AlertTriangle, Calendar } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
}

// Extracted CheckboxList component
const CheckboxList = ({ checkItems, setCheckItems, otherText, setOtherText, otherChecked, setOtherChecked, componentStyles }) => {
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

  return (
    <View style={componentStyles.checkboxContainer}>
      {checkItems.map(item => (
        <TouchableOpacity
          key={item.id}
          style={componentStyles.checkboxRow}
          onPress={() => handleToggleCheck(item.id)}
          activeOpacity={0.7}
        >
          <View style={[componentStyles.checkbox, item.checked && componentStyles.checkboxChecked]}>
            {item.checked && <Check size={16} color="white" />}
          </View>
          <Text style={componentStyles.checkboxLabel}>{item.label}</Text>
        </TouchableOpacity>
      ))}

      {/* Other option with text input */}
      <TouchableOpacity
        style={componentStyles.checkboxRow}
        onPress={() => handleToggleOther()}
        activeOpacity={0.7}
      >
        <View style={[componentStyles.checkbox, otherChecked && componentStyles.checkboxChecked]}>
          {otherChecked && <Check size={16} color="white" />}
        </View>
        <Text style={componentStyles.checkboxLabel}>Autre demande d'entretien</Text>
      </TouchableOpacity>

      {otherChecked && (
        <View style={componentStyles.otherInputContainer}>
          <TextInput
            style={componentStyles.otherInput}
            value={otherText}
            onChangeText={setOtherText}
            placeholder="Précisez votre demande"
            multiline
          />
        </View>
      )}
    </View>
  );
};

// Extracted UrgencySelector component
const UrgencySelector = ({ urgencyLevel, setUrgencyLevel, componentStyles }) => {
  return (
    <View style={componentStyles.urgencySelector}>
      <Text style={componentStyles.urgencySelectorTitle}>Niveau d'urgence</Text>
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
              <CheckboxList
                checkItems={checkItems}
                setCheckItems={setCheckItems}
                otherText={otherText}
                setOtherText={setOtherText}
                otherChecked={otherChecked}
                setOtherChecked={setOtherChecked}
                componentStyles={styles}
              />
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
