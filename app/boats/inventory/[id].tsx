import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Tag, Info, Calendar, Hash, FileText, XCircle, User, Tool, Upload, Download } from 'lucide-react-native';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client




interface InventoryItem {
  id: string;
  category: string;
  name: string;
  description?: string; // Added description
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  notes?: string;
  installed_by?: string; // Added installed_by
  boat_id: string;
  documents?: Array<{ // Added documents array
    id: string;
    name: string;
    type: string;
    date: string;
    file_url: string;
  }>;
}




export default function InventoryItemDetailScreen() {
  const { id, boatId } = useLocalSearchParams<{ id: string; boatId: string }>();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);




  useEffect(() => {
    const fetchInventoryItem = async () => {
      if (!id || typeof id !== 'string' || !boatId || typeof boatId !== 'string') {
        setFetchError('ID de l\'équipement ou du bateau manquant.');
        setLoading(false);
        return;
      }




      setLoading(true);
      setFetchError(null);
      try {
        const { data, error } = await supabase
          .from('boat_inventory')
          .select(`
            id,
            category,
            name,
            description,
            brand,
            model,
            serial_number,
            purchase_date,
            notes,
            installed_by,
            boat_id,
            boat_inventory_documents(id, name, type, date, file_url)
          `)
          .eq('id', id)
          .eq('boat_id', boatId)
          .single();




        if (error) {
          if (error.code === 'PGRST116') { // No rows found
            setFetchError('Équipement non trouvé.');
          } else {
            console.error('Error fetching inventory item:', error);
            setFetchError('Erreur lors du chargement de l\'équipement.');
          }
          setLoading(false);
          return;
        }




        if (data) {
          setItem({
            id: data.id.toString(),
            category: data.category || 'Non spécifié',
            name: data.name || 'Non spécifié',
            description: data.description || undefined,
            brand: data.brand || undefined,
            model: data.model || undefined,
            serial_number: data.serial_number || undefined,
            purchase_date: data.purchase_date || undefined,
            notes: data.notes || undefined,
            installed_by: data.installed_by || undefined,
            boat_id: data.boat_id.toString(),
            documents: data.boat_inventory_documents.map((doc: any) => ({
              id: doc.id.toString(),
              name: doc.name,
              type: doc.type,
              date: doc.date,
              file_url: doc.file_url,
            })),
          });
        } else {
          setFetchError('Équipement non trouvé.');
        }
      } catch (e) {
        console.error('Unexpected error fetching inventory item:', e);
        setFetchError('Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
    };




    fetchInventoryItem();
  }, [id, boatId]);




  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };




  const handleDownloadDocument = (fileUrl: string) => {
    // Implement file download logic here
    // For web, you might open in a new tab: window.open(fileUrl, '_blank');
    // For React Native, you might use Linking or a file download library
    Alert.alert('Télécharger le document', `Vous pouvez télécharger le document depuis : ${fileUrl}`);
    console.log('Download document:', fileUrl);
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
          <Text style={styles.title}>Chargement...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des détails de l'équipement...</Text>
        </View>
      </View>
    );
  }




  if (fetchError || !item) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Équipement non trouvé</Text>
        </View>
        <View style={styles.errorContainer}>
          <XCircle size={48} color="#ccc" />
          <Text style={styles.errorText}>{fetchError || 'Cet équipement n\'existe pas ou n\'est pas associé à ce bateau.'}</Text>
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Détails de l'équipement</Text>
      </View>




      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>




          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nom de l'équipement</Text>
            <View style={styles.inputWrapper}>
              <Tag size={20} color="#666" />
              <Text style={styles.input}>{item.name}</Text>
            </View>
          </View>




          <View style={styles.inputContainer}>
            <Text style={styles.label}>Catégorie</Text>
            <View style={styles.inputWrapper}>
              <Info size={20} color="#666" />
              <Text style={styles.input}>{item.category}</Text>
            </View>
          </View>




          {item.description && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Description</Text>
              <View style={styles.textAreaWrapper}>
                <FileText size={20} color="#666" style={styles.textAreaIcon} />
                <Text style={styles.textArea}>{item.description}</Text>
              </View>
            </View>
          )}




          {item.brand && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Marque</Text>
              <View style={styles.inputWrapper}>
                <Tag size={20} color="#666" />
                <Text style={styles.input}>{item.brand}</Text>
              </View>
            </View>
          )}




          {item.model && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Modèle</Text>
              <View style={styles.inputWrapper}>
                <Info size={20} color="#666" />
                <Text style={styles.input}>{item.model}</Text>
              </View>
            </View>
          )}




          {item.serial_number && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Numéro de série</Text>
              <View style={styles.inputWrapper}>
                <Hash size={20} color="#666" />
                <Text style={styles.input}>{item.serial_number}</Text>
              </View>
            </View>
          )}




          {item.purchase_date && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date d'achat</Text>
              <View style={styles.inputWrapper}>
                <Calendar size={20} color="#666" />
                <Text style={styles.input}>{formatDate(item.purchase_date)}</Text>
              </View>
            </View>
          )}




          {item.installed_by && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Installé par</Text>
              <View style={styles.inputWrapper}>
                <User size={20} color="#666" />
                <Text style={styles.input}>{item.installed_by}</Text>
              </View>
            </View>
          )}




          {item.notes && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Notes additionnelles</Text>
              <View style={styles.textAreaWrapper}>
                <FileText size={20} color="#666" style={styles.textAreaIcon} />
                <Text style={styles.textArea}>{item.notes}</Text>
              </View>
            </View>
          )}
        </View>




        <View style={styles.documentsSection}>
          <View style={styles.documentsSectionHeader}>
            <Text style={styles.documentsSectionTitle}>Documents associés</Text>
          </View>




          {item.documents && item.documents.length > 0 ? (
            <View style={styles.documentsList}>
              {item.documents.map((document) => (
                <View key={document.id} style={styles.documentItem}>
                  <View style={styles.documentInfo}>
                    <FileText size={20} color="#0066CC" />
                    <View style={styles.documentDetails}>
                      <Text style={styles.documentName}>{document.name}</Text>
                      <Text style={styles.documentDate}>{formatDate(document.date)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={() => handleDownloadDocument(document.file_url)}
                  >
                    <Download size={20} color="#0066CC" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noDocuments}>
              <Text style={styles.noDocumentsText}>Aucun document associé.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
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
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1a1a1a',
    // Removed Platform.select for web outlineStyle as it's not an editable TextInput
  },
  textAreaWrapper: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    minHeight: 120,
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
    // Removed Platform.select for web outlineStyle as it's not an editable TextInput
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  documentsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 24,
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
  downloadButton: {
    padding: 4,
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
});