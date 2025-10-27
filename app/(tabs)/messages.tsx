// app/(tabs)/messages.tsx
import * as WebBrowser from 'expo-web-browser';
import { useState, useRef, useEffect, useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Alert,
  ToastAndroid,
  BackHandler,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Search,
  ChevronLeft,
  Building,
  X,
  CheckCheck,
  Check,
  MessageSquare,
  FileText,
  User as UserIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_BAR_MIN_HEIGHT } from '@/components/ChatInput';
import { useAuth } from '@/context/AuthContext';
import ChatInput from '@/components/ChatInput';
import { supabase } from '@/src/lib/supabase';
import { refreshAppBadge } from '@/src/notifications/boot';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

// ---------- Config Storage ----------
const ATTACHMENTS_BUCKET = 'chat.attachments';
const ATTACHMENTS_BUCKET_IS_PUBLIC = true;
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

// ---------- Notifs + logs ----------
const notifyError = (msg: string) => {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);
  else Alert.alert('Oups', msg);
};
const notifyInfo = (msg: string) => {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert('', msg);
};
const devError = (scope: string, err: unknown) => {
  if (!__DEV__) return;
  const msg =
    err && typeof err === 'object'
      ? ((err as any).message ??
         (err as any).details ??
         (err as any).hint ??
         JSON.stringify(err))
      : String(err);
  console.log(`[${scope}] ${msg}`);
};
const maskAndNotify = (scope: string, err: unknown, userMsg = 'Une erreur est survenue.') => {
  devError(scope, err);
  notifyError(userMsg);
};

// ---------- Avatars / fichiers ----------
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';
const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));
const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.heic', '.heif'];
const isImageUrl = (url?: string) => {
  if (!url) return false;
  const q = (url.split('?')[0] || '').toLowerCase();
  return IMAGE_EXTS.some(ext => q.endsWith(ext));
};
const getSignedAvatarUrl = async (value?: string) => {
  if (!value) return DEFAULT_AVATAR;
  if (isHttpUrl(value)) return value;
  const { data } = await supabase.storage.from('avatars').createSignedUrl(value, 60 * 60);
  return data?.signedUrl || DEFAULT_AVATAR;
};
const guessMimeFromName = (name?: string) => {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.heif')) return 'image/heif';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  return undefined;
};

// ---------- Types ----------
interface Message {
  id: number;
  senderId: number;
  content?: string;
  image?: string;
  file?: { name: string; uri: string; type: string };
  timestamp: Date;
  readByAll?: boolean;
}
interface Contact {
  id: number;
  name: string;
  avatar: string;
  type: 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'corporate';
  email: string;
  phone: string;
  details?: string;
  online?: boolean;
}
interface Chat {
  id: number;
  participants: Contact[];
  isGroup: boolean;
  name?: string;
  unreadCount?: number;
  lastMessage?: Message;
  messages?: Message[];
}

// ---------- Utils dates + tri (smart) ----------
const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isYesterday = (d: Date, now = new Date()) => {
  const y = new Date(now); y.setDate(y.getDate() - 1);
  return isSameDay(d, y);
};
const isSameYear = (a: Date, b: Date) => a.getFullYear() === b.getFullYear();
const diffDays = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}
export function formatSmartListTimestamp(d: Date, now = new Date()) {
  if (isSameDay(d, now)) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (isYesterday(d, now)) return 'Hier';
  const days = diffDays(d, now);
  if (days <= 6) {
    return d.toLocaleDateString('fr-FR', { weekday: 'short' });
  }
  if (isSameYear(d, now)) {
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function formatDayHeader(d: Date, now = new Date()) {
  if (isSameDay(d, now)) return 'Aujourd’hui';
  if (isYesterday(d, now)) return 'Hier';
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    year: isSameYear(d, now) ? undefined : 'numeric',
  });
}

