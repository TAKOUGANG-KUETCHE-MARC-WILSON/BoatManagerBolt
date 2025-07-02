import { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, TextInput } from 'react-native';
import { Check } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
}

// Moved CheckboxList component outside AccessScreen
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
        <Text style={componentStyles.checkboxLabel}>Autre besoin</Text>
      </TouchableOpacity>

      {otherChecked && (
        <View style={componentStyles.otherInputContainer}>
          <TextInput
            style={componentStyles.otherInput}
            value={otherText}
            onChangeText={setOtherText}
            placeholder="Instructions particulières"
            multiline
          />
        </View>
      )}
    </View>
  );
};

export default function AccessScreen() {
  const [checkItems, setCheckItems] = useState<CheckItem[]>([
    { id: 'key_management', label: 'Conservation des clés', checked: false },
    { id: 'key_delivery', label: 'Remise / Récupération des clés au bon destinataire', checked: false },
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
      other: otherChecked ? otherText : null
    };

    console.log('Form submitted:', formDataWithChecks);
    // Handle form submission
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <ServiceForm
          title="Gestion des accès à mon bateau"
          description="Expression de mon besoin"
          fields={[]}
          submitLabel="Envoyer"
          onSubmit={handleSubmit}
          customContent={
            <CheckboxList
              checkItems={checkItems}
              setCheckItems={setCheckItems}
              otherText={otherText}
              setOtherText={setOtherText}
              otherChecked={otherChecked}
              setOtherChecked={setOtherChecked}
              componentStyles={styles} // Pass styles to the component
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
  },
  checkboxContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
    marginTop: 8,
    marginBottom: 8,
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
  }
});
