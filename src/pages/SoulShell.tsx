import { ArrowRight, Search, Video, MessageSquare, Users, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import OrderModal from "../components/OrderModal";
import { trackSectionVisit } from "../lib/db";
import { db } from "../lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

const apps = [
  { name: 'سول شيل', diamonds: 1000, price: 1.77, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'مجلس', diamonds: 1000, price: 1.07, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ياهلان', diamonds: 1000, price: 1.78, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سول ستار', diamonds: 10000, price: 1.1, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'بارتي ستار', diamonds: 1000, price: 1.07, category: 'party', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'بيغو لايف', diamonds: 50, price: 0.89, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'حكي تشان', diamonds: 1000, price: 0.76, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'زينا لايف', diamonds: 1000, price: 1.09, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هابي تشات', diamonds: 10000, price: 1.07, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ايومي تشات', diamonds: 1000, price: 0.95, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هيا تشات', diamonds: 1000, price: 1.08, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'أب فن', diamonds: 30000, price: 1.24, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: '$7 ستار', diamonds: 3500, price: 0.31, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'مولي ستار', diamonds: 10000, price: 1.15, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'تادا شات', diamonds: 1000, price: 1.24, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'نبض شات', diamonds: 4000, price: 0.075, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ديمو شات', diamonds: 1000, price: 0.95, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'اب لايف', diamonds: 100, price: 1.65, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'بيلا شات', diamonds: 1000, price: 0.87, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'تاكا شات', diamonds: 10000, price: 1.03, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'لامي شات', diamonds: 2500, price: 0.77, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هوا شات', diamonds: 2000, price: 1.188, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سكاي شات', diamonds: 1000, price: 1.15, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هابي شات', diamonds: 2000, price: 1.05, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'Bobo chat', diamonds: 20000, price: 1.05, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'توب توب', diamonds: 15000, price: 1.1, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'دريم شات', diamonds: 50, price: 0.1, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'الو شات', diamonds: 10000, price: 0.1, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'وياك شات', diamonds: 500000, price: 1.12, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'بيب لايف', diamonds: 1000, price: 1.1, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'غولد شات', diamonds: 500, price: 0.70, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'مانغو لايف', diamonds: 5000, price: 1.22, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'مان شات', diamonds: 5000, price: 1.4, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ستار ميكر', diamonds: 200, price: 2.12, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'واهو شات', diamonds: 10000, price: 1.1, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'فور فان شات', diamonds: 20000, price: 1.25, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'لايكي لايف', diamonds: 50, price: 0.99, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هيو شات', diamonds: 2500, price: 1.3, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'كوكو شات', diamonds: 8000, price: 0.9, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'تامي', diamonds: 10000, price: 0.810, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'يوهو شات', diamonds: 10000, price: 1.090, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'لاما شات', diamonds: 3000, price: 1.040, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ميكو شات', diamonds: 3250, price: 1.085, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ازال لايف', diamonds: 1000, price: 0.85, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هوني جار', diamonds: 200, price: 1.56, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'اهلان شات', diamonds: 2500, price: 0.83, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ويغو بارتي', diamonds: 10000, price: 0.84, category: 'party', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'يويو شات', diamonds: 1000, price: 0.76, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'بوبو لايف', diamonds: 15000, price: 1.58, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سلام شات', diamonds: 105000, price: 1.008, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'تالك تالك', diamonds: 1500, price: 1.28, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'بينمو شات', diamonds: 2000, price: 0.86, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ميغو شات', diamonds: 10000, price: 1.11, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ليغو لايف', diamonds: 1000, price: 1.193, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ليلا تشات', diamonds: 1000, price: 0.225, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'يوي تشات', diamonds: 10000, price: 0.966, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سويو', diamonds: 10000, price: 0.815, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سول شات', diamonds: 6000, price: 0.930, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'فانسي لايف', diamonds: 10000, price: 0.61, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'لايت شات', diamonds: 3000, price: 1.05, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'اولاميت شات', diamonds: 8000, price: 1.162, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سوغو', diamonds: 7500, price: 1.063, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سوبر لايف', diamonds: 150, price: 0.999, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هامي بارتي', diamonds: 10000, price: 0.999, category: 'party', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'اوبا لايف', diamonds: 9000, price: 1.05, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ليام شات', diamonds: 20000, price: 1.099, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'يامي ستار', diamonds: 1600000, price: 1.183, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هاي بلاي', diamonds: 1000, price: 0.910, category: 'party', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'وصلة تشات', diamonds: 1000, price: 0.350, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ليونز تشات', diamonds: 1000, price: 0.15, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هلا مي', diamonds: 15000, price: 1.277, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'جانكو', diamonds: 50000, price: 1.005, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'مرحبا شات', diamonds: 1500000, price: 1.053, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'جيمي لايف', diamonds: 1000, price: 0.132, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'عمار شات', diamonds: 1500, price: 1.23, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'يوبي لايف', diamonds: 500, price: 0.556, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'آمو شات', diamonds: 1000, price: 0.071, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'شاميت تشات', diamonds: 15000, price: 2.572, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هيغو لايف', diamonds: 100, price: 0.122, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ايمو شات', diamonds: 5000, price: 0.571, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هاي بارتي', diamonds: 10000, price: 1.105, category: 'party', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'كواي', diamonds: 200, price: 2.088, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'بارتي هيرو', diamonds: 50, price: 0.995, category: 'party', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هووبي', diamonds: 50, price: 0.994, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'آشا لايف', diamonds: 10000, price: 1.248, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سوماتش', diamonds: 10000, price: 1.278, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'اوهلا', diamonds: 1500, price: 1.099, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'صدفة', diamonds: 20000, price: 1.03, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'كارني', diamonds: 1500, price: 1.187, category: 'party', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ديتو', diamonds: 7000, price: 1.981, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سما شات', diamonds: 10000, price: 1.030, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'غوغو شات', diamonds: 500, price: 0.389, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'فالا', diamonds: 170000, price: 0.361, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'جالا ستار', diamonds: 3000, price: 0.830, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سعادة شات', diamonds: 1000, price: 1.065, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'فوفو شات', diamonds: 100000, price: 0.879, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ياهلا شات', diamonds: 15000, price: 2.31, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هيا شات', diamonds: 500, price: 7.92, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سهرة', diamonds: 1400, price: 1.005, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'بوتا لايف', diamonds: 50000, price: 1.292, category: 'live', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'زار شات', diamonds: 25000, price: 1.010, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'اور تالك', diamonds: 33000, price: 0.86, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'لادو', diamonds: 1000, price: 0.922, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'هوبي ستار', diamonds: 1000000, price: 0.80, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'كاراك', diamonds: 50000, price: 0.782, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'روح شات', diamonds: 2100, price: 0.2, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'يوكي', diamonds: 20000, price: 1.235, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'سايا', diamonds: 5000, price: 0.885, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'وي شيل', diamonds: 12000, price: 0.991, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'فيلا شات', diamonds: 40000, price: 1.100, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'يومي', diamonds: 45000, price: 0.981, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ديكا', diamonds: 100000, price: 1.43, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'واوو', diamonds: 30000, price: 1.03, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'شباب شات', diamonds: 39000, price: 0.907, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
  { name: 'ويل شيل', diamonds: 12000, price: 1.005, category: 'chat', icon: '💎', color: 'from-blue-500 to-purple-500' },
];

import { formatPrice, getCurrency } from "../lib/currency";

export default function SoulShell() {
  const navigate = useNavigate();
  const [currentFilter, setCurrentFilter] = useState('all');
  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState<'USD' | 'SYP'>(getCurrency());
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    // Set initial quantities
    setQuantities(apps.reduce((acc, _, idx) => ({ ...acc, [idx]: 1000 }), {}));

    trackSectionVisit("تطبيقات الدردشة (SoulShell)");
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

  const getDocPrice = (app: any) => {
    return customPrices[app.name] !== undefined ? customPrices[app.name] : app.price;
  };

  const toggleCurrency = () => {
    const newCurrency = currency === 'USD' ? 'SYP' : 'USD';
    localStorage.setItem('wsimCurrency', newCurrency);
    window.dispatchEvent(new Event('currencyChange'));
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);

  const filteredApps = apps.filter(app => {
    const matchesCategory = currentFilter === 'all' || app.category === currentFilter;
    const matchesSearch = !search || app.name.includes(search);
    return matchesCategory && matchesSearch;
  });

  const handleChargeClick = (app: any, index: number) => {
    const qty = quantities[index] || app.diamonds;
    const activePrice = getDocPrice(app);
    const price = ((activePrice / app.diamonds) * qty).toFixed(2);
    setSelectedApp({ ...app, qty, price });
    setIsModalOpen(true);
  };

  const confirmOrder = (productId: string, identityNumber: string, promoCode?: string) => {
    setIsModalOpen(false);
    // Proceed to payment with all data
    navigate(`/payment?service=${encodeURIComponent(selectedApp.name)}&amount=${selectedApp.price}&pid=${productId}&idnum=${identityNumber}&code=${promoCode || ''}`);
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
          <h1 className="text-3xl md:text-5xl font-bold gradient-text">سول شيل</h1>
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
        
        <div className="flex flex-wrap gap-3 mb-8 overflow-x-auto pb-2">
          {['all', 'live', 'chat', 'party'].map(cat => (
            <button
              key={cat}
              onClick={() => setCurrentFilter(cat)}
              className={`px-6 py-2 rounded-full border transition-all whitespace-nowrap ${
                currentFilter === cat ? 'bg-white/30 border-white text-white' : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
              }`}
            >
              {cat === 'all' && 'جميع التطبيقات'}
              {cat === 'live' && <><Video className="inline ml-2" size={16} />البث المباشر</>}
              {cat === 'chat' && <><MessageSquare className="inline ml-2" size={16} />تطبيقات الدردشة</>}
              {cat === 'party' && <><Users className="inline ml-2" size={16} />تطبيقات الحفلات</>}
            </button>
          ))}
        </div>

        <div className="max-w-xl mx-auto relative">
          <input 
            type="text" 
            placeholder="ابحث عن التطبيق..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-full bg-white/10 border border-white/20 text-white px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/60" />
        </div>
      </header>

      <main className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app, idx) => {
            const originalIndex = apps.indexOf(app);
            const qty = quantities[originalIndex] || app.diamonds;
            const activePrice = getDocPrice(app);
            const totalPrice = ((activePrice / app.diamonds) * qty).toFixed(2);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-glass rounded-3xl p-6 text-center hover:scale-105 transition-all group"
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${app.color} rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg group-hover:rotate-6 transition-transform`}>
                  {app.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{app.name}</h3>
                <p className="text-white/60 text-sm mb-4">
                  {app.diamonds} قطعة - {formatPrice(activePrice, currency)}
                </p>

                <div className="mb-6">
                  <label className="block text-white/70 text-sm mb-2">الكمية المطلوبة:</label>
                  <input 
                    type="number" 
                    value={qty}
                    onChange={(e) => setQuantities({ ...quantities, [originalIndex]: Number(e.target.value) })}
                    className="w-full bg-black/20 text-white border border-white/10 rounded-xl px-4 py-2 text-center focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div className="flex justify-between items-center mb-6 px-4">
                  <span className="text-white/70 text-sm">السعر الإجمالي:</span>
                  <span className="text-green-400 font-bold text-lg">{formatPrice(totalPrice, currency)}</span>
                </div>

                <button 
                  onClick={() => handleChargeClick(app, originalIndex)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  شحن الآن
                </button>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* The Requested Order Modal */}
      {selectedApp && (
        <OrderModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={confirmOrder}
          serviceName={selectedApp.name}
          amount={selectedApp.price}
        />
      )}

      <footer className="py-12 mt-20 opacity-40 text-center">
        <p>© 2026 وسيم ستور. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
}
