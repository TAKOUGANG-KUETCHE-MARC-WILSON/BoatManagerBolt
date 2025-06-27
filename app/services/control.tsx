import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Check, Shield, Zap, Anchor, Navigation, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';

interface CheckItem {
  id: string;
  label: string;
  checked: boolean;
}

export default function ControlScreen() {
  const [checkItems, setCheckItems] = useState<CheckItem[]>([
    { id: 'all_equipment', label: 'Contrôle de tous les équipements', checked: false },
    { id: 'security', label: 'Armements de sécurité', checked: false },
    { id: 'hull', label: 'Coque', checked: false },
    { id: 'etancheite', label: 'Etanchéité', checked: false },
    { id: 'electrical', label: 'Equipements électriques', checked: false },
    { id: 'electronic', label: 'Equipements électroniques', checked: false },
    { id: 'rigging', label: 'Voiles et Gréements', checked: false },
    { id: 'mooring', label: 'Amarrage', checked: false },
    { id: 'security_system', label: 'Système de sécurité (Alarme, intrusion, géolocalisation, ...)', checked: false },
    { id: 'bilge_pump', label: 'Pompe de cale', checked: false },
    { id: 'tauds_housses', label: 'Fixation Tauds / Housses', checked: false },
    { id: 'alimentation_quai', label: 'Alimentation à quai', checked: false },
    { id: 'tension_batteries', label: 'Tension des batteries', checked: false },
    { id: 'niveaux', label: 'Contrôle des niveaux (carburant, huile, eau, ...)', checked: false },
  ]);
  
  const [otherText, setOtherText] = useState('');
  const [otherChecked, setOtherChecked] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<'normal' | 'urgent'>('normal');

  const handleToggleCheck = (id: string) => {
    if (id === 'all_equipment') {
      // If "Check all equipment" is toggled, update its state
      const allEquipmentChecked = !checkItems.find(item => item.id === 'all_equipment')?.checked;
      
      // If checking "all equipment", uncheck all other items
      if (allEquipmentChecked) {
        setCheckItems(prev => 
          prev.map(item => 
            item.id === 'all_equipment' ? { ...item, checked: true } : { ...item, checked: false }
          )
        );
      } else {
        // Just uncheck the "all equipment" option
        setCheckItems(prev => 
          prev.map(item => 
            item.id === 'all_equipment' ? { ...item, checked: false } : item
          )
        );
      }
    } else {
      // If any other item is checked, uncheck the "all equipment" option
      setCheckItems(prev => 
        prev.map(item => 
          item.id === id ? { ...item, checked: !item.checked } : 
          item.id === 'all_equipment' ? { ...item, checked: false } : item
        )
      );
    }
  };
  
  const handleToggleOther = () => {
    setOtherChecked(!otherChecked);
    // If checking "other", uncheck "all equipment"
    if (!otherChecked) {
      setCheckItems(prev => 
        prev.map(item => 
          item.id === 'all_equipment' ? { ...item, checked: false } : item
        )
      );
    }
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
        <Text style={styles.checkboxLabel}>Autre besoin</Text>
      </TouchableOpacity>
      
      {otherChecked && (
        <View style={styles.otherInputContainer}>
          <TextInput
            style={styles.otherInput}
            value={otherText}
            onChangeText={setOtherText}
            placeholder="Instructions particulières"
            multiline
          />
        </View>
      )}
    </View>
  );

  const UrgencySelector = () => (
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
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <ServiceForm
          title="Vérification de l'état de votre bateau"
          description="Expression de mon besoin"
          fields={[]}
          submitLabel="Envoyer"
          onSubmit={handleSubmit}
          customContent={
            <>
              <CheckboxList />
              <UrgencySelector />
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
  }
});