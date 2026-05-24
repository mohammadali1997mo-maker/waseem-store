import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  increment, 
  getDoc, 
  getDocFromCache,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';

export async function logUser(user: any) {
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    const generateCode = () => {
      return 'WSIM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const providerId = user.providerData?.[0]?.providerId || '';
    const method = providerId === 'google.com' ? 'Google' : 'البريد الإلكتروني';

    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'مستخدم',
      lastActive: new Date().toISOString(),
      method: method,
    };

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        ...userData,
        referralCode: generateCode(),
        registeredAt: new Date().toISOString(),
      });
    } else {
      // Keep existing referralCode if it exists
      const existingData = userSnap.data();
      await updateDoc(userRef, {
        ...userData,
        referralCode: existingData.referralCode || generateCode(),
      });
    }
  } catch (err: any) {
    const errMsg = String(err?.message || err || '').toLowerCase();
    if (err.code === 'unavailable' || errMsg.includes('offline') || errMsg.includes('unavailable')) {
      // Silent in offline mode, Firestore will sync later
      return;
    }
    console.error("logUser failed:", err);
  }
}

export async function trackSectionVisit(sectionName: string) {
  try {
    const statRef = doc(db, 'stats', sectionName);
    const statSnap = await getDoc(statRef);

    if (!statSnap.exists()) {
      await setDoc(statRef, {
        section: sectionName,
        visitCount: 1,
      });
    } else {
      await updateDoc(statRef, {
        visitCount: increment(1),
      });
    }
  } catch (err: any) {
    const errMsg = String(err?.message || err || '').toLowerCase();
    if (err.code === 'unavailable' || errMsg.includes('offline') || errMsg.includes('unavailable')) {
      return;
    }
    console.error("trackSectionVisit failed:", err);
  }
}

export async function saveInvoice(invoiceData: any) {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceData.orderId);
    await setDoc(invoiceRef, {
      ...invoiceData,
      status: 'paid',
      date: new Date().toISOString(),
    });
  } catch (err) {
    console.error("saveInvoice failed:", err);
    throw err; // Re-throw to handle in UI
  }
}

export function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem('wsim_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 11);
    sessionStorage.setItem('wsim_session_id', sid);
  }
  return sid;
}

export async function trackUserSession(user: any, sectionName?: string) {
  if (!user) return;
  try {
    const sid = getOrCreateSessionId();
    const sessionRef = doc(db, 'visitor_sessions', sid);
    
    let sessionSnap;
    try {
      sessionSnap = await getDoc(sessionRef);
    } catch (docErr: any) {
      const docErrMsg = String(docErr?.message || docErr || '').toLowerCase();
      if (docErr.code === 'unavailable' || docErrMsg.includes('offline') || docErrMsg.includes('unavailable')) {
        try {
          // Fallback to cache since client is offline
          sessionSnap = await getDocFromCache(sessionRef);
        } catch (cacheErr) {
          // Silent or fall through
        }
      } else {
        throw docErr;
      }
    }

    const email = user.email || 'google-user@wsimstore.com';
    const name = user.displayName || user.email?.split('@')[0] || 'مستخدم';
    const now = new Date();
    
    if (!sessionSnap || !sessionSnap.exists()) {
      await setDoc(sessionRef, {
        sessionId: sid,
        uid: user.uid,
        email,
        name,
        startedAt: now.toISOString(),
        lastActive: now.toISOString(),
        durationSeconds: 0,
        visitorType: user.email === 'wsh020264@gmail.com' ? 'admin' : 'user',
        sections: sectionName ? [sectionName] : [],
        pathHistory: sectionName ? [{ name: sectionName, visitedAt: now.toISOString() }] : [],
      });
    } else {
      const data = sessionSnap.data();
      const started = new Date(data.startedAt || now.toISOString());
      const diffSeconds = Math.round((now.getTime() - started.getTime()) / 1000);
      
      const updates: any = {
        lastActive: now.toISOString(),
        durationSeconds: diffSeconds,
      };

      if (sectionName) {
        updates.sections = arrayUnion(sectionName);
        updates.pathHistory = arrayUnion({ name: sectionName, visitedAt: now.toISOString() });
      }

      await updateDoc(sessionRef, updates);
    }
  } catch (err: any) {
    const errMsg = String(err?.message || err || '').toLowerCase();
    if (err.code === 'unavailable' || errMsg.includes('offline') || errMsg.includes('unavailable')) {
      // Quietly return on offline status, let Firestore persistence handle eventual sync
      return;
    }
    console.error("trackUserSession failed:", err);
  }
}

