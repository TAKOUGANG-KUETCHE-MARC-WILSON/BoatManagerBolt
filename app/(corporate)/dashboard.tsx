import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { Users, FileText, Building, ChevronRight, Clock, CircleCheck as CheckCircle, MessageSquare, MapPin, Ship, Briefcase, Star, CircleAlert as AlertCircle, Euro } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [currentDate] = useState(new Date());

  const stats = {
    totalUsers: 156,
    activeRequests: 24,
    boatManagers: 12,
    nauticalCompanies: 8,
    pendingInvoices: 3,
    completedInvoices: 18,
    billableRequests: 5,
    averageRating: 4.7,
    boatManagerRating: 4.8,
    nauticalCompanyRating: 4.6
  };

  const recentActivities = [
    {
      id: 'a1',
      type: 'quote_accepted',
      title: 'Devis accepté par Jean Dupont',
      description: 'Le devis DEV-2024-003 de Nautisme Pro a été accepté et nécessite une facturation',
      time: '2h',
      amount: '2 500€',
      entity: 'Nautisme Pro',
      entityType: 'nautical_company'
    },
    {
      id: 'a2',
      type: 'invoice_created',
      title: 'Nouvelle facture déposée',
      description: 'La facture FAC-2024-002 a été déposée et envoyée à Sophie Martin',
      time: '1j',
      amount: '1 800€',
      entity: 'Marie Martin',
      entityType: 'boat_manager'
    },
    {
      id: 'a3',
      type: 'payment_received',
      title: 'Paiement reçu',
      description: 'Le paiement pour la facture FAC-2024-001 a été reçu',
      time: '2j',
      amount: '950€',
      entity: 'Pierre Dubois',
      entityType: 'client'
    },
    {
      id: 'a4',
      type: 'new_rating',
      title: 'Nouvelle évaluation',
      description: 'Jean Dupont a donné 5 étoiles à Nautisme Pro',
      time: '3j',
      rating: 5,
      entity: 'Nautisme Pro',
      entityType: 'nautical_company'
    }
  ];

  const topRatedPartners = [
    {
      id: 'p1',
      name: 'Nautisme Pro',
      type: 'nautical_company',
      rating: 4.9,
      reviews: 42,
      image: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop'
    },
    {
      id: 'p2',
      name: 'Marie Martin',
      type: 'boat_manager',
      rating: 4.8,
      reviews: 36,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop'
    },
    {
      id: 'p3',
      name: 'Marine Services',
      type: 'nautical_company',
      rating: 4.7,
      reviews: 28,
      image: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2070&auto=format&fit=crop'
    }
  ];

  const handleViewPendingInvoices = () => {
    router.push('/(corporate)/requests?status=to_pay');
  };

  const handleViewBillableRequests = () => {
    router.push('/(corporate)/requests?status=ready_to_bill');
  };

  const handleViewAllPartners = () => {
    router.push('/(corporate)/partners');
  };

  const handleViewActivity = (activity: any) => {
    if (activity.type === 'quote_accepted' || activity.type === 'invoice_created') {
      router.push(`/request/${activity.id}`);
    } else if (activity.type === 'payment_received') {
      router.push(`/invoice/${activity.id}`);
    } else if (activity.type === 'new_rating') {
      router.push(`/partner/${activity.entity}`);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quote_accepted':
        return <FileText size={24} color="#10B981" />;
      case 'invoice_created':
        return <FileText size={24} color="#3B82F6" />;
      case 'payment_received':
        return <FileText size={24} color="#10B981" />;
      case 'new_rating':
        return <Star size={24} color="#F59E0B" />;
      default:
        return <Clock size={24} color="#666" />;
    }
  };

  const handleAccessFinances = () => {
    if (user?.permissions?.canAccessFinancials) {
      router.push('/corporate/finances');
    }
  };

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
              year: 'numeric',
              month: 'long',
              day: 'numeric'
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
        {/* Première ligne - Utilisateurs */}
        <View style={[styles.statCard, styles.fullWidthStatCard]}>
          <Users size={24} color="#0066CC" />
          <Text style={styles.statNumber}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Utilisateurs</Text>
        </View>

        {/* Deuxième ligne - Boat Managers et Entreprises */}
        <View style={styles.statCard}>
          <Users size={24} color="#10B981" />
          <Text style={styles.statNumber}>{stats.boatManagers}</Text>
          <Text style={styles.statLabel}>Boat Managers</Text>
        </View>

        <View style={styles.statCard}>
          <Building size={24} color="#8B5CF6" />
          <Text style={styles.statNumber}>{stats.nauticalCompanies}</Text>
          <Text style={styles.statLabel}>Entreprises</Text>
        </View>

        {/* Troisième ligne - Notes */}
        <View style={styles.statCard}>
          <Star size={24} color="#10B981" />
          <Text style={styles.statNumber}>{stats.boatManagerRating}</Text>
          <Text style={styles.statLabel}>Note Boat Managers</Text>
        </View>

        <View style={styles.statCard}>
          <Star size={24} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.nauticalCompanyRating}</Text>
          <Text style={styles.statLabel}>Note Entreprises</Text>
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
            onPress={handleViewPendingInvoices}
          >
            <Text style={styles.viewAllText}>Voir toutes</Text>
            <ChevronRight size={20} color="#0066CC" />
          </TouchableOpacity>
        </View>

        <View style={styles.invoiceStats}>
          <TouchableOpacity 
            style={[styles.invoiceStatCard, { backgroundColor: '#FEF3C7' }]}
            onPress={handleViewBillableRequests}
          >
            <Clock size={24} color="#F59E0B" />
            <Text style={[styles.invoiceStatNumber, { color: '#F59E0B' }]}>{stats.billableRequests}</Text>
            <Text style={[styles.invoiceStatLabel, { color: '#F59E0B' }]}>Bon à facturer</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.invoiceStatCard, { backgroundColor: '#D1FAE5' }]}
            onPress={handleViewPendingInvoices}
          >
            <CheckCircle size={24} color="#10B981" />
            <Text style={[styles.invoiceStatNumber, { color: '#10B981' }]}>{stats.completedInvoices}</Text>
            <Text style={[styles.invoiceStatLabel, { color: '#10B981' }]}>Factures émises</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gestion financière */}
      <TouchableOpacity 
        style={styles.financeAccessCard}
        onPress={handleAccessFinances}
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
            onPress={handleViewAllPartners}
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
          {topRatedPartners.map((partner) => (
            <TouchableOpacity 
              key={partner.id} 
              style={styles.partnerCard}
              onPress={() => router.push(`/partner/${partner.id}`)}
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
                    {partner.rating} ({partner.reviews} avis)
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
          {recentActivities.map((activity) => (
            <TouchableOpacity 
              key={activity.id} 
              style={styles.activityCard}
              onPress={() => handleViewActivity(activity)}
            >
              <View style={styles.activityIconContainer}>
                {getActivityIcon(activity.type)}
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDescription}>{activity.description}</Text>
                <View style={styles.activityMeta}>
                  <Text style={styles.activityTime}>Il y a {activity.time}</Text>
                  {activity.amount && (
                    <Text style={styles.activityAmount}>{activity.amount}</Text>
                  )}
                  {activity.rating && (
                    <View style={styles.activityRating}>
                      <Star size={14} color="#FFC107" fill="#FFC107" />
                      <Text style={styles.activityRatingText}>{activity.rating}</Text>
                    </View>
                  )}
                </View>
              </View>
              <ChevronRight size={20} color="#666" />
            </TouchableOpacity>
          ))}
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
  fullWidthStatCard: {
    minWidth: '100%',
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
  section: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  invoiceStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  invoiceStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  invoiceStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  invoiceStatLabel: {
    fontSize: 14,
    textAlign: 'center',
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
  partnersContainer: {
    paddingRight: 20,
    gap: 16,
  },
  partnerCard: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 12,
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
  partnerImage: {
    width: '100%',
    height: 120,
  },
  partnerInfo: {
    padding: 12,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  partnerType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  partnerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  partnerRatingText: {
    fontSize: 14,
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
  }
});