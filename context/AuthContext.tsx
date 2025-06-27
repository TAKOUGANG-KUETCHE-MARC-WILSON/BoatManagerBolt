import { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';

interface ServiceRequest {
  type: string;
  data: any;
}

interface Port {
  id: string;
  name: string;
  boatManagerId: string;
}

interface BoatManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  ports: string[];
  avatar: string;
}

export type UserRole = 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'corporate';

interface BaseUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatar?: string;
}

interface PleasureBoater extends BaseUser {
  role: 'pleasure_boater';
  ports: Array<{
    portId: string;
    boatManagerId: string;
  }>;
}

interface BoatManagerUser extends BaseUser {
  role: 'boat_manager';
}

interface NauticalCompany extends BaseUser {
  role: 'nautical_company';
  companyName: string;
  siret: string;
  address: string;
  services: string[];
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
  loginWithSocial: (provider: 'google' | 'apple', token: string, portId: string) => Promise<void>;
  loginAsBoatManager: (email: string, password: string) => Promise<void>;
  loginAsNauticalCompany: (email: string, password: string) => Promise<void>;
  loginAsCorporate: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setPendingServiceRequest: (request: ServiceRequest | null) => void;
  clearPendingServiceRequest: () => void;
}

const mockPorts: Port[] = [
  { id: 'p1', name: 'Port de Marseille', boatManagerId: 'bm1' },
  { id: 'p2', name: 'Port de Nice', boatManagerId: 'bm2' },
  { id: 'p3', name: 'Port de Cannes', boatManagerId: 'bm3' },
  { id: 'p4', name: 'Port de Saint-Tropez', boatManagerId: 'bm4' },
];

const mockBoatManagers: BoatManager[] = [
  { 
    id: 'bm1', 
    name: 'Marie Martin', 
    email: 'marie.martin@ybm.com', 
    phone: '+33612345678', 
    ports: ['p1'],
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop'
  },
  { 
    id: 'bm2', 
    name: 'Pierre Dubois', 
    email: 'pierre.dubois@ybm.com', 
    phone: '+33623456789', 
    ports: ['p2'],
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop'
  },
  { 
    id: 'bm3', 
    name: 'Sophie Laurent', 
    email: 'sophie.laurent@ybm.com', 
    phone: '+33634567890', 
    ports: ['p3'],
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=2070&auto=format&fit=crop'
  },
  { 
    id: 'bm4', 
    name: 'Lucas Bernard', 
    email: 'lucas.bernard@ybm.com', 
    phone: '+33645678901', 
    ports: ['p4'],
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop'
  },
];

const mockNauticalCompanies: NauticalCompany[] = [
  {
    id: 'nc1',
    email: 'contact@nautismepro.com',
    firstName: 'Jean',
    lastName: 'Martin',
    role: 'nautical_company',
    companyName: 'Nautisme Pro',
    siret: '12345678900001',
    address: '123 Avenue du Port, 13000 Marseille',
    avatar: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop',
    services: ['maintenance', 'repair', 'installation'],
    ports: ['p1', 'p2'],
    certifications: ['Expert Maritime', 'Certification Technique Nautique'],
    permissions: {
      canManageServices: true,
      canManageBookings: true,
      canAccessFinancials: true,
      canManageStaff: true,
    },
  },
];

