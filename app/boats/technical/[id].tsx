import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, PenTool as Tool, User, FileText, Plus, Upload, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

interface TechnicalRecordForm {
  id?: string; // Optional for new records
  title: string;
  description: string;
  date: string;
  performedBy: string;
  documents: Array<{
    id: string; // Client-side ID for list management
    name: string;
    type: string; // Mime type or custom type
    date: string; // YYYY-MM-DD
    uri: string; // Local URI or Supabase URL
  }>;
}

export default function TechnicalRecordScreen() {
  const { id, boatId } = useLocalSearchParams<{ id: string; boatId: string }>();
  const isNewRecord = id === 'new';
  const [form, setForm] = useState<TechnicalRecordForm>({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0], // Default to today
    performedBy: '',
    documents: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TechnicalRecordForm, string>>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicalRecord = async () => {
      if (!boatId) {
        setFetchError('ID du bateau manquant. Impossible de charger ou d\'ajouter un enregistrement technique.');
        setLoading(false);
        return;
      }

      if (!isNewRecord && typeof id === 'string') {
        setLoading(true);
        setFetchError(null);
        try {
          const { data: recordData, error: recordError } = await supabase
            .from('boat_technical_records')
            .select('*')
            .eq('id', id)
            .eq('boat_id', boatId)
            .single();

          if (recordError) {
            if (recordError.code === 'PGRST116') { // No rows found
              setFetchError('Enregistrement technique non trouvé.');
            } else {
              console.error('Error fetching technical record:', recordError);
              setFetchError('Erreur lors du chargement de l\'enregistrement technique.');
            }
            setLoading(false);
            return;
          }

          const { data: documentsData, error: documentsError } = await supabase
            .from('boat_technical_record_documents')
            .select('*')
            .eq('technical_record_id', id);

          if (documentsError) {
            console.error('Error fetching technical record documents:', documentsError);
            // Continue even if documents fail to load, main record is more important
          }

          setForm({
            id: recordData.id.toString(),
            title: recordData.title || '',
            description: recordData.description || '',
            date: recordData.date || '',
            performedBy: recordData.performed_by || '',
            documents: documentsData ? documentsData.map(doc => ({
              id: doc.id.toString(),
              name: doc.name,
              type: doc.type,
              date: doc.date,
              uri: doc.file_url, // Use file_url as uri for existing documents
            })) : [],
          });
        } catch (e) {
          console.error('Unexpected error fetching technical record:', e);
          setFetchError('Une erreur inattendue est survenue.');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchTechnicalRecord();
  }, [id, boatId, isNewRecord]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof TechnicalRecordForm, string>> = {};
    
    if (!form.title.trim()) newErrors.title = 'Le titre est requis';
    if (!form.description.trim()) newErrors.description = 'La description est requise';
    if (!form.date.trim()) newErrors.date = 'La date est requise';
    if (!form.performedBy.trim()) newErrors.performedBy = 'Le prestataire est requis';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const newDocument = {
        id: `doc-${Date.now()}`, // Client-side unique ID
        name: result.assets[0].name,
        type: result.assets[0].mimeType || 'application/octet-stream',
        date: new Date().toISOString().split('T')[0],
        uri: result.assets[0].uri,
      };

      setForm(prev => ({
        ...prev,
        documents: [...(prev.documents || []), newDocument],
      }));
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sélection du document');
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    setForm(prev => ({
      ...prev,
      documents: prev.documents?.filter(doc => doc.id !== documentId) || [],
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!boatId) {
      Alert.alert('Erreur', 'ID du bateau manquant. Impossible d\'ajouter l\'équipement.');
      return;
    }

    setLoading(true);
    try {
      let technicalRecordId: number;
      
      if (isNewRecord) {
        const { data, error } = await supabase
          .from('boat_technical_records')
          .insert({
            boat_id: parseInt(boatId),
            title: form.title,
            description: form.description,
            date: form.date,
            performed_by: form.performedBy,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error inserting technical record:', error);
          Alert.alert('Erreur', `Échec de l'ajout de l'intervention: ${error.message}`);
          setLoading(false);
          return;
        }
        technicalRecordId = data.id;
      } else {
        technicalRecordId = parseInt(id as string);
        const { error } = await supabase
          .from('boat_technical_records')
          .update({
            title: form.title,
            description: form.description,
            date: form.date,
            performed_by: form.performedBy,
          })
          .eq('id', technicalRecordId);

        if (error) {
          console.error('Error updating technical record:', error);
          Alert.alert('Erreur', `Échec de la mise à jour de l'intervention: ${error.message}`);
          setLoading(false);
          return;
        }
      }

      // Handle documents: upload new ones, keep existing ones, delete removed ones
      const existingDocumentUris = form.documents
        .filter(doc => doc.uri.startsWith('http')) // Filter documents that are already uploaded (have a URL)
        .map(doc => doc.uri);

      const documentsToDelete = (await supabase
        .from('boat_technical_record_documents')
        .select('id, file_url')
        .eq('technical_record_id', technicalRecordId))
        .data?.filter(dbDoc => !existingDocumentUris.includes(dbDoc.file_url)) || [];

      // Delete removed documents from storage and database
      for (const doc of documentsToDelete) {
        const filePath = doc.file_url.split(supabase.storage.from('technical_record_documents').getPublicUrl('').data.publicUrl + '/')[1];
        if (filePath) {
          const { error: deleteFileError } = await supabase.storage
            .from('technical_record_documents')
            .remove([filePath]);
          if (deleteFileError) console.warn('Error deleting old document file:', deleteFileError);
        }
        await supabase.from('boat_technical_record_documents').delete().eq('id', doc.id);
      }

      // Upload new documents and insert/update records
      for (const doc of form.documents) {
        if (!doc.uri.startsWith('http')) { // Only upload new files (those with local URIs)
          const fileExtension = doc.name.split('.').pop();
          const filePath = `technical_record_documents/${boatId}/${technicalRecordId}/${Date.now()}_${doc.name}`;
          const response = await fetch(doc.uri);
          const blob = await response.blob();

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('technical_record_documents')
            .upload(filePath, blob, {
              contentType: doc.type,
              upsert: false,
            });

          if (uploadError) {
            console.error('Error uploading document file:', uploadError);
            Alert.alert('Erreur', `Échec du téléchargement du document ${doc.name}: ${uploadError.message}`);
            continue;
          }

          const { data: publicUrlData } = supabase.storage.from('technical_record_documents').getPublicUrl(uploadData.path);
          const fileUrl = publicUrlData.publicUrl;

          const { error: docInsertError } = await supabase
            .from('boat_technical_record_documents')
            .insert({
              technical_record_id: technicalRecordId,
              name: doc.name,
              type: doc.type,
              date: doc.date,
              file_url: fileUrl,
            });

          if (docInsertError) {
            console.error('Error inserting document record:', docInsertError);
            Alert.alert('Erreur', `Échec de l'enregistrement du document ${doc.name}: ${docInsertError.message}`);
          }
        }
      }

      Alert.alert(
        'Succès',
        isNewRecord ? 'L\'intervention a été ajoutée avec succès.' : 'L\'intervention a été mise à jour avec succès.',
        [
          {
            text: 'OK',
            onPress: () => router.push(`/boats/${boatId}`)
          }
        ]
      );
    } catch (e) {
      console.error('Unexpected error during submission:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Supprimer l\'intervention',
      'Êtes-vous sûr de vouloir supprimer cette intervention ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setFetchError(null);
            try {
              // 1. Delete associated documents from storage and database
              const { data: documentsData, error: fetchDocsError } = await supabase
                .from('boat_technical_record_documents')
                .select('id, file_url')
                .eq('technical_record_id', id);

              if (fetchDocsError) {
                console.warn('Error fetching documents for deletion:', fetchDocsError);
              } else if (documentsData) {
                for (const doc of documentsData) {
                  const filePath = doc.file_url.split(supabase.storage.from('technical_record_documents').getPublicUrl('').data.publicUrl + '/')[1];
                  if (filePath) {
                    const { error: deleteFileError } = await supabase.storage
                      .from('technical_record_documents')
                      .remove([filePath]);
                    if (deleteFileError) console.warn('Error deleting document file from storage:', deleteFileError);
                  }
                  await supabase.from('boat_technical_record_documents').delete().eq('id', doc.id);
                }
              }

              // 2. Delete the main technical record
              const { error: deleteRecordError } = await supabase
                .from('boat_technical_records')
                .delete()
                .eq('id', id);

              if (deleteRecordError) {
                console.error('Error deleting technical record:', deleteRecordError);
                Alert.alert('Erreur', `Échec de la suppression de l'intervention: ${deleteRecordError.message}`);
              } else {
                Alert.alert(
                  'Succès',
                  'L\'intervention a été supprimée avec succès.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.push(`/boats/${boatId}`)
                    }
                  ]
                );
              }
            } catch (e) {
              console.error('Unexpected error during deletion:', e);
              Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de la suppression.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
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
            {isNewRecord ? 'Nouvelle intervention' : 'Modifier l\'intervention'}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Erreur</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{fetchError}</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isNewRecord ? 'Nouvelle intervention' : 'Modifier l\'intervention'}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Titre de l'intervention</Text>
            <View style={[styles.inputWrapper, errors.title && styles.inputWrapperError]}>
              <Tool size={20} color={errors.title ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={form.title}
                onChangeText={(text) => {
                  setForm(prev => ({ ...prev, title: text }));
                  if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
                }}
                placeholder="ex: Entretien moteur, Remplacement voile"
              />
            </View>
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Description</Text>
            <View style={[styles.textAreaWrapper, errors.description && styles.textAreaWrapperError]}>
              <FileText size={20} color={errors.description ? '#ff4444' : '#666'} style={styles.textAreaIcon} />
              <TextInput
                style={styles.textArea}
                value={form.description}
                onChangeText={(text) => {
                  setForm(prev => ({ ...prev, description: text }));
                  if (errors.description) setErrors(prev => ({ ...prev, description: undefined }));
                }}
                placeholder="Description détaillée de l'intervention"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date de l'intervention</Text>
            <TouchableOpacity
              style={[styles.inputWrapper, errors.date && styles.inputWrapperError]}
              onPress={() => { /* Implement date picker logic here */ }}
            >
              <Calendar size={20} color={errors.date ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={form.date}
                onChangeText={(text) => {
                  setForm(prev => ({ ...prev, date: text }));
                  if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
                }}
                placeholder="AAAA-MM-JJ"
              />
            </TouchableOpacity>
            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Réalisée par</Text>
            <View style={[styles.inputWrapper, errors.performedBy && styles.inputWrapperError]}>
              <User size={20} color={errors.performedBy ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                value={form.performedBy}
                onChangeText={(text) => {
                  setForm(prev => ({ ...prev, performedBy: text }));
                  if (errors.performedBy) setErrors(prev => ({ ...prev, performedBy: undefined }));
                }}
                placeholder="ex: Nautisme Pro, Moi-même"
              />
            </View>
            {errors.performedBy && <Text style={styles.errorText}>{errors.performedBy}</Text>}
          </View>

          <View style={styles.documentsSection}>
            <View style={styles.documentsSectionHeader}>
              <Text style={styles.documentsSectionTitle}>Documents associés</Text>
              <TouchableOpacity
                style={styles.addDocumentButton}
                onPress={handleAddDocument}
              >
                <Upload size={20} color="#0066CC" />
                <Text style={styles.addDocumentButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>

            {form.documents && form.documents.length > 0 ? (
              <View style={styles.documentsList}>
                {form.documents.map((document) => (
                  <View key={document.id} style={styles.documentItem}>
                    <View style={styles.documentInfo}>
                      <FileText size={20} color="#0066CC" />
                      <View style={styles.documentDetails}>
                        <Text style={styles.documentName}>{document.name}</Text>
                        <Text style={styles.documentDate}>{document.date}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeDocumentButton}
                      onPress={() => handleRemoveDocument(document.id)}
                    >
                      <X size={16} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noDocuments}>
                <Text style={styles.noDocumentsText}>Aucun document associé</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isNewRecord ? 'Ajouter l\'intervention' : 'Enregistrer les modifications'}
              </Text>
            )}
          </TouchableOpacity>

          {!isNewRecord && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Text style={styles.deleteButtonText}>Supprimer l'intervention</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
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
  form: {
    padding: 16,
    gap: 20,
  },
  inputContainer: {
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
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
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  textAreaWrapper: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    minHeight: 120,
  },
  textAreaWrapperError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  textAreaIcon: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  textArea: {
    flex: 1,
    marginLeft: 28,
    fontSize: 16,
    color: '#1a1a1a',
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 4,
  },
  documentsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  documentsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  documentsSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  addDocumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  addDocumentButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  documentsList: {
    gap: 12,
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentDetails: {
    gap: 2,
  },
  documentName: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  documentDate: {
    fontSize: 12,
    color: '#666',
  },
  removeDocumentButton: {
    padding: 4,
  },
  removeDocumentButtonText: {
    fontSize: 14,
    color: '#ff4444',
  },
  noDocuments: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    alignItems: 'center',
  },
  noDocumentsText: {
    fontSize: 14,
    color: '#666',
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
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
