// app/appointment/[id].tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Calendar, Clock, User, Bot as Boat, MapPin, FileText, Building, Euro, Mail, Phone, Edit, Trash, CheckCircle, XCircle } from 'lucide-react-native';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

interface Appointment {
  id: string;
  date: string;
  time: string | null; // Peut être null
  duration: number | null; // Peut être null
  type: string;
  status: 'en_attente' | 'confirme' | 'annule' | 'termine'; // Updated status types
  client: {
    id: string;
    name: string;
    avatar: string | null; // Peut être null
    email: string;
    phone: string;
  };
  boat: {
    id: string;
    name: string;
    type: string;
    place_de_port?: string | null; // Peut être null
  };
  location: string | null; // Peut être null
  description: string | null; // Peut être null
  cree_par?: { // Creator of the appointment
    id: string;
    profile: string;
    first_name?: string; // Add first_name
    last_name?: string;  // Add last_name
    e_mail?: string; // Add email
    phone?: string; // Add phone
  };
  invite?: { // Invited user to the appointment
    id: string;
    name: string;
    profile: string;
    first_name?: string; // Add first_name
    last_name?: string;  // Add last_name
    e_mail?: string; // Add email
    phone?: string | null;
  };
  boatManager?: { // This is the invited/created by Boat Manager, if applicable
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  nauticalCompany?: { // This is the invited/created by Nautical Company, if applicable
    id: string;
    name: string;
    phone?: string | null;
  } | null;
}

export default function AppointmentDetailsScreen() {
  const params = useLocalSearchParams();
  const { id } = params;
  const { user } = useAuth(); // Get the current user

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (!id) {
        setError("ID du rendez-vous manquant.");
        setLoading(false);
        return;
      }

      try {
        // Convertir l'ID en nombre car la colonne 'id' est de type integer
        const appointmentIdNum = Number(id);
        if (isNaN(appointmentIdNum)) {
          setError("ID du rendez-vous invalide.");
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
          .eq('id', appointmentIdNum) // Utiliser l'ID converti en nombre
          .single();

        if (rdvError) {
          console.error('Error fetching appointment details:', rdvError);
          setError("Erreur lors du chargement des détails du rendez-vous.");
          setLoading(false);
          return;
        }

        if (data) {
          // Gérer les valeurs nulles pour la durée
          let durationInMinutes: number | null = null;
          if (typeof data.duree === 'string') {
            const parts = data.duree.split(':');
            if (parts.length >= 3) {
              const hours = parseInt(parts[0], 10);
              const minutes = parseInt(parts[1], 10);
              durationInMinutes = hours * 60 + minutes;
            } else if (parts.length === 2) {
              const hours = parseInt(parts[0], 10);
              const minutes = parseInt(parts[1], 10);
              durationInMinutes = hours * 60 + minutes;
            }
          } else if (typeof data.duree === 'number') {
            durationInMinutes = data.duree;
          }

          let displayedBoatManager: Appointment['boatManager'] | null = null;
          let displayedNauticalCompany: Appointment['nauticalCompany'] | null = null;

          // Helper to create professional object
          const createProfessional = (user_data: any) => ({
            id: user_data.id.toString(),
            name: `${user_data.first_name ?? ''} ${user_data.last_name ?? ''}`,
            phone: user_data.phone ?? null,
          });

          // Logic for displaying the 4th block based on current user's role
          if (user?.role === 'nautical_company') {
            // If current user is NC, show the BM involved
            if (data.cree_par && data.cree_par.profile === 'boat_manager') {
              displayedBoatManager = createProfessional(data.cree_par);
            } else if (data.invite && data.invite.profile === 'boat_manager') {
              displayedBoatManager = createProfessional(data.invite);
            }
          } else if (user?.role === 'boat_manager') {
            // If current user is BM, show the NC involved
            if (data.cree_par && data.cree_par.profile === 'nautical_company') {
              displayedNauticalCompany = createProfessional(data.cree_par);
            } else if (data.invite && data.invite.profile === 'nautical_company') {
              displayedNauticalCompany = createProfessional(data.invite);
            }
          } else {
            // For pleasure_boater or corporate, show either BM or NC if they are involved
            // Prioritize invitee if they are a professional, otherwise creator if they are a professional
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
            id: data.id.toString(),
            date: data.date_rdv,
            time: data.heure ?? null, // Gérer undefined vers null
            duration: durationInMinutes ?? null, // Gérer undefined vers null
            type: data.categorie_service?.description1 || 'unknown',
            status: data.statut,
            client: {
              id: data.id_client.id.toString(),
              name: `${data.id_client.first_name ?? ''} ${data.id_client.last_name ?? ''}`, // Gérer undefined
              avatar: data.id_client.avatar || null, // Gérer avatar null
              email: data.id_client.e_mail,
              phone: data.id_client.phone,
            },
            boat: {
              id: data.id_boat.id.toString(),
              name: data.id_boat.name,
              type: data.id_boat.type,
              place_de_port: data.id_boat.place_de_port ?? null, // Gérer place_de_port null
            },
            location: data.id_boat.place_de_port ?? null, // Utiliser place_de_port du bateau ou null
            description: data.description ?? null, // Gérer description null
            cree_par: data.cree_par ? {
              id: data.cree_par.id.toString(),
              profile: data.cree_par.profile,
              first_name: data.cree_par.first_name,
              last_name: data.cree_par.last_name,
              e_mail: data.cree_par.e_mail,
              phone: data.cree_par.phone,
            } : undefined,
            invite: data.invite ? {
              id: data.invite.id.toString(),
              name: `${data.invite.first_name ?? ''} ${data.invite.last_name ?? ''}`,
              profile: data.invite.profile,
              first_name: data.invite.first_name,
              last_name: data.invite.last_name,
              e_mail: data.invite.e_mail,
              phone: data.invite.phone ?? null,
            } : undefined,
            boatManager: displayedBoatManager,
            nauticalCompany: displayedNauticalCompany,
          });
        } else {
          setError("Rendez-vous non trouvé.");
        }
      } catch (e) {
        console.error('Unexpected error:', e);
        setError("Une erreur inattendue est survenue.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatTime = (time: string | null) => { // Gérer time null
    return time ? time.substring(0, 5).replace(':', 'h') : '';
  };

  const formatDuration = (duration: number | null) => { // Gérer duration null
    if (duration === null || isNaN(duration) || duration === 0) return '0h';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes ? minutes : ''}`;
  };

  const handleEditAppointment = () => {
    if (appointment?.id) {
      let pathname = '';
      if (user?.role === 'boat_manager') {
        pathname = '/(boat-manager)/planning';
      } else if (user?.role === 'nautical_company') {
        pathname = '/(nautical-company)/planning';
      } else {
        // Fallback or error if role is not handled
        Alert.alert('Erreur', 'Rôle utilisateur non reconnu pour la modification.');
        return;
      }
      router.push({
        pathname: pathname,
        params: { editAppointmentId: appointment.id }
      });
    } else {
      Alert.alert('Erreur', 'Impossible de modifier ce rendez-vous.');
    }
  };

  const handleDeleteAppointment = () => {
    Alert.alert(
      'Supprimer le rendez-vous',
      'Êtes-vous sûr de vouloir supprimer ce rendez-vous ? Cette action est irréversible.',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (appointment?.id) {
              const { error: deleteError } = await supabase
                .from('rendez_vous')
                .delete()
                .eq('id', Number(appointment.id)); // Convertir l'ID en nombre pour la suppression

              if (deleteError) {
                console.error('Error deleting appointment:', deleteError);
                Alert.alert('Erreur', `Impossible de supprimer le rendez-vous: ${deleteError.message}`);
              } else {
                Alert.alert('Succès', 'Le rendez-vous a été supprimé avec succès.');
                router.back(); // Go back to the previous screen (e.g., planning list)
              }
            }
          },
        },
      ]
    );
  };

  const handleAcceptAppointment = async () => {
    if (!appointment?.id) return;
    const { error: updateError } = await supabase
      .from('rendez_vous')
      .update({ statut: 'confirme' })
      .eq('id', Number(appointment.id));

    if (updateError) {
      Alert.alert('Erreur', `Impossible d'accepter le rendez-vous: ${updateError.message}`);
    } else {
      Alert.alert('Succès', 'Rendez-vous accepté !');
      setAppointment(prev => prev ? { ...prev, status: 'confirme' } : null);
      router.back();
    }
  };

