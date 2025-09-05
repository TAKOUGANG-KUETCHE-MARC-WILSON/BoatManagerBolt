// app/(boat-manager)/messages.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Platform, KeyboardAvoidingView, Modal, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { Send, Search, ChevronLeft, Phone, Mail, Bot as Boat, User, Building, Plus, X, Check, MessageSquare, Video, Paperclip, Camera, Image as ImageIcon, FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import ChatInput from '@/components/ChatInput';
import { supabase } from '@/src/lib/supabase';

// --- Helper function for avatar URLs ---
const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png';

const isHttpUrl = (v?: string) => !!v && (v.startsWith('http://') || v.startsWith('https://'));

const getSignedAvatarUrl = async (value?: string) => {
  if (!value) return '';
  if (isHttpUrl(value)) return value;

  const { data, error } = await supabase
    .storage
    .from('avatars')
    .createSignedUrl(value, 60 * 60); // 1h de validité

  if (error || !data?.signedUrl) return '';
  return data.signedUrl;
};
// --- End Helper function ---

interface Message {
  id: number;
  senderId: number;
  content?: string; // Renamed from 'text' to 'content' to match DB
  image?: string; // URL for image files
  file?: { // For other file types (PDF, etc.)
    name: string;
    uri: string;
    type: string;
  };
  timestamp: Date;
}

interface Contact {
  id: number;
  name: string;
  avatar: string;
  type: 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'corporate';
  email: string;
  phone: string;
  details?: string; // For displaying extra info like boats or ports
  online?: boolean; // If you implement online status
}

interface Chat {
  id: number; // conversation_id
  participants: Contact[]; // Members of the conversation
  messages: Message[]; // Historical messages for active chat
  isGroup: boolean;
  name?: string; // conversation title
  unreadCount?: number; // For UI, might be calculated
  lastMessage?: Message; // For chat list display
}

