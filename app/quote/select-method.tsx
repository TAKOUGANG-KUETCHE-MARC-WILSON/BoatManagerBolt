// app/(boat-manager)/quote/select-method.tsx
import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Plus, Upload } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ---------- Notifs + logs (masquées côté client) ----------
const notifyError = (msg: string) => {
  if (Platform.OS === 'android') {
    // @ts-ignore
    import('react-native').then(({ ToastAndroid }) =>
      ToastAndroid.show(msg, ToastAndroid.LONG)
    );
  } else {
    // @ts-ignore
    import('react-native').then(({ Alert }) => Alert.alert('Oups', msg));
  }
};
const devError = (scope: string, err: unknown) => {
  if (__DEV__) console.error(`[${scope}]`, err);
};

export default function SelectQuoteMethodScreen() {
  const insets = useSafeAreaInsets();
  const rawParams = useLocalSearchParams();

  // Normalise params: string | string[] -> string
  const params = useMemo(() => {
    const obj: Record<string, string> = {};
    Object.entries(rawParams).forEach(([k, v]) => {
      obj[k] = Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
    });
    return obj;
  }, [rawParams]);

  const handleCreateNewQuote = useCallback(() => {
    try {
      router.push({ pathname: '/quote/new', params });
    } catch (e) {
      devError('nav:create-new-quote', e);
      notifyError("Navigation impossible vers la création du devis.");
    }
  }, [params]);

  const handleUploadQuoteDocument = useCallback(() => {
    try {
      router.push({ pathname: '/quote/upload-document', params });
    } catch (e) {
      devError('nav:upload-quote-document', e);
      notifyError("Navigation impossible vers le dépôt de document.");
    }
  }, [params]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Revenir en arrière"
          style={styles.backButton}
          onPress={() => {
            try {
              router.back();
            } catch (e) {
              devError('nav:back', e);
              notifyError('Retour impossible.');
            }
          }}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          Sélectionner une méthode de devis
        </Text>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.description}>
          Comment souhaitez-vous gérer ce devis ?
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.optionButton}
          onPress={handleCreateNewQuote}
        >
          <Plus size={24} color="#0066CC" />
          <Text style={styles.optionButtonText}>Créer un nouveau devis</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.optionButton}
          onPress={handleUploadQuoteDocument}
        >
          <Upload size={24} color="#0066CC" />
          <Text style={styles.optionButtonText}>Déposer un document de devis</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
    width: '86%',
    maxWidth: 360,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
});
