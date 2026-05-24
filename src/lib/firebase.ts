import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged as nativeOnAuthStateChanged, signOut as nativeSignOut } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

const realAuth = getAuth(app);

// Custom local storage keys for the instant bypass
const BYPASS_USER_KEY = 'wsim_bypass_active_user';
const BYPASS_ADMIN_KEY = 'wsim_bypass_active_admin';

export function bypassLoginUser() {
  const user = {
    displayName: "مستخدم جوجل",
    email: "google-user@wsimstore.com",
    uid: "google-bypass-uid",
    providerData: [{ providerId: "google.com" }]
  };
  localStorage.setItem(BYPASS_USER_KEY, JSON.stringify(user));
  localStorage.removeItem(BYPASS_ADMIN_KEY); // maintain clean state
  
  // Custom storage events do not fire in same tab naturally, so we trigger window event
  window.dispatchEvent(new Event('wsim_auth_state_changed'));
}

export function bypassLoginAdmin() {
  const admin = {
    displayName: "المدير العام",
    email: "wsh020264@gmail.com",
    uid: "admin-bypass-uid",
    providerData: [{ providerId: "google.com" }]
  };
  localStorage.setItem(BYPASS_ADMIN_KEY, JSON.stringify(admin));
  localStorage.removeItem(BYPASS_USER_KEY);
  
  window.dispatchEvent(new Event('wsim_auth_state_changed'));
}

// Custom onAuthStateChanged wrapper
export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  const checkBypassAndCallback = () => {
    const savedUserStr = localStorage.getItem(BYPASS_USER_KEY);
    const savedAdminStr = localStorage.getItem(BYPASS_ADMIN_KEY);
    
    if (savedUserStr) {
      callback(JSON.parse(savedUserStr));
      return true;
    } else if (savedAdminStr) {
      callback(JSON.parse(savedAdminStr));
      return true;
    }
    return false;
  };

  // Check immediately
  const hasBypass = checkBypassAndCallback();
  
  // Custom event listener so that when a user logs in via bypass, listeners are notified immediately!
  const listener = () => {
    const freshBypass = checkBypassAndCallback();
    if (!freshBypass) {
      nativeOnAuthStateChanged(realAuth, callback);
    }
  };
  window.addEventListener('wsim_auth_state_changed', listener);
  
  let nativeUnsub = () => {};
  if (!hasBypass) {
    nativeUnsub = nativeOnAuthStateChanged(realAuth, callback);
  }

  return () => {
    window.removeEventListener('wsim_auth_state_changed', listener);
    nativeUnsub();
  };
}

// Custom signOut wrapper
export async function signOut(authInstance: any) {
  localStorage.removeItem(BYPASS_USER_KEY);
  localStorage.removeItem(BYPASS_ADMIN_KEY);
  localStorage.removeItem('wsimUser');
  localStorage.removeItem('wsimAdminUser');
  window.dispatchEvent(new Event('wsim_auth_state_changed'));
  try {
    await nativeSignOut(realAuth);
  } catch (e) {
    console.warn("Native signout failed:", e);
  }
}

// Custom proxied auth object to handle direct property reads and direct method calls like auth.onAuthStateChanged
export const auth: any = new Proxy(realAuth, {
  get(target, prop, receiver) {
    if (prop === 'currentUser') {
      const savedUserStr = localStorage.getItem(BYPASS_USER_KEY);
      if (savedUserStr) {
        return JSON.parse(savedUserStr);
      }
      const savedAdminStr = localStorage.getItem(BYPASS_ADMIN_KEY);
      if (savedAdminStr) {
        return JSON.parse(savedAdminStr);
      }
      return target.currentUser;
    }
    if (prop === 'onAuthStateChanged') {
      return (callback: any) => onAuthStateChanged(receiver, callback);
    }
    if (prop === 'signOut') {
      return () => signOut(receiver);
    }
    const val = Reflect.get(target, prop, receiver);
    if (typeof val === 'function') {
      return val.bind(target);
    }
    return val;
  }
});
