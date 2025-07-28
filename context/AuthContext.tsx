import { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import bcrypt from 'bcryptjs';
import * as SecureStore from 'expo-secure-store';
import * as Random from 'expo-random';
import 'react-native-url-polyfill/auto';


interface ServiceRequest {
  type: string;
  data: any;
}

interface Port {
  id: string;
  name: string;
}

export type UserRole = 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'corporate';

interface BaseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
  createdAt?: string; // Add createdAt here
}

interface PleasureBoater extends BaseUser {
  role: 'pleasure_boater';
  ports: Array<{
    portId: string;
    boatManagerId: string;
  }>;
  phone?: string; // Ajout de la propriété phone ici
}

interface BoatManagerUser extends BaseUser {
  role: 'boat_manager';
  phone?: string;
  categories: Array<{ id: number; description1: string; }>; // Added for BoatManagerUser
}

interface NauticalCompany extends BaseUser {
  role: 'nautical_company';
  companyName: string;
  siret: string;
  address: string;
  categories: Array<{ id: number; description1: string; }>; // Changed from services: string[]
  ports: string[];
  certifications: string[];
  permissions: {
    canManageServices: boolean;
    canManageBookings: boolean;
    canAccessFinancials: boolean;
    canManageStaff: boolean;
  };
}

interface CorporateUser extends BaseUser {
  role: 'corporate';
  permissions: {
    canManageUsers: boolean;
    canManageRoles: boolean;
    canManagePartners: boolean;
    canAccessFinancials: boolean;
  };
}

export type User = PleasureBoater | BoatManagerUser | NauticalCompany | CorporateUser;

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  pendingServiceRequest: ServiceRequest | null;
  ports: Port[];
  login: (email: string, password: string, portId?: string) => Promise<void>;
  signup: (firstName: string, lastName: string, email: string, password: string, selectedPorts: { portId: string; portName: string }[]) => Promise<void>;
  loginWithSocial: (provider: 'google' | 'apple', token: string, portId: string) => Promise<void>;
  loginAsBoatManager: (email: string, password: string) => Promise<void>;
  loginAsNauticalCompany: (email: string, password: string) => Promise<void>;
  loginAsCorporate: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setPendingServiceRequest: (request: ServiceRequest | null) => void;
  clearPendingServiceRequest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pendingServiceRequest, setPendingServiceRequest] = useState<ServiceRequest | null>(null);
  const [availablePorts, setAvailablePorts] = useState<Port[]>([]);


  // Configure bcrypt with a cryptographically secure random number generator
