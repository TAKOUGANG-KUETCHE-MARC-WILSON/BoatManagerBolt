import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Tag, Info, Calendar, Hash, FileText, XCircle } from 'lucide-react-native';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

interface InventoryItem {
  id: string;
  category: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string; // Changed from serialNumber to serial_number for Supabase convention
  purchase_date?: string; // Changed from purchaseDate to purchase_date for Supabase convention
  notes?: string;
  boat_id: string; // Added boat_id to the interface
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
          .select('*') // Select all columns
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
            brand: data.brand || undefined,
            model: data.model || undefined,
            serial_number: data.serial_number || undefined,
            purchase_date: data.purchase_date || undefined,
            notes: data.notes || undefined,
            boat_id: data.boat_id.toString(),
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
        <View style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName}>{item.name}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          </View>

          {item.brand && (
            <View style={styles.detailRow}>
              <Tag size={16} color="#666" />
              <Text style={styles.detailLabel}>Marque:</Text>
              <Text style={styles.detailValue}>{item.brand}</Text>
            </View>
          )}
          {item.model && (
            <View style={styles.detailRow}>
              <Info size={16} color="#666" />
              <Text style={styles.detailLabel}>Modèle:</Text>
              <Text style={styles.detailValue}>{item.model}</Text>
            </View>
          )}
          {item.serial_number && (
            <View style={styles.detailRow}>
              <Hash size={16} color="#666" />
              <Text style={styles.detailLabel}>Numéro de série:</Text>
              <Text style={styles.detailValue}>{item.serial_number}</Text>
            </View>
          )}
          {item.purchase_date && (
            <View style={styles.detailRow}>
              <Calendar size={16} color="#666" />
              <Text style={styles.detailLabel}>Date d'achat:</Text>
              <Text style={styles.detailValue}>{item.purchase_date}</Text>
            </View>
          )}
          {item.notes && (
            <View style={styles.notesContainer}>
              <FileText size={16} color="#666" />
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
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
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  categoryBadge: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    width: 120, // Fixed width for labels for alignment
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  notesLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
    width: 120,
  },
  notesText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 24,
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
});
