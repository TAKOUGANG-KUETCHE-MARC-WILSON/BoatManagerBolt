import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { Users, FileText, Building, ChevronRight, Clock, CircleCheck as CheckCircle, MessageSquare, MapPin, Ship, Briefcase,TriangleAlert as AlertTriangle, Star, CircleAlert as AlertCircle, Euro, Calendar } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [currentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    pendingRequests: 0,
    urgentRequests: 0,
    newMessages: 0,
    performanceRating: 0,
    performanceReviewCount: 0,
  });

  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [topRatedPartners, setTopRatedPartners] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch current nautical company's performance stats
        const { data: companyProfile, error: profileError } = await supabase
          .from('users')
          .select('rating, review_count')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching company profile:', profileError);
        }

        // Fetch upcoming appointments
        const today = new Date().toISOString().split('T')[0];
const now = new Date().toTimeString().slice(0, 5); // "HH:MM"

const { data: appointmentsData, count: upcomingAppointmentsCount, error: appointmentsError } = await supabase
  .from('rendez_vous')
  .select(`
    id,
    date_rdv,
    heure,
    description,
    id_client(first_name, last_name),
    id_boat(name, type, place_de_port)
  `, { count: 'exact' })
  .or(`invite.eq.${user.id},cree_par.eq.${user.id}`) // ✅ entreprise invitée OU créatrice
  .in('statut', ['en_attente', 'confirme']) // ✅ statuts valides
  .or(`date_rdv.gt.${today},and(date_rdv.eq.${today},heure.gt.${now})`) // ✅ futur
  .order('date_rdv', { ascending: true })
  .order('heure', { ascending: true })
  .limit(3); // Limit to 3 for dashboard display

        if (appointmentsError) {
          console.error('Error fetching upcoming appointments:', appointmentsError);
        } else {
          setUpcomingAppointments(appointmentsData);
        }

        // Fetch pending requests (status 'submitted')
        const { count: pendingRequestsCount, error: pendingRequestsError } = await supabase
          .from('service_request')
          .select('id', { count: 'exact' })
          .eq('id_companie', user.id)
          .eq('statut', 'submitted');

        if (pendingRequestsError) {
          console.error('Error fetching pending requests:', pendingRequestsError);
        }

        // Fetch urgent requests
        const { count: urgentRequestsCount, error: urgentRequestsError } = await supabase
          .from('service_request')
          .select('id', { count: 'exact' })
          .eq('id_companie', user.id)
          .eq('urgence', 'urgent');

        if (urgentRequestsError) {
          console.error('Error fetching urgent requests:', urgentRequestsError);
        }

        // Fetch new messages (simplified: count all unread messages for this user)
        // Fetch unread messages (par conversations où l'utilisateur est membre)
// --- Fetch unread messages ---
let newMessagesCount = 0;

const { data: convMembers, error: convError } = await supabase
  .from('conversation_members')
  .select('conversation_id')
  .eq('user_id', user.id);

