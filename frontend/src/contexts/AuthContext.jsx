import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    let active = true;
    let timeoutId = null;

    // If it doesn't respond in 1.5s, mark it as waking up
    timeoutId = setTimeout(() => {
      if (active) {
        setServerStatus('waking');
      }
    }, 1500);

    const checkHealth = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/health`);
        if (!res.ok) throw new Error('Health check non-ok status');
        if (active) {
          clearTimeout(timeoutId);
          setServerStatus('ready');
        }
      } catch (err) {
        console.warn('Backend health check failed:', err);
        if (active) {
          clearTimeout(timeoutId);
          setServerStatus('error');
          // Retry after 5s to check again/wake up
          setTimeout(() => {
            if (active) checkHealth();
          }, 5000);
        }
      }
    };

    checkHealth();

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const signUp = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    return cred.user;
  };

  const signIn = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  };

  const signOut = () => firebaseSignOut(auth);

  const getIdToken = async () => {
    if (!user) return null;
    return user.getIdToken();
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    getIdToken,
    serverStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
