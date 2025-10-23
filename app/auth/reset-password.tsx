// app/auth/reset-password.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, KeyboardAvoidingView, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Lock, Check, ArrowLeft } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
// Importez supabase si vous en avez besoin pour d'autres choses, mais pas pour l'auth ici
// import { supabase } from '@/src/lib/supabase';


export default function ResetPasswordScreen() {
  // MODIFICATION ICI : Récupérer 'token' et 'email'
  const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();


  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenAndEmailValid, setIsTokenAndEmailValid] = useState(false); // Nouveau nom d'état


  useEffect(() => {
    const validateDeepLinkParams = () => {
      if (token && email) {
        setIsTokenAndEmailValid(true);
      } else {
        Alert.alert('Lien invalide', 'Le lien de réinitialisation est manquant ou invalide.');
        router.replace('/login');
      }
    };


    validateDeepLinkParams();
  }, [token, email]); // Dépendances mises à jour


  const validateForm = () => {
    const newErrors: Record<string, string> = {};


    if (!newPassword.trim()) {
      newErrors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 6 caractères';
    }


    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'La confirmation du mot de passe est requise';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      newErrors.newPassword = 'Les mots de passe ne correspondent pas'; // Afficher aussi sur le premier champ
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }


    if (!token || !email) {
      Alert.alert('Erreur', 'Informations de réinitialisation manquantes.');
      router.replace('/login');
      return;
    }


    setIsLoading(true);
    try {
      // MODIFICATION ICI : Appel de votre Edge Function personnalisée /confirm-reset
      const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/password-reset/confirm-reset`;


      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          e_mail: email,
          token: token,
          new_password: newPassword,
        }),
      });


      if (!response.ok) {
        const errorData = await response.json();
        console.error("DEBUG: Edge Function /confirm-reset error:", response.status, errorData);
        Alert.alert('Erreur', errorData.error || 'Échec de la réinitialisation du mot de passe.');
      } else {
        Alert.alert(
          'Succès',
          'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.'
        );
        router.replace('/login'); // Rediriger vers la page de connexion
      }
    } catch (e) {
      console.error('Unexpected error during password reset:', e);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue.');
    } finally {
      setIsLoading(false);
    }
  };


  // MODIFICATION ICI : Utiliser isTokenAndEmailValid
  if (!isTokenAndEmailValid) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.loadingText}>Validation du lien de réinitialisation...</Text>
      </View>
    );
  }


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/login')}
          >
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.title}>Réinitialiser le mot de passe</Text>
        </View>


        <View style={styles.formContainer}>
          <Text style={styles.subtitle}>
            Veuillez saisir et confirmer votre nouveau mot de passe.
          </Text>


          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nouveau mot de passe</Text>
            <View style={[styles.inputWrapper, errors.newPassword && styles.inputWrapperError]}>
              <Lock size={20} color={errors.newPassword ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                placeholder="Nouveau mot de passe"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  setErrors(prev => ({ ...prev, newPassword: undefined, confirmPassword: undefined }));
                }}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
              />
            </View>
            {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
          </View>


          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
            <View style={[styles.inputWrapper, errors.confirmPassword && styles.inputWrapperError]}>
              <Lock size={20} color={errors.confirmPassword ? '#ff4444' : '#666'} />
              <TextInput
                style={styles.input}
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors(prev => ({ ...prev, newPassword: undefined, confirmPassword: undefined }));
                }}
                secureTextEntry
                autoCapitalize="none"
                textContentType="newPassword"
              />
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          </View>


          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Check size={20} color="white" />
                <Text style={styles.submitButtonText}>Réinitialiser le mot de passe</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
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
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperError: {
    borderColor: '#ff4444',
    backgroundColor: '#fff5f5',
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
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
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
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});



