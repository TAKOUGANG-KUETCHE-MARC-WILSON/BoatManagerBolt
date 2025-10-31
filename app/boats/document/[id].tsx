import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, Calendar, FileText, Upload } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
(global as any).Buffer = (global as any).Buffer || Buffer;


 const BUCKET = 'user.documents'; // <-- déplace ici


interface DocumentForm {
  id?: string; // Optional for new documents
  name: string;
  type: string; // e.g., 'administrative', 'technical', 'invoice'
  date: string; // YYYY-MM-DD
  file_url: string; // URL of the file in Supabase Storage
  id_boat: string; // Foreign key to the boat
  file_key?: string;
}

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
  const { id, boatId } = useLocalSearchParams<{ id: string; boatId: string }>();
  const isNewDocument = id === 'new';

  const [form, setForm] = useState<DocumentForm>({
    name: '',
    type: 'administrative',
    date: new Date().toISOString().split('T')[0], // Default to today
    file_url: '',
    id_boat: boatId || '', // Ensure boatId is passed via URL params
  });
  const [errors, setErrors] = useState<Partial<Record<keyof DocumentForm, string>>>({});
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string; type: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!boatId) {
      setFetchError('ID du bateau manquant. Impossible de charger ou d\'ajouter un document.');
      setLoading(false);
      return;
    }

    if (!isNewDocument && typeof id === 'string') {
      const fetchDocument = async () => {
        setLoading(true);
        setFetchError(null);
        try {
          const { data, error } = await supabase
            .from('user_documents')
            .select('*')
            .eq('id', id)
            .eq('id_boat', boatId)
            .single();

          if (error) {
            if (error.code === 'PGRST116') { // No rows found
              setFetchError('Document non trouvé.');
            } else {
              console.error('Error fetching document:', error);
              setFetchError('Erreur lors du chargement du document.');
            }
            setLoading(false);
            return;
          }

          if (data) {
  // 1) on garde les infos en l’état
  setForm({
    id: data.id.toString(),
    name: data.name,
    type: data.type,
    date: data.date,
    file_url: data.file_url,
    id_boat: data.id_boat.toString(),
    file_key: data.file_key ?? undefined, // si la colonne existe
  });

  // 2) on tente de générer une URL signée fraîche pour l’aperçu (1h)
  let previewUrl = data.file_url;
  const keyForSigning =
    data.file_key ??
    extractPathFromPublicUrl(data.file_url, BUCKET);

  if (keyForSigning) {
    const { data: signed, error: signErr } = await supabase
      .storage.from(BUCKET)
      .createSignedUrl(keyForSigning, 60 * 60, { download: data.name });

    if (!signErr && signed?.signedUrl) {
      previewUrl = signed.signedUrl;
    }
  }

  setSelectedFile({ name: data.name, uri: previewUrl, type: data.type });
}
else {
            setFetchError('Document non trouvé.');
          }
        } catch (e) {
          console.error('Unexpected error fetching document:', e);
          setFetchError('Une erreur inattendue est survenue.');
        } finally {
          setLoading(false);
        }
      };
      fetchDocument();
    } else {
      setLoading(false);
    }
  }, [id, boatId, isNewDocument]);

  const handleChooseDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'], // Allow PDF and image files
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      setSelectedFile({
        name: file.name,
        uri: file.uri,
        type: file.mimeType || 'application/octet-stream',
      });

      // If no name is set yet, use the file name (without extension)
      if (!form.name) {
        setForm(prev => ({
          ...prev,
          name: file.name.split('.').slice(0, -1).join('.'), // Remove extension
        }));
      }

      // Clear file error if it was present
      if (errors.file_url) {
        setErrors(prev => ({ ...prev, file_url: undefined }));
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la sélection du document.');
    }
  };

  const validateForm = () => {
    const newErrors: Partial<Record<keyof DocumentForm, string>> = {};

    if (!form.name.trim()) newErrors.name = 'Le nom est requis';
    if (!form.date.trim()) newErrors.date = 'La date est requise';
    if (!selectedFile && !form.file_url) newErrors.file_url = 'Le document est requis';
    if (!form.id_boat) newErrors.id_boat = 'L\'ID du bateau est manquant.'; // Should not happen if boatId is passed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  
function extractPathFromPublicUrl(publicUrl: string, bucket: string) {
  // publicUrl = https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
  try {
    const u = new URL(publicUrl);
    const marker = `/object/public/${bucket}/`;
    const i = u.pathname.indexOf(marker);
    if (i === -1) return null;
    return u.pathname.substring(i + marker.length); // => "<path/in/bucket>"
  } catch {
    return null;
  }
}

const handleSubmit = async () => {
  if (!validateForm()) return;

  setLoading(true);
  setFetchError?.(null); // si tu n'as pas ce state, supprime cette ligne

  let newFileUrl = form.file_url;

  try {
    // 1) Upload si un nouveau fichier a été choisi
    if (selectedFile && selectedFile.uri && selectedFile.uri !== form.file_url) {
      // 1.a) Supprimer l'ancien fichier s'il existe dans le même bucket
      if (form.file_url) {
        const oldPath = extractPathFromPublicUrl(form.file_url, BUCKET);
        if (oldPath) {
          const { error: delErr } = await supabase.storage.from(BUCKET).remove([oldPath]);
          if (delErr) console.warn('Error deleting old file from storage:', delErr);
        }
      }

      // 1.b) Choisir un chemin propre
      const ext = (selectedFile.name.split('.').pop() || 'dat').toLowerCase();
      const filePath = `user_documents/${form.id_boat}/${Date.now()}.${ext}`;

      // 1.c) Résoudre les URI Android "content://" -> copier vers cache "file://"
      let fileUri = selectedFile.uri;
      if (fileUri.startsWith('content://')) {
        const dest = `${FileSystem.cacheDirectory}${Date.now()}-${selectedFile.name}`;
        await FileSystem.copyAsync({ from: fileUri, to: dest });
        fileUri = dest;
      }

      // 1.d) Lire en base64 puis convertir en octets
      const base64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = Buffer.from(base64, 'base64');
      if (bytes.byteLength === 0) {
        throw new Error('Le fichier lu est vide (0 octet).');
      }
      const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

      // 1.e) Uploader les octets
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, arrayBuffer as ArrayBuffer, {
          contentType: selectedFile.type || 'application/octet-stream',
          upsert: true, // ok si tu veux autoriser l'écrasement
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        Alert.alert('Erreur', `Échec du téléchargement du fichier: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      // 1.f) Récupérer l’URL publique
    // 1.f) Générer une URL signée (bucket privé OK)
const { data: signedData, error: signErr } = await supabase.storage
  .from(BUCKET)
  .createSignedUrl(filePath, 60 * 60, { download: selectedFile.name });

if (signErr || !signedData?.signedUrl) {
  throw new Error(signErr?.message || "Impossible de signer l'URL du fichier.");
}
newFileUrl = signedData.signedUrl;
// On garde aussi la clé (si la colonne existe côté DB)
const newFileKey = filePath;

}

    // 2) Opération DB
    if (isNewDocument) {
      const insertPayload: any = {
  name: form.name,
  type: form.type,
  date: form.date,
  file_url: newFileUrl,
  id_boat: parseInt(form.id_boat),
};
if (form.file_key) insertPayload.file_key = form.file_key;

const { error } = await supabase
  .from('user_documents')
  .insert(insertPayload)
  .select('id')
  .single();


      if (error) {
        console.error('Error inserting document:', error);
        Alert.alert('Erreur', `Échec de l'ajout du document: ${error.message}`);
      } else {
        Alert.alert('Succès', 'Le document a été ajouté avec succès.', [
          { text: 'OK', onPress: () => router.push(`/boats/${form.id_boat}`) },
        ]);
      }
    } else {
      // ⚠️ assure-toi que "id" est bien défini (id du document)
      const updatePayload: any = {
  name: form.name,
  type: form.type,
  date: form.date,
  file_url: newFileUrl,
};
if (newFileKey ?? form.file_key) updatePayload.file_key = newFileKey ?? form.file_key;

const { error } = await supabase
  .from('user_documents')
  .update(updatePayload)
  .eq('id', id)
  .eq('id_boat', form.id_boat);


      if (error) {
        console.error('Error updating document:', error);
        Alert.alert('Erreur', `Échec de la mise à jour du document: ${error.message}`);
      } else {
        Alert.alert('Succès', 'Le document a été mis à jour avec succès.', [
          { text: 'OK', onPress: () => router.push(`/boats/${form.id_boat}`) },
        ]);
      }
    }
  } catch (e: any) {
    console.error('Unexpected error during submission:', e);
    Alert.alert('Erreur', e?.message || 'Une erreur inattendue est survenue.');
  } finally {
    setLoading(false);
  }
};


  const handleDelete = async () => {
    Alert.alert(
      'Supprimer le document',
      'Êtes-vous sûr de vouloir supprimer ce document ? Cette action est irréversible.',
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
              // 1. Delete file from storage
           // on privilégie file_key si présent, sinon on extrait depuis file_url
const filePathForDelete =
  form.file_key ??
  extractPathFromPublicUrl(form.file_url, BUCKET);

if (filePathForDelete) {
  const { error: deleteFileError } = await supabase.storage
    .from(BUCKET)
    .remove([filePathForDelete]);
  if (deleteFileError) {
    console.warn('Error deleting file from storage:', deleteFileError);
    // on continue malgré tout
  }
}


              // 2. Delete record from database
              const { error: deleteRecordError } = await supabase
                .from('user_documents')
                .delete()
                .eq('id', id)
                .eq('id_boat', form.id_boat);

              if (deleteRecordError) {
                console.error('Error deleting document record:', deleteRecordError);
                Alert.alert('Erreur', `Échec de la suppression du document: ${deleteRecordError.message}`);
              } else {
                Alert.alert(
                  'Succès',
                  'Le document a été supprimé avec succès.',
                  [
                    {
                      text: 'OK',
                      onPress: () => router.push(`/boats/${form.id_boat}`)
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
            {isNewDocument ? 'Nouveau document' : 'Modifier le document'}
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
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
    <Stack.Screen options={{ headerShown: false }} />
    <StatusBar style="dark" backgroundColor="#fff" />

    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#1a1a1a" />
      </TouchableOpacity>

      <Text style={styles.title}>
        {isNewDocument ? 'Nouveau document' : 'Modifier le document'}
      </Text>

      {/* petit placeholder pour garder le titre parfaitement centré */}
      <View style={{ width: 24, height: 24 }} />
    </View>

    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.form}>
        <TouchableOpacity
          style={[styles.fileSelector, errors.file_url && styles.fileSelectorError]}
          onPress={handleChooseDocument}
        >
          <Upload size={24} color={errors.file_url ? '#ff4444' : '#0066CC'} />
          <Text style={styles.fileSelectorText}>
            {selectedFile ? selectedFile.name : 'Sélectionner un document'}
          </Text>
        </TouchableOpacity>
        {errors.file_url && <Text style={styles.errorText}>{errors.file_url}</Text>}

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
     </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', // même fond que le header
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 24, // confort de scroll
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // espace back / titre / placeholder
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    flex: 1,                  // <-- important pour centrer
    textAlign: 'center',      // <-- important pour centrer
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  form: {
    padding: 16,
    gap: 20,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
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

  fileSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
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
