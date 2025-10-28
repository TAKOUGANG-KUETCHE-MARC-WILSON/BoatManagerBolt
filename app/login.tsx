// app/login.tsx
import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, BackHandler, TouchableOpacity, ImageBackground, Platform, KeyboardAvoidingView, ActivityIndicator, ScrollView, Modal, Alert } from 'react-native';
import { Mail, Lock, ArrowLeft, Anchor, ChevronDown, LogIn } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/src/lib/supabase'; // Importez supabase
import Constants from 'expo-constants'; // Import Constants for status bar height




interface LoginForm {
  email: string;
  password: string;
}




type UserRole = 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'corporate';




const roleOptions = [
  { value: 'pleasure_boater', label: 'Plaisancier' },
  { value: 'boat_manager', label: 'Boat Manager' },
  { value: 'nautical_company', label: 'Entreprise du nautisme' },
  { value: 'corporate', label: 'Corporate' }
];




export default function LoginScreen() {
  const { login, loginAsBoatManager, loginAsNauticalCompany, loginAsCorporate } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('pleasure_boater');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginForm>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [portId, setPortId] = useState('1'); // Changed from 'p1' to '1'




  // --- États pour la fonction "Mot de passe oublié" ---
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordEmailError, setForgotPasswordEmailError] = useState('');
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);
  // --- Fin des états pour la fonction "Mot de passe oublié" ---




  const validateForm = () => {
    const newErrors: Partial<LoginForm> = {};




    if (!form.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    if (!form.password.trim()) newErrors.password = 'Le mot de passe est requis';




    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };




  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setIsLoading(true);
        setErrors({}); // Clear previous errors
        switch (selectedRole) {
          case 'boat_manager':
            await loginAsBoatManager(form.email, form.password);
            break;
          case 'nautical_company':
            await loginAsNauticalCompany(form.email, form.password);
            break;
          case 'corporate':
            await loginAsCorporate(form.email, form.password);
            break;
          default: // pleasure_boater
            // MODIFICATION ICI : Ne pas passer portId à la fonction login
            await login(form.email, form.password);
            break;
        }
      } catch (error: any) {
        console.error('Failed to login:', error);
        setErrors(prev => ({ ...prev, general: error.message || 'Échec de la connexion.' }));
      } finally {
        setIsLoading(false);
      }
    }
  };




  // --- Nouvelle fonction pour la demande de réinitialisation du mot de passe ---
  const handleForgotPasswordRequest = async () => {
    let isValid = true;
    setForgotPasswordEmailError('');




    if (!forgotPasswordEmail.trim()) {
      setForgotPasswordEmailError('L\'email est requis');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      setForgotPasswordEmailError('L\'email n\'est pas valide');
      isValid = false;
    }




    if (!isValid) {
      return;
    }




    setIsSendingResetLink(true);




    try {
      // Appel de votre Edge Function personnalisée
      const EDGE_FUNCTION_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/password-reset/request-reset`;


      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
           Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
                  },
        body: JSON.stringify({ e_mail: forgotPasswordEmail.trim() }),
      });


      if (!response.ok) {
        const errorData = await response.json();
        console.error("DEBUG: Edge Function /request-reset error:", response.status, errorData);
        Alert.alert(
          "Erreur",
          errorData.error || "Une erreur est survenue lors de l'envoi du lien de réinitialisation."
        );
      } else {
        // La fonction Edge est conçue pour ne pas révéler si l'email existe ou non
        Alert.alert(
          "Lien envoyé",
          "Si votre adresse e-mail est enregistrée, un lien de réinitialisation a été envoyé à votre boîte de réception."
        );
        setShowForgotPasswordModal(false);
        setForgotPasswordEmail('');
      }
    } catch (e: any) {
      console.error("DEBUG: Client-side request error:", e);
      Alert.alert("Erreur", "Une erreur réseau est survenue ou le service n'a pas répondu.");
    } finally {
      setIsSendingResetLink(false);
    }
  };
  // --- Fin de la nouvelle fonction pour la demande de réinitialisation ---




  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?q=80&w=1964&auto=format&fit=crop' }}
          style={styles.heroBackground}
        >
          <View style={styles.overlay} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (router.canGoBack && router.canGoBack()) {
                router.back();
              } else {
                BackHandler.exitApp();// ou '/(tabs)' selon ta structure
              }
            }}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <Anchor size={40} color="white" style={styles.heroIcon} />
            <Text style={styles.heroTitle}>Your Boat Manager</Text>
            <Text style={styles.heroSubtitle}>
              Connectez-vous à votre compte
            </Text>
          </View>
        </ImageBackground>




        <View style={styles.formContainer}>
          <TouchableOpacity
            style={styles.roleSelector}
            onPress={() => setShowRoleSelector(!showRoleSelector)}
          >
            <Text style={styles.selectedRole}>
              {roleOptions.find(role => role.value === selectedRole)?.label}
            </Text>
            <ChevronDown size={20} color="#666" />
          </TouchableOpacity>




          {showRoleSelector && (
            <View style={styles.roleOptions}>
              {roleOptions.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleOption,
                    selectedRole === role.value && styles.roleOptionSelected
                  ]}
                  onPress={() => {
                    setSelectedRole(role.value as UserRole);
                    setShowRoleSelector(false);
                  }}
                >
                  <Text style={[
                    styles.roleOptionText,
                    selectedRole === role.value && styles.roleOptionTextSelected
                  ]}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}




          <View style={styles.form}>
            {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, errors.email && styles.inputWrapperError]}>
                <Mail size={20} color={errors.email ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={form.email}
                  onChangeText={(text) => setForm(prev => ({ ...prev, email: text }))}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoCorrect={false}
                  spellCheck={false}
                  inputMode="email"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>




            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, errors.password && styles.inputWrapperError]}>
                <Lock size={20} color={errors.password ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
                  value={form.password}
                  onChangeText={(text) => setForm(prev => ({ ...prev, password: text }))}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                />
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>




            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Se connecter
                </Text>
              )}
            </TouchableOpacity>




            {/* --- Nouveau bouton "Mot de passe oublié" --- */}
            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => setShowForgotPasswordModal(true)}
            >
              <Text style={styles.forgotPasswordLinkText}>Mot de passe oublié ?</Text>
            </TouchableOpacity>
            {/* --- Fin du nouveau bouton --- */}




            {selectedRole === 'pleasure_boater' && (
              <TouchableOpacity
                style={styles.signupLink}
                onPress={() => router.push('/signup')}
              >
                <LogIn size={16} color="#0066CC" />
                <Text style={styles.signupLinkText}>
                  Pas encore de compte ? Inscrivez-vous
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>




      {/* --- Modale "Mot de passe oublié" --- */}
      <Modal
        visible={showForgotPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.forgotPasswordModalContent}>
            <Text style={styles.forgotPasswordModalTitle}>Mot de passe oublié</Text>
            <Text style={styles.forgotPasswordModalText}>
              Veuillez saisir votre email pour recevoir un lien de réinitialisation.
            </Text>




            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, forgotPasswordEmailError && styles.inputWrapperError]}>
                <Mail size={20} color={forgotPasswordEmailError ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  placeholder="Votre adresse e-mail"
                  value={forgotPasswordEmail}
                  onChangeText={(text) => {
                    setForgotPasswordEmail(text);
                    setForgotPasswordEmailError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoCorrect={false}
                  spellCheck={false}
                  inputMode="email"
                />
              </View>
              {forgotPasswordEmailError && <Text style={styles.errorText}>{forgotPasswordEmailError}</Text>}
            </View>




            <TouchableOpacity
              style={[styles.submitButton, isSendingResetLink && styles.submitButtonDisabled]}
              onPress={handleForgotPasswordRequest}
              disabled={isSendingResetLink}
            >
              {isSendingResetLink ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  Envoyer le lien de réinitialisation
                </Text>
              )}
            </TouchableOpacity>




            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowForgotPasswordModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* --- Fin de la modale "Mot de passe oublié" --- */}
    </KeyboardAvoidingView>
  );
}




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  heroBackground: {
    height: 280,
    justifyContent: 'space-between',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  backButton: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? Constants.statusBarHeight + 10 : 16, // Adjusted paddingTop for iOS
    zIndex: 1,
  },
  heroContent: {
    padding: 24,
    alignItems: 'center',
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    padding: 24,
    flex: 1,
    ...Platform.select({
      web: {
        maxWidth: 480,
        alignSelf: 'center',
        width: '100%',
        marginBottom: 40,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  selectedRole: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  roleOptions: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    zIndex: 1,
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
  roleOption: {
    padding: 12,
    borderRadius: 8,
  },
  roleOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  roleOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  roleOptionTextSelected: {
    color: '#0066CC',
    fontWeight: '500',
  },
  socialLoginContainer: {
    marginBottom: 24,
  },
  socialLoginTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  socialButtonsContainer: {
    gap: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
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
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  googleIcon: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  socialButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  appleButton: {
    height: 48,
    width: '100%',
    borderRadius: 12,
  },
  appleButtonWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  appleButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
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
    height: '100%',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginLeft: 12,
  },
  submitButton: {
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signupLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 8,
    gap: 8,
  },
  signupLinkText: {
    color: '#0066CC',
    fontSize: 14,
  },
  // --- Styles pour la modale "Mot de passe oublié" ---
  forgotPasswordLink: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 5,
  },
  forgotPasswordLinkText: {
    color: '#0066CC',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
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
  forgotPasswordModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
    textAlign: 'center',
  },
  forgotPasswordModalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalCloseButton: {
    alignSelf: 'center',
    marginTop: 15,
    padding: 8,
  },
  modalCloseButtonText: {
    color: '#0066CC',
    fontSize: 14,
  },
});



