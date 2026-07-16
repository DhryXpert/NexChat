import { useRef, useEffect, useState } from 'react';
import { ChevronDown, Menu } from 'lucide-react';
import MessageBubble, { TypingIndicator, ErrorMessage } from './MessageBubble';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';
import { useAuth } from '../../contexts/AuthContext';

const AVAILABLE_MODELS = [
  { id: 'google/gemma-2-2b-it', name: 'NVIDIA' },
];

export default function ChatView({
  chat,
  messages,
  streamingContent,
  isStreaming,
  isTyping,
  error,
  onSend,
  onOpenSidebar,
  onChangeModel,
}) {
  const feedRef = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { serverStatus } = useAuth();

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, streamingContent, isTyping]);

  const activeModelId = chat?.model || 'google/gemma-2-2b-it';
  const activeModelName = 'NVIDIA';

  return (
    <main id="main" role="main">
      {/* Chat Header */}
      <header id="chat-header">
        <button id="mobile-sidebar-btn" aria-label="Open sidebar" onClick={onOpenSidebar}>
          <Menu size={20} />
        </button>
        <span id="chat-title">{chat?.title || 'NexChat'}</span>

        {/* Model Selector Indicator & Server Status */}
        <div className="model-selector-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="model-selector-btn" style={{ cursor: 'default' }}>
            <span>{activeModelName}</span>
          </div>
          {serverStatus === 'waking' && (
            <span className="server-status-badge server-status-badge--waking" title="Server is waking up (Render free tier can take ~50s)...">
              waking
            </span>
          )}
          {serverStatus === 'error' && (
            <span className="server-status-badge server-status-badge--error" title="Server is offline or unreachable.">
              offline
            </span>
          )}
          {serverStatus === 'ready' && (
            <span className="server-status-badge server-status-badge--ready" title="Server is online.">
              online
            </span>
          )}
        </div>
      </header>

      {/* Message Feed */}
      <div id="chat-feed" ref={feedRef} role="log" aria-live="polite" aria-label="Chat messages">
        {(!messages || messages.length === 0) && !isStreaming ? (
          <EmptyState onSendPrompt={onSend} />
        ) : (
          <>
            {messages.map((msg, i) => {
              if (msg.role === 'system') return null;
              return <MessageBubble key={i} role={msg.role} content={msg.content} />;
            })}

            {/* Streaming AI response */}
            {streamingContent !== null && (
              <MessageBubble role="assistant" content={streamingContent} isStreaming />
            )}

            {/* Typing indicator (before first token) */}
            {isTyping && <TypingIndicator />}

            {/* Error */}
            {error && <ErrorMessage message={error} />}
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} disabled={isStreaming} />
    </main>
  );
}
