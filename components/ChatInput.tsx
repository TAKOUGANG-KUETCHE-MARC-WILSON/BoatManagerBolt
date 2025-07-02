import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import { Send, Search, ChevronLeft, Phone, Mail, Bot as Boat, User, Building, Plus, X, Check, MessageSquare, Video, Paperclip, Camera, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import ChatInput from '@/components/ChatInput'; // Import the new ChatInput component

type UserRole = 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'back_office';

interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  online?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  text?: string;
  image?: string;
  file?: {
    name: string;
    url: string;
    type: string;
  };
  timestamp: Date;
}

interface Chat {
  id: string;
  participants: User[];
  messages: Message[];
  isGroup: boolean;
  name?: string;
  lastMessage?: Message;
}

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Jean Dupont',
    role: 'pleasure_boater',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    online: true,
  },
  {
    id: '2',
    name: 'Marie Martin',
    role: 'boat_manager',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop',
    online: true,
  },
  {
    id: '3',
    name: 'Nautique Pro',
    role: 'nautical_company',
    avatar: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop',
    online: false,
  },
  {
    id: '4',
    name: 'Support YBM',
    role: 'back_office',
    avatar: 'https://images.unsplash.com/photo-1565884280295-98eb83e41c65?q=80&w=2148&auto=format&fit=crop',
    online: true,
  },
];

const mockChats: Chat[] = [
  {
    id: '1',
    participants: [mockUsers[0], mockUsers[1]],
    isGroup: false,
    messages: [
      {
        id: '1',
        senderId: '2',
        text: 'Bonjour, comment puis-je vous aider avec votre bateau ?',
        timestamp: new Date('2024-02-20T10:00:00'),
      },
      {
        id: '2',
        senderId: '1',
        text: "J'aimerais planifier une maintenance pour la semaine prochaine.",
        timestamp: new Date('2024-02-20T10:05:00'),
      },
    ],
  },
  {
    id: '2',
    participants: mockUsers,
    isGroup: true,
    name: 'Projet Maintenance',
    messages: [
      {
        id: '3',
        senderId: '1',
        text: 'Voici les photos du dernier contrôle',
        timestamp: new Date('2024-02-19T15:30:00'),
      },
      {
        id: '4',
        senderId: '3',
        image: 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?q=80&w=2070&auto=format&fit=crop',
        timestamp: new Date('2024-02-19T15:31:00'),
      },
    ],
  },
];

