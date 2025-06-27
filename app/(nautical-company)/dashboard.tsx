import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ship, Calendar, FileText, Clock, ChevronRight, TriangleAlert as AlertTriangle, Star, MapPin, MessageSquare } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [currentDate] = useState(new Date());

  const stats = {
    upcomingAppointments: 8,
    pendingRequests: 5,
    urgentRequests: 2,
    newMessages: 3
  };

  const handleNavigate = (route: string) => {
    router.push(route);
  };

  // Formater la date au format JJ-MM-AAAA
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
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
          {stats.pendingRequests > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{stats.pendingRequests}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => handleNavigate('/(nautical-company)/messages')}
        >
          <MessageSquare size={24} color="#10B981" />
          <Text style={styles.statNumber}>{stats.newMessages}</Text>
          <Text style={styles.statLabel}>Nouveaux messages</Text>
          {stats.newMessages > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{stats.newMessages}</Text>
            </View>
          )}
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
            <Text style={styles.ratingText}>4.8</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  fill={star <= 4 ? '#FFC107' : 'none'}
                  color={star <= 4 ? '#FFC107' : '#D1D5DB'}
                />
              ))}
              <Text style={styles.reviewCount}>(42 avis)</Text>
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

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.appointmentsContainer}
        >
          {[...Array(3)].map((_, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.appointmentCard}
              onPress={() => handleNavigate(`/appointment/${index + 1}`)}
            >
              <View style={styles.appointmentHeader}>
                <Clock size={16} color="#666" />
                <Text style={styles.appointmentTime}>
                  {index === 0 ? '09:00' : index === 1 ? '14:00' : '10:00'}
                </Text>
              </View>
              <Text style={styles.appointmentTitle}>
                {index === 0 ? 'Maintenance moteur' : index === 1 ? 'Contrôle technique' : 'Installation GPS'}
              </Text>
              <Text style={styles.appointmentClient}>
                {index === 0 ? 'Jean Dupont' : index === 1 ? 'Sophie Martin' : 'Pierre Dubois'}
              </Text>
              <Text style={styles.appointmentBoat}>
                {index === 0 ? 'Le Grand Bleu • Voilier' : index === 1 ? 'Le Petit Prince • Yacht' : 'Le Navigateur • Voilier'}
              </Text>
              <View style={styles.appointmentLocation}>
                <MapPin size={14} color="#666" />
                <Text style={styles.locationText}>
                  {index === 0 ? 'Port de Marseille' : index === 1 ? 'Port de Nice' : 'Port de Saint-Tropez'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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

        {[...Array(3)].map((_, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.requestCard}
            onPress={() => handleNavigate(`/request/${index + 1}`)}
          >
            <View style={styles.requestInfo}>
              <Text style={styles.requestTitle}>
                {index === 0 ? 'Installation GPS' : index === 1 ? 'Réparation voile' : 'Nettoyage coque'}
              </Text>
              <Text style={styles.requestClient}>
                {index === 0 ? 'Sophie Martin • Le Petit Prince' : index === 1 ? 'Jean Dupont • Le Grand Bleu' : 'Pierre Dubois • Le Navigateur'}
              </Text>
            </View>
            <View style={styles.requestStatus}>
              <View style={[
                styles.statusDot, 
                { 
                  backgroundColor: index === 0 
                    ? '#F59E0B' 
                    : index === 1 
                    ? '#3B82F6' 
                    : '#10B981' 
                }
              ]} />
              <Text style={[
                styles.statusText, 
                { 
                  color: index === 0 
                    ? '#F59E0B' 
                    : index === 1 
                    ? '#3B82F6' 
                    : '#10B981' 
                }
              ]}>
                {index === 0 ? 'En attente' : index === 1 ? 'En cours' : 'Terminée'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
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
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  requestClient: {
    fontSize: 14,
    color: '#666',
  },
  requestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
  },
  statusText: {
    fontSize: 14,
    color: '#F59E0B',
  }
});