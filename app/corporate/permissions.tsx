import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Alert, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Shield, Plus, X, Check, Users, Building, User, Filter, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

type UserType = 'corporate' | 'pleasure_boater' | 'boat_manager' | 'nautical_company';
type SortKey = 'name' | 'type';

interface Permission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  userType: UserType;
}

// Mock data for permissions
const mockPermissions: Permission[] = [
  // Corporate permissions
  { id: 'manage_corporate_users', name: 'Gestion des utilisateurs Corporate', description: 'Créer, modifier et supprimer des utilisateurs Corporate', enabled: true, userType: 'corporate' },
  { id: 'view_corporate_users', name: 'Consultation des utilisateurs Corporate', description: 'Voir les informations des utilisateurs Corporate', enabled: true, userType: 'corporate' },
  { id: 'manage_corporate_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions des utilisateurs Corporate', enabled: true, userType: 'corporate' },
  { id: 'manage_corporate_settings', name: 'Gestion des paramètres Corporate', description: 'Gérer les paramètres globaux de la plateforme', enabled: true, userType: 'corporate' },
  
  // Pleasure Boater permissions
  { id: 'manage_pleasure_boaters', name: 'Gestion des utilisateurs Plaisanciers', description: 'Créer, modifier et supprimer des comptes plaisanciers', enabled: true, userType: 'pleasure_boater' },
  { id: 'view_pleasure_boaters', name: 'Consultation des plaisanciers', description: 'Voir les informations des plaisanciers', enabled: true, userType: 'pleasure_boater' },
  { id: 'manage_pleasure_boater_boats', name: 'Gestion des bateaux', description: 'Gérer les bateaux des plaisanciers', enabled: true, userType: 'pleasure_boater' },
  { id: 'manage_pleasure_boater_requests', name: 'Gestion des demandes', description: 'Gérer les demandes des plaisanciers', enabled: true, userType: 'pleasure_boater' },
  
  // Boat Manager permissions
  { id: 'manage_boat_managers', name: 'Gestion des Boat Managers', description: 'Créer, modifier et supprimer des comptes Boat Manager', enabled: true, userType: 'boat_manager' },
  { id: 'view_boat_managers', name: 'Consultation des Boat Managers', description: 'Voir les informations des Boat Managers', enabled: true, userType: 'boat_manager' },
  { id: 'assign_boat_managers', name: 'Attribution des Boat Managers', description: 'Assigner des Boat Managers aux plaisanciers', enabled: true, userType: 'boat_manager' },
  { id: 'manage_boat_manager_skills', name: 'Gestion des compétences', description: 'Gérer les compétences des Boat Managers', enabled: true, userType: 'boat_manager' },
  { id: 'manage_boat_manager_areas', name: 'Gestion des zones géographiques', description: 'Gérer les zones d\'intervention des Boat Managers', enabled: true, userType: 'boat_manager' },
  
  // Nautical Company permissions
  { id: 'manage_nautical_companies', name: 'Gestion des Entreprises du nautisme', description: 'Créer, modifier et supprimer des comptes d\'entreprises', enabled: true, userType: 'nautical_company' },
  { id: 'view_nautical_companies', name: 'Consultation des Entreprises', description: 'Voir les informations des entreprises du nautisme', enabled: true, userType: 'nautical_company' },
  { id: 'manage_nautical_company_skills', name: 'Gestion des compétences', description: 'Gérer les compétences des entreprises du nautisme', enabled: true, userType: 'nautical_company' },
  { id: 'manage_nautical_company_areas', name: 'Gestion des zones géographiques', description: 'Gérer les zones d\'intervention des entreprises', enabled: true, userType: 'nautical_company' },
];

const getUserTypeLabel = (userType: UserType): string => {
  switch (userType) {
    case 'corporate':
      return 'Utilisateurs Corporate';
    case 'pleasure_boater':
      return 'Utilisateurs Plaisanciers';
    case 'boat_manager':
      return 'Utilisateurs Boat Managers';
    case 'nautical_company':
      return 'Utilisateurs Entreprises du nautisme';
    default:
      return userType;
  }
};

const getUserTypeColor = (userType: UserType): string => {
  switch (userType) {
    case 'corporate':
      return '#F59E0B';
    case 'pleasure_boater':
      return '#0EA5E9';
    case 'boat_manager':
      return '#10B981';
    case 'nautical_company':
      return '#8B5CF6';
    default:
      return '#666666';
  }
};

const getUserTypeIcon = (userType: UserType) => {
  switch (userType) {
    case 'corporate':
      return Shield;
    case 'pleasure_boater':
      return User;
    case 'boat_manager':
      return Users;
    case 'nautical_company':
      return Building;
    default:
      return Shield;
  }
};

