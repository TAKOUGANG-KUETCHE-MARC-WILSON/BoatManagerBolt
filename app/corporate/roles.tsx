import { useState, useEffect, memo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Alert, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Shield, Plus, CreditCard as Edit, Trash, X, Check, Users, Mail, Phone, User, Filter, ChevronDown, ChevronUp, Clock, Settings, FileText, Building, Euro } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Import Supabase client

// Interface pour les permissions
interface Permission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

// Interface pour les rôles
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[]; // Permissions spécifiques à ce rôle
  userCount: number;
  isSystem: boolean; // Correspond à is_system_role dans la DB
}

// Icônes pour les permissions (à adapter si vos noms de permissions changent)
const permissionIcons: Record<string, React.ComponentType<any>> = {
  manage_corporate_users: Users,
  view_corporate_users: User,
  manage_corporate_roles: Shield,
  manage_corporate_settings: Settings,
  manage_pleasure_boaters: User,
  view_pleasure_boaters: User,
  manage_pleasure_boater_boats: Building, // Using Building for boats
  manage_pleasure_boater_requests: FileText,
  manage_boat_managers: Users,
  view_boat_managers: User,
  assign_boat_managers: Users,
  manage_boat_manager_skills: Shield,
  manage_boat_manager_areas: Map, // Assuming Map icon for areas
  manage_nautical_companies: Building,
  view_nautical_companies: Building,
  manage_nautical_company_skills: Shield,
  manage_nautical_company_areas: Map,
  manage_requests: FileText,
  process_requests: FileText,
  access_financials: Euro,
};

// Helper pour obtenir l'icône d'un type d'utilisateur (pour les filtres)
const getUserTypeIcon = (userType: string) => {
  switch (userType) {
    case 'corporate': return Shield;
    case 'pleasure_boater': return User;
    case 'boat_manager': return Users;
    case 'nautical_company': return Building;
    default: return Shield;
  }
};

// Helper pour obtenir le nom d'un type d'utilisateur (pour les filtres)
const getUserTypeLabel = (userType: string) => {
  switch (userType) {
    case 'corporate': return 'Corporate';
    case 'pleasure_boater': return 'Plaisancier';
    case 'boat_manager': return 'Boat Manager';
    case 'nautical_company': return 'Entreprise';
    default: return userType;
  }
};

// Helper pour obtenir la couleur d'un type d'utilisateur (pour les filtres)
const getUserTypeColor = (userType: string) => {
  switch (userType) {
    case 'corporate': return '#F59E0B';
    case 'pleasure_boater': return '#0EA5E9';
    case 'boat_manager': return '#10B981';
    case 'nautical_company': return '#8B5CF6';
    default: return '#666666';
  }
};

