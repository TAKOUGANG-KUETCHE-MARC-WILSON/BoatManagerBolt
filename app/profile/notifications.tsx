import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Bell, MessageSquare, FileText, Calendar, Euro, Mail, Clock, CircleCheck as CheckCircle2 } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
  channels: {
    app: boolean;
    email: boolean;
    sms: boolean;
  };
}

interface NotificationCategory {
  id: string;
  title: string;
  settings: NotificationSetting[];
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'requests',
      title: 'Demandes et services',
      settings: [
        {
          id: 'new_quote',
          title: 'Nouveaux devis',
          description: 'Notifications lorsque vous recevez un nouveau devis',
          icon: FileText,
          enabled: true,
          channels: { app: true, email: true, sms: false }
        },
        {
          id: 'request_status',
          title: 'Statut des demandes',
          description: 'Notifications de changement de statut de vos demandes',
          icon: CheckCircle2,
          enabled: true,
          channels: { app: true, email: true, sms: false }
        },
        {
          id: 'maintenance_reminder',
          title: 'Rappels d\'entretien',
          description: 'Notifications selon les interventions passées',
          icon: Calendar,
          enabled: true,
          channels: { app: true, email: true, sms: true }
        },
        {
          id: 'appointment_reminder',
          title: 'Rappels de rendez-vous',
          description: 'Rappels pour vos rendez-vous à venir',
          icon: Calendar,
          enabled: true,
          channels: { app: true, email: true, sms: true }
        }
      ]
    },
    {
      id: 'communication',
      title: 'Communication',
      settings: [
        {
          id: 'new_messages',
          title: 'Nouveaux messages',
          description: 'Notifications pour les nouveaux messages',
          icon: MessageSquare,
          enabled: true,
          channels: { app: true, email: true, sms: false }
        }
      ]
    },
    {
      id: 'financial',
      title: 'Financier',
      settings: [
        {
          id: 'invoice_received',
          title: 'Factures reçues',
          description: 'Notifications lorsque vous recevez une nouvelle facture',
          icon: Euro,
          enabled: true,
          channels: { app: true, email: true, sms: false }
        },
        {
          id: 'payment_confirmation',
          title: 'Confirmation de paiement',
          description: 'Notifications de confirmation de paiement',
          icon: CheckCircle2,
          enabled: true,
          channels: { app: true, email: true, sms: false }
        },
        {
          id: 'payment_reminder',
          title: 'Rappels de paiement',
          description: 'Rappels pour les paiements à effectuer',
          icon: Clock,
          enabled: true,
          channels: { app: true, email: true, sms: false }
        }
      ]
    }
  ]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'requests': true,
    'communication': true,
    'financial': true
  });

  const [showChannels, setShowChannels] = useState<Record<string, boolean>>({});

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const toggleSetting = (categoryId: string, settingId: string) => {
    setCategories(prev => 
      prev.map(category => 
        category.id === categoryId
          ? {
              ...category,
              settings: category.settings.map(setting => 
                setting.id === settingId
                  ? { ...setting, enabled: !setting.enabled }
                  : setting
              )
            }
          : category
      )
    );
  };

  const toggleChannel = (categoryId: string, settingId: string, channel: 'app' | 'email' | 'sms') => {
    setCategories(prev => 
      prev.map(category => 
        category.id === categoryId
          ? {
              ...category,
              settings: category.settings.map(setting => 
                setting.id === settingId
                  ? { 
                      ...setting, 
                      channels: { 
                        ...setting.channels, 
                        [channel]: !setting.channels[channel] 
                      } 
                    }
                  : setting
              )
            }
          : category
      )
    );
  };

  const toggleShowChannels = (settingId: string) => {
    setShowChannels(prev => ({
      ...prev,
      [settingId]: !prev[settingId]
    }));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres de notification</Text>
          <Text style={styles.sectionDescription}>
            Personnalisez les notifications que vous souhaitez recevoir et choisissez les canaux de communication
          </Text>
        </View>

        {categories.map(category => (
          <View key={category.id} style={styles.categoryContainer}>
            <TouchableOpacity 
              style={styles.categoryHeader}
              onPress={() => toggleCategoryExpansion(category.id)}
            >
              <Text style={styles.categoryTitle}>{category.title}</Text>
              {expandedCategories[category.id] ? (
                <ArrowLeft size={20} color="#666" style={{ transform: [{ rotate: '90deg' }] }} />
              ) : (
                <ArrowLeft size={20} color="#666" style={{ transform: [{ rotate: '-90deg' }] }} />
              )}
            </TouchableOpacity>
            
            {expandedCategories[category.id] && (
              <View style={styles.settingsList}>
                {category.settings.map((setting) => (
                  <View key={setting.id} style={styles.settingItem}>
                    <View style={styles.settingHeader}>
                      <View style={styles.settingIcon}>
                        <setting.icon size={24} color="#0066CC" />
                      </View>
                      <View style={styles.settingInfo}>
                        <Text style={styles.settingTitle}>{setting.title}</Text>
                        <Text style={styles.settingDescription}>{setting.description}</Text>
                      </View>
                      <Switch
                        value={setting.enabled}
                        onValueChange={() => toggleSetting(category.id, setting.id)}
                        trackColor={{ false: '#e0e0e0', true: '#bfdbfe' }}
                        thumbColor={setting.enabled ? '#0066CC' : '#fff'}
                        ios_backgroundColor="#e0e0e0"
                      />
                    </View>
                    
                    {setting.enabled && (
                      <TouchableOpacity 
                        style={styles.channelsToggle}
                        onPress={() => toggleShowChannels(setting.id)}
                      >
                        <Text style={styles.channelsToggleText}>
                          {showChannels[setting.id] ? 'Masquer les canaux' : 'Configurer les canaux'}
                        </Text>
                        <ArrowLeft 
                          size={16} 
                          color="#0066CC" 
                          style={{ 
                            transform: [{ rotate: showChannels[setting.id] ? '90deg' : '-90deg' }] 
                          }} 
                        />
                      </TouchableOpacity>
                    )}
                    
                    {setting.enabled && showChannels[setting.id] && (
                      <View style={styles.channelsContainer}>
                        <View style={styles.channelRow}>
                          <View style={styles.channelInfo}>
                            <Bell size={20} color="#666" />
                            <Text style={styles.channelText}>Application</Text>
                          </View>
                          <Switch
                            value={setting.channels.app}
                            onValueChange={() => toggleChannel(category.id, setting.id, 'app')}
                            trackColor={{ false: '#e0e0e0', true: '#bfdbfe' }}
                            thumbColor={setting.channels.app ? '#0066CC' : '#fff'}
                            ios_backgroundColor="#e0e0e0"
                          />
                        </View>
                        
                        <View style={styles.channelRow}>
                          <View style={styles.channelInfo}>
                            <Mail size={20} color="#666" />
                            <Text style={styles.channelText}>Email</Text>
                          </View>
                          <Switch
                            value={setting.channels.email}
                            onValueChange={() => toggleChannel(category.id, setting.id, 'email')}
                            trackColor={{ false: '#e0e0e0', true: '#bfdbfe' }}
                            thumbColor={setting.channels.email ? '#0066CC' : '#fff'}
                            ios_backgroundColor="#e0e0e0"
                          />
                        </View>
                        
                        <View style={styles.channelRow}>
                          <View style={styles.channelInfo}>
                            <MessageSquare size={20} color="#666" />
                            <Text style={styles.channelText}>SMS</Text>
                          </View>
                          <Switch
                            value={setting.channels.sms}
                            onValueChange={() => toggleChannel(category.id, setting.id, 'sms')}
                            trackColor={{ false: '#e0e0e0', true: '#bfdbfe' }}
                            thumbColor={setting.channels.sms ? '#0066CC' : '#fff'}
                            ios_backgroundColor="#e0e0e0"
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

        <View style={styles.infoSection}>
          <Bell size={20} color="#666" />
          <Text style={styles.infoText}>
            Les notifications vous permettent de rester informé des événements importants concernant vos bateaux, vos demandes de service, et les communications avec votre Boat Manager et les entreprises du nautisme.
          </Text>
        </View>
      </View>
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
  categoryContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
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
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  settingsList: {
    padding: 8,
  },
  settingItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  channelsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    marginLeft: 56,
    padding: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  channelsToggleText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  channelsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginLeft: 56,
    gap: 12,
  },
  channelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  channelText: {
    fontSize: 14,
    color: '#1a1a1a',
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
});