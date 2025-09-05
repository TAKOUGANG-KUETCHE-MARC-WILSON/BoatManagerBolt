import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ✅ à importer
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/context/AuthContext';
import { LogBox, Platform } from 'react-native';

export default function RootLayout() {
  useFrameworkReady();
  
// ⚠️ en PROD seulement : on coupe les warnings/overlays et on redirige les logs
  useEffect(() => {
    if (__DEV__) return;

    // 1) Couper les warnings “YellowBox/LogBox”
    LogBox.ignoreAllLogs(true);

    // 2) Rediriger console.error / console.warn (ex: vers Sentry ou ton API)
    const origError = console.error;
    const origWarn  = console.warn;
    console.error = (...args) => {
      // TODO: envoyer args vers ton service de logs
      // Sentry.captureException(new Error(String(args?.[0] ?? 'console.error')));
      // fetch('/logs', { ... })
      return; // rien n’apparaît côté UI
    };
    console.warn = (...args) => {
      // TODO: idem si tu veux suivre les warnings
      return;
    };

    // 3) Capturer les exceptions fatales JS (pas d’overlay côté client)
    const prevGlobalHandler = (global as any).ErrorUtils?.getGlobalHandler?.();
    (global as any).ErrorUtils?.setGlobalHandler?.((error: any, isFatal?: boolean) => {
      // TODO: envoyer error/isFatal à tes logs
      // Sentry.captureException(error);
      // fetch('/logs', { ... })
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
    <SafeAreaProvider> {/* ✅ wrapper pour encoche/caméra */}
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            headerBackTitleVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(boat-manager)" />
          <Stack.Screen name="(nautical-company)" />
          <Stack.Screen name="(corporate)" />
          <Stack.Screen name="services" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}


export function ErrorBoundary() {
  // écran très simple et propre côté client si un rendu plante
  return null; // ou un composant maison <CleanFallback />
}