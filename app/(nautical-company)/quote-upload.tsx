import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Modal, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Upload, FileText, User, Bot as Boat, Calendar, Plus, X, Check, Download, Euro, Trash } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Assurez-vous que supabase est importé
import { generateQuotePDF } from '@/utils/pdf'; // Assurez-vous que cette fonction retourne le base64
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer'; // Nécessaire pour la conversion base64 en Uint8Array

// Polyfill pour Buffer si nécessaire (souvent pour React Native)
global.Buffer = global.Buffer || Buffer;

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
  clientEmail: string; // Ajouté pour le PDF
  boatId: string;
  boatName: string;
  boatType: string;
  validUntil: string;
  services: Service[];
  file?: {
    name: string;
    uri: string;
    type: string;
  };
  quoteId?: number; // Ajout de quoteId pour stocker l'ID du devis principal
  notes?: string; // Pour les notes additionnelles
  amount?: number; // Pour le montant total du devis uploadé
}

export default function QuoteUploadScreen() {
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
    clientName: clientName || '',
    clientEmail: clientEmail || '', // Initialisation de l'email client
    boatId: boatId || '',
    boatName: boatName || '',
    boatType: boatType || '',
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
            boat(name, type, place_de_port)
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
          clientEmail: reqData.users.e_mail, // Assurez-vous que l'email est bien récupéré
          boatName: reqData.boat.name,
          boatType: reqData.boat.type,
          // Pre-fill title if it's empty and request has a description
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
  }, [requestId, clientId, boatId]);


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
          id: 'temp-1', // Utiliser un ID temporaire pour les nouveaux services non encore persistés
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

  const totalAmount = form.services.reduce((sum, service) => sum + (Number(service.amount) || 0), 0);

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
    setLoading(true);

    if (!form.requestId || !form.clientId || !form.boatId || !user?.id) {
      Alert.alert('Erreur', 'Informations essentielles manquantes pour la soumission.');
      setLoading(false);
      return;
    }

    let quoteIdToUse = form.quoteId;
    let fileUrl: string | null = null;

    try {
      // 1. Récupérer les détails du Boat Manager connecté
      const { data: bmData, error: bmError } = await supabase
        .from('users')
        .select('first_name, last_name, e_mail, phone, profile')
        .eq('id', user.id)
        .single();

      if (bmError || !bmData) {
        console.error('Error fetching Boat Manager details:', bmError);
        Alert.alert('Erreur', 'Impossible de récupérer les détails du Boat Manager.');
        setLoading(false);
        return;
      }

      const providerInfo = {
        name: `${bmData.first_name} ${bmData.last_name}`,
        type: bmData.profile as 'boat_manager' | 'nautical_company',
        email: bmData.e_mail,
        phone: bmData.phone,
      };

      // 2. Ensure a 'quotes' entry exists or create one
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

      // 3. Generate and Upload the PDF file (if 'create' method)
      if (uploadMethod === 'create') {
        const localPdfPath = await generateQuotePDF({
          reference: `DEV-${form.requestId}-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          validUntil: form.validUntil,
          provider: providerInfo, // Passer les infos du BM
          client: form.client,
          boat: {
            id: form.boatId,
            name: form.boatName,
            type: form.boatType,
          },
          services: form.services,
          totalAmount: totalAmount,
          isInvoice: false,
        });

        if (!localPdfPath) {
          Alert.alert('Erreur', 'Impossible de générer le PDF du devis.');
          setLoading(false);
          return;
        }

        const pdfFileName = `quote_${quoteIdToUse}_${Date.now()}.pdf`;
        const filePath = `quotes/${form.requestId}/${pdfFileName}`; // Chemin structuré

        const base64Pdf = await FileSystem.readAsStringAsync(localPdfPath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const bytes = Buffer.from(base64Pdf, 'base64');

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('quotes')
          .upload(filePath, bytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading PDF:', uploadError);
          Alert.alert('Erreur', `Échec du téléchargement du PDF: ${uploadError.message}`);
          setLoading(false);
          return;
        }
        fileUrl = supabase.storage.from('quotes').getPublicUrl(uploadData.path).data.publicUrl;
      } else if (uploadMethod === 'upload' && form.file) {
        // Handle upload of existing PDF
        const fileExtension = (form.file.name.split('.').pop() || 'pdf').toLowerCase();
        const pdfFileName = `uploaded_quote_${quoteIdToUse}_${Date.now()}.${fileExtension}`;
        const filePath = `quotes/${form.requestId}/${pdfFileName}`; // Chemin structuré

        const response = await fetch(form.file.uri);
        const blob = await response.blob();

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('quotes')
          .upload(filePath, blob, {
            contentType: form.file.type || 'application/pdf',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading existing PDF:', uploadError);
          Alert.alert('Erreur', `Échec du téléchargement du fichier: ${uploadError.message}`);
          setLoading(false);
          return;
        }
        fileUrl = supabase.storage.from('quotes').getPublicUrl(uploadData.path).data.publicUrl;
      }

      // 4. Update the 'quotes' entry with the file_url and final details
      const { error: updateQuoteError } = await supabase
        .from('quotes')
        .update({
          file_url: fileUrl,
          status: 'sent', // Ensure status is 'sent'
          total_incl_tax: totalAmount,
          subtotal_excl_tax: totalAmount,
          valid_until: form.validUntil,
          description: form.notes || 'Devis fourni par document',
        })
        .eq('id', quoteIdToUse);

      if (updateQuoteError) {
        console.error('Error updating quote status and file_url:', updateQuoteError);
        Alert.alert('Erreur', `Impossible de finaliser le devis: ${updateQuoteError.message}`);
        setLoading(false);
        return;
      }

      // 5. Insert into 'quote_documents' table
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

      // 6. Update 'service_request' status
      if (form.requestId) {
        const { error: updateRequestError } = await supabase
          .from('service_request')
          .update({
            statut: 'quote_sent', // Statut 'quote_sent'
            prix: totalAmount,
            note_add: `Devis envoyé: ${fileUrl}`,
          })
          .eq('id', parseInt(form.requestId));

        if (updateRequestError) {
          console.error('Error updating service_request status:', updateRequestError);
          Alert.alert('Avertissement', 'Devis créé, mais la mise à jour de la demande a échoué.');
        }
      }

      Alert.alert(
        'Succès',
        'Le devis a été créé et envoyé avec succès.',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (e: any) {
      console.error('Unexpected error during quote submission:', e);
      Alert.alert('Erreur', `Une erreur inattendue est survenue: ${e instanceof Error ? e.message : String(e)}.`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement du devis...</Text>
      </View>
    );
  }

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
                <Text style={styles.label}>Nom du service</Text>
                <TextInput
                  style={[styles.serviceInput, errors[`service-${service.id}`]?.name && styles.inputError]}
                  value={service.name}
                  onChangeText={(text) => updateService(service.id, 'name', text)}
                  placeholder="ex: Entretien moteur"
                />
                {errors[`service-${service.id}`]?.name && <Text style={styles.errorText}>{errors[`service-${service.id}`].name}</Text>}
              </View>
              
              <View style={styles.serviceInputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.serviceTextArea, errors[`service-${service.id}`]?.description && styles.inputError]}
                  value={service.description}
                  onChangeText={(text) => updateService(service.id, 'description', text)}
                  placeholder="Description détaillée du service"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                {errors[`service-${service.id}`]?.description && <Text style={styles.errorText}>{errors[`service-${service.id}`].description}</Text>}
              </View>
              
              <View style={styles.serviceInputContainer}>
                <Text style={styles.label}>Montant (€)</Text>
                <View style={styles.amountInputContainer}>
                  <Euro size={20} color="#666" />
                  <TextInput
                    style={[styles.amountInput, errors[`service-${service.id}`]?.amount && styles.inputError]}
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
                {errors[`service-${service.id}`]?.amount && <Text style={styles.errorText}>{errors[`service-${service.id}`].amount}</Text>}
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
