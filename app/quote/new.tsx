import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { ArrowLeft, Plus, Trash, Bot as Boat, User, Calendar, FileText, Euro } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';

interface Service {
  id: string;
  name: string;
  description: string;
  amount: number;
}

interface QuoteForm {
  client: {
    id: string;
    name: string;
    email: string;
  };
  boat: {
    id: string;
    name: string;
    type: string;
  };
  validUntil: string;
  services: Service[];
  requestId?: string;
}

export default function NewQuoteScreen() {
  const params = useLocalSearchParams();
  const [form, setForm] = useState<QuoteForm>({
    client: {
      id: '',
      name: '',
      email: '',
    },
    boat: {
      id: '',
      name: '',
      type: '',
    },
    validUntil: '',
    services: [
      {
        id: '1',
        name: '',
        description: '',
        amount: 0,
      },
    ],
    requestId: '',
  });

  // Pre-fill form with data from params if available
  useState(() => {
    if (params) {
      setForm(prevForm => {
        const updatedForm = { ...prevForm };
        
        if (params.clientId && params.clientName && params.clientEmail) {
  updatedForm.client = {
    id: params.clientId as string,
    name: params.clientName as string,
    email: params.clientEmail as string, // <-- Ajout ici
  };
}
        
        if (params.boatName && params.boatType) {
          updatedForm.boat = {
            id: params.boatId as string || '',
            name: params.boatName as string,
            type: params.boatType as string,
          };
        }
        
        if (params.requestId) {
          updatedForm.requestId = params.requestId as string;
        }
        
        // Set default validity to 30 days from now
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + 30);
        updatedForm.validUntil = validUntil.toISOString().split('T')[0];
        
        return updatedForm;
      });
    }
  });

  const addService = () => {
    setForm(prev => ({
      ...prev,
      services: [
        ...prev.services,
        {
          id: Date.now().toString(),
          name: '',
          description: '',
          amount: 0,
        },
      ],
    }));
  };

  const removeService = (id: string) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.filter(service => service.id !== id),
    }));
  };

  const updateService = (id: string, field: keyof Service, value: string | number) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.map(service =>
        service.id === id ? { ...service, [field]: value } : service
      ),
    }));
  };

  const totalAmount = form.services.reduce((sum, service) => sum + service.amount, 0);

  const validateForm = () => {
    if (!form.client.name) {
      Alert.alert('Erreur', 'Veuillez saisir le nom du client');
      return false;
    }
    
    if (!form.boat.name || !form.boat.type) {
      Alert.alert('Erreur', 'Veuillez saisir les informations du bateau');
      return false;
    }
    
    if (!form.validUntil) {
      Alert.alert('Erreur', 'Veuillez saisir une date de validité');
      return false;
    }
    
    if (form.services.some(service => !service.name || !service.description)) {
      Alert.alert('Erreur', 'Veuillez compléter tous les services');
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // In a real app, this would send the data to your backend
      Alert.alert(
        'Confirmation',
        'Souhaitez-vous créer ce devis ?',
        [
          {
            text: 'Annuler',
            style: 'cancel'
          },
          {
            text: 'Créer',
            onPress: () => {
              Alert.alert(
                'Succès',
                'Le devis a été créé avec succès et envoyé au client.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back()
                  }
                ]
              );
            }
          }
        ]
      );
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
        <Text style={styles.title}>Nouveau devis</Text>
      </View>

      <View style={styles.content}>
        {/* Request Info (if from a request) */}
        {form.requestId && (
          <View style={styles.requestInfoCard}>
            <View style={styles.requestInfoHeader}>
              <FileText size={20} color="#0066CC" />
              <Text style={styles.requestInfoTitle}>Devis lié à une demande</Text>
            </View>
            <Text style={styles.requestInfoText}>
              Ce devis est lié à la demande #{form.requestId}. Une fois le devis créé, le client en sera notifié.
            </Text>
          </View>
        )}
        
        {/* Client Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <User size={20} color="#0066CC" />
              <Text style={styles.cardTitle}>Informations client</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom du client</Text>
              <TextInput
                style={styles.input}
                value={form.client.name}
                editable={false} 
                onChangeText={(text) => setForm(prev => ({
                  ...prev,
                  client: { ...prev.client, name: text }
                }))}
                placeholder="Nom du client"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
  style={[styles.input, { backgroundColor: '#e2e8f0' }]}
  value={form.client.email}
  editable={false} // 👈 REND LE CHAMP NON MODIFIABLE
  placeholder="Email du client"
  keyboardType="email-address"
/>
            </View>
          </View>
        </View>

        {/* Boat Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bateau</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Boat size={20} color="#0066CC" />
              <Text style={styles.cardTitle}>Informations bateau</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nom du bateau</Text>
              <TextInput
                style={styles.input}
                value={form.boat.name}
                editable={false} 
                onChangeText={(text) => setForm(prev => ({
                  ...prev,
                  boat: { ...prev.boat, name: text }
                }))}
                placeholder="Nom du bateau"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Type</Text>
              <TextInput
                style={styles.input}
                value={form.boat.type}
                editable={false}
                onChangeText={(text) => setForm(prev => ({
                  ...prev,
                  boat: { ...prev.boat, type: text }
                }))}
                placeholder="Type de bateau"
              />
            </View>
          </View>
        </View>

        {/* Validity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Validité</Text>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Calendar size={20} color="#0066CC" />
              <Text style={styles.cardTitle}>Date de validité</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Valable jusqu'au</Text>
              <TextInput
                style={styles.input}
                value={form.validUntil}
                onChangeText={(text) => setForm(prev => ({
                  ...prev,
                  validUntil: text
                }))}
                placeholder="AAAA-MM-JJ"
              />
            </View>
          </View>
        </View>

        {/* Services Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services</Text>
            <TouchableOpacity 
              style={styles.addServiceButton}
              onPress={addService}
            >
              <Plus size={20} color="#0066CC" />
              <Text style={styles.addServiceButtonText}>Ajouter un service</Text>
            </TouchableOpacity>
          </View>

          {form.services.map((service, index) => (
            <View key={service.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Service {index + 1}</Text>
                {index > 0 && (
                  <TouchableOpacity
                    style={styles.removeServiceButton}
                    onPress={() => removeService(service.id)}
                  >
                    <Trash size={20} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Nom du service</Text>
                <TextInput
                  style={styles.input}
                  value={service.name}
                  onChangeText={(text) => updateService(service.id, 'name', text)}
                  placeholder="Nom du service"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={service.description}
                  onChangeText={(text) => updateService(service.id, 'description', text)}
                  placeholder="Description du service"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Montant (€)</Text>
                <View style={styles.amountInputContainer}>
                  <Euro size={20} color="#666" />
                  <TextInput
                    style={styles.amountInput}
                    value={service.amount.toString()}
                    onChangeText={(text) => {
                      const amount = text.replace(/[^0-9.]/g, '');
                      updateService(service.id, 'amount', parseFloat(amount) || 0);
                    }}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Total Section */}
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total TTC</Text>
          <Text style={styles.totalAmount}>{totalAmount.toFixed(2)} €</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Créer le devis</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  content: {
    padding: 20,
  },
  requestInfoCard: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  requestInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  requestInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  requestInfoText: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 8,
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
  },
  addServiceButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  removeServiceButton: {
    padding: 8,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});