import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Modal, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Euro, FileText, ChevronRight, TriangleAlert as AlertTriangle, Calendar, Building, User, Bot as Boat, ChartBar as BarChart3, ChartPie as PieChart, Filter, ChevronDown, ArrowUpDown, Download } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import DateTimePickerModal from 'react-native-modal-datetime-picker'; // Import DateTimePickerModal

// Types pour les filtres de période
type PeriodFilter = 'month' | 'quarter' | 'year' | 'custom';

export default function FinancesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showPartnerDetails, setShowPartnerDetails] = useState(false);
  const [showServiceDetails, setShowServiceDetails] = useState(false);

  const [isStartPickerVisible, setStartPickerVisible] = useState(false); // New state for start date picker visibility
  const [isEndPickerVisible, setEndPickerVisible] = useState(false); // New state for end date picker visibility

  // Données financières
  const [financialData, setFinancialData] = useState({
    totalRevenue: 45600,
    paidInvoices: 13,
    partnerRevenue: {
      nauticalCompany: 28500,
      boatManager: 17100
    },
    serviceRevenue: {
      entretien: 12000,
      amelioration: 8000,
      reparation: 7000,
      controle: 6000,
      acces: 4000,
      securite: 3600,
      representation: 3000,
      achatVente: 2000
    },
    partnerDetails: [
      { id: 'p1', name: 'Nautisme Pro', type: 'nautical_company', revenue: 15200, invoices: 7 },
      { id: 'p2', name: 'Marine Services', type: 'nautical_company', revenue: 13300, invoices: 5 },
      { id: 'p3', name: 'Marie Martin', type: 'boat_manager', revenue: 9800, invoices: 4 },
      { id: 'p4', name: 'Pierre Dubois', type: 'boat_manager', revenue: 7300, invoices: 2 }
    ]
  });

  // Vérifier si l'utilisateur a les permissions nécessaires
  const hasFinancePermission = user?.role === 'corporate' && 
                              user.permissions?.canAccessFinancials === true;

  useEffect(() => {
    if (!hasFinancePermission) {
      // Rediriger si l'utilisateur n'a pas les permissions nécessaires
      router.replace('/(corporate)/dashboard');
    }
  }, [hasFinancePermission]);

  // Fonction pour appliquer les filtres et mettre à jour les données
  const applyFilters = () => {
    setLoading(true);
    
    // Simuler un appel API avec un délai
    setTimeout(() => {
      // Dans une vraie application, vous feriez un appel API ici
      // Pour cette démo, nous allons simplement modifier les données aléatoirement
      
      let multiplier = 1;
      
      // Ajuster le multiplicateur en fonction de la période
      switch(periodFilter) {
        case 'month':
          multiplier = 1;
          break;
        case 'quarter':
          multiplier = 3;
          break;
        case 'year':
          multiplier = 12;
          break;
        case 'custom':
          // Calculer le nombre de jours entre les dates
          if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            multiplier = diffDays / 30; // Approximation en mois
          }
          break;
      }
      
      // Calculer les nouvelles valeurs
      const nauticalCompanyRevenue = 28500 * multiplier;
      const boatManagerRevenue = 17100 * multiplier;
      const totalRevenue = nauticalCompanyRevenue + boatManagerRevenue;
      
      // Mettre à jour les données
      setFinancialData({
        totalRevenue: Math.round(totalRevenue),
        paidInvoices: Math.round(13 * multiplier),
        partnerRevenue: {
          nauticalCompany: Math.round(nauticalCompanyRevenue),
          boatManager: Math.round(boatManagerRevenue)
        },
        serviceRevenue: {
          entretien: Math.round(12000 * multiplier),
          amelioration: Math.round(8000 * multiplier),
          reparation: Math.round(7000 * multiplier),
          controle: Math.round(6000 * multiplier),
          acces: Math.round(4000 * multiplier),
          securite: Math.round(3600 * multiplier),
          representation: Math.round(3000 * multiplier),
          achatVente: Math.round(2000 * multiplier)
        },
        partnerDetails: [
          { id: 'p1', name: 'Nautisme Pro', type: 'nautical_company', revenue: Math.round(15200 * multiplier), invoices: Math.round(7 * multiplier) },
          { id: 'p2', name: 'Marine Services', type: 'nautical_company', revenue: Math.round(13300 * multiplier), invoices: Math.round(5 * multiplier) },
          { id: 'p3', name: 'Marie Martin', type: 'boat_manager', revenue: Math.round(9800 * multiplier), invoices: Math.round(4 * multiplier) },
          { id: 'p4', name: 'Pierre Dubois', type: 'boat_manager', revenue: Math.round(7300 * multiplier), invoices: Math.round(2 * multiplier) }
        ]
      });
      
      setLoading(false);
    }, 500);
  };

  // Appliquer les filtres au chargement initial
  useEffect(() => {
    applyFilters();
  }, [periodFilter]);

  // Formater les montants en euros
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Calculer les pourcentages pour les graphiques
  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  // Obtenir la période actuelle en texte
  const getCurrentPeriodText = () => {
    const now = new Date();
    
    switch(periodFilter) {
      case 'month':
        return now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3) + 1;
        return `T${quarter} ${now.getFullYear()}`;
      case 'year':
        return now.getFullYear().toString();
      case 'custom':
        if (startDate && endDate) {
          return `${new Date(startDate).toLocaleDateString('fr-FR')} - ${new Date(endDate).toLocaleDateString('fr-FR')}`;
        }
        return 'Période personnalisée';
      default:
        return '';
    }
  };

  // Modal pour sélectionner une période personnalisée
  const DateRangePickerModal = () => (
    <Modal
      visible={showDateRangePicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDateRangePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sélectionner une période</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDateRangePicker(false)}
            >
              <ArrowLeft size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date de début</Text>
              <View style={styles.inputContainer}>
                <Calendar size={20} color="#666" />
                <TouchableOpacity // Replaced TextInput with TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setStartPickerVisible(true)}
                >
                  <Text style={styles.datePickerText}>
                    {startDate || 'AAAA-MM-JJ'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date de fin</Text>
              <View style={styles.inputContainer}>
                <Calendar size={20} color="#666" />
                <TouchableOpacity // Replaced TextInput with TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setEndPickerVisible(true)}
                >
                  <Text style={styles.datePickerText}>
                    {endDate || 'AAAA-MM-JJ'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.applyButton}
              onPress={() => {
                setPeriodFilter('custom');
                setShowDateRangePicker(false);
                applyFilters();
              }}
            >
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Modal pour afficher les détails des revenus par partenaire
  const PartnerDetailsModal = () => (
    <Modal
      visible={showPartnerDetails}
      transparent
      animationType="slide"
      onRequestClose={() => setShowPartnerDetails(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Revenus par partenaire</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowPartnerDetails(false)}
            >
              <ArrowLeft size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.partnerDetailsList}>
              {financialData.partnerDetails.map((partner) => (
                <View key={partner.id} style={styles.partnerDetailItem}>
                  <View style={styles.partnerDetailInfo}>
                    <View style={styles.partnerDetailHeader}>
                      {partner.type === 'nautical_company' ? (
                        <Building size={20} color="#8B5CF6" />
                      ) : (
                        <User size={20} color="#10B981" />
                      )}
                      <Text style={styles.partnerDetailName}>{partner.name}</Text>
                    </View>
                    <Text style={styles.partnerDetailType}>
                      {partner.type === 'nautical_company' ? 'Entreprise du nautisme' : 'Boat Manager'}
                    </Text>
                    <Text style={styles.partnerDetailInvoices}>
                      {partner.invoices} facture{partner.invoices > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={styles.partnerDetailRevenue}>
                    {formatAmount(partner.revenue)}
                  </Text>
                </View>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={() => {
                // Générer un rapport CSV
                const csvContent = [
                  ['Partenaire', 'Type', 'Factures', 'Revenu'],
                  ...financialData.partnerDetails.map(partner => [
                    partner.name,
                    partner.type === 'nautical_company' ? 'Entreprise du nautisme' : 'Boat Manager',
                    partner.invoices.toString(),
                    partner.revenue.toString()
                  ])
                ].map(row => row.join(',')).join('\n');
                
                // En production, cela déclencherait un téléchargement
                console.log('Téléchargement du rapport CSV:', csvContent);
                
                if (Platform.OS === 'web') {
                  alert('Le rapport a été téléchargé au format CSV.');
                } else {
                  Alert.alert('Succès', 'Le rapport a été téléchargé au format CSV.');
                }
              }}
            >
              <Download size={20} color="#0066CC" />
              <Text style={styles.downloadButtonText}>Télécharger le rapport (CSV)</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Modal pour afficher les détails des revenus par service
  const ServiceDetailsModal = () => (
    <Modal
      visible={showServiceDetails}
      transparent
      animationType="slide"
      onRequestClose={() => setShowServiceDetails(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Revenus par type de service</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowServiceDetails(false)}
            >
              <ArrowLeft size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.serviceDetailsList}>
              <View style={styles.serviceDetailItem}>
                <View style={styles.serviceDetailInfo}>
                  <Text style={styles.serviceDetailName}>Entretien</Text>
                  <View style={styles.serviceDetailPercentage}>
                    <View style={styles.serviceDetailProgressContainer}>
                      <View 
                        style={[
                          styles.serviceDetailProgress, 
                          { 
                            width: `${calculatePercentage(financialData.serviceRevenue.entretien, financialData.totalRevenue)}%`,
                            backgroundColor: '#0066CC'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.serviceDetailPercentageText}>
                      {calculatePercentage(financialData.serviceRevenue.entretien, financialData.totalRevenue)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.serviceDetailRevenue}>
                  {formatAmount(financialData.serviceRevenue.entretien)}
                </Text>
              </View>
              
              <View style={styles.serviceDetailItem}>
                <View style={styles.serviceDetailInfo}>
                  <Text style={styles.serviceDetailName}>Amélioration</Text>
                  <View style={styles.serviceDetailPercentage}>
                    <View style={styles.serviceDetailProgressContainer}>
                      <View 
                        style={[
                          styles.serviceDetailProgress, 
                          { 
                            width: `${calculatePercentage(financialData.serviceRevenue.amelioration, financialData.totalRevenue)}%`,
                            backgroundColor: '#0066CC'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.serviceDetailPercentageText}>
                      {calculatePercentage(financialData.serviceRevenue.amelioration, financialData.totalRevenue)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.serviceDetailRevenue}>
                  {formatAmount(financialData.serviceRevenue.amelioration)}
                </Text>
              </View>
              
              <View style={styles.serviceDetailItem}>
                <View style={styles.serviceDetailInfo}>
                  <Text style={styles.serviceDetailName}>Réparation</Text>
                  <View style={styles.serviceDetailPercentage}>
                    <View style={styles.serviceDetailProgressContainer}>
                      <View 
                        style={[
                          styles.serviceDetailProgress, 
                          { 
                            width: `${calculatePercentage(financialData.serviceRevenue.reparation, financialData.totalRevenue)}%`,
                            backgroundColor: '#0066CC'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.serviceDetailPercentageText}>
                      {calculatePercentage(financialData.serviceRevenue.reparation, financialData.totalRevenue)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.serviceDetailRevenue}>
                  {formatAmount(financialData.serviceRevenue.reparation)}
                </Text>
              </View>
              
              <View style={styles.serviceDetailItem}>
                <View style={styles.serviceDetailInfo}>
                  <Text style={styles.serviceDetailName}>Contrôle</Text>
                  <View style={styles.serviceDetailPercentage}>
                    <View style={styles.serviceDetailProgressContainer}>
                      <View 
                        style={[
                          styles.serviceDetailProgress, 
                          { 
                            width: `${calculatePercentage(financialData.serviceRevenue.controle, financialData.totalRevenue)}%`,
                            backgroundColor: '#0066CC'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.serviceDetailPercentageText}>
                      {calculatePercentage(financialData.serviceRevenue.controle, financialData.totalRevenue)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.serviceDetailRevenue}>
                  {formatAmount(financialData.serviceRevenue.controle)}
                </Text>
              </View>
              
              <View style={styles.serviceDetailItem}>
                <View style={styles.serviceDetailInfo}>
                  <Text style={styles.serviceDetailName}>Gestion des accès</Text>
                  <View style={styles.serviceDetailPercentage}>
                    <View style={styles.serviceDetailProgressContainer}>
                      <View 
                        style={[
                          styles.serviceDetailProgress, 
                          { 
                            width: `${calculatePercentage(financialData.serviceRevenue.acces, financialData.totalRevenue)}%`,
                            backgroundColor: '#0066CC'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.serviceDetailPercentageText}>
                      {calculatePercentage(financialData.serviceRevenue.acces, financialData.totalRevenue)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.serviceDetailRevenue}>
                  {formatAmount(financialData.serviceRevenue.acces)}
                </Text>
              </View>
              
              <View style={styles.serviceDetailItem}>
                <View style={styles.serviceDetailInfo}>
                  <Text style={styles.serviceDetailName}>Sécurité</Text>
                  <View style={styles.serviceDetailPercentage}>
                    <View style={styles.serviceDetailProgressContainer}>
                      <View 
                        style={[
                          styles.serviceDetailProgress, 
                          { 
                            width: `${calculatePercentage(financialData.serviceRevenue.securite, financialData.totalRevenue)}%`,
                            backgroundColor: '#0066CC'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.serviceDetailPercentageText}>
                      {calculatePercentage(financialData.serviceRevenue.securite, financialData.totalRevenue)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.serviceDetailRevenue}>
                  {formatAmount(financialData.serviceRevenue.securite)}
                </Text>
              </View>
              
              <View style={styles.serviceDetailItem}>
                <View style={styles.serviceDetailInfo}>
                  <Text style={styles.serviceDetailName}>Représentation</Text>
                  <View style={styles.serviceDetailPercentage}>
                    <View style={styles.serviceDetailProgressContainer}>
                      <View 
                        style={[
                          styles.serviceDetailProgress, 
                          { 
                            width: `${calculatePercentage(financialData.serviceRevenue.representation, financialData.totalRevenue)}%`,
                            backgroundColor: '#0066CC'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.serviceDetailPercentageText}>
                      {calculatePercentage(financialData.serviceRevenue.representation, financialData.totalRevenue)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.serviceDetailRevenue}>
                  {formatAmount(financialData.serviceRevenue.representation)}
                </Text>
              </View>
              
              <View style={styles.serviceDetailItem}>
                <View style={styles.serviceDetailInfo}>
                  <Text style={styles.serviceDetailName}>Achat/Vente</Text>
                  <View style={styles.serviceDetailPercentage}>
                    <View style={styles.serviceDetailProgressContainer}>
                      <View 
                        style={[
                          styles.serviceDetailProgress, 
                          { 
                            width: `${calculatePercentage(financialData.serviceRevenue.achatVente, financialData.totalRevenue)}%`,
                            backgroundColor: '#0066CC'
                          }
                        ]} 
                      />
                    </View>
                    <Text style={styles.serviceDetailPercentageText}>
                      {calculatePercentage(financialData.serviceRevenue.achatVente, financialData.totalRevenue)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.serviceDetailRevenue}>
                  {formatAmount(financialData.serviceRevenue.achatVente)}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={() => {
                // Générer un rapport CSV
                const csvContent = [
                  ['Service', 'Revenu', 'Pourcentage'],
                  ['Entretien', financialData.serviceRevenue.entretien.toString(), `${calculatePercentage(financialData.serviceRevenue.entretien, financialData.totalRevenue)}%`],
                  ['Amélioration', financialData.serviceRevenue.amelioration.toString(), `${calculatePercentage(financialData.serviceRevenue.amelioration, financialData.totalRevenue)}%`],
                  ['Réparation', financialData.serviceRevenue.reparation.toString(), `${calculatePercentage(financialData.serviceRevenue.reparation, financialData.totalRevenue)}%`],
                  ['Contrôle', financialData.serviceRevenue.controle.toString(), `${calculatePercentage(financialData.serviceRevenue.controle, financialData.totalRevenue)}%`],
                  ['Gestion des accès', financialData.serviceRevenue.acces.toString(), `${calculatePercentage(financialData.serviceRevenue.acces, financialData.totalRevenue)}%`],
                  ['Sécurité', financialData.serviceRevenue.securite.toString(), `${calculatePercentage(financialData.serviceRevenue.securite, financialData.totalRevenue)}%`],
                  ['Représentation', financialData.serviceRevenue.representation.toString(), `${calculatePercentage(financialData.serviceRevenue.representation, financialData.totalRevenue)}%`],
                  ['Achat/Vente', financialData.serviceRevenue.achatVente.toString(), `${calculatePercentage(financialData.serviceRevenue.achatVente, financialData.totalRevenue)}%`],
                  ['Total', financialData.totalRevenue.toString(), '100%']
                ].map(row => row.join(',')).join('\n');
                
                // En production, cela déclencherait un téléchargement
                console.log('Téléchargement du rapport CSV:', csvContent);
                
                if (Platform.OS === 'web') {
                  alert('Le rapport a été téléchargé au format CSV.');
                } else {
                  Alert.alert('Succès', 'Le rapport a été téléchargé au format CSV.');
                }
              }}
            >
              <Download size={20} color="#0066CC" />
              <Text style={styles.downloadButtonText}>Télécharger le rapport (CSV)</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (!hasFinancePermission) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Gestion financière</Text>
        </View>
        <View style={styles.accessDeniedContainer}>
          <AlertTriangle size={48} color="#EF4444" />
          <Text style={styles.accessDeniedTitle}>Accès restreint</Text>
          <Text style={styles.accessDeniedText}>
            Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Gestion financière</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Aperçu financier</Text>
            <View style={styles.periodSelector}>
              <Text style={styles.periodText}>{getCurrentPeriodText()}</Text>
              <TouchableOpacity 
                style={styles.periodDropdown}
                onPress={() => setShowDateRangePicker(true)}
              >
                <ChevronDown size={20} color="#0066CC" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Euro size={24} color="#10B981" />
              <Text style={styles.statNumber}>{formatAmount(financialData.totalRevenue)}</Text>
              <Text style={styles.statLabel}>Revenu total</Text>
            </View>
            
            <View style={styles.statCard}>
              <FileText size={24} color="#10B981" />
              <Text style={styles.statNumber}>{financialData.paidInvoices}</Text>
              <Text style={styles.statLabel}>Factures payées</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <BarChart3 size={24} color="#0066CC" />
              <Text style={styles.sectionTitle}>Revenus par type de partenaire</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => setShowPartnerDetails(true)}
            >
              <Text style={styles.viewDetailsText}>Détails</Text>
              <ChevronRight size={20} color="#0066CC" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.partnerRevenueCard}>
            <View style={styles.partnerRevenueHeader}>
              <View style={styles.partnerTypeContainer}>
                <Building size={20} color="#8B5CF6" />
                <Text style={styles.partnerTypeText}>Entreprises du nautisme</Text>
              </View>
              <Text style={styles.partnerRevenueAmount}>{formatAmount(financialData.partnerRevenue.nauticalCompany)}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${calculatePercentage(financialData.partnerRevenue.nauticalCompany, financialData.totalRevenue)}%`, 
                  backgroundColor: '#8B5CF6' 
                }
              ]} />
            </View>
            <Text style={styles.partnerRevenuePercentage}>
              {calculatePercentage(financialData.partnerRevenue.nauticalCompany, financialData.totalRevenue)}% du revenu total
            </Text>
          </View>
          
          <View style={styles.partnerRevenueCard}>
            <View style={styles.partnerRevenueHeader}>
              <View style={styles.partnerTypeContainer}>
                <User size={20} color="#10B981" />
                <Text style={styles.partnerTypeText}>Boat Managers</Text>
              </View>
              <Text style={styles.partnerRevenueAmount}>{formatAmount(financialData.partnerRevenue.boatManager)}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${calculatePercentage(financialData.partnerRevenue.boatManager, financialData.totalRevenue)}%`, 
                  backgroundColor: '#10B981' 
                }
              ]} />
            </View>
            <Text style={styles.partnerRevenuePercentage}>
              {calculatePercentage(financialData.partnerRevenue.boatManager, financialData.totalRevenue)}% du revenu total
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <PieChart size={24} color="#0066CC" />
              <Text style={styles.sectionTitle}>Revenus par type de service</Text>
            </View>
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => setShowServiceDetails(true)}
            >
              <Text style={styles.viewDetailsText}>Détails</Text>
              <ChevronRight size={20} color="#0066CC" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.serviceRevenueCard}>
            <View style={styles.serviceRevenueHeader}>
              <Text style={styles.serviceTypeText}>Entretien</Text>
              <Text style={styles.serviceRevenueAmount}>{formatAmount(financialData.serviceRevenue.entretien)}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${calculatePercentage(financialData.serviceRevenue.entretien, financialData.totalRevenue)}%`, 
                  backgroundColor: '#0066CC' 
                }
              ]} />
            </View>
            <Text style={styles.serviceRevenuePercentage}>
              {calculatePercentage(financialData.serviceRevenue.entretien, financialData.totalRevenue)}% du revenu total
            </Text>
          </View>
          
          <View style={styles.serviceRevenueCard}>
            <View style={styles.serviceRevenueHeader}>
              <Text style={styles.serviceTypeText}>Amélioration</Text>
              <Text style={styles.serviceRevenueAmount}>{formatAmount(financialData.serviceRevenue.amelioration)}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${calculatePercentage(financialData.serviceRevenue.amelioration, financialData.totalRevenue)}%`,
                  backgroundColor: '#0066CC'
                }
              ]} />
            </View>
            <Text style={styles.serviceRevenuePercentage}>
              {calculatePercentage(financialData.serviceRevenue.amelioration, financialData.totalRevenue)}% du revenu total
            </Text>
          </View>
          
          <View style={styles.serviceRevenueCard}>
            <View style={styles.serviceRevenueHeader}>
              <Text style={styles.serviceTypeText}>Réparation</Text>
              <Text style={styles.serviceRevenueAmount}>{formatAmount(financialData.serviceRevenue.reparation)}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${calculatePercentage(financialData.serviceRevenue.reparation, financialData.totalRevenue)}%`,
                  backgroundColor: '#0066CC'
                }
              ]} />
            </View>
            <Text style={styles.serviceRevenuePercentage}>
              {calculatePercentage(financialData.serviceRevenue.reparation, financialData.totalRevenue)}% du revenu total
            </Text>
          </View>
          
          <View style={styles.serviceRevenueCard}>
            <View style={styles.serviceRevenueHeader}>
              <Text style={styles.serviceTypeText}>Contrôle</Text>
              <Text style={styles.serviceRevenueAmount}>{formatAmount(financialData.serviceRevenue.controle)}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${calculatePercentage(financialData.serviceRevenue.controle, financialData.totalRevenue)}%`,
                  backgroundColor: '#0066CC'
                }
              ]} />
            </View>
            <Text style={styles.serviceRevenuePercentage}>
              {calculatePercentage(financialData.serviceRevenue.controle, financialData.totalRevenue)}% du revenu total
            </Text>
          </View>
          
          <View style={styles.serviceRevenueCard}>
            <View style={styles.serviceRevenueHeader}>
              <Text style={styles.serviceTypeText}>Gestion des accès</Text>
              <Text style={styles.serviceRevenueAmount}>{formatAmount(financialData.serviceRevenue.acces)}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${calculatePercentage(financialData.serviceRevenue.acces, financialData.totalRevenue)}%`,
                  backgroundColor: '#0066CC'
                }
              ]} />
            </View>
            <Text style={styles.serviceRevenuePercentage}>
              {calculatePercentage(financialData.serviceRevenue.acces, financialData.totalRevenue)}% du revenu total
            </Text>
          </View>
          
          <View style={styles.serviceRevenueCard}>
            <View style={styles.serviceRevenueHeader}>
              <Text style={styles.serviceTypeText}>Sécurité</Text>
              <Text style={styles.serviceRevenueAmount}>{formatAmount(financialData.serviceRevenue.securite)}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${calculatePercentage(financialData.serviceRevenue.securite, financialData.totalRevenue)}%`,
                  backgroundColor: '#0066CC'
                }
              ]} />
            </View>
            <Text style={styles.serviceRevenuePercentage}>
              {calculatePercentage(financialData.serviceRevenue.securite, financialData.totalRevenue)}% du revenu total
            </Text>
          </View>
          
          <View style={styles.serviceRevenueCard}>
            <View style={styles.serviceRevenueHeader}>
              <Text style={styles.serviceTypeText}>Représentation</Text>
              <Text style={styles.serviceRevenueAmount}>{formatAmount(financialData.serviceRevenue.representation)}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${calculatePercentage(financialData.serviceRevenue.representation, financialData.totalRevenue)}%`,
                  backgroundColor: '#0066CC'
                }
              ]} />
            </View>
            <Text style={styles.serviceRevenuePercentage}>
              {calculatePercentage(financialData.serviceRevenue.representation, financialData.totalRevenue)}% du revenu total
            </Text>
          </View>
          
          <View style={styles.serviceRevenueCard}>
            <View style={styles.serviceRevenueHeader}>
              <Text style={styles.serviceTypeText}>Achat/Vente</Text>
              <Text style={styles.serviceRevenueAmount}>{formatAmount(financialData.serviceRevenue.achatVente)}</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[
                styles.progressBar, 
                { 
                  width: `${calculatePercentage(financialData.serviceRevenue.achatVente, financialData.totalRevenue)}%`,
                  backgroundColor: '#0066CC'
                }
              ]} />
            </View>
            <Text style={styles.serviceRevenuePercentage}>
              {calculatePercentage(financialData.serviceRevenue.achatVente, financialData.totalRevenue)}% du revenu total
            </Text>
          </View>
        </View>
      </ScrollView>

      <DateRangePickerModal />
      <PartnerDetailsModal />
      <ServiceDetailsModal />

      <DateTimePickerModal
        isVisible={isStartPickerVisible}
        mode="date"
        onConfirm={(date) => {
          setStartDate(date.toISOString().split('T')[0]);
          setStartPickerVisible(false);
        }}
        onCancel={() => setStartPickerVisible(false)}
      />

      <DateTimePickerModal
        isVisible={isEndPickerVisible}
        mode="date"
        onConfirm={(date) => {
          setEndDate(date.toISOString().split('T')[0]);
          setEndPickerVisible(false);
        }}
        onCancel={() => setEndPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
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
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  periodDropdown: {
    padding: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#f0f7ff',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#0066CC',
    fontWeight: '500',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  partnerRevenueCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  partnerRevenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  partnerTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partnerTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  partnerRevenueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  partnerRevenuePercentage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  serviceRevenueCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  serviceRevenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  serviceRevenueAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  serviceRevenuePercentage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    maxWidth: 300,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalScrollView: {
    padding: 16,
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  applyButton: {
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  partnerDetailsList: {
    gap: 12,
    marginBottom: 16,
  },
  partnerDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  partnerDetailInfo: {
    flex: 1,
    gap: 4,
  },
  partnerDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partnerDetailName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  partnerDetailType: {
    fontSize: 14,
    color: '#666',
  },
  partnerDetailInvoices: {
    fontSize: 12,
    color: '#94a3b8',
  },
  partnerDetailRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  serviceDetailsList: {
    gap: 16,
    marginBottom: 16,
  },
  serviceDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  serviceDetailInfo: {
    flex: 1,
    gap: 8,
  },
  serviceDetailName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  serviceDetailPercentage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceDetailProgressContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  serviceDetailProgress: {
    height: '100%',
    borderRadius: 4,
  },
  serviceDetailPercentageText: {
    fontSize: 14,
    color: '#666',
    width: 40,
    textAlign: 'right',
  },
  serviceDetailRevenue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f0f7ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  downloadButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  datePickerButton: {
    flex: 1,
    marginLeft: 8,
    height: '100%',
    justifyContent: 'center',
  },
  datePickerText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
});
