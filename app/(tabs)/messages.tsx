// app/(tabs)/messages.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { Linking } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Alert,
  ToastAndroid,
} from 'react-native';
import {
  Search,
  ChevronLeft,
  Phone,
  Video,
  Building,
  Plus,
  X,
  Check,
  MessageSquare,
  FileText,
  User as UserIcon,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import ChatInput from '@/components/ChatInput';
import { supabase } from '@/src/lib/supabase';

// ---------- Notifs + logs (erreurs masquées côté client) ----------
const notifyError = (msg: string) => {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);
  else Alert.alert('Oups', msg);
};
const notifyInfo = (msg: string) => {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert('', msg);
};
const devLog = (...args: any[]) => { if (__DEV__) console.log(...args); };
const devError = (scope: string, err: unknown) => { if (__DEV__) console.error(`[${scope}]`, err); };
const maskAndNotify = (scope: string, err: unknown, userMsg = 'Une erreur est survenue.') => {
  devError(scope, err);
  notifyError(userMsg);
};

// ---------- Avatars / fichiers ----------
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';
const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));
const isImageUrl = (url?: string) => !!url && /\.(png|jpe?g|gif|webp|bmp)$/i.test((url.split('?')[0] || ''));
const getSignedAvatarUrl = async (value?: string) => {
  if (!value) return DEFAULT_AVATAR;
  if (isHttpUrl(value)) return value;
  const { data } = await supabase.storage.from('avatars').createSignedUrl(value, 60 * 60);
  return data?.signedUrl || DEFAULT_AVATAR;
};

