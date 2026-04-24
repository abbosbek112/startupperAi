import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { ChatMessage } from '../types';

export function useChatMessages(startupId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!startupId) return;

    const q = query(
      collection(db, 'startups', startupId, 'chats'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(docs);
    });

    return unsubscribe;
  }, [startupId]);

  return messages;
}
