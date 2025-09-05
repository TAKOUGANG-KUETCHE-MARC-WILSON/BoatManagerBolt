// components/ChatInput.tsx
import React, { memo, useState, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import { Send, Paperclip, Camera, Image as ImageIcon, FileText } from 'lucide-react-native'; // Import FileText icon

interface ChatInputProps {
  handleSend: (messageText: string) => void;
  showAttachmentOptions: boolean;
  setShowAttachmentOptions: (show: boolean) => void;
  handleChooseImage: () => void;
  handleChooseDocument: () => void; // New prop for document selection
}

const ChatInput = memo(({
  handleSend,
  showAttachmentOptions,
  setShowAttachmentOptions,
  handleChooseImage,
  handleChooseDocument, // Destructure new prop
}: ChatInputProps) => {
  const [message, setMessage] = useState('');

  const internalHandleSend = useCallback(() => {
    if (!message.trim()) return;
    handleSend(message);
    setMessage('');
  }, [message, handleSend]);

  return (
    <View style={styles.inputContainer}>
      <TouchableOpacity
        style={styles.attachButton}
        onPress={() => setShowAttachmentOptions(!showAttachmentOptions)}
      >
        <Paperclip size={24} color="#0066CC" />
      </TouchableOpacity>

      {showAttachmentOptions && (
        <View style={styles.attachmentOptions}>
          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={handleChooseImage}
          >
            <Camera size={24} color="#0066CC" />
            <Text style={styles.attachmentOptionText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={handleChooseDocument} // Call handleChooseDocument
          >
            <FileText size={24} color="#0066CC" />
            <Text style={styles.attachmentOptionText}>Document</Text>
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Votre message..."
        value={message}
        onChangeText={setMessage}
        multiline
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          !message.trim() && styles.sendButtonDisabled
        ]}
        onPress={internalHandleSend}
        disabled={!message.trim()}
      >
        <Send size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 12,
    backgroundColor: 'white',
    position: 'relative',
  },
  attachButton: {
    padding: 12,
    backgroundColor: '#f0f7ff',
    borderRadius: 24,
  },
  attachmentOptions: {
    position: 'absolute',
    bottom: 70,
    left: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 16,
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
  attachmentOption: {
    alignItems: 'center',
    gap: 8,
    width: 60,
  },
  attachmentOptionText: {
    fontSize: 12,
    color: '#0066CC',
  },
  input: {
  flex: 1,
  backgroundColor: '#f8fafc',
  borderRadius: 24,
  paddingVertical: 8,
  paddingHorizontal: 16,
  maxHeight: 120,
  fontSize: 16,
  color: '#1a1a1a',
  textAlignVertical: 'top', // ← ajout
  ...Platform.select({
    web: { outlineStyle: 'none' },
  }),
},
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    alignItems: 'center',
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
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
});

export default ChatInput;

