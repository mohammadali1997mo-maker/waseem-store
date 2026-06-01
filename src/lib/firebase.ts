import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged as nativeOnAuthStateChanged, 
  signOut as nativeSignOut 
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust local persistent cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, firebaseConfig.firestoreDatabaseId);

// Initialize Auth
export const auth = getAuth(app);

// Simple clean-up of legacy bypass keys to ensure users are forced to log in with real Firebase accounts
const BYPASS_USER_KEY = 'wsim_bypass_active_user';
const BYPASS_ADMIN_KEY = 'wsim_bypass_active_admin';
if (typeof window !== 'undefined') {
  if (localStorage.getItem(BYPASS_USER_KEY) || localStorage.getItem(BYPASS_ADMIN_KEY)) {
    localStorage.removeItem(BYPASS_USER_KEY);
    localStorage.removeItem(BYPASS_ADMIN_KEY);
    localStorage.removeItem('wsimUser');
    localStorage.removeItem('wsimAdminUser');
    console.log("[Authentication Engine] Cleaned up legacy bypass/simulated accounts.");
  }
}

// Export clean mappings matching existing imports exactly
export const onAuthStateChanged = nativeOnAuthStateChanged;
export const signOut = nativeSignOut;
