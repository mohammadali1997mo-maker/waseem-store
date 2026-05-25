import { X, Gamepad2, User, Ticket, Hash } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React, { useState } from "react";
import { formatPrice } from "../lib/currency";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (productId: string, identityNumber: string, promoCode?: string, playerId?: string, playerName?: string) => void;
  serviceName: string;
  amount: string;
}

export default function OrderModal({ isOpen, onClose, onConfirm, serviceName, amount }: OrderModalProps) {
  const [productId, setProductId] = useState("GAME-" + Math.floor(1000 + Math.random() * 9000));
  const [playerId, setPlayerId] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [promoCode, setPromoCode] = useState(localStorage.getItem('wsimCode') || "");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId.trim()) {
      setErrorMsg("يرجى إدخال آيدي اللاعب (Player ID) لإتمام الشحن");
      return;
    }
    setErrorMsg("");
    onConfirm(productId, "", promoCode, playerId, playerName);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative w-full max-w-md card-glass border-amber-500/10 rounded-3xl p-8 shadow-2xl overflow-hidden bg-zinc-950/90 text-right"
          >
            {/* Top gold line decorator */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-white/50 hover:text-white bg-white/5 p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="mb-6 mt-2">
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">تفاصيل شحن الألعاب</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                أنت بصدد طلب <span className="text-amber-400 font-extrabold">{serviceName}</span> بقيمة <span className="text-emerald-400 font-extrabold">{formatPrice(amount)}</span>
                {localStorage.getItem('wsimCurrency') === 'SYP' && (
                  <span className="block text-[10.5px] text-white/40 mt-1">(السعر الأصلي: ${amount} USD)</span>
                )}
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-xs mb-4 text-right">
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mandatory Player ID */}
              <div>
                <label className="block text-white/80 text-xs font-bold mb-2 mr-1 flex items-center gap-1.5 justify-start">
                  <Gamepad2 size={14} className="text-amber-400" />
                  <span>آيدي اللاعب (Player ID) <span className="text-red-500">*</span></span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={playerId}
                    onChange={(e) => setPlayerId(e.target.value)}
                    placeholder="مثال: 582910482"
                    dir="ltr"
                    className="w-full bg-white/5 border border-white/15 focus:border-amber-500/50 rounded-xl pl-4 pr-11 py-3.5 text-white font-bold placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all text-left"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
                    <Hash size={16} />
                  </span>
                </div>
                <p className="text-[10.5px] text-white/40 mt-1 mr-1">تأكد من كتابة الآيدي بشكل صحيح لضمان وصول الشحنة على الفور.</p>
              </div>

              {/* Optional Player Name */}
              <div>
                <label className="block text-white/80 text-xs font-bold mb-2 mr-1 flex items-center gap-1.5 justify-start">
                  <User size={14} className="text-amber-450" />
                  <span>اسم اللاعب في اللعبة (تحقق اختياري)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="مثال: WASIM_HERO"
                    className="w-full bg-white/5 border border-white/15 focus:border-amber-500/50 rounded-xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all text-right"
                  />
                </div>
              </div>

              {/* Optional promo code */}
              <div>
                <label className="block text-white/80 text-xs font-bold mb-2 mr-1 flex items-center gap-1.5 justify-start">
                  <Ticket size={14} className="text-amber-400" />
                  <span>كود المستخدم / الخصم (اختياري)</span>
                </label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="أدخل كود الخصم الفعال"
                  className="w-full bg-white/5 border border-white/15 focus:border-amber-500/50 rounded-xl px-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all font-mono text-center"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:via-yellow-600 hover:to-amber-700 text-black py-4 rounded-xl font-black text-sm transition-all shadow-lg hover:shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 mt-6"
              >
                التأكيد والمتابعة
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
