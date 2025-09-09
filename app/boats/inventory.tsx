import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowLeft, Save, Check, Ship, Anchor, Wrench, Zap, Droplets, Umbrella, Navigation, ShieldAlert, Utensils, Thermometer, Radio, Tv, Refrigerator, Wind, Compass, Waves, ChevronDown, ChevronUp, Info } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
interface ChecklistItem {
  id: string;
  name: string;
  checked: boolean;
  details?: string;
}

interface ChecklistCategory {
  id: string;
  name: string;
  icon: any;
  items: ChecklistItem[];
  expanded: boolean;
}

export default function BoatInventoryScreen() {
  const { boatId } = useLocalSearchParams<{ boatId: string }>();
  const [categories, setCategories] = useState<ChecklistCategory[]>([
    {
      id: 'exterior',
      name: 'Extérieur',
      icon: Ship,
      expanded: false,
      items: [
        { id: 'passerelle', name: 'Passerelle', checked: false },
        { id: 'passerelle_hydraulique', name: 'Passerelle hydraulique', checked: false },
        { id: 'propulseur_etrave', name: 'Propulseur d\'étrave', checked: true, details: 'RÉTRACTABLE' },
        { id: 'propulseur_poupe', name: 'Propulseur de poupe', checked: true, details: 'RÉTRACTABLE' },
        { id: 'flaps', name: 'Flaps', checked: false },
        { id: 'guindeau_manuel', name: 'Guindeau manuel', checked: false },
        { id: 'guindeau_electrique', name: 'Guindeau électrique', checked: true, details: '1500W' },
        { id: 'ancre', name: 'Ancre', checked: true, details: 'KIT MOUILLAGE COMPLET' },
        { id: 'hybridge', name: 'Hybridge', checked: false },
        { id: 'pont_teck', name: 'Pont en teck', checked: false },
        { id: 'cockpit_teck', name: 'Cockpit en teck', checked: true },
        { id: 'eclairage_cockpit', name: 'Éclairage de cockpit', checked: true },
      ]
    },
    {
      id: 'interior',
      name: 'Intérieur',
      icon: Anchor,
      expanded: false,
      items: [
        { id: 'table_cockpit', name: 'Table de cockpit', checked: true },
        { id: 'barbecue', name: 'Barbecue', checked: true },
        { id: 'plateforme_bain', name: 'Plateforme de bain', checked: true },
        { id: 'echelle_bain', name: 'Échelle de bain', checked: true },
        { id: 'carre_transformable', name: 'Carré transformable', checked: true },
        { id: 'table_a_carte', name: 'Table à carte', checked: true },
        { id: 'glaciere', name: 'Glacière', checked: false },
        { id: 'refrigerateur', name: 'Réfrigérateur', checked: true },
        { id: 'congelateur', name: 'Congélateur', checked: true },
        { id: 'machine_glacons', name: 'Machine à glaçons', checked: false },
        { id: 'cuisiniere', name: 'Cuisinière', checked: false },
        { id: 'rechaud', name: 'Réchaud', checked: true },
        { id: 'micro_onde', name: 'Micro-onde', checked: false },
        { id: 'four', name: 'Four', checked: false },
        { id: 'lave_vaisselle', name: 'Lave vaisselle', checked: false },
        { id: 'lave_linge', name: 'Lave linge', checked: true, details: 'SÉCHANT' },
        { id: 'banquette_carre', name: 'Banquette de carré ambiance weiss', checked: true, details: 'BANQUETTE DE CARRÉ AMBIANCE WEISS' },
        { id: 'sommier_lattes', name: 'Sommier à lattes dans la cabine avant', checked: true, details: 'SOMMIER À LATTES DANS LA CABINE AVANT' },
        { id: 'pack_cuisine', name: 'Pack cuisine de cockpit', checked: true, details: 'PACK CUISINE DE COCKPIT' },
      ]
    },
    {
      id: 'electricity',
      name: 'Électricité - Annexes',
      icon: Zap,
      expanded: false,
      items: [
        { id: 'chargeur', name: 'Chargeur', checked: true, details: '60Ah' },
        { id: 'alternateur', name: 'Alternateur', checked: false },
        { id: 'generateur', name: 'Générateur', checked: true, details: 'MASE 5KVA' },
        { id: 'batterie_moteur', name: 'Batterie(s) moteur(s)', checked: true, details: '1 x 120Ah' },
        { id: 'batterie_service', name: 'Batterie(s) de service', checked: true, details: '3 x 115Ah' },
        { id: 'groupe_electrogene', name: 'Groupe électrogène', checked: false },
        { id: 'convertisseur', name: 'Convertisseur', checked: false },
        { id: 'eolienne', name: 'Éolienne', checked: false },
        { id: 'panneau_solaire', name: 'Panneau solaire', checked: false },
        { id: 'prise_quai', name: 'Prise de quai', checked: true },
        { id: 'circuit_12v', name: 'Circuit 12 V', checked: true },
        { id: 'circuit_24v', name: 'Circuit 24 V', checked: false },
        { id: 'circuit_110v', name: 'Circuit 110 V', checked: false },
        { id: 'circuit_220v', name: 'Circuit 220 V', checked: true },
        { id: 'traitement_ceramique', name: 'Traitement céramique', checked: true, details: 'TRAITEMENT CÉRAMIQUE' },
        { id: 'relevage_jupe', name: 'Relevage jupe arrière mécanisé', checked: true, details: 'RELEVAGE JUPE ARRIÈRE MÉCANISÉ' },
        { id: 'portes_filieres', name: 'Portes dans les filières avec échelle de coupée movible', checked: true, details: 'PORTES DANS LES FILIÈRES AVEC ÉCHELLE DE COUPÉE MOVIBLE' },
      ]
    },
    {
      id: 'rigging',
      name: 'Accastillage - Voiles',
      icon: Navigation,
      expanded: false,
      items: [
        { id: 'chariot_grand_voile', name: 'Chariot de grand voile', checked: true },
        { id: 'rail_ecoute_gv', name: 'Rail d\'écoute de GV', checked: false },
        { id: 'renv_drisse_cockpi', name: 'Renv. de drisse au cockpi', checked: true },
        { id: 'etai_largable', name: 'Étai largable', checked: false },
        { id: 'pataras', name: 'Pataras', checked: true, details: 'HYDRAULIQUE' },
        { id: 'winch', name: 'Winch', checked: false },
        { id: 'manivelle_winch', name: 'Manivelle de winch', checked: true },
        { id: 'winch_electrique', name: 'Winch électrique', checked: true, details: 'x 4' },
        { id: 'cadene_etai', name: 'Cadène étai largable', checked: true, details: 'CADENE ETAI LARGABLE' },
        { id: 'pack_performance', name: 'Pack performance', checked: true, details: 'PACK PERFORMANCE' },
        { id: 'greement_courant', name: 'Gréement courant dyneema', checked: true, details: 'GREEMENT COURANT DYNEEMA' },
        { id: 'pataras_hydraulique', name: 'Pataras hydraulique', checked: true, details: 'PATARAS HYDRAULIQUE' },
        { id: 'genois', name: 'Génois', checked: true, details: 'ELVSTROM DCX - COUPE TRIADIALE 120%' },
        { id: 'enrouleur_genois', name: 'Enrouleur de génois', checked: true },
        { id: 'bande_anti_uv', name: 'Bande anti-UV', checked: false },
        { id: 'grand_voile', name: 'Grand voile', checked: true, details: 'ELVSTROM DCX - COUPE TRIADIALE FULL-BATTEN' },
        { id: 'enrouleur_gv', name: 'Enrouleur de GV', checked: false },
        { id: 'gv_semi_lattee', name: 'GV semi-lattée', checked: false },
        { id: 'gv_full_batten', name: 'GV full batten', checked: true },
        { id: 'spi', name: 'Spi', checked: false },
        { id: 'code_0', name: 'Code 0 avec emmagasineur électrique', checked: true, details: 'CODE 0 AVEC EMMAGASINEUR ÉLECTRIQUE' },
        { id: 'winch_hydraulique', name: 'Winch hydraulique', checked: false },
        { id: 'tangon_spi', name: 'Tangon de spi', checked: false },
        { id: 'chaussette_spi', name: 'Chaussette de spi', checked: false },
        { id: 'greement_spi', name: 'Gréement de spi', checked: false },
        { id: 'bout_dehors', name: 'Bout dehors', checked: true },
        { id: 'barre_franche', name: 'Barre franche', checked: false },
        { id: 'barre_a_roue', name: 'Barre à roue', checked: true, details: 'COMPOSITE NOIR' },
        { id: 'toile_liaison', name: 'Toile de liaison bimini-capote', checked: true, details: 'TOILE DE LIAISON BIMINI-CAPOTE' },
        { id: 'housses_barres', name: 'Housses de barres à roues et table de cockpit graphite', checked: true, details: 'HOUSSES DE BARRES À ROUES ET TABLE DE COCKPIT GRAPHITE' },
        { id: 'tourmentin', name: 'Tourmentin', checked: false },
        { id: 'solent', name: 'Solent', checked: false },
        { id: 'trinquette', name: 'Trinquette', checked: false },
        { id: 'inter', name: 'Inter', checked: false },
        { id: 'gennaker', name: 'Gennaker', checked: false },
        { id: 'autres_voiles', name: 'Autres voiles', checked: false },
        { id: 'lazy_bag', name: 'Lazy bag', checked: true },
        { id: 'lazy_jack', name: 'Lazy jack', checked: true },
      ]
    },
    {
      id: 'electronics',
      name: 'Électronique',
      icon: Zap,
      expanded: false,
      items: [
        { id: 'vhf', name: 'VHF', checked: true, details: 'RAYMARINE' },
        { id: 'loch_speedometre', name: 'Loch-speedomètre', checked: true, details: 'RAYMARINE' },
        { id: 'compas', name: 'Compas', checked: true, details: 'RAYMARINE' },
        { id: 'girouette_anemometre', name: 'Girouette-anémomètre', checked: true, details: 'RAYMARINE' },
        { id: 'gps', name: 'GPS', checked: true, details: 'RAYMARINE' },
        { id: 'traceur', name: 'Traceur', checked: true, details: 'RAYMARINE' },
        { id: 'plotter', name: 'Plotter', checked: false },
        { id: 'sondeur', name: 'Sondeur', checked: true, details: 'RAYMARINE' },
        { id: 'sondeur_peche', name: 'Sondeur de pêche', checked: false },
        { id: 'repetiteur', name: 'Répétiteur(s)', checked: false },
        { id: 'centrale_navigation', name: 'Centrale de navigation', checked: false },
        { id: 'pilote_automatique', name: 'Pilote automatique', checked: true, details: 'RAYMARINE' },
        { id: 'antenne', name: 'Antenne', checked: false },
        { id: 'radar', name: 'Radar', checked: false },
        { id: 'detecteur_radar', name: 'Détecteur radar', checked: false },
        { id: 'reflecteur_radar', name: 'Reflecteur de radar', checked: false },
        { id: 'ordinateur', name: 'Ordinateur', checked: false },
        { id: 'logiciel_navigation', name: 'Logiciel de navigation', checked: false },
        { id: 'alarme', name: 'Alarme', checked: false },
        { id: 'armement', name: 'Armement', checked: true, details: 'SEMI-HAUTURIER 6 PERS' },
        { id: 'survie', name: 'Survie', checked: true },
        { id: 'hivernage', name: 'Hivernage', checked: false },
        { id: 'peinture_coque', name: 'Peinture de coque', checked: false },
        { id: 'antifouling', name: 'Antifouling', checked: true },
        { id: 'traitement_osmose', name: 'Traitement anti-osmose', checked: false },
      ]
    },
    {
      id: 'comfort',
      name: 'Confort',
      icon: Umbrella,
      expanded: false,
      items: [
        { id: 'climatisation', name: 'Climatisation', checked: true, details: '16 KBTU' },
        { id: 'chauffage', name: 'Chauffage', checked: false },
        { id: 'chauffe_eau', name: 'Chauffe eau', checked: true, details: '40L' },
        { id: 'radio_cd', name: 'Radio-CD', checked: false },
        { id: 'hi_fi', name: 'Hi-Fi', checked: true, details: 'FUSION' },
        { id: 'television', name: 'Télévision', checked: true, details: '32" + 22"' },
        { id: 'lecteur_dvd', name: 'Lecteur DVD', checked: false },
        { id: 'dessalinisateur', name: 'Dessalinisateur', checked: false },
        { id: 'compresseur', name: 'Compresseur', checked: false },
        { id: 'wc_marin', name: 'WC marin', checked: false },
        { id: 'wc_chimique', name: 'WC chimique', checked: false },
        { id: 'wc_electrique', name: 'WC électrique', checked: true },
        { id: 'douchette_cockpit', name: 'Douchette de cockpit', checked: true },
        { id: 'coupe_orins', name: 'Coupe-orins', checked: false },
        { id: 'portes_cannes', name: 'Portes cannes', checked: false },
        { id: 'chaise_combat', name: 'Chaise de combat', checked: false },
        { id: 'pompe_cale', name: 'Pompe de cale', checked: true },
      ]
    },
    {
      id: 'sunbathing',
      name: 'Bains de soleil',
      icon: Thermometer,
      expanded: false,
      items: [
        { id: 'bain_soleil_avant', name: 'Bain de soleil avant', checked: false },
        { id: 'bain_soleil_arriere', name: 'Bain de soleil arrière', checked: false },
        { id: 'coussins_cockpit', name: 'Coussins de cockpit', checked: true },
        { id: 'bimini_top', name: 'Bimini top', checked: true },
        { id: 'cabriolet', name: 'Cabriolet', checked: false },
        { id: 'capote_descente', name: 'Capote de descente', checked: true },
      ]
    },
    {
      id: 'covers',
      name: 'Tauds',
      icon: Droplets,
      expanded: false,
      items: [
        { id: 'taud_flybridge', name: 'Taud de flybridge', checked: false },
        { id: 'taud_mouillage', name: 'Taud de mouillage', checked: false },
        { id: 'taud_soleil', name: 'Taud de soleil', checked: false },
        { id: 'taud_camping', name: 'Taud de camping', checked: false },
        { id: 'taud_fermeture', name: 'Taud de fermeture arrière', checked: false },
        { id: 'taud_hivernage', name: 'Taud d\'hivernage', checked: false },
      ]
    },
    {
      id: 'safety',
      name: 'Sécurité',
      icon: ShieldAlert,
      expanded: false,
      items: [
        { id: 'changement_sellerie', name: 'Changement de sellerie', checked: false },
        { id: 'bequilles_echouement', name: 'Béquilles d\'échouement', checked: false },
      ]
    },
    {
      id: 'annexes',
      name: 'Annexes',
      icon: Waves,
      expanded: false,
      items: [
        { id: 'remorque', name: 'Remorque', checked: false },
        { id: 'annexe', name: 'Annexe', checked: false },
        { id: 'moteur_annexe', name: 'Moteur annexe', checked: false },
      ]
    },
    {
      id: 'hydraulic',
      name: 'Hydraulique',
      icon: Wrench,
      expanded: false,
      items: [
        { id: 'winch_hydraulique', name: 'Winch hydraulique', checked: false },
        { id: 'pataras_hydraulique', name: 'Pataras hydraulique', checked: true },
        { id: 'barre_hydraulique', name: 'Barre hydraulique', checked: false },
      ]
    },
  ]);

  const handleToggleItem = (categoryId: string, itemId: string) => {
    setCategories(prevCategories => 
      prevCategories.map(category => 
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map(item => 
                item.id === itemId
                  ? { ...item, checked: !item.checked }
                  : item
              )
            }
          : category
      )
    );
  };

  const handleUpdateItemDetails = (categoryId: string, itemId: string, details: string) => {
    setCategories(prevCategories => 
      prevCategories.map(category => 
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map(item => 
                item.id === itemId
                  ? { ...item, details }
                  : item
              )
            }
          : category
      )
    );
  };

  const handleToggleCategory = (categoryId: string) => {
    setCategories(prevCategories =>
      prevCategories.map(category =>
        category.id === categoryId
          ? { ...category, expanded: !category.expanded }
          : category
      )
    );
  };

  const handleSave = () => {
    // Here you would typically save the inventory to your backend
    // For now, we'll just show a success message and navigate back
    alert('Inventaire sauvegardé avec succès');
    router.push(`/boats/${boatId || '1'}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top','left','right']}>
    <Stack.Screen options={{ headerShown: false }} />
    <StatusBar style="dark" backgroundColor="#fff" />

    {/* header en dehors du ScrollView pour rester propre sous la barre d’état */}
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={24} color="#1a1a1a" />
      </TouchableOpacity>
      <Text style={styles.title}>Inventaire du bateau</Text>
      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Save size={24} color="#0066CC" />
      </TouchableOpacity>
    </View>

    {/* un seul ScrollView pour le contenu */}
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>
          Cochez les équipements présents sur votre bateau et ajoutez des détails si nécessaire.
        </Text>

        {categories.map(category => (
          <View key={category.id} style={styles.categorySection}>
            <TouchableOpacity 
              style={styles.categoryHeader}
              onPress={() => handleToggleCategory(category.id)}
              activeOpacity={0.7}
            >
              <View style={styles.categoryTitleContainer}>
                <category.icon size={24} color="#0066CC" />
                <Text style={styles.categoryTitle}>{category.name}</Text>
              </View>
              {category.expanded ? (
                <ChevronUp size={24} color="#0066CC" />
              ) : (
                <ChevronDown size={24} color="#0066CC" />
              )}
            </TouchableOpacity>

            {category.expanded && (
              <View style={styles.categoryContent}>
                {category.items.map(item => (
                  <View key={item.id} style={styles.itemContainer}>
                    <View style={styles.itemRow}>
                      <TouchableOpacity
                        style={[styles.checkbox, item.checked && styles.checkboxChecked]}
                        onPress={() => handleToggleItem(category.id, item.id)}
                      >
                        {item.checked && <Check size={16} color="white" />}
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.itemTextContainer}
                        onPress={() => handleToggleItem(category.id, item.id)}
                      >
                        <Text style={styles.itemText}>{item.name}</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {item.checked && (
                      <View style={styles.detailsContainer}>
                        <View style={styles.inputWrapper}>
                          <Info size={20} color="#666" />
                          <TextInput
                            style={styles.input}
                            placeholder="Ajouter des détails (optionnel)"
                            value={item.details || ''}
                            onChangeText={(text) => handleUpdateItemDetails(category.id, item.id, text)}
                          />
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  // remplace "content" par ceci
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  categorySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f0f7ff',
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  categoryContent: {
    padding: 16,
  },
  itemContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#0066CC',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0066CC',
  },
  itemTextContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  itemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  detailsContainer: {
    marginLeft: 36,
    marginTop: 8,
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
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
});
