import React, { useState } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Lock, Mail, ArrowRight, User, AlertCircle, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [isConfigError, setIsConfigError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      console.error("Google sign in failed:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setIsConfigError(true);
        setError('خدمة تسجيل الدخول بـ Google غير مفعلة في كونسول Firebase.');
      } else if (err.code === 'auth/popup-blocked' || err.message?.includes('iframe') || err.message?.includes('popup')) {
        setError('تم حظر النافذة المنبثقة من قبل المتصفح أو إطار المعاينة. يرجى فتح المتجر في نافذة مستقلة أولاً لتسجيل الدخول عبر Google بشكل حقيقي، أو تسجيل الدخول يدويًا بالبريد وكلمة المرور.');
      } else {
        setError('فشل تسجيل الدخول عبر Google. يرجى المراجعة والتأكد من تفعيل Google Auth في مشروعك.');
      }
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
      if (isSignUp) {
        // Create user with Email
        await createUserWithEmailAndPassword(auth, email, password);
        navigate('/');
      } else {
        // Sign in with Email
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setIsConfigError(true);
        setError('خدمة تسجيل الدخول بالبريد الإلكتروني غير مفعلة في كونسول Firebase.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول بدلاً من ذلك.');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة جداً! يجب أن تتكون من 6 أحرف على الأقل.');
      } else if (err.code === 'auth/invalid-email') {
        setError('البريد الإلكتروني المدخل غير صالح.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('بيانات الدخول غير صحيحة، يرجى التحقق من البريد وكلمة المرور.');
      } else {
        setError(err.message || 'حدث خطأ أثناء الاتصال بالخادم.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0c]">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-600/40 rotate-12">
            <User className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black gradient-text">
            {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
          </h1>
          <p className="text-white/40 mt-2">مرحباً بك في وسيم ستور</p>
        </div>

        <div className="card-glass p-8 rounded-[2.5rem] border-white/10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-white/70 mb-2 mr-1 text-sm text-right">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white focus:outline-none focus:border-blue-500 transition-all text-right"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-white/70 mb-2 mr-1 text-sm text-right">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pr-12 pl-4 text-white focus:outline-none focus:border-blue-500 transition-all text-right"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl flex items-center justify-end gap-3 text-sm text-right"
              >
                <span>{error}</span>
                <AlertCircle size={18} />
              </motion.div>
            )}

            {isConfigError && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="bg-blue-600/10 border border-blue-500/20 text-blue-200 p-4 rounded-xl text-right leading-relaxed text-xs space-y-2"
              >
                <div className="font-bold flex items-center justify-end gap-2 text-blue-400">
                  <span>المطور: يرجى تفعيل الـ Authentication في Firebase</span>
                  <AlertCircle size={16} />
                </div>
                <p>
                  الدخول السلس للمتجر يتطلب تفعيل خيارات الاتصال في لوحة Firebase:
                </p>
                <ol className="list-decimal list-inside space-y-1 mr-2 text-white/70 dir-rtl text-right">
                  <li>افتح <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="underline text-blue-400 font-bold">Firebase Console</a> واختر مشروعك.</li>
                  <li>من القائمة الجانبية، اذهب إلى <b>Authentication</b>.</li>
                  <li>اضغط على تبويب <b>Sign-in method</b> ثم <b>Add new provider</b>.</li>
                  <li>قم بتفعيل <b>Email/Password</b> و <b>Google</b> وثم اضغط <b>Save (حفظ)</b>.</li>
                </ol>
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 py-5 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 text-white"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isSignUp ? 'إنشاء حساب وتسجيل الدخول' : 'دخول'}
                  <ArrowRight size={22} className="rotate-180" />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-blue-400 hover:text-blue-300 font-bold text-sm transition-all underline"
            >
              {isSignUp ? 'لديك حساب بالفعل؟ سجل الدخول الآن' : 'ليس لديك حساب؟ اضغط هنا لإنشاء حساب جديد'}
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#111115] px-4 text-white/20">أو عبر</span></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold transition-all hover:bg-gray-200 flex items-center justify-center gap-3 cursor-pointer"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Sign in with Google (دخول حقيقي)
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
