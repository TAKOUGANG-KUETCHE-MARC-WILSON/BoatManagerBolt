import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false, // ça reste false ici, pour les layouts parents
          headerBackTitleVisible: false, // ✅ cache le (tabs) à gauche de la flèche
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
  );
}
