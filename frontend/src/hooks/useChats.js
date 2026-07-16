import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useChats(uid) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setChats([]);
      setLoading(false);
      return;
    }

    const chatsRef = collection(db, 'users', uid, 'chats');
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore Timestamps to millis for consistency
        createdAt: doc.data().createdAt?.toMillis?.() || Date.now(),
        updatedAt: doc.data().updatedAt?.toMillis?.() || Date.now(),
      }));
      setChats(chatList);
      setLoading(false);
    }, (err) => {
      console.error('[useChats] Snapshot error:', err);
      setLoading(false);
    });

    return unsubscribe;
  }, [uid]);

  const createChat = useCallback(async (model = 'google/gemma-2-2b-it') => {
    if (!uid) return null;
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const chatData = {
      title: 'New Chat',
      model,
      messages: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', uid, 'chats', chatId), chatData);
    return { id: chatId, ...chatData, createdAt: Date.now(), updatedAt: Date.now(), messages: [] };
  }, [uid]);

  const updateChat = useCallback(async (chatId, updates) => {
    if (!uid || !chatId) return;
    const chatRef = doc(db, 'users', uid, 'chats', chatId);
    await setDoc(chatRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
  }, [uid]);

  const deleteChat = useCallback(async (chatId) => {
    if (!uid || !chatId) return;
    await deleteDoc(doc(db, 'users', uid, 'chats', chatId));
  }, [uid]);

  const clearAllChats = useCallback(async () => {
    if (!uid) return;
    const chatsRef = collection(db, 'users', uid, 'chats');
    const snapshot = await getDocs(chatsRef);
    const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  }, [uid]);

  return { chats, loading, createChat, updateChat, deleteChat, clearAllChats };
}
