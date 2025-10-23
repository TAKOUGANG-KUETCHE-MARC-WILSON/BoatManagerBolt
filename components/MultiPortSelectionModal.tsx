// components/MultiPortSelectionModal.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, ActivityIndicator } from 'react-native';
import { MapPin, Search, X, Check } from 'lucide-react-native';


interface Port {
  id: string;
  name: string;
}


interface MultiPortSelectionModalProps {
  showPortModal: boolean;
  setShowPortModal: (visible: boolean) => void;
  allPorts: Port[];
  selectedPorts: Port[];
  setSelectedPorts: (ports: Port[]) => void;
  isFetchingPorts: boolean;
}


export default function MultiPortSelectionModal({
  showPortModal,
  setShowPortModal,
  allPorts,
  selectedPorts,
  setSelectedPorts,
  isFetchingPorts,
}: MultiPortSelectionModalProps) {
  const [tempSelectedPorts, setTempSelectedPorts] = useState<Port[]>(selectedPorts);
  const [searchQuery, setSearchQuery] = useState('');


  useEffect(() => {
    setTempSelectedPorts(selectedPorts);
  }, [selectedPorts]);


  const togglePortSelection = (port: Port) => {
    setTempSelectedPorts(prev => {
      if (prev.some(p => p.id === port.id)) {
        return prev.filter(p => p.id !== port.id);
      } else {
        return [...prev, port];
      }
    });
  };


  const handleConfirmSelection = () => {
    setSelectedPorts(tempSelectedPorts);
    setShowPortModal(false);
  };


  const filteredPorts = allPorts.filter(port =>
    port.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  return (
    <Modal
      visible={showPortModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner les ports</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPortModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
         
          <View style={styles.searchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un port..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>


          <ScrollView style={styles.modalBody}>
            {isFetchingPorts ? (
              <ActivityIndicator size="large" color="#0066CC" />
            ) : filteredPorts.length > 0 ? (
              filteredPorts.map((port) => (
                <TouchableOpacity
                  key={port.id}
                  style={[
                    styles.modalItem,
                    tempSelectedPorts.some(p => p.id === port.id) && styles.modalItemSelected
                  ]}
                  onPress={() => togglePortSelection(port)}
                >
                  <MapPin size={20} color={tempSelectedPorts.some(p => p.id === port.id) ? '#0066CC' : '#666'} />
                  <Text style={[
                    styles.modalItemText,
                    tempSelectedPorts.some(p => p.id === port.id) && styles.modalItemTextSelected
                  ]}>
                    {port.name}
                  </Text>
                  {tempSelectedPorts.some(p => p.id === port.id) && (
                    <Check size={20} color="#0066CC" />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyModalText}>Aucun port disponible.</Text>
            )}
          </ScrollView>


          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPortModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
           
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleConfirmSelection}
            >
              <Check size={20} color="white" />
              <Text style={styles.saveButtonText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}


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
  closeButton: {
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
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  modalBody: {
    padding: 16,
    maxHeight: 300,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalItemTextSelected: {
    color: '#0066CC',
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
});



