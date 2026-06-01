import { Rocket, Gamepad, MessageSquare, Megaphone, Users, Search, LogIn, User, ShieldCheck, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { auth, onAuthStateChanged, signOut } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { logUser, trackSectionVisit } from "../lib/db";

import { formatPrice, getCurrency } from "../lib/currency";

export default function Home() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState<'USD' | 'SYP'>(getCurrency());
  const [showUnauthorizedAlert, setShowUnauthorizedAlert] = useState(false);

  const toggleCurrency = () => {
    const newCurrency = currency === 'USD' ? 'SYP' : 'USD';
    setCurrency(newCurrency);
    localStorage.setItem('wsimCurrency', newCurrency);
    window.dispatchEvent(new Event('currencyChange'));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "unauthorized") {
      setShowUnauthorizedAlert(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      const timer = setTimeout(() => {
        setShowUnauthorizedAlert(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  const [userBalance, setUserBalance] = useState<number>(0);
  const [userCode, setUserCode] = useState<string>('');

  useEffect(() => {
    const handleCurrencyChange = () => setCurrency(getCurrency());
    window.addEventListener('currencyChange', handleCurrencyChange);
    
    let unsubUserDoc: (() => void) | null = null;
    
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          const { db } = await import("../lib/firebase");
          const { doc, onSnapshot } = await import("firebase/firestore");
          
          if (unsubUserDoc) unsubUserDoc();
          unsubUserDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setUserBalance(data.ucBalance || 0);
              setUserCode(data.referralCode || '');
              localStorage.setItem('wsimCode', data.referralCode || '');
            }
          });
        } catch (err) {
          console.error("Could not listen to user doc:", err);
        }

        localStorage.setItem("wsimUser", JSON.stringify({
          name: user.displayName,
          email: user.email,
          uid: user.uid
        }));
        logUser(user);
      } else {
        setCurrentUser(null);
        setUserBalance(0);
        setUserCode('');
        if (unsubUserDoc) {
          unsubUserDoc();
          unsubUserDoc = null;
        }
        localStorage.removeItem("wsimUser");
        localStorage.removeItem("wsimCode");
      }
    });

    return () => {
      window.removeEventListener('currencyChange', handleCurrencyChange);
      unsubAuth();
      if (unsubUserDoc) unsubUserDoc();
    };
  }, []);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const sections = [
    { title: "شحن شدات الألعاب", path: "/games", icon: <Gamepad />, desc: "ببجي، فري فاير، كول أوف ديوتي وأكثر من 30 لعبة", color: "from-blue-400 to-blue-600" },
    { title: "تطبيقات الدردشة", path: "/soul-shell", icon: <MessageSquare />, desc: "سول شيل، بيجو، لايكي وأكثر من 100 تطبيق دردشة", color: "from-green-400 to-green-600" },
    { title: "تمويل حملات سوشيال ميديا", path: "/social-services", icon: <Megaphone />, desc: "تمويل كامل لحملاتك الإعلانية على جميع المنصات", color: "from-purple-400 to-purple-600" },
    { title: "دعم على منصات سوشيال ميديا", path: "/social-services", icon: <Users />, desc: "تيك توك، إنستغرام، تويتر، سناب شات، يوتيوب", color: "from-pink-400 to-pink-600" },
  ];

  const handleSectionClick = (section: any) => {
    trackSectionVisit(section.title);
    navigate(section.path);
  };

  const filteredSections = sections.filter(s => s.title.includes(search));

  return (
    <div className="min-h-screen relative">
      {/* Dynamic Unauthorized Access Banner */}
      {showUnauthorizedAlert && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-md px-4">
          <motion.div 
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-red-950/90 backdrop-blur-md border border-red-500/40 text-red-200 p-5 rounded-2xl flex items-center justify-between gap-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-right">
              <div className="bg-red-500/10 p-2 rounded-xl text-red-400 shrink-0">
                <ShieldCheck size={24} className="text-red-500" />
              </div>
              <div className="font-sans">
                <p className="font-extrabold text-sm text-red-400">محاولة دخول غير مصرحة</p>
                <p className="text-xs opacity-80 mt-1">عذراً، هذا الحساب لا يملك صلاحيات الوصول إلى لوحة تحكم المسؤول.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowUnauthorizedAlert(false)}
              className="text-red-400 hover:text-red-200 transition-colors shrink-0 p-1"
            >
              <X size={18} />
            </button>
          </motion.div>
        </div>
      )}

      <header className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-6">
            <div className="text-center flex-1 w-full">
              <motion.h1 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-4xl md:text-6xl font-bold gradient-text mb-4"
              >
                وسيم ستور
              </motion.h1>

              {/* Beautiful Quranic Scrolling Ticker */}
              <div className="w-full max-w-3xl mx-auto my-4 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/60 to-emerald-950/40 border border-emerald-500/30 py-3 px-3 md:px-6 shadow-lg shadow-emerald-900/15 relative">
                <div className="whitespace-nowrap animate-marquee font-quran text-base sm:text-lg md:text-2xl text-emerald-300 tracking-wide font-medium select-none">
                  ✨ ﴿ وَفِي السَّمَاءِ رِزْقُكُمْ وَمَا تُوعَدُونَ * فَوَرَبِّ السَّمَاءِ وَالْأَرْضِ إِنَّهُ لَحَقٌّ مِّثْلَ مَا أَنَّكُمْ تَنطِقُونَ ﴾ ✨
                </div>
              </div>

              <p className="text-white/80 text-sm md:text-lg">منصتك الموثوقة لجميع خدمات الشحن والتمويل</p>
            </div>
            <div className="flex w-full md:w-auto justify-between md:justify-end gap-4 items-center">
              <button 
                onClick={toggleCurrency}
                className="bg-white/5 border border-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all text-xs font-bold flex items-center gap-2"
              >
                {currency === 'USD' ? '🇺🇸 Dollar' : '🇸🇾 ليرة سورية'}
              </button>
              {currentUser ? (
                <div className="flex flex-col items-end gap-1.5 font-sans">
                  <button 
                    onClick={() => navigate('/profile')}
                    className="bg-gradient-to-r from-amber-500/10 to-yellow-600/10 border border-amber-500/30 text-amber-400 px-6 py-2 rounded-xl hover:border-amber-500/60 transition-all flex items-center gap-2 font-black shadow-lg shadow-amber-500/5 active:scale-95 text-xs sm:text-sm md:text-base whitespace-nowrap"
                  >
                    <User size={18} className="text-amber-400" />
                    <span>حسابي الشخصي</span>
                  </button>
                  <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-500/20 px-2 py-0.5 rounded-lg shrink-0">
                    <span className="text-[10px] text-amber-200">رصيد محفظتي:</span>
                    <span className="text-amber-400 font-mono text-[11px] sm:text-xs font-black">{formatPrice(userBalance, currency)}</span>
                  </div>
                  <div className="flex items-center gap-2 px-2 shrink-0 opacity-70">
                    <span className="text-[9px] text-white/40 uppercase tracking-tighter">الكود:</span>
                    <span className="text-blue-400 font-mono text-[11px] font-bold">{userCode || localStorage.getItem('wsimCode') || '...'}</span>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all flex items-center gap-2 text-xs sm:text-sm md:text-base whitespace-nowrap"
                >
                  <LogIn size={18} />
                  تسجيل الدخول
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto mb-12">
          <div className="relative">
            <input 
              type="text" 
              placeholder="ابحث في الأقسام..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full bg-white/10 border border-white/20 text-white placeholder-white/60 px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            />
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredSections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => handleSectionClick(section)}
              className="card-glass rounded-3xl p-8 hover:scale-105 hover:-translate-y-2 transition-all cursor-pointer group"
            >
              <div className="text-center">
                <div className={`w-20 h-20 bg-gradient-to-br ${section.color} rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform`}>
                  <div className="text-white text-3xl">
                    {section.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{section.title}</h3>
                <p className="text-white/70 text-sm mb-6">{section.desc}</p>
                <div className={`bg-gradient-to-r ${section.color} text-white px-6 py-2 rounded-xl font-bold transform transition-all group-hover:scale-105 inline-block`}>
                  اذهب الآن
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-20">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-12 py-5 rounded-3xl font-bold text-xl shadow-2xl shadow-blue-500/25"
          >
            <Rocket className="inline-block ml-2 w-6 h-6" />
            ابدأ الآن
          </motion.button>
        </div>
      </main>

      <footer className="py-12 mt-20 opacity-60 text-center">
        <p>© 2026 وسيم ستور. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
