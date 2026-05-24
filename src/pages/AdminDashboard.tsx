import React, { useState, useEffect } from 'react';
import { db, auth, onAuthStateChanged, signOut } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, limit, where, doc, getDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Receipt, 
  TrendingUp, 
  LogOut, 
  LayoutDashboard, 
  ShieldCheck, 
  Clock,
  ExternalLink,
  ChevronRight,
  Package,
  Activity,
  FileSpreadsheet,
  RefreshCw,
  Settings,
  Sparkles,
  Search,
  X,
  ChevronDown,
  Calendar,
  UserPlus,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { AdminRole, AdminUser, ROLE_LABELS } from '../types';
import { deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { formatPrice } from '../lib/currency';

const EXPORT_COLUMNS = [
  { id: 'orderId', label: 'رقم الطلب' },
  { id: 'date', label: 'التاريخ' },
  { id: 'userName', label: 'العميل' },
  { id: 'userEmail', label: 'البريد' },
  { id: 'service', label: 'الخدمة' },
  { id: 'currency', label: 'العملة' },
  { id: 'amount', label: 'المبلغ' },
  { id: 'paymentMethod', label: 'طريقة الدفع' },
  { id: 'note', label: 'ملاحظات' },
  { id: 'referralCode', label: 'كود الترويج' },
];

const ALL_PRODUCTS = [
  // Games
  { key: 'PUBG 60 شدة', name: 'ببجي - 60 شدة', category: 'games', defaultPrice: 0.99 },
  { key: 'PUBG 325 شدات', name: 'ببجي - 325 شدات', category: 'games', defaultPrice: 4.44 },
  { key: 'PUBG 660 شدات', name: 'ببجي - 660 شدات', category: 'games', defaultPrice: 8.50 },
  { key: 'PUBG 1800 شدات', name: 'ببجي - 1800 شدات', category: 'games', defaultPrice: 21.00 },
  { key: 'Jawaker 10000 توكنز', name: 'جواكر - 10000 توكنز', category: 'games', defaultPrice: 1.20 },
  { key: 'FREE FIRE 100 جوهرة', name: 'فري فاير - 100 جوهرة', category: 'games', defaultPrice: 0.93 },
  { key: 'COD 880 CP', name: 'كول أوف ديوتي - 880 CP', category: 'games', defaultPrice: 12.99 },

  // Social Media
  { key: 'متابعين تيك توك', name: 'متابعين تيك توك', category: 'social', defaultPrice: 5.0 },
  { key: 'لايكات تيك توك', name: 'لايكات تيك توك', category: 'social', defaultPrice: 3.0 },
  { key: 'مشاهدات تيك توك', name: 'مشاهدات تيك توك', category: 'social', defaultPrice: 2.0 },
  { key: 'متابعين إنستغرام', name: 'متابعين إنستغرام', category: 'social', defaultPrice: 6.0 },
  { key: 'لايكات إنستغرام', name: 'لايكات إنستغرام', category: 'social', defaultPrice: 4.0 },
  { key: 'أعضاء القنوات', name: 'أعضاء القنوات (تلجرام)', category: 'social', defaultPrice: 4.0 },
  { key: 'مشاهدات الرسائل', name: 'مشاهدات الرسائل (تلجرام)', category: 'social', defaultPrice: 1.0 },

  // Chat Apps
  { key: 'سول شيل', name: 'سول شيل', category: 'chat', defaultPrice: 1.77 },
  { key: 'مجلس', name: 'مجلس', category: 'chat', defaultPrice: 1.07 },
  { key: 'ياهلان', name: 'ياهلان', category: 'chat', defaultPrice: 1.78 },
  { key: 'سول ستار', name: 'سول ستار', category: 'chat', defaultPrice: 1.1 },
  { key: 'بارتي ستار', name: 'بارتي ستار', category: 'chat', defaultPrice: 1.07 },
  { key: 'بيغو لايف', name: 'بيغو لايف', category: 'chat', defaultPrice: 0.89 },
  { key: 'حكي تشان', name: 'حكي تشان', category: 'chat', defaultPrice: 0.76 },
  { key: 'زينا لايف', name: 'زينا لايف', category: 'chat', defaultPrice: 1.09 },
  { key: 'هابي تشات', name: 'هابي تشات', category: 'chat', defaultPrice: 1.07 },
  { key: 'ايومي تشات', name: 'ايومي تشات', category: 'chat', defaultPrice: 0.95 },
  { key: 'هيا تشات', name: 'هيا تشات', category: 'chat', defaultPrice: 1.08 },
  { key: 'أب فن', name: 'أب فن', category: 'chat', defaultPrice: 1.24 },
  { key: 'مولي ستار', name: 'مولي ستار', category: 'chat', defaultPrice: 1.15 },
  { key: 'تادا شات', name: 'تادا شات', category: 'chat', defaultPrice: 1.24 },
  { key: 'نبض شات', name: 'نبض شات', category: 'chat', defaultPrice: 0.075 },
  { key: 'ديمو شات', name: 'ديمو شات', category: 'chat', defaultPrice: 0.95 },
  { key: 'اب لايف', name: 'اب لايف', category: 'chat', defaultPrice: 1.65 },
  { key: 'بيلا شات', name: 'بيلا شات', category: 'chat', defaultPrice: 0.87 },
  { key: 'تاكا شات', name: 'تاكا شات', category: 'chat', defaultPrice: 1.03 },
  { key: 'لامي شات', name: 'لامي شات', category: 'chat', defaultPrice: 0.77 },
  { key: 'هوا شات', name: 'هوا شات', category: 'chat', defaultPrice: 1.188 },
  { key: 'سكاي شات', name: 'سكاي شات', category: 'chat', defaultPrice: 1.15 },
  { key: 'هابي شات', name: 'هابي شات', category: 'chat', defaultPrice: 1.05 },
  { key: 'Bobo chat', name: 'Bobo chat', category: 'chat', defaultPrice: 1.05 },
  { key: 'توب توب', name: 'توب توب', category: 'chat', defaultPrice: 1.1 },
  { key: 'دريم شات', name: 'دريم شات', category: 'chat', defaultPrice: 0.1 },
  { key: 'الو شات', name: 'الو شات', category: 'chat', defaultPrice: 0.1 },
  { key: 'وياك شات', name: 'وياك شات', category: 'chat', defaultPrice: 1.12 },
  { key: 'بيب لايف', name: 'بيب لايف', category: 'chat', defaultPrice: 1.1 },
  { key: 'غولد شات', name: 'غولد شات', category: 'chat', defaultPrice: 0.70 },
  { key: 'مانغو لايف', name: 'مانغو لايف', category: 'chat', defaultPrice: 1.22 },
  { key: 'مان شات', name: 'مان شات', category: 'chat', defaultPrice: 1.4 },
  { key: 'ستار ميكر', name: 'ستار ميكر', category: 'chat', defaultPrice: 2.12 },
  { key: 'واهو شات', name: 'واهو شات', category: 'chat', defaultPrice: 1.1 },
  { key: 'فور فان شات', name: 'فور فان شات', category: 'chat', defaultPrice: 1.25 },
  { key: 'لايكي لايف', name: 'لايكي لايف', category: 'chat', defaultPrice: 0.99 },
  { key: 'هيو شات', name: 'هيو شات', category: 'chat', defaultPrice: 1.3 },
  { key: 'كوكو شات', name: 'كوكو شات', category: 'chat', defaultPrice: 0.9 },
  { key: 'تامي', name: 'تامي', category: 'chat', defaultPrice: 0.810 },
  { key: 'يوهو شات', name: 'يوهو شات', category: 'chat', defaultPrice: 1.090 },
  { key: 'لاما شات', name: 'لاما شات', category: 'chat', defaultPrice: 1.040 },
  { key: 'ميكو شات', name: 'ميكو شات', category: 'chat', defaultPrice: 1.085 },
  { key: 'ازال لايف', name: 'ازال لايف', category: 'chat', defaultPrice: 0.85 },
  { key: 'هوني جار', name: 'هوني جار', category: 'chat', defaultPrice: 1.56 },
  { key: 'اهلان شات', name: 'اهلان شات', category: 'chat', defaultPrice: 0.83 },
  { key: 'ويغو بارتي', name: 'ويغو بارتي', category: 'chat', defaultPrice: 0.84 },
  { key: 'يويو شات', name: 'يويو شات', category: 'chat', defaultPrice: 0.76 },
  { key: 'بوبو لايف', name: 'بوبو لايف', category: 'chat', defaultPrice: 1.58 },
  { key: 'سلام شات', name: 'سلام شات', category: 'chat', defaultPrice: 1.008 },
  { key: 'تالك تالك', name: 'تالك تالك', category: 'chat', defaultPrice: 1.28 },
  { key: 'بينمو شات', name: 'بينمو شات', category: 'chat', defaultPrice: 0.86 },
  { key: 'ميغو شات', name: 'ميغو شات', category: 'chat', defaultPrice: 1.11 },
  { key: 'ليغو لايف', name: 'ليغو لايف', category: 'chat', defaultPrice: 1.193 },
  { key: 'ليلا تشات', name: 'ليلا تشات', category: 'chat', defaultPrice: 0.225 },
  { key: 'يوي تشات', name: 'يوي تشات', category: 'chat', defaultPrice: 0.966 },
  { key: 'سويو', name: 'سويو', category: 'chat', defaultPrice: 0.815 },
  { key: 'سول شات', name: 'سول شات', category: 'chat', defaultPrice: 0.930 },
  { key: 'فانسي لايف', name: 'فانسي لايف', category: 'chat', defaultPrice: 0.61 },
  { key: 'لايت شات', name: 'لايت شات', category: 'chat', defaultPrice: 1.05 },
  { key: 'اولاميت شات', name: 'اولاميت شات', category: 'chat', defaultPrice: 1.162 },
  { key: 'سوغو', name: 'سوغو', category: 'chat', defaultPrice: 1.063 },
  { key: 'سوبر لايف', name: 'سوبر لايف', category: 'chat', defaultPrice: 0.999 },
  { key: 'هامي بارتي', name: 'هامي بارتي', category: 'chat', defaultPrice: 0.999 },
  { key: 'اوبا لايف', name: 'اوبا لايف', category: 'chat', defaultPrice: 1.05 },
  { key: 'ليام شات', name: 'ليام شات', category: 'chat', defaultPrice: 1.099 },
  { key: 'يامي ستار', name: 'يامي ستار', category: 'chat', defaultPrice: 1.183 },
  { key: 'هاي بلاي', name: 'هاي بلاي', category: 'chat', defaultPrice: 0.910 },
  { key: 'وصلة تشات', name: 'وصلة تشات', category: 'chat', defaultPrice: 0.350 },
  { key: 'ليونز تشات', name: 'ليونز تشات', category: 'chat', defaultPrice: 0.15 },
  { key: 'هلا مي', name: 'هلا مي', category: 'chat', defaultPrice: 1.277 },
  { key: 'جانكو', name: 'جانكو', category: 'chat', defaultPrice: 1.005 },
  { key: 'مرحبا شات', name: 'مرحبا شات', category: 'chat', defaultPrice: 1.053 },
  { key: 'جيمي لايف', name: 'جيمي لايف', category: 'chat', defaultPrice: 0.132 },
  { key: 'عمار شات', name: 'عمار شات', category: 'chat', defaultPrice: 1.23 },
  { key: 'يوبي لايف', name: 'يوبي لايف', category: 'chat', defaultPrice: 0.556 },
  { key: 'آمو شات', name: 'آمو شات', category: 'chat', defaultPrice: 0.071 },
  { key: 'شاميت تشات', name: 'شاميت تشات', category: 'chat', defaultPrice: 2.572 },
  { key: 'هيغو لايف', name: 'هيغو لايف', category: 'chat', defaultPrice: 0.122 },
  { key: 'ايمو شات', name: 'ايمو شات', category: 'chat', defaultPrice: 0.571 },
  { key: 'هاي بارتي', name: 'هاي بارتي', category: 'chat', defaultPrice: 1.105 },
  { key: 'كواي', name: 'كواي', category: 'chat', defaultPrice: 2.088 },
  { key: 'بارتي هيرو', name: 'بارتي هيرو', category: 'chat', defaultPrice: 0.995 },
  { key: 'هووبي', name: 'هووبي', category: 'chat', defaultPrice: 0.994 },
  { key: 'آشا لايف', name: 'آشا لايف', category: 'chat', defaultPrice: 1.248 },
  { key: 'سوماتش', name: 'سوماتش', category: 'chat', defaultPrice: 1.278 },
  { key: 'اوهلا', name: 'اوهلا', category: 'chat', defaultPrice: 1.099 },
  { key: 'صدفة', name: 'صدفة', category: 'chat', defaultPrice: 1.03 },
  { key: 'كارني', name: 'كارني', category: 'chat', defaultPrice: 1.187 },
  { key: 'ديتو', name: 'ديتو', category: 'chat', defaultPrice: 1.981 },
  { key: 'سما شات', name: 'سما شات', category: 'chat', defaultPrice: 1.030 },
  { key: 'غوغو شات', name: 'غوغو شات', category: 'chat', defaultPrice: 0.389 },
  { key: 'فالا', name: 'فالا', category: 'chat', defaultPrice: 0.361 },
  { key: 'جالا ستار', name: 'جالا ستار', category: 'chat', defaultPrice: 0.830 },
  { key: 'سعادة شات', name: 'سعادة شات', category: 'chat', defaultPrice: 1.065 },
  { key: 'فوفو شات', name: 'فوفو شات', category: 'chat', defaultPrice: 0.879 },
  { key: 'ياهلا شات', name: 'ياهلا شات', category: 'chat', defaultPrice: 2.31 },
  { key: 'هيا شات', name: 'هيا شات', category: 'chat', defaultPrice: 7.92 },
  { key: 'سهرة', name: 'سهرة', category: 'chat', defaultPrice: 1.005 },
  { key: 'بوتا لايف', name: 'بوتا لايف', category: 'chat', defaultPrice: 1.292 },
  { key: 'زار شات', name: 'زار شات', category: 'chat', defaultPrice: 1.010 },
  { key: 'اور تالك', name: 'اور تالك', category: 'chat', defaultPrice: 0.86 },
  { key: 'لادو', name: 'لادو', category: 'chat', defaultPrice: 0.922 },
  { key: 'هوبي ستار', name: 'هوبي ستار', category: 'chat', defaultPrice: 0.80 },
  { key: 'كاراك', name: 'كاراك', category: 'chat', defaultPrice: 0.782 },
  { key: 'روح شات', name: 'روح شات', category: 'chat', defaultPrice: 0.2 },
  { key: 'يوكي', name: 'يوكي', category: 'chat', defaultPrice: 1.235 },
  { key: 'سايا', name: 'سايا', category: 'chat', defaultPrice: 0.885 },
  { key: 'وي شيل', name: 'وي شيل', category: 'chat', defaultPrice: 0.991 },
  { key: 'فيلا شات', name: 'فيلا شات', category: 'chat', defaultPrice: 1.100 },
  { key: 'يومي', name: 'يومي', category: 'chat', defaultPrice: 0.981 },
  { key: 'ديكا', name: 'ديكا', category: 'chat', defaultPrice: 1.43 },
  { key: 'واوو', name: 'واوو', category: 'chat', defaultPrice: 1.03 },
  { key: 'شباب شات', name: 'شباب شات', category: 'chat', defaultPrice: 0.907 },
  { key: 'ويل شيل', name: 'ويل شيل', category: 'chat', defaultPrice: 1.005 },
];

export default function AdminDashboard() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [sheetId, setSheetId] = useState(localStorage.getItem('wsim_sheet_id') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportDateStart, setExportDateStart] = useState('');
  const [exportDateEnd, setExportDateEnd] = useState('');
  const [selectedColIds, setSelectedColIds] = useState<string[]>(EXPORT_COLUMNS.map(c => c.id));

  // Dynamic price list states
  const [pricesSnapshot, setPricesSnapshot] = useState<Record<string, number>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [priceSearch, setPriceSearch] = useState<string>('');
  const [priceFilter, setPriceFilter] = useState<string>('all');

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const ownerEmails = ["wsh020264@gmail.com", "mohammadali1997mo@gmail.com"];
        try {
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          if (adminDoc.exists()) {
            setIsAdmin(true);
            setRole(adminDoc.data().role as AdminRole || 'viewer');
          } else if (user.email && ownerEmails.includes(user.email)) {
            setIsAdmin(true);
            setRole('owner');
            // Auto-create owner doc if it doesn't exist
            await setDoc(doc(db, 'admins', user.uid), {
              uid: user.uid,
              email: user.email,
              name: user.displayName || 'Owner',
              role: 'owner',
              addedAt: new Date().toISOString()
            });
          } else {
            navigate('/admin/login');
          }
        } catch (e: any) {
          // If offline, check if they are in the owner list as a fallback
          if (e.message?.includes('offline') || e.code === 'unavailable') {
            if (user.email && ownerEmails.includes(user.email)) {
              setIsAdmin(true);
              setRole('owner');
            } else {
              // If not a hardcoded owner and offline (and not in cache), we can't verify
              console.warn("Offline and not in cache, cannot verify admin status");
              navigate('/admin/login');
            }
          } else {
            console.error("Admin check failed", e);
            navigate('/admin/login');
          }
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/admin/login');
      }
    });

    return () => unsubscribeAuth();
  }, [navigate]);

  useEffect(() => {
    if (!isAdmin) return;

    const qInvoices = query(collection(db, 'invoices'), orderBy('date', 'desc'), limit(100));
    const unsubInvoices = onSnapshot(qInvoices, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qUsers = query(collection(db, 'users'), orderBy('lastActive', 'desc'), limit(100));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qStats = query(collection(db, 'stats'), orderBy('visitCount', 'desc'));
    const unsubStats = onSnapshot(qStats, (snapshot) => {
      setStats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubAdmins = onSnapshot(collection(db, 'admins'), (snapshot) => {
      setAdmins(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    const unsubPrices = onSnapshot(collection(db, 'prices'), (snapshot) => {
      const pm: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        pm[doc.id] = doc.data().price;
      });
      setPricesSnapshot(pm);
    });

    return () => {
      unsubInvoices();
      unsubUsers();
      unsubStats();
      unsubAdmins();
      unsubPrices();
    };
  }, [isAdmin]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleSavePrice = async (key: string, newPrice: number) => {
    try {
      if (role !== 'owner' && role !== 'manager') {
        alert("لا تملك صلاحيات لتعديل الأسعار");
        return;
      }
      if (isNaN(newPrice) || newPrice <= 0) {
        alert("يرجى إدخال سعر صحيح أكبر من الصفر");
        return;
      }
      await setDoc(doc(db, 'prices', key), {
        price: Number(newPrice),
        updatedAt: new Date().toISOString()
      });
      setEditingKey(null);
    } catch (err) {
      console.error(err);
      alert("فشل تحديث السعر");
    }
  };

  const handleResetPrice = async (key: string) => {
    try {
      if (role !== 'owner' && role !== 'manager') {
        alert("لا تملك صلاحيات لتعديل الأسعار");
        return;
      }
      await deleteDoc(doc(db, 'prices', key));
      setEditingKey(null);
    } catch (err) {
      console.error(err);
      alert("فشل إعادة تعيين السعر للمصنع");
    }
  };

  const exportToExcel = () => {
    let filtered = [...invoices];
    if (exportDateStart) {
      filtered = filtered.filter(inv => inv.date >= exportDateStart);
    }
    if (exportDateEnd) {
      // Append time to make the end date inclusive of that day
      filtered = filtered.filter(inv => inv.date <= exportDateEnd + 'T23:59:59');
    }

    const data = filtered.map(inv => {
      const row: any = {};
      EXPORT_COLUMNS.forEach(col => {
        if (selectedColIds.includes(col.id)) {
          row[col.label] = inv[col.id] || '-';
        }
      });
      return row;
    });

    if (data.length === 0) {
      alert("لا يوجد فواتير ضمن المعايير المختارة لتصديرها");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المبيعات");
    XLSX.writeFile(wb, `WSim_Sales_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportModalOpen(false);
  };

  const toggleColumn = (id: string) => {
    setSelectedColIds(prev => 
      prev.includes(id) ? prev.filter(colId => colId !== id) : [...prev, id]
    );
  };

  const getSheetsToken = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/spreadsheets');
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setAccessToken(credential.accessToken);
        return credential.accessToken;
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return null;
      }
      if (err?.code === 'auth/popup-blocked') {
        alert("تم حظر النافذة المنبثقة من قبل المتصفح. يرجى تفعيل أو السماح بالنوافذ المنبثقة في متصفحك لإتمام تسجيل الدخول والمزامنة.");
        return null;
      }
      console.error("Auth Error", err);
      alert("يجب تسجيل الدخول بـ Google للمزامنة مع جداول البيانات");
    }
    return null;
  };

  const syncAllToSheets = async () => {
    if (!sheetId) {
      alert("يرجى إدخال معرف الشيت (Spreadsheet ID) أولاً");
      return;
    }
    setIsSyncing(true);
    let token = accessToken;
    if (!token) {
      token = await getSheetsToken();
    }

    if (!token) {
      setIsSyncing(false);
      return;
    }

    try {
      // Sync only the last 10 for safety in a batch, or one by one
      const recent = invoices.slice(0, 5);
      for (const inv of recent) {
        const response = await fetch("/api/sync-to-sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            invoice: inv,
            spreadsheetId: sheetId
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }
      }
      alert("تمت مزامنة آخر 5 عمليات بنجاح");
    } catch (err: any) {
      console.error(err);
      if (err.message === "Failed to fetch") {
        alert("فشل الاتصال بالخادم لمزامنة البيانات.");
      } else {
        alert(`فشل المزامنة: ${err.message}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const saveSheetId = (id: string) => {
    setSheetId(id);
    localStorage.setItem('wsim_sheet_id', id);
  };

  const updateAdminRole = async (id: string, newRole: AdminRole) => {
    if (role !== 'owner') return;
    try {
      await updateDoc(doc(db, 'admins', id), { role: newRole });
    } catch (err) {
      console.error(err);
      alert("فشل تحديث الرتبة");
    }
  };

  const removeAdmin = async (id: string) => {
    if (role !== 'owner') return;
    if (!confirm("هل أنت متأكد من سحب صلاحيات الأدمن من هذا المستخدم؟")) return;
    try {
      await deleteDoc(doc(db, 'admins', id));
    } catch (err) {
      console.error(err);
      alert("فشل سحب الصلاحيات");
    }
  };

  const promoteToAdmin = async (user: any) => {
    if (role !== 'owner') return;
    try {
      await setDoc(doc(db, 'admins', user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.name || 'مستخدم',
        role: 'viewer',
        addedAt: new Date().toISOString()
      });
      alert(`تمت إضافة ${user.name} كأدمن برتبة مشاهد`);
    } catch (err) {
      console.error(err);
      alert("فشل الترقية");
    }
  };

  const getAIInsights = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const response = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoices })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === "Failed to fetch") {
        alert("فشل الاتصال بالخادم. يرجى التأكد من أن الخادم يعمل.");
      } else {
        alert(`فشل تحليل البيانات: ${err.message}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Activity className="text-purple-500 animate-spin" size={48} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-4 md:p-8">
      {/* Sidebar/Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-600/30">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">لوحة التحكم</h1>
            <p className="text-white/40 text-sm">مرحباً بك، وسيم</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={getAIInsights}
            disabled={isAnalyzing || (role !== 'owner' && role !== 'manager')}
            className="px-6 py-3 rounded-xl bg-purple-600/20 border border-purple-600/30 text-purple-400 hover:bg-purple-600/30 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
            AI Insights
          </button>
          <button 
            onClick={() => setIsExportModalOpen(true)}
            disabled={role !== 'owner' && role !== 'manager'}
            className="px-6 py-3 rounded-xl bg-green-600/20 border border-green-600/30 text-green-400 hover:bg-green-600/30 transition-all flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FileSpreadsheet size={18} />
            تصدير Excel
          </button>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <ExternalLink size={18} />
            الموقع
          </button>
          <button 
            onClick={handleLogout}
            className="px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all flex items-center gap-2"
          >
            <LogOut size={18} />
            خروج
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {aiAnalysis && (
          <motion.section 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="card-glass p-8 rounded-3xl border-purple-500/30 bg-purple-500/5"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Sparkles className="text-purple-400" />
                <h3 className="text-xl font-bold">تحليل الذكاء الاصطناعي للمبيعات (WSim AI)</h3>
              </div>
              <button onClick={() => setAiAnalysis(null)} className="text-white/20 hover:text-white">إغلاق</button>
            </div>
            <div className="prose prose-invert max-w-none text-right rtl">
              <div className="markdown-body">
                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
              </div>
            </div>
          </motion.section>
        )}

        {/* Settings Integration */}
        <section className="card-glass p-6 rounded-3xl border-blue-500/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <Settings size={24} />
              </div>
              <div>
                <h3 className="font-bold">مزامنة Google Sheets</h3>
                <p className="text-white/40 text-sm">اربط مبيعاتك مباشرة بجدول بيانات خارجي</p>
              </div>
            </div>
            <div className="flex flex-1 max-w-md w-full gap-2">
              <input 
                type="text" 
                value={sheetId}
                onChange={(e) => saveSheetId(e.target.value)}
                placeholder="Spreadsheet ID (معرف الشيت)"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
              <button 
                onClick={syncAllToSheets}
                disabled={isSyncing || (role !== 'owner' && role !== 'manager')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                مزامنة
              </button>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="card-glass p-6 rounded-3xl border-purple-500/20 flex items-center gap-6"
          >
            <div className="p-4 bg-green-500/10 rounded-2xl text-green-500">
              <Receipt size={32} />
            </div>
            <div>
              <p className="text-white/40 text-sm">إجمالي المبيعات</p>
              <h3 className="text-3xl font-bold">{invoices.length}</h3>
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            className="card-glass p-6 rounded-3xl border-blue-500/20 flex items-center gap-6"
          >
            <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
              <Users size={32} />
            </div>
            <div>
              <p className="text-white/40 text-sm">المستخدمين المسجلين</p>
              <h3 className="text-3xl font-bold">{users.length}</h3>
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
            className="card-glass p-6 rounded-3xl border-orange-500/20 flex items-center gap-6"
          >
            <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500">
              <TrendingUp size={32} />
            </div>
            <div>
              <p className="text-white/40 text-sm">النشاط الكلي</p>
              <h3 className="text-3xl font-bold">
                {stats.reduce((acc, curr) => acc + (curr.visitCount || 0), 0)}
              </h3>
            </div>
          </motion.div>
        </div>

        {/* Price Management Panel */}
        <section className="card-glass p-6 rounded-3xl border-purple-500/10 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp size={22} className="text-purple-400" />
                إدارة أسعار المنتجات والخدمات
              </h2>
              <p className="text-white/40 text-[11px] md:text-xs mt-1">تعديل أسعار المنتجات والخدمات وسيتم تحديثها تلقائياً لدى المشترين في المتجر</p>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={priceSearch}
                onChange={(e) => setPriceSearch(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-purple-500 w-full md:w-48 text-right"
              />
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 w-full md:w-auto text-right"
              >
                <option value="all">جميع الفئات</option>
                <option value="games">🎮 شحن ألعاب</option>
                <option value="social">📣 سوشيال ميديا</option>
                <option value="chat">💬 تطبيقات الدردشة</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
            {(() => {
              const items = ALL_PRODUCTS.filter(prod => {
                const matchesSearch = prod.name.toLowerCase().includes(priceSearch.toLowerCase()) || prod.key.toLowerCase().includes(priceSearch.toLowerCase());
                const matchesCat = priceFilter === 'all' || prod.category === priceFilter;
                return matchesSearch && matchesCat;
              });

              if (items.length === 0) {
                return <div className="col-span-full py-8 text-center text-white/30">لا توجد منتجات مطابقة للبحث</div>;
              }

              return items.map((prod) => {
                const hasCustom = pricesSnapshot[prod.key] !== undefined;
                const currentPrice = hasCustom ? pricesSnapshot[prod.key] : prod.defaultPrice;
                const isEditing = editingKey === prod.key;

                return (
                  <div key={prod.key} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-purple-500/20 transition-all">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="text-right">
                        <h4 className="font-bold text-sm leading-tight">{prod.name}</h4>
                        <span className="text-[9px] text-white/30 mt-1 block">
                          {prod.category === 'games' ? '🎮 شحن ألعاب' : prod.category === 'social' ? '📣 سوشيال ميديا' : '💬 تطبيقات دردشة'}
                        </span>
                      </div>
                      <div className="text-left font-mono text-sm leading-tight flex flex-col items-end">
                        {hasCustom ? (
                          <>
                            <span className="text-purple-400 font-bold">${currentPrice}</span>
                            <span className="text-[9px] text-white/30 line-through">الأصل: ${prod.defaultPrice}</span>
                          </>
                        ) : (
                          <span className="text-white/60">${prod.defaultPrice}</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      {isEditing ? (
                        <div className="flex gap-2 w-full">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editingPrice}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            className="bg-zinc-900 border border-purple-500 rounded-xl px-2 py-1 text-xs text-white focus:outline-none w-20 text-center font-mono"
                            placeholder="السعر"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSavePrice(prod.key, parseFloat(editingPrice))}
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-3 py-1 text-[10px] font-bold flex-1"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-2 py-1 text-[10px] font-bold"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <button
                            disabled={role !== 'owner' && role !== 'manager'}
                            onClick={() => {
                              setEditingKey(prod.key);
                              setEditingPrice(currentPrice.toString());
                            }}
                            className="bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/30 transition-all rounded-xl py-1 text-[10px] font-bold flex-1 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            تعديل السعر
                          </button>
                          {hasCustom && (
                            <button
                              disabled={role !== 'owner' && role !== 'manager'}
                              onClick={() => handleResetPrice(prod.key)}
                              className="bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all rounded-xl px-2 py-1 text-[9px] font-bold disabled:opacity-30 disabled:cursor-not-allowed text-center"
                              title="إعادة السعر للمصنع"
                            >
                              افتراضي
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Invoices */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Receipt className="text-purple-400" />
                آخر فواتير المبيعات
              </h2>
            </div>
            <div className="space-y-4">
              {invoices.length === 0 ? (
                <div className="text-center py-12 card-glass rounded-3xl opacity-40">لا توجد فواتير بعد</div>
              ) : (
                invoices.map((inv) => (
                  <motion.div 
                    key={inv.id}
                    layoutId={inv.id}
                    className="card-glass p-6 rounded-2xl border-white/5 hover:border-white/20 transition-all flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg">{inv.service}</span>
                        <div className="flex gap-1">
                          <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full ${
                            inv.paymentMethod === 'stripe' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {inv.paymentMethod}
                          </span>
                          {inv.referralCode && (
                            <span className="text-[9px] bg-white/10 text-white/40 px-2 py-0.5 rounded-full font-mono">
                              {inv.referralCode}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-white/40 text-sm">{inv.userName} • {inv.userEmail}</p>
                      <p className="text-white/20 text-[10px] font-mono">{inv.orderId}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-bold text-xl">
                        {inv.currency === 'SYP' ? formatPrice(inv.amount, 'SYP') : `$${inv.amount}`}
                      </div>
                      <div className="text-white/30 text-[10px] flex items-center gap-1 justify-end">
                        {inv.currency === 'SYP' && <span className="mr-1">(${inv.amount} USD)</span>}
                        <Clock size={12} />
                        {inv.date}
                      </div>
                      {inv.note && (
                        <div className="mt-2 text-[10px] text-purple-400/80 italic text-right">
                          💡 {inv.note}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: User list & Section usage */}
          <div className="space-y-8">
            {/* Registered Users */}
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="text-blue-400" />
                آخر المستخدمين
              </h2>
              <div className="card-glass rounded-3xl overflow-hidden">
                <div className="divide-y divide-white/5">
                  {users.length === 0 ? (
                    <div className="p-8 text-center text-white/30">لا يوجد مستخدمون</div>
                  ) : (
                    users.map((u) => (
                      <div key={u.id} className="p-4 hover:bg-white/5 transition-all flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                          {u.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">{u.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                             <p className="text-white/40 text-[10px] truncate">{u.email}</p>
                             <span className="text-blue-400 text-[10px] font-mono">{u.referralCode}</span>
                             {u.method && (
                               <span className={`text-[9px] px-2 py-0.5 rounded-md leading-none ${
                                 u.method === 'Google' ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                               }`}>
                                 {u.method}
                               </span>
                             )}
                          </div>
                        </div>
                        {role === 'owner' && !admins.find(a => a.uid === u.uid) && (
                          <button 
                            onClick={() => promoteToAdmin(u)}
                            className="p-2 hover:bg-green-500/10 text-green-500 rounded-lg transition-all"
                            title="ترقية إلى أدمن"
                          >
                            <UserPlus size={16} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Admin Roles Management (OWNER ONLY) */}
            {role === 'owner' && (
              <section className="space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <ShieldAlert className="text-red-400" />
                  إدارة فريق العمل
                </h2>
                <div className="card-glass rounded-3xl overflow-hidden p-6 space-y-6">
                  {/* Create Admin Form */}
                  <div className="bg-purple-600/5 border border-purple-600/10 rounded-2xl p-6 mb-4">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                       <UserPlus size={16} className="text-purple-400" />
                       إضافة عضو جديد للفريق
                    </h3>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const email = formData.get('email') as string;
                        const name = formData.get('name') as string;
                        const newAdminRole = formData.get('role') as AdminRole;
                        
                        if (!email || !name) return;
                        
                        try {
                          // Check if user already exists in users collection to get UID
                          const userQuery = query(collection(db, 'users'), where('email', '==', email));
                          const userSnap = await getDocs(userQuery);
                          
                          let uid = email; // Fallback to email as ID
                          if (!userSnap.empty) {
                            uid = userSnap.docs[0].id;
                          }

                          await setDoc(doc(db, 'admins', uid), {
                            uid: uid === email ? null : uid,
                            email,
                            name,
                            role: newAdminRole,
                            addedAt: new Date().toISOString()
                          });
                          
                          alert("تمت إضافة العضو بنجاح");
                          (e.target as HTMLFormElement).reset();
                        } catch (err) {
                          console.error(err);
                          alert("فشل إضافة العضو");
                        }
                      }}
                      className="grid grid-cols-1 md:grid-cols-4 gap-4"
                    >
                      <input 
                        name="email" 
                        type="email" 
                        placeholder="البريد الإلكتروني" 
                        required
                        className="bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none"
                      />
                      <input 
                        name="name" 
                        type="text" 
                        placeholder="الاسم الكامل" 
                        required
                        className="bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none"
                      />
                      <select 
                        name="role"
                        className="bg-[#0a0a0c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500 outline-none"
                      >
                        <option value="viewer">مشاهد (Viewer)</option>
                        <option value="manager">مدير (Manager)</option>
                      </select>
                      <button 
                        type="submit"
                        className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-3 font-bold text-sm transition-all shadow-lg shadow-purple-600/20"
                      >
                        إضافة
                      </button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    {admins.map((adm: any) => (
                    <div key={adm.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
                          {adm.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold">{adm.name}</p>
                          <p className="text-white/40 text-[10px]">{adm.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <select 
                          value={adm.role}
                          onChange={(e) => updateAdminRole(adm.id, e.target.value as AdminRole)}
                          className="bg-[#0a0a0c] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-purple-500 transition-all font-bold"
                        >
                          {Object.entries(ROLE_LABELS).map(([rId, label]) => (
                            <option key={rId} value={rId}>{label}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => removeAdmin(adm.id)}
                          className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all"
                          title="سحب الصلاحيات"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

            {/* Most Used Sections */}
            <section className="space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Package className="text-orange-400" />
                إحصائيات الأقسام
              </h2>
              <div className="card-glass p-6 rounded-3xl space-y-4">
                {stats.slice(0, 5).map((s, idx) => (
                  <div key={s.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="truncate max-w-[150px]">{s.section}</span>
                      <span className="font-bold">{s.visitCount} زيارة</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((s.visitCount / (stats[0]?.visitCount || 1)) * 100, 100)}%` }}
                        className={`h-full rounded-full ${
                          idx === 0 ? 'bg-purple-500' : idx === 1 ? 'bg-blue-500' : 'bg-orange-500'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Export Customization Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#121214] border border-white/10 p-8 rounded-[2rem] max-w-2xl w-full text-right"
          >
            <div className="flex justify-between items-center mb-8">
              <button onClick={() => setIsExportModalOpen(false)} className="text-white/40 hover:text-white transition-all">
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                تخصيص تصدير Excel
                <FileSpreadsheet className="text-green-500" />
              </h2>
            </div>

            <div className="space-y-8">
              {/* Date Filters */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 justify-end">
                  تحديد الفترة الزمنية
                  <Calendar size={18} className="text-blue-400" />
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-white/40 text-xs text-right block">إلى</label>
                    <input 
                      type="date" 
                      value={exportDateEnd}
                      onChange={(e) => setExportDateEnd(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-white/40 text-xs text-right block">من</label>
                    <input 
                      type="date" 
                      value={exportDateStart}
                      onChange={(e) => setExportDateStart(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Column Selection */}
              <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 justify-end">
                  الأعمدة المطلوب تضمينها
                  <Settings size={18} className="text-purple-400" />
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {EXPORT_COLUMNS.map(col => (
                    <button
                      key={col.id}
                      onClick={() => toggleColumn(col.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                        selectedColIds.includes(col.id) 
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300' 
                          : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  onClick={() => setIsExportModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl border border-white/10 text-white hover:bg-white/5 font-bold"
                >
                  إلغاء
                </button>
                <button 
                  onClick={exportToExcel}
                  className="flex-1 py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                >
                  <FileSpreadsheet size={20} />
                  تأكيد التصدير
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
