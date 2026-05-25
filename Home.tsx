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
  arrayUnion,
  runTransaction
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
        ucBalance: 0,
      });
    } else {
      // Keep existing referralCode if it exists
      const existingData = userSnap.data();
      await updateDoc(userRef, {
        ...userData,
        referralCode: existingData.referralCode || generateCode(),
        // Ensure ucBalance is initialized if it wasn't there
        ucBalance: existingData.ucBalance !== undefined ? existingData.ucBalance : 0,
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

export async function updateUserUCBalance(uid: string, amount: number) {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ucBalance: increment(amount),
      lifetimeAccumulatedUC: increment(amount) // Ensure manual adjustments count as accumulation points
    });
    console.log(`Successfully credited ${amount} UC to user ${uid}`);
  } catch (err) {
    console.error("updateUserUCBalance failed:", err);
    throw err;
  }
}

export async function fulfillDepositTransaction(invoiceId: string, newStatus: string) {
  try {
    const result = await runTransaction(db, async (transaction) => {
      const invoiceRef = doc(db, 'invoices', invoiceId);
      const invoiceSnap = await transaction.get(invoiceRef);
      
      if (!invoiceSnap.exists()) {
        throw new Error("الفاتورة غير موجودة");
      }
      
      const invData = invoiceSnap.data();
      const isManualTopup = invData.paymentMethod === "شام كاش - إيداع محفظة يدوي";
      const isApproving = newStatus === "مكتمل" || newStatus === "تم الشحن";
      
      if (isManualTopup && isApproving && !invData.credited) {
        const uid = invData.uid;
        if (!uid) throw new Error("آيدي المستخدم غير موجود بالفاتورة");
        
        const qty = parseInt(invData.qty || "0", 10);
        const bonusQty = parseInt(invData.bonusQty || "0", 10);
        const ucToAdd = qty + bonusQty;
        
        const userRef = doc(db, 'users', uid);
        const userSnap = await transaction.get(userRef);
        
        if (!userSnap.exists()) {
          throw new Error("المستخدم غير موجود بالنظام");
        }
        
        // Transactionally update user parameters
        transaction.update(userRef, {
          ucBalance: increment(ucToAdd),
          lifetimeAccumulatedUC: increment(ucToAdd)
        });
        
        // Transactionally update invoice status and claim flag
        transaction.update(invoiceRef, { 
          status: newStatus, 
          credited: true 
        });
        
        return { success: true, ucAdded: ucToAdd };
      } else {
        // Just update status if not a topup, or if already credited, or not approving status
        transaction.update(invoiceRef, { status: newStatus });
        return { success: true, ucAdded: 0 };
      }
    });
    console.log("fulfillDepositTransaction successfully processed:", result);
    return result;
  } catch (err) {
    console.error("fulfillDepositTransaction transaction failed:", err);
    throw err;
  }
}

