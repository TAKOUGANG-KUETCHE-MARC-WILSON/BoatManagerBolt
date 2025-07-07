// app/(corporate)/messages.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import { Send, Search, ChevronLeft, Phone, Mail, Bot as Boat, User, Building, Plus, X, Check, MessageSquare, Video, Paperclip, Camera, Image as ImageIcon, FileText } from 'lucide-react-native'; // Import FileText icon
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker'; // Import DocumentPicker
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import ChatInput from '@/components/ChatInput';

interface Message {
  id: string;
  senderId: string;
  text?: string;
  image?: string;
  file?: { // New file property
    name: string;
    uri: string;
    type: string;
  };
  timestamp: Date;
}

interface Contact {
  id: string;
  name: string;
  role: 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'back_office';
  avatar: string;
  online?: boolean;
}

interface Chat {
  id: string;
  participants: Contact[];
  messages: Message[];
  isGroup: boolean;
  name?: string;
  unreadCount?: number;
}

// Mock data
const mockContacts: Contact[] = [
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
    participants: [mockContacts[0], mockContacts[1]],
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
    participants: mockContacts,
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
      {
        id: '5',
        senderId: '1',
        file: { // Example file message
          name: 'plan_bateau.pdf',
          uri: 'https://www.africau.edu/images/default/sample.pdf', // Sample PDF
          type: 'application/pdf',
        },
        timestamp: new Date('2024-02-19T15:35:00'),
      },
    ],
  },
];

// All available contacts for new conversation
const allContacts: Contact[] = [
  // Plaisanciers
  {
    id: 'pb1',
    name: 'Jean Dupont',
    role: 'pleasure_boater',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    online: true,
  },
  {
    id: 'pb2',
    name: 'Sophie Martin',
    role: 'pleasure_boater',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    online: false,
  },
  {
    id: 'pb3',
    name: 'Pierre Dubois',
    role: 'pleasure_boater',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    online: true,
  },
  // Boat Managers
  {
    id: 'bm1',
    name: 'Marie Martin',
    role: 'boat_manager',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop',
    online: true,
  },
  {
    id: 'bm2',
    name: 'Pierre Dubois',
    role: 'boat_manager',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    online: false,
  },
  // Entreprises du nautisme
  {
    id: 'nc1',
    name: 'Nautisme Pro',
    role: 'nautical_company',
    avatar: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop',
    online: true,
  },
  {
    id: 'nc2',
    name: 'Marine Services',
    role: 'nautical_company',
    avatar: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2070&auto=format&fit=crop',
    online: false,
  },
  // Corporate
  {
    id: 'corp1',
    name: 'Support YBM',
    role: 'back_office',
    avatar: 'https://images.unsplash.com/photo-1565884280295-98eb83e41c65?q=80&w=2148&auto=format&fit=crop',
    online: true,
  },
  {
    id: 'corp2',
    name: 'Admin YBM',
    role: 'back_office',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    online: true,
  },
];

