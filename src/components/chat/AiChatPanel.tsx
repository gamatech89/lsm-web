import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { X, Send, Trash2, Bot } from 'lucide-react';
import { useAiChat } from '@/hooks/useAiChat';
import { ChatMessage } from './ChatMessage';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';

export function AiChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const user = useAuthStore((state) => state.user);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  
  const isDark = resolvedTheme === 'dark';

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    dismissError,
  } = useAiChat();

  // Only show for admins
  if (user?.role !== 'admin') {
    return null;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcut: Cmd+K to toggle
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Theme-aware colors
  const colors = isDark ? {
    panelBg: 'linear-gradient(180deg, rgba(30, 20, 50, 0.98) 0%, rgba(20, 15, 35, 0.99) 100%)',
    headerBg: 'linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(168, 85, 247, 0.2) 100%)',
    messagesBg: 'rgba(15, 10, 30, 0.5)',
    inputBg: 'rgba(30, 20, 50, 0.8)',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.6)',
    textFaint: 'rgba(255, 255, 255, 0.3)',
    inputBgInner: 'rgba(255, 255, 255, 0.05)',
    inputBorder: 'rgba(255, 255, 255, 0.1)',
  } : {
    panelBg: 'linear-gradient(180deg, #ffffff 0%, #f8f5ff 100%)',
    headerBg: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
    messagesBg: '#f3f0f9',
    inputBg: '#ffffff',
    border: 'rgba(124, 58, 237, 0.15)',
    text: '#1f2937',
    textMuted: '#6b7280',
    textFaint: '#9ca3af',
    inputBgInner: '#ffffff',
    inputBorder: 'rgba(124, 58, 237, 0.2)',
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-xl hover:shadow-violet-500/30 transition-all duration-300 hover:scale-105 ${isOpen ? 'hidden' : 'flex'} items-center gap-2`}
        title="LSM AI Assistant (⌘K)"
      >
        <Bot className="w-6 h-6" />
        <span className="sr-only">Open AI Chat</span>
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div 
          className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{
            background: colors.panelBg,
            border: `1px solid ${colors.border}`,
            boxShadow: isDark 
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
              : '0 25px 50px -12px rgba(124, 58, 237, 0.25)',
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: colors.headerBg,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-semibold text-sm text-white">LSM AI Assistant</span>
                <p className="text-xs text-white/60">Powered by Claude</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearMessages}
                className="p-2 rounded-xl transition-all duration-200"
                style={{ 
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  border: 'none',
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                }}
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl transition-all duration-200"
                style={{ 
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  border: 'none',
                  boxShadow: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
                }}
                title="Close (⌘K)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div 
            className="flex-1 overflow-y-auto p-4"
            style={{ backgroundColor: colors.messagesBg }}
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30"
                  style={{ 
                    background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
                  }}
                >
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 
                  className="text-lg font-semibold mb-2"
                  style={{ color: colors.text }}
                >
                  How can I help you today?
                </h3>
                <p 
                  className="text-sm leading-relaxed"
                  style={{ color: colors.textMuted }}
                >
                  Ask me about your WordPress projects, todos, time tracking, site health, or perform actions like clearing caches.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    toolsUsed={message.toolsUsed}
                    isLoading={message.isLoading}
                    isDark={isDark}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div 
              className="px-4 py-2"
              style={{ 
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                borderTop: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`,
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-red-500">{error}</p>
                <button
                  onClick={dismissError}
                  className="text-red-500 hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <form 
            onSubmit={handleSubmit} 
            className="p-4"
            style={{ 
              background: colors.inputBg,
              borderTop: `1px solid ${colors.border}`,
            }}
          >
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your sites..."
                rows={1}
                className="flex-1 resize-none rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{ 
                  maxHeight: '120px',
                  backgroundColor: colors.inputBgInner,
                  border: `1px solid ${colors.inputBorder}`,
                  color: colors.text,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#7C3AED';
                  e.target.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = colors.inputBorder;
                  e.target.style.boxShadow = 'none';
                }}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-xl transition-all disabled:opacity-30 bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25 disabled:shadow-none"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p 
              className="text-xs mt-2 text-center"
              style={{ color: colors.textFaint }}
            >
              ⌘K to toggle • Shift+Enter for new line
            </p>
          </form>
        </div>
      )}
    </>
  );
}
