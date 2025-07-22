import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Upload, FileText, User, Bot as Boat, Calendar, Plus, X, Check, Download, Euro, Trash } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

interface Service {
  id: string;
  name: string;
  description: string;
  amount: number;
}

interface QuoteUploadForm {
  requestId: string; // Added to link to service_request
  title: string;
  clientId: string;
  clientName: string;
  boatId: string; // This should be the actual boat ID (string representation of integer)
  boatName: string;
  boatType: string;
  validUntil: string;
  services: Service[];
  file?: {
    name: string;
    uri: string;
    type: string;
  };
}

export default function QuoteUploadScreen() {
  const { requestId, clientId, boatId } = useLocalSearchParams<{
    requestId?: string;
    clientId?: string;
    boatId?: string;
  }>();
  
  const { user } = useAuth();
  const [uploadMethod, setUploadMethod] = useState<'create' | 'upload' | null>(null);
  const [showMethodModal, setShowMethodModal] = useState(true);
  const [loading, setLoading] = useState(true);
  const [requestDetails, setRequestDetails] = useState<any>(null); // To store fetched request details

  // Définir la date de validité par défaut (30 jours à partir d'aujourd'hui)
  const defaultValidUntil = new Date();
  defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
  const defaultValidUntilStr = defaultValidUntil.toISOString().split('T')[0];
  
  const [form, setForm] = useState<QuoteUploadForm>({
    requestId: requestId || '',
    title: requestId ? 'Devis pour demande #' + requestId : '',
    clientId: clientId || '',
    clientName: '', // Will be fetched
    boatId: boatId || '', // Will be fetched
    boatName: '', // Will be fetched
    boatType: '', // Will be fetched
    validUntil: defaultValidUntilStr,
    services: [
      {
        id: '1',
        name: '',
        description: '',
        amount: 0
      }
    ],
    file: undefined,
  });
  
  const [errors, setErrors] = useState<Partial<Record<keyof QuoteUploadForm | 'services', string>>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!requestId || !clientId || !boatId) {
        Alert.alert('Erreur', 'Informations de demande, client ou bateau manquantes.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch service request details
        const { data: reqData, error: reqError } = await supabase
          .from('service_request')
          .select(`
            *,
            users!id_client(first_name, last_name, e_mail),
            boat(name, type)
          `)
          .eq('id', parseInt(requestId))
          .single();

        if (reqError || !reqData) {
          console.error('Error fetching service request:', reqError);
          Alert.alert('Erreur', 'Impossible de charger les détails de la demande.');
          setLoading(false);
          return;
        }
        setRequestDetails(reqData);

        setForm(prev => ({
          ...prev,
          clientName: `${reqData.users.first_name} ${reqData.users.last_name}`,
          boatName: reqData.boat.name,
          boatType: reqData.boat.type,
          // Pre-fill title if it's empty and request has a description
          title: prev.title || reqData.description || `Devis pour demande #${requestId}`,
        }));

      } catch (e) {
        console.error('Unexpected error fetching initial data:', e);
        Alert.alert('Erreur', 'Une erreur inattendue est survenue lors du chargement des données.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [requestId, clientId, boatId]);


  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setForm(prev => ({
          ...prev,
          file: {
            name: file.name,
            uri: file.uri,
            type: file.mimeType || 'application/pdf',
          }
        }));
        
        // Effacer l'erreur si elle existe
        if (errors.file) {
          setErrors(prev => ({ ...prev, file: undefined }));
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sélection du fichier.');
    }
  };

  const addService = () => {
    setForm(prev => ({
      ...prev,
      services: [
        ...prev.services,
        {
          id: Date.now().toString(),
          name: '',
          description: '',
          amount: 0
        }
      ]
    }));
  };

  const removeService = (id: string) => {
    if (form.services.length <= 1) {
      return; // Garder au moins un service
    }
    
    setForm(prev => ({
      ...prev,
      services: prev.services.filter(service => service.id !== id)
    }));
  };

  const updateService = (id: string, field: keyof Service, value: string | number) => {
    setForm(prev => ({
      ...prev,
      services: prev.services.map(service => 
        service.id === id ? { ...service, [field]: value } : service
      )
    }));
  };

  const totalAmount = form.services.reduce((sum, service) => sum + service.amount, 0);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof QuoteUploadForm | 'services', string>> = {};
    
    if (!form.clientName) newErrors.clientName = 'Le client est requis';
    if (!form.boatName) newErrors.boatName = 'Le bateau est requis';
    
    if (uploadMethod === 'create') {
      if (!form.title.trim()) newErrors.title = 'Le titre est requis';
      if (!form.validUntil.trim()) newErrors.validUntil = 'La date de validité est requise';
      
      // Vérifier que chaque service a un nom et une description
      const invalidServices = form.services.some(service => !service.name.trim() || !service.description.trim());
      if (invalidServices) {
        newErrors.services = 'Tous les services doivent avoir un nom et une description';
      }
      
      // Vérifier que le montant total est supérieur à 0
      if (totalAmount <= 0) {
        newErrors.services = 'Le montant total doit être supérieur à 0';
      }
    } else if (uploadMethod === 'upload') {
      if (!form.file) newErrors.file = 'Le fichier du devis est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };
  
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    if (!requestDetails || !user?.id) {
      Alert.alert('Erreur', 'Données de requête ou utilisateur non disponibles.');
      return;
    }

    let fileUrl: string | null = null;
    if (uploadMethod === 'upload' && form.file) {
      try {
        const fileExtension = form.file.name.split('.').pop();
        const filePath = `quotes/${form.requestId}/${Date.now()}.${fileExtension}`;
        const response = await fetch(form.file.uri);
        const blob = await response.blob();

        const { data, error: uploadError } = await supabase.storage
          .from('quotes') // Assuming a bucket named 'quotes'
          .upload(filePath, blob, {
            contentType: form.file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          Alert.alert('Erreur', `Échec du téléchargement du fichier: ${uploadError.message}`);
          return;
        }
        fileUrl = supabase.storage.from('quotes').getPublicUrl(filePath).data.publicUrl;
      } catch (e) {
        console.error('Error processing file upload:', e);
        Alert.alert('Erreur', 'Une erreur est survenue lors du traitement du fichier.');
        return;
      }
    }

    try {
      const { error: updateError } = await supabase
        .from('service_request')
        .update({
          statut: 'quote_sent',
          prix: totalAmount,
          note_add: fileUrl ? `Devis PDF: ${fileUrl}` : form.notes, // Store file URL in note_add
          // Other fields from the form could be mapped if needed, e.g., description, date
          // For simplicity, we only update status and price here.
        })
        .eq('id', parseInt(form.requestId));

      if (updateError) {
        console.error('Error updating service request:', updateError);
        Alert.alert('Erreur', `Échec de l'envoi du devis: ${updateError.message}`);
      } else {
        const message = `Le devis a été envoyé avec succès au client.`;
        Alert.alert(
          'Devis envoyé',
          message,
          [
            {
              text: 'OK',
              onPress: () => {
                router.back(); // Go back to requests list
              }
            }
          ]
        );
      }
    } catch (e) {
      console.error('Unexpected error during quote submission:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de la soumission du devis.');
    }
  };
  
  const MethodSelectionModal = () => (
    <Modal
      visible={showMethodModal && !loading} // Only show if not loading
      transparent
      animationType="slide"
      onRequestClose={() => {
        setShowMethodModal(false);
        router.back();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choisir une méthode</Text>
          <Text style={styles.modalSubtitle}>Comment souhaitez-vous créer votre devis ?</Text>
          
          <TouchableOpacity 
            style={styles.methodOption}
            onPress={() => {
              setUploadMethod('create');
              setShowMethodModal(false);
            }}
          >
            <Plus size={24} color="#0066CC" />
            <View style={styles.methodOptionContent}>
              <Text style={styles.methodOptionTitle}>Créer un devis</Text>
              <Text style={styles.methodOptionDescription}>
                Créez un devis directement dans l'application
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.methodOption}
            onPress={() => {
              setUploadMethod('upload');
              setShowMethodModal(false);
            }}
          >
            <Upload size={24} color="#0066CC" />
            <View style={styles.methodOptionContent}>
              <Text style={styles.methodOptionTitle}>Déposer un devis</Text>
              <Text style={styles.methodOptionDescription}>
                Déposez un fichier PDF de devis existant
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => {
              setShowMethodModal(false);
              router.back();
            }}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
  
  const ConfirmationModal = () => (
    <Modal
      visible={showConfirmModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Confirmer l'envoi</Text>
          <Text style={styles.modalSubtitle}>
            Vous êtes sur le point d'envoyer un devis à {form.clientName}.
          </Text>
          
          <View style={styles.confirmationDetails}>
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Client:</Text>
              <Text style={styles.confirmationValue}>{form.clientName}</Text>
            </View>
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Bateau:</Text>
              <Text style={styles.confirmationValue}>{form.boatName} ({form.boatType})</Text>
            </View>
            {uploadMethod === 'create' ? (
              <>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>Montant:</Text>
                  <Text style={styles.confirmationValue}>{totalAmount.toFixed(2)} €</Text>
                </View>
                <View style={styles.confirmationRow}>
                  <Text style={styles.confirmationLabel}>Validité:</Text>
                  <Text style={styles.confirmationValue}>
                    {new Date(form.validUntil).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>Fichier:</Text>
                <Text style={styles.confirmationValue}>{form.file?.name}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.modalCancelButton}
              onPress={() => setShowConfirmModal(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.modalConfirmButton}
              onPress={handleConfirmSubmit}
            >
              <Text style={styles.modalConfirmText}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCreateForm = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations du devis</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Titre du devis</Text>
          <View style={[styles.inputWrapper, errors.title && styles.inputWrapperError]}>
            <FileText size={20} color={errors.title ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.input}
              value={form.title}
              onChangeText={(text) => {
                setForm(prev => ({ ...prev, title: text }));
                if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
              }}
              placeholder="Titre du devis"
            />
          </View>
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date de validité</Text>
          <View style={[styles.inputWrapper, errors.validUntil && styles.inputWrapperError]}>
            <Calendar size={20} color={errors.validUntil ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.input}
              value={form.validUntil}
              onChangeText={(text) => {
                setForm(prev => ({ ...prev, validUntil: text }));
                if (errors.validUntil) setErrors(prev => ({ ...prev, validUntil: undefined }));
              }}
              placeholder="AAAA-MM-JJ"
            />
          </View>
          {errors.validUntil && <Text style={styles.errorText}>{errors.validUntil}</Text>}
        </View>
        
        <View style={styles.servicesSection}>
          <View style={styles.servicesSectionHeader}>
            <Text style={styles.servicesSectionTitle}>Services</Text>
            <TouchableOpacity 
              style={styles.addServiceButton}
              onPress={addService}
            >
              <Plus size={20} color="#0066CC" />
              <Text style={styles.addServiceButtonText}>Ajouter un service</Text>
            </TouchableOpacity>
          </View>
          
          {errors.services && <Text style={styles.errorText}>{errors.services}</Text>}
          
          {form.services.map((service, index) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceCardHeader}>
                <Text style={styles.serviceCardTitle}>Service {index + 1}</Text>
                {form.services.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeServiceButton}
                    onPress={() => removeService(service.id)}
                  >
                    <Trash size={20} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.serviceInputContainer}>
                <Text style={styles.serviceLabel}>Nom du service</Text>
                <TextInput
                  style={styles.serviceInput}
                  value={service.name}
                  onChangeText={(text) => updateService(service.id, 'name', text)}
                  placeholder="ex: Entretien moteur"
                />
              </View>
              
              <View style={styles.serviceInputContainer}>
                <Text style={styles.serviceLabel}>Description</Text>
                <TextInput
                  style={styles.serviceTextArea}
                  value={service.description}
                  onChangeText={(text) => updateService(service.id, 'description', text)}
                  placeholder="Description détaillée du service"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.serviceInputContainer}>
                <Text style={styles.serviceLabel}>Montant (€)</Text>
                <View style={styles.amountInputContainer}>
                  <Euro size={20} color="#666" />
                  <TextInput
                    style={styles.amountInput}
                    value={service.amount.toString()}
                    onChangeText={(text) => {
                      // Accepter uniquement les chiffres et le point décimal
                      const filteredText = text.replace(/[^0-9.]/g, '');
                      updateService(service.id, 'amount', parseFloat(filteredText) || 0);
                    }}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          ))}
          
          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>Total TTC</Text>
            <Text style={styles.totalAmount}>{totalAmount.toFixed(2)} €</Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.submitButton}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Envoyer le devis</Text>
      </TouchableOpacity>
    </>
  );
  
  const renderUploadForm = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Déposer un devis existant</Text>
        
        <TouchableOpacity 
          style={[styles.fileUploadButton, errors.file && styles.fileUploadButtonError]}
          onPress={handleSelectFile}
        >
          <Upload size={24} color={errors.file ? '#ff4444' : '#0066CC'} />
          <Text style={[styles.fileUploadText, errors.file && styles.fileUploadTextError]}>
            {form.file ? form.file.name : "Sélectionner un fichier PDF"}
          </Text>
        </TouchableOpacity>
        {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}
        
        {form.file && (
          <View style={styles.selectedFileContainer}>
            <FileText size={20} color="#0066CC" />
            <Text style={styles.selectedFileName}>{form.file.name}</Text>
            <TouchableOpacity
              style={styles.removeFileButton}
              onPress={() => setForm(prev => ({ ...prev, file: undefined }))}
            >
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Montant du devis (€) - Optionnel</Text>
          <View style={styles.amountInputContainer}>
            <Euro size={20} color="#666" />
            <TextInput
              style={styles.amountInput}
              value={totalAmount > 0 ? totalAmount.toString() : ''}
              onChangeText={(text) => {
                // Accepter uniquement les chiffres et le point décimal
                const filteredText = text.replace(/[^0-9.]/g, '');
                const amount = parseFloat(filteredText) || 0;
                
                // Mettre à jour le premier service avec le montant total
                if (form.services.length > 0) {
                  updateService(form.services[0].id, 'amount', amount);
                }
              }}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date de validité - Optionnel</Text>
          <View style={styles.inputWrapper}>
            <Calendar size={20} color="#666" />
            <TextInput
              style={styles.input}
              value={form.validUntil}
              onChangeText={(text) => {
                setForm(prev => ({ ...prev, validUntil: text }));
              }}
              placeholder="AAAA-MM-JJ"
            />
          </View>
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Note additionnelle - Optionnel</Text>
          <View style={styles.textAreaWrapper}>
            <TextInput
              style={styles.textArea}
              value={form.services[0]?.description || ''}
              onChangeText={(text) => {
                if (form.services.length > 0) {
                  updateService(form.services[0].id, 'description', text);
                }
              }}
              placeholder="Ajoutez une note pour le client"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.submitButton}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>Envoyer le devis</Text>
      </TouchableOpacity>
    </>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Chargement des données...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {uploadMethod === 'create' ? 'Créer un devis' : 
           uploadMethod === 'upload' ? 'Déposer un devis' : 
           'Nouveau devis'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Client and Boat Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informations client</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <User size={20} color="#0066CC" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Client</Text>
                  <Text style={styles.infoValue}>{form.clientName || 'Non spécifié'}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Boat size={20} color="#0066CC" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Bateau</Text>
                  <Text style={styles.infoValue}>
                    {form.boatName ? `${form.boatName} (${form.boatType})` : 'Non spécifié'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Form based on selected method */}
          {uploadMethod === 'create' && renderCreateForm()}
          {uploadMethod === 'upload' && renderUploadForm()}
        </View>
      </ScrollView>
      
      <MethodSelectionModal />
      <ConfirmationModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
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
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 16,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
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
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    height: 48,
  },
  amountInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
    height: '100%',
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
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  fileUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    padding: 24,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  fileUploadButtonError: {
    backgroundColor: '#fff5f5',
    borderColor: '#ff4444',
  },
  fileUploadText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  fileUploadTextError: {
    color: '#ff4444',
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  selectedFileName: {
    flex: 1,
    fontSize: 14,
    color: '#0066CC',
    marginLeft: 12,
  },
  removeFileButton: {
    padding: 4,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  methodOptionContent: {
    flex: 1,
  },
  methodOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  methodOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '500',
  },
  confirmationDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  confirmationRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  confirmationLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  confirmationValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  servicesSection: {
    marginTop: 16,
  },
  servicesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  servicesSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
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
  serviceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  serviceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  removeServiceButton: {
    padding: 8,
  },
  serviceInputContainer: {
    marginBottom: 12,
  },
  serviceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  serviceInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  serviceTextArea: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    fontSize: 16,
    color: '#1a1a1a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066CC',
  },
});
