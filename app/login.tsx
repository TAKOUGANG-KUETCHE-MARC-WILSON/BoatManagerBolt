import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ImageBackground, Platform, KeyboardAvoidingView, ActivityIndicator, ScrollView } from 'react-native';
import { Mail, Lock, ArrowLeft, Anchor, ChevronDown, Apple, LogIn } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Required for Google Auth on web
WebBrowser.maybeCompleteAuthSession();

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
  const { login, loginWithSocial, loginAsBoatManager, loginAsNauticalCompany, loginAsCorporate } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('pleasure_boater');
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginForm>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const [portId, setPortId] = useState('p1'); // Default port for social login

  // Google Auth setup
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: 'YOUR_EXPO_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    webClientId: 'YOUR_WEB_CLIENT_ID',
  });

  // Check if Apple Authentication is available on this device
  useState(() => {
    const checkAppleAuthAvailability = async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setIsAppleAuthAvailable(isAvailable);
    };
    
    checkAppleAuthAvailability();
  });

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
          default:
            router.push('/signup');
            break;
        }
      } catch (error) {
        console.error('Failed to login:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (selectedRole !== 'pleasure_boater') {
      alert('La connexion avec Google est uniquement disponible pour les plaisanciers.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await promptAsync();
      
      if (result.type === 'success') {
        // The user has been successfully authenticated
        const { authentication } = result;
        
        // In a real app, you would send this token to your backend
        await loginWithSocial('google', authentication?.accessToken || '', portId);
      }
    } catch (error) {
      console.error('Google sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (selectedRole !== 'pleasure_boater') {
      alert('La connexion avec Apple est uniquement disponible pour les plaisanciers.');
      return;
    }

    try {
      setIsLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      // In a real app, you would send this credential to your backend
      await loginWithSocial('apple', credential.identityToken || '', portId);
    } catch (error) {
      console.error('Apple sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
            onPress={() => router.back()}
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

          {selectedRole === 'pleasure_boater' && (
            <View style={styles.socialLoginContainer}>
              <Text style={styles.socialLoginTitle}>Connexion rapide</Text>
              
              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity 
                  style={styles.googleButton}
                  onPress={handleGoogleSignIn}
                  disabled={isLoading || !request}
                >
                  <View style={styles.googleIconContainer}>
                    <Text style={styles.googleIcon}>G</Text>
                  </View>
                  <Text style={styles.socialButtonText}>Continuer avec Google</Text>
                </TouchableOpacity>
                
                {isAppleAuthAvailable ? (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                  />
                ) : Platform.OS === 'web' ? (
                  <TouchableOpacity 
                    style={styles.appleButtonWeb}
                    onPress={handleAppleSignIn}
                  >
                    <Apple size={20} color="white" />
                    <Text style={styles.appleButtonText}>Continuer avec Apple</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>
            </View>
          )}

          <View style={styles.form}>
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
                  {selectedRole === 'pleasure_boater' ? 'Continuer' : 'Se connecter'}
                </Text>
              )}
            </TouchableOpacity>

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
    marginBottom: 16,
    textAlign: 'center',
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
});