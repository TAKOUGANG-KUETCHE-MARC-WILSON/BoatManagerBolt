import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { MapPin, Search, X, Check } from 'lucide-react-native';

interface Port {
  id: string;
  name: string;
}

interface PortSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPort: (port: Port) => void;
  selectedPortId: string | null;
  portsData: Port[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export default function PortSelectionModal({
  visible,
  onClose,
  onSelectPort,
  selectedPortId,
  portsData,
  searchQuery,
  onSearchQueryChange,
}: PortSelectionModalProps) {
  const filteredPorts = portsData.filter(port =>
    port.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              style={styles.closeButton}
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
              value={searchQuery}
              onChangeText={onSearchQueryChange}
            />
          </View>

          <ScrollView style={styles.portsList}>
            {filteredPorts.map((port) => (
              <TouchableOpacity
                key={port.id}
                style={[
                  styles.portItem,
                  selectedPortId === port.id && styles.selectedPortItem
                ]}
                onPress={() => onSelectPort(port)}
              >
                <MapPin size={20} color={selectedPortId === port.id ? "#0066CC" : "#666"} />
                <Text style={[
                  styles.portItemText,
                  selectedPortId === port.id && styles.selectedPortItemText
                ]}>
                  {String(port.name ?? '')}
                </Text>
                {selectedPortId === port.id && (
                  <Check size={20} color="#0066CC" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  portsList: {
    maxHeight: 300,
    paddingHorizontal: 16,
  },
  portItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
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
  checkIcon: {
    marginLeft: 'auto',
  },
});
