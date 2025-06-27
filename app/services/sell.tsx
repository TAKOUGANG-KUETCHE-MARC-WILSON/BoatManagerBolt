import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Modal, Image } from 'react-native';
import { Ship, Euro, Info, Calendar, Wrench, Clock, Ruler, MapPin, ChevronRight, X, Bot as Boat } from 'lucide-react-native';
import ServiceForm from '@/components/ServiceForm';
import { useAuth } from '@/context/AuthContext';

interface BoatDetails {
  id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  constructionYear: string;
  engine: string;
  engineHours: string;
  length: string;
  homePort: string;
  image: string;
}

export default function SellBoatScreen() {
  const { user, isAuthenticated } = useAuth();
  const [showBoatSelector, setShowBoatSelector] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<BoatDetails | null>(null);
  const [userBoats, setUserBoats] = useState<BoatDetails[]>([]);

  // Fetch user's boats when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      // In a real app, this would be an API call to fetch the user's boats
      // For now, we'll use mock data
      const mockUserBoats: BoatDetails[] = [
        {
          id: '1',
          name: 'Le Grand Bleu',
          type: 'Voilier',
          manufacturer: 'Bénéteau',
          model: 'Oceanis 45',
          constructionYear: '2020',
          engine: 'Volvo Penta D2-50',
          engineHours: '500',
          length: '12m',
          homePort: 'Port de Marseille',
          image: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop'
        },
        {
          id: '2',
          name: 'Le Petit Prince',
          type: 'Yacht',
          manufacturer: 'Jeanneau',
          model: 'Sun Odyssey 410',
          constructionYear: '2022',
          engine: 'Yanmar 4JH45',
          engineHours: '200',
          length: '15m',
          homePort: 'Port de Nice',
          image: 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?q=80&w=2044&auto=format&fit=crop'
        }
      ];
      
      setUserBoats(mockUserBoats);
    }
  }, [isAuthenticated]);

  const handleSubmit = (formData: any) => {
    // If a boat is selected, use its data
    const finalData = selectedBoat 
      ? { 
          ...selectedBoat,
          ...formData, // Allow overriding with form data if user modified anything
          boatId: selectedBoat.id
        }
      : formData;
    
    console.log('Form submitted:', finalData);
    // Handle form submission
  };

  const handleSelectBoat = (boat: BoatDetails) => {
    setSelectedBoat(boat);
    setShowBoatSelector(false);
  };

  const BoatSelectorModal = () => (
    <Modal
      visible={showBoatSelector}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBoatSelector(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner un bateau</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowBoatSelector(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.boatList}>
            {userBoats.map(boat => (
              <TouchableOpacity
                key={boat.id}
                style={styles.boatItem}
                onPress={() => handleSelectBoat(boat)}
              >
                <Image source={{ uri: boat.image }} style={styles.boatImage} />
                <View style={styles.boatItemInfo}>
                  <Text style={styles.boatItemName}>{boat.name}</Text>
                  <Text style={styles.boatItemDetails}>
                    {boat.type} • {boat.manufacturer} {boat.model}
                  </Text>
                  <Text style={styles.boatItemDetails}>
                    {boat.length} • {boat.constructionYear}
                  </Text>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const BoatSelector = () => (
    <View style={styles.boatSelectorContainer}>
      <Text style={styles.boatSelectorTitle}>Sélectionner un bateau existant</Text>
      <Text style={styles.boatSelectorDescription}>
        Vous pouvez sélectionner un de vos bateaux existants ou remplir les informations manuellement.
      </Text>
      
      <TouchableOpacity 
        style={styles.selectBoatButton}
        onPress={() => setShowBoatSelector(true)}
      >
        <Boat size={20} color="#0066CC" />
        <Text style={styles.selectBoatButtonText}>
          {selectedBoat ? `${selectedBoat.name} (${selectedBoat.type})` : "Sélectionner un bateau"}
        </Text>
        <ChevronRight size={20} color="#0066CC" />
      </TouchableOpacity>
      
      {selectedBoat && (
        <TouchableOpacity 
          style={styles.clearSelectionButton}
          onPress={() => setSelectedBoat(null)}
        >
          <Text style={styles.clearSelectionText}>Effacer la sélection</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {isAuthenticated && userBoats.length > 0 && <BoatSelector />}
        
        <ServiceForm
          title="Je souhaite vendre mon bateau"
          description="Remplissez le formulaire ci-dessous pour mettre en vente votre bateau"
          fields={[
            {
              name: 'boatType',
              label: 'Type de bateau',
              placeholder: 'ex: Voilier, Motoryacht, Catamaran,...',
              icon: Ship,
              value: selectedBoat?.type,
            },
            {
              name: 'manufacturer',
              label: 'Constructeur',
              placeholder: 'ex: Bénéteau, Jeanneau,...',
              icon: Info,
              value: selectedBoat?.manufacturer,
            },
            {
              name: 'model',
              label: 'Modèle',
              placeholder: 'ex: Oceanis 45',
              icon: Info,
              value: selectedBoat?.model,
            },
            {
              name: 'constructionYear',
              label: 'Année de construction',
              placeholder: 'ex: 2020',
              icon: Calendar,
              keyboardType: 'numeric',
              value: selectedBoat?.constructionYear,
            },
            {
              name: 'engine',
              label: 'Moteur',
              placeholder: 'ex: Volvo Penta D2-50',
              icon: Wrench,
              value: selectedBoat?.engine,
            },
            {
              name: 'engineHours',
              label: 'Heures moteur',
              placeholder: 'ex: 500',
              icon: Clock,
              keyboardType: 'numeric',
              value: selectedBoat?.engineHours,
            },
            {
              name: 'length',
              label: 'Longueur',
              placeholder: 'ex: 12m',
              icon: Ruler,
              value: selectedBoat?.length,
            },
            {
              name: 'homePort',
              label: 'Port d\'attache',
              placeholder: 'ex: Marseille, Brest, ...',
              icon: MapPin,
              value: selectedBoat?.homePort,
            },
          ]}
          submitLabel="Envoyer"
          onSubmit={handleSubmit}
        />
      </View>
      
      <BoatSelectorModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
  },
  boatSelectorContainer: {
    backgroundColor: '#f0f7ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  boatSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 8,
  },
  boatSelectorDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  selectBoatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectBoatButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#0066CC',
    marginLeft: 12,
  },
  clearSelectionButton: {
    alignSelf: 'center',
    marginTop: 12,
    padding: 8,
  },
  clearSelectionText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
  boatList: {
    padding: 16,
  },
  boatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  boatImage: {
    width: 80,
    height: 80,
  },
  boatItemInfo: {
    flex: 1,
    padding: 12,
  },
  boatItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  boatItemDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
});