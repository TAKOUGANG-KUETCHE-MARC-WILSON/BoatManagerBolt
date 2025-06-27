import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, FileText, Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';

interface Document {
  id: string;
  name: string;
  type: string;
  date: string;
  file: string;
}

// Sample documents
const mockDocuments: Record<string, Document> = {
  'd1': {
    id: 'd1',
    name: 'Acte de francisation',
    type: 'administrative',
    date: '2020-05-15',
    file: 'acte_francisation.pdf'
  },
  'd2': {
    id: 'd2',
    name: 'Assurance',
    type: 'administrative',
    date: '2024-01-10',
    file: 'assurance_2024.pdf'
  },
  'd3': {
    id: 'd3',
    name: 'Place de port',
    type: 'administrative',
    date: '2024-01-05',
    file: 'place_port_2024.pdf'
  },
  'd4': {
    id: 'd4',
    name: 'Acte de francisation',
    type: 'administrative',
    date: '2022-03-20',
    file: 'acte_francisation.pdf'
  },
  'd5': {
    id: 'd5',
    name: 'Assurance',
    type: 'administrative',
    date: '2024-01-15',
    file: 'assurance_2024.pdf'
  }
};

const documentTypes = [
  'Acte de francisation',
  'Assurance',
  'Place de port',
  'Carte de circulation',
  'Permis de navigation',
  'Facture d\'achat',
  'Contrat de vente',
  'Autre'
];

export default function DocumentScreen() {
  const { id } = useLocalSearchParams();
  const isNewDocument = id === 'new';
  const [form, setForm] = useState<Document>({
    id: '',
    name: '',
    type: 'administrative',
    date: '',
    file: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Document, string>>>({});
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string } | null>(null);

  useEffect(() => {
    if (!isNewDocument && typeof id === 'string' && mockDocuments[id]) {
      setForm(mockDocuments[id]);
    } else if (isNewDocument) {
      const today = new Date().toISOString().split('T')[0];
      setForm({
        id: `d${Date.now()}`,
        name: '',
        type: 'administrative',
        date: today,
        file: '',
      });
    }
  }, [id, isNewDocument]);

  const handleChooseDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setSelectedFile({
        name: result.assets[0].name,
        uri: result.assets[0].uri,
      });
      
      // If no name is set yet, use the file name
      if (!form.name) {
        setForm(prev => ({ 
          ...prev, 
          name: result.assets[0].name.split('.')[0],
          file: result.assets[0].uri
        }));
      } else {
        setForm(prev => ({ 
          ...prev, 
          file: result.assets[0].uri
        }));
      }
      
      if (errors.file) {
        setErrors(prev => ({ ...prev, file: undefined }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Une erreur est survenue lors de la sélection du document');
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof Document, string>> = {};
    
    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (!form.date.trim()) newErrors.date = 'La date est requise';
    if (!form.file && !selectedFile) newErrors.file = 'Le document est requis';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Here you would typically save the document
      // For now, we'll just show a success message and navigate back
      const message = isNewDocument 
        ? 'Le document a été ajouté avec succès'
        : 'Le document a été mis à jour avec succès';
      
      // Get the boat ID from the URL or context
      const boatId = '1'; // This would come from the route or context in a real app
      
      // Show success message and navigate back to the boat profile
      alert(message);
      router.push(`/boats/${boatId}`);
    }
  };

  const handleDelete = () => {
    // Here you would typically delete the document
    // For now, we'll just show a success message and navigate back
    
    // Get the boat ID from the URL or context
    const boatId = '1'; // This would come from the route or context in a real app
    
    // Show confirmation dialog
    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
        alert('Le document a été supprimé avec succès');
        router.push(`/boats/${boatId}`);
      }
    } else {
      alert('Le document a été supprimé avec succès');
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
          {isNewDocument ? 'Nouveau document' : 'Modifier le document'}
        </Text>
      </View>

      <View style={styles.form}>
        <TouchableOpacity 
          style={[styles.fileSelector, errors.file && styles.fileSelectorError]}
          onPress={handleChooseDocument}
        >
          <Upload size={24} color={errors.file ? '#ff4444' : '#0066CC'} />
          <Text style={styles.fileSelectorText}>
            {selectedFile ? selectedFile.name : 'Sélectionner un document'}
          </Text>
        </TouchableOpacity>
        {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nom du document</Text>
          <View style={[styles.inputWrapper, errors.name && styles.inputWrapperError]}>
            <FileText size={20} color={errors.name ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(text) => {
                setForm(prev => ({ ...prev, name: text }));
                if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
              }}
              placeholder="ex: Acte de francisation, Assurance"
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        <View style={styles.documentSuggestions}>
          <Text style={styles.documentSuggestionsTitle}>Types de documents suggérés</Text>
          <View style={styles.documentTags}>
            {documentTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.documentTag,
                  form.name === type && styles.documentTagSelected
                ]}
                onPress={() => {
                  setForm(prev => ({ ...prev, name: type }));
                  if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                }}
              >
                <Text style={[
                  styles.documentTagText,
                  form.name === type && styles.documentTagTextSelected
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date du document</Text>
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

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>
            {isNewDocument ? 'Ajouter le document' : 'Enregistrer les modifications'}
          </Text>
        </TouchableOpacity>

        {!isNewDocument && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>Supprimer le document</Text>
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
  fileSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
  },
  fileSelectorError: {
    backgroundColor: '#fff5f5',
    borderColor: '#ff4444',
  },
  fileSelectorText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
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
  documentSuggestions: {
    marginTop: 8,
  },
  documentSuggestionsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  documentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  documentTag: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  documentTagSelected: {
    backgroundColor: '#0066CC',
  },
  documentTagText: {
    fontSize: 14,
    color: '#0066CC',
  },
  documentTagTextSelected: {
    color: 'white',
    fontWeight: '500',
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