import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Mail, Phone, User } from 'lucide-react-native';

interface ProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export default function EditProfileScreen() {
  const [form, setForm] = useState<ProfileForm>({
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
  });

  const [errors, setErrors] = useState<Partial<ProfileForm>>({});

  const validateForm = () => {
    const newErrors: Partial<ProfileForm> = {};

    if (!form.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!form.lastName.trim()) newErrors.lastName = 'Le nom est requis';
    if (!form.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    if (!form.phone.trim()) newErrors.phone = 'Le téléphone est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Here you would typically update the profile data
      router.back();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Modifier mon profil</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>Informations personnelles</Text>
          <Text style={styles.formSubtitle}>
            Modifiez vos informations personnelles ci-dessous
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Prénom</Text>
          <View style={[styles.inputWrapper, errors.firstName && styles.inputWrapperError]}>
            <User size={20} color={errors.firstName ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.input}
              value={form.firstName}
              onChangeText={(text) => setForm(prev => ({ ...prev, firstName: text }))}
              placeholder="Prénom"
              autoCapitalize="words"
            />
          </View>
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nom</Text>
          <View style={[styles.inputWrapper, errors.lastName && styles.inputWrapperError]}>
            <User size={20} color={errors.lastName ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.input}
              value={form.lastName}
              onChangeText={(text) => setForm(prev => ({ ...prev, lastName: text }))}
              placeholder="Nom"
              autoCapitalize="words"
            />
          </View>
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
            <Mail size={20} color={errors.email ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={(text) => setForm(prev => ({ ...prev, email: text }))}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Téléphone</Text>
          <View style={[styles.inputWrapper, errors.phone && styles.inputWrapperError]}>
            <Phone size={20} color={errors.phone ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(text) => setForm(prev => ({ ...prev, phone: text }))}
              placeholder="Téléphone"
              keyboardType="phone-pad"
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
        </View>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  form: {
    padding: 24,
    gap: 24,
  },
  formHeader: {
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 48,
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
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
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
    marginTop: 16,
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