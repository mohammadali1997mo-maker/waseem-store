import { ArrowRight, CreditCard, Receipt, MessageCircle, ShieldCheck, QrCode } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { saveInvoice } from "../lib/db";
import { auth } from "../lib/firebase";

import { formatPrice, getCurrency, getExchangeRate } from "../lib/currency";

export default function Payment() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'qr'>('stripe');
  const [currency, setCurrency] = useState<'USD' | 'SYP'>(getCurrency());
  const [note, setNote] = useState("");

  const service = searchParams.get("service") || "خدمة عامة";
  const amount = searchParams.get("amount") || "0.00";
  const pid = searchParams.get("pid") || "N/A";
  const idnum = searchParams.get("idnum") || "N/A";
  const qty = searchParams.get("qty") || "1";

  const toggleCurrency = () => {
    const newCurrency = currency === 'USD' ? 'SYP' : 'USD';
    setCurrency(newCurrency);
    localStorage.setItem('wsimCurrency', newCurrency);
    window.dispatchEvent(new Event('currencyChange'));
  };

  const orderId = "INV-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  const date = new Date().toLocaleString("ar-EG");

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Check for Stripe redirect success
    const success = searchParams.get("success");
    if (success === "true") {
      handleFinalizePayment();
    }

    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser({
          name: user.displayName,
          email: user.email,
          uid: user.uid
        });
      } else {
        const local = localStorage.getItem("wsimUser");
        if (local) setCurrentUser(JSON.parse(local));
      }
    });
    return () => unsub();
  }, [searchParams]);

  const handleFinalizePayment = async () => {
    setLoading(true);
    try {
      const wsimCode = searchParams.get("code") || localStorage.getItem("wsimCode") || "";
      await saveInvoice({
        orderId,
        service,
        amount,
        currency,
        qty,
        pid,
        idnum,
        note,
        userName: currentUser?.name || "مستخدم غير مسجل",
        userEmail: currentUser?.email || "anonymous@wsim.com",
        paymentMethod,
        referralCode: wsimCode,
        date: new Date().toISOString()
      });

      // Send Server-side notification (WhatsApp bridge)
      try {
        const response = await fetch("/api/notify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            service,
            amount,
            userEmail: currentUser?.email || "anonymous@wsim.com"
          })
        });
        
        if (!response.ok) {
          console.warn("Notification server returned error", response.status);
        }
      } catch (notifyErr: any) {
        console.error("Notification failed", notifyErr);
      }

      setIsPaid(true);
    } catch (err) {
      console.error(err);
      alert("فشل في حفظ الفاتورة، يرجى التواصل مع الدعم");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (paymentMethod === 'stripe') {
      try {
        const response = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service,
            amount: parseFloat(amount),
            orderId,
            email: currentUser?.email
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        if (data.url) {
          window.location.href = data.url; // Redirect to Stripe Checkout
        } else {
          throw new Error(data.error || "Failed to create checkout session");
        }
      } catch (err: any) {
        console.error(err);
        if (err.message === "Failed to fetch") {
          alert("فشل الاتصال بمزود الدفع (الخادم غير مستجيب)");
        } else {
          alert(err.message || "حدث خطأ في الاتصال ببوابة الدفع");
        }
        setLoading(false);
      }
    } else {
      // For QR, just simulate after delay
      setTimeout(() => {
        handleFinalizePayment();
      }, 2000);
    }
  };

  const openWhatsApp = () => {
    const methodText = paymentMethod === 'stripe' ? 'بطاقة ائتمان (Stripe)' : 'تحويل عبر QR Code';
    const noteText = note ? `%0Aملاحظات: ${note}` : '';
    const message = `تم طلب شحن جديد في وسيم ستور%0A%0Aرقم الفاتورة: ${orderId}%0Aطريقة الدفع: ${methodText}%0Aالخدمة: ${service}%0Aالكمية: ${qty}%0Aالمبلغ: ${amount}$%0Aرقم المنتج: ${pid}%0Aالعميل: ${currentUser?.name}${noteText}%0Aالتاريخ: ${date}`;
    window.open(`https://wa.me/9631423016?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen py-8">
      <header className="container mx-auto px-4 mb-12">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => navigate("/")}
            className="card-glass border-white/20 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all font-bold"
          >
            <ArrowRight size={20} />
            عودة
          </button>
          <div className="text-center flex-1">
            <h1 className="text-3xl md:text-5xl font-bold gradient-text">بوابة الدفع الآمنة</h1>
          </div>
          <div className="flex gap-4 items-center">
            <button 
              onClick={toggleCurrency}
              className="bg-white/5 border border-white/10 text-white px-3 py-2 rounded-xl hover:bg-white/10 transition-all text-xs font-bold"
            >
              {currency === 'USD' ? '🇺🇸 USD' : '🇸🇾 SYP'}
            </button>
            <div className="w-12 hidden md:block"></div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Payment Form */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="checkout-card card-glass rounded-3xl p-8"
          >
            <div className="flex gap-4 mb-8">
              <button 
                onClick={() => setPaymentMethod('stripe')}
                className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl border transition-all ${
                  paymentMethod === 'stripe' ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <CreditCard size={20} />
                <span className="font-bold">البطاقة (Stripe)</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('qr')}
                className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl border transition-all ${
                  paymentMethod === 'qr' ? 'bg-purple-500 border-purple-400 text-white shadow-lg shadow-purple-500/20' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <QrCode size={20} />
                <span className="font-bold">شام كاش (Sham Cash)</span>
              </button>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-3 mb-8">
              <div className="flex justify-between">
                <span className="text-white/60">الخدمة:</span>
                <span className="text-white font-bold">{service}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white/60">المبلغ الإجمالي:</span>
                <div className="text-right">
                  {currency === 'SYP' ? (
                    <>
                      <span className="text-green-400 font-bold block text-xl">{formatPrice(amount, 'SYP')}</span>
                      <span className="text-white/40 text-sm block">({formatPrice(amount, 'USD')})</span>
                    </>
                  ) : (
                    <span className="text-green-400 font-bold text-xl">{formatPrice(amount, 'USD')}</span>
                  )}
                </div>
              </div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-3 opacity-60">
                <span>رقم المنتج: {pid}</span>
              </div>
            </div>

            {/* Custom Note Input */}
            {!isPaid && (
              <div className="mb-8">
                <label className="block text-white/60 text-sm mb-2 mr-1">ملاحظات إضافية (اختياري)</label>
                <textarea 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="أدخل أي ملاحظات أو تعليمات خاصة بطلبك هنا..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-purple-500 transition-all resize-none h-24"
                />
              </div>
            )}

            {paymentMethod === 'stripe' ? (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 text-right">
                  <p className="text-blue-300 font-bold mb-2 flex items-center gap-2 justify-end">
                    <ShieldCheck size={18} />
                    دفع آمن عبر Stripe
                  </p>
                  <p className="text-white/70 text-sm">سيتم توجيهك إلى صفحة Stripe المشفرة لإتمام عملية الدفع بأمان تام. نحن لا نقوم بتخزين بيانات بطاقتك.</p>
                </div>
                
                <button 
                  onClick={handlePayment}
                  disabled={loading || isPaid}
                  className={`w-full py-5 rounded-2xl font-bold text-lg transition-all shadow-xl flex items-center justify-center gap-3 ${
                    isPaid ? 'bg-green-500 cursor-default' : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transform hover:scale-[1.02] shadow-blue-500/25'
                  }`}
                >
                  {loading ? 'جاري التحويل...' : isPaid ? (
                    <>
                      <ShieldCheck />
                      تم الدفع بنجاح
                    </>
                  ) : 'الانتقال للدفع الآمن الآن'}
                </button>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="bg-white rounded-[2.5rem] p-10 mx-auto w-fit shadow-[0_0_60px_rgba(147,51,234,0.5)] border-4 border-purple-500/50">
                  <img 
                    src="/input_file_0.png" 
                    alt="Sham Cash QR Code" 
                    className="w-80 h-auto mx-auto rounded-2xl shadow-xl transition-transform hover:scale-105 duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback in case path differs
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('input_file_1')) {
                        target.src = '/input_file_1.png';
                      }
                    }}
                  />
                  <div className="mt-8 space-y-2">
                    <div className="bg-purple-600 text-white px-6 py-2 rounded-full font-black text-xl mb-2 inline-block">
                      شام كاش - Sham Cash
                    </div>
                    <p className="text-gray-900 font-bold text-lg">محمد وسيم عبد المجيد الشيخ علي</p>
                    <p className="text-gray-500 text-xs font-mono select-all">df1058dd6cc77204274b8ce31c7abf9f</p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-3xl p-6 text-white/95 text-sm md:text-base leading-relaxed text-right">
                  <p className="font-bold text-purple-300 text-lg mb-3 flex items-center gap-2 justify-end">
                    <QrCode size={20} />
                    خطوات الدفع عبر شام كاش
                  </p>
                  <ul className="space-y-2 opacity-90">
                    <li>1. افتح تطبيق <span className="text-purple-300 font-bold">شام كاش</span> على هاتفك.</li>
                    <li>2. اختر خيار "مسح الرمز" ووجه الكاميرا نحو الكود أعلاه.</li>
                    <li>3. أدخل المبلغ المطلوب: <span className="text-green-400 font-black text-xl">{formatPrice(amount, 'SYP')}</span>.</li>
                    <li>4. بعد تأكيد التحويل، اضغط على الزر أدناه لإرسال طلبك للمراجعة.</li>
                  </ul>
                </div>
                <button 
                  onClick={handleFinalizePayment}
                  disabled={loading || isPaid}
                  className={`w-full py-5 rounded-2xl font-bold text-xl transition-all shadow-xl flex items-center justify-center gap-3 ${
                    isPaid ? 'bg-green-500 cursor-default shadow-green-500/20' : 'bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 transform hover:scale-[1.02] shadow-purple-600/30'
                  }`}
                >
                  {loading ? 'جاري المعالجة...' : isPaid ? (
                    <>
                      <ShieldCheck />
                      تم إرسال الطلب بنجاح
                    </>
                  ) : 'أكملت التحويل، أرسل الطلب الآن'}
                </button>
              </div>
            )}
          </motion.div>

          {/* Invoice Summary */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="relative overflow-hidden"
          >
            {/* Background Decorative Element */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/10 blur-3xl rounded-full" />
            
            <div className="card-glass rounded-[2rem] p-8 h-fit lg:sticky lg:top-8 border-white/10 relative z-10">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                <div>
                  <h2 className="text-2xl font-black text-white flex items-center gap-3">
                    <Receipt className="text-purple-400" />
                    فاتورة الطلب
                  </h2>
                  <p className="text-white/40 text-[10px] mt-1 font-mono uppercase tracking-widest">{orderId}</p>
                </div>
                <div className="text-right">
                  <div className="text-white/60 text-xs mb-1">تاريخ الطلب</div>
                  <div className="text-white font-bold text-sm">{date.split(',')[0]}</div>
                </div>
              </div>

              {/* Status Badge */}
              <div className={`mb-8 flex items-center gap-2 px-4 py-2 rounded-xl border w-fit mx-auto font-bold text-sm ${
                isPaid ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400'
              }`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${isPaid ? 'bg-green-400' : 'bg-yellow-400'}`} />
                {isPaid ? 'عملية مكتملة' : 'بانتظار الدفع'}
              </div>

              <div className="space-y-5 mb-8">
                <div className="flex justify-between items-center group">
                  <span className="text-white/40 text-sm">العميل</span>
                  <div className="text-right">
                    <p className="text-white font-bold leading-none">{currentUser?.name || "زائر"}</p>
                    <p className="text-white/30 text-[10px]">{currentUser?.email || "N/A"}</p>
                  </div>
                </div>
                
                <div className="flex justify-between items-center group">
                  <span className="text-white/40 text-sm">الخدمة المطلوبة</span>
                  <p className="text-white font-bold">{service}</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-white/40 text-[10px] block mb-1">رقم المنتج</span>
                    <p className="text-blue-400 font-mono font-bold text-sm">{pid}</p>
                  </div>
                </div>

                {note && (
                  <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                    <span className="text-purple-400/60 text-[10px] block mb-1">ملاحظات الطلب</span>
                    <p className="text-white/80 text-xs italic">"{note}"</p>
                  </div>
                )}

                <div className="pt-6 border-t border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/40 text-sm">المبلغ الإجمالي</span>
                    <div className="text-right">
                      <p className="text-green-400 text-3xl font-black">
                        {currency === 'SYP' ? formatPrice(amount, 'SYP') : formatPrice(amount, 'USD')}
                      </p>
                      {currency === 'SYP' && (
                        <p className="text-white/20 text-xs font-mono">({formatPrice(amount, 'USD')})</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sham Cash Integrated QR Section */}
              {!isPaid && paymentMethod === 'qr' && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="mb-8 p-6 bg-gradient-to-br from-purple-600/10 to-blue-600/10 rounded-[2rem] border border-purple-500/20"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-white p-3 rounded-2xl shadow-xl shadow-purple-500/20">
                      <img 
                        src="/input_file_0.png" 
                        alt="QR" 
                        className="w-20 h-20"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes('input_file_1')) target.src = '/input_file_1.png';
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-purple-300 font-black text-sm mb-1">شام كاش - Sham Cash</p>
                      <p className="text-white/80 text-[10px] leading-relaxed">
                        قم بمسح الرمز وتأكيد مبلغ <span className="text-green-400 font-bold">{formatPrice(amount, 'SYP')}</span> لتسريع المعالجة تلقائياً.
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#0a0a0c] p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-[9px] text-white/30 font-mono uppercase tracking-tighter">Account ID: df1058d...</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                  </div>
                </motion.div>
              )}

              {isPaid && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
                    <ShieldCheck className="text-green-400 mx-auto mb-3" size={40} />
                    <h3 className="text-lg font-bold text-white mb-1">تم التحقق من الدفع</h3>
                    <p className="text-white/50 text-xs">جاري إرسال الطلب لفريق التنفيذ</p>
                  </div>
                  <button 
                    onClick={openWhatsApp}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 shadow-lg shadow-green-600/20 active:scale-95"
                  >
                    <MessageCircle size={20} />
                    متابعة الطلب عبر واتساب
                  </button>
                </motion.div>
              )}
              
              <div className="mt-8 flex justify-center gap-4 opacity-20 hover:opacity-50 transition-opacity">
                <Receipt size={14} />
                <div className="border-r border-white/40 h-4" />
                <span className="text-[10px] font-mono tracking-widest text-white">AUTHENTIC RECEIPT</span>
                <div className="border-r border-white/40 h-4" />
                <ShieldCheck size={14} />
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="py-12 mt-20 opacity-40 text-center">
        <p>© 2026 وسيم ستور. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
