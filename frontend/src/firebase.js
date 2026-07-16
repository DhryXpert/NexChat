import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBiy75f6fmsBIRL5S2h-k6q1_BnAv2Ylic",
  authDomain: "nexchat-07.firebaseapp.com",
  projectId: "nexchat-07",
  storageBucket: "nexchat-07.firebasestorage.app",
  messagingSenderId: "809665794085",
  appId: "1:809665794085:web:f4f009117b2517b133afcc",
  measurementId: "G-1ET11Z682L",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
