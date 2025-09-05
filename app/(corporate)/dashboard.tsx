import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, ActivityIndicator } from 'react-native';
import { Users, FileText, Building, ChevronRight, Clock, CircleCheck as CheckCircle, MessageSquare, MapPin, Ship, Briefcase, TriangleAlert as AlertTriangle, Star, Euro, Calendar } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import { supabase } from '@/src/lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

// Définition de l'avatar par défaut
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

// Fonctions utilitaires pour les URLs d'avatars
const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getSignedAvatarUrl = async (value?: string) => {
  if (!value) return '';
  if (isHttpUrl(value)) return value;

  const { data, error } = await supabase
    .storage
    .from('avatars')
    .createSignedUrl(value, 60 * 60); // 1h de validité

  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const [currentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState({
    totalUsers: 0,
    pleasureBoaters: 0, // New stat
    activeRequests: 0,
    boatManagers: 0,
    nauticalCompanies: 0,
    pendingInvoices: 0,
    completedInvoices: 0,
    billableRequests: 0,
    performanceRating: 0,
    performanceReviewCount: 0,
    urgentRequests: 0,
    newMessages: 0,
    avgBmRating: 0, // New stat
    avgNcRating: 0, // New stat
  });

  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [topRatedPartners, setTopRatedPartners] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // --- Fetch Stats Grid Data ---
      const [
  { count: totalUsersCount, error: totalUsersError },
  { count: pleasureBoatersCount, error: pleasureBoatersError },
  { count: bmCount, error: bmError },
  { count: ncCount, error: ncError },
  { count: pendingRequestsCount, error: pendingRequestsError },
  { count: urgentRequestsCount, error: urgentRequestsError },
  { data: corporateProfile, error: corporateProfileError },
  { data: bmRatingsData, error: bmRatingsError },
  { data: ncRatingsData, error: ncRatingsError },
  { data: memberRows, error: memberErr },  // ✅ conversations de l’utilisateur
] = await Promise.all([
  supabase.from('users').select('id', { count: 'exact' }),
  supabase.from('users').select('id', { count: 'exact' }).eq('profile', 'pleasure_boater'),
  supabase.from('users').select('id', { count: 'exact' }).eq('profile', 'boat_manager'),
  supabase.from('users').select('id', { count: 'exact' }).eq('profile', 'nautical_company'),
  supabase.from('service_request').select('id', { count: 'exact' }).eq('statut', 'submitted'),
  supabase.from('service_request').select('id', { count: 'exact' }).eq('urgence', 'urgent'),
  supabase.from('users').select('rating, review_count').eq('id', user.id).single(),
  supabase.from('users').select('rating, review_count').eq('profile', 'boat_manager'),
  supabase.from('users').select('rating, review_count').eq('profile', 'nautical_company'),
  supabase.from('conversation_members')
    .select('conversation_id, last_read_at')
    .eq('user_id', user.id),
]);

if (memberErr) {
  console.error('Error fetching user conversations:', memberErr);
  setError('Échec du chargement des statistiques.');
  setLoading(false);
  return;
}

// ✅ calcule le nombre de nouveaux messages par conversation (après last_read_at)
const unreadCounts = await Promise.all(
  (memberRows ?? []).map(async (m) => {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', m.conversation_id)
      .gt('created_at', m.last_read_at ?? '1970-01-01')
      .neq('sender_id', user.id); // on n’inclut pas ses propres messages
    if (error) {
      console.error('Error counting unread for conversation', m.conversation_id, error);
      return 0;
    }
    return count ?? 0;
  })
);

const newMessagesCount = unreadCounts.reduce((a, b) => a + b, 0);


      if (totalUsersError || pleasureBoatersError || bmError || ncError || pendingRequestsError || urgentRequestsError || corporateProfileError || bmRatingsError || ncRatingsError || memberErr) {
  console.error('Error fetching stats:', totalUsersError || pleasureBoatersError || bmError || ncError || pendingRequestsError || urgentRequestsError || corporateProfileError || bmRatingsError || ncRatingsError || memberErr);
  setError('Échec du chargement des statistiques.');
  return;
}

      // Calculate average BM rating
      let totalBmRating = 0;
      let totalBmReviewCount = 0;
      bmRatingsData?.forEach(bm => {
        if (bm.rating !== null && bm.review_count !== null) {
          totalBmRating += bm.rating * bm.review_count;
          totalBmReviewCount += bm.review_count;
        }
      });
      const avgBmRating = totalBmReviewCount > 0 ? (totalBmRating / totalBmReviewCount) : 0;

      // Calculate average NC rating
      let totalNcRating = 0;
      let totalNcReviewCount = 0;
      ncRatingsData?.forEach(nc => {
        if (nc.rating !== null && nc.review_count !== null) {
          totalNcRating += nc.rating * nc.review_count;
          totalNcReviewCount += nc.review_count;
        }
      });
      const avgNcRating = totalNcReviewCount > 0 ? (totalNcRating / totalNcReviewCount) : 0;

      setStats(prevStats => ({
        ...prevStats,
        totalUsers: totalUsersCount || 0,
        pleasureBoaters: pleasureBoatersCount || 0,
        boatManagers: bmCount || 0,
        nauticalCompanies: ncCount || 0,
        activeRequests: pendingRequestsCount || 0,
        urgentRequests: urgentRequestsCount || 0,
         newMessages: newMessagesCount, 
        performanceRating: corporateProfile?.rating || 0,
        performanceReviewCount: corporateProfile?.review_count || 0,
        avgBmRating: avgBmRating,
        avgNcRating: avgNcRating,
      }));

      // --- Fetch Upcoming Appointments ---
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toTimeString().slice(0, 5);

      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('rendez_vous')
        .select(`
          id,
          date_rdv,
          heure,
          description,
          id_client(first_name, last_name),
          id_boat(name, type, place_de_port)
        `)
        .or(`invite.eq.${user.id},cree_par.eq.${user.id}`)
        .in('statut', ['en_attente', 'confirme'])
        .or(`date_rdv.gt.${today},and(date_rdv.eq.${today},heure.gt.${now})`)
        .order('date_rdv', { ascending: true })
        .order('heure', { ascending: true })
        .limit(3);

      if (appointmentsError) {
        console.error('Error fetching upcoming appointments:', appointmentsError);
      } else {
        setUpcomingAppointments(appointmentsData);
      }

      // --- Fetch Recent Activities (Service Requests) ---
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
        .order('date', { ascending: false })
        .limit(5);

      if (activitiesError) {
        console.error('Error fetching recent activities:', activitiesError);
      } else {
        setRecentActivities(activitiesData.map(activity => ({
          id: activity.id,
          type: activity.statut,
          title: activity.description,
          description: `Demande pour ${activity.id_client?.first_name || 'N/A'} ${activity.id_client?.last_name || 'N/A'} - ${activity.id_boat?.name || 'N/A'}`,
          time: `${Math.floor((new Date().getTime() - new Date(activity.date).getTime()) / (1000 * 60 * 60 * 24))}j`,
          amount: activity.prix ? `${activity.prix}€` : undefined,
          entity: `${activity.id_client?.first_name || 'N/A'} ${activity.id_client?.last_name || 'N/A'}`,
          entityType: 'client'
        })));
      }

      // --- Fetch Top Rated Partners ---
      const { data: partnersData, error: partnersError } = await supabase
        .from('users')
        .select('id, first_name, last_name, company_name, profile, avatar, rating, review_count')
        .in('profile', ['boat_manager', 'nautical_company'])
        .order('rating', { ascending: false })
        .limit(3);

      if (partnersError) {
        console.error('Error fetching top rated partners:', partnersError);
      } else {
        const processedTopPartners = await Promise.all(partnersData.map(async partner => {
          const signedAvatar = await getSignedAvatarUrl(partner.avatar);
          return {
            id: partner.id,
            name: partner.profile === 'boat_manager' ? `${partner.first_name} ${partner.last_name}` : partner.company_name,
            type: partner.profile,
            rating: partner.rating || 0,
            reviews: partner.review_count || 0,
            image: signedAvatar || DEFAULT_AVATAR,
          };
        }));
        setTopRatedPartners(processedTopPartners);
      }

    } catch (e: any) {
      console.error('Dashboard data fetch error:', e);
      setError('Une erreur inattendue est survenue lors du chargement du tableau de bord.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quote_accepted':
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
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Bienvenue, {user?.firstName}
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
          {stats.activeRequests} demandes actives
        </Text>
      </View>

      <View style={styles.statsGrid}>
        {/* Ligne 1: Nombre total d'utilisateurs */}
        <View style={[styles.statCard, styles.fullWidthStatCard]}>
          <Users size={24} color="#0066CC" />
          <Text style={styles.statNumber}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Utilisateurs de l'application</Text>
        </View>

        {/* Ligne 2: Plaisanciers, Boat Managers, Entreprises du nautisme */}
        <View style={styles.threeColumnGrid}>
          <View style={styles.statCard}>
            <Users size={24} color="#0EA5E9" />
            <Text style={styles.statNumber}>{stats.pleasureBoaters}</Text>
            <Text style={styles.statLabel} adjustsFontSizeToFit numberOfLines={1}>Plaisanciers</Text>
          </View>

          <View style={styles.statCard}>
            <Users size={24} color="#10B981" />
            <Text style={styles.statNumber}>{stats.boatManagers}</Text>
            <Text style={styles.statLabel} adjustsFontSizeToFit numberOfLines={1}>Boat Managers</Text>
          </View>

          <View style={styles.statCard}>
            <Building size={24} color="#8B5CF6" />
            <Text style={styles.statNumber}>{stats.nauticalCompanies}</Text>
            <Text style={styles.statLabel} adjustsFontSizeToFit numberOfLines={2}>Entreprises du nautisme</Text>
          </View>
        </View>

        {/* Ligne 3: Notes moyennes */}
        <View style={styles.twoColumnGrid}>
          <View style={styles.statCard}>
            <Star size={24} color="#10B981" />
            <Text style={styles.statNumber}>{stats.avgBmRating.toFixed(1)}</Text>
            <Text style={styles.statLabel} adjustsFontSizeToFit numberOfLines={2}>Note moyenne Boat Managers</Text>
          </View>

          <View style={styles.statCard}>
            <Star size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats.avgNcRating.toFixed(1)}</Text>
            <Text style={styles.statLabel} adjustsFontSizeToFit numberOfLines={2}>Note moyenne Entreprises du nautisme</Text>
          </View>
        </View>
      </View>

      {/* Billing Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <FileText size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Facturation</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => handleNavigate('/(corporate)/requests?status=to_pay')}
          >
            <Text style={styles.viewAllText}>Voir toutes</Text>
            <ChevronRight size={20} color="#0066CC" />
          </TouchableOpacity>
        </View>

        <View style={styles.invoiceStats}>
          <TouchableOpacity 
            style={[styles.invoiceStatCard, { backgroundColor: '#FEF3C7' }]}
            onPress={() => handleNavigate('/(corporate)/requests?status=ready_to_bill')}
          >
            <Clock size={20} color="#F59E0B" />
            <Text style={[styles.invoiceStatNumber, { color: '#F59E0B' }]}>{stats.activeRequests}</Text>
            <Text style={[styles.invoiceStatLabel, { color: '#F59E0B' }]}>Bon à facturer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.invoiceStatCard, { backgroundColor: '#D1FAE5' }]}
            onPress={() => handleNavigate('/(corporate)/requests?status=paid')}
          >
            <CheckCircle size={20} color="#10B981" />
            <Text style={[styles.invoiceStatNumber, { color: '#10B981' }]}>{stats.pendingInvoices}</Text>
            <Text style={[styles.invoiceStatLabel, { color: '#10B981' }]}>Factures émises</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gestion financière */}
      <TouchableOpacity 
        style={styles.financeAccessCard}
        onPress={() => handleNavigate('/corporate/finances')}
      >
        <View style={styles.financeAccessContent}>
          <View style={styles.financeAccessIcon}>
            <Euro size={24} color="#0066CC" />
          </View>
          <View style={styles.financeAccessInfo}>
            <Text style={styles.financeAccessTitle}>Accès aux données financières</Text>
            <Text style={styles.financeAccessDescription}>
              Consultez les revenus, factures et statistiques financières
            </Text>
          </View>
        </View>
        {user?.permissions?.canAccessFinancials ? (
          <Text style={styles.financeAccessAction}>Accéder</Text>
        ) : (
          <Text style={styles.financeAccessDisabled}>Accès non disponible</Text>
        )}
      </TouchableOpacity>

      {/* Top Rated Partners */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Star size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Partenaires les mieux notés</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => handleNavigate('/corporate/partners')}
          >
            <Text style={styles.viewAllText}>Voir tous</Text>
            <ChevronRight size={20} color="#0066CC" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.partnersContainer}
        >
          {topRatedPartners.length > 0 ? (
            topRatedPartners.map((partner) => (
              <TouchableOpacity 
                key={partner.id} 
                style={styles.partnerCard}
                onPress={() => handleNavigate(`/partner/${partner.id}`)}
              >
                <Image source={{ uri: partner.image }} style={styles.partnerImage} />
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>{partner.name}</Text>
                  <Text style={styles.partnerType}>
                    {partner.type === 'boat_manager' ? 'Boat Manager' : 'Entreprise du nautisme'}
                  </Text>
                  <View style={styles.partnerRating}>
                    <Star size={16} color="#FFC107" fill="#FFC107" />
                    <Text style={styles.partnerRatingText}>
                      {partner.rating.toFixed(1)} ({partner.reviews} avis)
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucun partenaire trouvé.</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Recent Activities */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Clock size={24} color="#0066CC" />
            <Text style={styles.sectionTitle}>Activités récentes</Text>
          </View>
        </View>

        <View style={styles.activitiesList}>
          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
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
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucune activité récente.</Text>
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
    flexDirection: 'column', // Changed to column for overall grid
    padding: 20,
    gap: 16, // Gap between rows of cards
  },
  threeColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16, // Gap between cards in a row
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16, // Gap between cards in a row
  },
  statCard: {
    flex: 1,
    minWidth: '30%', // Adjusted for 3 columns, will be overridden by fullWidthStatCard
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
  },
  fullWidthStatCard: {
    minWidth: '100%',
  },
  // Styles for the new "card button" look in Facturation section
  invoiceStats: {
    flexDirection: 'row', // Changed to row
    justifyContent: 'space-between', // Distribute space between items
    gap: 12, // Gap between cards
    marginBottom: 16,
  },
  invoiceStatCard: {
    flex: 1, // Each card takes equal space
    backgroundColor: 'white',
    padding: 16, // Reduced padding
    borderRadius: 12,
    alignItems: 'center',
    gap: 8, // Reduced gap between icon/number/label
    borderWidth: 1,
    borderColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, // Reduced shadow
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
  invoiceStatNumber: {
    fontSize: 20, // Reduced number size
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  invoiceStatLabel: {
    fontSize: 12, // Reduced label size
    textAlign: 'center',
    color: '#666',
  },
  // Styles for modern "Top Rated Partners" section
  partnersContainer: {
    paddingRight: 20,
    gap: 16, // Reduced gap between cards
    paddingTop: 8,
  },
  partnerCard: {
    width: 180, // Reduced width
    backgroundColor: 'white',
    borderRadius: 12, // Slightly less rounded corners
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, // Reduced shadow
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
  partnerImage: {
    width: '100%',
    height: 100, // Reduced height
    borderTopLeftRadius: 12, // Match card border radius
    borderTopRightRadius: 12,
  },
  partnerInfo: {
    padding: 12, // Reduced padding
  },
  partnerName: {
    fontSize: 16, // Slightly smaller name
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4, // Reduced space
  },
  partnerType: {
    fontSize: 11, // Smaller type text
    color: '#666',
    marginBottom: 6, // Reduced space
  },
  partnerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // Reduced space
  },
  partnerRatingText: {
    fontSize: 11, // Smaller rating text
    color: '#666',
  },
  financeAccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
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
  financeAccessContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  financeAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  financeAccessInfo: {
    flex: 1,
  },
  financeAccessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  financeAccessDescription: {
    fontSize: 14,
    color: '#666',
  },
  financeAccessAction: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  financeAccessDisabled: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
