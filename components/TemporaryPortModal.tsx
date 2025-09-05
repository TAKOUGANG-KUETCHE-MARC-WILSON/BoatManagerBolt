// components/TemporaryPortModal.tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Alert } from 'react-native';
import { MapPin, Search, X, Check } from 'lucide-react-native';

interface Port {
  id: string;
  name: string;
}

interface TemporaryPortModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPort: (port: Port) => Promise<void>; // La fonction du parent pour gérer la sélection
  allPorts: Port[];
  userHomePortId: string | null;
  temporaryPortSearch: string; // La valeur de recherche
  setTemporaryPortSearch: (query: string) => void; // La fonction pour mettre à jour la recherche
  selectedTemporaryPortId: string | null; // L'ID du port temporairement sélectionné
}

const TemporaryPortModal = ({
  visible,
  onClose,
  onSelectPort,
  allPorts,
  userHomePortId,
  temporaryPortSearch,
  setTemporaryPortSearch,
  selectedTemporaryPortId,
}: TemporaryPortModalProps) => {

 const filteredPorts = allPorts.filter(port =>
  (port.name ?? '').toLowerCase().includes((temporaryPortSearch ?? '').toLowerCase())
);

  // Cette fonction interne appellera la fonction onSelectPort passée en prop
  const handleSelectPortInternal = async (port: Port) => {
    await onSelectPort(port); // Appelle le gestionnaire du parent
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un port</Text>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un port..."
              value={temporaryPortSearch}
              onChangeText={setTemporaryPortSearch}
            />
          </View>
          
          <ScrollView style={styles.portsList}>
            {filteredPorts.map((port) => (
              <TouchableOpacity
                key={port.id}
                style={[
                  styles.portItem,
                  selectedTemporaryPortId === port.id && styles.selectedPortItem
                ]}
                onPress={() => handleSelectPortInternal(port)}
              >
                <MapPin size={20} color={selectedTemporaryPortId === port.id ? "#0066CC" : "#666"} />
                <Text style={[
                  styles.portItemText,
                  selectedTemporaryPortId === port.id && styles.selectedPortItemText
                ]}>
                  {String(port.name ?? '')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  portsList: {
    maxHeight: 300, // Assure une hauteur maximale pour le défilement
  },
  portItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedPortItem: {
    backgroundColor: '#f0f7ff',
  },
  portItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  selectedPortItemText: {
    color: '#0066CC',
    fontWeight: '500',
  },
});

export default TemporaryPortModal;
