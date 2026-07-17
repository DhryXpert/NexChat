# 🌌 NexChat — Fullstack AI Chatbot

<div align="center">

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![NVIDIA NIM](https://img.shields.io/badge/NVIDIA%20NIM-76B900?style=for-the-badge&logo=nvidia&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

**A high-performance, premium AI chat client featuring real-time streaming, secure server proxying, and cloud-synced conversation history.**

[🚀 Live Demo](https://nex-chat-v1.vercel.app/) · [🔗 Backend API](https://nexchat-sfgt.onrender.com/)

</div>

---

## ✨ Key Features

*   🎨 **Premium Dark Aesthetics** — Sleek glassmorphic components, fluid violet-to-cyan neon gradient accents, and responsive micro-animations.
*   🔐 **Dual Auth Flow** — Secure user authentication powered by Firebase Client, with support for standard Email/Password and **One-Click Google Sign-In**.
*   ☁️ **Cloud Persisted Syncing** — Real-time Firestore sync binds conversations and message histories under private, user-specific partitions.
*   🔄 **Token-by-Token Streaming** — Leverages Server-Sent Events (SSE) to stream responses from NVIDIA's API instantly.
*   ⚡ **Intelligent Keep-Alive** — Integrated cache-busting, zero-cache health monitors keep Render server instances awake on user mount/login.
*   📝 **Rich Markdown Support** — Built-in rendering of code blocks (complete with copy-to-clipboard actions), standard formatting, links, and lists.
*   🛡️ **Backend Token Protection** — Secure request proxy hides the NVIDIA API keys entirely from client access.
*   ⌨️ **Power-User Shortcuts** — Navigation shortcuts like `Ctrl+N` (New Chat), `Ctrl+B` (Toggle Sidebar), and `Esc` (Close Modals) for a desktop-class experience.

---

## Project Structure

```
NexChat/
├── backend/                          # Express API
│   ├── server.js                     # Main server entry with Firebase Admin
│   ├── middleware/auth.js            # Firebase ID token verification middleware
│   ├── routes/completions.js         # Upstream NVIDIA NIM streaming proxy
│   └── package.json                  # Backend dependencies
│
├── frontend/                         # React Frontend (Vite)
│   ├── src/
│   │   ├── main.jsx                  # React application entry
│   │   ├── App.jsx                   # Layout & State orchestration
│   │   ├── firebase.js               # Firebase Client initialization
│   │   ├── contexts/AuthContext.jsx  # Context providing Auth actions & State
│   │   ├── hooks/
│   │   │   ├── useChats.js           # Firestore subscription & CRUD hook
│   │   │   └── useStream.js          # SSE completions streaming hook
│   │   ├── components/               # Subcomponents (Auth, Sidebar, Chat, Settings)
│   │   └── index.css                 # Global stylesheets & design tokens
│   └── package.json                  # Frontend dependencies
│
├── package.json                      # Monorepo controller config
└── README.md                         # This file
```

---

## Getting Started

### 1. Setup Environment Variables

#### Backend (`/backend/.env`)
Create a `.env` file in the `backend/` directory:
```env
PORT=3000
NVIDIA_API_KEY=your_nvidia_api_key_here

# Firebase Admin Credentials
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Allowed CORS Origin
FRONTEND_URL=http://localhost:5173
```

#### Frontend (`/frontend/.env`)
The Firebase configuration is hardcoded in `frontend/src/firebase.js` using your web app credentials. Ensure `VITE_BACKEND_URL` is set:
```env
VITE_BACKEND_URL=http://localhost:3000
```

---

## Development

Install all dependencies for both directories and run the application concurrently using the monorepo scripts in the root directory:

```bash
# Install all dependencies across the project
npm run install:all

# Run both frontend & backend concurrently
npm run dev
```

- **Frontend**: Runs on [http://localhost:5173](http://localhost:5173)
- **Backend**: Runs on [http://localhost:3000](http://localhost:3000)

---

## Deployment

### Backend (Render Web Service)
1. Add a new **Web Service** on Render.
2. Set **Root Directory** to `backend`.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `node server.js`.
5. Add the necessary backend environment variables.

### Frontend (Vercel Static)
1. Import repository to Vercel.
2. Select **Root Directory** as `frontend`.
3. Use the **Vite** preset (Vercel autodetects it).
4. Set the `VITE_BACKEND_URL` environment variable pointing to your deployed backend URL.