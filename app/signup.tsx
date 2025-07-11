import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ImageBackground, Platform, KeyboardAvoidingView, Modal, ActivityIndicator } from 'react-native';
import { Mail, User, ArrowLeft, Anchor, MapPin, Lock, Plus, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import PortSelectionModal from '@/components/PortSelectionModal';

interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  ports: Array<{
    portId: string;
    portName: string;
  }>;
  general?: string;
}

export default function SignupScreen() {
  const { pendingServiceRequest, clearPendingServiceRequest, signup, ports } = useAuth();
  const [form, setForm] = useState<SignupForm>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    ports: [],
  });
  const [portSearch, setPortSearch] = useState('');
  const [showPortModal, setShowPortModal] = useState(false);
  const [errors, setErrors] = useState<Partial<SignupForm>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Partial<SignupForm> = {};

    if (!form.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
    if (!form.lastName.trim()) newErrors.lastName = 'Le nom est requis';
    if (!form.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    if (!form.password.trim()) newErrors.password = 'Le mot de passe est requis';
    if (form.ports.length === 0) newErrors.ports = 'Au moins un port d\'attache est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setIsLoading(true);
        setErrors({});
        await signup(form.firstName, form.lastName, form.email, form.password, form.ports);
      } catch (error: any) {
        console.error('Failed to create account:', error);
        setErrors(prev => ({ ...prev, general: error.message || 'Échec de la création du compte.' }));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddPort = (port: { id: string; name: string }) => {
    if (!form.ports.some(p => p.portId === port.id)) {
      setForm(prev => ({
        ...prev,
        ports: [...prev.ports, { portId: port.id, portName: port.name }]
      }));
      
      if (errors.ports) {
        setErrors(prev => ({ ...prev, ports: undefined }));
      }
    }
    
    setPortSearch('');
    setShowPortModal(false);
  };

  const handleRemovePort = (portId: string) => {
    setForm(prev => ({
      ...prev,
      ports: prev.ports.filter(p => p.portId !== portId)
    }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1528154291023-a6525fabe5b4?q=80&w=1964&auto=format&fit=crop' }}
          style={styles.heroBackground}
        >
          <View style={styles.overlay} />
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              clearPendingServiceRequest();
              router.back();
            }}
          >
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.heroContent}>
            <Anchor size={40} color="white" style={styles.heroIcon} />
            <Text style={styles.heroTitle}>Your Boat Manager</Text>
          </View>
        </ImageBackground>

        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Vos informations</Text>
          </View>

          <View style={styles.portSelectionContainer}>
            <Text style={styles.portSelectionTitle}>Port d'attache</Text>
            <Text style={styles.portSelectionSubtitle}>
              Sélectionnez votre port d'attache pour être mis en relation avec un Boat Manager
            </Text>

            <View style={styles.portsContainer}>
              {form.ports.map((port, index) => (
                <View key={index} style={styles.portChip}>
                  <MapPin size={16} color="#0066CC" />
                  <Text style={styles.portChipText}>{port.portName}</Text>
                  <TouchableOpacity
                    style={styles.removePortButton}
                    onPress={() => handleRemovePort(port.portId)}
                  >
                    <X size={14} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                style={styles.addPortButton}
                onPress={() => setShowPortModal(true)}
              >
                <Plus size={16} color="#0066CC" />
                <Text style={styles.addPortText}>Ajouter un port</Text>
              </TouchableOpacity>
            </View>

            {errors.ports && <Text style={styles.errorText}>{errors.ports}</Text>}
          </View>

          <View style={styles.form}>
            {errors.general && <Text style={styles.errorText}>{errors.general}</Text>}
            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, errors.firstName && styles.inputWrapperError]}>
                <User size={20} color={errors.firstName ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  placeholder="Prénom"
                  value={form.firstName}
                  onChangeText={(text) => setForm(prev => ({ ...prev, firstName: text }))}
                  autoCapitalize="words"
                  autoComplete="given-name"
                />
              </View>
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <View style={[styles.inputWrapper, errors.lastName && styles.inputWrapperError]}>
                <User size={20} color={errors.lastName ? '#ff4444' : '#666'} />
                <TextInput
                  style={styles.input}
                  placeholder="Nom"
                  value={form.lastName}
                  onChangeText={(text) => setForm(prev => ({ ...prev, lastName: text }))}
                  autoCapitalize="words"
                  autoComplete="family-name"
                />
              </View>
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>

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
                  autoComplete="new-password"
                  textContentType="newPassword"
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
                <Text style={styles.submitButtonText}>Envoyer ma demande</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/login')}
            >
              <Text style={styles.loginLinkText}>
                Déjà un compte ? Connectez-vous
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <PortSelectionModal
        visible={showPortModal}
        onClose={() => setShowPortModal(false)}
        onSelectPort={handleAddPort}
        selectedPortId={null}
        portsData={ports}
        searchQuery={portSearch}
        onSearchQueryChange={setPortSearch}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
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
  formHeader: {
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  portSelectionContainer: {
    marginBottom: 24,
    backgroundColor: '#f0f7ff',
    padding: 16,
    borderRadius: 12,
  },
  portSelectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 8,
  },
  portSelectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  portsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  portChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  portChipText: {
    fontSize: 14,
    color: '#0066CC',
  },
  removePortButton: {
    padding: 2,
  },
  addPortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#0066CC',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  addPortText: {
    fontSize: 14,
    color: '#0066CC',
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
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 8,
    gap: 8,
  },
  loginLinkText: {
    color: '#0066CC',
    fontSize: 14,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  portsList: {
    flex: 1,
  },
  portItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  portItemText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
});
