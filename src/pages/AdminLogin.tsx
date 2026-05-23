import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export default function AdminLogin() {
  const adminEmails = ["wsh020264@gmail.com", "mohammadali1997mo@gmail.com"];
  const [email, setEmail] = useState('wsh020264@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isConfigError, setIsConfigError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminAuthSuccess = async (userEmail: string | null, uid?: string) => {
    const ownerEmails = ["wsh020264@gmail.com", "mohammadali1997mo@gmail.com"];
    
    if (!userEmail) {
      setError('البريد الإلكتروني مطلوب');
      return;
    }

    if (ownerEmails.includes(userEmail)) {
      navigate('/admin');
      return;
    }

    // Check Firestore for admin status (Dynamic Admins)
    try {
      setLoading(true);
      // 1. Check by UID if logged in
      if (uid) {
        const adminDoc = await getDoc(doc(db, 'admins', uid));
        if (adminDoc.exists()) {
          navigate('/admin');
          return;
        }
      }

      // 2. Check by Email (in case invited but UID not updated yet)
      const adminDocEmail = await getDoc(doc(db, 'admins', userEmail));
      if (adminDocEmail.exists()) {
        const data = adminDocEmail.data();
        // If found by email but it doesn't have the UID, update it
        if (uid && data.uid !== uid) {
          await setDoc(doc(db, 'admins', uid), {
            ...data,
            uid: uid
          });
          // Clean up the email-indexed doc if it was different
          if (userEmail !== uid) {
             await deleteDoc(doc(db, 'admins', userEmail));
          }
        }
        navigate('/admin');
        return;
      }

      setError('غير مسموح لهذا الحساب بالدخول كمسؤول');
      await signOut(auth);
    } catch (err) {
      console.error("Admin check failed", err);
      setError('حدث خطأ أثناء التحقق من صلاحيات المشرف');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await handleAdminAuthSuccess(result.user.email, result.user.uid);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      if (err.code === 'auth/popup-blocked') {
        setError('تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة في إعدادات متصفحك وإعادة المحاولة.');
        return;
      }
      console.error(err);
      setError('فشل تسجيل الدخول عبر Google');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsConfigError(false);

    try {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleAdminAuthSuccess(userCredential.user.email, userCredential.user.uid);
      } catch (signInErr: any) {
        if (signInErr.code === 'auth/operation-not-allowed') {
          setIsConfigError(true);
          setError('خدمة البريد الإلكتروني غير مفعلة في Firebase Console.');
          return;
        }

        // Try creating account if it doesn't exist (Lazy Admin Creation)
        const ownerEmails = ["wsh020264@gmail.com", "mohammadali1997mo@gmail.com"];
        if (ownerEmails.includes(email) && password === '123123qwe' && (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/wrong-password')) {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await handleAdminAuthSuccess(userCredential.user.email, userCredential.user.uid);
          } catch (signUpErr: any) {
            if (signUpErr.code === 'auth/operation-not-allowed') {
              setIsConfigError(true);
              setError('خدمة البريد الإلكتروني غير مفعلة في Firebase Console.');
            } else {
              setError('بيانات الدخول غير صحيحة');
            }
          }
        } else {
          // Check if this email IS in the admins collection as a pending invite
          try {
             const adminDoc = await getDoc(doc(db, 'admins', email));
             if (adminDoc.exists() && password === '123123qwe') {
               const userCredential = await createUserWithEmailAndPassword(auth, email, password);
               await handleAdminAuthSuccess(userCredential.user.email, userCredential.user.uid);
               return;
             }
          } catch (e) {}
          
          setError('بيانات الدخول غير صحيحة');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-600/40 rotate-12">
            <Lock className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black gradient-text">لوحة التحكم</h1>
          <p className="text-white/40 mt-2">تسجيل الدخول للمسؤولين فقط</p>
        </div>

        <div className="card-glass p-8 rounded-[2.5rem] border-white/10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-white/70 mb-2 mr-1 text-sm">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white focus:outline-none focus:border-purple-500 transition-all font-mono"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <div className="text-white">
              <label className="block text-white/70 mb-2 mr-1 text-sm">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white focus:outline-none focus:border-purple-500 transition-all font-mono"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-center gap-3 text-sm"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}

            {isConfigError && (
              <div className="bg-blue-500/10 border border-blue-500/20 text-blue-300 p-4 rounded-xl text-[10px] md:text-xs leading-relaxed">
                <div className="flex items-center gap-2 mb-2 font-bold">
                  <Info size={14} />
                  تنبيه للمسؤول:
                </div>
                يجب تفعيل <b>Email/Password</b> في إعدادات الأمان بـ Firebase Console.
                <br />
                يمكنك بدلاً من ذلك استخدام زر <b>Google</b> إذا كان حسابك هو البريد المطلوب.
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-purple-600/20 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck size={22} />
                  دخول بالكلمة السرية
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0a0a0c] px-4 text-white/20">أو عبر الهوية الرقمية</span></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold transition-all hover:bg-gray-200 flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            الدخول عبر Google
          </button>

          <button 
            onClick={() => navigate('/')}
            className="w-full mt-8 text-white/40 hover:text-white transition-all flex items-center justify-center gap-2 text-sm"
          >
            العودة للمتجر
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
