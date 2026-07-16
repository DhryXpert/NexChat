import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useChats } from './hooks/useChats';
import { useStream } from './hooks/useStream';

import AuthOverlay from './components/Auth/AuthOverlay';
import Sidebar from './components/Sidebar/Sidebar';
import ChatView from './components/Chat/ChatView';
import SettingsModal from './components/Settings/SettingsModal';

const DEFAULT_SETTINGS = {
  model: 'google/gemma-2-2b-it',
  temperature: 0.2,
  topP: 0.7,
  maxTokens: 1024,
  systemPrompt: 'You are NexChat, a helpful, knowledgeable, and friendly AI assistant. Give clear, concise, and accurate answers.',
};

const SYSTEM_ROLE_MODELS = [
  'meta/llama-3.1-8b-instruct',
  'meta/llama-3.1-70b-instruct',
  'mistralai/mistral-7b-instruct-v0.3',
];

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const { chats, loading: chatsLoading, createChat, updateChat, deleteChat, clearAllChats } = useChats(user?.uid);
  const { streamMessage, isStreaming } = useStream();

  const [activeChatId, setActiveChatId] = useState(null);
  const [localMessages, setLocalMessages] = useState([]);
  const [streamingContent, setStreamingContent] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('nexchat_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  });

  // Track the active chat ref for callbacks
  const activeChatRef = useRef(null);

  // Sync active chat data from Firestore chats list
  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // When active chat changes in Firestore, sync local messages
  useEffect(() => {
    if (activeChat) {
      activeChatRef.current = activeChat;
      // Only sync from Firestore if we're not currently streaming
      if (!isStreaming) {
        setLocalMessages(activeChat.messages || []);
      }
    }
  }, [activeChat, isStreaming]);

  // Auto-select first chat if none active
  useEffect(() => {
    if (!activeChatId && chats.length > 0 && !chatsLoading) {
      setActiveChatId(chats[0].id);
    }
  }, [chats, activeChatId, chatsLoading]);

  // ── Save settings to localStorage ──
  const handleSaveSettings = useCallback((newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('nexchat_settings', JSON.stringify(newSettings));
  }, []);

  // ── Chat Management ──
  const handleNewChat = useCallback(async () => {
    const chat = await createChat(settings.model);
    if (chat) {
      setActiveChatId(chat.id);
      setLocalMessages([]);
      setStreamingContent(null);
      setChatError(null);
    }
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [createChat, settings.model]);

  const handleSelectChat = useCallback((chatId) => {
    setActiveChatId(chatId);
    setStreamingContent(null);
    setChatError(null);
    const chat = chats.find((c) => c.id === chatId);
    if (chat) setLocalMessages(chat.messages || []);
  }, [chats]);

  const handleDeleteChat = useCallback(async (chatId) => {
    await deleteChat(chatId);
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setLocalMessages([]);
    }
  }, [deleteChat, activeChatId]);

  const handleChangeModel = useCallback(async (newModel) => {
    const newSettings = { ...settings, model: newModel };
    setSettings(newSettings);
    localStorage.setItem('nexchat_settings', JSON.stringify(newSettings));

    if (activeChatId) {
      await updateChat(activeChatId, { model: newModel });
    }
  }, [settings, activeChatId, updateChat]);

  // ── Generate title from first message ──
  const generateTitle = (content) => {
    const clean = content.replace(/[^\w\s]/g, '').trim();
    const words = clean.split(/\s+/).slice(0, 6);
    return words.join(' ') || 'New Chat';
  };

  // ── Send Message ──
  const handleSend = useCallback(async (content) => {
    content = content.trim();
    if (!content || isStreaming) return;

    // Create chat if none active
    let chatId = activeChatId;
    if (!chatId) {
      const newChat = await createChat(settings.model);
      if (!newChat) return;
      chatId = newChat.id;
      setActiveChatId(chatId);
    }

    const currentChat = chats.find((c) => c.id === chatId);
    const currentMessages = currentChat?.messages || localMessages;

    // Add user message locally
    const userMsg = { role: 'user', content };
    const updatedMessages = [...currentMessages, userMsg];
    setLocalMessages(updatedMessages);
    setChatError(null);

    // Build API messages
    const supportsSystemRole = SYSTEM_ROLE_MODELS.some((m) => settings.model === m);
    const priorMessages = currentMessages;
    let apiMessages;

    if (supportsSystemRole) {
      apiMessages = [
        { role: 'system', content: settings.systemPrompt },
        ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
        userMsg,
      ];
    } else {
      const isFirstMessage = priorMessages.filter((m) => m.role === 'user').length === 0;
      if (isFirstMessage) {
        apiMessages = [
          { role: 'user', content: `[System: ${settings.systemPrompt}]\n\n${content}` },
        ];
      } else {
        apiMessages = [
          ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
          userMsg,
        ];
      }
    }

    // Show typing, start streaming
    setIsTyping(true);
    setStreamingContent(null);

    let fullAiContent = '';

    await streamMessage({
      model: settings.model,
      messages: apiMessages,
      temperature: settings.temperature,
      topP: settings.topP,
      maxTokens: settings.maxTokens,

      onToken: (token) => {
        setIsTyping(false);
        fullAiContent += token;
        setStreamingContent(fullAiContent);
      },

      onDone: async () => {
        setIsTyping(false);
        setStreamingContent(null);

        const aiMsg = { role: 'assistant', content: fullAiContent };
        const finalMessages = [...updatedMessages, aiMsg];
        setLocalMessages(finalMessages);

        // Save to Firestore
        const updates = { messages: finalMessages, model: settings.model };

        // Auto-title from first user message
        const userMsgCount = finalMessages.filter((m) => m.role === 'user').length;
        if (userMsgCount === 1) {
          updates.title = generateTitle(content);
        }

        await updateChat(chatId, updates);
      },

      onError: (err) => {
        setIsTyping(false);
        setStreamingContent(null);
        setChatError(err.message || 'Something went wrong. Please try again.');
      },
    });
  }, [activeChatId, chats, localMessages, settings, isStreaming, createChat, updateChat, streamMessage]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isTyping = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);

      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isTyping) {
        e.preventDefault();
        handleNewChat();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSettingsOpen(false);
        setSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNewChat]);

  // ── Loading state ──
  if (authLoading) {
    return (
      <div className="app-loader">
        <img src="/logo.svg" alt="NexChat" width="48" height="48" className="app-loader__logo" />
        <div className="spinner" />
      </div>
    );
  }

  // ── Auth gate ──
  if (!user) {
    return <AuthOverlay />;
  }

  // ── Main app ──
  return (
    <div id="app" className={!sidebarOpen ? 'sidebar-closed' : ''}>
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={async (chatId, newTitle) => {
          await updateChat(chatId, { title: newTitle });
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
      />

      <ChatView
        chat={activeChat || { model: settings.model }}
        messages={localMessages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        isTyping={isTyping}
        error={chatError}
        onSend={handleSend}
        onOpenSidebar={() => setSidebarOpen(true)}
        onChangeModel={handleChangeModel}
      />

      <SettingsModal
        isOpen={settingsOpen}
        settings={settings}
        onSave={handleSaveSettings}
        onClose={() => setSettingsOpen(false)}
        onClearChats={clearAllChats}
      />

      {/* Toast Container */}
      <div id="toast-container" aria-live="polite" aria-label="Notifications" />
    </div>
  );
}