export default function MessagesScreen() {
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  // Removed message state and setMessage
  const [chats, setChats] = useState(mockChats);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<User[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  // Removed messageRef and its useEffect

  const filteredChats = chats.filter(chat => {
    const searchLower = searchQuery.toLowerCase();
    if (chat.isGroup && chat.name) {
      return chat.name.toLowerCase().includes(searchLower);
    }
    return chat.participants.some(p =>
      p.name.toLowerCase().includes(searchLower)
    );
  });

  // handleSend now accepts messageText as an argument
  const handleSend = useCallback((messageText: string) => {
    // Check if there's an active chat and if the message is not empty (after trimming whitespace)
    // or if it's an image message (which might not have text.trim())
    if (!activeChat || (!messageText.trim() && !messageText.startsWith('image:'))) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: user?.id || '1', // Use current user's ID or a default
      text: messageText.startsWith('image:') ? undefined : messageText, // Don't set text if it's an image URI
      image: messageText.startsWith('image:') ? messageText.substring(6) : undefined, // Extract image URI
      timestamp: new Date(),
    };

    // Update the messages for the active chat
    const updatedChats = chats.map(chat => {
      if (chat.id === activeChat.id) {
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
        };
      }
      return chat;
    });

    setChats(updatedChats);
    // No need to clear message state here, ChatInput manages its own
    
    // Scroll to the end of the chat after a short delay to allow UI to update
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    setShowAttachmentOptions(false); // Hide attachment options after sending
  }, [activeChat, user, chats, setChats, scrollViewRef, setShowAttachmentOptions]); // Removed message from dependency array

  const handleChooseImage = useCallback(async () => {
    // Request media library permissions if not granted
    if (!mediaPermission?.granted) {
      const permission = await requestMediaPermission();
      if (!permission.granted) {
        alert('Permission to access media library is required to choose photos.');
        return;
      }
    }

    // Launch image library
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && activeChat) {
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: user?.id || '1', // Use current user's ID or a default
        image: result.assets[0].uri,
        timestamp: new Date(),
      };

      // Directly update the messages state for the active chat
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === activeChat.id
            ? { ...chat, messages: [...chat.messages, newMessage] }
            : chat
        )
      );

      // Scroll to the end of the chat after a short delay
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }

    setShowAttachmentOptions(false); // Hide attachment options
  }, [mediaPermission, requestMediaPermission, activeChat, user, setChats, scrollViewRef, setShowAttachmentOptions]);

  const handleCall = () => {
    if (activeChat) {
      const otherParticipant = activeChat.isGroup
        ? null
        : activeChat.participants.find(p => p.id !== (user?.id || '1'));

      if (otherParticipant) {
        alert(`Appel à ${otherParticipant.name}`);
      } else if (activeChat.isGroup) {
        alert(`Appel de groupe à ${activeChat.name}`);
      }
    }
  };

  const handleVideoCall = () => {
    if (activeChat) {
      const otherParticipant = activeChat.isGroup
        ? null
        : activeChat.participants.find(p => p.id !== (user?.id || '1'));

      if (otherParticipant) {
        alert(`Appel vidéo à ${otherParticipant.name}`);
      } else if (activeChat.isGroup) {
        alert(`Appel vidéo de groupe à ${activeChat.name}`);
      }
    }
  };

  const handleCreateConversation = () => {
    if (selectedContacts.length === 0) return;

    // Create a new chat
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      participants: [...selectedContacts, mockUsers[0]], // Add current user
      isGroup: selectedContacts.length > 1,
      name: selectedContacts.length > 1
        ? `Groupe avec ${selectedContacts.map(c => c.name).join(', ')}`
        : undefined,
      messages: []
    };

    setChats([newChat, ...chats]);
    setActiveChat(newChat);
    setShowNewConversationModal(false);
    setSelectedContacts([]);
    setContactSearchQuery('');
  };

  const toggleContactSelection = (contact: User) => {
    if (selectedContacts.some(c => c.id === contact.id)) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
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

      {filteredChats.map(chat => {
        const lastMessage = chat.messages[chat.messages.length - 1];
        const otherParticipant = chat.isGroup
          ? { name: chat.name || 'Groupe' }
          : chat.participants.find(p => p.id !== (user?.id || '1'));

        return (
          <TouchableOpacity
            key={chat.id}
            style={[
              styles.chatItem,
              activeChat?.id === chat.id && styles.activeChatItem
            ]}
            onPress={() => setActiveChat(chat)}
          >
            <Image
              source={{ uri: chat.isGroup
                ? chat.participants[0].avatar
                : otherParticipant?.avatar
              }}
              style={styles.avatar}
            />
            <View style={styles.chatItemContent}>
              <View style={styles.chatItemHeader}>
                <Text style={styles.chatItemName}>
                  {chat.isGroup ? chat.name : otherParticipant?.name}
                </Text>
                <Text style={styles.chatItemTime}>
                  {lastMessage?.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <Text style={styles.chatItemLastMessage} numberOfLines={1}>
                {lastMessage?.text || (lastMessage?.image ? 'Image' : '')}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const ChatView = () => {
    if (!activeChat) return null;

    const otherParticipant = activeChat.isGroup
      ? { name: activeChat.name || 'Groupe' }
      : activeChat.participants.find(p => p.id !== (user?.id || '1'));

    return (
      <KeyboardAvoidingView
        style={styles.chatView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setActiveChat(null)}
          >
            <ChevronLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Text style={styles.headerName}>
            {activeChat.isGroup ? activeChat.name : otherParticipant?.name}
          </Text>
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

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
        >
          {activeChat.messages.map((msg, index) => {
            const isOwnMessage = msg.senderId === (user?.id || '1');
            const sender = activeChat.participants.find(p => p.id === msg.senderId);

            return (
              <View
                key={msg.id}
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
                ) : (
                  <Text style={[
                    styles.messageText,
                    isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
                  ]}>
                    {msg.text}
                  </Text>
                )}
                <Text style={[
                  styles.messageTime,
                  isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
                ]}>
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Use the new ChatInput component */}
        <ChatInput
          // message and setMessage are no longer passed as props
          handleSend={handleSend}
          showAttachmentOptions={showAttachmentOptions}
          setShowAttachmentOptions={setShowAttachmentOptions}
          handleChooseImage={handleChooseImage}
        />
      </KeyboardAvoidingView>
    );
  };

  // New Conversation Modal
  const NewConversationModal = () => (
    <Modal
      visible={showNewConversationModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowNewConversationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle conversation</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowNewConversationModal(false);
                setSelectedContacts([]);
              }}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
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

          <ScrollView style={styles.contactsList}>
            {mockUsers.filter(u => u.id !== '1' && (
              !contactSearchQuery ||
              u.name.toLowerCase().includes(contactSearchQuery.toLowerCase())
            )).map(contact => (
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
                    <Text style={styles.contactItemRole}>
                      {contact.role === 'boat_manager' ? 'Boat Manager' :
                       contact.role === 'nautical_company' ? 'Entreprise du nautisme' :
                       contact.role === 'back_office' ? 'Support YBM' :
                       'Plaisancier'}
                    </Text>
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
              disabled={selectedContacts.length === 0}
            >
              <MessageSquare size={20} color="white" />
              <Text style={styles.createConversationButtonText}>
                Créer la conversation
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {activeChat ? <ChatView /> : <ChatList />}
      <NewConversationModal />
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
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  activeChatItem: {
    backgroundColor: '#f0f7ff',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  chatItemContent: {
    flex: 1,
  },
  chatItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  chatItemTime: {
    fontSize: 12,
    color: '#666',
  },
  chatItemLastMessage: {
    fontSize: 14,
    color: '#666',
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
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
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
  // Input container styles are now in ChatInput.tsx
  // attachButton styles are now in ChatInput.tsx
  // attachmentOptions styles are now in ChatInput.tsx
  // attachmentOption styles are now in ChatInput.tsx
  // attachmentOptionText styles are now in ChatInput.tsx
  // input styles are now in ChatInput.tsx
  // sendButton styles are now in ChatInput.tsx
  // sendButtonDisabled styles are now in ChatInput.tsx
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
  closeButton: {
    padding: 4,
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
  contactItemRole: {
    fontSize: 14,
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
});