bcrypt.setRandomFallback((len: number) => {
  const bytes = Random.getRandomBytes(len);
  return Array.from(bytes);
});



  useEffect(() => {
    const fetchPorts = async () => {
      const { data, error } = await supabase.from('ports').select('id, name');
      if (error) {
        console.error('Error fetching ports:', error);
      } else {
        setAvailablePorts(data.map(p => ({ id: p.id.toString(), name: p.name })));
      }
    };

    fetchPorts();

    const loadAndSetSession = async () => {
      try {
        let userId = null;
        if (Platform.OS === 'web') {
          userId = localStorage.getItem('user_id');
        } else {
          userId = await SecureStore.getItemAsync('user_id');
        }

        if (userId) {
          await getAndSetUserProfile(userId);
        }
      } catch (error) {
        console.error('Failed to load session:', error);
        await clearSession(); // Clear potentially corrupted session
      }
    };

    loadAndSetSession();

    // Listen for auth state changes from Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // If Supabase provides a session, ensure it's saved and profile is set
        await saveSession(session.user.id);
        await getAndSetUserProfile(session.user.id);
      } else {
        // If Supabase session is gone, clear local session
        await clearSession();
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const getAndSetUserProfile = async (authUserId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*, e_mail, first_name, last_name, avatar, phone, job_title, experience, certification, bio, created_at, company_name, siret, address, profile, user_ports(port_id)') // Ensure 'phone' is selected
      .eq('id', authUserId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      setIsAuthenticated(false);
      setUser(null);
      return null;
    }

    if (data) {
      const userPorts = await Promise.all(
        (data.user_ports || []).map(async (up: any) => {
          const { data: bmUserPorts, error: bmUserPortsError } = await supabase
            .from('user_ports')
            .select('user_id')
            .eq('port_id', up.port_id)
            .limit(1);

          let boatManagerId = '';
          if (!bmUserPortsError && bmUserPorts.length > 0) {
            const { data: bmProfile, error: bmProfileError } = await supabase
              .from('users')
              .select('profile')
              .eq('id', bmUserPorts[0].user_id)
              .single();

            if (!bmProfileError && bmProfile.profile === 'boat_manager') {
              boatManagerId = bmUserPorts[0].user_id.toString();
            }
          }

          return {
            portId: up.port_id.toString(),
            boatManagerId: boatManagerId
          };
        })
      );

      const commonUserData = {
        id: data.id.toString(),
        email: data.e_mail,
        firstName: data.first_name,
        lastName: data.last_name,
        avatar: data.avatar,
        role: data.profile as UserRole,
        createdAt: data.created_at, // Add created_at here
        phone: data.phone, // Ensure phone is assigned here
        job_title: data.job_title,
        experience: data.experience,
        bio: data.bio,
        certification: data.certification,
      };

      let userProfile: User;
      switch (data.profile) {
        case 'pleasure_boater':
          userProfile = { ...commonUserData, role: 'pleasure_boater', ports: userPorts } as PleasureBoater;
          break;
        case 'boat_manager':
          const { data: bmCategories, error: bmCategoriesError } = await supabase
            .from('user_categorie_service')
            .select('categorie_service(id, description1)')
            .eq('user_id', data.id);
          if (bmCategoriesError) {
            console.error('Error fetching BM categories:', bmCategoriesError);
          }
          userProfile = {
            ...commonUserData,
            role: 'boat_manager',
            phone: data.phone || '',
            categories: bmCategories ? bmCategories.map((bc: any) => ({ id: bc.categorie_service.id, description1: bc.categorie_service.description1 })) : [],
          } as BoatManagerUser;
          break;
        case 'nautical_company':
          const { data: ncCategories, error: ncCategoriesError } = await supabase
            .from('user_categorie_service')
            .select('categorie_service(id, description1)')
            .eq('user_id', data.id);
          if (ncCategoriesError) {
            console.error('Error fetching NC categories:', ncCategoriesError);
          }
          userProfile = {
            ...commonUserData,
            role: 'nautical_company',
            companyName: data.company_name || '',
            siret: data.siret || '',
            address: data.address || '',
            categories: ncCategories ? ncCategories.map((ncc: any) => ({ id: ncc.categorie_service.id, description1: ncc.categorie_service.description1 })) : [],
            ports: data.ports || [],
            certifications: data.certification || [],
            permissions: {
              canManageServices: true,
              canManageBookings: true,
              canAccessFinancials: true,
              canManageStaff: true,
            },
          } as NauticalCompany;
          break;
        case 'corporate':
          userProfile = {
            ...commonUserData,
            role: 'corporate',
            permissions: {
              canManageUsers: true,
              canManageRoles: true,
              canManagePartners: true,
              canAccessFinancials: true,
            },
          } as CorporateUser;
          break;
        default:
          console.error('Unknown user role:', data.profile);
          setIsAuthenticated(false);
          setUser(null);
          return null;
      }

      setIsAuthenticated(true);
      setUser(userProfile);
      return userProfile;
    }
    return null;
  };

  const saveSession = async (userId: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('user_id', userId);
      } else {
        await SecureStore.setItemAsync('user_id', userId);
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  };

  const clearSession = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('user_id');
      } else {
        await SecureStore.deleteItemAsync('user_id');
      }
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  };

  const login = async (email: string, password: string, portId?: string) => {
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, e_mail, password, profile, last_login') // Inclure last_login
      .eq('e_mail', email);

    if (userError || !users || users.length === 0) {
      throw new Error('Email ou mot de passe incorrect.');
    }

    const userInDb = users[0];

    const passwordMatch = await bcrypt.compare(password, userInDb.password);

    if (!passwordMatch) {
      throw new Error('Email ou mot de passe incorrect.');
    }

    // --- Logique de mise à jour du statut basée sur last_login ---
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    let newStatus = 'active';
    if (userInDb.last_login) {
      const lastLoginDate = new Date(userInDb.last_login);
      if (lastLoginDate < threeMonthsAgo) {
        newStatus = 'inactive';
      }
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ last_login: now.toISOString(), status: newStatus })
      .eq('id', userInDb.id);

    if (updateError) {
      console.error('Erreur lors de la mise à jour de last_login et status:', updateError);
    }
    // --- Fin de la logique de mise à jour du statut ---

    await saveSession(userInDb.id.toString());
    const userProfile = await getAndSetUserProfile(userInDb.id.toString());

    if (userProfile && userProfile.role === 'pleasure_boater' && portId) {
      const parsedPortId = parseInt(portId);
      if (isNaN(parsedPortId)) {
        console.error('Invalid portId provided to login function:', portId);
      } else {
        const { data: existingPortAssignment, error: existingPortError } = await supabase
          .from('user_ports')
          .select('*')
          .eq('user_id', userProfile.id)
          .eq('port_id', parsedPortId);

        if (existingPortError) {
          console.error('Error checking existing port assignment during login:', existingPortError);
        }

        if (!existingPortAssignment || existingPortAssignment.length === 0) {
          const { error: insertPortError } = await supabase
            .from('user_ports')
            .insert({ user_id: userProfile.id, port_id: parsedPortId });

          if (insertPortError) {
            console.error('Error inserting user port during login:', insertPortError);
          }
        }
      }
    }
    redirectUser(userProfile?.role || 'pleasure_boater');
  };

  const signup = async (
  firstName: string,
  lastName: string,
  email: string,
  password: string,
  selectedPorts: { portId: string; portName: string }[]
) => {
  const defaultAvatar =
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1';
  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: existingUsers, error: existingUserError } = await supabase
    .from('users')
    .select('id')
    .eq('e_mail', email);

  if (existingUserError) {
    throw new Error("Erreur lors de la vérification de l'utilisateur existant.");
  }
  if (existingUsers && existingUsers.length > 0) {
    throw new Error('Un compte avec cet email existe déjà.');
  }

  const { data: newUser, error: userInsertError } = await supabase
    .from('users')
    .insert({
      e_mail: email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      avatar: defaultAvatar,
      profile: 'pleasure_boater',
      phone: '',
      status: 'active', // New users are active by default
      last_login: new Date().toISOString(), // Set initial last_login
    })
    .select('id')
    .single();

  if (userInsertError) {
    console.error('Error inserting user profile:', userInsertError);
    throw new Error('Échec de la création du profil utilisateur.');
  }

  const userPortInserts = selectedPorts.map((p) => ({
    user_id: newUser.id,
    port_id: parseInt(p.portId),
  }));

  const { error: userPortsInsertError } = await supabase
    .from('user_ports')
    .insert(userPortInserts);

  if (userPortsInsertError) {
    console.error('Error inserting user ports:', userPortsInsertError);
    throw new Error("Échec de l'affectation des ports à l'utilisateur.");
  }

  await saveSession(newUser.id.toString());
  const userProfile = await getAndSetUserProfile(newUser.id.toString());

  if (userProfile) {
    const welcomePorts = await Promise.all(
      selectedPorts.map(async (p) => {
        const portInfo = availablePorts.find((ap) => ap.id === p.portId);
        let boatManagers: {
          name: string;
          phone: string;
          email: string;
        }[] = [];

        const { data: userPorts, error: userPortsError } = await supabase
          .from('user_ports')
          .select('user_id')
          .eq('port_id', parseInt(p.portId));

        if (!userPortsError && userPorts && userPorts.length > 0) {
          const userIds = userPorts.map((up) => up.user_id);
          const { data: boatManagersData, error: bmError } = await supabase
            .from('users')
            .select('first_name, last_name, e_mail, phone')
            .in('id', userIds)
            .eq('profile', 'boat_manager');

          if (!bmError && boatManagersData && boatManagersData.length > 0) {
            boatManagers = boatManagersData.map((bm) => ({
              name: `${bm.first_name} ${bm.last_name}`,
              phone: bm.phone || '',
              email: bm.e_mail,
            }));
          }
        }

        return {
          portName: portInfo?.name || 'Port inconnu',
          boatManagers,
        };
      })
    );

    // Affichage dans showWelcomeMessage
    const showWelcomeMessage = async (
      ports: Array<{
        portName: string;
        boatManagers: { name: string; phone: string; email: string }[];
      }>
    ) => {
      let message = `Bienvenue sur Your Boat Manager !\n\n`;
      message += `Des Boat Managers vous ont été affectés :\n\n`;

      ports.forEach((detail, index) => {
        message += `${index + 1}. ${detail.portName}\n`;
        if (detail.boatManagers.length > 0) {
          detail.boatManagers.forEach((bm, i) => {
            message += `   - ${bm.name} (${bm.phone}, ${bm.email})\n`;
          });
        } else {
          message += `   - Aucun Boat Manager trouvé\n`;
        }
      });

      message += `\nPour profiter pleinement de nos services, nous vous invitons à :\n`;
      message += `1. Compléter votre profil\n`;
      message += `2. Ajouter vos bateaux\n\n`;
      message += `Souhaitez-vous ajouter votre bateau maintenant ?`;

      if (Platform.OS === 'web') {
        if (window.confirm(message)) {
          setTimeout(() => router.push('/boats/new'), 0);
        } else {
          setTimeout(() => router.push('/(tabs)/profile'), 0);
        }
      } else {
        Alert.alert('Bienvenue sur Your Boat Manager !', message, [
          {
            text: 'Continuer',
            onPress: () => {
              Alert.alert(
                'Personnalisez Votre Application',
                'Profitez de l\'ensemble de ses fonctionnalités.',
                [
                  {
                    text: 'Ajouter vos bateaux',
                    style: 'default',
                    onPress: () => setTimeout(() => router.push('/boats/new'), 0),
                  },
                ]
              );
            },
          },
        ]);
      }
    };

    await showWelcomeMessage(welcomePorts);
    redirectUser(userProfile.role);
  }
};



  const loginWithSocial = async (provider: 'google' | 'apple', token: string, portId: string) => {
    // This function is not fully implemented as per the custom auth requirements.
    // Social login with custom auth requires a backend to handle the OAuth flow
    // and then create/login the user in your custom users table.
    // For now, it will just throw an error.
    throw new Error('La connexion sociale n\'est pas prise en charge avec l\'authentification personnalisée sans backend.');
  };

  const loginAsBoatManager = async (email: string, password: string) => {
  await login(email, password);
  const storedUserId = await SecureStore.getItemAsync('user_id');
  const currentUser = storedUserId ? await getAndSetUserProfile(storedUserId) : null; // ou retrouve à nouveau le profil
  if (currentUser?.role !== 'boat_manager') {
    await logout();
    throw new Error('Accès refusé : Ce compte n\'est pas un Boat Manager.');
  }
};

