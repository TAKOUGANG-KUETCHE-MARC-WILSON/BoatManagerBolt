import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, PenTool as Tool, User, FileText, Plus, Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

interface TechnicalRecord {
  id: string;
  title: string;
  description: string;
  date: string;
  performedBy: string;
  documents?: {
    id: string;
    name: string;
    type: string;
    date: string;
    file: string;
  }[];
}

// Sample technical records
const mockTechnicalRecords: Record<string, TechnicalRecord> = {
  't1': {
    id: 't1',
    title: 'Entretien moteur',
    description: 'Révision complète du moteur et changement des filtres',
    date: '2023-11-15',
    performedBy: 'Nautisme Pro',
    documents: [
      {
        id: 'td1',
        name: 'Facture entretien moteur',
        type: 'invoice',
        date: '2023-11-15',
        file: 'facture_entretien_moteur.pdf'
      }
    ]
  },
  't2': {
    id: 't2',
    title: 'Remplacement voile',
    description: 'Remplacement de la grand-voile',
    date: '2023-08-10',
    performedBy: 'Marine Services',
    documents: [
      {
        id: 'td2',
        name: 'Facture voile',
        type: 'invoice',
        date: '2023-08-10',
        file: 'facture_voile.pdf'
      }
    ]
  },
  't3': {
    id: 't3',
    title: 'Installation GPS',
    description: 'Installation d\'un nouveau système GPS',
    date: '2023-12-05',
    performedBy: 'Nautisme Pro',
    documents: [
      {
        id: 'td3',
        name: 'Facture GPS',
        type: 'invoice',
        date: '2023-12-05',
        file: 'facture_gps.pdf'
      }
    ]
  }
};

export default function TechnicalRecordScreen() {
  const { id } = useLocalSearchParams();
  const isNewRecord = id === 'new';
  const [form, setForm] = useState<TechnicalRecord>({
    id: '',
    title: '',
    description: '',
    date: '',
    performedBy: '',
    documents: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TechnicalRecord, string>>>({});

  useEffect(() => {
    if (!isNewRecord && typeof id === 'string' && mockTechnicalRecords[id]) {
      setForm(mockTechnicalRecords[id]);
    } else if (isNewRecord) {
      const today = new Date().toISOString().split('T')[0];
      setForm({
        id: `t${Date.now()}`,
        title: '',
        description: '',
        date: today,
        performedBy: '',
        documents: [],
      });
    }
  }, [id, isNewRecord]);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof TechnicalRecord, string>> = {};
    
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

      if (result.canceled) {
        return;
      }

      const newDocument = {
        id: `td${Date.now()}`,
        name: result.assets[0].name,
        type: 'invoice',
        date: new Date().toISOString().split('T')[0],
        file: result.assets[0].uri,
      };

      setForm(prev => ({
        ...prev,
        documents: [...(prev.documents || []), newDocument],
      }));
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Une erreur est survenue lors de la sélection du document');
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    setForm(prev => ({
      ...prev,
      documents: prev.documents?.filter(doc => doc.id !== documentId) || [],
    }));
  };






  const handleSubmit = () => {
    if (validateForm()) {
      // Here you would typically save the technical record
      // For now, we'll just show a success message and navigate back
      const message = isNewRecord 
        ? 'L\'intervention a été ajoutée avec succès'
        : 'L\'intervention a été mise à jour avec succès';
      
      // Get the boat ID from the URL or context
      const boatId = '1'; // This would come from the route or context in a real app
      
      // Show success message and navigate back to the boat profile
      alert(message);
      router.push(`/boats/${boatId}`);
    }
  };

  const handleDelete = () => {
    // Here you would typically delete the technical record
    // For now, we'll just show a success message and navigate back
    
    // Get the boat ID from the URL or context
    const boatId = '1'; // This would come from the route or context in a real app
    
    // Show confirmation dialog
    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
        alert('L\'intervention a été supprimée avec succès');
        router.push(`/boats/${boatId}`);
      }
    } else {
      alert('L\'intervention a été supprimée avec succès');
      router.push(`/boats/${boatId}`);
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
          <View style={[styles.inputWrapper, errors.date && styles.inputWrapperError]}>
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
          </View>
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
                    <Text style={styles.removeDocumentButtonText}>Supprimer</Text>
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
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>
            {isNewRecord ? 'Ajouter l\'intervention' : 'Enregistrer les modifications'}
          </Text>
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