// --- Modale pour ajouter un rôle ---
const AddRoleModal = memo(({
  visible,
  onClose,
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  allAvailablePermissions,
  permissionIcons,
  togglePermission,
  isLoading,
  handleSubmitAdd,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter un rôle</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nom du rôle</Text>
              <View style={[styles.formInput, formErrors.name && styles.formInputError]}>
                <Shield size={20} color={formErrors.name ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, name: text }));
                    setFormErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Nom du rôle"
                />
              </View>
              {formErrors.name && (
                <Text style={styles.errorText}>{formErrors.name}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <View style={[styles.formInput, styles.textAreaWrapper, formErrors.description && styles.formInputError]}>
                <FileText size={20} color={formErrors.description ? '#ff4444' : '#666'} />
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, description: text }));
                    setFormErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Description du rôle"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              {formErrors.description && (
                <Text style={styles.errorText}>{formErrors.description}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Permissions</Text>
              <View style={styles.permissionsContainer}>
                {formData.permissions?.map((permission) => {
                  const PermissionIcon = permissionIcons[permission.id] || Shield;
                  return (
                    <View key={permission.id} style={styles.permissionItem}>
                      <View style={styles.permissionInfo}>
                        <PermissionIcon size={20} color="#0066CC" />
                        <View style={styles.permissionText}>
                          <Text style={styles.permissionName}>{permission.name}</Text>
                          <Text style={styles.permissionDescription}>{permission.description}</Text>
                        </View>
                      </View>
                      <Switch
                        value={permission.enabled}
                        onValueChange={() => togglePermission(permission.id)}
                        trackColor={{ false: '#e0e0e0', true: '#bfdbfe' }}
                        thumbColor={permission.enabled ? '#0066CC' : '#fff'}
                        ios_backgroundColor="#e0e0e0"
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitAdd}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Check size={20} color="white" />
                  <Text style={styles.submitButtonText}>Ajouter</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// --- Modale pour modifier un rôle ---
const EditRoleModal = memo(({
  visible,
  onClose,
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  allAvailablePermissions,
  permissionIcons,
  togglePermission,
  isLoading,
  handleSubmitEdit,
  selectedRole,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier le rôle</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nom du rôle</Text>
              <View style={[styles.formInput, formErrors.name && styles.formInputError]}>
                <Shield size={20} color={formErrors.name ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, name: text }));
                    setFormErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="Nom du rôle"
                  editable={!selectedRole?.isSystem}
                />
              </View>
              {formErrors.name && (
                <Text style={styles.errorText}>{formErrors.name}</Text>
              )}
              {selectedRole?.isSystem && (
                <Text style={styles.infoText}>Les noms des rôles système ne peuvent pas être modifiés.</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <View style={[styles.formInput, styles.textAreaWrapper, formErrors.description && styles.formInputError]}>
                <FileText size={20} color={formErrors.description ? '#ff4444' : '#666'} />
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => {
                    setFormData(prev => ({ ...prev, description: text }));
                    setFormErrors(prev => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Description du rôle"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              {formErrors.description && (
                <Text style={styles.errorText}>{formErrors.description}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Permissions</Text>
              <View style={styles.permissionsContainer}>
                {formData.permissions?.map((permission) => {
                  const PermissionIcon = permissionIcons[permission.id] || Shield;

                  // For system roles, some permissions might be locked
                  const isLocked = selectedRole?.isSystem &&
                                  (selectedRole.id === 'r1' && permission.id === 'manage_roles'); // Example: Super Admin's manage_roles is locked

                  return (
                    <View key={permission.id} style={styles.permissionItem}>
                      <View style={styles.permissionInfo}>
                        <PermissionIcon size={20} color="#0066CC" />
                        <View style={styles.permissionText}>
                          <Text style={styles.permissionName}>{permission.name}</Text>
                          <Text style={styles.permissionDescription}>{permission.description}</Text>
                          {isLocked && (
                            <Text style={styles.permissionLocked}>Cette permission est verrouillée pour ce rôle.</Text>
                          )}
                        </View>
                      </View>
                      <Switch
                        value={permission.enabled}
                        onValueChange={() => !isLocked && togglePermission(permission.id)}
                        trackColor={{ false: '#e0e0e0', true: '#bfdbfe' }}
                        thumbColor={permission.enabled ? '#0066CC' : '#fff'}
                        ios_backgroundColor="#e0e0e0"
                        disabled={isLocked}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
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
});

// --- Modale pour supprimer un rôle ---
const DeleteRoleModal = memo(({
  visible,
  onClose,
  selectedRole,
  isLoading,
  handleConfirmDelete,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.deleteModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Supprimer le rôle</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.deleteModalBody}>
            {selectedRole?.isSystem ? (
              <Text style={styles.deleteModalText}>
                Le rôle "{selectedRole?.name}" est un rôle système et ne peut pas être supprimé.
              </Text>
            ) : (
              <>
                <Text style={styles.deleteModalText}>
                  Êtes-vous sûr de vouloir supprimer le rôle "{selectedRole?.name}" ?
                </Text>
                {selectedRole?.userCount ? (
                  <Text style={styles.deleteModalWarning}>
                    Ce rôle est attribué à {selectedRole.userCount} utilisateur{selectedRole.userCount > 1 ? 's' : ''}.
                  </Text>
                ) : null}
                <Text style={styles.deleteModalWarning}>
                  Cette action est irréversible.
                </Text>
              </>
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>

            {!selectedRole?.isSystem && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleConfirmDelete}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Trash size={20} color="white" />
                    <Text style={styles.deleteButtonText}>Supprimer</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
});


export default function RolesManagementScreen() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserType, setSelectedUserType] = useState<string | null>(null); // Filter by user type associated with permissions
  const [showFilters, setShowFilters] = useState(false);
  const [showUserTypeFilter, setShowUserTypeFilter] = useState(false);
  const [sortKey, setSortKey] = useState<'name' | 'permissions' | 'userCount'>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form state for add/edit role
  const [formData, setFormData] = useState<Partial<Role>>({
    name: '',
    description: '',
    permissions: [],
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // State to store all available permissions (fetched once)
  const [allAvailablePermissions, setAllAvailablePermissions] = useState<Permission[]>([]);

  // Check if user is super-admin (or has permission to manage roles)
  const isSuperAdmin = user?.role === 'corporate' && user?.permissions?.canManageRoles === true;

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

  // Fetch all available permissions and roles data on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch all available permissions
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('corporate_permissions')
          .select('id, name, description, category'); // Fetch category to potentially filter by it

        if (permissionsError) {
          console.error('Error fetching all available permissions:', permissionsError);
          Alert.alert('Erreur', 'Impossible de charger les permissions disponibles.');
          return;
        }
        setAllAvailablePermissions(permissionsData.map(p => ({ ...p, enabled: false })));

        // Fetch all roles and their associated data
        const { data: rolesData, error: rolesError } = await supabase
          .from('corporate_roles')
          .select('id, name, description, is_system_role');

        if (rolesError) {
          console.error('Error fetching corporate roles:', rolesError);
          Alert.alert('Erreur', 'Impossible de charger les rôles.');
          return;
        }

        const fetchedRoles: Role[] = [];

        for (const role of rolesData) {
          // Fetch permissions for this role
          const { data: rolePermissionsData, error: rolePermissionsError } = await supabase
            .from('corporate_role_permissions')
            .select('permission_id, enabled')
            .eq('role_id', role.id);

          if (rolePermissionsError) {
            console.error(`Error fetching permissions for role ${role.name}:`, rolePermissionsError);
          }

          // Construct the permissions array for this role based on all available permissions
          const currentRolePermissions: Permission[] = permissionsData.map(p => {
            const foundPerm = (rolePermissionsData || []).find(rp => rp.permission_id === p.id);
            return {
              id: p.id,
              name: p.name,
              description: p.description,
              enabled: foundPerm ? foundPerm.enabled : false,
            };
          });

          // Count users for this role
          const { count: userCount, error: userCountError } = await supabase
            .from('users')
            .select('id', { count: 'exact' })
            .eq('corporate_role_id', role.id);

          if (userCountError) {
            console.error(`Error counting users for role ${role.name}:`, userCountError);
          }

          fetchedRoles.push({
            id: role.id.toString(),
            name: role.name,
            description: role.description,
            permissions: currentRolePermissions,
            userCount: userCount || 0,
            isSystem: role.is_system_role,
          });
        }

        setRoles(fetchedRoles);
      } catch (e) {
        console.error('Unexpected error fetching initial data:', e);
        Alert.alert('Erreur', 'Une erreur inattendue est survenue lors du chargement des données.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let result = [...roles];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(role => 
        role.name.toLowerCase().includes(query) ||
        role.description.toLowerCase().includes(query) ||
        role.permissions.some(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query))
      );
    }
    
    // Apply user type filter (based on permission categories)
    if (selectedUserType) {
      result = result.filter(role => 
        role.permissions.some(p => 
          allAvailablePermissions.find(ap => ap.id === p.id && ap.category === selectedUserType)
        )
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortKey) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'permissions':
          valueA = a.permissions.filter(p => p.enabled).length;
          valueB = b.permissions.filter(p => p.enabled).length;
          break;
        case 'userCount':
          valueA = a.userCount;
          valueB = b.userCount;
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        if (valueA < valueB) return sortAsc ? -1 : 1;
        if (valueA > valueB) return sortAsc ? 1 : -1;
        return 0;
      } else {
        return sortAsc ? (valueA as number) - (valueB as number) : (valueB as number) - (valueA as number);
      }
    });
    
    setFilteredRoles(result);
  }, [roles, searchQuery, selectedUserType, sortKey, sortAsc, allAvailablePermissions]);

  const handleSort = (key: 'name' | 'permissions' | 'userCount') => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleAddRole = () => {
    setFormData({
      name: '',
      description: '',
      permissions: allAvailablePermissions.map(p => ({ ...p, enabled: false })) // All disabled by default
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    
    // Construct formData.permissions based on allAvailablePermissions and the role's current permissions
    const currentRolePermissions: Permission[] = allAvailablePermissions.map(p => {
      const foundPerm = role.permissions.find(rp => rp.id === p.id);
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        enabled: foundPerm ? foundPerm.enabled : false,
      };
    });

    setFormData({
      name: role.name,
      description: role.description,
      permissions: currentRolePermissions
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteModal(true);
  };

  const togglePermission = (permissionId: string) => {
    if (!formData.permissions) return;
    
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions?.map(p => 
        p.id === permissionId ? { ...p, enabled: !p.enabled } : p
      )
    }));
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

  const handleSubmitAdd = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      // 1. Insert new role
      const { data: newRoleData, error: roleInsertError } = await supabase
        .from('corporate_roles')
        .insert({
          name: formData.name!,
          description: formData.description!,
          is_system_role: false, // New roles are not system roles by default
        })
        .select('id')
        .single();

      if (roleInsertError) {
        console.error('Error inserting new role:', roleInsertError);
        Alert.alert('Erreur', `Échec de la création du rôle: ${roleInsertError.message}`);
        return;
      }

      // 2. Insert selected permissions for the new role
      const permissionsToInsert = formData.permissions!
        .filter(p => p.enabled)
        .map(p => ({
          role_id: newRoleData.id,
          permission_id: p.id,
          enabled: true,
        }));

      if (permissionsToInsert.length > 0) {
        const { error: permissionsInsertError } = await supabase
          .from('corporate_role_permissions')
          .insert(permissionsToInsert);

        if (permissionsInsertError) {
          console.error('Error inserting role permissions:', permissionsInsertError);
          Alert.alert('Erreur', `Échec de l'affectation des permissions: ${permissionsInsertError.message}`);
          // Consider rolling back role creation here if permissions are critical
        }
      }
      
      Alert.alert('Succès', 'Le rôle a été créé avec succès', [{ text: 'OK' }]);
      setShowAddModal(false);
      // Refetch all data to update the UI
      // This is a simple way to refresh, for larger apps consider more granular state updates
      window.location.reload(); // Simple reload for full refresh
    } catch (e) {
      console.error('Unexpected error during add role:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de l\'ajout du rôle.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!validateForm() || !selectedRole) return;
    
    setIsLoading(true);
    try {
      // 1. Update role details
      const { error: roleUpdateError } = await supabase
        .from('corporate_roles')
        .update({
          name: formData.name!,
          description: formData.description!,
        })
        .eq('id', selectedRole.id);

      if (roleUpdateError) {
        console.error('Error updating role:', roleUpdateError);
        Alert.alert('Erreur', `Échec de la mise à jour du rôle: ${roleUpdateError.message}`);
        return;
      }

      // 2. Delete existing permissions for this role
      const { error: deletePermissionsError } = await supabase
        .from('corporate_role_permissions')
        .delete()
        .eq('role_id', selectedRole.id);

      if (deletePermissionsError) {
        console.error('Error deleting old role permissions:', deletePermissionsError);
        Alert.alert('Erreur', `Échec de la suppression des anciennes permissions: ${deletePermissionsError.message}`);
        // Decide if you want to proceed or rollback
      }

      // 3. Insert new set of selected permissions
      const permissionsToInsert = formData.permissions!
        .filter(p => p.enabled)
        .map(p => ({
          role_id: selectedRole.id,
          permission_id: p.id,
          enabled: true,
        }));

      if (permissionsToInsert.length > 0) {
        const { error: insertPermissionsError } = await supabase
          .from('corporate_role_permissions')
          .insert(permissionsToInsert);

        if (insertPermissionsError) {
          console.error('Error inserting new role permissions:', insertPermissionsError);
          Alert.alert('Erreur', `Échec de l'affectation des nouvelles permissions: ${insertPermissionsError.message}`);
        }
      }
      
      Alert.alert('Succès', 'Le rôle a été modifié avec succès', [{ text: 'OK' }]);
      setShowEditModal(false);
      window.location.reload(); // Simple reload for full refresh
    } catch (e) {
      console.error('Unexpected error during edit role:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de la modification du rôle.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRole) return;
    
    // Check if it's a system role
    if (selectedRole.isSystem) {
      Alert.alert(
        'Action impossible',
        'Les rôles système ne peuvent pas être supprimés.',
        [{ text: 'OK' }]
      );
      setShowDeleteModal(false);
      return;
    }
    
    // Check if role has users
    if (selectedRole.userCount > 0) {
      Alert.alert(
        'Attention',
        `Ce rôle est attribué à ${selectedRole.userCount} utilisateur${selectedRole.userCount > 1 ? 's' : ''}. Pour le supprimer, vous devez d'abord réaffecter ces utilisateurs à un autre rôle.`,
        [
          {
            text: 'OK',
            onPress: () => setShowDeleteModal(false)
          }
        ]
      );
      return;
    }
    
    setIsLoading(true);
    try {
      // 1. Delete permissions associated with the role
      const { error: deletePermissionsError } = await supabase
        .from('corporate_role_permissions')
        .delete()
        .eq('role_id', selectedRole.id);

      if (deletePermissionsError) {
        console.error('Error deleting role permissions:', deletePermissionsError);
        Alert.alert('Erreur', `Échec de la suppression des permissions du rôle: ${deletePermissionsError.message}`);
        return;
      }

      // 2. Delete the role itself
      const { error: deleteRoleError } = await supabase
        .from('corporate_roles')
        .delete()
        .eq('id', selectedRole.id);

      if (deleteRoleError) {
        console.error('Error deleting role:', deleteRoleError);
        Alert.alert('Erreur', `Échec de la suppression du rôle: ${deleteRoleError.message}`);
        return;
      }
      
      Alert.alert('Succès', 'Le rôle a été supprimé avec succès', [{ text: 'OK' }]);
      setShowDeleteModal(false);
      window.location.reload(); // Simple reload for full refresh
    } catch (e) {
      console.error('Unexpected error during delete role:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue lors de la suppression du rôle.');
    } finally {
      setIsLoading(false);
    }
  };

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
          <Text style={styles.title}>Gestion des rôles Corporate</Text>
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
        <Text style={styles.title}>Gestion des rôles Corporate</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddRole}
        >
          <Plus size={24} color="#0066CC" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un rôle..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

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
          style={[styles.sortButton, sortKey === 'permissions' && styles.sortButtonActive]}
          onPress={() => handleSort('permissions')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'permissions' && styles.sortButtonTextActive]}>
            Permissions {sortKey === 'permissions' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sortButton, sortKey === 'userCount' && styles.sortButtonActive]}
          onPress={() => handleSort('userCount')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'userCount' && styles.sortButtonTextActive]}>
            Utilisateurs {sortKey === 'userCount' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.rolesList}>
        {filteredRoles.length > 0 ? (
          Object.entries(
            filteredRoles.reduce((acc, role) => {
              // Determine category based on permissions
              const enabledPermissions = role.permissions.filter(p => p.enabled);
              let category = 'Autres'; // Default category if no specific permission type is found

              if (enabledPermissions.some(p => allAvailablePermissions.find(ap => ap.id === p.id && ap.category === 'Gestion des utilisateurs'))) {
                category = 'Gestion des utilisateurs';
              } else if (enabledPermissions.some(p => allAvailablePermissions.find(ap => ap.id === p.id && ap.category === 'Gestion des partenaires'))) {
                category = 'Gestion des partenaires';
              } else if (enabledPermissions.some(p => allAvailablePermissions.find(ap => ap.id === p.id && ap.category === 'Gestion des services'))) {
                category = 'Gestion des services';
              } else if (enabledPermissions.some(p => allAvailablePermissions.find(ap => ap.id === p.id && ap.category === 'Gestion financière'))) {
                category = 'Gestion financière';
              } else if (enabledPermissions.some(p => allAvailablePermissions.find(ap => ap.id === p.id && ap.category === 'Paramètres de la plateforme'))) {
                category = 'Paramètres de la plateforme';
              }
              
              if (!acc[category]) {
                acc[category] = [];
              }
              acc[category].push(role);
              return acc;
            }, {} as Record<string, Role[]>)
          ).map(([category, rolesInCategory]) => (
            <View key={category} style={styles.userTypeSection}>
              <View style={[
                styles.userTypeSectionHeader,
                { backgroundColor: `${getUserTypeColor(category)}15` }
              ]}>
                {/* Corrected usage: assign component to a variable first */}
                {(() => {
                  const IconComponent = getUserTypeIcon(category);
                  return <IconComponent size={20} color={getUserTypeColor(category)} />;
                })()}
                <Text style={[
                  styles.userTypeSectionTitle,
                  { color: getUserTypeColor(category) }
                ]}>
                  {getUserTypeLabel(category)}
                </Text>
              </View>
              
              {rolesInCategory.map((role) => (
                <View key={role.id} style={styles.roleCard}>
                  <View style={styles.roleInfo}>
                    <View style={styles.roleHeader}>
                      <Text style={styles.roleName}>{role.name}</Text>
                      {role.isSystem && (
                        <View style={styles.systemBadge}>
                          <Text style={styles.systemBadgeText}>Système</Text>
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.roleDescription}>{role.description}</Text>
                    
                    <View style={styles.permissionsSummary}>
                      <Text style={styles.permissionsSummaryText}>
                        {role.permissions.filter(p => p.enabled).length} permission{role.permissions.filter(p => p.enabled).length > 1 ? 's' : ''} activée{role.permissions.filter(p => p.enabled).length > 1 ? 's' : ''}
                      </Text>
                      <View style={styles.permissionBadges}>
                        {role.permissions.filter(p => p.enabled).slice(0, 3).map((permission) => {
                          const PermissionIcon = permissionIcons[permission.id] || Shield;
                          return (
                            <View key={permission.id} style={styles.permissionBadge}>
                              <PermissionIcon size={14} color="#0066CC" />
                              <Text style={styles.permissionBadgeText}>{permission.name}</Text>
                            </View>
                          );
                        })}
                        {role.permissions.filter(p => p.enabled).length > 3 && (
                          <View style={styles.permissionBadge}>
                            <Text style={styles.permissionBadgeText}>+{role.permissions.filter(p => p.enabled).length - 3}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.userCountContainer}>
                      <Users size={16} color="#666" />
                      <Text style={styles.userCountText}>
                        {role.userCount} utilisateur{role.userCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.roleActions}>
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => handleEditRole(role)}
                    >
                      <Edit size={20} color="#0066CC" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.deleteButton,
                        (role.isSystem || role.userCount > 0) && styles.disabledButton
                      ]}
                      onPress={() => handleDeleteRole(role)}
                      disabled={role.isSystem || role.userCount > 0}
                    >
                      <Trash size={20} color={(role.isSystem || role.userCount > 0) ? "#ccc" : "#ff4444"} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Shield size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucun rôle trouvé</Text>
            <Text style={styles.emptyStateText}>
              Aucun rôle ne correspond à vos critères de recherche.
            </Text>
          </View>
        )}
      </ScrollView>

      <AddRoleModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        allAvailablePermissions={allAvailablePermissions}
        permissionIcons={permissionIcons}
        togglePermission={togglePermission}
        isLoading={isLoading}
        handleSubmitAdd={handleSubmitAdd}
      />
      <EditRoleModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        allAvailablePermissions={allAvailablePermissions}
        permissionIcons={permissionIcons}
        togglePermission={togglePermission}
        isLoading={isLoading}
        handleSubmitEdit={handleSubmitEdit}
        selectedRole={selectedRole}
      />
      <DeleteRoleModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        selectedRole={selectedRole}
        isLoading={isLoading}
        handleConfirmDelete={handleConfirmDelete}
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
  addButton: {
    padding: 8,
  },
  searchContainer: {
    padding: 16,
  },
  searchInputContainer: {
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
  rolesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  roleCard: {
    flexDirection: 'row',
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
  roleInfo: {
    flex: 1,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  systemBadge: {
    backgroundColor: '#f0f7ff',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  systemBadgeText: {
    fontSize: 12,
    color: '#0066CC',
    fontWeight: '500',
  },
  roleDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  permissionsSummary: {
    marginBottom: 12,
  },
  permissionsSummaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  permissionBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  permissionBadgeText: {
    fontSize: 12,
    color: '#0066CC',
  },
  userCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userCountText: {
    fontSize: 14,
    color: '#666',
  },
  roleActions: {
    justifyContent: 'center',
    gap: 16,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#f1f5f9',
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
  deleteModalContent: {
    maxHeight: '50%',
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
  deleteModalBody: {
    padding: 16,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalWarning: {
    fontSize: 14,
    color: '#ff4444',
    textAlign: 'center',
    marginTop: 8,
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
    // Removed fixed height: height: 48,
  },
  textAreaWrapper: {
    alignItems: 'flex-start', // Align items to the top for multiline
    paddingVertical: 12, // Add vertical padding
    minHeight: 80, // Ensure a minimum height for the wrapper
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
    minHeight: 48, // Ensure a minimum height for single line inputs
    paddingVertical: 0, // Remove default vertical padding from TextInput
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  textArea: {
    minHeight: 80, // Minimum height for multiline text areas
    textAlignVertical: 'top', // Align text to top for multiline
    paddingTop: 0, // Adjust padding for multiline
    paddingBottom: 0, // Adjust padding for multiline
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  infoText: {
    color: '#0066CC',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  permissionsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  permissionText: {
    flex: 1,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  permissionDescription: {
    fontSize: 12,
    color: '#666',
  },
  permissionLocked: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
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
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ff4444',
    ...Platform.select({
      ios: {
        shadowColor: '#ff4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(255, 68, 68, 0.2)',
      },
    }),
  },
  deleteButtonText: {
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
