import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Settings, Shield, Users, Building, LogOut } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

type CorporateRole = 'super-admin' | 'admin' | 'secretary' | 'operator';

interface Permission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  route?: string;
}

const rolePermissions: Record<CorporateRole, Permission[]> = {
  'super-admin': [
    { id: 'manage_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions', enabled: true, route: '/corporate/roles' },
    { id: 'manage_users_corporate', name: 'Gestion des utilisateurs Corporate', description: 'Créer, modifier et supprimer des utilisateurs Corporate', enabled: true, route: '/corporate/users' },
    { id: 'manage_users_pleasure_boaters', name: 'Gestion des utilisateurs Plaisanciers', description: 'Créer, modifier et supprimer des utilisateurs Plaisanciers et modifier les Boat Managers assignés', enabled: true, route: '/corporate/pleasure-boaters' },
    { id: 'manage_users_boat_managers', name: 'Gestion des utilisateurs Boat Managers', description: 'Créer, modifier et supprimer des utilisateurs Boat Managers et gérer leurs Ports d\'attache', enabled: true, route: '/corporate/boat-managers' },
    { id: 'manage_users_nautical_companies', name: 'Gestion des utilisateurs Entreprises du nautisme', description: 'Créer, modifier et supprimer des utilisateurs Entreprises du nautisme et gérer leurs Ports d\'attache', enabled: true, route: '/corporate/nautical-companies' },
  ],
  'admin': [
    { id: 'manage_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions', enabled: false, route: '/corporate/roles' },
    { id: 'manage_users_corporate', name: 'Gestion des utilisateurs Corporate', description: 'Créer, modifier et supprimer des utilisateurs Corporate', enabled: true, route: '/corporate/users' },
    { id: 'manage_users_pleasure_boaters', name: 'Gestion des utilisateurs Plaisanciers', description: 'Créer, modifier et supprimer des utilisateurs Plaisanciers et modifier les Boat Managers assignés', enabled: true, route: '/corporate/pleasure-boaters' },
    { id: 'manage_users_boat_managers', name: 'Gestion des utilisateurs Boat Managers', description: 'Créer, modifier et supprimer des utilisateurs Boat Managers et gérer leurs Ports d\'attache', enabled: true, route: '/corporate/boat-managers' },
    { id: 'manage_users_nautical_companies', name: 'Gestion des utilisateurs Entreprises du nautisme', description: 'Créer, modifier et supprimer des utilisateurs Entreprises du nautisme et gérer leurs Ports d\'attache', enabled: true, route: '/corporate/nautical-companies' },
  ],
  'secretary': [
    { id: 'manage_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions', enabled: false, route: '/corporate/roles' },
    { id: 'manage_users_corporate', name: 'Gestion des utilisateurs Corporate', description: 'Voir les informations des utilisateurs Corporate', enabled: false, route: '/corporate/users' },
    { id: 'manage_users_pleasure_boaters', name: 'Gestion des utilisateurs Plaisanciers', description: 'Voir les informations des utilisateurs Plaisanciers et modifier les Boat Managers assignés', enabled: true, route: '/corporate/pleasure-boaters' },
    { id: 'manage_users_boat_managers', name: 'Gestion des utilisateurs Boat Managers', description: 'Voir les informations des utilisateurs Boat Managers et gérer leurs Ports d\'attache', enabled: true, route: '/corporate/boat-managers' },
    { id: 'manage_users_nautical_companies', name: 'Gestion des utilisateurs Entreprises du nautisme', description: 'Voir les informations des utilisateurs Entreprises du nautisme et gérer leurs Ports d\'attache', enabled: true, route: '/corporate/nautical-companies' },
    { id: 'manage_requests', name: 'Gestion des demandes', description: 'Gérer les demandes des clients', enabled: true, route: '/corporate/requests' },
  ],
  'operator': [
    { id: 'manage_roles', name: 'Gestion des rôles Corporate', description: 'Gérer les rôles et permissions', enabled: false, route: '/corporate/roles' },
    { id: 'manage_users_corporate', name: 'Gestion des utilisateurs Corporate', description: 'Voir les informations des utilisateurs Corporate', enabled: false, route: '/corporate/users' },
    { id: 'manage_users_pleasure_boaters', name: 'Gestion des utilisateurs Plaisanciers', description: 'Voir les informations des utilisateurs Plaisanciers et modifier les Boat Managers assignés', enabled: true, route: '/corporate/pleasure-boaters' },
    { id: 'manage_users_boat_managers', name: 'Gestion des utilisateurs Boat Managers', description: 'Voir les informations des utilisateurs Boat Managers et gérer leurs Ports d\'attache', enabled: true, route: '/corporate/boat-managers' },
    { id: 'manage_users_nautical_companies', name: 'Gestion des utilisateurs Entreprises du nautisme', description: 'Voir les informations des utilisateurs Entreprises du nautisme et gérer leurs Ports d\'attache', enabled: true, route: '/corporate/nautical-companies' },
    { id: 'process_requests', name: 'Traitement des demandes', description: 'Traiter les demandes des clients', enabled: true, route: '/corporate/requests' },
  ],
};

