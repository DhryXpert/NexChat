/**
 * NexChat — App Controller
 * Main orchestrator: initializes all modules, wires events, manages app state.
 */

import ChatManager from "./chat.js";
import StorageManager from "./storage.js";
import UI from "./ui.js";

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const settings = StorageManager.getSettings();
  ChatManager.init(settings);
  _populateSettings(settings);
  _wireEvents();

  // Restore last active chat or show empty state
  const lastChatId = StorageManager.getActiveChat();
  const chats = StorageManager.getChats();

  ChatManager._renderSidebar();

  if (lastChatId && StorageManager.getChatById(lastChatId)) {
    ChatManager.loadChat(lastChatId);
  } else if (chats.length > 0) {
    ChatManager.loadChat(chats[0].id);
  } else {
    UI.showEmptyState();
    // First launch — open settings if no API key saved
    if (!settings.apiKey || settings.apiKey === "YOUR_NVIDIA_API_KEY") {
      setTimeout(() => UI.openSettings(), 400);
    }
  }

  // Focus input
  document.getElementById("chat-input")?.focus();
});

// ─── Event Wiring ─────────────────────────────────────────────────────────────

function _wireEvents() {
  // ── Send message ──
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("send-btn");

  sendBtn?.addEventListener("click", _handleSend);

  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      _handleSend();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      _handleSend();
    }
  });

  input?.addEventListener("input", () => UI.autoResizeTextarea(input));

  // ── New Chat ──
  document.getElementById("new-chat-btn")?.addEventListener("click", () => {
    ChatManager.newChat();
    input?.focus();
    if (window.innerWidth < 768) UI.closeSidebar();
  });

  // ── Sidebar toggle ──
  document
    .getElementById("sidebar-toggle")
    ?.addEventListener("click", UI.toggleSidebar.bind(UI));
  document
    .getElementById("sidebar-overlay")
    ?.addEventListener("click", UI.closeSidebar.bind(UI));
  document
    .getElementById("mobile-sidebar-btn")
    ?.addEventListener("click", UI.toggleSidebar.bind(UI));

  // ── Settings ──
  document
    .getElementById("settings-btn")
    ?.addEventListener("click", UI.openSettings);
  document
    .getElementById("settings-close")
    ?.addEventListener("click", UI.closeSettings);
  document.getElementById("settings-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "settings-modal") UI.closeSettings();
  });
  document
    .getElementById("toggle-api-key")
    ?.addEventListener("click", UI.toggleApiKeyVisibility);
  document
    .getElementById("settings-save")
    ?.addEventListener("click", _saveSettings);
  document
    .getElementById("settings-cancel")
    ?.addEventListener("click", UI.closeSettings);

  // ── Settings sliders live update ──
  const tempSlider = document.getElementById("settings-temperature");
  const tempVal = document.getElementById("temperature-value");
  tempSlider?.addEventListener("input", () => {
    if (tempVal) tempVal.textContent = Number(tempSlider.value).toFixed(1);
  });

  const topPSlider = document.getElementById("settings-topp");
  const topPVal = document.getElementById("topp-value");
  topPSlider?.addEventListener("input", () => {
    if (topPVal) topPVal.textContent = Number(topPSlider.value).toFixed(1);
  });

  // ── Settings — clear all chats ──
  document.getElementById("clear-chats-btn")?.addEventListener("click", () => {
    if (confirm("Delete ALL conversations? This cannot be undone.")) {
      StorageManager.clearAllChats();
      ChatManager.currentChatId = null;
      ChatManager._renderSidebar();
      UI.showEmptyState();
      ChatManager._updateChatHeader("NexChat");
      UI.toastSuccess("All chats cleared.");
      UI.closeSettings();
    }
  });

  // ── Keyboard shortcuts ──
  document.addEventListener("keydown", (e) => {
    const isTyping = ["INPUT", "TEXTAREA"].includes(e.target.tagName);

    if ((e.ctrlKey || e.metaKey) && e.key === "n" && !isTyping) {
      e.preventDefault();
      ChatManager.newChat();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      UI.toggleSidebar();
    }
    if (e.key === "Escape") {
      UI.closeSettings();
      UI.closeSidebar();
    }
  });
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

function _handleSend() {
  const input = document.getElementById("chat-input");
  const content = input?.value?.trim();
  if (!content) return;
  ChatManager.sendMessage(content);
  if (input) {
    input.value = "";
    UI.autoResizeTextarea(input);
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function _populateSettings(settings) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set("settings-api-key", settings.apiKey || "");
  set("settings-model", settings.model);
  set("settings-temperature", settings.temperature);
  set("settings-topp", settings.topP);
  set("settings-max-tokens", settings.maxTokens);
  set("settings-system-prompt", settings.systemPrompt);

  setText("temperature-value", Number(settings.temperature).toFixed(1));
  setText("topp-value", Number(settings.topP).toFixed(1));

  _updateStorageInfo();
}

function _saveSettings() {
  const get = (id) => document.getElementById(id)?.value;

  const apiKey = get("settings-api-key")?.trim();
  if (!apiKey) {
    UI.toastError("API key cannot be empty.");
    return;
  }

  const settings = {
    apiKey,
    model: get("settings-model") || "google/gemma-7b",
    temperature: parseFloat(get("settings-temperature")) || 0.2,
    topP: parseFloat(get("settings-topp")) || 0.7,
    maxTokens: parseInt(get("settings-max-tokens")) || 1024,
    systemPrompt:
      get("settings-system-prompt") ||
      "You are NexChat, a helpful AI assistant.",
  };

  StorageManager.saveSettings(settings);
  ChatManager.updateSettings(settings);

  // Update model badge on active chat if model changed
  if (ChatManager.currentChatId) {
    const chat = StorageManager.getChatById(ChatManager.currentChatId);
    if (chat) {
      chat.model = settings.model;
      StorageManager.saveChat(chat);
      ChatManager._updateModelBadge(settings.model);
    }
  }

  UI.closeSettings();
  UI.toastSuccess("Settings saved!");
}

function _updateStorageInfo() {
  const info = StorageManager.getStorageInfo();
  const el = document.getElementById("storage-info");
  if (el)
    el.textContent = `${info.chatCount} chats · ${info.messageCount} messages · ${info.usageMB} MB used`;
}
