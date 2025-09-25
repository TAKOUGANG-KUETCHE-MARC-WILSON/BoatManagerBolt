// 👉 Ces deux imports d'amorçage doivent être tout en haut :
import 'react-native-get-random-values';
import 'react-native-reanimated';

declare const global: any;

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/context/AuthContext';
import { LogBox, Platform } from 'react-native';

if (__DEV__) {
  const origError = console.error;
  console.error = (...args: any[]) => {
    const safe = args.map((a) =>
      a instanceof Error
        ? (a.message ?? String(a)) // ne pas logguer l'objet Error brut
        : (a && typeof a === 'object' && ('message' in a || 'details' in a || 'hint' in a))
          ? (a.message ?? a.details ?? a.hint ?? JSON.stringify(a))
          : a
    );
    origError(...safe);
  };
}


export default function RootLayout() {
  useFrameworkReady();

  // ⚠️ PROD uniquement : on coupe les warnings/overlays et on redirige les logs
  useEffect(() => {
    if (__DEV__) return;

    LogBox.ignoreLogs([
      'Text strings must be rendered within a <Text> component',
    ]);
    LogBox.ignoreAllLogs(true);

    const origError = console.error;
    const origWarn  = console.warn;

    console.error = (..._args) => {
      // TODO: envoyer vers un service de logs (Sentry, API, etc.)
      return;
    };
    console.warn = (..._args) => {
      return;
    };

    const prevGlobalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
    (global as any).ErrorUtils?.setGlobalHandler?.((error: any, isFatal?: boolean) => {
      // TODO: capture error/isFatal → logs externes
      // Ne pas throw → pas de RedBox côté client en prod
    });

    return () => {
      console.error = origError;
      console.warn  = origWarn;
      if ((global as any).ErrorUtils && prevGlobalHandler) {
        (global as any).ErrorUtils.setGlobalHandler(prevGlobalHandler);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            headerBackTitleVisible: false,
            contentStyle: { backgroundColor: '#fff' },

           
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(boat-manager)" />
          <Stack.Screen name="(nautical-company)" />
          <Stack.Screen name="(corporate)" />
          <Stack.Screen name="services" />
          <Stack.Screen name="+not-found" />
        </Stack>

        {/* 👇 StatusBar globale, toujours visible */}
        <StatusBar
          hidden={false}
          style="dark"                          // mets "light" si ton header/fond est foncé
          translucent={false}
          backgroundColor="#ffffff"             // Android
        />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Fallback très simple si un rendu plante sous ce layout
export function ErrorBoundary() {
  return null; // ou un composant custom <CleanFallback />
}
