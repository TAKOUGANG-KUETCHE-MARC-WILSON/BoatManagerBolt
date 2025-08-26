import { useState, useEffect , useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native';
import { withAuthCheck } from '@/context/AuthContext';

// types
type Field = {
  name: string;
  label: string;
  placeholder?: string;
  icon?: any;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
};

type ServiceFormProps = {
  title: string | React.ReactNode;
  description?: string;
  fields: Field[];
  submitLabel?: string;
  onSubmit: (formData: Record<string, string>) => void;
  customContent?: React.ReactNode;
  initialValues?: Record<string, string>; // <-- NOUVEAU
};

function ServiceForm({
  title,
  description,
  fields,
  submitLabel = 'Valider',
  onSubmit,
  customContent,
  initialValues = {}, // <-- Valeur par défaut
}: ServiceFormProps) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const base = Object.fromEntries(fields.map(f => [f.name, '']));
    return { ...base, ...initialValues }; // <-- Pré-remplissage au mount
  });

  // clefs stables pour déclencher l'effet seulement si le CONTENU change
const fieldsKey = useMemo(() => fields.map(f => f.name).join('|'), [fields]);
const initialValuesKey = useMemo(() => JSON.stringify(initialValues ?? {}), [initialValues]);


  useEffect(() => {
  const next: Record<string, string> = {};
  fields.forEach(field => {
    next[field.name] = initialValues[field.name] ?? '';
  });

  // Ne met à jour l'état que si ça change VRAIMENT
  setForm(prev => {
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    if (prevKeys.length !== nextKeys.length) return next;
    for (const k of nextKeys) {
      if ((prev[k] ?? '') !== (next[k] ?? '')) return next;
    }
    return prev; // identique → pas de re-render
  });
}, [initialValuesKey, fieldsKey]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    fields.forEach(field => {
      if (!form[field.name]?.trim()) { // Utilise 'form' au lieu de 'formData'
        newErrors[field.name] = 'Ce champ est requis';
        hasErrors = true;
      }
    });

    setErrors(newErrors);

    return !hasErrors;
  };

  const handleSubmitLocal = () => { // Renommé pour éviter le conflit avec la prop onSubmit
    if (validateForm()) {
      onSubmit(form); // Utilise 'form' au lieu de 'formData'
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        {typeof title === 'string' ? (
          <Text style={styles.sectionTitle}>{title}</Text>
        ) : (
          title
        )}
        {description && <Text style={styles.sectionDescription}>{description}</Text>}
      </View>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          {fields.map((field, index) => (
            <View key={field.name} style={[ // Utilise field.name comme clé
              styles.inputContainer,
              field.multiline && styles.fullHeightInputContainer
            ]}>
              <Text style={styles.label}>{field.label}</Text>
              <View style={[
                styles.inputWrapper,
                field.multiline && styles.multilineInputWrapper,
                errors[field.name] && styles.inputWrapperError
              ]}>
                {field.icon && <field.icon size={20} color={errors[field.name] ? '#ff4444' : '#666'} />}
                <TextInput
                  style={[
                    styles.input,
                    field.multiline && styles.multilineInput
                  ]}
                  placeholder={field.placeholder}
                  value={String(form[field.name] ?? '')} // Utilise 'form' et nullish coalescing, convertit en String
                  onChangeText={(text) => {
                    setForm(prev => ({ ...prev, [field.name]: text }));
                    if (errors[field.name]) {
                      setErrors(prev => ({ ...prev, [field.name]: '' }));
                    }
                  }}
                  multiline={field.multiline}
                  numberOfLines={field.multiline ? 20 : 1}
                  keyboardType={field.keyboardType || 'default'}
                  textAlignVertical={field.multiline ? 'top' : 'center'}
                />
              </View>
              {errors[field.name] && (
                <Text style={styles.errorText}>{errors[field.name]}</Text>
              )}
            </View>
          ))}
        </View>
        
        {customContent}
        
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmitLocal}> {/* Utilise handleSubmitLocal */}
          <Text style={styles.submitButtonText}>{submitLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  form: {
    gap: 24,
    flex: 1,
  },
  inputGroup: {
    gap: 16,
    flex: 1,
  },
  inputContainer: {
    gap: 4,
  },
  fullHeightInputContainer: {
    flex: 1,
    minHeight: 300,
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
    minHeight: 48,
  },
  multilineInputWrapper: {
    alignItems: 'flex-start',
    paddingTop: 12,
    paddingBottom: 12,
    flex: 1,
  },
  inputWrapperError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 12,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  multilineInput: {
    height: '100%',
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default withAuthCheck(ServiceForm);
