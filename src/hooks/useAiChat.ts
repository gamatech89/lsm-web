import { useState, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api';
import i18n from 'i18next';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  timestamp: Date;
  isLoading?: boolean;
}

interface AiChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
}

export function useAiChat() {
  const [state, setState] = useState<AiChatState>({
    messages: [],
    isLoading: false,
    error: null,
    conversationId: null,
  });

  const messageIdCounter = useRef(0);
  const messagesRef = useRef<Message[]>([]);

  // Keep messagesRef in sync with state (for use in callback)
  messagesRef.current = state.messages;

  const generateId = () => {
    messageIdCounter.current += 1;
    return `msg-${Date.now()}-${messageIdCounter.current}`;
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    // Build history from existing messages (excluding loading messages)
    const history = messagesRef.current
      .filter(m => !m.isLoading)
      .map(m => ({
        role: m.role,
        content: m.content,
      }));

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, loadingMessage],
      isLoading: true,
      error: null,
    }));

    try {
      // Get current language from i18n
      const currentLanguage = i18n.language?.split('-')[0] || 'en';
      
      const response = await apiClient.post('/ai/chat', {
        message: content.trim(),
        conversation_id: state.conversationId,
        history: history,
        language: currentLanguage, // Send language preference to backend
      });

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response.data.data.response,
        toolsUsed: response.data.data.tools_used,
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: prev.messages.slice(0, -1).concat(assistantMessage),
        isLoading: false,
        conversationId: response.data.data.conversation_id,
      }));
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Failed to send message. Please try again.';
      
      setState(prev => ({
        ...prev,
        messages: prev.messages.slice(0, -1), // Remove loading message
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [state.conversationId]);

  const clearMessages = useCallback(() => {
    setState({
      messages: [],
      isLoading: false,
      error: null,
      conversationId: null,
    });
  }, []);

  const dismissError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    conversationId: state.conversationId,
    sendMessage,
    clearMessages,
    dismissError,
  };
}
