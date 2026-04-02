/**
 * NexChat — StorageManager
 * LocalStorage-based persistence. Netlify-compatible (static, no server).
 * All keys prefixed with "nexchat_" to avoid collisions.
 */

const STORAGE_KEYS = {
  CHATS: "nexchat_chats",
  SETTINGS: "nexchat_settings",
  ACTIVE_CHAT: "nexchat_active_chat",
};

const DEFAULT_SETTINGS = {
  apiKey: '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',
  model: 'google/gemma-2-2b-it',
  temperature: 0.2,
  topP: 0.7,
  maxTokens: 1024,
  systemPrompt:
    "You are NexChat, a helpful, knowledgeable, and friendly AI assistant. Give clear, concise, and accurate answers.",
};

const StorageManager = {
  // ─── Chats ─────────────────────────────────────────────────────────────────

  getChats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CHATS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveChat(chat) {
    try {
      const chats = this.getChats();
      const idx = chats.findIndex((c) => c.id === chat.id);
      if (idx !== -1) {
        chats[idx] = chat;
      } else {
        chats.unshift(chat); // newest first
      }
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
      this._checkQuota();
      return true;
    } catch (e) {
      console.error("StorageManager.saveChat failed:", e);
      return false;
    }
  },

  getChatById(id) {
    return this.getChats().find((c) => c.id === id) || null;
  },

  deleteChat(id) {
    try {
      const chats = this.getChats().filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
      return true;
    } catch {
      return false;
    }
  },

  updateChatTitle(id, title) {
    const chats = this.getChats();
    const chat = chats.find((c) => c.id === id);
    if (chat) {
      chat.title = title;
      localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
    }
  },

  clearAllChats() {
    localStorage.removeItem(STORAGE_KEYS.CHATS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT);
  },

  // ─── Settings ──────────────────────────────────────────────────────────────

  getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return raw
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
        : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  },

  // ─── Active Chat ───────────────────────────────────────────────────────────

  getActiveChat() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT);
  },

  setActiveChat(id) {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT);
    }
  },

  // ─── Helpers ───────────────────────────────────────────────────────────────

  createNewChat(model) {
    return {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: "New Chat",
      model: model || DEFAULT_SETTINGS.model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
  },

  _checkQuota() {
    try {
      let total = 0;
      for (const key in localStorage) {
        if (key.startsWith("nexchat_")) {
          total += localStorage.getItem(key).length * 2; // UTF-16 bytes
        }
      }
      const MB = total / (1024 * 1024);
      if (MB > 4) {
        console.warn(
          `NexChat storage usage: ${MB.toFixed(2)}MB — approaching 5MB limit`,
        );
        return true; // over threshold
      }
    } catch {}
    return false;
  },

  getStorageInfo() {
    let total = 0;
    for (const key in localStorage) {
      if (key.startsWith("nexchat_")) {
        total += (localStorage.getItem(key) || "").length * 2;
      }
    }
    const chats = this.getChats();
    return {
      chatCount: chats.length,
      messageCount: chats.reduce((s, c) => s + c.messages.length, 0),
      usageMB: (total / (1024 * 1024)).toFixed(2),
    };
  },
};

export default StorageManager;
