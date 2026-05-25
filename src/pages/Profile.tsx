import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, signOut } from "../lib/firebase";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { motion } from "motion/react";
import { 
  User, 
  Mail, 
  ShoppingBag, 
  Clock, 
  ArrowRight, 
  LogOut, 
  CreditCard, 
  Gamepad2, 
  Ticket,
  Percent,
  Compass,
  LayoutGrid,
  Wallet,
  Send,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  QrCode,
  UploadCloud,
  Check,
  Bell,
  Copy,
  Gift,
  Trophy,
  Calculator,
  HelpCircle,
  Share2,
  RefreshCw,
  Download,
  Printer
} from "lucide-react";
import { formatPrice, getExchangeRate } from "../lib/currency";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);

  // UC Wallet stats
  const [ucBalance, setUcBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawPlayerId, setWithdrawPlayerId] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState("");

  // Sham Cash states
  const [depositAmount, setDepositAmount] = useState("1000");
  const [depositTx, setDepositTx] = useState("");
  const [depositReceiptFile, setDepositReceiptFile] = useState<File | null>(null);
  const [depositReceiptName, setDepositReceiptName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [depositSuccess, setDepositSuccess] = useState("");

  // Advanced features state hooks
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [isPromoApplied, setIsPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  const [isVerifyingId, setIsVerifyingId] = useState(false);
  const [verifiedPlayerName, setVerifiedPlayerName] = useState("");

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [calcAmount, setCalcAmount] = useState("1000");
  const [calcCurrency, setCalcCurrency] = useState("SYP");
  const [exchangeRateTrigger, setExchangeRateTrigger] = useState(0);

  useEffect(() => {
    const handleExchangeRateChange = () => {
      setExchangeRateTrigger(prev => prev + 1);
    };
    window.addEventListener('currencyChange', handleExchangeRateChange);
    window.addEventListener('exchangeRateChange', handleExchangeRateChange);
    return () => {
      window.removeEventListener('currencyChange', handleExchangeRateChange);
      window.removeEventListener('exchangeRateChange', handleExchangeRateChange);
    };
  }, []);

  const [saveIdCheckbox, setSaveIdCheckbox] = useState(true);
  const [savedPlayerId, setSavedPlayerId] = useState("");

  const [selectedReceiptDoc, setSelectedReceiptDoc] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [copiedWalletCode, setCopiedWalletCode] = useState(false);

  const [lifetimeAccumulatedUC, setLifetimeAccumulatedUC] = useState<number>(0);
  const [balanceFlash, setBalanceFlash] = useState(false);
  const prevBalanceRef = React.useRef(0);

  // Authentication Observer
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((currentUser) => {
      setAuthChecking(false);
      if (currentUser) {
        setUser(currentUser);
      } else {
        // Redirection if guest
        navigate("/login");
      }
    });
    return () => unsub();
  }, [navigate]);

  // Real-time user profile data (to load dynamic balance, lifetime accumulated UC/points and savedPlayerId)
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUcBalance(data?.ucBalance || 0);
        setSavedPlayerId(data?.savedPlayerId || "");
        setLifetimeAccumulatedUC(data?.lifetimeAccumulatedUC || 0);
      } else {
        setUcBalance(0);
        setSavedPlayerId("");
        setLifetimeAccumulatedUC(0);
      }
    }, (err) => {
      console.error("Error loading user profile balance:", err);
    });

    return () => unsub();
  }, [user]);

  // Handle wallet balance flashing when it increases
  useEffect(() => {
    if (ucBalance > prevBalanceRef.current) {
      if (prevBalanceRef.current !== 0) { // only flash on actual increases, not first load
        setBalanceFlash(true);
        const timer = setTimeout(() => setBalanceFlash(false), 2000);
        prevBalanceRef.current = ucBalance;
        return () => clearTimeout(timer);
      }
    }
    prevBalanceRef.current = ucBalance;
  }, [ucBalance]);

  // Real-time listener for user notifications
  useEffect(() => {
    if (!user) return;

    const qNotifications = query(
      collection(db, "notifications"),
      where("uid", "==", user.uid)
    );

    const unsub = onSnapshot(qNotifications, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setNotifications(list);
    }, (err) => {
      console.warn("Notifications listener error:", err);
    });

    return () => unsub();
  }, [user]);

  // Real-time learner for user withdrawals
  useEffect(() => {
    if (!user) return;

    const withdrawalsQuery = query(
      collection(db, "withdrawals"), 
      where("uid", "==", user.uid)
    );

    const unsub = onSnapshot(withdrawalsQuery, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
      docs.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setWithdrawals(docs);
    }, (err) => {
      console.error("Error fetching user withdrawals:", err);
    });

    return () => unsub();
  }, [user]);

  // Real-time listener for User's invoices
  useEffect(() => {
    if (!user) return;

    const invoicesQuery = query(
      collection(db, "invoices"), 
      where("uid", "==", user.uid)
    );

    const unsub = onSnapshot(invoicesQuery, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
      // Sort in-memory to bypass composite index creation requirement in Firestore
      docs.sort((a: any, b: any) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
      setInvoices(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching patient invoices: ", err);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center text-white font-sans" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-white/60 text-sm">جاري التحقق من أمن الجلسة...</p>
        </div>
      </div>
    );
  }

  // Compute metrics dynamically from the live invoices state list in real-time
  const totalInvoicesCount = invoices.length;
  const pendingCount = invoices.filter(inv => inv.status === "قيد المعالجة").length;
  const completedCount = invoices.filter(inv => inv.status === "تم الشحن" || inv.status === "مكتمل" || inv.status === "تم الدفع").length;

  // sum spent of completed transactions
  const totalSpent = invoices
    .filter(inv => inv.status === "تم الشحن" || inv.status === "مكتمل" || inv.status === "تم الدفع")
    .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  const referralCode = localStorage.getItem("wsimCode") || "غير متوفر";

  // VIP Tier calculation based on life-time accumulated UC/points
  const getVIPTier = () => {
    if (lifetimeAccumulatedUC >= 20000) return { title: "بلاتيني VIP Diamond", color: "from-purple-500 to-indigo-500", text: "text-purple-300", badge: "💎", nextTier: "نهاية المستويات", nextReq: 0 };
    if (lifetimeAccumulatedUC >= 5000) return { title: "ذهبي VIP Gold", color: "from-amber-500 to-yellow-500", text: "text-amber-300", badge: "👑", nextTier: "البلاتيني", nextReq: 20000 };
    if (lifetimeAccumulatedUC >= 1000) return { title: "فضي VIP Silver", color: "from-slate-400 to-slate-200", text: "text-slate-300", badge: "🛡️", nextTier: "الذهبي", nextReq: 5000 };
    return { title: "برونزي VIP Bronze", color: "from-amber-700 to-amber-600", text: "text-amber-600/80", badge: "🥉", nextTier: "الفضي", nextReq: 1000 };
  };

  const currentTier = getVIPTier();

  // 1. Promo Code Validation System
  const handleApplyPromoCode = () => {
    setPromoError("");
    setPromoSuccess("");
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      setPromoError("يرجى إدخال الرمز الترويجي أولاً.");
      return;
    }
    if (code === "WASEEM2026") {
      setIsPromoApplied(true);
      setPromoSuccess("✓ تم تطبيق كود الخصم الشاحن بنجاح! بونص +10% إضافي مُفعّل مع تعبئة رصيدك.");
    } else if (code === "SPIN5") {
      setIsPromoApplied(true);
      setPromoSuccess("✓ تم تطبيق رمز عجلة الحظ! بونص +5% إضافي مُفعّل مع تعبئة رصيدك.");
    } else {
      setPromoError("رمز ترويجي غير صالح أو منتهي الصلاحية.");
    }
  };

  // 2. Player ID Validator Visual Simulation
  const handleVerifyPlayerId = async () => {
    if (!withdrawPlayerId.trim()) {
      alert("يرجى إدخال آيدي اللاعب أولاً لبدء الفحص والتحقق.");
      return;
    }
    setIsVerifyingId(true);
    setVerifiedPlayerName("");

    setTimeout(() => {
      setIsVerifyingId(false);
      const usernames = [
        "WSIM_HERO_PUBG",
        "AL_KASER_YT",
        "SYRIAN_BEAST",
        "PUBG_TERMINATOR",
        "WSIM_ST_VIP_1",
        "NIGHTMARE_99",
        "ARABIC_LEGEND"
      ];
      const randomUser = usernames[Math.floor(Math.random() * usernames.length)];
      setVerifiedPlayerName(`${randomUser} (ID: ${withdrawPlayerId.trim()})`);
    }, 1500);
  };



  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError("");
    setWithdrawSuccess("");

    if (!withdrawPlayerId.trim()) {
      setWithdrawError("يرجى إدخال آيدي اللاعب المستلم.");
      return;
    }

    const amountNum = parseInt(withdrawAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setWithdrawError("يرجى تحديد كمية سحب صالحة وأكبر من الصفر.");
      return;
    }

    if (amountNum > ucBalance) {
      setWithdrawError("عذراً، الرصيد الحالي المتوفر بمحفظتك غير كافٍ لإجراء هذا السحب.");
      return;
    }

    setIsWithdrawing(true);

    try {
      const { createWithdrawalRequest } = await import("../lib/db");
      
      const withdrawalId = "WITHDRAW-" + Math.floor(100000 + Math.random() * 900000);
      const withdrawalData = {
        id: withdrawalId,
        uid: user.uid,
        userName: user.displayName || user.email?.split('@')[0] || "مستكشف وسيم",
        userEmail: user.email,
        playerId: withdrawPlayerId.trim(),
        amount: amountNum,
        playerName: verifiedPlayerName ? verifiedPlayerName.split(' ')[0] : "فحص تلقائي مقبول",
        status: "قيد المعالجة",
        createdAt: new Date().toISOString()
      };

      await createWithdrawalRequest(user.uid, withdrawalData);

      // 4. Quick ID Saver
      if (saveIdCheckbox) {
        const { updateDoc: updateFirestoreDoc, doc: firestoreDoc } = await import("firebase/firestore");
        await updateFirestoreDoc(firestoreDoc(db, "users", user.uid), {
          savedPlayerId: withdrawPlayerId.trim()
        });
      }

      setWithdrawSuccess(`تم شحن رصيدك بنجاح! تم تقديم طلب سحب بقيمة ${amountNum} شدة إلى آيدي اللاعب ${withdrawPlayerId.trim()} وسيعالجه الدعم الفني فوراً.`);
      setWithdrawAmount("");
    } catch (err: any) {
      setWithdrawError(err.message || "عذراً، حدث خطأ أثناء الاتصال بمحفظة وسيم الكارد.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError("");
    setDepositSuccess("");

    const amountNum = parseInt(depositAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      setDepositError("يرجى تحديد كمية شدات صحيحة للتحويل.");
      return;
    }

    setIsDepositing(true);

    try {
      const topupId = "SHAM-" + Math.floor(100000 + Math.random() * 900000);
      
      const bonusPct = isPromoApplied ? (promoCodeInput.trim().toUpperCase() === "WASEEM2026" ? 10 : 5) : 0;
      const bonusQty = Math.floor(amountNum * (bonusPct / 100));

      const invoiceData = {
        id: topupId,
        orderId: topupId,
        service: `إيداع رصيد محفظة وسيم: +${amountNum} UC` + (bonusQty > 0 ? ` (+${bonusQty} UC بونص كود)` : ""),
        amount: "0.01", // Nominal price
        currency: "USD",
        qty: amountNum.toString(),
        bonusQty: bonusQty.toString(),
        appliedPromo: isPromoApplied ? promoCodeInput.trim().toUpperCase() : "",
        pid: "شام كاش - التحقق الفوري",
        playerId: depositTx.trim() || "لم يكتب الرقم المرجعي",
        playerName: depositReceiptFile ? `مستند: ${depositReceiptName}` : "لا يوجد مستند مرفق",
        status: "قيد المعالجة",
        paymentMethod: "شام كاش - إيداع محفظة يدوي",
        userName: user.displayName || user.email?.split('@')[0] || "مستكشف وسيم",
        userEmail: user.email,
        uid: user?.uid || "",
        date: new Date().toISOString()
      };

      const { doc: firestoreDoc, setDoc } = await import("firebase/firestore");
      const ref = firestoreDoc(db, "invoices", topupId);
      await setDoc(ref, invoiceData);

      setDepositSuccess(`تم إرسال طلب تأكيد إيداع ${amountNum} شدة بمحفظتك بنجاح! جاري مراجعة لقطة شاشة التحويل من قبل الدعم الفني فوراً وتعبئة رصيدك.`);
      setDepositTx("");
      setDepositReceiptFile(null);
      setDepositReceiptName("");
      setPromoCodeInput("");
      setIsPromoApplied(false);
    } catch (err: any) {
      console.error(err);
      setDepositError("فشل تقديم طلب شحن الإيداع. تأكد من اتصال الإنترنت وحاول مجدداً.");
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col justify-between font-sans" dir="rtl">
      {/* Header bar */}
      <header className="border-b border-white/5 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* Notification Bell with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 flex items-center justify-center text-white"
              >
                <Bell size={18} className={notifications.some(n => !n.read) ? "animate-bounce" : ""} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-amber-500 text-white font-bold text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-zinc-950">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-lg text-right max-h-[380px] overflow-y-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-3">
                    <span className="font-extrabold text-white text-xs">إشعارات الحساب المباشرة ({notifications.length})</span>
                    <button 
                      onClick={async () => {
                        const { doc, updateDoc } = await import("firebase/firestore");
                        const unread = notifications.filter(n => !n.read);
                        for (const n of unread) {
                          await updateDoc(doc(db, "notifications", n.id), { read: true });
                        }
                      }}
                      className="text-[10px] text-amber-400 hover:underline hover:text-amber-300"
                    >
                      تعليم الكل كمقروء
                    </button>
                  </div>

                  <div className="space-y-2">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-white/40 text-xs">لا توجد إشعارات جديدة بمرجعك حالياً.</div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={async () => {
                            if (!n.read) {
                              const { doc, updateDoc } = await import("firebase/firestore");
                              await updateDoc(doc(db, "notifications", n.id), { read: true });
                            }
                          }}
                          className={`p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                            n.read 
                              ? "bg-black/10 border-white/5 text-white/50" 
                              : "bg-amber-500/10 border-amber-500/20 text-white"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-black text-amber-400">{n.title || "تنبيه المحفظة الكبرى"}</span>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>}
                          </div>
                          <p className="text-white/80 text-[11px] leading-relaxed">{n.message}</p>
                          <div className="text-[9px] text-white/30 text-left mt-1.5 font-mono">
                            {n.createdAt ? new Date(n.createdAt).toLocaleString("ar") : "منذ دقيقة"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => navigate("/")}
              id="back-to-home"
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl"
            >
              <ArrowRight size={18} className="text-amber-400" />
              <span>الرئيسية والمتجر</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">حسابي الشخصي</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* Main Body Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* User Side Information Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* User card profile */}
            <div className="card-glass bg-zinc-950/40 p-6 rounded-3xl border border-white/5 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-600" />
              
              <div className="w-24 h-24 bg-gradient-to-tr from-amber-500 to-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-950 font-black text-3xl shadow-lg shadow-amber-500/10">
                {user?.displayName ? user.displayName.substring(0,2).toUpperCase() : <User size={40} />}
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{user?.displayName || user?.email?.split('@')[0] || "مستكشف وسيم"}</h3>
              <p className="text-white/40 text-xs mb-4 select-all flex items-center justify-center gap-1.5">
                <Mail size={12} />
                {user?.email || "user@wsimstore.com"}
              </p>

              {/* VIP account indicator */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${currentTier.color} text-zinc-950 text-[11px] font-black mb-1 shadow-md shadow-white/5`}>
                <span>{currentTier.badge}</span>
                <span>{currentTier.title}</span>
              </div>
              <div className="text-[10px] text-white/50 mb-5 leading-relaxed">
                نقاط الحساب التراكمية المكتسبة: <span className="text-amber-400 font-mono font-bold">{lifetimeAccumulatedUC} UC</span>
                {currentTier.nextReq > 0 ? (
                  <>
                    <br />
                    <span>متبقي <strong className="text-white font-mono">{currentTier.nextReq - lifetimeAccumulatedUC} UC</strong> لترقية حسابك للمستوى <span className="text-amber-300 font-bold">{currentTier.nextTier}</span></span>
                  </>
                ) : (
                  <>
                    <br />
                    <span className="text-purple-400 font-bold">🎉 لقد وصلت للحد الأقصى لمستويات الـ VIP المميزة!</span>
                  </>
                )}
              </div>

              {/* Client Referral Code Widget */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-right space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-[11px] font-semibold flex items-center gap-1">
                    <Trophy size={12} className="text-amber-500 animate-pulse" />
                    نظام سوّق واربح (+10 UC)
                  </span>
                  <Ticket size={14} className="text-amber-400" />
                </div>
                <div className="text-lg font-mono font-black text-amber-400 select-all tracking-wide bg-black/40 px-3 py-2 rounded-xl text-center border border-amber-500/10">
                  {referralCode}
                </div>
                <div className="flex justify-between items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://wasimstore.com/register?ref=${referralCode}`);
                      alert("✓ تم نسخ الرابط التسويقي! شاركه مع أصدقائك.");
                    }}
                    className="flex-1 text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 py-1.5 rounded-lg font-bold border border-amber-500/5"
                  >
                    نسخ رابط الإحالة
                  </button>
                  <span className="text-[9px] text-white/40">10 شدات لكل صديق يسجل ويشحن</span>
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="w-full mt-4 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                <span>تسجيل الخروج من الحساب</span>
              </button>
            </div>



            {/* Quick Support Ticket / WhatsApp (قسم الدعم الفني السريع) */}
            <div className="card-glass bg-zinc-950/40 p-5 rounded-3xl border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 left-0 h-[1px] bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <HelpCircle size={15} className="text-emerald-400 animate-pulse" />
                  الدعم الفني السريع لـ وسيم ستور
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3 text-right space-y-1.5 mb-3 text-xs leading-relaxed text-emerald-300">
                <p>هل واجهتك مشكلة في الإيداع أو لم تصلك الشدات بعد؟ فريقنا الفني متواجد لمساعدتك وحل عقباتك مباشرة عبر واتساب.</p>
              </div>

              <a
                href={`https://wa.me/963943467444?text=${encodeURIComponent(
                  `مرحباً دعم وسيم ستور.\nلدي استفسار بخصوص حسابي بمتجر وسيم.\nالرقم التعريفي الخاص بي (UID): ${user?.uid || 'غير معروف'}\nالبريد الإلكتروني: ${user?.email || ''}\nالمشكلة:`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                <span className="font-extrabold">تواصل مع الدعم الفني عبر واتساب</span>
              </a>
            </div>

            {/* Micro metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-2xl text-center">
                <div className="text-2xl font-black text-white">{totalInvoicesCount}</div>
                <div className="text-[10px] text-white/40 mt-1">إجمالي الفواتير</div>
              </div>
              <div className="bg-zinc-950/40 border border-white/5 p-4 rounded-2xl text-center">
                <div className="text-2xl font-black text-amber-400">{pendingCount}</div>
                <div className="text-[10px] text-white/40 mt-1">قيد المعالجة</div>
              </div>
              <div className="bg-neutral-900/60 border border-white/5 p-4 rounded-2xl text-center">
                <div className="text-2xl font-black text-emerald-400">{completedCount}</div>
                <div className="text-[10px] text-white/40 mt-1">طلبات منفذة</div>
              </div>
            </div>
          </div>

          {/* User Packages & Recharge list */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Two-Column Responsive Layout Grid on Desktop */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              
              {/* Left/Main Side: UC Wallet Balance Card & Withdraw UC Form */}
              <div className="xl:col-span-7 space-y-6">
                <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-600/10 via-amber-500/5 to-yellow-600/10 p-6 md:p-8 shadow-2xl space-y-6">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
                  
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1.5 text-right">
                      <div className="flex items-center gap-2">
                        <Wallet size={24} className="text-amber-400" />
                        <h3 className="text-xl font-black text-white">محفظة وسيم ستور الذكية</h3>
                      </div>
                      <p className="text-white/50 text-xs">جمع شداتك، اسحبها لحسابك بالآيدي، أو دعها رصيداً جاهزاً لشحناتك القادمة.</p>
                    </div>
                    
                    {/* Glowing Balance Card */}
                    <div className={`border rounded-2xl px-6 py-4 flex flex-col items-center justify-center min-w-[160px] md:min-w-[180px] shadow-lg transition-all duration-500 select-none ${
                      balanceFlash 
                        ? "bg-emerald-500/20 border-emerald-500 shadow-emerald-500/20 scale-105 animate-pulse" 
                        : "bg-black/40 border-amber-500/30 shadow-amber-500/5 hover:border-amber-500/50"
                    }`}>
                      <span className={`text-[9px] md:text-[10px] uppercase tracking-wider font-bold transition-colors ${
                        balanceFlash ? "text-emerald-300" : "text-white/40"
                      }`}>رصيدك الحالي المعتمد</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className={`text-2xl md:text-3xl font-black font-mono tracking-tight transition-colors ${
                          balanceFlash ? "text-emerald-400" : "text-amber-400"
                        }`}>{ucBalance}</span>
                        <span className={`text-xs font-black transition-colors ${
                          balanceFlash ? "text-emerald-500" : "text-amber-500"
                        }`}>UC</span>
                      </div>
                    </div>
                  </div>

                  {/* Withdrawal Request Form */}
                  <div className="border-t border-white/5 pt-6">
                    <h4 className="font-extrabold text-base text-white mb-4 flex items-center gap-2">
                      <Send size={16} className="text-amber-400" />
                      <span>اسحب شداتك إلى اللعبة الآن</span>
                    </h4>

                    <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                      {withdrawError && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
                          <AlertCircle size={16} />
                          <span>{withdrawError}</span>
                        </div>
                      )}

                      {withdrawSuccess && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-2xl text-xs flex items-center gap-2">
                          <CheckCircle2 size={16} />
                          <span>{withdrawSuccess}</span>
                        </div>
                      )}

                      {/* Quick ID Saver Autofill Indicator */}
                      {savedPlayerId && (
                        <button 
                          type="button"
                          onClick={() => setWithdrawPlayerId(savedPlayerId)}
                          className="w-full text-right text-[11px] bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl cursor-pointer hover:bg-amber-500/15 transition-all text-amber-300 flex items-center gap-1.5"
                        >
                          <Sparkles size={11} className="animate-pulse" />
                          <span>💡 آيدي اللعبة المحفوظ: <strong className="font-mono">{savedPlayerId}</strong> (انقر للتعبئة والتجهيز الفوري)</span>
                        </button>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Player ID */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-white/60 text-xs block font-bold">آيدي اللاعب المستلم (Player ID)</label>
                            <button
                              type="button"
                              onClick={handleVerifyPlayerId}
                              disabled={isVerifyingId}
                              className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-bold bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-lg border border-amber-500/10"
                            >
                              {isVerifyingId ? (
                                <>
                                  <Loader2 size={10} className="animate-spin text-amber-400" />
                                  <span>جاري التحقق...</span>
                                </>
                              ) : (
                                <>
                                  <Check size={10} />
                                  <span>تحقق من الاسم</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="relative">
                            <input 
                              type="text" 
                              placeholder="مثال: 541092841"
                              value={withdrawPlayerId}
                              onChange={(e) => {
                                setWithdrawPlayerId(e.target.value);
                                setVerifiedPlayerName("");
                              }}
                              className="w-full rounded-xl bg-black/40 border border-white/10 text-white px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-amber-500/50 pr-10 text-right"
                            />
                            <Gamepad2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                          </div>
                          {verifiedPlayerName && (
                            <div className="mt-1 text-[11px] font-bold text-emerald-400 flex items-center gap-1 animate-pulse">
                              <CheckCircle2 size={12} />
                              <span>✓ تم التحقق بنجاح من اللاعب: {verifiedPlayerName}</span>
                            </div>
                          )}
                        </div>

                        {/* Amount to Withdraw */}
                        <div className="space-y-1">
                          <label className="text-white/60 text-xs block font-bold mb-1">الكمية المراد سحبها (UC)</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              placeholder="الحد الأدنى للسحب: 60"
                              value={withdrawAmount}
                              onChange={(e) => setWithdrawAmount(e.target.value)}
                              className="w-full rounded-xl bg-black/40 border border-white/10 text-white px-4 py-3 text-sm font-mono focus:outline-none focus:border-amber-500/50 pr-10 text-right"
                            />
                            <Wallet size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                          </div>
                        </div>
                      </div>

                      {/* Quick ID Saver checkbox toggle */}
                      <div className="flex items-center gap-2 pt-1">
                        <input 
                          type="checkbox" 
                          id="save-id-checkbox"
                          checked={saveIdCheckbox}
                          onChange={(e) => setSaveIdCheckbox(e.target.checked)}
                          className="w-4 h-4 rounded border-white/10 bg-black/40 text-amber-500 focus:ring-0 focus:ring-offset-0 focus:outline-none"
                        />
                        <label htmlFor="save-id-checkbox" className="text-[10.5px] text-white/50 cursor-pointer font-semibold hover:text-white/70 transition-colors">
                          حفظ هذا المعرّف (آيدي اللاعب) كمعلم دائم للشحن السريع مستقبلاً.
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                        <span className="text-[10px] text-white/40 flex items-center gap-1.5 self-start sm:self-center">
                          <Sparkles size={12} className="text-amber-400 animate-pulse" />
                          <span>يتم تنفيذ السحب الفوري بمصداقية عالية وخزينة وسيم ستور المباشرة.</span>
                        </span>
                        
                        <button
                          type="submit"
                          disabled={isWithdrawing}
                          className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-neutral-950 px-8 py-3.5 rounded-xl font-black text-sm transition-all hover:shadow-lg hover:shadow-amber-500/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 animate-pulse"
                        >
                          {isWithdrawing ? (
                            <>
                              <Loader2 size={16} className="animate-spin text-neutral-950" />
                              <span>جاري خصم الشدات والتقديم...</span>
                            </>
                          ) : (
                            <>
                              <ArrowUpRight size={18} />
                              <span>تأكيد سحب الشدات الفوري</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Withdrawals List Container with Interactive Progress Stepper */}
                  {withdrawals.length > 0 && (
                    <div className="border-t border-white/5 pt-6 space-y-3">
                      <h4 className="font-extrabold text-[13px] text-white/60">آخر طلبات السحب ومتابعة الشحن الفوري</h4>
                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {withdrawals.map((w) => (
                          <div key={w.id} className="bg-black/25 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start text-xs">
                              <div className="space-y-0.5 text-right">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-indigo-300">{w.amount} UC</span>
                                  <span className="text-[10px] text-white/30 font-mono tracking-wider">{w.id}</span>
                                </div>
                                <p className="text-white/50 text-[10.5px]">آيدي المستلم: <strong className="font-mono text-white/80 select-all">{w.playerId}</strong></p>
                              </div>

                              <span className="text-white/40 text-[9px] font-mono">{w.createdAt ? new Date(w.createdAt).toLocaleDateString('ar') + " " + new Date(w.createdAt).toLocaleTimeString('ar', {hour: '2-digit', minute:'2-digit'}) : "اليوم"}</span>
                            </div>

                            {/* visual 3-stage stepper line */}
                            <div className="pt-1">
                              <div className="flex items-center justify-between relative px-2">
                                {/* Track Line Background */}
                                <div className="absolute left-6 right-6 top-[10px] h-[2px] bg-white/5 z-0" />
                                
                                {/* Track Line Active Fill */}
                                <div 
                                  className="absolute left-6 top-[10px] h-[2px] bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500 transition-all duration-500 z-0" 
                                  style={{
                                    right: w.status === "تم الشحن" ? "24px" : w.status === "جاري الشحن" ? "50%" : "calc(100% - 24px)"
                                  }}
                                />

                                {/* Step 1: Received */}
                                <div className="flex flex-col items-center gap-1.5 z-10">
                                  <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center text-[8.5px] font-black border-2 transition-all ${
                                    w.status === "قيد المعالجة" || w.status === "جاري الشحن" || w.status === "تم الشحن"
                                      ? "bg-amber-500 border-zinc-950 text-zinc-950 shadow-lg shadow-amber-500/20" 
                                      : "bg-zinc-900 border-white/5 text-white/30"
                                  }`}>✓</div>
                                  <span className="text-[9.5px] font-bold text-amber-500 text-[10px]">استلام الطلب</span>
                                </div>

                                {/* Step 2: Processing */}
                                <div className="flex flex-col items-center gap-1.5 z-10">
                                  <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center text-[8.5px] font-black border-2 transition-all ${
                                    w.status === "جاري الشحن" || w.status === "تم الشحن"
                                      ? "bg-blue-500 border-zinc-950 text-neutral-900 shadow-lg shadow-blue-500/20" 
                                      : "bg-zinc-900 border-white/5 text-white/30"
                                  }`}>2</div>
                                  <span className={`text-[9.5px] font-bold ${w.status === "جاري الشحن" || w.status === "تم الشحن" ? "text-blue-400" : "text-white/30"} text-[10px]`}>المزامنة والتحويل</span>
                                </div>

                                {/* Step 3: Fulfilled */}
                                <div className="flex flex-col items-center gap-1.5 z-10">
                                  <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center text-[8.5px] font-black border-2 transition-all ${
                                    w.status === "تم الشحن"
                                      ? "bg-emerald-500 border-zinc-950 text-neutral-900 shadow-lg shadow-emerald-500/20" 
                                      : "bg-zinc-900 border-white/5 text-white/30"
                                  }`}>★</div>
                                  <span className={`text-[9.5px] font-bold ${w.status === "تم الشحن" ? "text-emerald-400 text-[10px]" : "text-white/30 text-[10px]"}`}>تم الشحن بنجاح</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dynamic UC Calculator card */}
                <div id="uc-calculator-widget" className="card-glass bg-zinc-950/40 p-6 rounded-3xl border border-white/5 relative overflow-hidden space-y-4 shadow-xl">
                  <div className="absolute top-0 right-0 left-0 h-[1.5px] bg-gradient-to-r from-amber-500 to-yellow-600" />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calculator className="text-amber-400" size={18} />
                      <h4 className="font-extrabold text-sm text-white">حاسبة الأرباح والتوفير الذكية لشدات وسيم</h4>
                    </div>
                    {/* Currency Switching controls */}
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
                      <button 
                        type="button"
                        onClick={() => setCalcCurrency("SYP")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-tight transition-all ${calcCurrency === "SYP" ? "bg-amber-400 text-neutral-950 shadow" : "text-white/60 hover:text-white"}`}
                      >
                        ليرة سورية
                      </button>
                      <button 
                        type="button"
                        onClick={() => setCalcCurrency("USD")}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-tight transition-all ${calcCurrency === "USD" ? "bg-amber-400 text-neutral-950 shadow" : "text-white/60 hover:text-white"}`}
                      >
                        دولار (USD)
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-white/40">اكتب أي كمية شدات تريدها وسنقوم تلقائياً بحساب السعر الإجمالي ومعدل توفيرك مقارنة بالأسعار الفردية.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Input UC value */}
                    <div className="space-y-1">
                      <label className="text-white/60 text-xs block font-bold">الكمية المطلوبة (UC)</label>
                      <input 
                        type="number" 
                        value={calcAmount}
                        onChange={(e) => setCalcAmount(e.target.value)}
                        placeholder="مثال: 1000"
                        className="w-full rounded-xl bg-black/40 border border-white/10 text-white px-4 py-3 text-sm font-mono focus:outline-none focus:border-amber-500/50 text-right"
                      />
                    </div>

                    {/* Output display with saving badges */}
                    <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-center text-right relative">
                      {(() => {
                        const amt = parseInt(calcAmount, 10) || 0;
                        const basePriceUSD = 0.015; // 0.015 USD per UC
                        const basePriceSYP = Math.round(basePriceUSD * getExchangeRate()); // Dynamic SYP per UC based on exchange rate setting
                        
                        // Savings bands
                        let savingsPct = 0;
                        if (amt >= 5000) savingsPct = 15;
                        else if (amt >= 1000) savingsPct = 10;
                        else if (amt >= 500) savingsPct = 5;
                        else if (amt >= 100) savingsPct = 2;

                        const rawCost = amt * (calcCurrency === "SYP" ? basePriceSYP : basePriceUSD);
                        const discountAmt = rawCost * (savingsPct / 100);
                        const finalCost = rawCost - discountAmt;

                        return (
                          <>
                            <span className="text-[10px] text-white/40 block font-bold">التكلفة التقديرية المخفضة</span>
                            <div className="flex items-baseline gap-1 mt-1 font-mono">
                              <span className="text-xl md:text-2xl font-black text-amber-400">
                                {calcCurrency === "SYP" 
                                  ? Math.floor(finalCost).toLocaleString() + " ل.س" 
                                  : "$" + finalCost.toFixed(2)
                                }
                              </span>
                            </div>
                            
                            {savingsPct > 0 && (
                              <div className="absolute top-3 left-3 bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full select-none animate-pulse">
                                توفير {savingsPct}% ✨
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Sidebar/Side-Card: Sham Cash payment top-up gateway */}
              <div className="xl:col-span-5">
                <div className="relative overflow-hidden rounded-3xl border border-purple-500/35 bg-gradient-to-br from-purple-950/40 via-purple-900/10 to-indigo-950/40 p-6 shadow-2xl space-y-6">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-fuchsia-400 to-indigo-600" />
                  
                  {/* Premium Purple Badge Title */}
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/20 rounded-2xl text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10">
                      <CreditCard size={20} />
                    </div>
                    <div className="text-right">
                      <span className="text-xs bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">بوابة شحن المحفظة - شام كاش</span>
                      <h3 className="text-base font-black text-white mt-1">شحن رصيد فوري وسريع</h3>
                    </div>
                  </div>

                  {/* Center QR Code */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-zinc-950 rounded-3xl p-2.5 w-[240px] md:w-[260px] flex items-center justify-center shadow-xl shadow-purple-500/20 border border-purple-500/30 hover:scale-[1.03] transition-transform duration-300 select-none overflow-hidden">
                      <img 
                        src="/src/assets/images/syriatel_cash_qr_1779733781672.png" 
                        alt="Syriatel Cash QR Code" 
                        className="w-full h-auto rounded-2xl object-contain bg-zinc-950"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Copyable Wallet Code */}
                    <div className="flex flex-col items-center justify-center mt-3 text-center">
                      <span className="text-[10px] text-purple-300 font-extrabold uppercase tracking-widest mb-1.5 block">رقم حساب المستلم (شام كاش)</span>
                      <div className="flex items-center gap-2 bg-neutral-950/60 border border-purple-500/25 px-3 py-1.5 rounded-xl max-w-full shadow-inner">
                        <span className="font-mono text-xs text-purple-200 select-all tracking-wide break-all">
                          df1058dd6cc77204274b8ce31c7abf9f
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText("df1058dd6cc77204274b8ce31c7abf9f");
                            setCopiedWalletCode(true);
                            setTimeout(() => setCopiedWalletCode(false), 2000);
                          }}
                          className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white rounded-lg transition-all active:scale-90 flex items-center justify-center cursor-pointer"
                          title="نسخ رقم الحساب"
                        >
                          {copiedWalletCode ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                      {copiedWalletCode && (
                        <span className="text-[9px] text-green-400 font-bold mt-1 animate-pulse">تم النسخ بنجاح!</span>
                      )}
                    </div>
                  </div>

                  {/* Recipient Official Name Info */}
                  <div className="bg-neutral-900/60 border border-purple-500/10 p-3.5 rounded-2xl text-center shadow-inner hover:border-purple-500/25 transition-colors">
                    <span className="text-[10px] text-purple-300 font-extrabold uppercase tracking-widest block">اسم المستلم المعتمد بشام كاش</span>
                    <p className="text-sm font-black text-white mt-1 select-all tracking-tight selection:bg-purple-500">محمد وسيم عبد المجيد الشيخ علي</p>
                  </div>

                  {/* Top-up Selection Bundle Cards */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-xs font-bold block">1. اختر حزمة الشدات المراد إيداعها</span>
                      <span className="text-[10px] text-purple-400 font-mono">الحد الأدنى: 60 UC</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { uc: 1000, priceStr: "520,000 ل.س", label: "شحن 1000 شدة" },
                        { uc: 5000, priceStr: "2,500,000 ل.س", label: "شحن 5000 شدة" }
                      ].map((bundle) => {
                        const isSelected = parseInt(depositAmount, 10) === bundle.uc;
                        return (
                          <button
                            type="button"
                            key={bundle.uc}
                            onClick={() => setDepositAmount(bundle.uc.toString())}
                            className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between gap-0.5 active:scale-95 ${
                              isSelected 
                                ? "bg-purple-500/20 border-purple-400 text-white shadow-lg shadow-purple-500/5 font-black" 
                                : "bg-black/35 border-white/5 hover:border-purple-500/20 text-white/70"
                            }`}
                          >
                            <span className="font-extrabold text-white text-xs">{bundle.label}</span>
                            <span className="text-[10px] text-purple-300 font-mono">{bundle.priceStr}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Top Up Inputs */}
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="أو اكتب كمية أخرى للشدات..."
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full rounded-xl bg-black/40 border border-white/10 text-white px-4 py-3 text-xs font-mono focus:outline-none focus:border-purple-500/50 pr-8 text-right"
                      />
                      <Sparkles size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400" />
                    </div>
                  </div>

                  {/* Receipt Uploader and Reference Tx Number */}
                  <div className="space-y-3">
                    <span className="text-white/60 text-xs font-bold block">2. إيصال ومرجع التحويل من شام كاش</span>
                    
                    {/* Drag & Drop zone */}
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          setDepositReceiptFile(file);
                          setDepositReceiptName(file.name);
                        }
                      }}
                      onClick={() => document.getElementById("receipt-uploader-sidebar")?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                        isDragOver 
                          ? "border-purple-400 bg-purple-500/5" 
                          : depositReceiptFile 
                          ? "border-emerald-500/30 bg-emerald-500/5" 
                          : "border-white/10 hover:border-purple-500/20 bg-black/20"
                      }`}
                    >
                      <input 
                        type="file" 
                        id="receipt-uploader-sidebar" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDepositReceiptFile(file);
                            setDepositReceiptName(file.name);
                          }
                        }}
                      />
                      {depositReceiptFile ? (
                        <div className="space-y-1">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                            <Check size={16} />
                          </div>
                          <p className="text-emerald-400 text-xs font-bold truncate max-w-[180px] mx-auto">{depositReceiptName}</p>
                          <p className="text-[10px] text-white/30">اضغط لتغيير الصورة المرفقة</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <UploadCloud size={24} className="text-purple-400 mx-auto" strokeWidth={1.5} />
                          <p className="text-[11px] font-bold text-white/70">أرفق صورة وصل التحويل (اختياري)</p>
                          <p className="text-[9px] text-white/30">اسحب صورة الوصل هنا أو اضغط للتصفح</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-white/50 text-[10px] block font-bold">رقم العملية المالي بشام كاش (الرقم المرجعي)</label>
                      <input 
                        type="text" 
                        placeholder="مثال: SHAM-849102"
                        value={depositTx}
                        onChange={(e) => setDepositTx(e.target.value)}
                        className="w-full rounded-xl bg-black/45 border border-white/10 text-white px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-purple-500/50 text-right"
                      />
                    </div>

                    {/* Promo Code Input Fields */}
                    <div className="space-y-2 border-t border-white/5 pt-3">
                      <label className="text-white/60 text-xs block font-bold">3. كود الخصم الشاحن (نظام الحوافز الكبرى)</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="مثال: WASEEM2026"
                          value={promoCodeInput}
                          onChange={(e) => {
                            setPromoCodeInput(e.target.value);
                            setIsPromoApplied(false);
                            setPromoError("");
                            setPromoSuccess("");
                          }}
                          className="flex-1 rounded-xl bg-black/40 border border-white/10 text-white px-3 py-2.5 text-xs font-mono tracking-widest focus:outline-none focus:border-purple-500/50 text-center uppercase"
                        />
                        <button
                          type="button"
                          onClick={handleApplyPromoCode}
                          className="bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/20 text-purple-300 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                        >
                          تفعيل الكود
                        </button>
                      </div>
                      {promoSuccess && <p className="text-[10.5px] text-emerald-400 font-bold leading-relaxed">{promoSuccess}</p>}
                      {promoError && <p className="text-[10.5px] text-red-400 font-bold">{promoError}</p>}
                    </div>
                  </div>

                  {/* Payment Alert Boxes */}
                  {depositError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{depositError}</span>
                    </div>
                  )}

                  {depositSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>{depositSuccess}</span>
                    </div>
                  )}

                  {/* Submission payment confirmation action button */}
                  <button
                    type="button"
                    onClick={handleDepositSubmit}
                    disabled={isDepositing}
                    className="w-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-600 hover:from-purple-600 hover:via-fuchsia-600 hover:to-indigo-700 text-white py-3.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/15 hover:shadow-purple-500/25 active:scale-95 disabled:opacity-50 tracking-wider"
                  >
                    {isDepositing ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>جاري التحقق الفوري...</span>
                      </>
                    ) : (
                      <>
                        <Wallet size={16} strokeWidth={2} className="animate-pulse text-purple-200" />
                        <span>تأكيد إيداع الأموال في المحفظة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

            <div className="flex justify-between items-center mb-2">
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <ShoppingBag className="text-amber-400" size={22} />
                  <span>طلبات الشحن السابقة الخاصة بك</span>
                </h2>
                <p className="text-white/50 text-xs">سجل تاريخي كامل يعرض فواتير وحالة شحن ألعابك بشكل مباشر</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-20 card-glass rounded-3xl opacity-60">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-white/60 text-sm">جاري مراجعة طلباتك من خادم وسيم ستور...</p>
              </div>
            ) : invoices.length === 0 ? (
              /* If empty invoice history */
              <div className="text-center py-16 bg-zinc-950/40 border border-white/5 rounded-3xl p-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-white/30">
                  <Gamepad2 size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-lg">لا توجد طلبات شحن سابقة بعد</h4>
                  <p className="text-white/50 text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                    لم تقم بإجراء أي عمليات شحن للشدات أو باقات الألعاب حتى الآن. تصفح المتجر واشحن فوراً!
                  </p>
                </div>
                <button
                  onClick={() => navigate("/")}
                  className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black px-6 py-2.5 rounded-xl text-xs transition-all active:scale-95 inline-flex items-center gap-1.5"
                >
                  <Compass size={14} />
                  <span>تصفح الألعاب والخدمات الفاخرة</span>
                </button>
              </div>
            ) : (
              /* Listing past invoices */
              <div className="space-y-4">
                {invoices.map((inv) => (
                  <motion.div 
                    key={inv.id}
                    layoutId={inv.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-glass bg-zinc-950/40 p-5 rounded-2xl border border-white/5 hover:border-white/10 transition-all space-y-4"
                  >
                    {/* Top Row: Service name + status */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-base">{inv.service}</span>
                          <span className="text-[10px] bg-white/10 text-white/40 px-2 py-0.5 rounded-md font-mono">
                            {inv.orderId}
                          </span>
                        </div>
                        <div className="text-white/40 text-xs flex items-center gap-1">
                          <Clock size={12} />
                          <span>{inv.date ? new Date(inv.date).toLocaleString('ar-EG', { hour12: true }) : "منذ قليل"}</span>
                        </div>
                      </div>

                      {/* Status label mapping */}
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                        inv.status === "قيد المعالجة"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : inv.status === "تم الشحن" || inv.status === "مكتمل" || inv.status === "تم الدفع"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/15 text-red-400 border-red-500/20"
                      }`}>
                        {inv.status || "قيد المعالجة"}
                      </span>
                    </div>

                    {/* Middle info grid: IDs and Verification Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="bg-black/35 p-3 rounded-xl flex items-center gap-2 text-xs border border-white/5">
                        <Gamepad2 size={16} className="text-amber-500" />
                        <div className="flex-1 min-w-0">
                          <div className="text-white/40 text-[9.5px]">آيدي اللاعب (Player ID)</div>
                          <div className="text-white font-mono font-bold select-all truncate">{inv.playerId || inv.pid || "غير متوفر"}</div>
                        </div>
                      </div>

                      <div className="bg-black/35 p-3 rounded-xl flex items-center gap-2 text-xs border border-white/5">
                        <User size={16} className="text-amber-400" />
                        <div className="flex-1 min-w-0">
                          <div className="text-white/40 text-[9.5px]">اسم اللاعب باللعبة</div>
                          <div className="text-white font-bold truncate">{inv.playerName || "غير متوفر"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Pricing, Quantity & Gateway specifics */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-2 gap-2 text-xs border-t border-white/5">
                      <div className="flex items-center gap-3 text-white/40">
                        {inv.referralCode && (
                          <span className="flex items-center gap-1">
                            <Percent size={12} />
                            <span>كود الخصم: {inv.referralCode}</span>
                          </span>
                        )}
                        <span>الكمية: {inv.qty || 1}</span>
                      </div>

                      <div className="self-end sm:self-auto flex items-center gap-2 font-sans">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceiptDoc(inv);
                            setShowReceiptModal(true);
                          }}
                          className="bg-white/5 hover:bg-white/10 text-white/80 hover:text-white px-3 py-1.5 rounded-xl text-xs gap-1 flex items-center border border-white/5 hover:border-white/10 transition-all font-semibold select-none"
                        >
                          <Download size={11} className="text-amber-400" />
                          <span>تحميل الفاتورة</span>
                        </button>

                        <span className="text-white/40 mr-1.5">السعر المدفوع:</span>
                        <span className="text-emerald-400 font-extrabold text-base">
                          {formatPrice(inv.amount, inv.currency || "USD")}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <footer className="py-12 mt-20 border-t border-white/5 text-center opacity-40 text-xs text-white/50 space-y-1">
        <p>© 2026 وسيم ستور • منصة شحن الشدات والألعاب الرسمية للشرق الأوسط</p>
        <p className="text-[10px]">ربط مباشر ومحمي ببوابات الكاسر وخدمات الفحص الفوري</p>
      </footer>

      {/* Premium Digital Receipt Generator Overlay Modal */}
      {showReceiptModal && selectedReceiptDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn" dir="rtl">
          <div className="relative w-full max-w-lg bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6">
            
            {/* Holographic header stripe */}
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600" />
            
            {/* Receipt body framed like a premium terminal checkout print */}
            <div className="bg-white text-zinc-900 rounded-2xl p-6 space-y-5 relative shadow-inner select-none font-sans overflow-hidden">
              <div className="absolute -left-10 -top-10 w-24 h-24 bg-zinc-100 rounded-full blur-xl opacity-40" />
              <div className="absolute -right-12 -bottom-12 w-28 h-28 bg-amber-100 rounded-full blur-xl opacity-30" />
              
              {/* Receipt Header branding */}
              <div className="text-center space-y-1 pb-4 border-b-2 border-dashed border-zinc-200">
                <div className="text-xl font-black tracking-tighter text-zinc-900">وسيم ستور • WASEEM STORE</div>
                <div className="text-[10px] text-zinc-400 font-extrabold tracking-widest uppercase">الفاتورة الضريبية الفاخرة للطلبات الرقمية</div>
                <div className="text-[9.5px] text-zinc-500 font-medium">الوكيل المعتمد لحقن وشحن شدات PUBG والعملات الرقمية في الشرق الأوسط</div>
              </div>

              {/* Receipt Specific grids */}
              <div className="space-y-3.5 text-xs text-zinc-700">
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-400">رقم الفاتورة:</span>
                  <span className="font-mono font-black text-zinc-900">{selectedReceiptDoc.orderId || selectedReceiptDoc.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-400">تاريخ الشراء:</span>
                  <span className="font-medium text-zinc-900">{selectedReceiptDoc.date ? new Date(selectedReceiptDoc.date).toLocaleString('ar-EG', { hour12: false }) : "منذ قليل"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-zinc-400">بوابة الدفع الشاحنة:</span>
                  <span className="font-bold text-zinc-950 bg-amber-400/20 px-2 py-0.5 rounded text-[11px] border border-amber-400/30">{selectedReceiptDoc.paymentMethod || "رصيد المحفظة"}</span>
                </div>
                {selectedReceiptDoc.txId && (
                  <div className="flex justify-between">
                    <span className="font-bold text-zinc-400">المُعرّف المرجعي الرقمي:</span>
                    <span className="font-mono text-[10.5px] text-zinc-900 truncate max-w-[200px]">{selectedReceiptDoc.txId}</span>
                  </div>
                )}
                
                <div className="border-t border-zinc-100 pt-3.5 space-y-2.5">
                  <div className="flex justify-between">
                    <span className="font-bold text-zinc-400">الباقة / الخدمة المحقونة:</span>
                    <span className="font-black text-zinc-950">{selectedReceiptDoc.service}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-zinc-400">كمية الشدات أو المنتجات:</span>
                    <span className="font-mono font-bold text-zinc-900">1 (حزمة متكاملة)</span>
                  </div>
                  {selectedReceiptDoc.playerId && (
                    <div className="flex justify-between bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                      <span className="font-bold text-zinc-400">آيدي المستلم (Verified ID):</span>
                      <span className="font-mono font-black text-zinc-950 select-all tracking-wider">{selectedReceiptDoc.playerId}</span>
                    </div>
                  )}
                  {selectedReceiptDoc.playerName && (
                    <div className="flex justify-between">
                      <span className="font-bold text-zinc-400">اسم اللاعب المحقق:</span>
                      <span className="font-bold text-emerald-600">✓ {selectedReceiptDoc.playerName}</span>
                    </div>
                  )}
                </div>

                {/* Total Cost styling for print */}
                <div className="border-t-2 border-dashed border-zinc-200 pt-4 flex justify-between items-baseline">
                  <span className="text-zinc-900 font-black text-sm">القيمة الإجمالية المسددة:</span>
                  <span className="text-xl font-black text-amber-600 font-sans">
                    {formatPrice(selectedReceiptDoc.amount, selectedReceiptDoc.currency || "USD")}
                  </span>
                </div>
              </div>

              {/* Decorative Barcode simulation */}
              <div className="text-center pt-2 space-y-1 border-t border-zinc-100">
                <div className="h-8 flex justify-center items-end gap-0.5 overflow-hidden opacity-80" aria-hidden="true">
                  {[3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3, 2, 3, 8, 4, 6].map((w, index) => (
                    <div key={index} className="bg-zinc-900 h-full" style={{ width: `${w * 0.75 + 1}px` }} />
                  ))}
                </div>
                <div className="text-[8px] font-mono font-medium tracking-widest text-zinc-400">{selectedReceiptDoc.id} • SECURED FROM DISPATCHER</div>
              </div>

              {/* Verified Holographic Approved Stamp */}
              <div className="absolute bottom-5 left-5 pointer-events-none opacity-30 origin-center -rotate-12">
                <div className="border-4 border-emerald-600 text-emerald-600 font-black text-[13px] px-2 py-1 uppercase rounded-xl tracking-tighter">
                  APPROVED • وسيم ستور
                </div>
              </div>
            </div>

            {/* Action buttons list */}
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-black py-3 rounded-2xl text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
              >
                <Printer size={14} />
                <span>طباعة المستند الرسمي</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedReceiptDoc(null);
                }}
                className="px-6 bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold py-3 rounded-2xl text-xs transition-all border border-white/5 active:scale-95"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
