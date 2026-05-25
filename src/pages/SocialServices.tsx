import { ArrowRight, Search, Music, Instagram, Send, Twitter, Video, Camera, Youtube, Facebook, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import OrderModal from "../components/OrderModal";
import { trackSectionVisit } from "../lib/db";
import { db, auth, onAuthStateChanged } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

const sections = [
  { 
    id: 'tiktok', 
    title: 'تيك توك', 
    icon: <Music className="text-pink-400" />, 
    services: [
      { name: 'متابعين تيك توك', price: 5, color: 'from-pink-500 to-rose-500' },
      { name: 'لايكات تيك توك', price: 3, color: 'from-red-500 to-pink-500' },
      { name: 'مشاهدات تيك توك', price: 2, color: 'from-purple-500 to-pink-500' },
    ]
  },
  { 
    id: 'instagram', 
    title: 'إنستغرام', 
    icon: <Instagram className="text-pink-500" />, 
    services: [
      { name: 'متابعين إنستغرام', price: 6, color: 'from-pink-500 to-purple-500' },
      { name: 'لايكات إنستغرام', price: 4, color: 'from-red-500 to-pink-500' },
    ]
  },
  { 
    id: 'telegram', 
    title: 'تلجرام', 
    icon: <Send className="text-blue-400" />, 
    services: [
      { name: 'أعضاء القنوات', price: 4, color: 'from-blue-400 to-blue-600' },
      { name: 'مشاهدات الرسائل', price: 1, color: 'from-cyan-400 to-blue-500' },
    ]
  }
];

import { formatPrice, getCurrency } from "../lib/currency";

export default function SocialServices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [currency, setCurrency] = useState<'USD' | 'SYP'>(getCurrency());
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    trackSectionVisit("خدمات السوشيال ميديا (Social)");
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

  const getServicePrice = (service: any) => {
    return customPrices[service.name] !== undefined ? customPrices[service.name] : service.price;
  };

  const toggleCurrency = () => {
    const newCurrency = currency === 'USD' ? 'SYP' : 'USD';
    localStorage.setItem('wsimCurrency', newCurrency);
    window.dispatchEvent(new Event('currencyChange'));
  };

  const handleServiceClick = (service: any) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    const activePrice = getServicePrice(service);
    setSelectedService({ ...service, price: activePrice });
    setIsModalOpen(true);
  };

  const confirmOrder = (productId: string, identityNumber: string, promoCode?: string, playerId?: string, playerName?: string) => {
    setIsModalOpen(false);
    navigate(`/payment?service=${encodeURIComponent(selectedService.name)}&amount=${selectedService.price}&pid=${productId}&idnum=${identityNumber}&code=${promoCode || ''}&playerId=${encodeURIComponent(playerId || '')}&playerName=${encodeURIComponent(playerName || '')}`);
  };

  return (
    <div className="min-h-screen py-8">
      <header className="container mx-auto px-4 mb-12">
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={() => navigate("/")}
            className="card-glass border-white/20 text-white px-6 py-2 rounded-xl flex items-center gap-2 hover:bg-white/20 transition-all font-bold"
          >
            <ArrowRight size={20} />
            عودة
          </button>
          <h1 className="text-3xl md:text-5xl font-bold gradient-text">خدمات وسائل التواصل</h1>
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
            placeholder="ابحث عن الخدمة أو المنصة..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full bg-white/10 border border-white/20 text-white px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60" />
        </div>
      </header>

      <main className="container mx-auto px-4">
        {sections.map((section, sIdx) => {
          const filteredServices = section.services.filter(s => s.name.includes(search));
          if (filteredServices.length === 0) return null;

          return (
            <div key={sIdx} className="mb-16">
              <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3 border-b border-white/20 pb-4">
                {section.icon}
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredServices.map((service, idx) => {
                  const activePrice = getServicePrice(service);
                  return (
                    <motion.div
                      key={idx}
                      whileHover={{ y: -5 }}
                      onClick={() => handleServiceClick(service)}
                      className="card-glass rounded-3xl p-8 cursor-pointer group text-center"
                    >
                      <div className={`w-16 h-16 bg-gradient-to-br ${service.color} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-all`}>
                        <ShieldCheck size={32} className="text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>
                      <p className="text-white/60 text-sm mb-4">آمن وموثوق بنسبة 100%</p>
                      <div className="bg-white/10 px-4 py-2 rounded-full inline-block text-blue-300 font-bold mb-6">
                        {isLoggedIn ? `تبدأ من ${formatPrice(activePrice, currency)}` : "🔒 سجل الدخول لرؤية السعر"}
                      </div>
                      <button className="w-full bg-white/10 border border-white/20 text-white py-3 rounded-xl hover:bg-white/20 transition-all font-bold">
                        اطلب الآن
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </main>

      {selectedService && (
        <OrderModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={confirmOrder}
          serviceName={selectedService.name}
          amount={selectedService.price.toString()}
        />
      )}

      <footer className="py-12 mt-20 opacity-40 text-center">
        <p>© 2026 وسيم ستور. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