export function formatSmartBubbleTime(d: Date, now = new Date()) {
  if (isSameDay(d, now)) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (isSameYear(d, now)) {
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function sortChatsByLastActivity(list: Chat[]) {
  return [...list].sort((a, b) => {
    const ta = a.lastMessage?.timestamp?.getTime?.() ?? 0;
    const tb = b.lastMessage?.timestamp?.getTime?.() ?? 0;
    return tb - ta;
  });
}

// ---------- Modal création conversation ----------
const NewConversationModal = ({
  visible,
  onClose,
  allUsers,
  user,
  contactSearchQuery,
  setContactSearchQuery,
  selectedContacts,
  setSelectedContacts,
  selectedContactType,
  setSelectedContactType,
  handleCreateConversation,
  isCreatingConversation,
  getContactTypeIcon,
  getContactTypeLabel,
  getContactTypeColor,
}: any) => {
  const filteredContacts = allUsers.filter((c: Contact) => {
    if (c.id === Number(user?.id)) return false;
    const q = (contactSearchQuery || '').toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.details && c.details.toLowerCase().includes(q));
    const matchesType = selectedContactType === 'all' || c.type === selectedContactType;
    return matchesSearch && matchesType;
  });

  const toggle = (contact: Contact) =>
    setSelectedContacts((prev: Contact[]) =>
      prev.some(c => c.id === contact.id) ? prev.filter(c => c.id !== contact.id) : [...prev, contact]
    );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouvelle conversation</Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                  <X size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.contactTypeFilter}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    { key: 'all', label: 'Tous', color: '#666', icon: null },
                    { key: 'pleasure_boater', label: 'Plaisanciers', color: '#0EA5E9', icon: <UserIcon size={16} color="#0EA5E9" /> },
                    { key: 'boat_manager', label: 'Boat Managers', color: '#10B981', icon: <UserIcon size={16} color="#10B981" /> },
                    { key: 'nautical_company', label: 'Entreprises', color: '#8B5CF6', icon: <Building size={16} color="#8B5CF6" /> },
                    { key: 'corporate', label: 'Corporate', color: '#F59E0B', icon: <Building size={16} color="#F59E0B" /> },
                  ].map(({ key, label, color, icon }) => {
                    const active = selectedContactType === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[styles.contactTypeButton, active && styles.contactTypeButtonActive, { borderColor: color }]}
                        onPress={() => setSelectedContactType(key)}
                      >
                        {icon}
                        <Text
                          style={[
                            styles.contactTypeButtonText,
                            active && styles.contactTypeButtonTextActive,
                            { color: active ? 'white' : color },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.modalSearchContainer}>
                <Search size={20} color="#666" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Rechercher un contact..."
                  value={contactSearchQuery}
                  onChangeText={setContactSearchQuery}
                />
              </View>

              {!!selectedContacts.length && (
                <View style={styles.selectedContactsContainer}>
                  <Text style={styles.selectedContactsTitle}>
                    Contacts sélectionnés ({selectedContacts.length})
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedContactsScroll}>
                    {selectedContacts.map((c: Contact) => (
                      <View key={c.id} style={styles.selectedContactChip}>
                        <Image source={{ uri: c.avatar }} style={styles.selectedContactAvatar} />
                        <Text style={styles.selectedContactName}>{c.name}</Text>
                        <TouchableOpacity style={styles.removeSelectedContactButton} onPress={() => toggle(c)}>
                          <X size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <ScrollView style={styles.contactsList} keyboardShouldPersistTaps="handled">
                {filteredContacts.map((c: Contact) => {
                  const active = selectedContacts.some((s: Contact) => s.id === c.id);
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.contactItem, active && styles.contactItemSelected]}
                      onPress={() => toggle(c)}
                    >
                      <View style={styles.contactItemLeft}>
                        <Image source={{ uri: c.avatar }} style={styles.contactItemAvatar} />
                        <View style={styles.contactItemInfo}>
                          <Text style={styles.contactItemName}>{c.name}</Text>
                          <View style={styles.contactItemTypeContainer}>
                            {getContactTypeIcon(c.type)}
                            <Text style={[styles.contactItemType, { color: getContactTypeColor(c.type) }]}>
                              {getContactTypeLabel(c.type)}
                            </Text>
                          </View>
                          {!!c.details && <Text style={styles.contactItemDetails}>{c.details}</Text>}
                        </View>
                      </View>
                      <View style={[styles.contactItemCheckbox, active && styles.contactItemCheckboxSelected]}>
                        {active && <Check size={16} color="white" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.createConversationButton, !selectedContacts.length && styles.createConversationButtonDisabled]}
                  onPress={handleCreateConversation}
                  disabled={!selectedContacts.length || isCreatingConversation}
                >
                  {isCreatingConversation ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <MessageSquare size={20} color="white" />
                      <Text style={styles.createConversationButtonText}>Créer la conversation</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const AuthOverlay = () => (
  <View style={overlayStyles.overlayContainer}>
    <View style={overlayStyles.authCard}>
      <Text style={overlayStyles.authTitle}>Connexion requise</Text>
      <Text style={overlayStyles.authSubtitle}>
        Pour suivre et envoyer vos messages, connectez-vous à votre compte.
      </Text>
      <TouchableOpacity
        style={overlayStyles.authButton}
        onPress={() => router.replace('/welcome-unauthenticated')}
      >
        <Text style={overlayStyles.authButtonText}>Se connecter</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ---------- Écran principal ----------
type PendingAttachment = { uri: string; name?: string; mime?: string; isImage?: boolean };

export default function MessagesScreen() {
  const { conversationId, client: initialClientId } =
    useLocalSearchParams<{ conversationId?: string; client?: string }>();

  const { user } = useAuth();
  const currentUserId = Number(user?.id);
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight?.() ?? 0;
  const [headerHeight, setHeaderHeight] = useState(0);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftText, setDraftText] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedContactType, setSelectedContactType] =
    useState<'all' | 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'corporate'>('all');
  const [allUsers, setAllUsers] = useState<Contact[]>([]);

  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // hauteur mesurée (Preview PJ + barre d'input). Sert au padding du ScrollView.
  const [inputBarHeight, setInputBarHeight] = useState(INPUT_BAR_MIN_HEIGHT);

  // ✅ PJ en attente
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);

  // Helper: scroll-to-end fiable (après layout/clavier)
  const scrollToEndSoon = useCallback((delay = 50, animated = true) => {
    requestAnimationFrame(() => {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated }), delay);
    });
  }, []);


// Intercepte le bouton retour Android pour prioriser nos états locaux
useFocusEffect(
  useCallback(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      // ordre de fermeture : modales/menus -> clavier -> preview PJ -> sortir du détail
      if (showNewConversationModal) {
        setShowNewConversationModal(false);
        return true;
      }
      if (showAttachmentOptions) {
        setShowAttachmentOptions(false);
        return true;
      }
      if (isKeyboardVisible) {
        Keyboard.dismiss();
        return true;
      }
      if (pendingAttachment) {
        setPendingAttachment(null);
        return true;
      }
      if (activeChat) {
        setActiveChat(null);
        return true;
      }
      // rien à gérer côté écran -> laisser la nav par défaut (changer d’onglet / quitter)
      return false;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [
    activeChat,
    showNewConversationModal,
    showAttachmentOptions,
    isKeyboardVisible,
    pendingAttachment,
  ])
);


  // --------- Création / recherche d'une 1–1 via param `client` ----------
  const findOrCreateConversationWithClient = useCallback(
    async (targetClientId: number): Promise<Chat | null> => {
      if (!user?.id) return null;

      setIsCreatingConversation(true);
      try {
        const { data: memberRows, error: convErr } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', Number(user.id));
        if (convErr) throw convErr;

        let foundId: number | null = null;
        for (const row of memberRows || []) {
          const convId = Number(row.conversation_id);
          const { data: members, error: mErr } = await supabase
            .from('conversation_members')
            .select('user_id')
            .eq('conversation_id', convId);
          if (mErr) continue;
          const ids = (members || []).map(m => Number(m.user_id)).sort();
          const expected = [Number(user.id), targetClientId].sort();
          if (ids.length === 2 && ids[0] === expected[0] && ids[1] === expected[1]) { foundId = convId; break; }
        }

        const hydrateConv = async (id: number): Promise<Chat> => {
          const { data: conv, error } = await supabase
            .from('conversations')
            .select('id, title, is_group, conversation_members(user_id, users(id, first_name, last_name, avatar, e_mail, phone, profile))')
            .eq('id', id)
            .single();
          if (error || !conv) throw error;

          const participants: Contact[] = await Promise.all(
            (conv.conversation_members || []).map(async (p: any) => ({
              id: Number(p.users.id),
              name: `${p.users.first_name} ${p.users.last_name}`,
              avatar: await getSignedAvatarUrl(p.users.avatar),
              type: p.users.profile,
              email: p.users.e_mail,
              phone: p.users.phone,
            }))
          );

          return { id: Number(conv.id), name: conv.title, isGroup: conv.is_group, participants, unreadCount: 0 };
        };

        if (foundId) return await hydrateConv(foundId);

        // sinon créer via RPC
        const { data: convId, error: rpcErr } = await supabase.rpc(
          'create_conversation_with_members',
          {
            p_actor_id: Number(user.id),
            p_member_ids: [Number(targetClientId)],
            p_title: null,
            p_is_group: false,
          }
        );

        if (rpcErr) throw rpcErr;

        return await hydrateConv(Number(convId));
      } catch (e) {
        maskAndNotify('findOrCreateConversationWithClient', e, 'Impossible de démarrer la conversation.');
        return null;
      } finally {
        setIsCreatingConversation(false);
      }
    },
    [user]
  );

  // 👂 clavier (Android & iOS)
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = () => { setKeyboardVisible(true); scrollToEndSoon(60); };
    const onHide = () => setKeyboardVisible(false);
    const showSub = Keyboard.addListener(showEvt, onShow);
    const hideSub = Keyboard.addListener(hideEvt, onHide);
    return () => { showSub.remove(); hideSub.remove(); };
  }, [scrollToEndSoon]);

  // --------- Realtime: nouveaux messages toutes conversations ----------
  useEffect(() => {
    if (!user?.id || chats.length === 0) return;
    const knownIds = new Set(chats.map(c => c.id));

    const channel = supabase
      .channel(`messages-global-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        const n = payload.new as any;
        const convId = Number(n.conversation_id);
        if (!knownIds.has(convId)) return;

        const msg: Message = {
          id: Number(n.id),
          senderId: Number(n.sender_id),
          content: n.content ?? undefined,
          image: isImageUrl(n.file_url) ? n.file_url : undefined,
          file: n.file_url && !isImageUrl(n.file_url)
            ? { name: n.file_url.split('/').pop() || 'document', uri: n.file_url, type: 'application/octet-stream' }
            : undefined,
          timestamp: new Date(n.created_at),
        };

        setChats(prev => {
          const next = prev.map(c => c.id === convId ? { ...c, lastMessage: msg } : c);
          return sortChatsByLastActivity(next);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, chats]);

  // --------- Récup init : contacts + conversations + non-lus ----------
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!user?.id) { setIsLoadingChats(false); return; }
      setIsLoadingChats(true);
      try {
        const { data: uData, error: uErr } = await supabase
          .rpc('get_contacts_for_boat_manager', { manager_id: Number(user.id) });
        if (uErr) throw uErr;

        const contacts: Contact[] = await Promise.all(
          (uData || []).map(async (u: any) => ({
            id: Number(u.id),
            name: `${u.first_name} ${u.last_name}`,
            avatar: await getSignedAvatarUrl(u.avatar),
            type: u.profile,
            email: u.e_mail,
            phone: u.phone,
            details: u.details,
          }))
        );
        if (!alive) return;
        setAllUsers(contacts);

        const { data: memberRows, error: mErr } = await supabase
          .from('conversation_members')
          .select('conversation_id, conversations(id, title, is_group)')
          .eq('user_id', Number(user.id));
        if (mErr) throw mErr;

        const convs = memberRows?.map(r => r.conversations).filter(Boolean) || [];

        const hydrated: Chat[] = await Promise.all(convs.map(async (conv: any) => {
          const [participantsRes, lastMsgRes] = await Promise.all([
            supabase
              .from('conversation_members')
              .select('user_id, users(id, first_name, last_name, avatar, e_mail, phone, profile)')
              .eq('conversation_id', Number(conv.id)),
            supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', Number(conv.id))
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          const participants: Contact[] = await Promise.all(
            (participantsRes.data || []).map(async (p: any) => ({
              id: Number(p.users.id),
              name: `${p.users.first_name} ${p.users.last_name}`,
              avatar: await getSignedAvatarUrl(p.users.avatar),
              type: p.users.profile,
              email: p.users.e_mail,
              phone: p.users.phone,
            }))
          );

          const lastData = lastMsgRes.data;
          const lastMessage: Message | undefined = lastData ? {
            id: Number(lastData.id),
            senderId: Number(lastData.sender_id),
            content: lastData.content ?? undefined,
            image: isImageUrl(lastData.file_url) ? lastData.file_url : undefined,
            file: lastData.file_url && !isImageUrl(lastData.file_url)
              ? { name: lastData.file_url.split('/').pop() || 'document', uri: lastData.file_url, type: 'application/octet-stream' }
              : undefined,
            timestamp: new Date(lastData.created_at),
          } : undefined;

          return { id: Number(conv.id), name: conv.title, isGroup: conv.is_group, participants, lastMessage, unreadCount: 0 };
        }));

        if (!alive) return;

        const ids = hydrated.map(c => c.id);
        let unreadMap = new Map<number, number>();
        if (ids.length) {
          const { data: unreads } = await supabase
            .from('user_conversation_unreads')
            .select('conversation_id, unread_count')
            .eq('user_id', Number(user.id))
            .in('conversation_id', ids);
          unreadMap = new Map((unreads || []).map((r: any) => [Number(r.conversation_id), Number(r.unread_count || 0)]));
        }

        const withCounts = hydrated.map(c => ({ ...c, unreadCount: unreadMap.get(c.id) ?? 0 }));
        setChats(sortChatsByLastActivity(withCounts));

        // Navigation initiale
        if (conversationId) {
          const byId = withCounts.find(c => String(c.id) === String(conversationId));
          if (byId) setActiveChat(byId);
        } else if (initialClientId) {
          const targetId = Number(initialClientId);
          const existing = withCounts.find(c => !c.isGroup && c.participants.some(p => p.id === targetId));
          if (existing) setActiveChat(existing);
          else {
            const created = await findOrCreateConversationWithClient(targetId);
            if (created && alive) {
              setChats(prev => sortChatsByLastActivity([{ ...created, unreadCount: 0 }, ...prev]));
              setActiveChat(created);
              notifyInfo('Conversation créée.');
            }
          }
        }
      } catch (e) {
        maskAndNotify('fetchInitialData', e, 'Impossible de charger vos conversations.');
      } finally {
        if (alive) setIsLoadingChats(false);
      }
    };
    run();
    return () => { alive = false; };
  }, [user, conversationId, initialClientId, findOrCreateConversationWithClient]);

  // --------- Messages de la conversation active ----------
  useEffect(() => {
    let alive = true;
    const fetchMessages = async () => {
      if (!activeChat?.id) { setMessages([]); return; }
      setIsLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', Number(activeChat.id))
          .order('created_at', { ascending: true });
        if (error) throw error;

        if (!alive) return;
        const baseMsgs = (data || []).map((m: any) => ({
          id: Number(m.id),
          senderId: Number(m.sender_id),
          content: m.content ?? undefined,
          image: isImageUrl(m.file_url) ? m.file_url : undefined,
          file: m.file_url && !isImageUrl(m.file_url)
            ? { name: m.file_url.split('/').pop() || 'document', uri: m.file_url, type: 'application/octet-stream' }
            : undefined,
          timestamp: new Date(m.created_at),
        })) as Message[];

        // ✅ Statut "lu par tous"
        try {
          const ids = baseMsgs.map(m => m.id);
          if (ids.length) {
            const { data: recs } = await supabase
              .from('message_read_receipts_v')
              .select('message_id, read_by_all')
              .in('message_id', ids);
            const byId = new Map((recs || []).map((r: any) => [Number(r.message_id), !!r.read_by_all]));
            baseMsgs.forEach(m => { m.readByAll = byId.get(m.id); });
          }
        } catch (e) {
          devError('fetch receipts', e);
        }

        setMessages(baseMsgs);

        // ✅ marque comme lu
        if (user?.id) {
          await supabase
            .from('conversation_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', Number(activeChat.id))
            .eq('user_id', Number(user.id));
          await refreshAppBadge(Number(user.id));
          setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, unreadCount: 0 } : c));
        }
      } catch (e) {
        maskAndNotify('fetchMessages', e, 'Impossible de charger les messages.');
        setMessages([]);
      } finally {
        if (alive) {
          setIsLoadingMessages(false);
          scrollToEndSoon(80);
        }
      }
    };
    fetchMessages();
    return () => { alive = false; };
  }, [activeChat, user?.id, scrollToEndSoon]);

  // --------- Realtime nouveaux messages (de cette conversation) ----------
  useEffect(() => {
    if (!activeChat?.id) return;
    const channel = supabase
      .channel(`conversation-${activeChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${Number(activeChat.id)}`,
        },
        async (payload) => {
          const n = payload.new as any;
          const newMsg: Message = {
            id: Number(n.id),
            senderId: Number(n.sender_id),
            content: n.content ?? undefined,
            image: isImageUrl(n.file_url) ? n.file_url : undefined,
            file: n.file_url && !isImageUrl(n.file_url)
              ? { name: n.file_url.split('/').pop() || 'document', uri: n.file_url, type: 'application/octet-stream' }
              : undefined,
            timestamp: new Date(n.created_at),
          };
          setMessages(prev => [...prev, newMsg]);

          // si le message vient d’un autre, marque comme lu
          if (user?.id && Number(n.sender_id) !== Number(user.id)) {
            try {
              await supabase
                .from('conversation_members')
                .update({ last_read_at: new Date().toISOString() })
                .eq('conversation_id', Number(activeChat.id))
                .eq('user_id', Number(user.id));
              await refreshAppBadge(Number(user.id));
              setChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, unreadCount: 0 } : c));
            } catch (e) {
              devError('mark read on live insert', e);
            }
          }
          scrollToEndSoon(50);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat?.id, user?.id, scrollToEndSoon]);

  // --------- Realtime reçus de lecture ----------
  useEffect(() => {
    if (!activeChat?.id) return;
    const channel = supabase
      .channel(`conv-read-${activeChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_members',
          filter: `conversation_id=eq.${Number(activeChat.id)}`
        },
        async () => {
          try {
            const ids = messages.map(m => m.id);
            if (!ids.length) return;
            const { data: recs } = await supabase
              .from('message_read_receipts_v')
              .select('message_id, read_by_all')
              .in('message_id', ids);
            const byId = new Map((recs || []).map((r: any) => [Number(r.message_id), !!r.read_by_all]));
            setMessages(prev => prev.map(m => ({ ...m, readByAll: byId.get(m.id) ?? m.readByAll })));
          } catch (e) {
            devError('realtime receipts', e);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChat?.id, messages]);

  // --------- Realtime non-lus (écoute user_conversation_unreads) ----------
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`unreads-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_conversation_unreads',
        filter: `user_id=eq.${Number(user.id)}`
      }, (payload) => {
        const row = (payload.new || payload.old) as any;
        const convId = Number(row?.conversation_id);
        const count = Number((payload.new as any)?.unread_count ?? 0);
        if (!convId) return;

        setChats(prev => {
          if (!prev.some(c => c.id === convId)) return prev;
          return prev.map(c => c.id === convId ? { ...c, unreadCount: count } : c);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // --- Helpers lecture & upload ---
  const ensureReadableUri = async (uri: string) => {
    if (uri.startsWith('file://')) return uri;
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && info.isDirectory === false) return uri;
    } catch {}
    const cachePath = FileSystem.cacheDirectory + `upload-${Date.now()}`;
    await FileSystem.copyAsync({ from: uri, to: cachePath });
    return cachePath;
  };

  const guessExt = (name?: string, type?: string) => {
    if (name && /\.[A-Za-z0-9]+$/.test(name)) return '';
    if (!type) return '';
    if (type.includes('jpeg')) return '.jpg';
    if (type.includes('png')) return '.png';
    if (type.includes('pdf')) return '.pdf';
    return '';
  };

  const uploadFileToSupabase = async (fileUri: string, fileName?: string, mimeType?: string) => {
    const safeName = fileName || 'file';
    const ext = guessExt(safeName, mimeType);
    const pathInBucket = `chat_attachments/${user?.id}/${Date.now()}-${safeName}${ext}`;

    const readableUri = await ensureReadableUri(fileUri);
    const base64 = await FileSystem.readAsStringAsync(readableUri, { encoding: 'base64' });
    const arrayBuffer = decodeBase64(base64);

    const { data, error } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(pathInBucket, arrayBuffer, {
        contentType: mimeType || guessMimeFromName(safeName + ext) || 'application/octet-stream',
        upsert: false,
      });
    if (error) throw error;

    if (ATTACHMENTS_BUCKET_IS_PUBLIC) {
      const { data: pub } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(data.path);
      return pub.publicUrl;
    } else {
      const { data: signed } = await supabase.storage
        .from(ATTACHMENTS_BUCKET)
        .createSignedUrl(data.path, SIGNED_URL_TTL_SECONDS);
      return signed.signedUrl;
    }
  };

  // --------- Envoi / upload ----------
  const handleSend = useCallback(async (messageContent: string) => {
    if (!activeChat || !currentUserId) return;

    const trimmed = (messageContent ?? '').trim();
    const isUrlTyped = /^\w+:\/\/.+/.test(trimmed);

    const hasText = !!trimmed && !isUrlTyped;
    const fileUrl = pendingAttachment?.uri || (isUrlTyped ? trimmed : undefined);
    if (!hasText && !fileUrl) return;

    try {
      const { data, error } = await supabase.from('messages').insert({
        conversation_id: Number(activeChat.id),
        sender_id: Number(currentUserId),
        content: hasText ? trimmed : undefined,
        file_url: fileUrl,
      }).select('id').single();
      if (error) throw error;

      if (data?.id) {
        try {
          await supabase.functions.invoke('send-message-push', { body: { message_id: data.id } });
        } catch (fnErr) {
          devError('send-message-push', fnErr);
        }
      }

      setDraftText('');
      setPendingAttachment(null);
      scrollToEndSoon(40);
    } catch (e) {
      maskAndNotify('handleSend', e, "Échec de l'envoi du message.");
    }
  }, [activeChat, currentUserId, pendingAttachment, scrollToEndSoon]);

  const handleChooseImage = useCallback(async () => {
    if (Platform.OS !== 'web' && !mediaPermission?.granted) {
      const permission = await requestMediaPermission();
      if (!permission.granted) {
        notifyError('Autorisez l’accès à la médiathèque pour choisir une photo.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];
      const name = asset.fileName || asset.uri?.split('/').pop() || 'image.jpg';
      const mime = asset.mimeType || guessMimeFromName(name) || 'image/jpeg';

      try {
        const publicUrl = await uploadFileToSupabase(asset.uri, name, mime);
        setPendingAttachment({ uri: publicUrl, name, mime, isImage: true });
      } catch (e) {
        devError('upload image', e);
        notifyError('Téléversement impossible. Réessayez.');
      }
    }

    setShowAttachmentOptions(false);
  }, [mediaPermission, requestMediaPermission]);

  const handleChooseDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length) {
        const f = result.assets[0];
        const url = await uploadFileToSupabase(f.uri, f.name, f.mimeType || 'application/octet-stream');
        setPendingAttachment({ uri: url, name: f.name, mime: f.mimeType || 'application/octet-stream', isImage: isImageUrl(url) });
      }
    } catch (e) {
      maskAndNotify('handleChooseDocument', e, 'Téléversement du document impossible.');
    } finally {
      setShowAttachmentOptions(false);
    }
  }, []);

  // --------- Listes / vues ----------
  const filteredChats = chats.filter(chat => {
    const q = searchQuery.toLowerCase();
    return chat.isGroup && chat.name
      ? chat.name.toLowerCase().includes(q)
      : chat.participants.some(p => p.name.toLowerCase().includes(q));
  });

  const markAsRead = async (chat: Chat) => {
    try {
      if (!user?.id) return;
      await supabase
        .from('conversation_members')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', Number(chat.id))
        .eq('user_id', Number(user.id));

      await refreshAppBadge(Number(user.id));
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
    } catch (e) {
      devError('markAsRead', e);
    }
  };

  const renderChatList = () => (
    <ScrollView style={styles.chatList}>
      <View style={styles.headerContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une conversation"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {isLoadingChats ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Chargement des conversations...</Text>
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={styles.emptyState}><Text style={styles.emptyStateText}>Aucune conversation trouvée.</Text></View>
      ) : (
        filteredChats.map(chat => {
          const last = chat.lastMessage;
          const display = chat.isGroup ? null : chat.participants.find(p => p.id !== currentUserId);
          const name = chat.isGroup ? String(chat.name || 'Groupe') : String(display?.name || '');
          const avatar = chat.isGroup ? DEFAULT_AVATAR : (display?.avatar || DEFAULT_AVATAR);
          return (
            <TouchableOpacity
              key={chat.id}
              style={[styles.chatItem, activeChat?.id === chat.id && styles.activeChatItem]}
              onPress={() => { setActiveChat(chat); markAsRead(chat); }}
            >
              <View style={styles.avatarContainer}>
                <Image source={{ uri: avatar }} style={styles.avatar} />
                {display?.online && <View style={styles.onlineIndicator} />}
              </View>
              <View style={styles.chatItemContent}>
                <View style={styles.chatItemHeader}>
                  <Text style={styles.chatItemName} numberOfLines={1}>{name}</Text>
                  {!!last && <Text style={styles.chatItemTime}>{formatSmartListTimestamp(last.timestamp)}</Text>}
                </View>
                {!!last && (
                  <Text
                    style={[styles.chatItemLastMessage, (chat.unreadCount ?? 0) > 0 && styles.unreadMessage]}
                    numberOfLines={1}
                  >
                    {last.senderId === currentUserId ? 'Vous : ' : ''}
                    {[
                      last.content?.trim(),
                      last.image ? '📷 Photo' : undefined,
                      last.file ? `📎 ${last.file.name}` : undefined,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                )}
              </View>
              {(chat.unreadCount ?? 0) > 0 && (
                <View style={styles.unreadBadge}><Text style={styles.unreadCount}>{chat.unreadCount}</Text></View>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );

  const renderChatView = () => {
    if (!activeChat) return null;

    let headerDisplayParticipant: Contact | undefined;
    if (!activeChat.isGroup) {
      headerDisplayParticipant = activeChat.participants.find((p) => p.id !== Number(user?.id));
    } else {
      headerDisplayParticipant =
        activeChat.participants.find((p) => p.id !== Number(user?.id)) || activeChat.participants[0];
    }

    const headerName = activeChat.isGroup ? activeChat.name || 'Groupe' : headerDisplayParticipant?.name;
    const headerAvatar = headerDisplayParticipant?.avatar || DEFAULT_AVATAR;

    return (
     <KeyboardAvoidingView
  style={styles.chatView}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={
    Platform.OS === 'ios'
      ? insets.top + headerHeight
      : tabBarHeight + 8 // 👈 Android : laisse la place au TabBar quand le clavier est ouvert
  }
>


        <View style={styles.chatHeader} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
          <TouchableOpacity style={styles.backButton} onPress={() => setActiveChat(null)}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Image source={{ uri: headerAvatar }} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{headerName}</Text>
          </View>
          <View style={styles.headerActions} />
        </View>

        {isLoadingMessages ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Chargement des messages...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={[styles.messagesContent, { paddingBottom: inputBarHeight }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onContentSizeChange={() => scrollToEndSoon(0, false)}
          >
            {messages.map((msg, index) => {
              const isOwnMessage = msg.senderId === currentUserId;
              const sender = activeChat.participants.find((p) => p.id === msg.senderId);
              const showDate =
                index === 0 || !isSameDay(messages[index - 1].timestamp, msg.timestamp);
              return (
                <View key={msg.id}>
                  {showDate && (
                    <View style={styles.dateHeader}>
                      <Text style={styles.dateText}>{formatDayHeader(msg.timestamp)}</Text>
                    </View>
                  )}

                  <View
                    style={[styles.messageContainer, isOwnMessage ? styles.ownMessage : styles.otherMessage]}
                  >
                    {activeChat.isGroup && !isOwnMessage && (
                      <Text style={styles.messageSender}>{sender?.name}</Text>
                    )}

                    {typeof msg.content === 'string' && msg.content.trim().length > 0 && (
                      <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
                        {msg.content}
                      </Text>
                    )}

                    {msg.image && (
                      <Image source={{ uri: msg.image }} style={styles.messageImage} />
                    )}

                    {msg.file && (
                      <TouchableOpacity
                        style={[
                          styles.messageFileContainer,
                          isOwnMessage && { backgroundColor: 'rgba(255,255,255,0.15)' },
                        ]}
                        onPress={async () => {
                          try { await WebBrowser.openBrowserAsync(msg.file!.uri); }
                          catch { Linking.openURL(msg.file!.uri); }
                        }}
                        activeOpacity={0.7}
                      >
                        <FileText size={24} color={isOwnMessage ? 'white' : '#1a1a1a'} />
                        <Text
                          style={[
                            styles.messageFileName,
                            isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                          ]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {msg.file.name}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime]}>
                        {formatSmartBubbleTime(msg.timestamp)}
                      </Text>

                      {isOwnMessage && (
                        msg.readByAll
                          ? <CheckCheck size={16} color="#3b82f6" style={{ marginLeft: 6 }} />
                          : <Check size={16} color={Platform.OS === 'web' ? '#666' : 'rgba(255,255,255,0.8)'} style={{ marginLeft: 6 }} />
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* ✅ Preview de la PJ en attente + barre d’input (hauteur mesurée) */}
        <View
          style={{ backgroundColor: 'white' }}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h !== inputBarHeight) {
              setInputBarHeight(h);
              // ancre bas quand l'input grandit / options PJ ouvertes
              scrollToEndSoon(0, false);
            }
          }}
        >
          {pendingAttachment && (
            <View style={styles.pendingAttachmentBar}>
              {pendingAttachment.isImage ? (
                <Image source={{ uri: pendingAttachment.uri }} style={styles.pendingPreviewImage} />
              ) : (
                <FileText size={20} color="#1a1a1a" />
              )}
              <Text style={styles.pendingAttachmentName} numberOfLines={1}>
                {pendingAttachment.name || (pendingAttachment.isImage ? 'Photo' : 'Pièce jointe')}
              </Text>
              <TouchableOpacity style={styles.pendingRemoveButton} onPress={() => setPendingAttachment(null)}>
                <X size={16} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          <ChatInput
            handleSend={handleSend}
            showAttachmentOptions={showAttachmentOptions}
            setShowAttachmentOptions={setShowAttachmentOptions}
            handleChooseImage={handleChooseImage}
            handleChooseDocument={handleChooseDocument}
            value={draftText}
            onChangeText={setDraftText}
          />
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <View style={styles.container}>
      {activeChat ? renderChatView() : renderChatList()}
      <NewConversationModal
        visible={showNewConversationModal}
        onClose={() => {
          setShowNewConversationModal(false);
          setContactSearchQuery('');
          setSelectedContacts([]);
          setSelectedContactType('all');
        }}
        allUsers={allUsers}
        user={user}
        contactSearchQuery={contactSearchQuery}
        setContactSearchQuery={setContactSearchQuery}
        selectedContacts={selectedContacts}
        setSelectedContacts={setSelectedContacts}
        selectedContactType={selectedContactType}
        setSelectedContactType={setSelectedContactType}
        handleCreateConversation={async () => {
          if (!user?.id || !selectedContacts.length) return;
          setIsCreatingConversation(true);
          try {
            const { data: convId, error: rpcErr } = await supabase.rpc(
              'create_conversation_with_members',
              {
                p_actor_id: Number(user.id),
                p_member_ids: selectedContacts.map(c => Number(c.id)),
                p_title: selectedContacts.length > 1
                  ? `Groupe avec ${selectedContacts.map(c => c.name).join(', ')}`
                  : null,
                p_is_group: selectedContacts.length > 1,
              }
            );

            if (rpcErr) throw rpcErr;

            const { data: conv, error: convErr } = await supabase
              .from('conversations')
              .select('id, title, is_group, conversation_members(user_id, users(id, first_name, last_name, avatar, e_mail, phone, profile))')
              .eq('id', Number(convId))
              .single();
            if (convErr || !conv) throw convErr;

            const participants: Contact[] = await Promise.all(
              (conv.conversation_members || []).map(async (p: any) => ({
                id: Number(p.users.id),
                name: `${p.users.first_name} ${p.users.last_name}`,
                avatar: await getSignedAvatarUrl(p.users.avatar),
                type: p.users.profile,
                email: p.users.e_mail,
                phone: p.users.phone,
              }))
            );

            const newChat: Chat = {
              id: Number(conv.id),
              name: conv.title,
              isGroup: conv.is_group,
              participants,
              unreadCount: 0,
            };

            setChats(prev => sortChatsByLastActivity([newChat, ...prev]));
            setActiveChat(newChat);

            setShowNewConversationModal(false);
            setContactSearchQuery('');
            setSelectedContacts([]);
            setSelectedContactType('all');

            await refreshAppBadge(Number(user.id));
            notifyInfo('Conversation créée.');
          } catch (e) {
            maskAndNotify('createConversation', e, 'Création de la conversation impossible.');
          } finally {
            setIsCreatingConversation(false);
          }
        }}
        isCreatingConversation={isCreatingConversation}
        getContactTypeIcon={(t: Contact['type']) =>
          t === 'pleasure_boater' ? <UserIcon size={16} color="#0EA5E9" /> :
          t === 'boat_manager' ? <UserIcon size={16} color="#10B981" /> :
          t === 'nautical_company' ? <Building size={16} color="#8B5CF6" /> :
          t === 'corporate' ? <Building size={16} color="#F59E0B" /> :
          <UserIcon size={16} color="#666" />
        }
        getContactTypeLabel={(t: Contact['type']) =>
          t === 'pleasure_boater' ? 'Plaisancier' :
          t === 'boat_manager' ? 'Boat Manager' :
          t === 'nautical_company' ? 'Entreprise du nautisme' :
          t === 'corporate' ? 'Corporate' : t
        }
        getContactTypeColor={(t: Contact['type']) =>
          t === 'pleasure_boater' ? '#0EA5E9' :
          t === 'boat_manager' ? '#10B981' :
          t === 'nautical_company' ? '#8B5CF6' :
          t === 'corporate' ? '#F59E0B' : '#666'
        }
      />
      {!user?.id && <AuthOverlay />}
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  authCard: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 },
      android: { elevation: 8 },
      web: { boxShadow: '0 8px 20px rgba(0,0,0,0.2)' },
    }),
  },
  authTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  authButton: {
    backgroundColor: '#0066CC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  chatList: { flex: 1 },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 12 },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    }),
  },
  searchInput: { flex: 1, fontSize: 16, color: '#1a1a1a', ...Platform.select({ web: { outlineStyle: 'none' } }) },

  newConversationButton: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#0066CC', justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#0066CC', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 4px rgba(0,102,204,0.2)' },
    }),
  },

  avatarContainer: { position: 'relative' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  onlineIndicator: {
    position: 'absolute', right: -1, bottom: -1, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981',
    borderWidth: 3, borderColor: '#fff',
  },
  chatItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 12, marginVertical: 6,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      web: { boxShadow: '0 6px 16px rgba(0,0,0,0.06)' },
    }),
  },
  activeChatItem: { backgroundColor: '#F0F7FF' },
  chatItemContent: { flex: 1, minWidth: 0, marginLeft: 12, justifyContent: 'center' },
  chatItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatItemName: { flexShrink: 1, marginRight: 8, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  chatItemTime: { fontSize: 12, color: '#94A3B8', flexShrink: 0 },
  chatItemLastMessage: { fontSize: 14, color: '#64748B', marginTop: 2, marginBottom: 4 },
  unreadMessage: { color: '#1a1a1a', fontWeight: '500' },
  unreadBadge: {
    minWidth: 24, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#0066CC',
    alignItems: 'center', justifyContent: 'center', marginLeft: 8, alignSelf: 'center',
    ...Platform.select({
      ios: { shadowColor: '#0066CC', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  unreadCount: { color: 'white', fontSize: 12, fontWeight: '700' },

  // Chat view
  chatView: { flex: 1, backgroundColor: '#f0f7ff' },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'white',
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 12,
  },
  backButton: { padding: 4, marginRight: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  headerActions: { flexDirection: 'row', gap: 16 },
  headerAction: { padding: 8 },

  // Messages
  messagesList: { flex: 1 },
  messagesContent: { padding: 16, gap: 8 },
  dateHeader: { alignItems: 'center', marginVertical: 8 },
  dateText: { fontSize: 12, color: '#666', backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  messageContainer: { maxWidth: '80%', padding: 12, borderRadius: 12, gap: 4 },
  ownMessage: { alignSelf: 'flex-end', backgroundColor: '#0066CC', borderBottomRightRadius: 4 },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: 'white', borderBottomLeftRadius: 4 },
  messageSender: { fontSize: 12, fontWeight: '500', color: '#0066CC', marginBottom: 2 },
  messageText: { fontSize: 16, lineHeight: 22 },
  ownMessageText: { color: 'white' },
  otherMessageText: { color: '#1a1a1a' },
  messageImage: { width: 200, height: 150, borderRadius: 8 },
  messageFileContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: '#f0f7ff', borderRadius: 8, borderWidth: 1,
  borderColor: '#e2e8f0', },
  messageFileName: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  messageTime: { fontSize: 12, alignSelf: 'flex-end' },
  ownMessageTime: { color: 'rgba(255,255,255,0.8)' },
  otherMessageTime: { color: '#666' },

  // Preview PJ en attente
  pendingAttachmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  pendingAttachmentName: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  pendingPreviewImage: { width: 36, height: 36, borderRadius: 6, backgroundColor: '#f1f5f9' },
  pendingRemoveButton: { padding: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: 'white', borderRadius: 16, width: '90%', maxWidth: 500, maxHeight: '90%', flex: 1, minHeight: '50%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' },
    }),
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  modalCloseButton: { padding: 4 },
  contactTypeFilter: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  contactTypeButton: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 8,
    borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: 'white', gap: 6,
  },
  contactTypeButtonActive: { backgroundColor: '#0066CC', borderColor: '#0066CC' },
  contactTypeButtonText: { fontSize: 14, color: '#666' },
  contactTypeButtonTextActive: { color: 'white', fontWeight: '500' },
  modalSearchContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', margin: 16, paddingHorizontal: 16,
    paddingVertical: 12, borderRadius: 12, gap: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  modalSearchInput: { flex: 1, fontSize: 16, color: '#1a1a1a', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  selectedContactsContainer: { paddingHorizontal: 16, marginBottom: 16 },
  selectedContactsTitle: { fontSize: 14, fontWeight: '500', color: '#666', marginBottom: 8 },
  selectedContactsScroll: { maxHeight: 60 },
  selectedContactChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f7ff', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 8, marginRight: 8, gap: 8 },
  selectedContactAvatar: { width: 24, height: 24, borderRadius: 12 },
  selectedContactName: { fontSize: 14, color: '#0066CC' },
  removeSelectedContactButton: { padding: 2 },
  contactsList: { flex: 1, paddingHorizontal: 16 },
  contactItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 },
  contactItemSelected: { backgroundColor: '#f0f7ff' },
  contactItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  contactItemAvatar: { width: 48, height: 48, borderRadius: 24 },
  contactItemInfo: { flex: 1 },
  contactItemName: { fontSize: 16, fontWeight: '500', color: '#1a1a1a', marginBottom: 4 },
  contactItemTypeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactItemType: { fontSize: 12, fontWeight: '500' },
  contactItemDetails: { fontSize: 12, color: '#666' },
  contactItemCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  contactItemCheckboxSelected: { backgroundColor: '#0066CC', borderColor: '#0066CC' },
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  createConversationButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0066CC', padding: 16, borderRadius: 12, gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#0066CC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 8px rgba(0,102,204,0.2)' },
    }),
  },
  createConversationButtonDisabled: { backgroundColor: '#94a3b8' },
  createConversationButtonText: { fontSize: 16, fontWeight: '600', color: 'white' },

  // Loading / empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  emptyState: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
});
