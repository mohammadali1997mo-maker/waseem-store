import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, collection, query, orderBy, limit, DocumentData } from 'firebase/firestore';
import { getExchangeRate } from './currency';
import { addDeposit, updateWalletBalance, setExchangeRate as saveExchangeRate } from './db';

/**
 * Custom React Hook to bridge client application states with Firestore exchangeRate settings,
 * enabling real-time synchronization with direct edits from the Firebase Studio Console.
 */
export function useExchangeRate() {
  const [exchangeRate, setRate] = useState<number>(getExchangeRate());
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Sync with the 'settings/global' Firestore document in real-time
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const val = snap.data().exchangeRate;
        if (typeof val === 'number') {
          setRate(val);
        }
      }
      setLoading(false);
    }, (err) => {
      console.warn("Failed real-time subscription for exchangeRate settings:", err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const updateRate = async (newVal: number | string) => {
    return await saveExchangeRate(newVal);
  };

  return { exchangeRate, loading, updateRate };
}

/**
 * Custom React Hook to subscribe and monitor live database status
 * for real-time adjustments made on the Firebase Console or client-side operations.
 */
export function useRealtimeCollection(collectionName: string, itemsLimit = 50) {
  const [data, setData] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const q = query(
        collection(db, collectionName),
        orderBy('createdAt', 'desc'),
        limit(itemsLimit)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const items: DocumentData[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setData(items);
        setLoading(false);
      }, (err) => {
        console.error(`Live sync error for database collection: ${collectionName}`, err);
        setError(err.message);
        setLoading(false);
      });

      return () => unsub();
    } catch (e: any) {
      console.error(`Error configuring onSnapshot on collection: ${collectionName}`, e);
      setError(e.message);
      setLoading(false);
    }
  }, [collectionName, itemsLimit]);

  return { data, loading, error };
}

/**
 * Hook supplying admin-focused transactional functions
 */
export function useAdminActions() {
  const [loading, setLoading] = useState(false);

  const executeAddDeposit = async (depositData: any) => {
    setLoading(true);
    try {
      const res = await addDeposit(depositData);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const executeUpdateWalletBalance = async (uid: string, amount: string | number) => {
    setLoading(true);
    try {
      const res = await updateWalletBalance(uid, amount);
      return res;
    } finally {
      setLoading(false);
    }
  };

  return {
    executeAddDeposit,
    executeUpdateWalletBalance,
    loading
  };
}
