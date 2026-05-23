import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  increment, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';

export async function logUser(user: any) {
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    const generateCode = () => {
      return 'WSIM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    };

    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email?.split('@')[0] || 'مستخدم',
      lastActive: new Date().toISOString(),
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
    if (err.code === 'unavailable' || err.message?.includes('offline')) {
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
    if (err.code === 'unavailable' || err.message?.includes('offline')) {
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
