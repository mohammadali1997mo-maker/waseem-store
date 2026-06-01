import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, CollectionReference, DocumentData } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);

// Centralized and strongly-typed Firestore collection instances
export const usersCollection: CollectionReference<DocumentData> = collection(db, 'users');
export const withdrawalsCollection: CollectionReference<DocumentData> = collection(db, 'withdrawals');
export const depositsCollection: CollectionReference<DocumentData> = collection(db, 'invoices');
export const settingsCollection: CollectionReference<DocumentData> = collection(db, 'settings');

export default {
  app,
  db,
  auth,
  usersCollection,
  withdrawalsCollection,
  depositsCollection,
  settingsCollection
};
