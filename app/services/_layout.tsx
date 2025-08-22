import { Stack } from 'expo-router';

export default function ServicesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
      }}
    >
      <Stack.Screen name="sell" options={{ title: 'Vendre un bateau' }} />
      <Stack.Screen name="buy" options={{ title: 'Acheter un bateau' }} />
      <Stack.Screen name="maintenance" options={{ title: 'Maintenance' }} />
      <Stack.Screen name="improvement" options={{ title: 'Amélioration' }} />
      <Stack.Screen name="repair" options={{ title: 'Réparation' }} />
      <Stack.Screen name="control" options={{ title: 'Contrôle' }} />
      <Stack.Screen name="access" options={{ title: 'Accès à bord' }} />
      <Stack.Screen name="security" options={{ title: 'Sécurité' }} />
      <Stack.Screen name="other" options={{ title: 'Autre' }} />
      <Stack.Screen name="administrative" options={{ title: 'Démarches administratives' }} />
    </Stack>
  );
}
