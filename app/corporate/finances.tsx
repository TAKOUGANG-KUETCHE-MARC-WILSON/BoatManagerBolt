import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Euro, FileText, ChevronRight, TriangleAlert as AlertTriangle, Calendar, Building, User, ChartBar as BarChart3, ChartPie as PieChart, Filter, ChevronDown, ArrowUpDown, Download, Check, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';
import * as FileSystem from 'expo-file-system'; // Import FileSystem
import * as Sharing from 'expo-sharing'; // Import Sharing

// Types pour les filtres de période
type PeriodFilter = 'month' | 'quarter' | 'year' | 'custom';

// Fonction utilitaire pour exporter le CSV
const exportCsv = async (csvContent: string, filename: string) => {
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
    Alert.alert('Erreur', 'Une erreur est survenue lors du téléchargement du rapport.');
  }
};

export default function FinancesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // --- DÉCLARATIONS DES ÉTATS : CES LIGNES DOIVENT ÊTRE ICI ---
  const [showPartnerDetails, setShowPartnerDetails] = useState(false);
  const [showServiceDetails, setShowServiceDetails] = useState(false);
  const [showYearMonthPickerModal, setShowYearMonthPickerModal] = useState(false);

  const currentYear = new Date().getFullYear();
  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]); // Empty means all months for selected years

  const [financialData, setFinancialData] = useState({
    totalRevenue: 0,
    paidInvoices: 0,
    partnerRevenue: {
      nauticalCompany: 0,
      boatManager: 0
    },
    serviceRevenue: {
      entretien: 0, amelioration: 0, reparation: 0, controle: 0,
      acces: 0, securite: 0, representation: 0, achatVente: 0
    },
    partnerDetails: [] as { id: string; name: string; type: 'nautical_company' | 'boat_manager'; revenue: number; invoices: number }[]
  });
  // --- FIN DES DÉCLARATIONS DES ÉTATS ---

  // Vérifier si l'utilisateur a les permissions nécessaires
  const hasFinancePermission = user?.role === 'corporate' &&
                              user.permissions?.canAccessFinancials === true;

  // Calculer les dates de début et de fin en fonction des années et mois sélectionnés
  const calculateDateRange = useCallback((years: number[], months: number[]) => {
    let start: Date;
    let end: Date;

    const effectiveYears = years.length > 0 ? years : [new Date().getFullYear()];
    const effectiveMonths = months.length > 0 ? months : Array.from({ length: 12 }, (_, i) => i + 1);

    const minYear = Math.min(...effectiveYears);
    const maxYear = Math.max(...effectiveYears);
    const minMonth = Math.min(...effectiveMonths);
    const maxMonth = Math.max(...effectiveMonths);

    // Start date: first day of the earliest selected month in the earliest selected year
    start = new Date(minYear, minMonth - 1, 1);

    // End date: last day of the latest selected month in the latest selected year
    end = new Date(maxYear, maxMonth, 0); // Day 0 of next month is last day of current month

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, []);

  // Fonction pour récupérer les données financières depuis Supabase
  const fetchFinancialData = useCallback(async () => {
    if (!hasFinancePermission) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const { start, end } = calculateDateRange(selectedYears, selectedMonths);

      // 1. Fetch all relevant service requests within the date range
      const { data: serviceRequests, error: srError } = await supabase
        .from('service_request')
        .select(`
          id,
          prix,
          statut,
          id_boat_manager,
          id_companie,
          categorie_service(description1)
        `)
        .gte('date', start)
        .lte('date', end);

      if (srError) throw srError;

      let currentTotalRevenue = 0;
      let currentPaidInvoices = 0;
      const currentPartnerRevenue = { nauticalCompany: 0, boatManager: 0 };
      const currentServiceRevenue = {
        entretien: 0, amelioration: 0, reparation: 0, controle: 0,
        acces: 0, securite: 0, representation: 0, achatVente: 0
      };
      const partnerAggregates = new Map<string, { id: string; type: 'nautical_company' | 'boat_manager'; revenue: number; invoices: number }>();

      // Process paid requests
      const paidRequests = serviceRequests.filter(req => req.statut === 'paid');

      for (const req of paidRequests) {
        const price = req.prix || 0;
        currentTotalRevenue += price;
        currentPaidInvoices++;

        // Aggregate by partner type
        if (req.id_boat_manager) {
          currentPartnerRevenue.boatManager += price;
          const partnerKey = `bm-${req.id_boat_manager}`;
          const existing = partnerAggregates.get(partnerKey) || { id: req.id_boat_manager, type: 'boat_manager', revenue: 0, invoices: 0 };
          existing.revenue += price;
          existing.invoices++;
          partnerAggregates.set(partnerKey, existing);
        } else if (req.id_companie) {
          currentPartnerRevenue.nauticalCompany += price;
          const partnerKey = `nc-${req.id_companie}`;
          const existing = partnerAggregates.get(partnerKey) || { id: req.id_companie, type: 'nautical_company', revenue: 0, invoices: 0 };
          existing.revenue += price;
          existing.invoices++;
          partnerAggregates.set(partnerKey, existing);
        }

        // Aggregate by service type
        const serviceType = req.categorie_service?.description1;
        if (serviceType) {
          // Map service type from DB to internal key
          const mappedKey = serviceType.toLowerCase().replace(/[^a-z0-9]/g, ''); // Simple mapping
          if (currentServiceRevenue.hasOwnProperty(mappedKey)) {
            currentServiceRevenue[mappedKey] += price;
          } else {
            // Handle cases where service type might not be directly mapped
            // For example, if 'Administratif' is 'representation'
            if (serviceType === 'Administratif') {
              currentServiceRevenue.representation += price;
            } else if (serviceType === 'Achat/Vente') {
              currentServiceRevenue.achatVente += price;
            }
          }
        }
      }

      // Fetch partner names for partnerDetails
      const partnerDetailsPromises = Array.from(partnerAggregates.values()).map(async (agg) => {
        const { data: partnerUser, error: partnerUserError } = await supabase
          .from('users')
          .select('first_name, last_name, company_name')
          .eq('id', agg.id)
          .single();

        if (partnerUserError) {
          console.error('Error fetching partner user:', partnerUserError);
          return { ...agg, name: 'Inconnu' };
        }
        const name = agg.type === 'boat_manager'
          ? `${partnerUser.first_name} ${partnerUser.last_name}`
          : partnerUser.company_name;
        return { ...agg, name: name || 'Inconnu' };
      });

      const currentPartnerDetails = await Promise.all(partnerDetailsPromises);

      setFinancialData({
        totalRevenue: currentTotalRevenue,
        paidInvoices: currentPaidInvoices,
        partnerRevenue: currentPartnerRevenue,
        serviceRevenue: currentServiceRevenue,
        partnerDetails: currentPartnerDetails,
      });

    } catch (e: any) {
      console.error('Dashboard data fetch error:', e);
      setFetchError('Une erreur inattendue est survenue lors du chargement des données financières.');
    } finally {
      setLoading(false);
    }
  }, [hasFinancePermission, selectedYears, selectedMonths, calculateDateRange]);

  useEffect(() => {
    if (!hasFinancePermission) {
      router.replace('/corporate/dashboard');
      return;
    }
    fetchFinancialData();
  }, [hasFinancePermission, fetchFinancialData]);

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
    if (selectedYears.length === 0) {
      return "Sélectionnez une période";
    }

    const yearsText = selectedYears.length === 1 ?
      selectedYears[0].toString() :
      `${Math.min(...selectedYears)} - ${Math.max(...selectedYears)}`;

    if (selectedMonths.length === 0) {
      return `Année(s) : ${yearsText} (Tous les mois)`;
    } else if (selectedMonths.length === 12) {
      return `Année(s) : ${yearsText} (Tous les mois)`;
    } else {
      const monthNames = [
        "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
        "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
      ];
      const sortedMonths = [...selectedMonths].sort((a, b) => a - b);
      const monthsText = sortedMonths.map(m => monthNames[m - 1]).join(', ');
      return `Année(s) : ${yearsText} - Mois : ${monthsText}`;
    }
  };

  // --- DÉBUT DES DÉFINITIONS DES MODALES : ELLES DOIVENT ÊTRE ICI ---

  // Modal pour sélectionner une période (années et mois)
  const YearMonthSelectionModal = () => {
    const [tempSelectedYears, setTempSelectedYears] = useState<number[]>(selectedYears);
    const [tempSelectedMonths, setTempSelectedMonths] = useState<number[]>(selectedMonths);

    const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i); // Current year and previous 4 years
    const monthNamesFull = [
      "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
      "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
    ];

    const toggleYear = (year: number) => {
      setTempSelectedYears(prev =>
        prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort((a, b) => a - b)
      );
    };

    const toggleMonth = (month: number) => {
      setTempSelectedMonths(prev =>
        prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month].sort((a, b) => a - b)
      );
    };

    const selectAllMonths = () => {
      setTempSelectedMonths(Array.from({ length: 12 }, (_, i) => i + 1));
    };

    const clearAllMonths = () => {
      setTempSelectedMonths([]);
    };

    const handleApply = () => {
      setSelectedYears(tempSelectedYears);
      setSelectedMonths(tempSelectedMonths);
      setShowYearMonthPickerModal(false);
    };

    return (
      <Modal
        visible={showYearMonthPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowYearMonthPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une période</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowYearMonthPickerModal(false)}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Année(s)</Text>
                <View style={styles.selectionGrid}>
                  {availableYears.map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.selectionItem,
                        tempSelectedYears.includes(year) && styles.selectionItemSelected
                      ]}
                      onPress={() => toggleYear(year)}
                    >
                      <Text style={[
                        styles.selectionItemText,
                        tempSelectedYears.includes(year) && styles.selectionItemTextSelected
                      ]}>
                        {year}
                      </Text>
                      {tempSelectedYears.includes(year) && <Check size={16} color="white" />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Mois</Text>
                <View style={styles.monthActions}>
                  <TouchableOpacity style={styles.monthActionButton} onPress={selectAllMonths}>
                    <Text style={styles.monthActionButtonText}>Sélectionner tout</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.monthActionButton} onPress={clearAllMonths}>
                    <Text style={styles.monthActionButtonText}>Effacer tout</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.selectionGrid}>
                  {monthNamesFull.map((monthName, index) => {
                    const monthNumber = index + 1;
                    return (
                      <TouchableOpacity
                        key={monthNumber}
                        style={[
                          styles.selectionItem,
                          tempSelectedMonths.includes(monthNumber) && styles.selectionItemSelected
                        ]}
                        onPress={() => toggleMonth(monthNumber)}
                      >
                        <Text style={[
                          styles.selectionItemText,
                          tempSelectedMonths.includes(monthNumber) && styles.selectionItemTextSelected
                        ]}>
                          {monthName.substring(0, 3)}
                        </Text>
                        {tempSelectedMonths.includes(monthNumber) && <Check size={16} color="white" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApply}
              >
                <Text style={styles.applyButtonText}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

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
              {financialData.partnerDetails.length > 0 ? (
                financialData.partnerDetails.map((partner) => (
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
                ))
              ) : (
                <Text style={styles.emptyModalText}>Aucun partenaire trouvé pour cette période.</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => {
                const csvContent = [
                  ['Partenaire', 'Type', 'Factures', 'Revenu'],
                  ...financialData.partnerDetails.map(partner => [
                    partner.name,
                    partner.type === 'nautical_company' ? 'Entreprise du nautisme' : 'Boat Manager',
                    partner.invoices.toString(),
                    partner.revenue.toString()
                  ])
                ].map(row => row.join(',')).join('\n');

                exportCsv(csvContent, 'rapport_partenaires.csv');
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
              {Object.entries(financialData.serviceRevenue).length > 0 ? (
                Object.entries(financialData.serviceRevenue).map(([key, value]) => (
                  <View key={key} style={styles.serviceDetailItem}>
                    <View style={styles.serviceDetailInfo}>
                      <Text style={styles.serviceDetailName}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                      <View style={styles.serviceDetailPercentage}>
                        <View style={styles.serviceDetailProgressContainer}>
                          <View
                            style={[
                              styles.serviceDetailProgress,
                              {
                                width: `${calculatePercentage(value, financialData.totalRevenue)}%`,
                                backgroundColor: '#0066CC'
                              }
                            ]}
                          />
                        </View>
                        <Text style={styles.serviceDetailPercentageText}>
                          {calculatePercentage(value, financialData.totalRevenue)}%
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.serviceDetailRevenue}>
                      {formatAmount(value)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyModalText}>Aucun service trouvé pour cette période.</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => {
                const csvContent = [
                  ['Service', 'Revenu', 'Pourcentage'],
                  ...Object.entries(financialData.serviceRevenue).map(([key, value]) => [
                    key.charAt(0).toUpperCase() + key.slice(1),
                    value.toString(),
                    `${calculatePercentage(value, financialData.totalRevenue)}%`
                  ]),
                  ['Total', financialData.totalRevenue.toString(), '100%']
                ].map(row => row.join(',')).join('\n');

                exportCsv(csvContent, 'rapport_services.csv');
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

  // --- FIN DES DÉFINITIONS DES MODALES ---

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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des données financières...</Text>
      </View>
    );
  }

  if (fetchError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{fetchError}</Text>
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
          </View>
          {/* Le bouton de sélection de période est maintenant ici, en dessous du titre */}
          <View style={styles.periodSelector}>
            <Text style={styles.periodText}>{getCurrentPeriodText()}</Text>
            <TouchableOpacity
              style={styles.periodDropdown}
              onPress={() => setShowYearMonthPickerModal(true)}
            >
              <ChevronDown size={20} color="#0066CC" />
            </TouchableOpacity>
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

          {Object.entries(financialData.serviceRevenue).map(([key, value]) => (
            <View key={key} style={styles.serviceRevenueCard}>
              <View style={styles.serviceRevenueHeader}>
                <Text style={styles.serviceTypeText}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                <Text style={styles.serviceRevenueAmount}>{formatAmount(value)}</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[
                  styles.progressBar,
                  {
                    width: `${calculatePercentage(value, financialData.totalRevenue)}%`,
                    backgroundColor: '#0066CC'
                  }
                ]} />
              </View>
              <Text style={styles.serviceRevenuePercentage}>
                {calculatePercentage(value, financialData.totalRevenue)}% du revenu total
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* --- APPEL DES MODALES : CES LIGNES DOIVENT ÊTRE ICI --- */}
      <YearMonthSelectionModal />
      <PartnerDetailsModal />
      <ServiceDetailsModal />
      {/* --- FIN DE L'APPEL DES MODALES --- */}
    </View>
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
    flex: 1,
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
    // Styles pour le positionner sous le titre
    alignSelf: 'flex-start', // Pour qu'il ne prenne pas toute la largeur
    marginTop: 8, // Ajustement pour le rapprocher du titre
    marginBottom: 16, // Espace après le sélecteur
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
  emptyModalText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  selectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  selectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
  },
  selectionItemSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  selectionItemText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  selectionItemTextSelected: {
    color: 'white',
    fontWeight: '500',
  },
  monthActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    marginBottom: 16,
  },
  monthActionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  monthActionButtonText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
});
