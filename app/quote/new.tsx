import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { ArrowLeft, Plus, Trash, Bot as Boat, User, Calendar, FileText, Euro } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { generateQuotePDF } from '@/utils/pdf'; // Assurez-vous que cette fonction retourne le base64
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

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
  quoteId?: number; // Ajout de quoteId pour stocker l'ID du devis principal
}

export default function NewQuoteScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // --- DÉBUT: clés stables extraites de params (primitives) ---
  const depClientId = Array.isArray(params?.clientId) ? String(params!.clientId[0]) : String(params?.clientId ?? '');
  const depClientName = Array.isArray(params?.clientName) ? String(params!.clientName[0]) : String(params?.clientName ?? '');
  const depClientEmail = Array.isArray(params?.clientEmail) ? String(params!.clientEmail[0]) : String(params?.clientEmail ?? '');
  const depBoatId = Array.isArray(params?.boatId) ? String(params!.boatId[0]) : String(params?.boatId ?? '');
  const depBoatName = Array.isArray(params?.boatName) ? String(params!.boatName[0]) : String(params?.boatName ?? '');
  const depBoatType = Array.isArray(params?.boatType) ? String(params!.boatType[0]) : String(params?.boatType ?? '');
  const depRequestId = Array.isArray(params?.requestId) ? String(params!.requestId[0]) : String(params?.requestId ?? '');
  // --- FIN: clés stables extraites de params ---

  const DEFAULT_TAX_RATE = 0;

  const generateQuoteReference = (requestId?: string, clientId?: string) => {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    return `DEV-${requestId || clientId || 'GEN'}-${stamp}`;
  };

  const getProviderFields = () => {
    const role = (user as any)?.role;
    const uid = Number((user as any)?.id) || null;

    if (role === 'nautical_company') {
      return { provider_type: 'nautical_company', id_boat_manager: null, id_companie: uid };
    }
    return { provider_type: 'boat_manager', id_boat_manager: uid, id_companie: null };
  };

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
        id: 'temp-1', // Utiliser un ID temporaire pour les nouveaux services non encore persistés
        name: '',
        description: '',
        amount: 0,
      },
    ],
    requestId: '',
    quoteId: undefined, // Initialisé à undefined
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<any>({}); // Pour gérer les erreurs de validation

  // --- Initialisation du formulaire et chargement/création du devis principal ---
  useEffect(() => {
    const initializeQuote = async () => {
      setIsLoading(true);
      let currentQuoteId: number | undefined;
      let initialServices: Service[] = [];

      // Pré-remplir les infos client/bateau/requête depuis les params
      setForm(prev => {
        const next = { ...prev };
        if (depClientId) next.client = { ...next.client, id: depClientId };
        if (depClientName) next.client = { ...next.client, name: depClientName };
        if (depClientEmail) next.client = { ...next.client, email: depClientEmail };
        if (depBoatId) next.boat = { ...next.boat, id: depBoatId };
        if (depBoatName) next.boat = { ...next.boat, name: depBoatName };
        if (depBoatType) next.boat = { ...next.boat, type: depBoatType };
        if (depRequestId) next.requestId = depRequestId;
        if (!prev.validUntil) {
          const d = new Date();
          d.setDate(d.getDate() + 30);
          next.validUntil = d.toISOString().split('T')[0];
        }
        return next;
      });

      try {
        // 1. Tenter de charger un devis existant pour cette service_request
        if (depRequestId) {
          const { data: existingQuote, error: fetchQuoteError } = await supabase
            .from('quotes')
            .select('id, valid_until, status') // Sélectionner le statut pour vérifier s'il est déjà 'sent'
            .eq('service_request_id', parseInt(depRequestId))
            .single();

          if (existingQuote) {
            currentQuoteId = existingQuote.id;
            setForm(prev => ({ ...prev, quoteId: currentQuoteId, validUntil: existingQuote.valid_until || prev.validUntil }));

            // Charger les quote_items existants
            const { data: existingItems, error: fetchItemsError } = await supabase
              .from('quote_items')
              .select('id, label, description, unit_price')
              .eq('quote_id', currentQuoteId)
              .order('position', { ascending: true });

            if (fetchItemsError) {
              console.error('Error fetching existing quote items:', fetchItemsError);
              Alert.alert('Erreur', 'Impossible de charger les services du devis existant.');
            } else if (existingItems && existingItems.length > 0) {
              initialServices = existingItems.map(item => ({
                id: item.id.toString(),
                name: item.label,
                description: item.description || '',
                amount: item.unit_price || 0,
              }));
            }
          }
        }

        // 2. Si aucun devis existant n'a été trouvé, en créer un nouveau en statut 'draft'
        if (!currentQuoteId) {
          const { provider_type, id_boat_manager, id_companie } = getProviderFields();
          const reference = generateQuoteReference(depRequestId, depClientId);
          const title = `Devis - ${form.client.name || depClientName} / ${form.boat.name || depBoatName}`;

          // MODIFICATION ICI : Assurer que valid_until est une date valide
          const validUntilForInsert = form.validUntil.trim() === '' ? new Date().toISOString().split('T')[0] : form.validUntil;

          const { data: newQuoteRow, error: createQuoteError } = await supabase
            .from('quotes')
            .insert({
              reference,
              valid_until: validUntilForInsert, // Utiliser la date valide ici
              service_request_id: depRequestId ? parseInt(depRequestId) : null,
              id_client: parseInt(depClientId),
              id_boat: parseInt(depBoatId),
              id_boat_manager,
              id_companie,
              provider_type,
              title,
              status: 'draft', // Statut initial 'draft'
              currency: 'EUR',
              subtotal_excl_tax: 0,
              tax_amount: 0,
              total_incl_tax: 0,
            })
            .select('id')
            .single();

          if (createQuoteError || !newQuoteRow?.id) {
            console.error('Error creating new draft quote:', createQuoteError);
            Alert.alert('Erreur', 'Impossible de créer un nouveau devis brouillon.');
            setIsLoading(false);
            return;
          }
          currentQuoteId = newQuoteRow.id;
          setForm(prev => ({ ...prev, quoteId: currentQuoteId }));
        }

        // Mettre à jour les services dans l'état local
        if (initialServices.length > 0) {
          setForm(prev => ({ ...prev, services: initialServices }));
        } else {
          // S'il n'y a pas de services existants, s'assurer qu'il y a au moins un service vide
          setForm(prev => ({ ...prev, services: [{ id: 'temp-1', name: '', description: '', amount: 0 }] }));
        }

      } catch (e) {
        console.error('Error during quote initialization:', e);
        Alert.alert('Erreur', 'Une erreur est survenue lors de l\'initialisation du devis.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeQuote();
  }, [depRequestId, depClientId, depClientName, depClientEmail, depBoatId, depBoatName, depBoatType, user]);

  // --- Fonctions de gestion des services ---

  const validateService = (service: Service) => {
    const newErrors: any = {};
    if (!service.name.trim()) newErrors.name = 'Le nom du service est requis';
    if (!service.description.trim()) newErrors.description = 'La description est requise';
    if (service.amount <= 0) newErrors.amount = 'Le montant doit être supérieur à 0';
    return newErrors;
  };

  const addService = async () => {
    if (!form.quoteId) {
      Alert.alert('Erreur', 'Le devis n\'est pas encore initialisé. Veuillez patienter.');
      return;
    }

    const lastService = form.services[form.services.length - 1];
    const serviceErrors = validateService(lastService);

    if (Object.keys(serviceErrors).length > 0) {
      setErrors((prev: any) => ({ ...prev, [`service-${lastService.id}`]: serviceErrors }));
      Alert.alert('Validation', 'Veuillez remplir tous les champs du service actuel avant d\'en ajouter un nouveau.');
      return;
    }

    setIsSubmitting(true); // Activer l'indicateur de chargement
    try {
      // Insérer le dernier service dans la DB s'il n'a pas encore d'ID de DB
      if (lastService.id.startsWith('temp-')) {
        const { data: newItem, error: insertError } = await supabase
          .from('quote_items')
          .insert({
            quote_id: form.quoteId,
            label: lastService.name,
            description: lastService.description,
            unit_price: lastService.amount,
            quantity: 1, // Valeur par défaut
            position: form.services.length, // Position basée sur l'ordre actuel
          })
          .select('id')
          .single();

        if (insertError || !newItem) {
          console.error('Error inserting quote item:', insertError);
          Alert.alert('Erreur', 'Impossible d\'ajouter le service.');
          return;
        }
        // Mettre à jour l'ID du service dans l'état local
        setForm(prev => ({
          ...prev,
          services: prev.services.map(s => s.id === lastService.id ? { ...s, id: newItem.id.toString() } : s)
        }));
      }

      // Ajouter un nouveau service vide à l'état local
      setForm(prev => ({
        ...prev,
        services: [
          ...prev.services,
          {
            id: `temp-${Date.now()}`, // Nouvel ID temporaire
            name: '',
            description: '',
            amount: 0,
          },
        ],
      }));
      setErrors({}); // Réinitialiser les erreurs après un ajout réussi
    } catch (e) {
      console.error('Error adding service:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de l\'ajout du service.');
    } finally {
      setIsSubmitting(false); // Désactiver l'indicateur de chargement
    }
  };

  const removeService = async (id: string) => {
    if (form.services.length <= 1) {
      Alert.alert('Attention', 'Un devis doit contenir au moins un service.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Supprimer de la DB si ce n'est pas un ID temporaire
      if (!id.startsWith('temp-')) {
        const { error: deleteError } = await supabase
          .from('quote_items')
          .delete()
          .eq('id', parseInt(id));

        if (deleteError) {
          console.error('Error deleting quote item:', deleteError);
          Alert.alert('Erreur', 'Impossible de supprimer le service.');
          return;
        }
      }

      setForm(prev => ({
        ...prev,
        services: prev.services.filter(service => service.id !== id),
      }));
    } catch (e) {
      console.error('Error removing service:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de la suppression du service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateService = async (id: string, field: keyof Service, value: string | number) => {
    setForm(prev => {
      const updatedServices = prev.services.map(service =>
        service.id === id ? { ...service, [field]: value } : service
      );
      return { ...prev, services: updatedServices };
    });

    // Mettre à jour la DB si le service a déjà un ID de DB
    if (!id.startsWith('temp-')) {
      try {
        const serviceToUpdate = form.services.find(s => s.id === id);
        if (serviceToUpdate) {
          const { error: updateError } = await supabase
            .from('quote_items')
            .update({ [field === 'amount' ? 'unit_price' : field === 'name' ? 'label' : field]: value })
            .eq('id', parseInt(id));

          if (updateError) {
            console.error('Error updating quote item:', updateError);
            // Gérer l'erreur de manière appropriée, peut-être un rollback local ou un message à l'utilisateur
          }
        }
      } catch (e) {
        console.error('Error updating service in DB:', e);
      }
    }
    setErrors((prev: any) => {
      const newErrors = { ...prev };
      if (newErrors[`service-${id}`] && newErrors[`service-${id}`][field]) {
        delete newErrors[`service-${id}`][field];
        if (Object.keys(newErrors[`service-${id}`]).length === 0) {
          delete newErrors[`service-${id}`];
        }
      }
      return newErrors;
    });
  };

  const totalAmount = form.services.reduce((sum, service) => sum + (Number(service.amount) || 0), 0);

  // --- Soumission finale du devis ---
  const handleSubmit = async () => {
    if (!form.quoteId) {
      Alert.alert('Erreur', 'Le devis n\'est pas initialisé. Veuillez réessayer.');
      return;
    }

    // Valider le dernier service avant la soumission finale
    const lastService = form.services[form.services.length - 1];
    const serviceErrors = validateService(lastService);
    if (Object.keys(serviceErrors).length > 0) {
      setErrors((prev: any) => ({ ...prev, [`service-${lastService.id}`]: serviceErrors }));
      Alert.alert('Validation', 'Veuillez remplir tous les champs du dernier service.');
      return;
    }

    // S'assurer que tous les services temporaires sont persistés
    for (const service of form.services) {
      if (service.id.startsWith('temp-')) {
        const { data: newItem, error: insertError } = await supabase
          .from('quote_items')
          .insert({
            quote_id: form.quoteId,
            label: service.name,
            description: service.description,
            unit_price: service.amount,
            quantity: 1,
            position: form.services.indexOf(service) + 1,
          })
          .select('id')
          .single();

        if (insertError || !newItem) {
          console.error('Error persisting temporary service:', insertError);
          Alert.alert('Erreur', 'Impossible de sauvegarder tous les services.');
          return;
        }
        // Mettre à jour l'ID du service dans l'état local (important pour la suite)
        setForm(prev => ({
          ...prev,
          services: prev.services.map(s => s.id === service.id ? { ...s, id: newItem.id.toString() } : s)
        }));
      }
    }

    if (totalAmount <= 0) {
      Alert.alert('Erreur', 'Le montant total du devis doit être supérieur à 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Générer le PDF → retourne un chemin local
const localPdfPath = await generateQuotePDF({
  reference: generateQuoteReference(form.requestId, form.client.id),
  date: new Date().toISOString().split('T')[0],
  validUntil: form.validUntil,
  provider: getProviderFields(),
  client: form.client,
  boat: form.boat,
  services: form.services,
  totalAmount: totalAmount,
});

if (!localPdfPath) {
  Alert.alert('Erreur', 'Impossible de générer le PDF du devis.');
  return;
}

// 2. Lire le fichier en base64
const base64Pdf = await FileSystem.readAsStringAsync(localPdfPath, {
  encoding: FileSystem.EncodingType.Base64,
});

// 3. Uploader dans Supabase
const pdfFileName = `quote_${form.quoteId}_${Date.now()}.pdf`;
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('quotes')
  .upload(pdfFileName, decode(base64Pdf), {
    contentType: 'application/pdf',
    upsert: true,
  });

if (uploadError) {
  console.error('Error uploading PDF:', uploadError);
  Alert.alert('Erreur', `Échec du téléchargement du PDF: ${uploadError.message}`);
  return;
}

const pdfUrl = supabase.storage.from('quotes').getPublicUrl(uploadData.path).data.publicUrl;

// 4. Mettre à jour la table 'quotes' avec le lien
const { error: updateQuoteError } = await supabase
  .from('quotes')
  .update({
    file_url: pdfUrl,
    status: 'sent',
    total_incl_tax: totalAmount,
    subtotal_excl_tax: totalAmount,
  })
  .eq('id', form.quoteId);

if (updateQuoteError) {
  console.error('Error updating quote status and file_url:', updateQuoteError);
  Alert.alert('Erreur', `Impossible de finaliser le devis: ${updateQuoteError.message}`);
  return;
}


      if (updateQuoteError) {
        console.error('Error updating quote status and file_url:', updateQuoteError);
        Alert.alert('Erreur', `Impossible de finaliser le devis: ${updateQuoteError.message}`);
        return;
      }

      // 4. Mettre à jour le statut de la service_request associée à 'transmise'
      if (form.requestId) {
        const { error: updateRequestError } = await supabase
          .from('service_request')
          .update({
            statut: 'transmise', // Statut 'transmise'
            prix: totalAmount,
            note_add: `Devis créé et envoyé: ${pdfUrl}`,
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

    } catch (e) {
      console.error('Unexpected error during quote submission:', e);
      Alert.alert('Erreur', `Une erreur inattendue est survenue: ${e instanceof Error ? e.message : String(e)}.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction utilitaire pour décoder le base64 (nécessaire pour l'upload de Blob)
  const decode = (base64: string) => {
  try {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error("Base64 decode error:", error);
    throw new Error("Erreur de décodage du PDF.");
  }
};

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement du devis...</Text>
      </View>
    );
  }

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
                editable={false}
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
              disabled={isSubmitting} // Désactiver pendant la soumission
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0066CC" />
              ) : (
                <Plus size={20} color="#0066CC" />
              )}
              <Text style={styles.addServiceButtonText}>Ajouter un service</Text>
            </TouchableOpacity>
          </View>

          {form.services.map((service, index) => (
            <View key={service.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Service {index + 1}</Text>
                {form.services.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeServiceButton}
                    onPress={() => removeService(service.id)}
                    disabled={isSubmitting}
                  >
                    <Trash size={20} color="#ff4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Nom du service</Text>
                <TextInput
                  style={[styles.input, errors[`service-${service.id}`]?.name && styles.inputError]}
                  value={service.name}
                  onChangeText={(text) => updateService(service.id, 'name', text)}
                  placeholder="Nom du service"
                  editable={!isSubmitting}
                />
                {errors[`service-${service.id}`]?.name && <Text style={styles.errorText}>{errors[`service-${service.id}`].name}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, errors[`service-${service.id}`]?.description && styles.inputError]}
                  value={service.description}
                  onChangeText={(text) => updateService(service.id, 'description', text)}
                  placeholder="Description du service"
                  multiline
                  numberOfLines={3}
                  editable={!isSubmitting}
                />
                {errors[`service-${service.id}`]?.description && <Text style={styles.errorText}>{errors[`service-${service.id}`].description}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Montant (€)</Text>
                <View style={styles.amountInputContainer}>
                  <Euro size={20} color="#666" />
                  <TextInput
                    style={[styles.amountInput, errors[`service-${service.id}`]?.amount && styles.inputError]}
                    value={service.amount.toString()}
                    onChangeText={(text) => {
                      const amount = text.replace(/[^0-9.]/g, '');
                      updateService(service.id, 'amount', parseFloat(amount) || 0);
                    }}
                    placeholder="0.00"
                    keyboardType="numeric"
                    editable={!isSubmitting}
                  />
                </View>
                {errors[`service-${service.id}`]?.amount && <Text style={styles.errorText}>{errors[`service-${service.id}`].amount}</Text>}
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
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Créer le devis</Text>
          )}
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
  inputError: { // Style pour les champs en erreur
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
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
  submitButtonDisabled: {
    backgroundColor: '#94a3b8', // Style pour le bouton désactivé
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});