export default function MessagesScreen() {
  const { contact: initialContactId } = useLocalSearchParams<{ contact?: string }>();
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState(mockChats);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  
  // New conversation modal state
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedContactType, setSelectedContactType] = useState<'all' | 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'back_office'>('all');
  
  // Attachment options
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);

  // Set initial active chat if contact param is provided
  useEffect(() => {
    if (initialContactId) {
      const chat = chats.find(c => 
        c.participants.some(p => p.id === initialContactId)
      );
      if (chat) {
        setActiveChat(chat);
      }
    }
  }, [initialContactId, chats]);

  const filteredChats = chats.filter(chat => {
    const searchLower = searchQuery.toLowerCase();
    if (chat.isGroup && chat.name) {
      return chat.name.toLowerCase().includes(searchLower);
    }
    return chat.participants.some(p => 
      p.name.toLowerCase().includes(searchLower)
    );
  });

  // Filter contacts for new conversation
  const filteredContacts = allContacts.filter(contact => {
    // Filter by search query
    const searchLower = contactSearchQuery.toLowerCase();
    const matchesSearch = contact.name.toLowerCase().includes(searchLower);
    
    // Filter by contact type
    const matchesType = selectedContactType === 'all' || contact.role === selectedContactType;
    
    return matchesSearch && matchesType;
  });

  const handleSend = useCallback((messageText: string) => {
    if (!activeChat || (!messageText.trim() && !messageText.startsWith('image:'))) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: user?.id || 'corp1',
      text: messageText.startsWith('image:') ? undefined : messageText,
      image: messageText.startsWith('image:') ? messageText.substring(6) : undefined,
      timestamp: new Date(),
    };

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
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    setShowAttachmentOptions(false);
  }, [activeChat, user, chats, setChats, scrollViewRef, setShowAttachmentOptions]);

  const handleChooseImage = useCallback(async () => {
    if (!mediaPermission?.granted) {
      const permission = await requestMediaPermission();
      if (!permission.granted) return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && activeChat) {
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: user?.id || 'corp1',
        image: result.assets[0].uri,
        timestamp: new Date(),
      };

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
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    
    setShowAttachmentOptions(false);
  }, [mediaPermission, requestMediaPermission, activeChat, user, chats, setChats, scrollViewRef, setShowAttachmentOptions]);

  // New handleChooseDocument function
  const handleChooseDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all document types
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && activeChat) {
        const file = result.assets[0];
        const newMessage: Message = {
          id: Date.now().toString(),
          senderId: user?.id || 'corp1',
          file: {
            name: file.name,
            uri: file.uri,
            type: file.mimeType || 'application/octet-stream', // Default to generic binary type
          },
          timestamp: new Date(),
        };

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

        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      alert('Une erreur est survenue lors de la sélection du document.');
    } finally {
      setShowAttachmentOptions(false);
    }
  }, [activeChat, user, chats, setChats, scrollViewRef, setShowAttachmentOptions]);

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

  // Handle toggling contact selection
  const toggleContactSelection = (contact: Contact) => {
    if (selectedContacts.some(c => c.id === contact.id)) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  // Handle creating a new conversation
  const handleCreateConversation = () => {
    if (selectedContacts.length === 0) {
      return;
    }

    // Create a new chat
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      participants: [...selectedContacts],
      isGroup: selectedContacts.length > 1,
      name: selectedContacts.length > 1 
        ? `Groupe avec ${selectedContacts.map(c => c.name).join(', ')}` 
        : undefined,
      messages: []
    };
    
    setChats([newChat, ...chats]);
    setActiveChat(newChat);
    setShowNewConversationModal(false);
    
    // Reset state
    setContactSearchQuery('');
    setSelectedContacts([]);
    setSelectedContactType('all');
  };

  const getContactTypeIcon = (type: Contact['role']) => {
    switch (type) {
      case 'pleasure_boater':
        return <User size={16} color="#0EA5E9" />;
      case 'boat_manager':
        return <User size={16} color="#10B981" />;
      case 'nautical_company':
        return <Building size={16} color="#8B5CF6" />;
      case 'back_office':
        return <Building size={16} color="#F59E0B" />;
      default:
        return <User size={16} color="#666" />;
    }
  };

  const getContactTypeLabel = (type: Contact['role']) => {
    switch (type) {
      case 'pleasure_boater':
        return 'Plaisancier';
      case 'boat_manager':
        return 'Boat Manager';
      case 'nautical_company':
        return 'Entreprise du nautisme';
      case 'back_office':
        return 'Corporate';
      default:
        return type;
    }
  };

  const getContactTypeColor = (type: Contact['role']) => {
    switch (type) {
      case 'pleasure_boater':
        return '#0EA5E9';
      case 'boat_manager':
        return '#10B981';
      case 'nautical_company':
        return '#8B5CF6';
      case 'back_office':
        return '#F59E0B';
      default:
        return '#666';
    }
  };

  const handleCall = () => {
    if (activeChat) {
      const otherParticipant = activeChat.isGroup
        ? null
        : activeChat.participants[0];
      
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
        : activeChat.participants[0];
      
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

      {filteredChats.map(chat => {
        const lastMessage = chat.messages[chat.messages.length - 1];
        const otherParticipant = chat.isGroup 
          ? { name: chat.name || 'Groupe' }
          : chat.participants[0];

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
                : otherParticipant.avatar 
              }}
              style={styles.avatar}
            />
            <View style={styles.chatItemContent}>
              <View style={styles.chatItemHeader}>
                <Text style={styles.chatItemName}>
                  {chat.isGroup ? chat.name : otherParticipant.name}
                </Text>
                <Text style={styles.chatItemTime}>
                  {lastMessage?.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
              <Text style={styles.chatItemLastMessage} numberOfLines={1}>
                {lastMessage?.text || (lastMessage?.image ? 'Image' : lastMessage?.file ? `Document: ${lastMessage.file.name}` : '')}
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
      : activeChat.participants[0];

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
            {activeChat.isGroup ? activeChat.name : otherParticipant.name}
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
            const isOwnMessage = msg.senderId === (user?.id || 'corp1');
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
                ) : msg.file ? ( // Render file message
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
                    {msg.text}
                  </Text>
                )}
                <Text style={[
                  styles.messageTime,
                  isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
                ]}>
                  {formatTime(msg.timestamp)}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <ChatInput
          handleSend={handleSend}
          showAttachmentOptions={showAttachmentOptions}
          setShowAttachmentOptions={setShowAttachmentOptions}
          handleChooseImage={handleChooseImage}
          handleChooseDocument={handleChooseDocument} // Pass the new function
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
                setContactSearchQuery('');
                setSelectedContacts([]);
                setSelectedContactType('all');
              }}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {/* Contact type filter */}
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
                  selectedContactType === 'back_office' && styles.contactTypeButtonActive,
                  { borderColor: '#F59E0B' }
                ]}
                onPress={() => setSelectedContactType('back_office')}
              >
                <Building size={16} color={selectedContactType === 'back_office' ? 'white' : '#F59E0B'} />
                <Text style={[
                  styles.contactTypeButtonText,
                  selectedContactType === 'back_office' && styles.contactTypeButtonTextActive,
                  { color: selectedContactType === 'back_office' ? 'white' : '#F59E0B' }
                ]}>
                  Corporate
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          
          {/* Search bar */}
          <View style={styles.modalSearchContainer}>
            <Search size={20} color="#666" />
            <TextInput
              style={styles.modalSearchInput}
              placeholder="Rechercher un contact..."
              value={contactSearchQuery}
              onChangeText={setContactSearchQuery}
            />
          </View>
          
          {/* Selected contacts */}
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
          
          {/* Contacts list */}
          <ScrollView style={styles.contactsList}>
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
          
          {/* Create conversation button */}
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
      {activeClient ? <ChatView /> : <ChatList />}
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
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: 'white',
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
    marginBottom: 8,
  },
  unreadMessage: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
  boatsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  boatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  boatName: {
    fontSize: 12,
    color: '#0066CC',
  },
  unreadBadge: {
    backgroundColor: '#0066CC',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  messageFileContainer: { // New style for file messages
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  messageFileName: { // New style for file name
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
  // New conversation modal styles
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
});

