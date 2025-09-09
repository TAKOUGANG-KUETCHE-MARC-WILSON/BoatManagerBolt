// app/profile/notifications.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  MessageSquare,
  FileText,
  Calendar,
  Euro,
  Mail,
  Clock,
  CheckCircle as CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react-native';
// import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

type IconProps = { size?: number; color?: string };
type IconType = React.ComponentType<IconProps>;

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: IconType;
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

type ChannelsKey = 'app' | 'email' | 'sms';

const BASELINE_WIDTH = 375; // iPhone 11/12/13/14 width (dp)
const ms = (size: number, width: number) => Math.round((width / BASELINE_WIDTH) * size);

const DEFAULT_CATEGORIES: NotificationCategory[] = [
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
        channels: { app: true, email: true, sms: false },
      },
      {
        id: 'request_status',
        title: 'Statut des demandes',
        description: 'Notifications de changement de statut de vos demandes',
        icon: CheckCircle2,
        enabled: true,
        channels: { app: true, email: true, sms: false },
      },
      {
        id: 'maintenance_reminder',
        title: "Rappels d'entretien",
        description: 'Notifications selon les interventions passées',
        icon: Calendar,
        enabled: true,
        channels: { app: true, email: true, sms: true },
      },
      {
        id: 'appointment_reminder',
        title: 'Rappels de rendez-vous',
        description: 'Rappels pour vos rendez-vous à venir',
        icon: Calendar,
        enabled: true,
        channels: { app: true, email: true, sms: true },
      },
    ],
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
        channels: { app: true, email: true, sms: false },
      },
    ],
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
        channels: { app: true, email: true, sms: false },
      },
      {
        id: 'payment_confirmation',
        title: 'Confirmation de paiement',
        description: 'Notifications de confirmation de paiement',
        icon: CheckCircle2,
        enabled: true,
        channels: { app: true, email: true, sms: false },
      },
      {
        id: 'payment_reminder',
        title: 'Rappels de paiement',
        description: 'Rappels pour les paiements à effectuer',
        icon: Clock,
        enabled: true,
        channels: { app: true, email: true, sms: false },
      },
    ],
  },
];

