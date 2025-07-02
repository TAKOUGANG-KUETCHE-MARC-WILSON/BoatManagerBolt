import { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, Platform, KeyboardAvoidingView, Modal } from 'react-native';
import { Send, Search, ChevronLeft, Phone, Mail, Bot as Boat, User, Building, Plus, X, Check, MessageSquare, Video, Paperclip, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import ChatInput from '@/components/ChatInput'; // Import the new ChatInput component

interface Message {
  id: string;
  senderId: string;
  text?: string;
  image?: string;
  timestamp: Date;
}

interface Client {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  boats: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  lastMessage?: Message;
  unreadCount?: number;
  online?: boolean;
}

interface Contact {
  id: string;
  name: string;
  avatar: string;
  type: 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'corporate';
  email: string;
  phone: string;
  details?: string;
  online?: boolean;
}

// Mock data
const mockClients: Client[] = [
  {
    id: '1',
    name: 'Jean Dupont',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    online: true,
    boats: [
      {
        id: '1',
        name: 'Le Grand Bleu',
        type: 'Voilier',
      },
    ],
    lastMessage: {
      id: '1',
      senderId: '1',
      text: "J'aimerais planifier une maintenance pour la semaine prochaine.",
      timestamp: new Date('2024-02-20T10:05:00'),
    },
    unreadCount: 2,
  },
  {
    id: '2',
    name: 'Sophie Martin',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    email: 'sophie.martin@example.com',
    phone: '+33 6 23 45 67 89',
    online: false,
    boats: [
      {
        id: '2',
        name: 'Le Petit Prince',
        type: 'Yacht',
      },
      {
        id: '3',
        name: "L'Aventurier",
        type: 'Catamaran',
      },
    ],
    lastMessage: {
      id: '2',
      senderId: 'nc1',
      text: 'Je vous confirme la date du prochain contrôle.',
      timestamp: new Date('2024-02-19T15:30:00'),
    },
  },
  {
    id: '3',
    name: 'Pierre Dubois',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    email: 'pierre.dubois@example.com',
    phone: '+33 6 34 56 78 90',
    online: true,
    boats: [
      {
        id: '4',
        name: 'Le Navigateur',
        type: 'Voilier',
      },
    ],
    lastMessage: {
      id: '3',
      senderId: '3',
      text: 'Merci pour votre intervention rapide.',
      timestamp: new Date('2024-02-18T09:15:00'),
    },
  },
];

// Mock contacts for new conversation
const mockContacts: Contact[] = [
  // Plaisanciers
  {
    id: 'pb1',
    name: 'Jean Dupont',
    avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=2070&auto=format&fit=crop',
    type: 'pleasure_boater',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    details: 'Le Grand Bleu (Voilier)',
    online: true,
  },
  {
    id: 'pb2',
    name: 'Sophie Martin',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=988&auto=format&fit=crop',
    type: 'pleasure_boater',
    email: 'sophie.martin@example.com',
    phone: '+33 6 23 45 67 89',
    details: 'Le Petit Prince (Yacht), L\'Aventurier (Catamaran)',
    online: false,
  },
  {
    id: 'pb3',
    name: 'Pierre Dubois',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    type: 'pleasure_boater',
    email: 'pierre.dubois@example.com',
    phone: '+33 6 34 56 78 90',
    details: 'Le Navigateur (Voilier)',
    online: true,
  },
  // Boat Managers
  {
    id: 'bm1',
    name: 'Marie Martin',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=987&auto=format&fit=crop',
    type: 'boat_manager',
    email: 'marie.martin@ybm.com',
    phone: '+33 6 12 34 56 78',
    details: 'Port de Marseille',
    online: true,
  },
  {
    id: 'bm2',
    name: 'Pierre Dubois',
    avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=987&auto=format&fit=crop',
    type: 'boat_manager',
    email: 'pierre.dubois@ybm.com',
    phone: '+33 6 23 45 67 89',
    details: 'Port de Nice',
    online: false,
  },
  // Entreprises du nautisme
  {
    id: 'nc1',
    name: 'Nautisme Pro',
    avatar: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?q=80&w=2069&auto=format&fit=crop',
    type: 'nautical_company',
    email: 'contact@nautismepro.com',
    phone: '+33 4 91 12 34 56',
    details: 'Maintenance, Réparation, Installation',
    online: true,
  },
  {
    id: 'nc2',
    name: 'Marine Services',
    avatar: 'https://images.unsplash.com/photo-1516937941344-00b4e0337589?q=80&w=2070&auto=format&fit=crop',
    type: 'nautical_company',
    email: 'contact@marineservices.com',
    phone: '+33 4 93 23 45 67',
    details: 'Maintenance, Contrôle, Amélioration',
    online: false,
  },
  // Corporate
  {
    id: 'corp1',
    name: 'Support YBM',
    avatar: 'https://images.unsplash.com/photo-1565884280295-98eb83e41c65?q=80&w=2148&auto=format&fit=crop',
    type: 'corporate',
    email: 'support@ybm.com',
    phone: '+33 1 23 45 67 89',
    details: 'Support technique',
    online: true,
  },
  {
    id: 'corp2',
    name: 'Admin YBM',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop',
    type: 'corporate',
    email: 'admin@ybm.com',
    phone: '+33 1 23 45 67 90',
    details: 'Administration',
    online: true,
  },
];

const mockMessages: Record<string, Message[]> = {
  '1': [
    {
      id: '1',
      senderId: 'bm1',
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
  '2': [
    {
      id: '3',
      senderId: '2',
      text: 'Quand pouvez-vous effectuer le prochain contrôle ?',
      timestamp: new Date('2024-02-19T15:25:00'),
    },
    {
      id: '4',
      senderId: 'bm1',
      text: 'Je vous confirme la date du prochain contrôle.',
      timestamp: new Date('2024-02-19T15:30:00'),
    },
  ],
  '3': [
    {
      id: '5',
      senderId: '3',
      text: 'Merci pour votre intervention rapide.',
      timestamp: new Date('2024-02-18T09:15:00'),
    },
    {
      id: '6',
      senderId: 'bm1',
      text: 'Je reste à votre disposition si besoin.',
      timestamp: new Date('2024-02-18T09:20:00'),
    },
  ],
};

export default function MessagesScreen() {
  const { client: initialClientId } = useLocalSearchParams<{ client?: string }>();
  const { user } = useAuth();
  const [activeClient, setActiveClient] = useState<Client | null>(
    initialClientId ? mockClients.find(c => c.id === initialClientId) || null : null
  );
  // Removed message state and setMessage
  const [searchQuery, setSearchQuery] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();
  const [messages, setMessages] = useState<Message[]>(
    initialClientId ? mockMessages[initialClientId] || [] : []
  );
  
  // New conversation modal state
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [selectedContactType, setSelectedContactType] = useState<'all' | 'pleasure_boater' | 'boat_manager' | 'nautical_company' | 'corporate'>('all');
  
  // Attachment options
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);

  const filteredClients = mockClients.filter(client => {
    const searchLower = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.boats.some(boat => boat.name.toLowerCase().includes(searchLower))
    );
  });

  // Filter contacts for new conversation
  const filteredContacts = mockContacts.filter(contact => {
    // Filter by search query
    const searchLower = contactSearchQuery.toLowerCase();
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower) ||
      (contact.details && contact.details.toLowerCase().includes(searchLower));
    
    // Filter by contact type
    const matchesType = selectedContactType === 'all' || contact.type === selectedContactType;
    
    return matchesSearch && matchesType;
  });

  const handleSend = useCallback((messageText: string) => {
    if (!activeClient || (!messageText.trim() && !messageText.startsWith('image:'))) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: user?.id || 'bm1',
      text: messageText.startsWith('image:') ? undefined : messageText,
      image: messageText.startsWith('image:') ? messageText.substring(6) : undefined,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    setShowAttachmentOptions(false);
  }, [activeClient, user, setMessages, scrollViewRef, setShowAttachmentOptions]);

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

    if (!result.canceled && activeClient) {
      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: user?.id || 'bm1',
        image: result.assets[0].uri,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, newMessage]);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    
    setShowAttachmentOptions(false);
  }, [mediaPermission, requestMediaPermission, activeClient, user, setMessages, scrollViewRef, setShowAttachmentOptions]);

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

    // For now, just close the modal and simulate starting a conversation with the first selected contact
    setShowNewConversationModal(false);
    
    // Reset state
    setContactSearchQuery('');
    setSelectedContacts([]);
    setSelectedContactType('all');
    
    // In a real app, you would create a new conversation and navigate to it
    alert(`Nouvelle conversation créée avec ${selectedContacts.map(c => c.name).join(', ')}`);
  };

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
    if (activeClient) {
      alert(`Appel à ${activeClient.name} au ${activeClient.phone}`);
    }
  };

  const handleVideoCall = () => {
    if (activeClient) {
      alert(`Appel vidéo à ${activeClient.name}`);
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

      {filteredClients.map(client => {
        const lastMessage = client.lastMessage;
        const hasUnread = client.unreadCount && client.unreadCount > 0;

        return (
          <TouchableOpacity
            key={client.id}
            style={[
              styles.chatItem,
              activeClient?.id === client.id && styles.activeChatItem
            ]}
            onPress={() => {
              setActiveClient(client);
              setMessages(mockMessages[client.id] || []);
            }}
          >
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: client.avatar }}
                style={styles.avatar}
              />
              {client.online && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.chatItemContent}>
              <View style={styles.chatItemHeader}>
                <Text style={styles.chatItemName}>
                  {client.name}
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
                    hasUnread && styles.unreadMessage
                  ]} 
                  numberOfLines={1}
                >
                  {lastMessage.senderId === (user?.id || 'bm1') ? 'Vous : ' : ''}
                  {lastMessage.text || 'Image'}
                </Text>
              )}
              <View style={styles.boatsList}>
                {client.boats.map(boat => (
                  <View key={boat.id} style={styles.boatBadge}>
                    <Boat size={12} color="#0066CC" />
                    <Text style={styles.boatName}>
                      {boat.name}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{client.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const ChatView = () => {
    if (!activeClient) return null;

    return (
      <KeyboardAvoidingView 
        style={styles.chatView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setActiveClient(null)}
          >
            <ChevronLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <Image
            source={{ uri: activeClient.avatar }}
            style={styles.headerAvatar}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {activeClient.name}
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

        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map((msg, index) => {
            const isOwnMessage = msg.senderId === (user?.id || 'bm1');
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
                    {formatTime(msg.timestamp)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <ChatInput
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
        boxShadow: '0 2px 4px rgba(0, 102, 204, 0.2)',
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