// ---------- Types ----------
interface Message {
  id: number;
  senderId: number;
  content?: string;
  image?: string;
  file?: { name: string; uri: string; type: string };
  timestamp: Date;
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

// ---------- Écran principal ----------
export default function MessagesScreen() {
  const { conversationId, client: initialClientId } = useLocalSearchParams<{ conversationId?: string; client?: string }>();
  const { user } = useAuth();
  const currentUserId = Number(user?.id);
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  // ✅ Ouvrir une URL (image/PDF/autre)
  const openUrl = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        notifyError("Impossible d'ouvrir ce lien.");
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      devError('openUrl', e);
      notifyError("Ouverture du fichier impossible.");
    }
  }, []);

  // --------- Helpers icônes / labels contact type ----------
  const getContactTypeIcon = (t: Contact['type']) => {
    switch (t) {
      case 'pleasure_boater': return <UserIcon size={16} color="#0EA5E9" />;
      case 'boat_manager': return <UserIcon size={16} color="#10B981" />;
      case 'nautical_company': return <Building size={16} color="#8B5CF6" />;
      case 'corporate': return <Building size={16} color="#F59E0B" />;
      default: return <UserIcon size={16} color="#666" />;
    }
  };
  const getContactTypeLabel = (t: Contact['type']) =>
    t === 'pleasure_boater' ? 'Plaisancier'
      : t === 'boat_manager' ? 'Boat Manager'
      : t === 'nautical_company' ? 'Entreprise du nautisme'
      : t === 'corporate' ? 'Corporate' : t;
  const getContactTypeColor = (t: Contact['type']) =>
    t === 'pleasure_boater' ? '#0EA5E9'
      : t === 'boat_manager' ? '#10B981'
      : t === 'nautical_company' ? '#8B5CF6'
      : t === 'corporate' ? '#F59E0B' : '#666';

  // --------- Création / recherche d'une 1–1 via param `client` ----------
  const findOrCreateConversationWithClient = useCallback(async (targetClientId: number): Promise<Chat | null> => {
    if (!user?.id) return null;
    try {
      // 1) toutes les conversations du user
      const { data: memberRows, error: convErr } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', Number(user.id));
      if (convErr) throw convErr;

      // cherche une 1–1 existante
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

      // 2) si trouvée → hydrate
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

      if (foundId) return hydrateConv(foundId);

      // 3) sinon créer
      setIsCreatingConversation(true);
      const { data: newConv, error: cErr } = await supabase
        .from('conversations')
        .insert({ is_group: false, title: null })
        .select('id, title, is_group')
        .single();
      if (cErr) throw cErr;

      const { error: memErr } = await supabase
        .from('conversation_members')
        .insert([
          { conversation_id: Number(newConv.id), user_id: Number(user.id) },
          { conversation_id: Number(newConv.id), user_id: targetClientId },
        ]);
      if (memErr) throw memErr;

      // participants
      const { data: target, error: tErr } = await supabase
        .from('users')
        .select('id, first_name, last_name, avatar, e_mail, phone, profile')
        .eq('id', targetClientId)
        .single();
      if (tErr) throw tErr;

      const targetContact: Contact = {
        id: Number(target.id),
        name: `${target.first_name} ${target.last_name}`,
        avatar: await getSignedAvatarUrl(target.avatar),
        type: target.profile,
        email: target.e_mail,
        phone: target.phone,
      };
      const me: Contact = {
        id: Number(user.id),
        name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Moi',
        avatar: user.avatar || DEFAULT_AVATAR,
        type: (user.role as Contact['type']) || 'boat_manager',
        email: user.email || '',
        phone: user.phone || '',
      };

      return { id: Number(newConv.id), name: newConv.title, isGroup: newConv.is_group, participants: [me, targetContact], unreadCount: 0 };
    } catch (e) {
      maskAndNotify('findOrCreateConversationWithClient', e, 'Impossible de démarrer la conversation.');
      return null;
    } finally {
      setIsCreatingConversation(false);
    }
  }, [user]);

  // --------- Récup init : contacts + conversations ----------
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!user?.id) { setIsLoadingChats(false); return; }
      setIsLoadingChats(true);
      try {
        // Contacts autorisés (RPC)
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

        // Conversations du user
        const { data: memberRows, error: mErr } = await supabase
          .from('conversation_members')
          .select('conversation_id, conversations(id, title, is_group)')
          .eq('user_id', Number(user.id));
        if (mErr) throw mErr;

        const convs = memberRows?.map(r => r.conversations).filter(Boolean) || [];

        // Pour chaque conv: participants + dernier message (en //)
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
        setChats(hydrated);

        // Navigation initiale
        if (conversationId) {
          const byId = hydrated.find(c => String(c.id) === String(conversationId));
          if (byId) setActiveChat(byId);
        } else if (initialClientId) {
          const targetId = Number(initialClientId);
          const existing = hydrated.find(c => !c.isGroup && c.participants.some(p => p.id === targetId));
          if (existing) setActiveChat(existing);
          else {
            const created = await findOrCreateConversationWithClient(targetId);
            if (created && alive) {
              setChats(prev => [created, ...prev]);
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
        setMessages((data || []).map((m: any) => ({
          id: Number(m.id),
          senderId: Number(m.sender_id),
          content: m.content ?? undefined,
          image: isImageUrl(m.file_url) ? m.file_url : undefined,
          file: m.file_url && !isImageUrl(m.file_url)
            ? { name: m.file_url.split('/').pop() || 'document', uri: m.file_url, type: 'application/octet-stream' }
            : undefined,
          timestamp: new Date(m.created_at),
        })));

        // marque comme lu (si champ présent dans conversation_members)
        if (user?.id) {
          await supabase
            .from('conversation_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', Number(activeChat.id))
            .eq('user_id', Number(user.id));
        }
      } catch (e) {
        maskAndNotify('fetchMessages', e, 'Impossible de charger les messages.');
        setMessages([]);
      } finally {
        if (alive) {
          setIsLoadingMessages(false);
          setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
        }
      }
    };
    fetchMessages();
    return () => { alive = false; };
  }, [activeChat, user?.id]);

  // --------- Realtime nouveaux messages ----------
  useEffect(() => {
    if (!activeChat?.id) return;
    const channel = supabase
      .channel(`conversation-${activeChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${Number(activeChat.id)}`,
      }, (payload) => {
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
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 50);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChat?.id]);

  // --------- Envoi / upload ----------
  const handleSend = useCallback(async (messageContent: string) => {
    if (!activeChat || !currentUserId) return;
    const trimmed = messageContent.trim();
    if (!trimmed) return;
    try {
      const isFile = /^\w+:\/\/.+/.test(trimmed);
      const { error } = await supabase.from('messages').insert({
        conversation_id: Number(activeChat.id),
        sender_id: Number(currentUserId),
        content: isFile ? undefined : trimmed,
        file_url: isFile ? trimmed : undefined,
      });
      if (error) throw error;
    } catch (e) {
      maskAndNotify('handleSend', e, "Échec de l'envoi du message.");
    }
  }, [activeChat, currentUserId]);

  const ensureExt = (name: string, mime?: string) => {
    const hasExt = /\.[A-Za-z0-9]+$/.test(name || '');
    if (hasExt) return name;
    if (!mime) return `${name || 'file'}.bin`;
    if (mime.includes('jpeg')) return `${name || 'image'}.jpg`;
    if (mime.includes('png'))  return `${name || 'image'}.png`;
    if (mime.includes('pdf'))  return `${name || 'document'}.pdf`;
    return `${name || 'file'}.bin`;
  };

  // 🔧 Upload robuste (ArrayBuffer – pas de Blob)
  const uploadFileToSupabase = async (
    fileUri: string,
    fileName: string,
    mimeType: string
  ) => {
    const safeName = ensureExt(fileName || 'file', mimeType);
    const filePath = `chat_attachments/${user?.id}/${Date.now()}-${safeName}`;

    try {
      let workingUri = fileUri;
      let workingMime = mimeType;

      // 1) Si image → resize/compresse
      if (mimeType?.startsWith('image/')) {
        const toJpeg = !mimeType.includes('png');
        const manipulated = await ImageManipulator.manipulateAsync(
          fileUri,
          [{ resize: { width: 1600 } }],
          {
            compress: 0.85,
            format: toJpeg ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
          }
        );
        workingUri = manipulated.uri;
        workingMime = toJpeg ? 'image/jpeg' : 'image/png';
      }

      // 2) Lire en base64 → ArrayBuffer
      const base64 = await FileSystem.readAsStringAsync(workingUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const bytes = decodeBase64(base64); // ArrayBuffer

      if (!bytes || (bytes as ArrayBuffer).byteLength === 0) {
        throw new Error('Le fichier à téléverser est vide (0 octet).');
      }

      // 3) Upload direct de l'ArrayBuffer (pas de Blob)
      const { data, error } = await supabase.storage
        .from('chat.attachments')
        .upload(filePath, bytes, {
          contentType: workingMime || 'application/octet-stream',
          upsert: false,
        });

      if (error) throw error;

      // 4) URL publique (si bucket public)
      const { data: pub } = supabase.storage.from('chat.attachments').getPublicUrl(data.path);

      return {
        url: pub.publicUrl,
        path: data.path,
        size: (bytes as ArrayBuffer).byteLength,
        mime: workingMime,
        name: safeName,
      };
    } catch (e) {
      devError('uploadFileToSupabase', e);
      throw e;
    }
  };

  const handleChooseImage = useCallback(async () => {
    try {
      if (!mediaPermission?.granted) {
        const p = await requestMediaPermission();
        if (!p.granted) { notifyError('Autorisez l’accès à la médiathèque.'); return; }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const mime = asset.mimeType || 'image/jpeg';
        const name = asset.fileName || 'image.jpg';
        const uploaded = await uploadFileToSupabase(asset.uri, name, mime);
        await handleSend(uploaded.url);
      }
    } catch (e) {
      maskAndNotify('handleChooseImage', e, 'Téléversement image impossible.');
    } finally {
      setShowAttachmentOptions(false);
    }
  }, [mediaPermission, requestMediaPermission, handleSend]);

  const handleChooseDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length) {
        const f = result.assets[0];
        const uploaded = await uploadFileToSupabase(f.uri, f.name, f.mimeType || 'application/octet-stream');
        await handleSend(uploaded.url);
      }
    } catch (e) {
      maskAndNotify('handleChooseDocument', e, 'Téléversement du document impossible.');
    } finally {
      setShowAttachmentOptions(false);
    }
  }, [handleSend]);

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
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
    } catch (e) {
      devError('markAsRead', e);
    }
  };

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const ChatList = () => (
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
        <TouchableOpacity style={styles.newConversationButton} onPress={() => setShowNewConversationModal(true)}>
          <Plus size={24} color="white" />
        </TouchableOpacity>
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
                  {!!last && <Text style={styles.chatItemTime}>{formatTime(last.timestamp)}</Text>}
                </View>
                {!!last && (
                  <Text
                    style={[styles.chatItemLastMessage, (chat.unreadCount ?? 0) > 0 && styles.unreadMessage]}
                    numberOfLines={1}
                  >
                    {last.senderId === currentUserId ? 'Vous : ' : ''}
                    {last.content || (last.image ? 'Image' : last.file ? `Document : ${last.file.name}` : '')}
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

  const ChatView = () => {
    if (!activeChat) return null;
    const other = activeChat.isGroup
      ? activeChat.participants.find(p => p.id !== currentUserId) || activeChat.participants[0]
      : activeChat.participants.find(p => p.id !== currentUserId);
    const headerName = activeChat.isGroup ? String(activeChat.name || 'Groupe') : String(other?.name || '');
    const headerAvatar = activeChat.isGroup ? DEFAULT_AVATAR : (other?.avatar || DEFAULT_AVATAR);

    return (
      <KeyboardAvoidingView
        style={styles.chatView}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + headerHeight : 0}
      >
        <View style={styles.chatHeader} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
          <TouchableOpacity style={styles.backButton} onPress={() => setActiveChat(null)}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Image source={{ uri: headerAvatar }} style={styles.headerAvatar} />
          <View style={styles.headerInfo}><Text style={styles.headerName}>{headerName}</Text></View>
          <View style={styles.headerActions}>
            {/* <TouchableOpacity style={styles.headerAction}><Phone size={24} color="#0066CC" /></TouchableOpacity>
            <TouchableOpacity style={styles.headerAction}><Video size={24} color="#0066CC" /></TouchableOpacity> */}
          </View>
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
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg, i) => {
              const isOwn = msg.senderId === currentUserId;
              const sender = activeChat.participants.find(p => p.id === msg.senderId);
              const showDate = i === 0 || formatDate(messages[i - 1].timestamp) !== formatDate(msg.timestamp);
              return (
                <View key={msg.id}>
                  {showDate && (
                    <View style={styles.dateHeader}><Text style={styles.dateText}>{formatDate(msg.timestamp)}</Text></View>
                  )}
                  <View style={[styles.messageContainer, isOwn ? styles.ownMessage : styles.otherMessage]}>
                    {activeChat.isGroup && !isOwn && (
                      <Text style={styles.messageSender}>{String(sender?.name || '')}</Text>
                    )}
                    {msg.image ? (
                      <TouchableOpacity onPress={() => openUrl(msg.image!)}>
                        <Image source={{ uri: msg.image }} style={styles.messageImage} />
                      </TouchableOpacity>
                    ) : msg.file ? (
                      <TouchableOpacity onPress={() => openUrl(msg.file!.uri)}>
                        <View style={styles.messageFileContainer}>
                          <FileText size={24} color={isOwn ? 'white' : '#1a1a1a'} />
                          <Text style={[styles.messageFileName, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
                            {msg.file.name}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <Text style={[styles.messageText, isOwn ? styles.ownMessageText : styles.otherMessageText]}>
                        {msg.content}
                      </Text>
                    )}
                    <Text style={[styles.messageTime, isOwn ? styles.ownMessageTime : styles.otherMessageTime]}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        <View style={{ paddingBottom: insets.bottom, backgroundColor: 'white' }}>
          <ChatInput
            handleSend={handleSend}
            showAttachmentOptions={showAttachmentOptions}
            setShowAttachmentOptions={setShowAttachmentOptions}
            handleChooseImage={handleChooseImage}
            handleChooseDocument={handleChooseDocument}
          />
        </View>
      </KeyboardAvoidingView>
    );
  };

  return (
    <View style={styles.container}>
      {activeChat ? <ChatView /> : <ChatList />}
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
          if (!selectedContacts.length) return;
          setIsCreatingConversation(true);
          try {
            const { data: newConv, error: convError } = await supabase
              .from('conversations')
              .insert({
                title: selectedContacts.length > 1 ? `Groupe avec ${selectedContacts.map(c => c.name).join(', ')}` : null,
                is_group: selectedContacts.length > 1,
              })
              .select('id, title, is_group')
              .single();
            if (convError) throw convError;

            const rows = selectedContacts.map(c => ({ conversation_id: Number(newConv.id), user_id: Number(c.id) }));
            if (user?.id) rows.push({ conversation_id: Number(newConv.id), user_id: Number(user.id) });
            const { error: memErr } = await supabase.from('conversation_members').insert(rows);
            if (memErr) throw memErr;

            const me: Contact = {
              id: Number(user?.id),
              name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Moi',
              avatar: user?.avatar || DEFAULT_AVATAR,
              type: (user?.role as Contact['type']) || 'boat_manager',
              email: user?.email || '',
              phone: user?.phone || '',
            };
            const newChat: Chat = {
              id: Number(newConv.id),
              name: newConv.title || '',
              isGroup: newConv.is_group,
              participants: [me, ...selectedContacts],
              unreadCount: 0,
            };
            setChats(prev => [newChat, ...prev]);
            setActiveChat(newChat);
            setShowNewConversationModal(false);
            setContactSearchQuery('');
            setSelectedContacts([]);
            setSelectedContactType('all');
            notifyInfo('Conversation créée.');
          } catch (e) {
            maskAndNotify('createConversation', e, 'Création de la conversation impossible.');
          } finally {
            setIsCreatingConversation(false);
          }
        }}
        isCreatingConversation={isCreatingConversation}
        getContactTypeIcon={getContactTypeIcon}
        getContactTypeLabel={getContactTypeLabel}
        getContactTypeColor={getContactTypeColor}
      />
    </View>
  );
}

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

  // newConversationButton: {
  //   width: 48, height: 48, borderRadius: 24, backgroundColor: '#0066CC', justifyContent: 'center', alignItems: 'center',
  //   ...Platform.select({
  //     ios: { shadowColor: '#0066CC', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  //     android: { elevation: 2 },
  //     web: { boxShadow: '0 2px 4px rgba(0,102,204,0.2)' },
  //   }),
  // },

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
  messageFileContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: '#f0f7ff', borderRadius: 8 },
  messageFileName: { fontSize: 14, fontWeight: '500' },
  messageTime: { fontSize: 12, alignSelf: 'flex-end' },
  ownMessageTime: { color: 'rgba(255,255,255,0.8)' },
  otherMessageTime: { color: '#666' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: {
    backgroundColor: 'white', borderRadius: 16, width: '90%', maxWidth: 500, maxHeight: '90%', flex: 1, minHeight: '50%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
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
  contactItemTypeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
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