const STORAGE_KEY = 'notifications_prefs_v1';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [categories, setCategories] = useState<NotificationCategory[]>(DEFAULT_CATEGORIES);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    requests: true,
    communication: true,
    financial: true,
  });
  const [showChannels, setShowChannels] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Styles dépendants de la largeur (responsive)
  const styles = useMemo(() => makeStyles(width, insets.top), [width, insets.top]);

  // Charger préférences depuis Supabase, sinon AsyncStorage
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        if (user?.id) {
          const { data, error } = await supabase
            .from('notification_preferences')
            .select(
              'category_id, setting_id, enabled, channel_app, channel_email, channel_sms'
            )
            .eq('user_id', user.id);

          if (!error && data && data.length > 0) {
            const map = new Map<string, { enabled: boolean; app: boolean; email: boolean; sms: boolean }>();
            for (const row of data) {
              map.set(`${row.category_id}:${row.setting_id}`, {
                enabled: !!row.enabled,
                app: !!row.channel_app,
                email: !!row.channel_email,
                sms: !!row.channel_sms,
              });
            }
            if (!mounted) return;
            setCategories(prev =>
              prev.map(cat => ({
                ...cat,
                settings: cat.settings.map(st => {
                  const key = `${cat.id}:${st.id}`;
                  const saved = map.get(key);
                  return saved
                    ? {
                        ...st,
                        enabled: saved.enabled,
                        channels: { app: saved.app, email: saved.email, sms: saved.sms },
                      }
                    : st;
                }),
              }))
            );
          } else if (error) {
            // fallback local si la table n'existe pas ou droits manquants
            const local = await AsyncStorage.getItem(STORAGE_KEY);
            if (local) {
              const parsed = JSON.parse(local) as NotificationCategory[];
              if (mounted) setCategories(parsed);
            }
          } else {
            // Pas de prefs en DB -> tenter local
            const local = await AsyncStorage.getItem(STORAGE_KEY);
            if (local) {
              const parsed = JSON.parse(local) as NotificationCategory[];
              if (mounted) setCategories(parsed);
            }
          }
        } else {
          // Utilisateur non connecté -> local uniquement
          const local = await AsyncStorage.getItem(STORAGE_KEY);
          if (local) {
            const parsed = JSON.parse(local) as NotificationCategory[];
            if (mounted) setCategories(parsed);
          }
        }
      } catch (e) {
        setErrorMsg('Impossible de charger les préférences. Vos réglages locaux seront utilisés.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // Sauvegarde debouncée (DB si possible, sinon local)
  useEffect(() => {
    if (loading) return;
    setSaving(true);
    const t = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
      } catch {
        // ignore local error silently
      }

      if (user?.id) {
        try {
          // Construire l'upsert plat
          const rows = categories.flatMap(cat =>
            cat.settings.map(st => ({
              user_id: user.id,
              category_id: cat.id,
              setting_id: st.id,
              enabled: st.enabled,
              channel_app: st.channels.app,
              channel_email: st.channels.email,
              channel_sms: st.channels.sms,
            }))
          );

          const { error } = await supabase.from('notification_preferences').upsert(rows, {
            onConflict: 'user_id,category_id,setting_id',
          });

          if (error) {
            setErrorMsg("La sauvegarde distante a échoué. Vos préférences restent enregistrées localement.");
          } else {
            setErrorMsg(null);
          }
        } catch {
          setErrorMsg("La sauvegarde distante a échoué. Vos préférences restent enregistrées localement.");
        }
      }
      setSaving(false);
    }, 600);

    return () => clearTimeout(t);
  }, [categories, user?.id, loading]);

  const toggleCategoryExpansion = useCallback((categoryId: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }, []);

  const toggleSetting = useCallback((categoryId: string, settingId: string) => {
    setCategories(prev =>
      prev.map(category =>
        category.id === categoryId
          ? {
              ...category,
              settings: category.settings.map(setting =>
                setting.id === settingId ? { ...setting, enabled: !setting.enabled } : setting
              ),
            }
          : category
      )
    );
  }, []);

  const toggleChannel = useCallback(
    (categoryId: string, settingId: string, channel: ChannelsKey) => {
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
                          [channel]: !setting.channels[channel],
                        },
                      }
                    : setting
                ),
              }
            : category
        )
      );
    },
    []
  );

  const toggleShowChannels = useCallback((settingId: string) => {
    setShowChannels(prev => ({ ...prev, [settingId]: !prev[settingId] }));
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Revenir en arrière"
          accessibilityRole="button"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ArrowLeft size={ms(22, width)} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paramètres de notification</Text>
          <Text style={styles.sectionDescription}>
            Personnalisez les notifications que vous souhaitez recevoir et choisissez les canaux de communication.
          </Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {CATEGORIES_UI({
          categories,
          expandedCategories,
          showChannels,
          toggleCategoryExpansion,
          toggleSetting,
          toggleShowChannels,
          toggleChannel,
          width,
          styles,
          saving,
        })}

        <View style={styles.infoSection}>
          <Bell size={ms(20, width)} color="#666" />
          <Text style={styles.infoText}>
            Les notifications vous permettent de rester informé des événements importants concernant vos bateaux, vos
            demandes de service et les communications avec votre Boat Manager et les entreprises du nautisme.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

/** UI extraite en fonction pure pour garder le composant principal lisible */
function CATEGORIES_UI({
  categories,
  expandedCategories,
  showChannels,
  toggleCategoryExpansion,
  toggleSetting,
  toggleShowChannels,
  toggleChannel,
  width,
  styles,
  saving,
}: {
  categories: NotificationCategory[];
  expandedCategories: Record<string, boolean>;
  showChannels: Record<string, boolean>;
  toggleCategoryExpansion: (id: string) => void;
  toggleSetting: (catId: string, stId: string) => void;
  toggleShowChannels: (stId: string) => void;
  toggleChannel: (catId: string, stId: string, channel: ChannelsKey) => void;
  width: number;
  styles: ReturnType<typeof makeStyles>;
  saving: boolean;
}) {
  return (
    <>
      {categories.map(category => (
        <View key={category.id} style={styles.categoryContainer}>
          <TouchableOpacity
            style={styles.categoryHeader}
            onPress={() => toggleCategoryExpansion(category.id)}
            accessibilityRole="button"
            accessibilityLabel={`Basculer la section ${category.title}`}
          >
            <Text style={styles.categoryTitle}>{category.title}</Text>
            {expandedCategories[category.id] ? (
              <ChevronDown size={16} color="#666" />
            ) : (
              <ChevronRight size={16} color="#666" />
            )}
          </TouchableOpacity>

          {expandedCategories[category.id] && (
            <View style={styles.settingsList}>
              {category.settings.map(setting => (
                <View key={setting.id} style={styles.settingItem}>
                  <View style={styles.settingHeader}>
                    <View style={styles.settingIcon}>
                      <setting.icon size={22} color="#0066CC" />
                    </View>
                    <View style={styles.settingInfo}>
                      <Text style={styles.settingTitle}>{setting.title}</Text>
                      <Text style={styles.settingDescription}>{setting.description}</Text>
                    </View>
                    <Switch
                      value={setting.enabled}
                      onValueChange={() => toggleSetting(category.id, setting.id)}
                      trackColor={{ false: '#e5e7eb', true: '#bfdbfe' }}
                      thumbColor={Platform.OS === 'android' ? (setting.enabled ? '#0066CC' : '#f9fafb') : undefined}
                      ios_backgroundColor="#e5e7eb"
                      accessibilityLabel={`Activer ${setting.title}`}
                    />
                  </View>

                  {setting.enabled && (
                    <TouchableOpacity
                      style={styles.channelsToggle}
                      onPress={() => toggleShowChannels(setting.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Configurer les canaux pour ${setting.title}`}
                    >
                      <Text style={styles.channelsToggleText}>
                        {showChannels[setting.id] ? 'Masquer les canaux' : 'Configurer les canaux'}
                      </Text>
                      {showChannels[setting.id] ? (
                        <ChevronDown size={14} color="#0066CC" />
                      ) : (
                        <ChevronRight size={14} color="#0066CC" />
                      )}
                    </TouchableOpacity>
                  )}

                  {setting.enabled && showChannels[setting.id] && (
                    <View style={styles.channelsContainer}>
                      <View style={styles.channelRow}>
                        <View style={styles.channelInfo}>
                          <Bell size={18} color="#666" />
                          <Text style={styles.channelText}>Application</Text>
                        </View>
                        <Switch
                          value={setting.channels.app}
                          onValueChange={() => toggleChannel(category.id, setting.id, 'app')}
                          trackColor={{ false: '#e5e7eb', true: '#bfdbfe' }}
                          thumbColor={Platform.OS === 'android' ? (setting.channels.app ? '#0066CC' : '#f9fafb') : undefined}
                          ios_backgroundColor="#e5e7eb"
                          accessibilityLabel={`Activer canal application pour ${setting.title}`}
                        />
                      </View>

                      <View style={styles.channelRow}>
                        <View style={styles.channelInfo}>
                          <Mail size={18} color="#666" />
                          <Text style={styles.channelText}>Email</Text>
                        </View>
                        <Switch
                          value={setting.channels.email}
                          onValueChange={() => toggleChannel(category.id, setting.id, 'email')}
                          trackColor={{ false: '#e5e7eb', true: '#bfdbfe' }}
                          thumbColor={
                            Platform.OS === 'android' ? (setting.channels.email ? '#0066CC' : '#f9fafb') : undefined
                          }
                          ios_backgroundColor="#e5e7eb"
                          accessibilityLabel={`Activer canal email pour ${setting.title}`}
                        />
                      </View>

                      <View style={styles.channelRow}>
                        <View style={styles.channelInfo}>
                          <MessageSquare size={18} color="#666" />
                          <Text style={styles.channelText}>SMS</Text>
                        </View>
                        <Switch
                          value={setting.channels.sms}
                          onValueChange={() => toggleChannel(category.id, setting.id, 'sms')}
                          trackColor={{ false: '#e5e7eb', true: '#bfdbfe' }}
                          thumbColor={Platform.OS === 'android' ? (setting.channels.sms ? '#0066CC' : '#f9fafb') : undefined}
                          ios_backgroundColor="#e5e7eb"
                          accessibilityLabel={`Activer canal SMS pour ${setting.title}`}
                        />
                      </View>
                    </View>
                  )}
                </View>
              ))}
              {saving ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator size="small" />
                  <Text style={styles.savingText}>Enregistrement…</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
      ))}
    </>
  );
}

function makeStyles(width: number, safeTop: number) {
  const p2 = ms(8, width);
  const p3 = ms(12, width);
  const p4 = ms(16, width);
  const p5 = ms(20, width);
  const radius = ms(12, width);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    contentContainer: {
      paddingBottom: ms(24, width),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: Math.max(safeTop, p3),
      paddingHorizontal: p4,
      paddingBottom: p3,
      backgroundColor: 'white',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#f0f0f0',
      minHeight: 56,
    },
    backButton: {
      padding: p2,
      marginRight: p3,
      borderRadius: ms(10, width),
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: ms(20, width),
      fontWeight: 'bold',
      color: '#1a1a1a',
    },
    content: {
      padding: p5,
      gap: p5,
    },
    section: {
      marginBottom: p2,
    },
    sectionTitle: {
      fontSize: ms(22, width),
      fontWeight: '600',
      color: '#1a1a1a',
      marginBottom: p2,
    },
    sectionDescription: {
      fontSize: ms(14.5, width),
      color: '#666',
      lineHeight: ms(20, width),
    },
    errorBox: {
      backgroundColor: '#FEF2F2',
      borderColor: '#FECACA',
      borderWidth: 1,
      padding: p3,
      borderRadius: radius,
    },
    errorText: {
      color: '#991B1B',
      fontSize: ms(13.5, width),
    },
    categoryContainer: {
      backgroundColor: 'white',
      borderRadius: radius,
      marginBottom: p3,
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
          // @ts-ignore – RNW accepte boxShadow
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        },
      }),
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: p4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#f0f0f0',
      minHeight: 48,
    },
    categoryTitle: {
      fontSize: ms(17, width),
      fontWeight: '600',
      color: '#1a1a1a',
    },
    settingsList: {
      padding: p2,
    },
    settingItem: {
      padding: p4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#f0f0f0',
    },
    settingHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: p3,
    },
    settingIcon: {
      width: ms(40, width),
      height: ms(40, width),
      borderRadius: ms(20, width),
      backgroundColor: '#f0f7ff',
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingInfo: {
      flex: 1,
    },
    settingTitle: {
      fontSize: ms(15.5, width),
      fontWeight: '600',
      color: '#1a1a1a',
      marginBottom: ms(2, width),
    },
    settingDescription: {
      fontSize: ms(13.5, width),
      color: '#666',
    },
    channelsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: p3,
      marginLeft: ms(56, width),
      padding: p2,
      backgroundColor: '#f0f7ff',
      borderRadius: ms(8, width),
      minHeight: 40,
    },
    channelsToggleText: {
      fontSize: ms(13.5, width),
      color: '#0066CC',
      fontWeight: '500',
    },
    channelsContainer: {
      backgroundColor: '#f8fafc',
      borderRadius: ms(8, width),
      padding: p3,
      marginTop: p3,
      marginLeft: ms(56, width),
      rowGap: p3,
    },
    channelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 44,
    },
    channelInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: p3,
    },
    channelText: {
      fontSize: ms(14, width),
      color: '#1a1a1a',
    },
    infoSection: {
      flexDirection: 'row',
      backgroundColor: '#f8f9fa',
      padding: p4,
      borderRadius: radius,
      columnGap: p3,
      alignItems: 'flex-start',
    },
    infoText: {
      flex: 1,
      fontSize: ms(13.5, width),
      color: '#666',
      lineHeight: ms(19, width),
    },
    savingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: p2,
      padding: p2,
      justifyContent: 'flex-end',
    },
    savingText: {
      fontSize: ms(12.5, width),
      color: '#6B7280',
    },
  });
}


