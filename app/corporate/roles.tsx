import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Alert, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Shield, Plus, CreditCard as Edit, Trash, X, Check, Users, Mail, Phone, User, Filter, ChevronDown, ChevronUp, Clock, Settings, FileText, Building, Euro } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

type CorporateRole = 'super-admin' | 'admin' | 'secretary' | 'operator';
type SortKey = 'name' | 'permissions';

interface Permission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
  isSystem?: boolean;
}

// Mock data for roles
const mockRoles: Role[] = [
  {
    id: 'r1',
    name: 'Super Admin',
    description: 'Accès complet à toutes les fonctionnalités',
    permissions: [
      { id: 'manage_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions', enabled: true },
      { id: 'manage_users', name: 'Gestion des utilisateurs', description: 'Créer, modifier et supprimer des utilisateurs', enabled: true },
      { id: 'manage_partners', name: 'Gestion des partenaires', description: 'Gérer les Boat Managers et entreprises', enabled: true },
      { id: 'manage_finances', name: 'Gestion financière', description: 'Accès aux données financières', enabled: true },
    ],
    userCount: 2,
    isSystem: true
  },
  {
    id: 'r2',
    name: 'Admin',
    description: 'Accès à la plupart des fonctionnalités administratives',
    permissions: [
      { id: 'manage_users', name: 'Gestion des utilisateurs', description: 'Créer et modifier des utilisateurs', enabled: true },
      { id: 'manage_partners', name: 'Gestion des partenaires', description: 'Gérer les Boat Managers et entreprises', enabled: true },
      { id: 'manage_finances', name: 'Gestion financière', description: 'Accès aux données financières', enabled: true },
      { id: 'manage_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions', enabled: false },
    ],
    userCount: 3,
    isSystem: true
  },
  {
    id: 'r3',
    name: 'Secrétaire',
    description: 'Gestion des demandes et accès limité aux utilisateurs',
    permissions: [
      { id: 'view_users', name: 'Consultation utilisateurs', description: 'Voir les informations des utilisateurs', enabled: true },
      { id: 'manage_requests', name: 'Gestion des demandes', description: 'Gérer les demandes des clients', enabled: true },
      { id: 'manage_users', name: 'Gestion des utilisateurs', description: 'Créer et modifier des utilisateurs', enabled: false },
      { id: 'manage_partners', name: 'Gestion des partenaires', description: 'Gérer les Boat Managers et entreprises', enabled: false },
      { id: 'manage_finances', name: 'Gestion financière', description: 'Accès aux données financières', enabled: false },
      { id: 'manage_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions', enabled: false },
    ],
    userCount: 5,
    isSystem: true
  },
  {
    id: 'r4',
    name: 'Opérateur',
    description: 'Traitement des demandes et accès limité aux utilisateurs',
    permissions: [
      { id: 'view_users', name: 'Consultation utilisateurs', description: 'Voir les informations des utilisateurs', enabled: true },
      { id: 'process_requests', name: 'Traitement des demandes', description: 'Traiter les demandes des clients', enabled: true },
      { id: 'manage_users', name: 'Gestion des utilisateurs', description: 'Créer et modifier des utilisateurs', enabled: false },
      { id: 'manage_partners', name: 'Gestion des partenaires', description: 'Gérer les Boat Managers et entreprises', enabled: false },
      { id: 'manage_finances', name: 'Gestion financière', description: 'Accès aux données financières', enabled: false },
      { id: 'manage_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions', enabled: false },
    ],
    userCount: 8,
    isSystem: true
  },
  {
    id: 'r5',
    name: 'Responsable Financier',
    description: 'Accès aux données financières uniquement',
    permissions: [
      { id: 'manage_finances', name: 'Gestion financière', description: 'Accès aux données financières', enabled: true },
      { id: 'view_users', name: 'Consultation utilisateurs', description: 'Voir les informations des utilisateurs', enabled: true },
      { id: 'manage_users', name: 'Gestion des utilisateurs', description: 'Créer et modifier des utilisateurs', enabled: false },
      { id: 'manage_partners', name: 'Gestion des partenaires', description: 'Gérer les Boat Managers et entreprises', enabled: false },
      { id: 'manage_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions', enabled: false },
    ],
    userCount: 2
  }
];

// All available permissions
const allPermissions: Permission[] = [
  { id: 'manage_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions', enabled: false },
  { id: 'manage_users', name: 'Gestion des utilisateurs', description: 'Créer, modifier et supprimer des utilisateurs', enabled: false },
  { id: 'manage_partners', name: 'Gestion des partenaires', description: 'Gérer les Boat Managers et entreprises', enabled: false },
  { id: 'manage_finances', name: 'Gestion financière', description: 'Accès aux données financières', enabled: false },
  { id: 'view_users', name: 'Consultation utilisateurs', description: 'Voir les informations des utilisateurs', enabled: false },
  { id: 'manage_requests', name: 'Gestion des demandes', description: 'Gérer les demandes des clients', enabled: false },
  { id: 'process_requests', name: 'Traitement des demandes', description: 'Traiter les demandes des clients', enabled: false },
];

// Icons for permissions
const permissionIcons: Record<string, React.ComponentType<any>> = {
  manage_users: Users,
  manage_roles: Shield,
  manage_partners: Building,
  manage_finances: Euro,
  view_users: User,
  manage_requests: FileText,
  process_requests: FileText,
};