export async function createWithdrawalRequest(uid: string, withdrawalData: any) {
  try {
    await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const userSnap = await transaction.get(userRef);
      
      if (!userSnap.exists()) {
        throw new Error("المستخدم غير موجود");
      }
      
      const currentBalance = userSnap.data()?.ucBalance || 0;
      if (currentBalance < withdrawalData.amount) {
        throw new Error("رصيدك الحالي غير كافٍ لإتمام السحب");
      }

      // 1. Debit the user's balance transactionally
      transaction.update(userRef, {
        ucBalance: increment(-withdrawalData.amount)
      });

      // 2. Create withdrawal record transactionally
      const withdrawalRef = doc(db, 'withdrawals', withdrawalData.id);
      transaction.set(withdrawalRef, {
        ...withdrawalData,
        status: 'قيد المعالجة',
        createdAt: new Date().toISOString()
      });
    });

    console.log(`Successfully completed transactional withdrawal request of ${withdrawalData.amount} UC for user ${uid}`);
  } catch (err) {
    console.error("createWithdrawalRequest transaction failed:", err);
    throw err;
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

/**
 * Adds a deposit (invoice) record to the database with strict type enforcement.
 * Converts potentially stringified numerical inputs to actual numbers.
 */
export async function addDeposit(depositData: {
  orderId: string;
  uid: string;
  username: string;
  email: string;
  service: string;
  amount: string | number;
  currency: 'USD' | 'SYP';
  qty: string | number;
  paymentMethod: string;
  bonusQty?: string | number;
  pid?: string;
  [key: string]: any;
}) {
  try {
    const depositRef = doc(db, 'invoices', depositData.orderId);
    
    const parsedAmount = typeof depositData.amount === 'string' ? parseFloat(depositData.amount) : depositData.amount;
    const parsedQty = typeof depositData.qty === 'string' ? parseInt(depositData.qty, 10) : depositData.qty;
    const parsedBonusQty = depositData.bonusQty !== undefined 
      ? (typeof depositData.bonusQty === 'string' ? parseInt(depositData.bonusQty, 10) : depositData.bonusQty) 
      : 0;

    const sanitizedData = {
      ...depositData,
      amount: isNaN(parsedAmount) ? 0 : parsedAmount,
      qty: isNaN(parsedQty) ? 0 : parsedQty,
      bonusQty: isNaN(parsedBonusQty) ? 0 : parsedBonusQty,
      status: depositData.status || 'paid',
      date: depositData.date || new Date().toISOString(),
      credited: depositData.credited || false
    };

    await setDoc(depositRef, sanitizedData);
    console.log(`[Database Sync] Successfully stored deposit ${depositData.orderId} with typed schemas.`);
    return { success: true, orderId: depositData.orderId };
  } catch (err: any) {
    console.error("[Database Sync] Error registering deposit:", err);
    throw err;
  }
}

/**
 * Updates a user's wallet balance (UC points or currency balance) with strict type conversion.
 * Leverages an atomic Firestore transaction to prevent race conditions.
 */
export async function updateWalletBalance(uid: string, additionAmount: string | number) {
  try {
    const parsedAmount = typeof additionAmount === 'string' ? parseFloat(additionAmount) : additionAmount;
    if (isNaN(parsedAmount)) {
      throw new Error("Invalid numeric value provided for wallet balance increment.");
    }

    const userRef = doc(db, 'users', uid);
    
    // Execute atomic update
    await runTransaction(db, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists()) {
        throw new Error(`User with UID ${uid} does not exist in the database.`);
      }

      const currentBalance = Number(userSnap.data()?.ucBalance || 0);
      const newBalance = currentBalance + parsedAmount;
      const currentLifetime = Number(userSnap.data()?.lifetimeAccumulatedUC || 0);
      const newLifetime = currentLifetime + (parsedAmount > 0 ? parsedAmount : 0);

      transaction.update(userRef, {
        ucBalance: newBalance,
        lifetimeAccumulatedUC: newLifetime
      });
    });

    console.log(`[Database Sync] Transaction complete. Updated wallet of UID ${uid} by ${parsedAmount}.`);
    return { success: true };
  } catch (err) {
    console.error("[Database Sync] Error executing atomic updateWalletBalance:", err);
    throw err;
  }
}

/**
 * Sets the global exchange rate securely in Firestore under `settings/global`.
 * Ensures the value is treated strictly as a floating-point number.
 */
export async function setExchangeRate(newRate: string | number) {
  try {
    const parsedRate = typeof newRate === 'string' ? parseFloat(newRate) : newRate;
    if (isNaN(parsedRate) || parsedRate <= 0) {
      throw new Error("Invalid exchange rate value. Must be a number greater than 0.");
    }

    const settingsRef = doc(db, 'settings', 'global');
    await setDoc(settingsRef, {
      exchangeRate: parsedRate
    }, { merge: true });

    // Trigger internal application event notification
    window.dispatchEvent(new Event('exchangeRateChange'));
    window.dispatchEvent(new Event('currencyChange'));

    console.log(`[Database Sync] Securely set exchange rate to ${parsedRate}.`);
    return { success: true, exchangeRate: parsedRate };
  } catch (err) {
    console.error("[Database Sync] Error updating exchange rate in Firestore:", err);
    throw err;
  }
}


