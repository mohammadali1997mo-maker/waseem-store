import { ArrowRight, Search, Gamepad, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import OrderModal from "../components/OrderModal";
import { trackSectionVisit } from "../lib/db";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

const packages = [
  { name: 'PUBG GLOBAL', icon: '🎮', color: 'from-yellow-500 to-yellow-600', package: '60 شدة', price: 0.99, service: 'PUBG 60 شدة' },
  { name: 'PUBG GLOBAL', icon: '🎮', color: 'from-yellow-500 to-yellow-600', package: '325 شدات', price: 4.44, service: 'PUBG 325 شدات' },
  { name: 'PUBG GLOBAL', icon: '🎮', color: 'from-yellow-500 to-yellow-600', package: '660 شدات', price: 8.50, service: 'PUBG 660 شدات' },
  { name: 'PUBG GLOBAL', icon: '🎮', color: 'from-yellow-500 to-yellow-600', package: '1800 شدات', price: 21.00, service: 'PUBG 1800 شدات' },
  { name: 'Jawaker', icon: '🃏', color: 'from-purple-500 to-purple-600', package: '10000 توكنز', price: 1.20, service: 'Jawaker 10000 توكنز' },
  { name: 'FREE FIRE', icon: '🔥', color: 'from-orange-500 to-orange-600', package: '100 جوهرة', price: 0.93, service: 'FREE FIRE 100 جوهرة' },
  { name: 'Call of Duty', icon: '🎯', color: 'from-gray-600 to-gray-700', package: '880 CP', price: 12.99, service: 'COD 880 CP' },
];

import { formatPrice, getCurrency } from "../lib/currency";

export default function Games() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState<'USD' | 'SYP'>(getCurrency());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    // Set initial quantities
    setQuantities(packages.reduce((acc, _, idx) => ({ ...acc, [idx]: 1 }), {}));

    trackSectionVisit("شحن شدات الألعاب (Games)");
    const handleCurrencyChange = () => setCurrency(getCurrency());
    window.addEventListener('currencyChange', handleCurrencyChange);

    // Watch for custom prices
    const unsubPrices = onSnapshot(collection(db, 'prices'), (snapshot) => {
      const pm: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        pm[doc.id] = doc.data().price;
      });
      setCustomPrices(pm);
    });

    return () => {
      window.removeEventListener('currencyChange', handleCurrencyChange);
      unsubPrices();
    };
  }, []);

  const getPkgPrice = (pkg: any) => {
    return customPrices[pkg.service] !== undefined ? customPrices[pkg.service] : pkg.price;
  };

  const toggleCurrency = () => {
    const newCurrency = currency === 'USD' ? 'SYP' : 'USD';
    localStorage.setItem('wsimCurrency', newCurrency);
    window.dispatchEvent(new Event('currencyChange'));
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  const filteredPackages = packages.filter(pkg => 
    pkg.name.toLowerCase().includes(search.toLowerCase()) || 
    pkg.package.toLowerCase().includes(search.toLowerCase())
  );

  const handleBuyClick = (pkg: any, index: number) => {
    const qty = quantities[index] || 1;
    const activePrice = getPkgPrice(pkg);
    const finalPrice = (activePrice * qty).toFixed(2);
    setSelectedPackage({ ...pkg, qty, finalPrice });
    setIsModalOpen(true);
  };

  const confirmOrder = (productId: string, identityNumber: string, promoCode?: string) => {
    setIsModalOpen(false);
    navigate(`/payment?service=${encodeURIComponent(selectedPackage.service)}&amount=${selectedPackage.finalPrice}&pid=${productId}&idnum=${identityNumber}&qty=${selectedPackage.qty}&code=${promoCode || ''}`);
  };

  return (
    <div className="min-h-screen py-8">
      <header className="container mx-auto px-4 mb-12">
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => navigate("/")}
            className="card-glass border-white/20 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all"
          >
            <ArrowRight size={20} />
            عودة
          </button>
          <h1 className="text-3xl md:text-5xl font-bold gradient-text text-center">باقات الشدات والتوكنز</h1>
          <div className="flex gap-4 items-center">
            <button 
              onClick={toggleCurrency}
              className="bg-white/5 border border-white/10 text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-all text-xs font-bold"
            >
              {currency === 'USD' ? '🇺🇸 USD' : '🇸🇾 SYP'}
            </button>
            <div className="w-12 hidden md:block"></div>
          </div>
        </div>

        <div className="max-w-xl mx-auto relative">
          <input 
            type="text" 
            placeholder="ابحث عن اللعبة أو الباقة..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full bg-white/10 border border-white/25 text-white px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60" />
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg, idx) => {
            const originalIndex = packages.indexOf(pkg);
            const qty = quantities[originalIndex] || 1;
            const activePrice = getPkgPrice(pkg);
            const totalPrice = (activePrice * qty).toFixed(2);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-glass rounded-3xl p-6 text-center hover:scale-105 transition-all group"
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${pkg.color} rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg group-hover:rotate-12 transition-transform`}>
                  {pkg.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{pkg.name}</h3>
                <p className="text-white/60 text-sm mb-4">{pkg.package}</p>
                <p className="text-2xl font-black text-white mb-6">{formatPrice(activePrice, currency)}</p>

                <div className="flex items-center justify-between gap-4 mb-6">
                  <span className="text-white/70 text-sm">الكمية:</span>
                  <input 
                    type="number" 
                    min="1"
                    value={qty}
                    onChange={(e) => setQuantities({ ...quantities, [originalIndex]: Number(e.target.value) })}
                    className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-white focus:outline-none focus:border-blue-400"
                  />
                </div>

                <p className="text-white/50 text-sm mb-6 underline">الإجمالي: {formatPrice(totalPrice, currency)}</p>

                <button 
                  onClick={() => handleBuyClick(pkg, originalIndex)}
                  className="w-full bg-gradient-to-r from-blue-500 to-sky-500 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  شراء الآن
                </button>
              </motion.div>
            );
          })}
        </div>
      </main>

      {selectedPackage && (
        <OrderModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={confirmOrder}
          serviceName={selectedPackage.service}
          amount={selectedPackage.finalPrice}
        />
      )}

      <footer className="py-12 mt-20 opacity-40 text-center">
        <p>© 2026 وسيم ستور. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