  const handleRejectAppointment = async () => {
    if (!appointment?.id) return;
    const { error: updateError } = await supabase
      .from('rendez_vous')
      .update({ statut: 'annule' })
      .eq('id', Number(appointment.id));

    if (updateError) {
      Alert.alert('Erreur', `Impossible de refuser le rendez-vous: ${updateError.message}`);
    } else {
      Alert.alert('Succès', 'Rendez-vous refusé.');
      setAppointment(prev => prev ? { ...prev, status: 'annule' } : null);
      router.back();
    }
  };

  const isCreator = user?.id === appointment?.cree_par?.id;
  const isInvited = user?.id === appointment?.invite?.id;
  const isPending = appointment?.status === 'en_attente';

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Chargement des détails du rendez-vous...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Rendez-vous introuvable.</Text>
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
        <Text style={styles.title}>Détails du rendez-vous</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{appointment.description ?? ''}</Text>
          <View style={styles.detailRow}>
            <Calendar size={18} color="#666" />
            <Text style={styles.detailText}>Date: {formatDate(appointment.date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={18} color="#666" />
            <Text style={styles.detailText}>Heure: {formatTime(appointment.time)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Clock size={18} color="#666" />
            <Text style={styles.detailText}>Durée: {formatDuration(appointment.duration)}</Text>
          </View>
          <View style={styles.detailRow}>
            <FileText size={18} color="#666" />
            <Text style={styles.detailText}>Type: {appointment.type}</Text>
          </View>
          <View style={styles.detailRow}>
            <MapPin size={18} color="#666" />
            <Text style={styles.detailText}>Lieu: {appointment.location ?? ''}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Client</Text>
          <View style={styles.detailRow}>
            <User size={18} color="#666" />
            <Text style={styles.detailText}>Nom: {appointment.client.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Mail size={18} color="#666" />
            <Text style={styles.detailText}>Email: {appointment.client.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Phone size={18} color="#666" />
            <Text style={styles.detailText}>Téléphone: {appointment.client.phone}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bateau</Text>
          <View style={styles.detailRow}>
            <Boat size={18} color="#666" />
            <Text style={styles.detailText}>Nom: {appointment.boat.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <FileText size={18} color="#666" />
            <Text style={styles.detailText}>Type: {appointment.boat.type}</Text>
          </View>
          {appointment.boat.place_de_port && (
            <View style={styles.detailRow}>
              <MapPin size={18} color="#666" />
              <Text style={styles.detailText}>Place de port: {appointment.boat.place_de_port ?? ''}</Text>
            </View>
          )}
        </View>

        {appointment.boatManager && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Boat Manager</Text>
            <View style={styles.detailRow}>
              <User size={18} color="#666" />
              <Text style={styles.detailText}>Nom: {appointment.boatManager.name}</Text>
            </View>
            {appointment.boatManager.phone && (
              <View style={styles.detailRow}>
                <Phone size={18} color="#666" />
                <Text style={styles.detailText}>Téléphone: {appointment.boatManager.phone ?? ''}</Text>
              </View>
            )}
          </View>
        )}

        {appointment.nauticalCompany && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entreprise du nautisme</Text>
            <View style={styles.detailRow}>
              <Building size={18} color="#666" />
              <Text style={styles.detailText}>Nom: {appointment.nauticalCompany.name}</Text>
            </View>
            {appointment.nauticalCompany.phone && (
              <View style={styles.detailRow}>
                <Phone size={18} color="#666" />
                <Text style={styles.detailText}>Téléphone: {appointment.nauticalCompany.phone ?? ''}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionButtonsContainer}>
          {isCreator ? (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleEditAppointment}>
                <Edit size={20} color="#0066CC" />
                <Text style={styles.actionButtonText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeleteAppointment}>
                <Trash size={20} color="#EF4444" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Supprimer</Text>
              </TouchableOpacity>
            </>
          ) : isInvited && isPending ? (
            <>
              <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAcceptAppointment}>
                <CheckCircle size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Accepter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={handleRejectAppointment}>
                <XCircle size={20} color="#EF4444" />
                <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Refuser</Text>
              </TouchableOpacity>
            </>
          ) : null}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 12,
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
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
    backgroundColor: '#10B981', // Green for accept
  },
  rejectButton: {
    backgroundColor: '#fff5f5', // Light red for reject
  },
});
