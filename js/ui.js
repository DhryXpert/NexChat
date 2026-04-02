/**
 * NexChat — UI Utilities
 * Toasts, markdown renderer, sidebar toggle, auto-resize, copy-to-clipboard.
 */

// ─── Toast Notifications ───────────────────────────────────────────────────

let _toastTimer = null;

const UI = {
  toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<span class="toast__icon">${icons[type] || icons.info}</span><span class="toast__msg">${message}</span>`;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast--visible'));

    setTimeout(() => {
      toast.classList.remove('toast--visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
  },

  toastSuccess: (msg) => UI.toast(msg, 'success'),
  toastError: (msg) => UI.toast(msg, 'error', 5000),
  toastWarning: (msg) => UI.toast(msg, 'warning'),
  toastInfo: (msg) => UI.toast(msg, 'info'),

  // ─── Sidebar ────────────────────────────────────────────────────────────

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isOpen = sidebar.classList.toggle('sidebar--open');
    overlay?.classList.toggle('overlay--visible', isOpen);
    document.body.classList.toggle('sidebar-expanded', isOpen);
  },

  closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.remove('sidebar--open');
    overlay?.classList.remove('overlay--visible');
    document.body.classList.remove('sidebar-expanded');
  },

  // ─── Auto-resize Textarea ────────────────────────────────────────────────

  autoResizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  },

  // ─── Scroll ────────────────────────────────────────────────────────────

  scrollToBottom(el, smooth = true) {
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
  },

  isNearBottom(el, threshold = 120) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  },

  // ─── Copy to Clipboard ─────────────────────────────────────────────────

  async copyText(text, btn = null) {
    try {
      await navigator.clipboard.writeText(text);
      if (btn) {
        const original = btn.innerHTML;
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        btn.classList.add('btn-copy--success');
        setTimeout(() => {
          btn.innerHTML = original;
          btn.classList.remove('btn-copy--success');
        }, 2000);
      }
      return true;
    } catch {
      UI.toastError('Copy failed — please copy manually.');
      return false;
    }
  },

  // ─── Markdown Renderer ─────────────────────────────────────────────────

  /**
   * Lightweight markdown → HTML renderer.
   * Handles: code blocks, inline code, bold, italic, links, ordered & unordered lists, line breaks.
   */
  renderMarkdown(text) {
    if (!text) return '';

    // Escape HTML special chars (except inside code)
    const escapeHtml = (str) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // 1. Extract and replace code blocks with placeholders
    const codeBlocks = [];
    let processed = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const id = codeBlocks.length;
      codeBlocks.push({ lang: lang || 'text', code: code.trimEnd() });
      return `%%CODE_BLOCK_${id}%%`;
    });

    // 2. Process line by line for block-level elements
    const lines = processed.split('\n');
    const htmlLines = [];
    let i = 0;
    let inList = null; // 'ul' or 'ol'

    const closeList = () => {
      if (inList) { htmlLines.push(`</${inList}>`); inList = null; }
    };

    while (i < lines.length) {
      const line = lines[i];

      // Code block placeholder
      if (line.includes('%%CODE_BLOCK_')) {
        closeList();
        const match = line.match(/%%CODE_BLOCK_(\d+)%%/);
        if (match) {
          const { lang, code } = codeBlocks[parseInt(match[1])];
          const copyId = `copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          htmlLines.push(`
<div class="code-block">
  <div class="code-block__header">
    <span class="code-block__lang">${escapeHtml(lang)}</span>
    <button class="btn-copy" id="${copyId}" data-code="${escapeHtml(code)}" onclick="UI.copyCodeBlock(this)">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      Copy
    </button>
  </div>
  <pre><code class="lang-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>
</div>`);
        }
        i++; continue;
      }

      // Ordered list
      const olMatch = line.match(/^(\d+)\.\s+(.*)/);
      if (olMatch) {
        if (inList !== 'ol') { closeList(); htmlLines.push('<ol>'); inList = 'ol'; }
        htmlLines.push(`<li>${UI._inlineMarkdown(olMatch[2])}</li>`);
        i++; continue;
      }

      // Unordered list
      const ulMatch = line.match(/^[-*+]\s+(.*)/);
      if (ulMatch) {
        if (inList !== 'ul') { closeList(); htmlLines.push('<ul>'); inList = 'ul'; }
        htmlLines.push(`<li>${UI._inlineMarkdown(ulMatch[1])}</li>`);
        i++; continue;
      }

      // Headings
      const h3 = line.match(/^###\s+(.*)/);
      const h2 = line.match(/^##\s+(.*)/);
      const h1 = line.match(/^#\s+(.*)/);
      if (h3) { closeList(); htmlLines.push(`<h3>${UI._inlineMarkdown(h3[1])}</h3>`); i++; continue; }
      if (h2) { closeList(); htmlLines.push(`<h2>${UI._inlineMarkdown(h2[1])}</h2>`); i++; continue; }
      if (h1) { closeList(); htmlLines.push(`<h1>${UI._inlineMarkdown(h1[1])}</h1>`); i++; continue; }

      // Horizontal rule
      if (/^---+$/.test(line.trim())) { closeList(); htmlLines.push('<hr>'); i++; continue; }

      // Blank line
      if (!line.trim()) { closeList(); htmlLines.push('<br>'); i++; continue; }

      closeList();
      htmlLines.push(`<p>${UI._inlineMarkdown(line)}</p>`);
      i++;
    }
    closeList();

    return htmlLines.join('\n');
  },

  _inlineMarkdown(text) {
    const escapeHtml = (str) =>
      str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Inline code first (to avoid processing inside it)
    const inlineCodes = [];
    let result = text.replace(/`([^`]+)`/g, (_, code) => {
      const id = inlineCodes.length;
      inlineCodes.push(escapeHtml(code));
      return `%%IC_${id}%%`;
    });

    // Bold italic, bold, italic
    result = result
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>');

    // Links
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Restore inline codes
    inlineCodes.forEach((code, id) => {
      result = result.replace(`%%IC_${id}%%`, `<code>${code}</code>`);
    });

    return result;
  },

  copyCodeBlock(btn) {
    const code = btn.getAttribute('data-code')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
    UI.copyText(code, btn);
  },

  // ─── Typing Indicator ─────────────────────────────────────────────────

  showTypingIndicator() {
    const feed = document.getElementById('chat-feed');
    if (!feed) return;
    const el = document.createElement('div');
    el.className = 'msg msg--ai msg--typing';
    el.id = 'typing-indicator';
    el.innerHTML = `
      <div class="msg__avatar">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" fill="none">
          <defs><linearGradient id="tg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#7c3aed"/><stop offset="100%" style="stop-color:#06b6d4"/></linearGradient></defs>
          <circle cx="24" cy="24" r="20" fill="url(#tg)" opacity="0.2"/>
          <circle cx="15" cy="24" r="3" fill="url(#tg)"/>
          <circle cx="24" cy="24" r="3" fill="url(#tg)"/>
          <circle cx="33" cy="24" r="3" fill="url(#tg)"/>
        </svg>
      </div>
      <div class="msg__bubble">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>`;
    feed.appendChild(el);
    UI.scrollToBottom(feed);
    return el;
  },

  removeTypingIndicator() {
    document.getElementById('typing-indicator')?.remove();
  },

  // ─── Empty State ─────────────────────────────────────────────────────────

  showEmptyState() {
    const feed = document.getElementById('chat-feed');
    if (!feed) return;
    feed.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__logo">
          <img src="./assets/logo.svg" alt="NexChat logo" width="64" height="64">
        </div>
        <h2 class="empty-state__title">How can I help you today?</h2>
        <p class="empty-state__sub">Type a message below or choose a prompt to get started.</p>
        <div class="empty-state__prompts">
          ${[
            { icon: '💡', text: 'Explain quantum computing in simple terms' },
            { icon: '✍️', text: 'Write a short poem about the ocean' },
            { icon: '🔍', text: 'What are the best coding practices in JavaScript?' },
            { icon: '🌍', text: 'Give me a fun fact about space' },
          ].map(p => `
            <button class="prompt-card" data-prompt="${p.text}">
              <span class="prompt-card__icon">${p.icon}</span>
              <span class="prompt-card__text">${p.text}</span>
            </button>`).join('')}
        </div>
      </div>`;

    // Prompt card clicks
    feed.querySelectorAll('.prompt-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById('chat-input');
        if (input) {
          input.value = btn.dataset.prompt;
          UI.autoResizeTextarea(input);
          input.focus();
          document.getElementById('send-btn')?.click();
        }
      });
    });
  },

  hideEmptyState() {
    document.querySelector('.empty-state')?.remove();
  },

  // ─── Settings Modal ────────────────────────────────────────────────────

  openSettings() {
    const modal = document.getElementById('settings-modal');
    modal?.classList.add('modal--open');
    document.body.classList.add('modal-lock');
  },

  closeSettings() {
    const modal = document.getElementById('settings-modal');
    modal?.classList.remove('modal--open');
    document.body.classList.remove('modal-lock');
  },

  toggleApiKeyVisibility() {
    const input = document.getElementById('settings-api-key');
    const btn = document.getElementById('toggle-api-key');
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    } else {
      input.type = 'password';
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
  },
};

// expose globally for inline onclick handlers
window.UI = UI;

export default UI;
