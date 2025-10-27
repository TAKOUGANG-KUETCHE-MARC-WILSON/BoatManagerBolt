// components/ChatInput.tsx
import React, { memo, useState, useCallback, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform, Text, Keyboard } from 'react-native';
import { Send, Paperclip, Camera, FileText } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const INPUT_BAR_MIN_HEIGHT = 52; // utilisé pour le padding bas côté liste

interface ChatInputProps {
  handleSend: (messageText: string) => void | Promise<void>;
  showAttachmentOptions: boolean;
  setShowAttachmentOptions: (show: boolean) => void;
  handleChooseImage: () => void;
  handleChooseDocument: () => void;

  // 🔸 mode contrôlé (optionnel)
  value?: string;
  onChangeText?: (text: string) => void;
}

const ChatInput = memo(({
  handleSend,
  showAttachmentOptions,
  setShowAttachmentOptions,
  handleChooseImage,
  handleChooseDocument,
  value,
  onChangeText,
}: ChatInputProps) => {
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState(false);

  // On ferme juste les options PJ quand le clavier s’ouvre
  useEffect(() => {
    const evt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(evt, () => setShowAttachmentOptions(false));
    return () => sub.remove();
  }, [setShowAttachmentOptions]);

  // mode contrôlé / non-contrôlé
  const [inner, setInner] = useState('');
  const controlled = typeof value === 'string';
  const text = controlled ? (value as string) : inner;
  const setText = controlled ? (onChangeText as (t: string) => void) : setInner;

  const internalHandleSend = useCallback(async () => {
    const trimmed = (text || '').trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await Promise.resolve(handleSend(trimmed));
      if (!controlled) setText('');
      setShowAttachmentOptions(false);
    } finally {
      setSending(false);
    }
  }, [text, sending, handleSend, setShowAttachmentOptions, controlled, setText]);

  // padding bas: constant, basé sur le safe area
  const bottomPad = Math.max(Platform.OS === 'ios' ? 6 : 4, insets.bottom);
  const attachmentBottomOffset = 70 + Math.max(0, bottomPad - 8);

  return (
    <View style={[styles.inputContainer, { paddingBottom: bottomPad, minHeight: INPUT_BAR_MIN_HEIGHT }]}>
      
      <TouchableOpacity
        style={styles.attachButton}
        onPress={() => setShowAttachmentOptions(!showAttachmentOptions)}
        accessibilityRole="button"
        accessibilityLabel={showAttachmentOptions ? "Fermer les options de pièces jointes" : "Ouvrir les options de pièces jointes"}
        accessibilityHint="Joindre une photo ou un document"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Paperclip size={24} color="#0066CC" />
      </TouchableOpacity>

      {showAttachmentOptions && (
        <View style={[styles.attachmentOptions, { bottom: attachmentBottomOffset }]}>
          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={() => { setShowAttachmentOptions(false); handleChooseImage(); }}
            accessibilityRole="button"
            accessibilityLabel="Joindre une photo"
          >
            <Camera size={24} color="#0066CC" />
            <Text style={styles.attachmentOptionText}>Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.attachmentOption}
            onPress={() => { setShowAttachmentOptions(false); handleChooseDocument(); }}
            accessibilityRole="button"
            accessibilityLabel="Joindre un document"
          >
            <FileText size={24} color="#0066CC" />
            <Text style={styles.attachmentOptionText}>Document</Text>
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Votre message..."
        placeholderTextColor="#94a3b8"
        value={text}
        onChangeText={setText}
        onFocus={() => setShowAttachmentOptions(false)}
        multiline
        // UX saisie
        autoCorrect
        autoCapitalize="sentences"
        keyboardAppearance={Platform.OS === 'ios' ? 'light' : undefined}
        selectionColor="#0066CC"
        returnKeyType="send"
        blurOnSubmit={false}
        maxLength={8000}
        // Web: Entrée = envoyer, Shift/Ctrl/Cmd+Entrée = nouvelle ligne
        onKeyPress={(e) => {
          const key = (e as any)?.nativeEvent?.key;
          const isWeb = Platform.OS === 'web';
          const hasModifier = (e as any)?.shiftKey || (e as any)?.ctrlKey || (e as any)?.metaKey;
          if (isWeb && key === 'Enter' && !hasModifier) {
            e.preventDefault?.();
            internalHandleSend();
          }
        }}
      />

      <TouchableOpacity
        style={[styles.sendButton, (!text?.trim() || sending) && styles.sendButtonDisabled]}
        onPress={internalHandleSend}
        disabled={!text?.trim() || sending}
        accessibilityRole="button"
        accessibilityLabel="Envoyer le message"
        accessibilityState={{ disabled: !text?.trim() || sending }}
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
    zIndex: 1000,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' },
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
    textAlignVertical: 'top',
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
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 8px rgba(0, 102, 204, 0.2)' },
    }),
  },
  sendButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
});

export default ChatInput;