export default function RolesManagementScreen() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>(mockRoles);
  const [filteredRoles, setFilteredRoles] = useState<Role[]>(mockRoles);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state for add/edit role
  const [formData, setFormData] = useState<Partial<Role>>({
    name: '',
    description: '',
    permissions: [...allPermissions.map(p => ({ ...p, enabled: false }))]
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
    let result = [...roles];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(role => 
        role.name.toLowerCase().includes(query) ||
        role.description.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortKey) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'permissions':
          valueA = a.permissions.filter(p => p.enabled).length;
          valueB = b.permissions.filter(p => p.enabled).length;
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
  }, [roles, searchQuery, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
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
      permissions: [...allPermissions.map(p => ({ ...p, enabled: false }))]
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    
    // Create a complete permissions list with enabled status from the role
    const completePermissions = allPermissions.map(p => {
      const existingPerm = role.permissions.find(rp => rp.id === p.id);
      return existingPerm ? { ...existingPerm } : { ...p, enabled: false };
    });
    
    setFormData({
      name: role.name,
      description: role.description,
      permissions: completePermissions
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

  const handleSubmitAdd = () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const newRole: Role = {
        id: `r${Date.now()}`,
        name: formData.name!,
        description: formData.description!,
        permissions: formData.permissions!.filter(p => p.enabled),
        userCount: 0
      };
      
      setRoles(prev => [...prev, newRole]);
      setShowAddModal(false);
      setIsLoading(false);
      
      Alert.alert(
        'Succès',
        'Le rôle a été créé avec succès',
        [{ text: 'OK' }]
      );
    }, 1000);
  };

  const handleSubmitEdit = () => {
    if (!validateForm() || !selectedRole) return;
    
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setRoles(prev => 
        prev.map(r => 
          r.id === selectedRole.id
            ? {
                ...r,
                name: formData.name!,
                description: formData.description!,
                permissions: formData.permissions!.filter(p => p.enabled)
              }
            : r
        )
      );
      
      setShowEditModal(false);
      setIsLoading(false);
      
      Alert.alert(
        'Succès',
        'Le rôle a été modifié avec succès',
        [{ text: 'OK' }]
      );
    }, 1000);
  };

  const handleConfirmDelete = () => {
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
        `Ce rôle est attribué à ${selectedRole.userCount} utilisateur${selectedRole.userCount > 1 ? 's' : ''}. Voulez-vous vraiment le supprimer ?`,
        [
          {
            text: 'Annuler',
            style: 'cancel',
            onPress: () => setShowDeleteModal(false)
          },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: () => {
              setIsLoading(true);
              
              // Simulate API call
              setTimeout(() => {
                setRoles(prev => prev.filter(r => r.id !== selectedRole.id));
                setShowDeleteModal(false);
                setIsLoading(false);
                
                Alert.alert(
                  'Succès',
                  'Le rôle a été supprimé avec succès',
                  [{ text: 'OK' }]
                );
              }, 1000);
            }
          }
        ]
      );
    } else {
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        setRoles(prev => prev.filter(r => r.id !== selectedRole.id));
        setShowDeleteModal(false);
        setIsLoading(false);
        
        Alert.alert(
          'Succès',
          'Le rôle a été supprimé avec succès',
          [{ text: 'OK' }]
        );
      }, 1000);
    }
  };

  // Modal components
  const AddRoleModal = () => (
    <Modal
      visible={showAddModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAddModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ajouter un rôle</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAddModal(false)}
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
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Nom du rôle"
                />
              </View>
              {formErrors.name && (
                <Text style={styles.errorText}>{formErrors.name}</Text>
              )}
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <View style={[styles.formInput, formErrors.description && styles.formInputError]}>
                <FileText size={20} color={formErrors.description ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.textInput}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Description du rôle"
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
              onPress={() => setShowAddModal(false)}
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

  const EditRoleModal = () => (
    <Modal
      visible={showEditModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier le rôle</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowEditModal(false)}
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
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
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
              <View style={[styles.formInput, formErrors.description && styles.formInputError]}>
                <FileText size={20} color={formErrors.description ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.textInput}
                  value={formData.description}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                  placeholder="Description du rôle"
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
                                  (selectedRole.id === 'r1' && permission.id === 'manage_roles');
                  
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

  const DeleteRoleModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDeleteModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.deleteModalContent]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Supprimer le rôle</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDeleteModal(false)}
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
              onPress={() => setShowDeleteModal(false)}
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
      </View>

      <ScrollView style={styles.rolesList}>
        {filteredRoles.length > 0 ? (
          filteredRoles.map((role) => (
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
                    {role.permissions.length} permission{role.permissions.length > 1 ? 's' : ''}
                  </Text>
                  <View style={styles.permissionBadges}>
                    {role.permissions.slice(0, 3).map((permission) => {
                      const PermissionIcon = permissionIcons[permission.id] || Shield;
                      return (
                        <View key={permission.id} style={styles.permissionBadge}>
                          <PermissionIcon size={14} color="#0066CC" />
                          <Text style={styles.permissionBadgeText}>{permission.name}</Text>
                        </View>
                      );
                    })}
                    {role.permissions.length > 3 && (
                      <View style={styles.permissionBadge}>
                        <Text style={styles.permissionBadgeText}>+{role.permissions.length - 3}</Text>
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
                    role.isSystem && styles.disabledButton
                  ]}
                  onPress={() => handleDeleteRole(role)}
                  disabled={role.isSystem}
                >
                  <Trash size={20} color={role.isSystem ? "#ccc" : "#ff4444"} />
                </TouchableOpacity>
              </View>
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

      <AddRoleModal />
      <EditRoleModal />
      <DeleteRoleModal />
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
    height: 48,
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