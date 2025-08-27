import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Shield, Users, Building, LogOut, Mail, Phone } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';

type CorporateRole = 'super-admin' | 'admin' | 'secretary' | 'operator';

interface Permission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  route?: string;
}

export default function CorporateProfileScreen() {
  const { user, logout } = useAuth();

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

  // MODIFIÉ : Utilise le corporateRoleName du user ou un fallback
  const currentUserRoleName = user?.corporateRoleName || 'Non défini'; 

  // MODIFIÉ : Définition dynamique des permissions
  const corporateProfilePermissions: Permission[] = [
    { id: 'manage_users_corporate', name: 'Gestion des utilisateurs Corporate', description: 'Créer, modifier et supprimer des utilisateurs Corporate', enabled: user?.permissions?.canManageUsers || false, route: '/corporate/users' },
    { id: 'manage_users_pleasure_boaters', name: 'Gestion des utilisateurs Plaisanciers', description: 'Créer, modifier et supprimer des utilisateurs Plaisanciers et modifier les Boat Managers assignés', enabled: user?.permissions?.canManageUsers || false, route: '/corporate/pleasure-boaters' },
    { id: 'manage_users_boat_managers', name: 'Gestion des Boat Managers', description: 'Créer, modifier et supprimer des Boat Managers et gérer leurs Ports d\'attache', enabled: user?.permissions?.canManageUsers || false, route: '/corporate/boat-managers' },
    { id: 'manage_users_nautical_companies', name: 'Gestion des Entreprises du nautisme', description: 'Créer, modifier et supprimer des Entreprises du nautisme et gérer leurs Ports d\'attache', enabled: user?.permissions?.canManageUsers || false, route: '/corporate/nautical-companies' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <View style={styles.roleBadge}>
          <Shield size={16} color="#0066CC" />
          <Text style={styles.roleText}>{currentUserRoleName}</Text> {/* MODIFIÉ : Affiche le nom du rôle */}
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.contactInfoSection}>
        <View style={styles.infoRow}>
          <Mail size={20} color="#0066CC" />
          <Text style={styles.infoText}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone size={20} color="#0066CC" />
          <Text style={styles.infoText}>{user?.phone || 'N/A'}</Text>
        </View>
      </View>

      {/* Simplified Permissions List */}
      <View style={styles.permissionsContainer}>
        {corporateProfilePermissions.map((permission) => (
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

      {/* Logout Button */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <LogOut size={20} color="#ff4444" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
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
  contactInfoSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#1a1a1a',
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    margin: 20,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    color: '#ff4444',
    fontWeight: '600',
  },
});

