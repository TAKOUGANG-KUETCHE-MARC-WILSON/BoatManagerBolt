import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Shield, Phone, Mail, ChevronRight, User, Users, Building, X, CreditCard as Edit, Trash, Plus } from 'lucide-react-native'; // <-- Correction ici: Ajout de Plus
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase';

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

interface CorporateUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  corporate_role_name: string; // Name of the role from corporate_roles table
  corporate_role_id: string; // ID of the role from corporate_roles table
  avatar: string;
  createdAt: string;
  lastLogin?: string;
  department?: string;
}

type CorporateUserRoleFilter = 'super-admin' | 'admin' | 'secretary' | 'operator'; // For filter options
type SortKey = 'name' | 'email' | 'role';

const getRoleName = (roleName: string): string => {
  switch (roleName) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'secretary':
      return 'Secrétaire';
    case 'operator':
      return 'Opérateur';
    default:
      return roleName;
  }
};

const getRoleColor = (roleName: string): string => {
  switch (roleName) {
    case 'super_admin':
      return '#F59E0B';
    case 'admin':
      return '#0EA5E9';
    case 'secretary':
      return '#10B981';
    case 'operator':
      return '#8B5CF6';
    default:
      return '#666666';
  }
};

export default function CorporateUsersScreen() {
  const { user } = useAuth();
  const [corporateUsers, setCorporateUsers] = useState<CorporateUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<CorporateUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<CorporateUserRoleFilter | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedUser, setSelectedUser] = useState<CorporateUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is super-admin (assuming this permission is needed to view this screen)
  const isSuperAdmin = user?.role === 'corporate' && 
                       user.permissions?.canManageUsers === true; // Assuming canManageUsers covers this

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

  const fetchCorporateUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          e_mail,
          phone,
          avatar,
          created_at,
          last_login,
          department,
          corporate_role_id,
          corporate_roles(name, description)
        `)
        .eq('profile', 'corporate');

      if (fetchError) {
        console.error('Error fetching corporate users:', fetchError);
        setError('Échec du chargement des utilisateurs Corporate.');
        return;
      }

      const usersWithDetails: CorporateUser[] = await Promise.all(data.map(async (u: any) => {
        const signedAvatarUrl = await getSignedAvatarUrl(u.avatar);
        return {
          id: u.id,
          firstName: u.first_name,
          lastName: u.last_name,
          email: u.e_mail,
          phone: u.phone,
          corporate_role_name: u.corporate_roles?.name || 'N/A',
          corporate_role_id: u.corporate_role_id || 'N/A',
          avatar: signedAvatarUrl || DEFAULT_AVATAR,
          createdAt: u.created_at,
          lastLogin: u.last_login,
          department: u.department,
        };
      }));

      setCorporateUsers(usersWithDetails);
    } catch (e: any) {
      console.error('Unexpected error fetching corporate users:', e);
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) { // Only fetch if user has permission
      fetchCorporateUsers();
    }
  }, [isSuperAdmin, fetchCorporateUsers]);

  // Real-time subscription for users table
  useEffect(() => {
    const channel = supabase
      .channel('corporate_users_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: 'profile=eq.corporate' },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newUser = payload.new as any;
            const signedAvatarUrl = await getSignedAvatarUrl(newUser.avatar);
            const { data: roleData, error: roleError } = await supabase
              .from('corporate_roles')
              .select('name')
              .eq('id', newUser.corporate_role_id)
              .single();

            if (roleError) {
              console.error('Error fetching role for new user:', roleError);
              return;
            }

            setCorporateUsers(prevUsers => [
              ...prevUsers,
              {
                id: newUser.id,
                firstName: newUser.first_name,
                lastName: newUser.last_name,
                email: newUser.e_mail,
                phone: newUser.phone,
                corporate_role_name: roleData?.name || 'N/A',
                corporate_role_id: newUser.corporate_role_id || 'N/A',
                avatar: signedAvatarUrl || DEFAULT_AVATAR,
                createdAt: newUser.created_at,
                lastLogin: newUser.last_login,
                department: newUser.department,
              }
            ]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedUser = payload.new as any;
            const signedAvatarUrl = await getSignedAvatarUrl(updatedUser.avatar);
            const { data: roleData, error: roleError } = await supabase
              .from('corporate_roles')
              .select('name')
              .eq('id', updatedUser.corporate_role_id)
              .single();

            if (roleError) {
              console.error('Error fetching role for updated user:', roleError);
              return;
            }

            setCorporateUsers(prevUsers => prevUsers.map(user => 
              user.id === updatedUser.id
                ? {
                    id: updatedUser.id,
                    firstName: updatedUser.first_name,
                    lastName: updatedUser.last_name,
                    email: updatedUser.e_mail,
                    phone: updatedUser.phone,
                    corporate_role_name: roleData?.name || 'N/A',
                    corporate_role_id: updatedUser.corporate_role_id || 'N/A',
                    avatar: signedAvatarUrl || DEFAULT_AVATAR,
                    createdAt: updatedUser.created_at,
                    lastLogin: updatedUser.last_login,
                    department: updatedUser.department,
                  }
                : user
            ));
          } else if (payload.eventType === 'DELETE') {
            const deletedUser = payload.old as any;
            setCorporateUsers(prevUsers => prevUsers.filter(user => user.id !== deletedUser.id));
            // Close modal if the deleted user was currently selected
            if (selectedUser?.id === deletedUser.id) {
              setShowDetailsModal(false);
              setSelectedUser(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUser]); // Re-subscribe if selectedUser changes to handle modal closing correctly

  // Apply filters and sorting
  useEffect(() => {
    let result = [...corporateUsers];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.department && user.department.toLowerCase().includes(query))
      );
    }
    
    // Apply role filter
    if (selectedRole) {
      result = result.filter(user => user.corporate_role_name === selectedRole);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;
      
      switch (sortKey) {
        case 'name':
          valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'email':
          valueA = a.email.toLowerCase();
          valueB = b.email.toLowerCase();
          break;
        case 'role':
          valueA = a.corporate_role_name;
          valueB = b.corporate_role_name;
          break;
        default:
          valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
      }
      
      if (valueA < valueB) return sortAsc ? -1 : 1;
      if (valueA > valueB) return sortAsc ? 1 : -1;
      return 0;
    });
    
    setFilteredUsers(result);
  }, [corporateUsers, searchQuery, selectedRole, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleViewUserDetails = (userId: string) => {
    const user = corporateUsers.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      setShowDetailsModal(true);
    }
  };

  const handleAddUser = () => {
    router.push('/corporate/users/new');
  };

  const handleManageRoles = () => {
    router.push('/corporate/roles');
  };

  const handleEditUser = () => {
    if (selectedUser) {
      setShowDetailsModal(false);
      router.push(`/corporate/users/${selectedUser.id}/edit`);
    }
  };

  // Removed handleDeleteUser and confirmDeleteUser functions as per request

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Modal component for user details
  const UserDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détails de l'utilisateur</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {selectedUser && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.userProfileHeader}>
                <Image source={{ uri: selectedUser.avatar }} style={styles.userProfileImage} />
                <View style={styles.userProfileInfo}>
                  <Text style={styles.userProfileName}>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Text>
                  <View style={[
                    styles.userRoleBadge, 
                    { backgroundColor: `${getRoleColor(selectedUser.corporate_role_name)}15` }
                  ]}>
                    <Text style={[
                      styles.userRoleText,
                      { color: getRoleColor(selectedUser.corporate_role_name) }
                    ]}>
                      {getRoleName(selectedUser.corporate_role_name)}
                    </Text>
                  </View>
                  <Text style={styles.userProfileDate}>
                    Membre depuis {formatDate(selectedUser.createdAt)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Informations de contact</Text>
                
                <View style={styles.detailItem}>
                  <Mail size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{selectedUser.email}</Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <Phone size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Téléphone</Text>
                    <Text style={styles.detailValue}>{selectedUser.phone}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Informations professionnelles</Text>
                
                <View style={styles.detailItem}>
                  <Building size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Département</Text>
                    <Text style={styles.detailValue}>{selectedUser.department || 'Non spécifié'}</Text>
                  </View>
                </View>
                
                <View style={styles.detailItem}>
                  <Shield size={20} color="#0066CC" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Rôle</Text>
                    <Text style={styles.detailValue}>{getRoleName(selectedUser.corporate_role_name)}</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Activité</Text>
                
                <View style={styles.activityItem}>
                  <Text style={styles.activityLabel}>Dernière connexion</Text>
                  <Text style={styles.activityValue}>
                    {selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : 'Jamais'}
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}
          
          <View style={styles.modalFooter}>
            <View style={styles.modalActions}>
              {/* Removed Delete Button as per request */}
              
              <TouchableOpacity 
                style={styles.editButton}
                onPress={handleEditUser}
              >
                <Edit size={20} color="white" />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Modal de confirmation de suppression (kept for potential future use or if needed elsewhere)
  const DeleteConfirmModal = () => (
    <Modal
      visible={showDeleteConfirmModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDeleteConfirmModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalContent}>
          <Text style={styles.confirmModalTitle}>Confirmer la suppression</Text>
          <Text style={styles.confirmModalText}>
            Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
          </Text>
          
          <View style={styles.confirmModalActions}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowDeleteConfirmModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.confirmDeleteButton}
              onPress={() => { /* confirmDeleteUser */ }} // Placeholder if function is removed
            >
              <Text style={styles.confirmDeleteButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Chargement des utilisateurs Corporate...</Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>Utilisateurs Corporate</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddUser}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.quickLinks}>
        <TouchableOpacity 
          style={styles.quickLink}
          onPress={handleManageRoles}
        >
          <Shield size={20} color="#F59E0B" />
          <Text style={styles.quickLinkText}>Gérer les rôles</Text>
          <ChevronRight size={16} color="#666" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un utilisateur..."
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
          <Text style={styles.filterTitle}>Rôle</Text>
          <View style={styles.filterOptions}>
            <TouchableOpacity 
              style={[
                styles.filterOption,
                selectedRole === null && styles.filterOptionSelected
              ]}
              onPress={() => setSelectedRole(null)}
            >
              <Text style={styles.filterOptionText}>Tous</Text>
            </TouchableOpacity>
            
            {(['super_admin', 'admin', 'secretary', 'operator'] as CorporateUserRoleFilter[]).map((role) => (
              <TouchableOpacity 
                key={role}
                style={[
                  styles.filterOption,
                  selectedRole === role && styles.filterOptionSelected
                ]}
                onPress={() => setSelectedRole(role)}
              >
                <Shield size={16} color={getRoleColor(role)} />
                <Text style={styles.filterOptionText}>{getRoleName(role)}</Text>
              </TouchableOpacity>
            ))}
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
          style={[styles.sortButton, sortKey === 'email' && styles.sortButtonActive]}
          onPress={() => handleSort('email')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'email' && styles.sortButtonTextActive]}>
            Email {sortKey === 'email' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.sortButton, sortKey === 'role' && styles.sortButtonActive]}
          onPress={() => handleSort('role')}
        >
          <Text style={[styles.sortButtonText, sortKey === 'role' && styles.sortButtonTextActive]}>
            Rôle {sortKey === 'role' && (sortAsc ? '↑' : '↓')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.usersList}>
        {filteredUsers.length > 0 ? (
          filteredUsers.map((corporateUser) => (
            <TouchableOpacity 
              key={corporateUser.id} 
              style={styles.userCard}
              onPress={() => handleViewUserDetails(corporateUser.id)}
            >
              <Image source={{ uri: corporateUser.avatar }} style={styles.userImage} />
              
              <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                  <Text style={styles.userName}>{corporateUser.firstName} {corporateUser.lastName}</Text>
                  <View style={[
                    styles.userRoleBadge, 
                    { backgroundColor: `${getRoleColor(corporateUser.corporate_role_name)}15` }
                  ]}>
                    <Text style={[
                      styles.userRoleText,
                      { color: getRoleColor(corporateUser.corporate_role_name) }
                    ]}>
                      {getRoleName(corporateUser.corporate_role_name)}
                    </Text>
                  </View>
                </View>
                
                {corporateUser.department && (
                  <Text style={styles.userDepartment}>{corporateUser.department}</Text>
                )}
                
                <View style={styles.userDetails}>
                  <View style={styles.userDetailRow}>
                    <Mail size={16} color="#666" />
                    <Text style={styles.userDetailText}>{corporateUser.email}</Text>
                  </View>
                  
                  <View style={styles.userDetailRow}>
                    <Phone size={16} color="#666" />
                    <Text style={styles.userDetailText}>{corporateUser.phone}</Text>
                  </View>
                </View>
              </View>
              
              <ChevronRight size={24} color="#0066CC" style={styles.userChevron} />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Users size={48} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Aucun utilisateur trouvé</Text>
            <Text style={styles.emptyStateText}>
              Aucun utilisateur ne correspond à vos critères de recherche.
            </Text>
          </View>
        )}
      </ScrollView>

      <UserDetailsModal />
      <DeleteConfirmModal />
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
    marginTop: -2,
  },
  quickLinks: {
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  quickLinkText: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
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
        boxBoxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
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
  filterTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  usersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  userCard: {
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
  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userRoleBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  userRoleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  userDepartment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userDetails: {
    gap: 6,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userDetailText: {
    fontSize: 14,
    color: '#666',
  },
  userChevron: {
    alignSelf: 'center',
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
  emptyStateText: {
    fontSize: 16,
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
  confirmModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    padding: 24,
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
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  confirmModalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
  userProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  userProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userProfileInfo: {
    flex: 1,
  },
  userProfileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userProfileDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityLabel: {
    fontSize: 14,
    color: '#666',
  },
  activityValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    padding: 12,
    borderRadius: 8,
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
  editButtonText: {
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
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxBoxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
      },
    }),
  },
  deleteButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
});
