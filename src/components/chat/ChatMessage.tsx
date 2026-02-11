import { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  isLoading?: boolean;
  isDark?: boolean;
}

export function ChatMessage({ role, content, isLoading, isDark = true }: ChatMessageProps) {
  const isUser = role === 'user';

  // Theme-aware colors
  const colors = isDark ? {
    userBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    userShadow: 'shadow-lg shadow-violet-500/20',
    aiBg: 'bg-white/10',
    aiBorder: 'border border-white/10',
    text: 'text-white/90',
    textStrong: 'text-white',
    textMuted: 'text-white/60',
    textCode: 'text-violet-300',
    codeBg: 'bg-white/10',
    link: 'text-violet-400 hover:text-violet-300',
    tableBg: 'bg-white/5',
    tableBorder: 'border-white/10',
  } : {
    userBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
    userShadow: 'shadow-lg shadow-violet-500/20',
    aiBg: 'bg-white',
    aiBorder: 'border border-violet-100',
    text: 'text-gray-700',
    textStrong: 'text-gray-900',
    textMuted: 'text-gray-500',
    textCode: 'text-violet-600',
    codeBg: 'bg-violet-50',
    link: 'text-violet-600 hover:text-violet-700',
    tableBg: 'bg-violet-50/50',
    tableBorder: 'border-violet-100',
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser 
            ? `${colors.userBg} text-white ${colors.userShadow}` 
            : `${colors.aiBg} ${colors.text} ${colors.aiBorder}`
        }`}
        style={{
          borderBottomRightRadius: isUser ? '6px' : undefined,
          borderBottomLeftRadius: !isUser ? '6px' : undefined,
          boxShadow: !isUser && !isDark ? '0 2px 8px rgba(124, 58, 237, 0.08)' : undefined,
        }}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span 
                className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" 
                style={{ animationDelay: '0ms' }} 
              />
              <span 
                className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" 
                style={{ animationDelay: '150ms' }} 
              />
              <span 
                className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" 
                style={{ animationDelay: '300ms' }} 
              />
            </div>
            <span className={`text-sm ${colors.textMuted}`}>Thinking...</span>
          </div>
        ) : (
          <>
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
            ) : (
              <div className={`prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''}`}>
                <ReactMarkdown
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    p: ({ children }: { children?: ReactNode }) => (
                      <p className={`mb-2 last:mb-0 leading-relaxed ${colors.text}`}>{children}</p>
                    ),
                    ul: ({ children }: { children?: ReactNode }) => (
                      <ul className={`list-disc pl-4 mb-2 space-y-1 ${colors.text}`}>{children}</ul>
                    ),
                    ol: ({ children }: { children?: ReactNode }) => (
                      <ol className={`list-decimal pl-4 mb-2 space-y-1 ${colors.text}`}>{children}</ol>
                    ),
                    li: ({ children }: { children?: ReactNode }) => (
                      <li className="leading-relaxed">{children}</li>
                    ),
                    strong: ({ children }: { children?: ReactNode }) => (
                      <strong className={`font-semibold ${colors.textStrong}`}>{children}</strong>
                    ),
                    code: ({ children }: { children?: ReactNode }) => (
                      <code className={`px-1.5 py-0.5 rounded text-sm font-mono ${colors.codeBg} ${colors.textCode}`}>
                        {children}
                      </code>
                    ),
                    h1: ({ children }: { children?: ReactNode }) => (
                      <h1 className={`text-base font-semibold mb-2 mt-3 first:mt-0 ${colors.textStrong}`}>{children}</h1>
                    ),
                    h2: ({ children }: { children?: ReactNode }) => (
                      <h2 className={`text-sm font-semibold mb-2 mt-3 first:mt-0 ${colors.textStrong}`}>{children}</h2>
                    ),
                    h3: ({ children }: { children?: ReactNode }) => (
                      <h3 className={`text-sm font-medium mb-1 mt-2 first:mt-0 ${colors.text}`}>{children}</h3>
                    ),
                    a: ({ children, href }: { children?: ReactNode; href?: string }) => (
                      <a 
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`underline ${colors.link}`}
                        style={{ 
                          wordBreak: 'break-all', 
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {children}
                      </a>
                    ),
                    table: ({ children }: { children?: ReactNode }) => (
                      <div className="overflow-x-auto my-2">
                        <table className="min-w-full text-sm border-collapse">{children}</table>
                      </div>
                    ),
                    thead: ({ children }: { children?: ReactNode }) => (
                      <thead className={colors.tableBg}>{children}</thead>
                    ),
                    th: ({ children }: { children?: ReactNode }) => (
                      <th className={`px-2 py-1 text-left ${colors.text} border-b ${colors.tableBorder} font-medium`}>{children}</th>
                    ),
                    td: ({ children }: { children?: ReactNode }) => (
                      <td className={`px-2 py-1 ${colors.text} border-b ${colors.tableBorder}`}>{children}</td>
                    ),
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
