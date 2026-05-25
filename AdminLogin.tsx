import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with multi-tab persistent cache enabled to guarantee real-time synchronization
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Initialize Auth
export const auth = getAuth(app);

// Initialize Centralized Collection References for real-time synchronization
export const usersCollection = collection(db, 'users');
export const withdrawalsCollection = collection(db, 'withdrawals');
export const depositsCollection = collection(db, 'invoices'); // 'invoices' serves as the deposits collection for tracking deposit slips
export const settingsCollection = collection(db, 'settings');

export default {
  app,
  db,
  auth,
  usersCollection,
  withdrawalsCollection,
  depositsCollection,
  settingsCollection
};
