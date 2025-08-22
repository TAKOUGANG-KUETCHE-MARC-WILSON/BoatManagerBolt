import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Upload, FileText, User, Bot as Boat, Calendar, X, Check, Euro } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Buffer } from 'buffer'; // Keep Buffer import for other potential uses, though not directly used for this fix
import * as FileSystem from 'expo-file-system'; // Keep FileSystem import for content:// URI handling

interface QuoteUploadForm {
  requestId: string;
  title: string;
  clientId: string;
  clientName: string;
  clientEmail: string; // Added for completeness
  boatId: string;
  boatName: string;
  boatType: string;
  validUntil: string; // Optional for uploaded document
  file?: {
    name: string;
    uri: string;
    type: string;
  };
  quoteId?: number; // To store the ID of the quotes entry
  notes?: string; // For optional notes
  amount?: number; // For optional amount
}

export default function UploadQuoteDocumentScreen() {
  const { requestId, clientId, clientName, clientEmail, boatId, boatName, boatType } = useLocalSearchParams<{
    requestId?: string;
    clientId?: string;
    clientName?: string;
    clientEmail?: string;
    boatId?: string;
    boatName?: string;
    boatType?: string;
  }>();

  const { user } = useAuth();
  const [form, setForm] = useState<QuoteUploadForm>({
    requestId: requestId || '',
    title: requestId ? 'Devis pour demande #' + requestId : '',
    clientId: clientId || '',
    clientName: clientName || '',
    clientEmail: clientEmail || '',
    boatId: boatId || '',
    boatName: boatName || '',
    boatType: boatType || '',
    validUntil: new Date().toISOString().split('T')[0], // Default to today
    file: undefined,
    notes: '',
    amount: undefined,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof QuoteUploadForm, string>>>({});
  const [loading, setLoading] = useState(true);
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
        // Fetch service request details to ensure data consistency
        const { data: reqData, error: reqError } = await supabase
          .from('service_request')
          .select(`
            id,
            description,
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

        setForm(prev => ({
          ...prev,
          clientName: reqData.users.first_name + ' ' + reqData.users.last_name,
          clientEmail: reqData.users.e_mail,
          boatName: reqData.boat.name,
          boatType: reqData.boat.type,
          title: prev.title || reqData.description || `Devis pour demande #${requestId}`,
        }));

        // Check if a quote already exists for this request
        const { data: existingQuote, error: quoteError } = await supabase
          .from('quotes')
          .select('id, file_url, total_incl_tax, valid_until, description')
          .eq('service_request_id', parseInt(requestId))
          .single();

        if (quoteError && quoteError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Error fetching existing quote:', quoteError);
          Alert.alert('Erreur', 'Impossible de vérifier l\'existence d\'un devis.');
          setLoading(false);
          return;
        }

        if (existingQuote) {
          setForm(prev => ({
            ...prev,
            quoteId: existingQuote.id,
            file: existingQuote.file_url ? { name: existingQuote.file_url.split('/').pop() || 'document.pdf', uri: existingQuote.file_url, type: 'application/pdf' } : undefined,
            amount: existingQuote.total_incl_tax || undefined,
            validUntil: existingQuote.valid_until || prev.validUntil,
            notes: existingQuote.description || prev.notes,
          }));
        }

      } catch (e) {
        console.error('Unexpected error fetching initial data:', e);
        Alert.alert('Erreur', 'Une erreur inattendue est survenue lors du chargement des données.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [requestId, clientId, boatId, clientName, clientEmail, boatName, boatType]);

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'], // Only allow PDF files
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
        if (errors.file) {
          setErrors(prev => ({ ...prev, file: undefined }));
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sélection du fichier.');
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof QuoteUploadForm, string>> = {};

    if (!form.file) {
      newErrors.file = 'Le fichier du devis est requis';
    }
    // Optional fields are not validated here, as they are optional.

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
    setLoading(true);

    if (!form.requestId || !form.clientId || !form.boatId || !user?.id) {
      Alert.alert('Erreur', 'Informations essentielles manquantes pour la soumission.');
      setLoading(false);
      return;
    }

    let quoteIdToUse = form.quoteId;
    let fileUrl: string | null = null;

    try {
      // 1. Ensure a 'quotes' entry exists or create one
      if (!quoteIdToUse) {
        const { data: newQuote, error: insertQuoteError } = await supabase
          .from('quotes')
          .insert({
            reference: `DEV-${form.requestId}-${Date.now()}`, // Generate a unique reference
            status: 'sent', // Set to sent immediately as a file is provided
            service_request_id: parseInt(form.requestId),
            id_client: form.clientId,
            id_boat: parseInt(form.boatId),
            id_boat_manager: user.role === 'boat_manager' ? user.id : null,
            id_companie: user.role === 'nautical_company' ? user.id : null,
            provider_type: user.role === 'boat_manager' ? 'boat_manager' : 'nautical_company',
            title: form.title,
            description: form.notes || 'Devis fourni par document',
            total_incl_tax: form.amount || 0,
            subtotal_excl_tax: form.amount || 0, // Assuming total_incl_tax = subtotal_excl_tax for simplicity
            valid_until: form.validUntil,
          })
          .select('id')
          .single();

        if (insertQuoteError || !newQuote) {
          console.error('Error creating new quote entry:', insertQuoteError);
          Alert.alert('Erreur', `Échec de la création du devis: ${insertQuoteError?.message}`);
          setLoading(false);
          return;
        }
        quoteIdToUse = newQuote.id;
      }

      // 2. Upload the PDF file (fix 0 octet)
if (form.file) {
  const fileExtension = (form.file.name.split('.').pop() || 'pdf').toLowerCase();
  const filePath = `quotes/${form.requestId}/${Date.now()}.${fileExtension}`;

  // 2.1 S'assurer qu'on a un vrai chemin file:// lisible
  let fileUri = form.file.uri;
  if (fileUri.startsWith('content://')) {
    const dest = `${FileSystem.cacheDirectory}${Date.now()}-${form.file.name}`;
    await FileSystem.copyAsync({ from: fileUri, to: dest });
    fileUri = dest;
  }

  // 2.2 Lire en base64 puis convertir en octets
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // ⚠️ Buffer vient de `import { Buffer } from 'buffer'`
  const bytes = Buffer.from(base64, 'base64'); // Uint8Array
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  if (bytes.byteLength === 0) {
    throw new Error('Le fichier lu est vide (0 octet).');
  }

  // 2.3 Uploader des OCTETS (pas un Blob)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('quotes') // ton bucket
    .upload(filePath, arrayBuffer, {
      contentType: form.file.type || 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    Alert.alert('Erreur', `Échec du téléchargement du fichier: ${uploadError.message}`);
    setLoading(false);
    return;
  }

  // 2.4 Récupérer l’URL publique
  fileUrl = supabase.storage.from('quotes').getPublicUrl(uploadData.path).data.publicUrl;
}



      // 3. Update the 'quotes' entry with the file_url and final details
      const { error: updateQuoteError } = await supabase
        .from('quotes')
        .update({
          file_url: fileUrl,
          status: 'sent', // Ensure status is 'sent'
          total_incl_tax: form.amount || 0,
          subtotal_excl_tax: form.amount || 0,
          valid_until: form.validUntil,
          description: form.notes || 'Devis fourni par document',
        })
        .eq('id', quoteIdToUse);

      if (updateQuoteError) {
        console.error('Error updating quote entry with file URL:', updateQuoteError);
        Alert.alert('Erreur', `Échec de la mise à jour du devis avec le fichier: ${updateQuoteError.message}`);
        setLoading(false);
        return;
      }

      // 4. Insert into 'quote_documents' table
      if (fileUrl && form.file) {
        const { error: insertDocError } = await supabase
          .from('quote_documents')
          .insert({
            name: form.file.name,
            type: form.file.type,
            file_url: fileUrl,
            quote_id: quoteIdToUse,
          });

        if (insertDocError) {
          console.error('Error inserting into quote_documents:', insertDocError);
          Alert.alert('Erreur', `Échec de l'enregistrement du document de devis: ${insertDocError.message}`);
          // Continue, as the main quote is updated
        }
      }

      // 5. Update 'service_request' status
      const { error: updateRequestError } = await supabase
        .from('service_request')
        .update({
          statut: 'forwarded', // Change status to 'forwarded'
          prix: form.amount || 0, // Update price in service_request
          note_add: `Devis envoyé: ${fileUrl || 'document fourni'}`, // Add a note
        })
        .eq('id', parseInt(form.requestId));

      if (updateRequestError) {
        console.error('Error updating service_request status:', updateRequestError);
        Alert.alert('Erreur', `Échec de la mise à jour de la demande de service: ${updateRequestError.message}`);
      } else {
        Alert.alert(
          'Succès',
          'Le devis a été déposé et la demande mise à jour.',
          [
            {
              text: 'OK',
              onPress: () => router.push(`/request/${form.requestId}`)
            }
          ]
        );
      }

    } catch (e: any) {
      console.error('Unexpected error during submission:', e);
      Alert.alert('Erreur', e.message || 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Déposer un devis</Text>
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

          {/* Upload Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fichier du devis</Text>

            <TouchableOpacity
              style={[styles.fileUploadButton, errors.file && styles.fileUploadButtonError]}
              onPress={handleSelectFile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={errors.file ? '#ff4444' : '#0066CC'} size="small" />
              ) : (
                <Upload size={24} color={errors.file ? '#ff4444' : '#0066CC'} />
              )}
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
                  value={form.amount !== undefined ? form.amount.toString() : ''}
                  onChangeText={(text) => {
                    const filteredText = text.replace(/[^0-9.]/g, '');
                    setForm(prev => ({ ...prev, amount: parseFloat(filteredText) || undefined }));
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
                  onChangeText={(text) => setForm(prev => ({ ...prev, validUntil: text }))}
                  placeholder="AAAA-MM-JJ"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Notes additionnelles - Optionnel</Text>
              <View style={styles.textAreaWrapper}>
                <TextInput
                  style={styles.textArea}
                  value={form.notes}
                  onChangeText={(text) => setForm(prev => ({ ...prev, notes: text }))}
                  placeholder="Ajoutez une note pour le client"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Envoyer le devis</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        form={form}
      />
    </View>
  );
}

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  form: QuoteUploadForm;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ visible, onClose, onConfirm, form }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationLabel}>Fichier:</Text>
              <Text style={styles.confirmationValue}>{form.file?.name || 'N/A'}</Text>
            </View>
            {form.amount !== undefined && (
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>Montant:</Text>
                <Text style={styles.confirmationValue}>{form.amount.toFixed(2)} €</Text>
              </View>
            )}
            {form.validUntil && (
              <View style={styles.confirmationRow}>
                <Text style={styles.confirmationLabel}>Validité:</Text>
                <Text style={styles.confirmationValue}>
                  {new Date(form.validUntil).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={onConfirm}
            >
              <Text style={styles.modalConfirmText}>Envoyer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
});