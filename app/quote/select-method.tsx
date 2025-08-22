import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, FileText, Plus, Upload } from 'lucide-react-native';

export default function SelectQuoteMethodScreen() {
  const params = useLocalSearchParams(); // Get all params from the previous screen

  const handleCreateNewQuote = () => {
    router.push({
      pathname: '/quote/new',
      params: params, // Pass all received params
    });
  };

  const handleUploadQuoteDocument = () => {
    router.push({
      pathname: '/quote/upload-document', // This will be a new file
      params: params, // Pass all received params
    });
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
        <Text style={styles.title}>Sélectionner une méthode de devis</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Comment souhaitez-vous gérer ce devis ?
        </Text>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleCreateNewQuote}
        >
          <Plus size={24} color="#0066CC" />
          <Text style={styles.optionButtonText}>Créer un nouveau devis</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={handleUploadQuoteDocument}
        >
          <Upload size={24} color="#0066CC" />
          <Text style={styles.optionButtonText}>Déposer un document de devis</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    gap: 12,
    marginBottom: 15,
    width: '80%',
    maxWidth: 300,
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
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
});
