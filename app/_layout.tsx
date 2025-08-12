import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // ✅ à importer
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout() {
  useFrameworkReady();

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
