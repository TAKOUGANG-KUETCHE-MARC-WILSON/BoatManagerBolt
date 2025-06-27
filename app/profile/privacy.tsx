import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, Alert, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield, Eye, EyeOff, Lock, Share2, Bell, Database, Trash2, User, Users, Bot as Boat, Building, X, Check } from 'lucide-react-native';

interface VisibilityOption {
  id: string;
  label: string;
  value: 'everyone' | 'boat_managers' | 'none';
}

interface VisibilitySetting {
  id: string;
  title: string;
  description: string;
  icon: any;
  options: VisibilityOption[];
  selectedOption: 'everyone' | 'boat_managers' | 'none';
}

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
}

export default function PrivacyScreen() {
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySetting[]>([
    {
      id: 'profile_visibility',
      title: 'Visibilité du profil',
      description: 'Contrôlez qui peut voir votre profil et vos informations personnelles',
      icon: User,
      options: [
        { id: 'everyone', label: 'Tout le monde', value: 'everyone' },
        { id: 'boat_managers', label: 'Boat Managers uniquement', value: 'boat_managers' },
        { id: 'none', label: 'Personne', value: 'none' },
      ],
      selectedOption: 'boat_managers',
    },
    {
      id: 'boat_visibility',
      title: 'Visibilité des bateaux',
      description: 'Contrôlez qui peut voir les détails de vos bateaux',
      icon: Boat,
      options: [
        { id: 'everyone', label: 'Tout le monde', value: 'everyone' },
        { id: 'boat_managers', label: 'Boat Managers uniquement', value: 'boat_managers' },
        { id: 'none', label: 'Personne', value: 'none' },
      ],
      selectedOption: 'boat_managers',
    },
    {
      id: 'contact_visibility',
      title: 'Visibilité des coordonnées',
      description: 'Contrôlez qui peut voir vos coordonnées (téléphone, email)',
      icon: Users,
      options: [
        { id: 'everyone', label: 'Tout le monde', value: 'everyone' },
        { id: 'boat_managers', label: 'Boat Managers uniquement', value: 'boat_managers' },
        { id: 'none', label: 'Personne', value: 'none' },
      ],
      selectedOption: 'boat_managers',
    },
  ]);
  
  const [settings, setSettings] = useState<PrivacySetting[]>([
    {
      id: 'data_sharing',
      title: 'Partage de données',
      description: 'Autoriser le partage de vos données avec les partenaires de service',
      icon: Share2,
      enabled: false,
    },
    {
      id: 'two_factor_auth',
      title: 'Authentification à deux facteurs',
      description: 'Sécurisez votre compte avec une vérification supplémentaire',
      icon: Lock,
      enabled: false,
    },
    {
      id: 'activity_tracking',
      title: 'Suivi d\'activité',
      description: 'Autoriser le suivi de votre activité pour améliorer les services',
      icon: Bell,
      enabled: true,
    },
  ]);

  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [selectedVisibilitySetting, setSelectedVisibilitySetting] = useState<VisibilitySetting | null>(null);

  const toggleSetting = (id: string) => {
    setSettings(prev =>
      prev.map(setting =>
        setting.id === id
          ? { ...setting, enabled: !setting.enabled }
          : setting
      )
    );
  };

  const handleDataRequest = () => {
    Alert.alert(
      'Demande de données personnelles',
      'Votre demande d\'exportation de données a été enregistrée. Vous recevrez un email contenant vos données dans les 48 heures.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et toutes vos données seront définitivement supprimées.',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Compte supprimé',
              'Votre compte a été supprimé avec succès. Vous allez être déconnecté.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/login')
                }
              ]
            );
          }
        }
      ]
    );
  };

  const openVisibilityModal = (setting: VisibilitySetting) => {
    setSelectedVisibilitySetting(setting);
    setShowVisibilityModal(true);
  };

  const handleSelectVisibilityOption = (optionValue: 'everyone' | 'boat_managers' | 'none') => {
    if (selectedVisibilitySetting) {
      setVisibilitySettings(prev =>
        prev.map(setting =>
          setting.id === selectedVisibilitySetting.id
            ? { ...setting, selectedOption: optionValue }
            : setting
        )
      );
      setShowVisibilityModal(false);
    }
  };

  const VisibilityModal = () => (
    <Modal
      visible={showVisibilityModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowVisibilityModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {selectedVisibilitySetting?.title}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowVisibilityModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.modalDescription}>
              {selectedVisibilitySetting?.description}
            </Text>
            
            {selectedVisibilitySetting?.options.map((option) => (
              <TouchableOpacity 
                key={option.id}
                style={[
                  styles.visibilityOption,
                  selectedVisibilitySetting.selectedOption === option.value && styles.visibilityOptionSelected
                ]}
                onPress={() => handleSelectVisibilityOption(option.value)}
              >
                <View style={styles.visibilityOptionContent}>
                  <Text style={styles.visibilityOptionLabel}>{option.label}</Text>
                  <Text style={styles.visibilityOptionDescription}>
                    {option.value === 'everyone' 
                      ? 'Visible par tous les utilisateurs de la plateforme' 
                      : option.value === 'boat_managers' 
                        ? 'Visible uniquement par vos Boat Managers' 
                        : 'Non visible par les autres utilisateurs'}
                  </Text>
                </View>
                {selectedVisibilitySetting.selectedOption === option.value && (
                  <Check size={24} color="#0066CC" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.modalSaveButton}
            onPress={() => setShowVisibilityModal(false)}
          >
            <Text style={styles.modalSaveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Confidentialité</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres de confidentialité</Text>
          <Text style={styles.sectionDescription}>
            Gérez vos préférences de confidentialité et de sécurité
          </Text>
        </View>

        {/* Visibility Settings */}
        <View style={styles.visibilitySettingsList}>
          {visibilitySettings.map((setting) => (
            <TouchableOpacity 
              key={setting.id} 
              style={styles.visibilitySettingItem}
              onPress={() => openVisibilityModal(setting)}
            >
              <View style={styles.settingIcon}>
                <setting.icon size={24} color="#0066CC" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{setting.title}</Text>
                <Text style={styles.settingDescription}>{setting.description}</Text>
                <View style={styles.selectedOptionContainer}>
                  <Text style={styles.selectedOptionText}>
                    {setting.options.find(opt => opt.value === setting.selectedOption)?.label || 'Non défini'}
                  </Text>
                </View>
              </View>
              <ArrowLeft size={20} color="#666" style={{ transform: [{ rotate: '-90deg' }] }} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Toggle Settings */}
        <View style={styles.settingsList}>
          {settings.map((setting) => (
            <View key={setting.id} style={styles.settingItem}>
              <View style={styles.settingIcon}>
                <setting.icon size={24} color="#0066CC" />
              </View>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>{setting.title}</Text>
                <Text style={styles.settingDescription}>{setting.description}</Text>
              </View>
              <Switch
                value={setting.enabled}
                onValueChange={() => toggleSetting(setting.id)}
                trackColor={{ false: '#e0e0e0', true: '#bfdbfe' }}
                thumbColor={setting.enabled ? '#0066CC' : '#fff'}
                ios_backgroundColor="#e0e0e0"
              />
            </View>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Shield size={20} color="#666" />
          <Text style={styles.infoText}>
            Vos données sont protégées conformément à notre politique de confidentialité. 
            Vous pouvez modifier vos préférences à tout moment.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.dataRequestButton}
          onPress={handleDataRequest}
        >
          <Database size={20} color="#0066CC" />
          <Text style={styles.dataRequestButtonText}>Demander mes données personnelles</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
        >
          <Trash2 size={20} color="#ff4444" />
          <Text style={styles.deleteAccountButtonText}>Supprimer mon compte</Text>
        </TouchableOpacity>
      </View>

      <VisibilityModal />
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
  content: {
    padding: 24,
    gap: 24,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  visibilitySettingsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  visibilitySettingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 16,
  },
  settingsList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 16,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
  selectedOptionContainer: {
    marginTop: 8,
    backgroundColor: '#f0f7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  selectedOptionText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  dataRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  dataRequestButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff5f5',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  deleteAccountButtonText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '500',
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
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    marginBottom: 24,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  visibilityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 12,
  },
  visibilityOptionSelected: {
    borderColor: '#0066CC',
    backgroundColor: '#f0f7ff',
  },
  visibilityOptionContent: {
    flex: 1,
  },
  visibilityOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  visibilityOptionDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalSaveButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  modalSaveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});