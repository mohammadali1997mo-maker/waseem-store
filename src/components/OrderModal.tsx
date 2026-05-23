import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import React, { useState } from "react";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (productId: string, identityNumber: string, promoCode?: string) => void;
  serviceName: string;
  amount: string;
}

import { formatPrice } from "../lib/currency";

export default function OrderModal({ isOpen, onClose, onConfirm, serviceName, amount }: OrderModalProps) {
  const [productId, setProductId] = useState("");
  const [promoCode, setPromoCode] = useState(localStorage.getItem('wsimCode') || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    onConfirm(productId, "", promoCode);
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md card-glass rounded-3xl p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-4 left-4 text-white/70 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6 text-right">
              <h2 className="text-2xl font-bold text-white mb-2">تأكيد الطلب</h2>
              <p className="text-white/70">
                أنت بصدد شحن <span className="text-blue-400 font-bold">{serviceName}</span> بقيمة <span className="text-green-400 font-bold">{formatPrice(amount)}</span>
                {localStorage.getItem('wsimCurrency') === 'SYP' && (
                  <span className="block text-[10px] opacity-60 mt-1">(السعر الأصلي: ${amount})</span>
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white/70 mb-2 mr-1">رقم المنتج (Product ID)</label>
                <input
                  type="text"
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="أدخل رقم المنتج هنا"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-2 mr-1">كود المستخدم / الخصم (اختياري)</label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="أدخل كود المستخدم الخاص بك"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-purple-400 transition-all font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-blue-500/25 transform hover:scale-[1.02]"
              >
                تأكيد ومتابعة الدفع
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
