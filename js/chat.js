/**
 * NexChat — Chat Manager
 * Handles conversation threads, message rendering, streaming, and title generation.
 */

import NvidiaAPI from "./api.js";
import StorageManager from "./storage.js";
import UI from "./ui.js";

const ChatManager = {
  currentChatId: null,
  isStreaming: false,
  _abortController: null,
  _settings: null,

  init(settings) {
    this._settings = settings;
  },

  updateSettings(settings) {
    this._settings = settings;
  },

  // ─── Create / Load ─────────────────────────────────────────────────────

  newChat() {
    const chat = StorageManager.createNewChat(this._settings.model);
    StorageManager.saveChat(chat);
    this.currentChatId = chat.id;
    StorageManager.setActiveChat(chat.id);
    UI.showEmptyState();
    this._renderSidebar();
    this._highlightActiveChat();
    this._updateChatHeader("New Chat");
    this._updateModelBadge(chat.model);
    return chat;
  },

  loadChat(chatId) {
    const chat = StorageManager.getChatById(chatId);
    if (!chat) return;
    this.currentChatId = chatId;
    StorageManager.setActiveChat(chatId);
    this._renderMessages(chat.messages);
    this._highlightActiveChat();
    this._updateChatHeader(chat.title);
    this._updateModelBadge(chat.model);

    // Scroll to bottom after render
    requestAnimationFrame(() => {
      const feed = document.getElementById("chat-feed");
      UI.scrollToBottom(feed, false);
    });
  },

  // ─── Send Message ──────────────────────────────────────────────────────

  async sendMessage(content) {
    content = content.trim();
    if (!content || this.isStreaming) return;

    if (!this._settings.apiKey || !this._settings.apiKey.startsWith("nvapi-")) {
      UI.toastError("Please set a valid NVIDIA API key in Settings (⚙).");
      UI.openSettings();
      return;
    }

    // Create chat if none active
    if (!this.currentChatId) this.newChat();
    const chat = StorageManager.getChatById(this.currentChatId);
    if (!chat) return;

    UI.hideEmptyState();

    // Build messages array.
    // NOTE: Some NVIDIA models (e.g. google/gemma-7b) don't support the
    // 'system' role and return 400. We merge the system prompt into the
    // first user message as a universal workaround for those models.
    const SYSTEM_ROLE_MODELS = [
      'meta/llama-3.1-8b-instruct',
      'meta/llama-3.1-70b-instruct',
      'mistralai/mistral-7b-instruct-v0.3',
    ];
    const supportsSystemRole = SYSTEM_ROLE_MODELS.some(m => chat.model === m);
    const systemPromptText = this._settings.systemPrompt;

    // Push user message into chat history
    const userMsg = { role: 'user', content };
    chat.messages.push(userMsg);
    chat.updatedAt = Date.now();

    // All prior messages (exclude the one we just pushed)
    const priorMessages = chat.messages.slice(0, -1);

    let apiMessages;
    if (supportsSystemRole) {
      apiMessages = [
        { role: 'system', content: systemPromptText },
        ...priorMessages.map(m => ({ role: m.role, content: m.content })),
        userMsg,
      ];
    } else {
      // Merge system prompt into content of very first user message
      const isFirstMessage = priorMessages.filter(m => m.role === 'user').length === 0;
      if (isFirstMessage) {
        apiMessages = [
          { role: 'user', content: `[System: ${systemPromptText}]\n\n${content}` },
        ];
      } else {
        apiMessages = [
          ...priorMessages.map(m => ({ role: m.role, content: m.content })),
          userMsg,
        ];
      }
    }

    // Render user message bubble
    this._appendMessage(userMsg);

    // Show typing indicator
    UI.showTypingIndicator();

    // Disable input while streaming
    this.isStreaming = true;
    this._setInputState(false);

    // Prepare AI message element (rendered during onToken)
    let aiContent = '';
    const aiMsgEl = this._createAiMessageEl();
    const bubbleTextEl = aiMsgEl.querySelector('.msg__text');
    const feed = document.getElementById('chat-feed');
    UI.scrollToBottom(feed);

    // Stream response
    let firstToken = true;
    await NvidiaAPI.streamChat({
      apiKey: this._settings.apiKey,
      model: chat.model,
      messages: apiMessages,
      temperature: this._settings.temperature,
      topP: this._settings.topP,
      maxTokens: this._settings.maxTokens,

      onToken: (token) => {
        if (firstToken) {
          UI.removeTypingIndicator();
          feed.appendChild(aiMsgEl);
          firstToken = false;
        }
        aiContent += token;
        bubbleTextEl.innerHTML = UI.renderMarkdown(aiContent);
        if (UI.isNearBottom(feed)) UI.scrollToBottom(feed, false);
      },

      onDone: () => {
        if (firstToken) {
          UI.removeTypingIndicator();
          if (aiContent) feed.appendChild(aiMsgEl);
        }

        const aiMsg = { role: 'assistant', content: aiContent };
        chat.messages.push(aiMsg);

        // Add copy button to finished AI message
        this._addMessageActions(aiMsgEl, aiContent);

        // Auto-generate title from first exchange
        if (chat.messages.filter(m => m.role === 'user').length === 1) {
          const title = this._generateTitle(content);
          chat.title = title;
          StorageManager.updateChatTitle(chat.id, title);
          this._updateChatHeader(title);
          this._renderSidebar();
        }

        chat.updatedAt = Date.now();
        StorageManager.saveChat(chat);

        this.isStreaming = false;
        this._setInputState(true);
        UI.scrollToBottom(feed);
      },

      onError: (err) => {
        UI.removeTypingIndicator();
        this.isStreaming = false;
        this._setInputState(true);
        UI.toastError(err.message || 'Something went wrong. Please try again.');

        const errEl = document.createElement('div');
        errEl.className = 'msg msg--error';
        errEl.innerHTML = `<div class="msg__bubble msg__bubble--error">⚠ ${err.message}</div>`;
        feed.appendChild(errEl);
        UI.scrollToBottom(feed);
      },
    });
  },

  // ─── Sidebar ───────────────────────────────────────────────────────────

  _renderSidebar() {
    const list = document.getElementById("chat-list");
    if (!list) return;

    const chats = StorageManager.getChats();
    if (chats.length === 0) {
      list.innerHTML = `<div class="chat-list-empty">No chats yet. Start a conversation!</div>`;
      return;
    }

    list.innerHTML = chats
      .map(
        (chat) => `
      <div class="chat-item ${chat.id === this.currentChatId ? "chat-item--active" : ""}" 
           data-chat-id="${chat.id}" 
           role="button" 
           tabindex="0"
           title="${this._escHtml(chat.title)}">
        <div class="chat-item__icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <span class="chat-item__title">${this._escHtml(chat.title)}</span>
        <button class="chat-item__delete" data-chat-id="${chat.id}" title="Delete chat" aria-label="Delete chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>`,
      )
      .join("");

    // Event delegation for chat list
    list.querySelectorAll(".chat-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".chat-item__delete")) return;
        const id = item.dataset.chatId;
        if (id !== this.currentChatId) this.loadChat(id);
        if (window.innerWidth < 768) UI.closeSidebar();
      });
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter") item.click();
      });
    });

    list.querySelectorAll(".chat-item__delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteChat(btn.dataset.chatId);
      });
    });
  },

  deleteChat(chatId) {
    StorageManager.deleteChat(chatId);
    if (this.currentChatId === chatId) {
      this.currentChatId = null;
      StorageManager.setActiveChat(null);
      UI.showEmptyState();
      this._updateChatHeader("NexChat");
    }
    this._renderSidebar();
    UI.toastSuccess("Chat deleted.");
  },

  _highlightActiveChat() {
    document.querySelectorAll(".chat-item").forEach((el) => {
      el.classList.toggle(
        "chat-item--active",
        el.dataset.chatId === this.currentChatId,
      );
    });
  },

  // ─── Message Rendering ─────────────────────────────────────────────────

  _renderMessages(messages) {
    const feed = document.getElementById("chat-feed");
    if (!feed) return;
    feed.innerHTML = "";

    if (messages.length === 0) {
      UI.showEmptyState();
      return;
    }

    messages.forEach((msg) => {
      if (msg.role === "system") return;
      const el = this._buildMessageEl(msg);
      feed.appendChild(el);
    });
  },

  _appendMessage(msg) {
    const feed = document.getElementById("chat-feed");
    if (!feed) return;
    const el = this._buildMessageEl(msg);
    feed.appendChild(el);
    UI.scrollToBottom(feed);
  },

  _buildMessageEl(msg) {
    const el = document.createElement("div");
    el.className = `msg ${msg.role === "user" ? "msg--user" : "msg--ai"}`;

    if (msg.role === "user") {
      el.innerHTML = `
        <div class="msg__bubble msg__bubble--user">
          <div class="msg__text">${this._escHtml(msg.content).replace(/\n/g, "<br>")}</div>
        </div>
        <div class="msg__avatar msg__avatar--user">You</div>`;
    } else {
      el.innerHTML = `
        <div class="msg__avatar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" fill="none">
            <defs><linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#7c3aed"/><stop offset="100%" style="stop-color:#06b6d4"/></linearGradient></defs>
            <circle cx="24" cy="24" r="20" fill="url(#mg)" opacity="0.2"/>
            <circle cx="15" cy="24" r="3" fill="url(#mg)"/>
            <circle cx="24" cy="24" r="3" fill="url(#mg)"/>
            <circle cx="33" cy="24" r="3" fill="url(#mg)"/>
          </svg>
        </div>
        <div class="msg__bubble msg__bubble--ai">
          <div class="msg__text">${UI.renderMarkdown(msg.content)}</div>
        </div>`;
      this._addMessageActions(el, msg.content);
    }
    return el;
  },

  _createAiMessageEl() {
    const el = document.createElement("div");
    el.className = "msg msg--ai";
    el.innerHTML = `
      <div class="msg__avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" fill="none">
          <defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#7c3aed"/><stop offset="100%" style="stop-color:#06b6d4"/></linearGradient></defs>
          <circle cx="24" cy="24" r="20" fill="url(#sg)" opacity="0.2"/>
          <circle cx="15" cy="24" r="3" fill="url(#sg)"/>
          <circle cx="24" cy="24" r="3" fill="url(#sg)"/>
          <circle cx="33" cy="24" r="3" fill="url(#sg)"/>
        </svg>
      </div>
      <div class="msg__bubble msg__bubble--ai">
        <div class="msg__text"></div>
      </div>`;
    return el;
  },

  _addMessageActions(el, content) {
    const bubble = el.querySelector(".msg__bubble--ai");
    if (!bubble || bubble.querySelector(".msg__actions")) return;
    const actions = document.createElement("div");
    actions.className = "msg__actions";
    actions.innerHTML = `
      <button class="btn-copy msg__copy-btn" title="Copy message">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>`;
    actions.querySelector(".msg__copy-btn").addEventListener("click", (e) => {
      UI.copyText(content, e.currentTarget);
    });
    bubble.appendChild(actions);
  },

  // ─── Helpers ───────────────────────────────────────────────────────────

  _generateTitle(firstMessage) {
    const clean = firstMessage.replace(/[^\w\s]/g, "").trim();
    const words = clean.split(/\s+/).slice(0, 6);
    return words.join(" ") || "New Chat";
  },

  _updateChatHeader(title) {
    const el = document.getElementById("chat-title");
    if (el) el.textContent = title;
  },

  _updateModelBadge(model) {
    const el = document.getElementById("model-badge");
    if (el) el.textContent = model;
  },

  _setInputState(enabled) {
    const input = document.getElementById("chat-input");
    const btn = document.getElementById("send-btn");
    if (input) input.disabled = !enabled;
    if (btn) {
      btn.disabled = !enabled;
      btn.classList.toggle("send-btn--loading", !enabled);
      btn.innerHTML = enabled
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
        : `<div class="spinner"></div>`;
    }
    if (enabled) input?.focus();
  },

  _escHtml(str = "") {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },
};

export default ChatManager;
