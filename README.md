# NexChat 🤖

A premium AI chatbox built with vanilla HTML, CSS & JavaScript — powered by **NVIDIA NIM** free API.

> **Learning project** — designed for a future React upgrade and Netlify deployment.

---

## Features

- 🎨 **Dark premium UI** — Glassmorphism, violet-cyan gradients, micro-animations
- 💬 **Multi-chat** — Create, switch, and manage multiple conversation threads
- 🔄 **Streaming responses** — Real-time token-by-token display
- 📝 **Markdown rendering** — Code blocks, bold, lists, and more
- 💾 **LocalStorage** — All chats & settings persisted (Netlify-ready)
- 📱 **Responsive** — Full mobile support with collapsible sidebar
- ⌨️ **Keyboard shortcuts** — `Enter` send, `Ctrl+N` new chat, `Ctrl+B` sidebar

---

## Quick Start

### 1. Get a Free NVIDIA API Key

1. Go to [build.nvidia.com](https://build.nvidia.com/)
2. Sign in (or create a free account)
3. Navigate to **API Keys** → **Create API Key**
4. Copy the key (starts with `nvapi-`)

### 2. Run Locally

Since this is a pure static app using ES Modules, you need a local HTTP server (not `file://`):

```bash
# Option A: VS Code Live Server (recommended)
# Right-click index.html → "Open with Live Server"

# Option B: npx serve
npx serve .

# Option C: Python
python -m http.server 8080
```

Then open `http://localhost:PORT` in your browser.

### 3. Enter Your API Key

On first launch, the Settings modal opens automatically. Paste your `nvapi-` key and click **Save Settings**.

---

## Project Structure

```
NexChat/
├── index.html          # App shell
├── css/
│   └── styles.css      # Design system + all component styles
├── js/
│   ├── app.js          # Main controller & event wiring
│   ├── api.js          # NVIDIA NIM API (browser fetch + streaming)
│   ├── chat.js         # Chat logic, message rendering, sidebar
│   ├── storage.js      # LocalStorage persistence (Netlify-ready)
│   └── ui.js           # Toast, markdown, copy, animations
├── assets/
│   └── logo.svg        # App logo
└── API.js              # Original Node.js API reference
```

---

## Deploy to Netlify

1. Push this folder to a GitHub repository
2. Go to [app.netlify.com](https://app.netlify.com/) → **Add new site** → **Import from Git**
3. Set **Publish directory**: `/` (root)
4. Click **Deploy** — done! ✅

> **Note:** Each user's chats are stored privately in their own browser (LocalStorage). No database needed.

---

## Available Models (Free Tier)

| Model | Speed | Best For |
|-------|-------|----------|
| `google/gemma-7b` | ⚡ Fast | General chat, quick answers |
| `meta/llama-3.1-8b-instruct` | ⚡ Fast | Instructions, reasoning |
| `meta/llama-3.1-70b-instruct` | 🐢 Slower | Complex tasks, long reasoning |
| `mistralai/mistral-7b-instruct-v0.3` | ⚡ Fast | Code, analysis |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Ctrl+N` | New chat |
| `Ctrl+B` | Toggle sidebar |
| `Escape` | Close modal / sidebar |

---

## Future — React Upgrade

The code is structured for easy React migration:

- `js/api.js` → `hooks/useNvidiaChat.js`
- `js/storage.js` → Zustand store + Supabase
- `js/chat.js` → `components/ChatManager.jsx`
- `css/styles.css` → CSS Modules or styled-components