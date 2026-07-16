# NexChat — Fullstack AI Chatbox 🤖

A premium, fullstack AI chatbox built with **React (Vite)** on the frontend, a **Node.js/Express** backend, and powered by **NVIDIA NIM** API and **Firebase** (Auth & Firestore).

---

## Features

- 🎨 **Dark Premium UI** — Sleek Glassmorphism, violet-cyan gradient theme, micro-animations.
- 🔐 **Firebase Authentication** — Sign up & log in with Email/Password or **Sign in with Google**.
- ☁️ **Cloud Firestore Database** — Chat conversations and message history are synced in real-time and persisted securely in the cloud.
- 🔄 **Real-Time Streaming** — Server-Sent Events (SSE) stream responses token-by-token.
- 📝 **Markdown rendering** — Handles code blocks (with copy-to-clipboard buttons), bold/italic text, links, lists, and line breaks.
- 🔒 **Secure API Keys** — The NVIDIA API key is kept securely on the backend, preventing client-side exposure.
- ⌨️ **Keyboard shortcuts** — `Enter` to send, `Ctrl+N` for a new chat, `Ctrl+B` to toggle sidebar, and `Esc` to close modals.

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