const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const authMiddleware = require('./middleware/auth');
const completionsRouter = require('./routes/completions');

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};
if (firebaseConfig.projectId && firebaseConfig.clientEmail && firebaseConfig.privateKey) {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseConfig),
  });
  console.log('[Firebase] Admin SDK initialized');
} else {
  console.warn('[Firebase] Admin credentials not found — auth middleware will be skipped in dev');
}
const app = express();
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
].filter(Boolean).map(url => url.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked request from origin: "${origin}". Allowed origins:`, allowedOrigins);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());

app.all('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const authGuard = firebaseConfig.projectId ? authMiddleware : (req, res, next) => next();
app.use('/api/chat', authGuard, completionsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('NexChat Backend is running!');
  console.log(`http://localhost:${PORT}`);
  console.log(`CORS origins: ${allowedOrigins.join(', ')}`);
});