const loginAsNauticalCompany = async (email: string, password: string) => {
  await login(email, password);
  const storedUserId = await SecureStore.getItemAsync('user_id');
const currentUser = storedUserId ? await getAndSetUserProfile(storedUserId) : null;
  if (currentUser?.role !== 'nautical_company') {
    await logout();
    throw new Error('Accès refusé : Ce compte n\'est pas une Entreprise du nautisme.');
  }
};

const loginAsCorporate = async (email: string, password: string) => {
  await login(email, password);
  const storedUserId = await SecureStore.getItemAsync('user_id');
const currentUser = storedUserId ? await getAndSetUserProfile(storedUserId) : null;
  if (currentUser?.role !== 'corporate') {
    await logout();
    throw new Error('Accès refusé : Ce compte n\'est pas un Corporate.');
  }
};


  const logout = async () => {
    await clearSession();
    setIsAuthenticated(false);
    setUser(null);
    router.replace('/login');
  };

  const redirectUser = (role: UserRole) => {
    switch (role) {
      case 'pleasure_boater':
        router.replace('/(tabs)');
        break;
      case 'boat_manager':
        router.replace('/(boat-manager)/clients');
        break;
      case 'nautical_company':
        router.replace('/(nautical-company)/dashboard');
        break;
      case 'corporate':
        router.replace('/(corporate)/dashboard');
        break;
      default:
        router.replace('/login');
        break;
    }
  };



  const clearPendingServiceRequest = () => {
    setPendingServiceRequest(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        pendingServiceRequest,
        ports: availablePorts,
        login,
        signup,
        loginWithSocial,
        loginAsBoatManager,
        loginAsNauticalCompany,
        loginAsCorporate,
        logout,
        setPendingServiceRequest,
        clearPendingServiceRequest,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function withAuthCheck(WrappedComponent: React.ComponentType<any>) {
  return function AuthCheckedComponent(props: any) {
    const { isAuthenticated, setPendingServiceRequest, user } = useAuth();

    const sendServiceRequestEmail = async ({ requestType, requestData, user }: {
      requestType: string;
      requestData: any;
      user: User | null;
    }) => {
      if (!user || user.role !== 'pleasure_boater') {
        throw new Error('Utilisateur non autorisé');
      }

      const { data: userPortsData, error: userPortsError } = await supabase
        .from('user_ports')
        .select('port_id')
        .eq('user_id', user.id);

      if (userPortsError) {
        console.error('Error fetching user ports for email:', userPortsError);
        return;
      }

      const portIds = userPortsData.map(up => up.port_id);

      const { data: bmPortAssignments, error: bmPortAssignmentsError } = await supabase
        .from('user_ports')
        .select('user_id')
        .in('port_id', portIds);

      if (bmPortAssignmentsError) {
        console.error('Error fetching boat manager port assignments:', bmPortAssignmentsError);
        return;
      }

      const bmUserIds = [...new Set(bmPortAssignments.map(bmup => bmup.user_id))];

      const { data: boatManagersData, error: bmError } = await supabase
        .from('users')
        .select('e_mail, first_name, last_name')
        .in('id', bmUserIds)
        .eq('profile', 'boat_manager');

      if (bmError) {
        console.error('Error fetching boat managers for email:', bmError);
        return;
      }

      for (const bm of boatManagersData) {
        const emailContent = {
          to: bm.e_mail,
          subject: `Nouvelle demande de service - ${requestType}`,
          body: `
            Nouvelle demande de service reçue :
            
            Type de service : ${requestType}
            Client : ${user.firstName} ${user.lastName}
            Email : ${user.email}
            
            Détails de la demande :
            ${Object.entries(requestData)
              .map(([key, value]) => `${key}: ${value}`)
              .join('\n')}
          `,
        };
        console.log(`Sending email notification to ${bm.first_name} ${bm.last_name}:`, emailContent);
      }
    };

    const handleSubmit = async (formData: any) => {
      if (!isAuthenticated) {
        setPendingServiceRequest({
          type: props.title,
          data: formData,
        });
        router.push('/signup');
        return;
      }

      try {
        await sendServiceRequestEmail({
          requestType: props.title,
          requestData: formData,
          user,
        });

        props.onSubmit?.(formData);

        Alert.alert('Succès', 'Votre demande de service a été envoyée.');
        router.push('/(tabs)/requests');
      } catch (error) {
        console.error('Failed to submit service request:', error);
        Alert.alert('Erreur', 'Échec de l\'envoi de la demande de service.');
      }
    };

    return <WrappedComponent {...props} onSubmit={handleSubmit} />;
  };
}
