import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Bell, BellOff, Info, Check, AlertCircle } from "lucide-react";
import { db, auth } from "../lib/firebase";
import { collection, query, where, onSnapshot, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { formatPrice, getExchangeRate, getCurrency } from "../lib/currency";

interface PriceAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceKey: string;
  category: string;
  currentPrice: number;
}

export default function PriceAlertModal({
  isOpen,
  onClose,
  serviceKey,
  category,
  currentPrice
}: PriceAlertModalProps) {
  const [user, setUser] = useState<any>(null);
  const [existingAlert, setExistingAlert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [triggerType, setTriggerType] = useState<"any_change" | "lower_than">("any_change");
  const [targetPriceInput, setTargetPriceInput] = useState<string>("");
  const [isAlertsEnabledGlobally, setIsAlertsEnabledGlobally] = useState<boolean>(true);

  // Observe Auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Observe global settings for Price Alerts toggle
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "global"), (snap) => {
      if (snap.exists()) {
        const val = snap.data().priceAlertsEnabled;
        if (typeof val === 'boolean') {
          setIsAlertsEnabledGlobally(val);
        }
      }
    });
    return () => unsub();
  }, []);

  // Sync / Listen to existing subscription
  useEffect(() => {
    if (!isOpen || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "price_alerts"),
      where("uid", "==", user.uid),
      where("serviceKey", "==", serviceKey)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const adoc = snapshot.docs[0];
        const data: any = { id: adoc.id, ...adoc.data() };
        setExistingAlert(data);
        // Pre-fill
        setTriggerType(data.triggerType || "any_change");
        setTargetPriceInput(data.targetPrice !== undefined ? String(data.targetPrice) : "");
      } else {
        setExistingAlert(null);
        setTriggerType("any_change");
        setTargetPriceInput("");
      }
      setLoading(false);
    }, (err) => {
      console.warn("Error fetching price alert document:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, user, serviceKey]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Create a unique document ID or use push id
      const alertId = existingAlert?.id || `${user.uid}_${serviceKey.replace(/[\s/]/g, "_")}`;
      const alertRef = doc(db, "price_alerts", alertId);

      const tPrice = triggerType === "lower_than" ? Number(targetPriceInput) : 0;

      if (triggerType === "lower_than" && (isNaN(tPrice) || tPrice <= 0)) {
        alert("يرجى إدخال سعر مستهدف صحيح أكبر من الصفر");
        setSaving(false);
        return;
      }

      await setDoc(alertRef, {
        uid: user.uid,
        userEmail: user.email || "",
        serviceKey,
        category,
        triggerType,
        targetPrice: tPrice,
        createdAt: new Date().toISOString()
      }, { merge: true });

      onClose();
    } catch (err: any) {
      console.error("Error saving price alert:", err);
      alert(`عذراً، فشل تفعيل التنبيه: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !existingAlert) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, "price_alerts", existingAlert.id));
      onClose();
    } catch (err: any) {
      console.error("Error deleting price alert:", err);
      alert(`عذراً، فشل إلغاء التنبيه: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div id="price-alert-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md"
        />

        {/* Dialog Content */}
        <motion.div 
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          className="relative w-full max-w-md rounded-[2.5rem] bg-gradient-to-b from-zinc-900 to-neutral-950 p-6 md:p-8 border border-white/10 text-right text-white shadow-2xl overflow-hidden z-10"
        >
          {/* Header Border Glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-6 left-6 text-white/50 hover:text-white transition-all bg-white/5 hover:bg-white/10 p-2 rounded-full"
          >
            <X size={18} />
          </button>

          {/* Icon and Title */}
          <div className="flex flex-col items-center text-center mt-4 mb-6">
            <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mb-4 animate-pulse">
              <Bell size={28} />
            </div>
            <h3 className="text-xl font-black">🔔 تفعيل تنبيهات الأسعار الذكية</h3>
            <p className="text-white/60 text-xs mt-1.5 leading-relaxed max-w-xs">
              سنعلمك بإشعار مباشر في حسابك فور تغير سعر الخدمة أو وصولها لهدفك.
            </p>
          </div>

          {!isAlertsEnabledGlobally && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl text-xs leading-relaxed flex gap-2.5 items-start">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>
                تنبيه: ميزة إشعارات الأسعار معطلة مؤقتاً في لوحة المشرف، ولكن يمكنك الاشتراك الآن وسيتأخر الإشعار لحين إعادة تفعيلها.
              </span>
            </div>
          )}

          {!user ? (
            <div className="text-center py-6">
              <p className="text-white/60 text-xs mb-4">يرجى تسجيل الدخول إلى حسابك الشخصي لتتمكن من تفعيل تنبيهات الأسعار الفنية!</p>
              <button 
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-black px-6 py-2.5 rounded-xl transition-all"
              >
                فهمت، إغلاق
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-amber-500/10 border-t-amber-500 animate-spin" />
              <p className="text-white/40 text-[11px]">جاري التحقق من التنبيهات النشطة...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Product Info */}
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-white/40 block mb-0.5">سعر الخدمة حالياً</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    {formatPrice(currentPrice)}
                  </span>
                </div>
                <div className="text-left font-bold text-white/80">
                  <span className="text-white/40 block font-normal text-right mb-0.5">اسم الخدمة</span>
                  {serviceKey}
                </div>
              </div>

              {/* Toggle Types */}
              <div className="space-y-2">
                <label className="text-white/60 text-[11px] block font-bold mb-1">نوع الاستهداف والتنبيه:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTriggerType("any_change")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      triggerType === "any_change"
                        ? "bg-amber-500/10 border-amber-500/50 text-white"
                        : "bg-black/20 border-white/5 text-white/50 hover:bg-black/30"
                    }`}
                  >
                    عند أي تغيير بالسعر
                  </button>

                  <button
                    type="button"
                    onClick={() => setTriggerType("lower_than")}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                      triggerType === "lower_than"
                        ? "bg-amber-500/10 border-amber-500/50 text-white"
                        : "bg-black/20 border-white/5 text-white/50 hover:bg-black/30"
                    }`}
                  >
                    عندما يصبح أقل من سعر معين
                  </button>
                </div>
              </div>

              {/* Target Price Configuration */}
              {triggerType === "lower_than" && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="space-y-1.5"
                >
                  <label className="text-white/60 text-[11px] block font-bold mb-1">حدد السعر المستهدف ($ دولار):</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="أدخل السعر المستهدف بالدولار (مثال: 0.90)"
                      value={targetPriceInput}
                      onChange={(e) => setTargetPriceInput(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-amber-500 pr-12 text-right"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">$</span>
                  </div>
                  {targetPriceInput && !isNaN(Number(targetPriceInput)) && (
                    <p className="text-[10px] text-amber-400 font-sans mt-1">
                      أي عندما ينخفض المنتج المذكور إلى أقل من: <strong>{formatPrice(Number(targetPriceInput), 'SYP')}</strong> (سعر الصرف الحالي: {getExchangeRate().toLocaleString()} ل.س)
                    </p>
                  )}
                </motion.div>
              )}

              {/* Buttons Row */}
              <div className="flex gap-2.5 pt-4">
                {existingAlert && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <BellOff size={14} />
                    إلغاء التنبيه
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-[2] bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 text-neutral-950 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 shadow-lg shadow-amber-500/10"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" /> : <Check size={14} />}
                  {existingAlert ? "تحديث التنبيه الآن" : "تفعيل التنبيه المباشر"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
