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
    let retryCount = 0;
    const maxWakingRetries = 12; // 12 * 5s = 60s of waking status before showing error

    const checkHealth = async () => {
      // Only set the initial waking timer on the first check to avoid resetting/jumping state
      if (retryCount === 0) {
        timeoutId = setTimeout(() => {
          if (active) setServerStatus('waking');
        }, 1500);
      }

      // Create an AbortController for a 8-second request timeout to prevent hanging on Brave
      const controller = new AbortController();
      const fetchTimeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        // Switch to POST to bypass browser and CDN caching without query parameters
        const res = await fetch(`${BACKEND_URL}/health`, {
          method: 'POST',
          signal: controller.signal,
          cache: 'no-store',
        });

        clearTimeout(fetchTimeoutId);

        if (!res.ok) throw new Error('Health check non-ok status');
        
        if (active) {
          if (timeoutId) clearTimeout(timeoutId);
          setServerStatus('ready');
        }
      } catch (err) {
        clearTimeout(fetchTimeoutId);
        console.warn('Backend health check failed:', err);
        if (active) {
          if (timeoutId) clearTimeout(timeoutId);

          retryCount++;
          // Keep showing 'waking' during Render's typical boot timeframe (60s)
          // only drop to 'error' (offline) if it fails consistently beyond that
          if (retryCount >= maxWakingRetries) {
            setServerStatus('error');
          } else {
            setServerStatus('waking');
          }

          // Retry check after 5 seconds to continue wake-up process
          setTimeout(() => {
            if (active) checkHealth();
          }, 5000);
        }
      }
    };

    checkHealth();

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user]);

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
