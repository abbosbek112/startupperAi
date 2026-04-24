import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Startup } from '../types';

export function useStartups(userId: string | undefined) {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setStartups([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'startups'),
      where('ownerId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Startup));
      setStartups(docs);
      setLoading(false);
    });

    return unsubscribe;
  }, [userId]);

  return { startups, loading };
}