const mockCorporateUsers: CorporateUser[] = [
  {
    id: 'corp1',
    email: 'admin@ybm.com',
    firstName: 'Admin',
    lastName: 'YBM',
    role: 'corporate',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    permissions: {
      canManageUsers: true,
      canManageRoles: true,
      canManagePartners: true,
      canAccessFinancials: true,
    },
  },
];

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  pendingServiceRequest: null,
  ports: mockPorts,
  login: async () => {},
  loginWithSocial: async () => {},
  loginAsBoatManager: async () => {},
  loginAsNauticalCompany: async () => {},
  loginAsCorporate: async () => {},
  logout: () => {},
  setPendingServiceRequest: () => {},
  clearPendingServiceRequest: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pendingServiceRequest, setPendingServiceRequest] = useState<ServiceRequest | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Set isReady to true after the initial render
    setIsReady(true);
  }, []);

  const showWelcomeMessage = (ports: Array<{portId: string, boatManagerId: string}>) => {
    // Récupérer les informations des ports et des boat managers
    const portDetails = ports.map(port => {
      const portInfo = mockPorts.find(p => p.id === port.portId);
      const boatManager = mockBoatManagers.find(bm => bm.id === port.boatManagerId);
      return {
        portName: portInfo?.name || 'Port inconnu',
        boatManagerName: boatManager?.name || 'Boat Manager inconnu',
        boatManagerPhone: boatManager?.phone || '',
        boatManagerEmail: boatManager?.email || ''
      };
    });

    if (Platform.OS === 'web') {
      let message = `Bienvenue sur Your Boat Manager !\n\n`;
      message += `Un Boat Manager vous a été affecté :\n\n`;
      
      portDetails.forEach((detail, index) => {
        message += `${index + 1}. ${detail.portName} - ${detail.boatManagerName}\n`;
        message += `   Contact : ${detail.boatManagerPhone} / ${detail.boatManagerEmail}\n`;
      });
      
      message += `\nPour profiter pleinement de nos services, nous vous invitons à :\n`;
      message += `1. Compléter votre profil\n`;
      message += `2. Ajouter vos bateaux\n\n`;
      message += `Souhaitez-vous ajouter votre bateau maintenant ?`;

      if (window.confirm(message)) {
        setTimeout(() => router.push('/boats/new'), 0);
      } else {
        setTimeout(() => router.push('/(tabs)/profile'), 0);
      }
    } else {
      let message = `Votre demande a bien été transmise !\n\n`;
      message += `Un Boat Manager vous a été affecté :\n\n`;
      
      portDetails.forEach((detail, index) => {
        message += `${index + 1}. ${detail.portName} - ${detail.boatManagerName}\n`;
      });

      Alert.alert(
        'Bienvenue sur Your Boat Manager !',
        message,
        [
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
        ]
      );
    }
  };

  const login = async (email: string, password: string, portId?: string) => {
    if (!isReady) {
      throw new Error('Application not ready');
    }

    if (!portId) {
      throw new Error('Port requis pour les plaisanciers');
    }

    const port = mockPorts.find(p => p.id === portId);
    if (!port) {
      throw new Error('Port non trouvé');
    }

    const boatManager = mockBoatManagers.find(bm => bm.id === port.boatManagerId);
    if (!boatManager) {
      throw new Error('Boat Manager non trouvé');
    }

    setIsAuthenticated(true);
    setUser({
      id: '1',
      email,
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'pleasure_boater',
      avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
      ports: [
        {
          portId,
          boatManagerId: boatManager.id
        }
      ]
    });

    showWelcomeMessage([{ portId, boatManagerId: boatManager.id }]);
  };

  const loginWithSocial = async (provider: 'google' | 'apple', token: string, portId: string) => {
    if (!isReady) {
      throw new Error('Application not ready');
    }
    
    const port = mockPorts.find(p => p.id === portId);
    if (!port) {
      throw new Error('Port non trouvé');
    }

    const boatManager = mockBoatManagers.find(bm => bm.id === port.boatManagerId);
    if (!boatManager) {
      throw new Error('Boat Manager non trouvé');
    }

    setIsAuthenticated(true);
    setUser({
      id: `social-${Date.now()}`,
      email: provider === 'google' ? 'user@gmail.com' : 'user@icloud.com',
      firstName: provider === 'google' ? 'Utilisateur' : 'Apple',
      lastName: 'Social',
      role: 'pleasure_boater',
      avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
      ports: [
        {
          portId,
          boatManagerId: boatManager.id
        }
      ]
    });

    showWelcomeMessage([{ portId, boatManagerId: boatManager.id }]);
  };

  const loginAsBoatManager = async (email: string, password: string) => {
    if (!isReady) {
      throw new Error('Application not ready');
    }

    const boatManager = mockBoatManagers.find(bm => bm.email === email);
    if (!boatManager) {
      throw new Error('Identifiants invalides');
    }

    setIsAuthenticated(true);
    setUser({
      id: boatManager.id,
      email: boatManager.email,
      firstName: boatManager.name.split(' ')[0],
      lastName: boatManager.name.split(' ')[1],
      role: 'boat_manager',
      avatar: boatManager.avatar
    });

    setTimeout(() => router.replace('/(boat-manager)/clients'), 0);
  };

  const loginAsNauticalCompany = async (email: string, password: string) => {
    if (!isReady) {
      throw new Error('Application not ready');
    }

    const company = mockNauticalCompanies.find(nc => nc.email === email);
    if (!company) {
      throw new Error('Identifiants invalides');
    }

    setIsAuthenticated(true);
    setUser(company);

    setTimeout(() => router.replace('/(nautical-company)/dashboard'), 0);
  };

  const loginAsCorporate = async (email: string, password: string) => {
    if (!isReady) {
      throw new Error('Application not ready');
    }

    const corporateUser = mockCorporateUsers.find(u => u.email === email);
    if (!corporateUser) {
      throw new Error('Identifiants invalides');
    }

    setIsAuthenticated(true);
    setUser(corporateUser);

    setTimeout(() => router.replace('/(corporate)/dashboard'), 0);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
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
        ports: mockPorts,
        login,
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
  return useContext(AuthContext);
}

export function withAuthCheck(WrappedComponent: React.ComponentType<any>) {
  return function AuthCheckedComponent(props: any) {
    const { isAuthenticated, setPendingServiceRequest, user } = useAuth();

    const handleSubmit = async (formData: any) => {
      if (!isAuthenticated) {
        setPendingServiceRequest({
          type: props.title,
          data: formData,
        });
        setTimeout(() => router.push('/signup'), 0);
        return;
      }
      
      try {
        await sendServiceRequestEmail({
          requestType: props.title,
          requestData: formData,
          user,
        });

        props.onSubmit?.(formData);
        
        setTimeout(() => router.push('/(tabs)/requests'), 0);
      } catch (error) {
        console.error('Failed to submit service request:', error);
      }
    };

    return <WrappedComponent {...props} onSubmit={handleSubmit} />;
  };
}

async function sendServiceRequestEmail({ requestType, requestData, user }: {
  requestType: string;
  requestData: any;
  user: User | null;
}) {
  if (!user || user.role !== 'pleasure_boater') {
    throw new Error('Utilisateur non autorisé');
  }

  // Pour chaque port, envoyer un email au Boat Manager correspondant
  for (const portAssignment of user.ports) {
    const boatManager = mockBoatManagers.find(bm => bm.id === portAssignment.boatManagerId);
    
    if (!boatManager) {
      console.error(`Boat Manager non trouvé pour le port ${portAssignment.portId}`);
      continue;
    }

    const port = mockPorts.find(p => p.id === portAssignment.portId);
    
    const emailContent = {
      to: boatManager.email,
      subject: `Nouvelle demande de service - ${requestType}`,
      body: `
        Nouvelle demande de service reçue :
        
        Type de service : ${requestType}
        Client : ${user.firstName} ${user.lastName}
        Email : ${user.email}
        Port : ${port?.name || 'Non spécifié'}
        
        Détails de la demande :
        ${Object.entries(requestData)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')}
      `,
    };

    console.log(`Sending email notification to ${boatManager.name}:`, emailContent);
  }
}