export default function PermissionsManagementScreen() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>(mockPermissions);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>(mockPermissions);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<UserType | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showUserTypeFilter, setShowUserTypeFilter] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state for edit permission
  const [formData, setFormData] = useState<Partial<Permission>>({
    name: '',
    description: '',
    enabled: false,
    userType: 'corporate'
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Check if user is super-admin
  const isSuperAdmin = user?.role === 'corporate' && 
                      user.permissions?.canManageRoles === true;

  // Redirect if not super-admin
  useEffect(() => {
    if (!isSuperAdmin) {
      Alert.alert(
        'Accès restreint',
        'Vous n\'avez pas les permissions nécessaires pour accéder à cette page.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    }
  }, [isSuperAdmin]);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...permissions];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(permission => 
        permission.name.toLowerCase().includes(query) ||
        permission.description.toLowerCase().includes(query)
      );
    }
    
    // Apply user type filter
    if (selectedUserType) {
      result = result.filter(permission => permission.userType === selectedUserType);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortKey) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'type':
          valueA = a.userType;
          valueB = b.userType;
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }
      
      if (valueA < valueB) return sortAsc ? -1 : 1;
      if (valueA > valueB) return sortAsc ? 1 : -1;
      return 0;
    });
    
    setFilteredPermissions(result);
  }, [permissions, searchQuery, selectedUserType, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleEditPermission = (permission: Permission) => {
    setSelectedPermission(permission);
    setFormData({
      name: permission.name,
      description: permission.description,
      enabled: permission.enabled,
      userType: permission.userType
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const togglePermission = (permissionId: string) => {
    setPermissions(prev => 
      prev.map(p => 
        p.id === permissionId ? { ...p, enabled: !p.enabled } : p
      )
    );
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Le nom est requis';
    }
    
    if (!formData.description?.trim()) {
      errors.description = 'La description est requise';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitEdit = () => {
    if (!validateForm() || !selectedPermission) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setPermissions(prev => 
        prev.map(p => 
          p.id === selectedPermission.id
            ? {
                ...p,
                name: formData.name!,
                description: formData.description!,
                enabled: formData.enabled!,
                userType: formData.userType as UserType
              }
            : p
        )
      );
      
      setShowEditModal(false);
      setIsLoading(false);
      
      Alert.alert(
        'Succès',
        'La permission a été modifiée avec succès',
        [{ text: 'OK' }]
      );
    }, 1000);
  };

  // Group permissions by user type
  const permissionsByUserType = filteredPermissions.reduce((acc, permission) => {
    if (!acc[permission.userType]) {
      acc[permission.userType] = [];
    }
    acc[permission.userType].push(permission);
    return acc;
  }, {} as Record<UserType, Permission[]>);

  // Modal components
  const EditPermissionModal = () => (
    <Modal
      visible={showEditModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier la permission</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowEditModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nom de la permission</Text>
              <View style={[styles.formInput, formErrors.name && styles.formInputError]}>
                <Shield size={20} color={formErrors.name ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Nom de la permission"
                />
              </View>
              {formErrors.name && (
                <Text style={styles.errorText}>{formErrors.name}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <View style={[styles.formInput, formErrors.description && styles.formInputError]}>
                <TextInput
                  style={styles.textInput}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Description de la permission"
                  multiline
                  numberOfLines={3}
                />
              </View>
              {formErrors.description && (
                <Text style={styles.errorText}>{formErrors.description}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Type d'utilisateur</Text>
              <View style={styles.userTypeSelector}>
                {(['corporate', 'pleasure_boater', 'boat_manager', 'nautical_company'] as UserType[]).map((type) => {
                  const TypeIcon = getUserTypeIcon(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.userTypeOption,
                        formData.userType === type && { 
                          backgroundColor: `${getUserTypeColor(type)}15`,
                          borderColor: getUserTypeColor(type)
                        }
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, userType: type }))}
                    >
                      <TypeIcon size={16} color={getUserTypeColor(type)} />
                      <Text style={[
                        styles.userTypeOptionText,
                        formData.userType === type && { color: getUserTypeColor(type) }
                      ]}>
                        {getUserTypeLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Statut</Text>
              <View style={styles.statusContainer}>
                <Text style={styles.statusLabel}>
                  {formData.enabled ? 'Activée' : 'Désactivée'}
                </Text>
                <Switch
                  value={formData.enabled}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, enabled: value }))}
                  trackColor={{ false: '#e0e0e0', true: '#bfdbfe' }}
                  thumbColor={formData.enabled ? '#0066CC' : '#fff'}
                  ios_backgroundColor="#e0e0e0"
                />
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowEditModal(false)}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSubmitEdit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Check size={20} color="white" />
                  <Text style={styles.submitButtonText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // If not super-admin, don't render the content
  if (!isSuperAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Gestion des permissions</Text>
        </View>
        <View style={styles.accessDeniedContainer}>
          <Shield size={48} color="#EF4444" />
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
        <Text style={styles.title}>Gestion des permissions</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une permission..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <TouchableOpacity 
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? "#0066CC" : "#666"} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterGroup}>
            <TouchableOpacity 
              style={styles.filterHeader}
              onPress={() => setShowUserTypeFilter(!showUserTypeFilter)}
            >
              <Text style={styles.filterTitle}>Type d'utilisateur</Text>
              {showUserTypeFilter ? (
                <ChevronUp size={20} color="#666" />
              ) : (
                <ChevronDown size={20} color="#666" />
              )}
            </TouchableOpacity>
            
            {showUserTypeFilter && (
              <View style={styles.filterOptions}>
                <TouchableOpacity 
                  style={[
                    styles.filterOption,
                    selectedUserType === null && styles.filterOptionSelected
                  ]}
                  onPress={() => setSelectedUserType(null)}
                >
                  <Text style={styles.filterOptionText}>Tous</Text>
                </TouchableOpacity>
                
                {(['corporate', 'pleasure_boater', 'boat_manager', 'nautical_company'] as UserType[]).map((type) => {
                  const TypeIcon = getUserTypeIcon(type);
                  return (
                    <TouchableOpacity 
                      key={type}
                      style={[
                        styles.filterOption,
                        selectedUserType === type && styles.filterOptionSelected
                      ]}
                      onPress={() => setSelectedUserType(type)}
                    >
                      <TypeIcon size={16} color={getUserTypeColor(type)} />
                      <Text style={styles.filterOptionText}>{getUserTypeLabel(type)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      )}

      <View style={styles.sortContainer}>
        <TouchableOpacity 
          style={[styles.sortButton, sortKey === 'name' && styles.sortButtonActive]}
          onPress={() => handleSort('name')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'name' && styles.sortButtonTextActive]}>
            Nom {sortKey === 'name' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, sortKey === 'type' && styles.sortButtonActive]}
          onPress={() => handleSort('type')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'type' && styles.sortButtonTextActive]}>
            Type {sortKey === 'type' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.permissionsList}>
        {Object.keys(permissionsByUserType).length > 0 ? (
          Object.entries(permissionsByUserType).map(([userType, permissions]) => (
            <View key={userType} style={styles.userTypeSection}>
              <View style={[
                styles.userTypeSectionHeader,
                { backgroundColor: `${getUserTypeColor(userType as UserType)}15` }
              ]}>
                {getUserTypeIcon(userType as UserType)({ size: 20, color: getUserTypeColor(userType as UserType) })}
                <Text style={[
                  styles.userTypeSectionTitle,
                  { color: getUserTypeColor(userType as UserType) }
                ]}>
                  {getUserTypeLabel(userType as UserType)}
                </Text>
              </View>
              
              {permissions.map((permission) => (
                <TouchableOpacity 
                  key={permission.id} 
                  style={styles.permissionCard}
                  onPress={() => handleEditPermission(permission)}
                >
                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionName}>{permission.name}</Text>
                    <Text style={styles.permissionDescription}>{permission.description}</Text>
                  </View>
                  
                  <View style={styles.permissionActions}>
                    <Switch
                      value={permission.enabled}
                      onValueChange={() => togglePermission(permission.id)}
                      trackColor={{ false: '#e0e0e0', true: '#bfdbfe' }}
                      thumbColor={permission.enabled ? '#0066CC' : '#fff'}
                      ios_backgroundColor="#e0e0e0"
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Shield size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucune permission trouvée</Text>
            <Text style={styles.emptyStateText}>
              Aucune permission ne correspond à vos critères de recherche.
            </Text>
          </View>
        )}
      </ScrollView>

      <EditPermissionModal />
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
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
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
  filterButtonActive: {
    backgroundColor: '#f0f7ff',
  },
  filtersContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
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
  filterGroup: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  sortButtonActive: {
    backgroundColor: '#f0f7ff',
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666',
  },
  sortButtonTextActive: {
    color: '#0066CC',
    fontWeight: '500',
  },
  permissionsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  userTypeSection: {
    marginBottom: 24,
  },
  userTypeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  userTypeSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  permissionCard: {
    flexDirection: 'row',
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
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
  },
  permissionActions: {
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 20,
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
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  formInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  formInputError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
  },
  textInput: {
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
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  userTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  userTypeOptionText: {
    fontSize: 14,
    color: '#666',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusLabel: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#0066CC',
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
  submitButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
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
});