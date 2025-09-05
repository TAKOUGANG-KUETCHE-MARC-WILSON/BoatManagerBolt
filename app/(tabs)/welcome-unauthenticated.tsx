import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Anchor, Plus, LogIn } from 'lucide-react-native';

export default function WelcomeUnauthenticatedScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroContent}>
        <Anchor size={60} color="#0066CC" style={styles.heroIcon} />
        <Text style={styles.heroTitle}>Bienvenue sur Your Boat Manager</Text>
        <Text style={styles.heroSubtitle}>
          Créez votre compte pour accéder à tous nos services
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.createAccountButton}
          onPress={() => router.push('/signup')}
        >
          <Plus size={24} color="white" />
          <Text style={styles.createAccountButtonText}>Créer un compte plaisancier</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/login')}
        >
          <LogIn size={16} color="#0066CC" />
          <Text style={styles.loginLinkText}>
            Déjà un compte ? Connectez-vous
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  heroContent: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroIcon: {
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    lineHeight: 26,
  },
  actionsContainer: {
    width: '100%',
    maxWidth: 360,
    gap: 20,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    padding: 18,
    borderRadius: 12,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  createAccountButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  loginLinkText: {
    color: '#0066CC',
    fontSize: 16,
    fontWeight: '500',
  },
});
