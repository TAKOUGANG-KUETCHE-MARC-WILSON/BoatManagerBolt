import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, Image } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Shield, Phone, Mail, ChevronRight, User, Users, Building, X, CreditCard as Edit, Trash } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

type CorporateUserRole = 'super-admin' | 'admin' | 'secretary' | 'operator';
type SortKey = 'name' | 'email' | 'role';

interface CorporateUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: CorporateUserRole;
  avatar: string;
  createdAt: string;
  lastLogin?: string;
  department?: string;
}

// Mock data for corporate users
const mockCorporateUsers: CorporateUser[] = [
  {
    id: 'cu1',
    firstName: 'Admin',
    lastName: 'YBM',
    email: 'admin@ybm.com',
    phone: '+33 1 23 45 67 89',
    role: 'super-admin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    createdAt: '2023-10-01',
    lastLogin: '2024-02-20',
    department: 'Direction'
  },
  {
    id: 'cu2',
    firstName: 'Émilie',
    lastName: 'Laurent',
    email: 'emilie.laurent@ybm.com',
    phone: '+33 1 23 45 67 90',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop',
    createdAt: '2023-11-15',
    lastLogin: '2024-02-19',
    department: 'Ressources Humaines'
  },
  {
    id: 'cu3',
    firstName: 'Nicolas',
    lastName: 'Martin',
    email: 'nicolas.martin@ybm.com',
    phone: '+33 1 23 45 67 91',
    role: 'secretary',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    createdAt: '2023-12-05',
    lastLogin: '2024-02-18',
    department: 'Support'
  },
  {
    id: 'cu4',
    firstName: 'Sophie',
    lastName: 'Dubois',
    email: 'sophie.dubois@ybm.com',
    phone: '+33 1 23 45 67 92',
    role: 'operator',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    createdAt: '2024-01-10',
    lastLogin: '2024-02-17',
    department: 'Support'
  },
  {
    id: 'cu5',
    firstName: 'Thomas',
    lastName: 'Petit',
    email: 'thomas.petit@ybm.com',
    phone: '+33 1 23 45 67 93',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    createdAt: '2024-01-15',
    lastLogin: '2024-02-16',
    department: 'Finance'
  }
];

const getRoleName = (role: CorporateUserRole): string => {
  switch (role) {
    case 'super-admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'secretary':
      return 'Secrétaire';
    case 'operator':
      return 'Opérateur';
    default:
      return role;
  }
};

const getRoleColor = (role: CorporateUserRole): string => {
  switch (role) {
    case 'super-admin':
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
  const [corporateUsers, setCorporateUsers] = useState<CorporateUser[]>(mockCorporateUsers);
  const [filteredUsers, setFilteredUsers] = useState<CorporateUser[]>(mockCorporateUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<CorporateUserRole | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedUser, setSelectedUser] = useState<CorporateUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

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
      result = result.filter(user => user.role === selectedRole);
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
          valueA = a.role;
          valueB = b.role;
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

  const handleDeleteUser = () => {
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteUser = () => {
    if (selectedUser) {
      // Filter out the selected user
      const updatedUsers = corporateUsers.filter(user => user.id !== selectedUser.id);
      setCorporateUsers(updatedUsers);
      setShowDeleteConfirmModal(false);
      setShowDetailsModal(false);
    }
  };

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
                    { backgroundColor: `${getRoleColor(selectedUser.role)}15` }
                  ]}>
                    <Text style={[
                      styles.userRoleText,
                      { color: getRoleColor(selectedUser.role) }
                    ]}>
                      {getRoleName(selectedUser.role)}
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
                    <Text style={styles.detailValue}>{getRoleName(selectedUser.role)}</Text>
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
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={handleDeleteUser}
              >
                <Trash size={20} color="white" />
                <Text style={styles.deleteButtonText}>Supprimer</Text>
              </TouchableOpacity>
              
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

  // Modal de confirmation de suppression
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
              onPress={confirmDeleteUser}
            >
              <Text style={styles.confirmDeleteButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
          <Text style={styles.addButtonText}>+</Text>
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
            
            {(['super-admin', 'admin', 'secretary', 'operator'] as CorporateUserRole[]).map((role) => (
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
                    { backgroundColor: `${getRoleColor(corporateUser.role)}15` }
                  ]}>
                    <Text style={[
                      styles.userRoleText,
                      { color: getRoleColor(corporateUser.role) }
                    ]}>
                      {getRoleName(corporateUser.role)}
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
        boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
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