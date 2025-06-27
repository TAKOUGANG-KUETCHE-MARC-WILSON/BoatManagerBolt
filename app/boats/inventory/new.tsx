import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, PenTool as Tool, User, FileText, Plus, Upload, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface Document {
  id: string;
  name: string;
  type: string;
  date: string;
  file: string;
}

interface InventoryItemForm {
  equipmentType: string;
  description: string;
  installationDate: string;
  installedBy: string;
  documents: Document[];
}

export default function NewInventoryItemScreen() {
  const { boatId } = useLocalSearchParams();
  const [form, setForm] = useState<InventoryItemForm>({
    equipmentType: '',
    description: '',
    installationDate: '',
    installedBy: '',
    documents: [],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof InventoryItemForm, string>>>({});
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setForm(prev => ({ ...prev, installationDate: today }));
  }, []);

  const validateForm = () => {
    const newErrors: Partial<Record<keyof InventoryItemForm, string>> = {};

    if (!form.equipmentType.trim()) newErrors.equipmentType = 'Le type d\'équipement est requis';
    if (!form.description.trim()) newErrors.description = 'La description est requise';
    if (!form.installationDate.trim()) newErrors.installationDate = 'La date d\'installation est requise';
    if (!form.installedBy.trim()) newErrors.installedBy = 'Le prestataire est requis';

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

      const newDocument: Document = {
        id: `doc-${Date.now()}`,
        name: result.assets[0].name,
        type: result.assets[0].mimeType || 'unknown',
        date: new Date().toISOString().split('T')[0],
        file: result.assets[0].uri,
      };

      setForm(prev => ({
        ...prev,
        documents: [...(prev.documents || []), newDocument],
      }));
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sélection du document.');
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
      // In a real app, you would save this new inventory item to your backend
      Alert.alert(
        'Succès',
        'L\'équipement a été ajouté avec succès',
        [
          {
            text: 'OK',
            onPress: () => router.push(`/boats/${boatId || '1'}`)
          }
        ]
      );
    }
  };

  const handleDateConfirm = (date: Date) => {
    setForm(prev => ({ ...prev, installationDate: date.toISOString().split('T')[0] }));
    setDatePickerVisible(false);
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
        <Text style={styles.title}>Nouvel équipement</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Type d'équipement</Text>
          <View style={[styles.inputWrapper, errors.equipmentType && styles.inputWrapperError]}>
            <Tool size={20} color={errors.equipmentType ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.input}
              value={form.equipmentType}
              onChangeText={(text) => {
                setForm(prev => ({ ...prev, equipmentType: text }));
                if (errors.equipmentType) setErrors(prev => ({ ...prev, equipmentType: undefined }));
              }}
              placeholder="ex: GPS, Pompe de cale, Gilet de sauvetage"
            />
          </View>
          {errors.equipmentType && <Text style={styles.errorText}>{errors.equipmentType}</Text>}
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
              placeholder="Description détaillée de l'équipement (marque, modèle, numéro de série...)"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date d'installation</Text>
          <TouchableOpacity
            style={[styles.inputWrapper, errors.installationDate && styles.inputWrapperError]}
            onPress={() => setDatePickerVisible(true)}
          >
            <Calendar size={20} color={errors.installationDate ? '#ff4444' : '#666'} />
            <Text style={styles.input}>
              {form.installationDate || 'Sélectionner une date'}
            </Text>
          </TouchableOpacity>
          {errors.installationDate && <Text style={styles.errorText}>{errors.installationDate}</Text>}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Installée par</Text>
          <View style={[styles.inputWrapper, errors.installedBy && styles.inputWrapperError]}>
            <User size={20} color={errors.installedBy ? '#ff4444' : '#666'} />
            <TextInput
              style={styles.input}
              value={form.installedBy}
              onChangeText={(text) => {
                setForm(prev => ({ ...prev, installedBy: text }));
                if (errors.installedBy) setErrors(prev => ({ ...prev, installedBy: undefined }));
              }}
              placeholder="ex: Nautisme Pro, Moi-même"
            />
          </View>
          {errors.installedBy && <Text style={styles.errorText}>{errors.installedBy}</Text>}
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
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Ajouter l'équipement</Text>
        </TouchableOpacity>
      </View>

      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        onConfirm={handleDateConfirm}
        onCancel={() => setDatePickerVisible(false)}
      />
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
});