if (convError || !convMembers) {
  console.error('Erreur lors de la récupération des conversations:', convError);
} else {
  const convIds = convMembers.map(c => c.conversation_id);
  if (convIds.length > 0) {
    const { count: messagesCount, error: messagesError } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .eq('is_read', false);

    if (messagesError) {
      console.error('Erreur lors de la récupération des messages non lus:', messagesError);
    } else {
      newMessagesCount = messagesCount || 0;
    }
  }
}


        // Fetch recent activities (last 5 service requests for this company)
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('service_request')
          .select(`
            id,
            description,
            statut,
            date,
            prix,
            id_client(first_name, last_name),
            id_boat(name)
          `)
          .eq('id_companie', user.id)
          .order('date', { ascending: false })
          .limit(5);

        if (activitiesError) {
          console.error('Error fetching recent activities:', activitiesError);
        } else {
          setRecentActivities(activitiesData.map(activity => ({
            id: activity.id,
            type: activity.statut, // Using status as type for simplicity
            title: activity.description,
            description: `Demande pour ${activity.id_client?.first_name || 'N/A'} ${activity.id_client?.last_name || 'N/A'} - ${activity.id_boat?.name || 'N/A'}`,
            time: `${Math.floor((new Date().getTime() - new Date(activity.date).getTime()) / (1000 * 60 * 60 * 24))}j`, // Days ago
            amount: activity.prix ? `${activity.prix}€` : undefined,
            entity: `${activity.id_client?.first_name || 'N/A'} ${activity.id_client?.last_name || 'N/A'}`,
            entityType: 'client'
          })));
        }

        // Fetch top rated partners (Boat Managers and other Nautical Companies)
        const { data: partnersData, error: partnersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, company_name, profile, avatar, rating, review_count')
          .in('profile', ['boat_manager', 'nautical_company'])
          .order('rating', { ascending: false })
          .limit(3);

        if (partnersError) {
          console.error('Error fetching top rated partners:', partnersError);
        } else {
          setTopRatedPartners(partnersData.map(partner => ({
            id: partner.id,
            name: partner.profile === 'boat_manager' ? `${partner.first_name} ${partner.last_name}` : partner.company_name,
            type: partner.profile,
            rating: partner.rating || 0,
            reviews: partner.review_count || 0,
            image: partner.avatar || 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop'
          })));
        }

        setStats(prevStats => ({
          ...prevStats,
          upcomingAppointments: upcomingAppointmentsCount || 0,
          pendingRequests: pendingRequestsCount || 0,
          urgentRequests: urgentRequestsCount || 0,
          newMessages: newMessagesCount ,
          performanceRating: companyProfile?.rating || 0,
          performanceReviewCount: companyProfile?.review_count || 0,
        }));

      } catch (error) {
        console.error('Dashboard data fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quote_accepted': // Assuming this status exists or is inferred
        return <FileText size={24} color="#10B981" />;
      case 'ready_to_bill':
        return <FileText size={24} color="#3B82F6" />;
      case 'paid':
        return <Euro size={24} color="#10B981" />;
      case 'submitted':
        return <Clock size={24} color="#F59E0B" />;
      default:
        return <Clock size={24} color="#666" />;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Bienvenue, {user?.companyName || 'Entreprise'}
          </Text>
          <Text style={styles.dateText}>
            {currentDate.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>
      </View>

      <View style={styles.activeRequestsBanner}>
        <FileText size={20} color="#0066CC" />
        <Text style={styles.activeRequestsText}>
          {stats.pendingRequests} nouvelles demandes
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={[styles.statCard, styles.urgentCard]}
          onPress={() => handleNavigate('/(nautical-company)/requests?urgency=urgent')}
        >
          <AlertTriangle size={24} color="#DC2626" />
          <Text style={[styles.statNumber, { color: '#DC2626' }]}>{stats.urgentRequests}</Text>
          <Text style={[styles.statLabel, { color: '#DC2626' }]}>Demandes urgentes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => handleNavigate('/(nautical-company)/planning')}
        >
          <Calendar size={24} color="#0066CC" />
          <Text style={styles.statNumber}>{stats.upcomingAppointments}</Text>
          <Text style={styles.statLabel}>RDV à venir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => handleNavigate('/(nautical-company)/requests?status=submitted')}
        >
        <FileText size={24} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.pendingRequests}</Text>
          <Text style={styles.statLabel}>Nouvelles demandes</Text>
        { /*   {stats.pendingRequests > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{stats.pendingRequests}</Text>
            </View>
          )}  */}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          onPress={() => handleNavigate('/(nautical-company)/messages')}
        >
          <MessageSquare size={24} color="#10B981" />
          <Text style={styles.statNumber}>{stats.newMessages}</Text>
          <Text style={styles.statLabel}>Nouveaux messages</Text>
         { /* {stats.newMessages > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{stats.newMessages}</Text>
            </View>
          )} */}
        </TouchableOpacity>
      </View>

      {/* Carte de performance */}
      <TouchableOpacity
        style={styles.performanceCard}
      >
        <View style={styles.performanceHeader}>
          <View style={styles.performanceTitle}>
            <Star size={24} color="#FFC107" />
            <Text style={styles.performanceTitleText}>Performance client</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>{stats.performanceRating.toFixed(1)}</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  fill={star <= Math.floor(stats.performanceRating) ? '#FFC107' : 'none'}
                  color={star <= Math.floor(stats.performanceRating) ? '#FFC107' : '#D1D5DB'}
                />
              ))}
              <Text style={styles.reviewCount}>({stats.performanceReviewCount} avis)</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Section des rendez-vous à venir */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={24} color="#0066CC" />
          <Text style={styles.sectionTitle}>Rendez-vous à venir</Text>
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => handleNavigate('/(nautical-company)/planning')}
        >
          <Text style={styles.viewAllText}>Voir tous</Text>
          <ChevronRight size={20} color="#0066CC" />
        </TouchableOpacity>

        {upcomingAppointments.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.appointmentsContainer}
          >
            {upcomingAppointments.map((appointment, index) => (
              <TouchableOpacity
                key={appointment.id}
                style={styles.appointmentCard}
                onPress={() => handleNavigate(`/appointment/${appointment.id}`)}
              >
                <View style={styles.appointmentHeader}>
                  <Clock size={16} color="#666" />
                  <Text style={styles.appointmentTime}>
                    {appointment.heure ? appointment.heure.substring(0, 5).replace(':', 'h') : 'N/A'}
                  </Text>
                </View>
                <Text style={styles.appointmentTitle}>
                  {appointment.description || 'Rendez-vous'}
                </Text>
                <Text style={styles.appointmentClient}>
                  {appointment.id_client?.first_name || 'N/A'} {appointment.id_client?.last_name || 'N/A'}
                </Text>
                <Text style={styles.appointmentBoat}>
                  {appointment.id_boat?.name || 'N/A'} • {appointment.id_boat?.type || 'N/A'}
                </Text>
                <View style={styles.appointmentLocation}>
                  <MapPin size={14} color="#666" />
                  <Text style={styles.locationText}>
                    {appointment.id_boat?.place_de_port || 'N/A'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucun rendez-vous à venir.</Text>
          </View>
        )}
      </View>

      {/* Section des dernières demandes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <FileText size={24} color="#0066CC" />
          <Text style={styles.sectionTitle}>Dernières demandes</Text>
        </View>

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => handleNavigate('/(nautical-company)/requests')}
        >
          <Text style={styles.viewAllText}>Voir toutes</Text>
          <ChevronRight size={20} color="#0066CC" />
        </TouchableOpacity>

        {recentActivities.length > 0 ? (
          <View style={styles.activitiesList}>
            {recentActivities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => handleNavigate(`/request/${activity.id}`)}
              >
                <View style={styles.activityIconContainer}>
                  {getActivityIcon(activity.type)}
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityTime}>{activity.time}</Text>
                    {activity.amount && (
                      <Text style={styles.activityAmount}>{activity.amount}</Text>
                    )}
                  </View>
                </View>
                <ChevronRight size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Aucune activité récente.</Text>
          </View>
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    color: '#666',
    textTransform: 'capitalize',
  },
  activeRequestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f7ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  activeRequestsText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryBadge: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  summaryBadgeText: {
    color: '#0066CC',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
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
  urgentCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  notificationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  performanceCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
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
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  performanceTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  performanceTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  ratingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceStat: {
    alignItems: 'center',
    flex: 1,
  },
  performanceStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0066CC',
  },
  performanceStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    padding: 20,
    position: 'relative',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  appointmentsContainer: {
    paddingRight: 20,
    gap: 16,
    paddingTop: 8,
  },
  appointmentCard: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    gap: 8,
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
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appointmentTime: {
    fontSize: 14,
    color: '#666',
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  appointmentClient: {
    fontSize: 14,
    color: '#666',
  },
  appointmentBoat: {
    fontSize: 12,
    color: '#666',
  },
  appointmentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  activityAmount: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  activityRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityRatingText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
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
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  }
});
