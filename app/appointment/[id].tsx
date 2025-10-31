// app/appointment/[id].tsx
import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  StatusBar,
  Linking,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Bot as Boat,
  MapPin,
  FileText,
  Building,
  Mail,
  Phone,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Appointment {
  id: string;
  date: string;
  time: string | null;
  duration: number | null;
  type: string;
  status: 'en_attente' | 'confirme' | 'annule' | 'termine';
  client: {
    id: string;
    name: string;
    avatar: string | null;
    email: string;
    phone: string;
  };
  boat: {
    id: string;
    name: string;
    type: string;
    place_de_port?: string | null;
  };
  location: string | null;
  description: string | null;
  cree_par?: {
    id: string;
    profile: string;
    first_name?: string;
    last_name?: string;
    e_mail?: string;
    phone?: string;
  };
  invite?: {
    id: string;
    name: string;
    profile: string;
    first_name?: string;
    last_name?: string;
    e_mail?: string;
    phone?: string | null;
  };
  boatManager?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  nauticalCompany?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
}

export default function AppointmentDetailsScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const { user } = useAuth();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (!id) {
        setError('ID du rendez-vous manquant.');
        setLoading(false);
        return;
      }

      try {
        const appointmentIdNum = Number(id);
        if (isNaN(appointmentIdNum)) {
          setError('ID du rendez-vous invalide.');
          setLoading(false);
          return;
        }

        const { data, error: rdvError } = await supabase
          .from('rendez_vous')
          .select(`
            id,
            date_rdv,
            heure,
            duree,
            description,
            statut,
            id_client(id, first_name, last_name, avatar, e_mail, phone),
            id_boat(id, name, type, place_de_port),
            invite(id, first_name, last_name, e_mail, phone, profile),
            cree_par(id, first_name, last_name, e_mail, phone, profile),
            categorie_service(description1)
          `)
          .eq('id', appointmentIdNum)
          .single();

        if (rdvError) {
          console.error('Error fetching appointment details:', rdvError);
          setError('Erreur lors du chargement des détails du rendez-vous.');
          setLoading(false);
          return;
        }

        if (data) {
          let durationInMinutes: number | null = null;
          if (typeof data.duree === 'string') {
            const parts = data.duree.split(':');
            if (parts.length >= 2) {
              const hours = parseInt(parts[0], 10) || 0;
              const minutes = parseInt(parts[1], 10) || 0;
              durationInMinutes = hours * 60 + minutes;
            }
          } else if (typeof data.duree === 'number') {
            durationInMinutes = data.duree;
          }

          let displayedBoatManager: Appointment['boatManager'] | null = null;
          let displayedNauticalCompany: Appointment['nauticalCompany'] | null = null;

          const createProfessional = (user_data: any) => ({
            id: String(user_data.id),
            name: `${user_data.first_name ?? ''} ${user_data.last_name ?? ''}`.trim(),
            phone: user_data.phone ?? null,
          });

          if ((user as any)?.role === 'nautical_company') {
            if (data.cree_par && data.cree_par.profile === 'boat_manager') {
              displayedBoatManager = createProfessional(data.cree_par);
            } else if (data.invite && data.invite.profile === 'boat_manager') {
              displayedBoatManager = createProfessional(data.invite);
            }
          } else if ((user as any)?.role === 'boat_manager') {
            if (data.cree_par && data.cree_par.profile === 'nautical_company') {
              displayedNauticalCompany = createProfessional(data.cree_par);
            } else if (data.invite && data.invite.profile === 'nautical_company') {
              displayedNauticalCompany = createProfessional(data.invite);
            }
          } else {
            if (data.invite) {
              if (data.invite.profile === 'boat_manager') {
                displayedBoatManager = createProfessional(data.invite);
              } else if (data.invite.profile === 'nautical_company') {
                displayedNauticalCompany = createProfessional(data.invite);
              }
            }
            if (!displayedBoatManager && !displayedNauticalCompany && data.cree_par) {
              if (data.cree_par.profile === 'boat_manager') {
                displayedBoatManager = createProfessional(data.cree_par);
              } else if (data.cree_par.profile === 'nautical_company') {
                displayedNauticalCompany = createProfessional(data.cree_par);
              }
            }
          }

          setAppointment({
            id: String(data.id),
            date: data.date_rdv,
            time: data.heure ?? null,
            duration: durationInMinutes ?? null,
            type: data.categorie_service?.description1 || 'unknown',
            status: data.statut,
            client: {
              id: String(data.id_client.id),
              name: `${data.id_client.first_name ?? ''} ${data.id_client.last_name ?? ''}`.trim(),
              avatar: data.id_client.avatar || null,
              email: data.id_client.e_mail,
              phone: data.id_client.phone,
            },
            boat: {
              id: String(data.id_boat.id),
              name: data.id_boat.name,
              type: data.id_boat.type,
              place_de_port: data.id_boat.place_de_port ?? null,
            },
            location: data.id_boat.place_de_port ?? null,
            description: data.description ?? null,
            cree_par: data.cree_par
              ? {
                  id: String(data.cree_par.id),
                  profile: data.cree_par.profile,
                  first_name: data.cree_par.first_name,
                  last_name: data.cree_par.last_name,
                  e_mail: data.cree_par.e_mail,
                  phone: data.cree_par.phone,
                }
              : undefined,
            invite: data.invite
              ? {
                  id: String(data.invite.id),
                  name: `${data.invite.first_name ?? ''} ${data.invite.last_name ?? ''}`.trim(),
                  profile: data.invite.profile,
                  first_name: data.invite.first_name,
                  last_name: data.invite.last_name,
                  e_mail: data.invite.e_mail,
                  phone: data.invite.phone ?? null,
                }
              : undefined,
            boatManager: displayedBoatManager,
            nauticalCompany: displayedNauticalCompany,
          });
        } else {
          setError('Rendez-vous non trouvé.');
        }
      } catch (e) {
        console.error('Unexpected error:', e);
        setError('Une erreur inattendue est survenue.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [id, user]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatTime = (time: string | null) =>
    time ? time.substring(0, 5).replace(':', 'h') : '';

  const formatDuration = (duration: number | null) => {
    if (duration === null || isNaN(duration) || duration === 0) return '0h';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes ? minutes : ''}`;
  };

  const triggerLightHaptic = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // Pas critique si indisponible
    }
  };

  const handleEditAppointment = () => {
    triggerLightHaptic();
    if (appointment?.id) {
      let pathname = '';
      if ((user as any)?.role === 'boat_manager') {
        pathname = '/(boat-manager)/planning';
      } else if ( (user as any)?.role === 'nautical_company') {
        pathname = '/(nautical-company)/planning';
      } else {
        Alert.alert('Erreur', 'Rôle utilisateur non reconnu pour la modification.');
        return;
      }
      router.push({
        pathname,
        params: { editAppointmentId: appointment.id },
      });
    } else {
      Alert.alert('Erreur', 'Impossible de modifier ce rendez-vous.');
    }
  };

  const confirmDelete = () => {
    const runDelete = async () => {
      if (!appointment?.id) return;
      const { error: deleteError } = await supabase
        .from('rendez_vous')
        .delete()
        .eq('id', Number(appointment.id));
      if (deleteError) {
        console.error('Error deleting appointment:', deleteError);
        Alert.alert('Erreur', `Impossible de supprimer le rendez-vous: ${deleteError.message}`);
      } else {
        Alert.alert('Succès', 'Le rendez-vous a été supprimé avec succès.');
        router.back();
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Supprimer le rendez-vous',
          message: 'Êtes-vous sûr ? Cette action est irréversible.',
          options: ['Annuler', 'Supprimer'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          userInterfaceStyle: 'light',
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await triggerLightHaptic();
            runDelete();
          }
        }
      );
    } else {
      Alert.alert(
        'Supprimer le rendez-vous',
        'Êtes-vous sûr de vouloir supprimer ce rendez-vous ? Cette action est irréversible.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              await triggerLightHaptic();
              runDelete();
            },
          },
        ]
      );
    }
  };

  const handleDeleteAppointment = () => {
    triggerLightHaptic();
    confirmDelete();
  };

  const handleAcceptAppointment = async () => {
    triggerLightHaptic();
    if (!appointment?.id) return;
    const { error: updateError } = await supabase
      .from('rendez_vous')
      .update({ statut: 'confirme' })
      .eq('id', Number(appointment.id));

    if (updateError) {
      Alert.alert('Erreur', `Impossible d'accepter le rendez-vous: ${updateError.message}`);
    } else {
      Alert.alert('Succès', 'Rendez-vous accepté !');
      setAppointment((prev) => (prev ? { ...prev, status: 'confirme' } : null));
      router.back();
    }
  };

  const handleRejectAppointment = async () => {
    triggerLightHaptic();
    if (!appointment?.id) return;
    const { error: updateError } = await supabase
      .from('rendez_vous')
      .update({ statut: 'annule' })
      .eq('id', Number(appointment.id));

    if (updateError) {
      Alert.alert('Erreur', `Impossible de refuser le rendez-vous: ${updateError.message}`);
    } else {
      Alert.alert('Succès', 'Rendez-vous refusé.');
      setAppointment((prev) => (prev ? { ...prev, status: 'annule' } : null));
      router.back();
    }
  };

  const isCreator = useMemo(() => user?.id === appointment?.cree_par?.id, [user, appointment]);
  const isInvited = useMemo(() => user?.id === appointment?.invite?.id, [user, appointment]);
  const isPending = appointment?.status === 'en_attente';

  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    triggerLightHaptic();
    const url = `tel:${phone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d’ouvrir le composeur téléphonique.');
    });
  };

  const handleEmail = (email?: string | null) => {
    if (!email) return;
    triggerLightHaptic();
    const subject = encodeURIComponent('À propos de votre rendez-vous');
    const url = `mailto:${email}?subject=${subject}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d’ouvrir le client e-mail.');
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'dark-content'} />
        <Text>Chargement des détails du rendez-vous...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'dark-content'} />
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'dark-content'} />
        <Text style={styles.errorText}>Rendez-vous introuvable.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'dark-content'} />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={styles.backButton}
          onPress={() => {
            triggerLightHaptic();
            router.back();
          }}
          android_ripple={{ borderless: true }}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </Pressable>
        <Text style={styles.title}>Détails du rendez-vous</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{appointment.description ?? ''}</Text>

          <View style={styles.detailRow}>
            <Calendar size={18} color="#666" />
            <Text style={styles.detailText}>Date : {formatDate(appointment.date)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={18} color="#666" />
            <Text style={styles.detailText}>Heure : {formatTime(appointment.time)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={18} color="#666" />
            <Text style={styles.detailText}>Durée : {formatDuration(appointment.duration)}</Text>
          </View>

          <View style={styles.detailRow}>
            <FileText size={18} color="#666" />
            <Text style={styles.detailText}>Type : {appointment.type}</Text>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={18} color="#666" />
            <Text style={styles.detailText}>Lieu : {appointment.location ?? ''}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client</Text>

          <View style={styles.detailRow}>
            <User size={18} color="#666" />
            <Text style={styles.detailText}>Nom : {appointment.client.name}</Text>
          </View>

          <Pressable style={styles.detailRow} onPress={() => handleEmail(appointment.client.email)}>
            <Mail size={18} color="#666" />
            <Text style={[styles.detailText, styles.link]} numberOfLines={1}>
              Email : {appointment.client.email}
            </Text>
          </Pressable>

          <Pressable style={styles.detailRow} onPress={() => handleCall(appointment.client.phone)}>
            <Phone size={18} color="#666" />
            <Text style={[styles.detailText, styles.link]} numberOfLines={1}>
              Téléphone : {appointment.client.phone}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bateau</Text>
          <View style={styles.detailRow}>
            <Boat size={18} color="#666" />
            <Text style={styles.detailText}>Nom : {appointment.boat.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <FileText size={18} color="#666" />
            <Text style={styles.detailText}>Type : {appointment.boat.type}</Text>
          </View>
          {appointment.boat.place_de_port && (
            <View style={styles.detailRow}>
              <MapPin size={18} color="#666" />
              <Text style={styles.detailText}>Place de port : {appointment.boat.place_de_port ?? ''}</Text>
            </View>
          )}
        </View>

        {appointment.boatManager && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Boat Manager</Text>
            <View style={styles.detailRow}>
              <User size={18} color="#666" />
              <Text style={styles.detailText}>Nom : {appointment.boatManager.name}</Text>
            </View>
            {appointment.boatManager.phone && (
              <Pressable style={styles.detailRow} onPress={() => handleCall(appointment.boatManager?.phone)}>
                <Phone size={18} color="#666" />
                <Text style={[styles.detailText, styles.link]} numberOfLines={1}>
                  Téléphone : {appointment.boatManager.phone ?? ''}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {appointment.nauticalCompany && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entreprise du nautisme</Text>
            <View style={styles.detailRow}>
              <Building size={18} color="#666" />
              <Text style={styles.detailText}>Nom : {appointment.nauticalCompany.name}</Text>
            </View>
            {appointment.nauticalCompany.phone && (
              <Pressable style={styles.detailRow} onPress={() => handleCall(appointment.nauticalCompany?.phone)}>
                <Phone size={18} color="#666" />
                <Text style={[styles.detailText, styles.link]} numberOfLines={1}>
                  Téléphone : {appointment.nauticalCompany.phone ?? ''}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.actionButtonsContainer}>
          {isCreator ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                onPress={handleEditAppointment}
                android_ripple={{ foreground: true }}
              >
                <Edit size={20} color="#0066CC" />
                <Text style={styles.actionButtonText}>Modifier</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.actionButton, styles.deleteButton, pressed && styles.pressed]}
                onPress={handleDeleteAppointment}
                android_ripple={{ color: '#ffe4e4', foreground: true }}
              >
                <Trash size={20} color="#EF4444" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Supprimer</Text>
              </Pressable>
            </>
          ) : isInvited && isPending ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.actionButton, styles.acceptButton, pressed && styles.pressedDark]}
                onPress={handleAcceptAppointment}
                android_ripple={{ foreground: true }}
              >
                <CheckCircle size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Accepter</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.actionButton, styles.rejectButton, pressed && styles.pressed]}
                onPress={handleRejectAppointment}
                android_ripple={{ color: '#ffe4e4', foreground: true }}
              >
                <XCircle size={20} color="#EF4444" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Refuser</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_ELEVATION = 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderBottomWidth: Platform.OS === 'ios' ? 1 : StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 999,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    padding: 20,
    rowGap: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    rowGap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: CARD_ELEVATION,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 12,
  },
  detailText: {
    flexShrink: 1,
    fontSize: 16,
    color: '#1a1a1a',
  },
  link: {
    textDecorationLine: Platform.OS === 'ios' ? 'underline' : 'none',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    columnGap: 12,
    marginTop: 8,
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    backgroundColor: '#f0f7ff',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 5,
      },
      android: {
        elevation: CARD_ELEVATION,
      },
    }),
  },
  actionButtonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fff5f5',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#fff5f5',
  },
  pressed: {
    opacity: 0.9,
  },
  pressedDark: {
    opacity: 0.85,
  },
});