export default function CorporateProfileScreen() {
  const { user, logout } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'permissions' | 'settings'>('permissions');

  const handleLogout = () => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/login');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handlePermissionPress = (permission: Permission) => {
    if (permission.route && permission.enabled) {
      router.push(permission.route);
    }
  };

  const userRole: CorporateRole = 'super-admin'; // This would come from user context
  const permissions = rolePermissions[userRole];

  const stats = {
    totalUsers: 156,
    boatManagers: 12,
    companies: 8,
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <View style={styles.roleBadge}>
          <Shield size={16} color="#0066CC" />
          <Text style={styles.roleText}>Super Admin</Text>
        </View>
      </View>

      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Users size={24} color="#0066CC" />
          <Text style={styles.statNumber}>{stats.totalUsers}</Text>
          <Text style={styles.statLabel}>Utilisateurs</Text>
        </View>
        <View style={styles.statCard}>
          <Users size={24} color="#10B981" />
          <Text style={styles.statNumber}>{stats.boatManagers}</Text>
          <Text style={styles.statLabel}>Boat Managers</Text>
        </View>
        <View style={styles.statCard}>
          <Building size={24} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.companies}</Text>
          <Text style={styles.statLabel}>Entreprises</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'permissions' && styles.activeTab]}
          onPress={() => setSelectedTab('permissions')}
        >
          <Text style={[styles.tabText, selectedTab === 'permissions' && styles.activeTabText]}>
            Permissions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'settings' && styles.activeTab]}
          onPress={() => setSelectedTab('settings')}
        >
          <Text style={[styles.tabText, selectedTab === 'settings' && styles.activeTabText]}>
            Paramètres
          </Text>
        </TouchableOpacity>
      </View>

      {selectedTab === 'permissions' ? (
        <View style={styles.permissionsContainer}>
          {permissions.map((permission) => (
            <TouchableOpacity 
              key={permission.id} 
              style={styles.permissionCard}
              onPress={() => handlePermissionPress(permission)}
              activeOpacity={permission.route && permission.enabled ? 0.7 : 1}
            >
              <View style={styles.permissionHeader}>
                <Shield size={20} color="#0066CC" />
                <Text style={styles.permissionName}>{permission.name}</Text>
              </View>
              <Text style={styles.permissionDescription}>
                {permission.description}
              </Text>
              {!permission.enabled && (
                <View style={styles.permissionDisabled}>
                  <Text style={styles.permissionDisabledText}>Non autorisé</Text>
                </View>
              )}
              {permission.route && permission.enabled && (
                <View style={styles.permissionAction}>
                  <Text style={styles.permissionActionText}>Accéder</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.settingsContainer}>
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/profile/edit')}
          >
            <Text style={styles.settingText}>Modifier mon profil</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/profile/notifications')}
          >
            <Text style={styles.settingText}>Notifications</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <Text style={styles.settingText}>Confidentialité</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.logoutButton]}
            onPress={handleLogout}
          >
            <View style={styles.logoutContent}>
              <LogOut size={20} color="#ff4444" />
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
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
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  statsSection: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0066CC',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#0066CC',
    fontWeight: '600',
  },
  permissionsContainer: {
    padding: 20,
    gap: 16,
  },
  permissionCard: {
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
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  permissionDescription: {
    fontSize: 14,
    color: '#666',
  },
  permissionDisabled: {
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  permissionDisabledText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  permissionAction: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  permissionActionText: {
    fontSize: 14,
    color: '#0066CC',
    fontWeight: '500',
  },
  settingsContainer: {
    padding: 20,
  },
  settingItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  logoutButton: {
    marginTop: 8,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
  },
});