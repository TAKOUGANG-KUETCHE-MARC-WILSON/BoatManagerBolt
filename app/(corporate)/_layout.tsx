// app/(corporate)/_layout.tsx
import { Platform, useWindowDimensions } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Chrome as Dashboard, FileText, MessageSquare, User } from 'lucide-react-native';
import { Logo } from '../../components/Logo';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// --- Notifications & logs (erreurs masquées côté client) ---
const GENERIC_ERR = "Une erreur est survenue. Veuillez réessayer.";
const notifyError = (msg?: string) => {
  // volontairement silencieux côté client
};
const logError = (scope: string, err: unknown) => {
  if (__DEV__) console.error(`[${scope}]`, err);
};

// -------- Responsive helpers --------
function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const isTablet = width >= 768;
  const isSmallPhone = width < 360;
  const scale = Math.min(Math.max(width / 390, 0.9), 1.2);
  return { width, height, isLandscape, isTablet, isSmallPhone, scale };
}

export default function CorporateTabLayout() {
  const { user } = useAuth();
  const r = useResponsive();

  // Redirection sécurisée (silencieuse côté client)
  useEffect(() => {
    try {
      if (user && user.role !== 'corporate') router.replace('/(tabs)');
    } catch (e) {
      logError('corporate-tabs.redirect', e);
      notifyError();
    }
  }, [user]);

  if (!user || user.role !== 'corporate') {
    return null; // pas de flash d’UI
  }

  const { tabBarHeight, tabBarPaddingBottom, iconSize, labelFontSize } = useMemo(() => {
    const tabBarHeight =
      Platform.OS === 'ios'
        ? (r.isTablet ? 68 : r.isSmallPhone ? 52 : 56)
        : (r.isTablet ? 62 : r.isSmallPhone ? 50 : 54);
    const tabBarPaddingBottom = Platform.OS === 'ios' ? (r.isTablet ? 12 : 8) : 6;
    const iconSize = r.isTablet ? 26 : r.isSmallPhone ? 20 : 22;
    const labelFontSize = r.isTablet ? 13 : r.isSmallPhone ? 10 : 12;
    return { tabBarHeight, tabBarPaddingBottom, iconSize, labelFontSize };
  }, [r.isTablet, r.isSmallPhone]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {/* Affiche la barre d’état (heure/batterie) au-dessus du contenu */}
      <StatusBar style="dark" hidden={false} translucent backgroundColor="transparent" />

      <Tabs
        screenOptions={{
          headerShown: true,
          headerTitle: () => <Logo size={r.isTablet ? 'medium' : 'small'} />,
          tabBarActiveTintColor: '#0066CC',
          tabBarInactiveTintColor: '#64748b',
          tabBarShowLabel: !r.isSmallPhone || r.isTablet,
          tabBarLabelStyle: {
            fontSize: labelFontSize,
            marginBottom: Platform.OS === 'ios' ? 0 : 2,
          },
          tabBarItemStyle: { paddingVertical: r.isTablet ? 6 : 2 },
          tabBarStyle: {
            height: tabBarHeight,
            paddingBottom: tabBarPaddingBottom,
          },

          // Assure la visibilité de la StatusBar
          statusBarHidden: false,
          statusBarStyle: Platform.OS === 'ios' ? 'dark' : 'auto',
          statusBarTranslucent: true,

          // Petits plus
          lazy: true,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Tableau de bord',
            tabBarIcon: ({ color }) => <Dashboard color={color} size={iconSize} />,
          }}
        />
        <Tabs.Screen
          name="requests"
          options={{
            title: 'Demandes',
            tabBarIcon: ({ color }) => <FileText color={color} size={iconSize} />,
          }}
        />
        <Tabs.Screen
          name="partners"
          options={{
            // Masqué de la barre d’onglets mais accessible par navigation
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messagerie',
            tabBarIcon: ({ color }) => <MessageSquare color={color} size={iconSize} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color }) => <User color={color} size={iconSize} />,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