// --- NewConversationModal Component ---
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
}) => {
  // Filter contacts for new conversation
  const filteredContacts = allUsers.filter(contact => {
    // Exclure l'utilisateur actuel
    if (contact.id === user?.id) return false;

    // Filtrer par la requête de recherche
    const searchLower = (contactSearchQuery || '').toLowerCase();
    const matchesSearch =
      contact.name.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower) ||
      (contact.details && contact.details.toLowerCase().includes(searchLower));

    // Filtrer par type de contact
    const matchesType =
      selectedContactType === 'all' || contact.type === selectedContactType;

    return matchesSearch && matchesType;
  });

  const toggleContactSelection = (contact: Contact) => {
    setSelectedContacts(prev => {
      if (prev.some(c => c.id === contact.id)) {
        return prev.filter(c => c.id !== contact.id);
      } else {
        return [...prev, contact];
      }
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nouvelle conversation</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={onClose}
                >
                  <X size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.contactTypeFilter}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[
                      styles.contactTypeButton,
                      selectedContactType === 'all' && styles.contactTypeButtonActive
                    ]}
                    onPress={() => setSelectedContactType('all')}
                  >
                    <Text style={[
                      styles.contactTypeButtonText,
                      selectedContactType === 'all' && styles.contactTypeButtonTextActive
                    ]}>
                      Tous
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.contactTypeButton,
                      selectedContactType === 'pleasure_boater' && styles.contactTypeButtonActive,
                      { borderColor: '#0EA5E9' }
                    ]}
                    onPress={() => setSelectedContactType('pleasure_boater')}
                  >
                    <User size={16} color={selectedContactType === 'pleasure_boater' ? 'white' : '#0EA5E9'} />
                    <Text style={[
                      styles.contactTypeButtonText,
                      selectedContactType === 'pleasure_boater' && styles.contactTypeButtonTextActive,
                      { color: selectedContactType === 'pleasure_boater' ? 'white' : '#0EA5E9' }
                    ]}>
                      Plaisanciers
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.contactTypeButton,
                      selectedContactType === 'boat_manager' && styles.contactTypeButtonActive,
                      { borderColor: '#10B981' }
                    ]}
                    onPress={() => setSelectedContactType('boat_manager')}
                  >
                    <User size={16} color={selectedContactType === 'boat_manager' ? 'white' : '#10B981'} />
                    <Text style={[
                      styles.contactTypeButtonText,
                      selectedContactType === 'boat_manager' && styles.contactTypeButtonTextActive,
                      { color: selectedContactType === 'boat_manager' ? 'white' : '#10B981' }
                    ]}>
                      Boat Managers
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.contactTypeButton,
                      selectedContactType === 'nautical_company' && styles.contactTypeButtonActive,
                      { borderColor: '#8B5CF6' }
                    ]}
                    onPress={() => setSelectedContactType('nautical_company')}
                  >
                    <Building size={16} color={selectedContactType === 'nautical_company' ? 'white' : '#8B5CF6'} />
                    <Text style={[
                      styles.contactTypeButtonText,
                      selectedContactType === 'nautical_company' && styles.contactTypeButtonTextActive,
                      { color: selectedContactType === 'nautical_company' ? 'white' : '#8B5CF6' }
                    ]}>
                      Entreprises
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.contactTypeButton,
                      selectedContactType === 'corporate' && styles.contactTypeButtonActive,
                      { borderColor: '#F59E0B' }
                    ]}
                    onPress={() => setSelectedContactType('corporate')}
                  >
                    <Building size={16} color={selectedContactType === 'corporate' ? 'white' : '#F59E0B'} />
                    <Text style={[
                      styles.contactTypeButtonText,
                      selectedContactType === 'corporate' && styles.contactTypeButtonTextActive,
                      { color: selectedContactType === 'corporate' ? 'white' : '#F59E0B' }
                    ]}>
                      Corporate
                    </Text>
                  </TouchableOpacity>
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

              {selectedContacts.length > 0 && (
                <View style={styles.selectedContactsContainer}>
                  <Text style={styles.selectedContactsTitle}>
                    Contacts sélectionnés ({selectedContacts.length})
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.selectedContactsScroll}
                  >
                    {selectedContacts.map(contact => (
                      <View key={contact.id} style={styles.selectedContactChip}>
                        <Image source={{ uri: contact.avatar }} style={styles.selectedContactAvatar} />
                        <Text style={styles.selectedContactName}>{contact.name}</Text>
                        <TouchableOpacity
                          style={styles.removeSelectedContactButton}
                          onPress={() => toggleContactSelection(contact)}
                        >
                          <X size={16} color="#666" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <ScrollView style={styles.contactsList} keyboardShouldPersistTaps="handled">
                {filteredContacts.map(contact => (
                  <TouchableOpacity
                    key={contact.id}
                    style={[
                      styles.contactItem,
                      selectedContacts.some(c => c.id === contact.id) && styles.contactItemSelected
                    ]}
                    onPress={() => toggleContactSelection(contact)}
                  >
                    <View style={styles.contactItemLeft}>
                      <Image source={{ uri: contact.avatar }} style={styles.contactItemAvatar} />
                      <View style={styles.contactItemInfo}>
                        <Text style={styles.contactItemName}>{contact.name}</Text>
                        <View style={styles.contactItemTypeContainer}>
                          {getContactTypeIcon(contact.type)}
                          <Text style={[
                            styles.contactItemType,
                            { color: getContactTypeColor(contact.type) }
                          ]}>
                            {getContactTypeLabel(contact.type)}
                          </Text>
                        </View>
                        {contact.details && (
                          <Text style={styles.contactItemDetails}>{contact.details}</Text>
                        )}
                      </View>
                    </View>
                    <View style={[
                      styles.contactItemCheckbox,
                      selectedContacts.some(c => c.id === contact.id) && styles.contactItemCheckboxSelected
                    ]}>
                      {selectedContacts.some(c => c.id === contact.id) && (
                        <Check size={16} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[
                    styles.createConversationButton,
                    selectedContacts.length === 0 && styles.createConversationButtonDisabled
                  ]}
                  onPress={handleCreateConversation}
                  disabled={selectedContacts.length === 0 || isCreatingConversation}
                >
                  {isCreatingConversation ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <MessageSquare size={20} color="white" />
                      <Text style={styles.createConversationButtonText}>
                        Créer la conversation
                      </Text>
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

// --- Main MessagesScreen Component ---
export default function MessagesScreen() {
  const { client: initialClientId } = useLocalSearchParams<{ client?: string }>();
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
  const [selectedContactType, setSelectedContactType] = useState<'all' | 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'corporate'>('all');
  const [allUsers, setAllUsers] = useState<Contact[]>([]); // All users for new conversation modal

  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  // --- Fetch Initial Conversations and All Users ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoadingChats(true);
      if (!user?.id) {
        setIsLoadingChats(false);
        return;
      }

      try {
        // Fetch all allowed contacts for the new conversation modal via RPC
        const { data: usersData, error: usersError } = await supabase
          .rpc('get_contacts_for_boat_manager', { manager_id: user.id });

        if (usersError) {
          console.error('Error fetching contacts via RPC:', usersError);
          return;
        }

        const usersList: Contact[] = await Promise.all(
          usersData.map(async (u: any) => {
            const signedAvatar = await getSignedAvatarUrl(u.avatar);
            return {
              id: u.id,
              name: `${u.first_name} ${u.last_name}`,
              avatar: signedAvatar || DEFAULT_AVATAR,
              type: u.profile,
              email: u.e_mail,
              phone: u.phone,
              details: u.details, // Use the details from RPC
            };
          })
        );
        setAllUsers(usersList);
        console.log("Fetched all users:", usersList.length, usersList); // Debugging log

        // Fetch conversations where the current user is a member
        const { data: memberConversations, error: memberError } = await supabase
          .from('conversation_members')
          .select('conversation_id, conversations(*)')
          .eq('user_id', Number(user.id));
        if (memberError) {
          console.error('Error fetching member conversations:', memberError);
          return;
        }

        const fetchedChats: Chat[] = [];
        for (const memberConv of memberConversations) {
          const conv = memberConv.conversations;
          if (!conv) continue;

          // Fetch participants for each conversation
          // IMPORTANT: Fetch ALL participants, including the current user, for correct sender display
          const { data: participantsData, error: participantsError } = await supabase
            .from('conversation_members')
            .select('user_id, users(id, first_name, last_name, avatar, e_mail, phone, profile)')
            .eq('conversation_id', conv.id);

          if (participantsError) {
            console.error('Error fetching participants:', participantsError);
            continue;
          }

          const participants: Contact[] = await Promise.all(participantsData.map(async (p: any) => {
            const signedAvatar = await getSignedAvatarUrl(p.users.avatar);
            return {
              id: Number(p.users.id),
              name: `${p.users.first_name} ${p.users.last_name}`,
              avatar: signedAvatar || DEFAULT_AVATAR,
              type: p.users.profile,
              email: p.users.e_mail,
              phone: p.users.phone,
              details: '',
            };
          }));

          // Fetch last message for chat list display
          const { data: lastMessageData, error: lastMessageError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastMessageError && lastMessageError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error('Error fetching last message:', lastMessageError);
          }

          const lastMessage: Message | undefined = lastMessageData ? {
           id: Number(lastMessageData.id),
            senderId: Number(lastMessageData.sender_id),
            content: lastMessageData.content,
            image: lastMessageData.file_url && (lastMessageData.file_url.includes('.jpg') || lastMessageData.file_url.includes('.png') || lastMessageData.file_url.includes('.jpeg')) ? lastMessageData.file_url : undefined,
            file: lastMessageData.file_url && !(lastMessageData.file_url.includes('.jpg') || lastMessageData.file_url.includes('.png') || lastMessageData.file_url.includes('.jpeg')) ? {
              name: lastMessageData.file_url.split('/').pop() || 'file',
              uri: lastMessageData.file_url,
              type: 'application/octet-stream'
            } : undefined,
            timestamp: new Date(lastMessageData.created_at),
          } : undefined;

          fetchedChats.push({
            id: conv.id,
            name: conv.title,
            isGroup: conv.is_group,
            participants: participants, // Use the full list of participants
            messages: [], // Messages will be fetched when chat is active
            lastMessage: lastMessage,
            unreadCount: 0,
          });
        }
        setChats(fetchedChats);

        if (initialClientId) {
          const chat = fetchedChats.find(c =>
            c.participants.some(p => p.id === initialClientId)
          );
          if (chat) {
            setActiveChat(chat);
          }
        }

      } catch (e) {
        console.error("Error fetching initial data:", e);
      } finally {
        setIsLoadingChats(false);
      }
    };

    fetchInitialData();
  }, [user, initialClientId]);

  // --- 2. Fetch Messages for Active Chat ---
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeChat?.id) {
        setMessages([]);
        return;
      }
      setIsLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeChat.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages for active chat:', error);
        setMessages([]);
        setIsLoadingMessages(false);
        return;
      }

      setMessages(
        data.map((msg) => ({
          id: Number(msg.id),
          senderId: Number(msg.sender_id), 
          content: msg.content,
          image: msg.file_url && (msg.file_url.includes('.jpg') || msg.file_url.includes('.png') || msg.file_url.includes('.jpeg')) ? msg.file_url : undefined,
          file: msg.file_url && !(msg.file_url.includes('.jpg') || msg.file_url.includes('.png') || msg.file_url.includes('.jpeg')) ? {
            name: msg.file_url.split('/').pop() || 'file',
            uri: msg.file_url,
            type: 'application/octet-stream'
          } : undefined,
          timestamp: new Date(msg.created_at),
        }))
      );
      setIsLoadingMessages(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    fetchMessages();
  }, [activeChat]);

  // --- 3. Realtime Subscription for New Messages ---
  useEffect(() => {
    if (!activeChat?.id) {
      supabase.removeAllChannels();
      return;
    }

    const channel = supabase
      .channel(`conversation-${activeChat.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeChat.id}`
        },
        (payload) => {
          const newMsg: Message = {
            id: Number(payload.new.id),
            senderId: Number(payload.new.sender_id),
            content: payload.new.content,
            image: payload.new.file_url && (payload.new.file_url.includes('.jpg') || payload.new.file_url.includes('.png') || payload.new.file_url.includes('.jpeg')) ? payload.new.file_url : undefined,
            file: payload.new.file_url && !(payload.new.file_url.includes('.jpg') || payload.new.file_url.includes('.png') || payload.new.file_url.includes('.jpeg')) ? {
                name: payload.new.file_url.split('/').pop() || 'file',
                uri: payload.new.file_url,
                type: 'application/octet-stream'
              } : undefined,
            timestamp: new Date(payload.new.created_at),
          };
          setMessages((prev) => [...prev, newMsg]);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat]);

  const filteredChats = chats.filter(chat => {
    const searchLower = searchQuery.toLowerCase();
    if (chat.isGroup && chat.name) {
      return chat.name.toLowerCase().includes(searchLower);
    }
    return chat.participants.some(p =>
      p.name.toLowerCase().includes(searchLower)
    );
  });

  const handleSend = useCallback(async (messageContent: string) => {
    if (!activeChat || (!messageContent.trim() && !messageContent.includes('://'))) return;

    const isFile = messageContent.includes('://');
    const content = isFile && !messageContent.includes('image') ? undefined : messageContent;
    const fileUrl = isFile ? messageContent : undefined;

    const { error } = await supabase.from('messages').insert({
  conversation_id: Number(activeChat.id),
  sender_id: Number(user?.id),
  content,
  file_url: fileUrl,
});

    if (error) {
      console.error('Erreur envoi message:', error);
      alert('Échec de l\'envoi du message.');
    }
  }, [activeChat, user]);

  const uploadFileToSupabase = async (fileUri: string, fileName: string, mimeType: string) => {
    const fileExtension = fileName.split('.').pop();
    const filePath = `chat_attachments/${user?.id}/${Date.now()}.${fileExtension}`;

    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('chat.attachments')
        .upload(filePath, blob, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) throw error;

      const publicUrl = supabase.storage.from('chat.attachments').getPublicUrl(data.path).data.publicUrl;
      return publicUrl;
    } catch (e) {
      console.error('Error uploading file to Supabase Storage:', e);
      throw new Error('Échec du téléchargement du fichier.');
    }
  };

  const handleChooseImage = useCallback(async () => {
    if (!mediaPermission?.granted) {
      const permission = await requestMediaPermission();
      if (!permission.granted) {
        alert('Permission to access media library is required to choose photos.');
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
      try {
        const publicUrl = await uploadFileToSupabase(asset.uri, asset.fileName || 'image.jpg', asset.mimeType || 'image/jpeg');
        handleSend(publicUrl);
      } catch (e: any) {
        alert(e.message);
      }
    }
    setShowAttachmentOptions(false);
  }, [mediaPermission, requestMediaPermission, handleSend]);

  const handleChooseDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length) {
        const file = result.assets[0];
        try {
          const publicUrl = await uploadFileToSupabase(file.uri, file.name, file.mimeType || 'application/octet-stream');
          handleSend(publicUrl);
        } catch (e: any) {
          alert(e.message);
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Une erreur est survenue lors de la sélection du document.');
    } finally {
      setShowAttachmentOptions(false);
    }
  }, [handleSend]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const toggleContactSelection = (contact: Contact) => {
    setSelectedContacts(prev => {
      if (prev.some(c => c.id === contact.id)) {
        return prev.filter(c => c.id !== contact.id);
      } else {
        return [...prev, contact];
      }
    });
  };

  const handleCreateConversation = useCallback(async () => {
    if (selectedContacts.length === 0) return;

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

      const membersToInsert = selectedContacts.map(contact => ({
        conversation_id: newConv.id,
        user_id: contact.id,
      }));
      if (user?.id) {
        membersToInsert.push({
          conversation_id: newConv.id,
          user_id: user.id,
        });
      }

      const { error: membersError } = await supabase
        .from('conversation_members')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      const newChat: Chat = {
        id: newConv.id,
        name: newConv.title || '',
        isGroup: newConv.is_group,
        participants: [...selectedContacts, { // Add current user to participants for local state
          id: user?.id || '',
          name: user?.firstName + ' ' + user?.lastName || 'Current User',
          avatar: user?.avatar || DEFAULT_AVATAR,
          type: user?.role || 'unknown',
          email: user?.email || '',
          phone: user?.phone || '',
        }],
        messages: [],
        unreadCount: 0,
      };

      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat); // Set the new chat as active

      setShowNewConversationModal(false);
      setContactSearchQuery('');
      setSelectedContacts([]);
      setSelectedContactType('all');
      alert('Conversation créée avec succès !');

    } catch (e: any) {
      console.error('Error creating new conversation:', e);
      alert('Échec de la création de la conversation: ' + e.message);
    } finally {
      setIsCreatingConversation(false);
    }
  }, [selectedContacts, user]);

  const getContactTypeIcon = (type: Contact['type']) => {
    switch (type) {
      case 'pleasure_boater':
        return <User size={16} color="#0EA5E9" />;
      case 'boat_manager':
        return <User size={16} color="#10B981" />;
      case 'nautical_company':
        return <Building size={16} color="#8B5CF6" />;
      case 'corporate':
        return <Building size={16} color="#F59E0B" />;
      default:
        return <User size={16} color="#666" />;
    }
  };

  const getContactTypeLabel = (type: Contact['type']) => {
    switch (type) {
      case 'pleasure_boater':
        return 'Plaisancier';
      case 'boat_manager':
        return 'Boat Manager';
      case 'nautical_company':
        return 'Entreprise du nautisme';
      case 'corporate':
        return 'Corporate';
      default:
        return type;
    }
  };

  const getContactTypeColor = (type: Contact['type']) => {
    switch (type) {
      case 'pleasure_boater':
        return '#0EA5E9';
      case 'boat_manager':
        return '#10B981';
      case 'nautical_company':
        return '#8B5CF6';
      case 'corporate':
        return '#F59E0B';
      default:
        return '#666';
    }
  };

  const handleCall = () => {
    if (activeChat) {
      const otherParticipant = activeChat.isGroup
        ? null
        : activeChat.participants.find(p => p.id !== user?.id);

      if (otherParticipant) {
        alert(`Appel à ${otherParticipant.name} au ${otherParticipant.phone}`);
      } else if (activeChat.isGroup) {
        alert(`Appel de groupe à ${activeChat.name}`);
      }
    }
  };

  const handleVideoCall = () => {
    if (activeChat) {
      const otherParticipant = activeChat.isGroup
        ? null
        : activeChat.participants.find(p => p.id !== user?.id);

      if (otherParticipant) {
        alert(`Appel vidéo à ${otherParticipant.name}`);
      } else if (activeChat.isGroup) {
        alert(`Appel vidéo de groupe à ${activeChat.name}`);
      }
    }
  };

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
        <TouchableOpacity
          style={styles.newConversationButton}
          onPress={() => setShowNewConversationModal(true)}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      {isLoadingChats ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Chargement des conversations...</Text>
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Aucune conversation trouvée.</Text>
        </View>
      ) : (
        filteredChats.map(chat => {
          const lastMessage = chat.lastMessage;
          // Determine the participant to display in the chat list
          // For group chats, use the group name and the avatar of the first participant (or a generic group avatar)
          // For 1-on-1 chats, find the other participant (not the current user)
         const displayParticipant = chat.isGroup
  ? null // tu affiches une icône/nom de groupe générique
  : chat.participants.find(p => p.id !== user?.id);

const chatItemName = chat.isGroup ? chat.name || "Groupe" : displayParticipant?.name;
const chatItemAvatar = chat.isGroup
  ? DEFAULT_AVATAR // ou une icône spéciale pour les groupes
  : displayParticipant?.avatar || DEFAULT_AVATAR;

          return (
            <TouchableOpacity
              key={chat.id}
              style={[
                styles.chatItem,
                activeChat?.id === chat.id && styles.activeChatItem
              ]}
              onPress={() => {
                setActiveChat(chat);
                // Mark messages as read when opening chat (logic to be implemented)
                setChats(prevChats => prevChats.map(c =>
                  c.id === chat.id ? { ...c, unreadCount: 0 } : c
                ));
              }}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: chatItemAvatar }}
                  style={styles.avatar}
                />
                {displayParticipant?.online && <View style={styles.onlineIndicator} />}
              </View>
              <View style={styles.chatItemContent}>
                <View style={styles.chatItemHeader}>
                  <Text style={styles.chatItemName}>
                    {chatItemName}
                  </Text>
                  {lastMessage && (
                    <Text style={styles.chatItemTime}>
                      {formatTime(lastMessage.timestamp)}
                    </Text>
                  )}
                </View>
                {lastMessage && (
                  <Text
  style={[
  styles.chatItemLastMessage,
  (chat.unreadCount ?? 0) > 0 && styles.unreadMessage
]}
  numberOfLines={1}
>
  {lastMessage.senderId === currentUserId ? 'Vous : ' : ''}
  {lastMessage.content ||
    (lastMessage.image ? 'Image' :
    lastMessage.file ? `Document: ${lastMessage.file.name}` : '')}
</Text>
                )}
                {/* Display boat info only for pleasure boaters in 1-on-1 chats */}
                {!chat.isGroup && displayParticipant?.type === 'pleasure_boater' && (
                  <View style={styles.boatsList}>
                    {/* You'll need to fetch boat data for pleasure boaters if not already in Contact interface */}
                    {/* For now, it's a placeholder */}
                    {/*
                    {mockClients.find(c => c.id === displayParticipant.id)?.boats.map(boat => (
                      <View key={boat.id} style={styles.boatBadge}>
                        <Boat size={12} color="#0066CC" />
                        <Text style={styles.boatName}>
                          {boat.name}
                        </Text>
                      </View>
                    ))}
                    */}
                  </View>
                )}
              </View>
              {(chat.unreadCount ?? 0) > 0 && (
  <View style={styles.unreadBadge}>
    <Text style={styles.unreadCount}>{chat.unreadCount}</Text>
  </View>
)}
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );

  const ChatView = () => {
    if (!activeChat) return null;

    // Déterminer le participant à afficher dans l'en-tête de la conversation
    // Pour les conversations de groupe, utiliser le nom du groupe et l'avatar du premier participant (ou un autre si le premier est l'utilisateur connecté)
    // Pour les conversations individuelles, trouver l'autre participant (pas l'utilisateur connecté)
    let headerDisplayParticipant: Contact | undefined;

if (!activeChat.isGroup) {
  // conv 1-to-1 → toujours l’autre
  headerDisplayParticipant = activeChat.participants.find(p => p.id !== user?.id);
} else {
  // groupe → avatar générique
  headerDisplayParticipant = activeChat.participants.find(p => p.id !== user?.id) || activeChat.participants[0];
}

const headerName = activeChat.isGroup
  ? activeChat.name || "Groupe"
  : headerDisplayParticipant?.name;

const headerAvatar = activeChat.isGroup
  ? DEFAULT_AVATAR
  : headerDisplayParticipant?.avatar || DEFAULT_AVATAR;


    return (
      <KeyboardAvoidingView
  style={styles.chatView}
  behavior={Platform.select({ ios: 'padding', android: 'height' })}
  keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + headerHeight : 0}
>
        <View style={styles.chatHeader} onLayout={e => setHeaderHeight(e.nativeEvent.layout.height)}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setActiveChat(null)}
          >
            <ChevronLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Image
            source={{ uri: headerAvatar }} // Utiliser l'avatar déterminé
            style={styles.headerAvatar}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {headerName}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleCall}
            >
              <Phone size={24} color="#0066CC" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleVideoCall}
            >
              <Video size={24} color="#0066CC" />
            </TouchableOpacity>
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
            {messages.map((msg, index) => {
              const isOwnMessage = msg.senderId === user?.id;
              const sender = activeChat.participants.find(p => p.id === msg.senderId);
              const showDate = index === 0 ||
                formatDate(messages[index - 1].timestamp) !== formatDate(msg.timestamp);

              return (
                <View key={msg.id}>
                  {showDate && (
                    <View style={styles.dateHeader}>
                      <Text style={styles.dateText}>
                        {formatDate(msg.timestamp)}
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageContainer,
                      isOwnMessage ? styles.ownMessage : styles.otherMessage,
                    ]}
                  >
                    {activeChat.isGroup && !isOwnMessage && (
                      <Text style={styles.messageSender}>{sender?.name}</Text>
                    )}
                    {msg.image ? (
                      <Image
                        source={{ uri: msg.image }}
                        style={styles.messageImage}
                      />
                    ) : msg.file ? (
                      <View style={styles.messageFileContainer}>
                        <FileText size={24} color={isOwnMessage ? 'white' : '#1a1a1a'} />
                        <Text style={[
                          styles.messageFileName,
                          isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                        ]}>
                          {msg.file.name}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[
                        styles.messageText,
                        isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                      ]}>
                        {msg.content}
                      </Text>
                    )}
                    <Text style={[
                      styles.messageTime,
                      isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
                    ]}>
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
        handleCreateConversation={handleCreateConversation}
        isCreatingConversation={isCreatingConversation}
        getContactTypeIcon={getContactTypeIcon}
        getContactTypeLabel={getContactTypeLabel}
        getContactTypeColor={getContactTypeColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  chatList: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  // Removed newConversationButton styles
  /*
  newConversationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  */
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
  width: 56,
  height: 56,
  borderRadius: 28,
},
  onlineIndicator: {
  position: 'absolute',
  right: -1,                // petit décalage vers l’extérieur
  bottom: -1,
  width: 14,
  height: 14,
  borderRadius: 7,
  backgroundColor: '#10B981',
  borderWidth: 3,           // anneau blanc net autour du point
  borderColor: '#fff',
},
  chatItem: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,

  // look "carte"
  backgroundColor: '#fff',
  borderRadius: 16,                 // + doux
  paddingHorizontal: 16,            // + d’espace interne
  paddingVertical: 12,
  marginHorizontal: 12,
  marginVertical: 6,

  // ombre subtile
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 6px 16px rgba(0,0,0,0.06)' },
  }),
},

activeChatItem: {
  backgroundColor: '#F0F7FF',
},


  chatItemContent: {
  flex: 1,
  minWidth: 0,              // indispensable pour l’ellipsis
  marginLeft: 12,
  justifyContent: 'center',
},
  chatItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatItemName: {
  flexShrink: 1,
  marginRight: 8,
  fontSize: 16,
  fontWeight: '700',
  color: '#0F172A',         // slate-900
},
  chatItemTime: {
  fontSize: 12,
  color: '#94A3B8',         // slate-400
  flexShrink: 0,
},
  chatItemLastMessage: {
  fontSize: 14,
  color: '#64748B',         // slate-500
  marginTop: 2,
  marginBottom: 4,
},
  unreadMessage: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
  boatsList: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 6,
  marginTop: 2,
},
  boatBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 10,
  paddingVertical: 4,
  backgroundColor: '#EFF6FF', // bleu très clair
  borderRadius: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',     // gris clair
},
  boatName: {
    fontSize: 12,
    color: '#0066CC',
  },
  unreadBadge: {
  minWidth: 24,
  height: 24,
  paddingHorizontal: 8,
  borderRadius: 12,
  backgroundColor: '#0066CC',
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 8,
  alignSelf: 'center',
  ...Platform.select({
    ios: {
      shadowColor: '#0066CC',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
    },
    android: { elevation: 1 },
  }),
},
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  chatView: {
    flex: 1,
    backgroundColor: '#f0f7ff',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerStatus: {
    fontSize: 12,
    color: '#666',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerAction: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 8,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#0066CC',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '500',
    color: '#0066CC',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: 'white',
  },
  otherMessageText: {
    color: '#1a1a1a',
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
  },
  messageFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  messageFileName: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageTime: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherMessageTime: {
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      },
    }),
    flex: 1, // Added flex: 1
    minHeight: '50%', // Added minHeight
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    padding: 4,
  },
  contactTypeFilter: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: 'white',
    gap: 6,
  },
  contactTypeButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  contactTypeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  contactTypeButtonTextActive: {
    color: 'white',
    fontWeight: '500',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  selectedContactsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  selectedContactsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  selectedContactsScroll: {
    maxHeight: 60,
  },
  selectedContactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    gap: 8,
  },
  selectedContactAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  selectedContactName: {
    fontSize: 14,
    color: '#0066CC',
  },
  removeSelectedContactButton: {
    padding: 2,
  },
  contactsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  contactItemSelected: {
    backgroundColor: '#f0f7ff',
  },
  contactItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  contactItemAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  contactItemInfo: {
    flex: 1,
  },
  contactItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  contactItemTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  contactItemType: {
    fontSize: 12,
    fontWeight: '500',
  },
  contactItemDetails: {
    fontSize: 12,
    color: '#666',
  },
  contactItemCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactItemCheckboxSelected: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  createConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0066CC',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
  createConversationButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  createConversationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },


  newConversationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0066CC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
      },
    }),
  },
});
