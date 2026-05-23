import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, limit, where, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
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

    return () => {
      unsubInvoices();
      unsubUsers();
      unsubStats();
      unsubAdmins();
    };
  }, [isAdmin]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
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
    } catch (err) {
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
                          <div className="flex items-center gap-2">
                             <p className="text-white/40 text-[10px] truncate">{u.email}</p>
                             <span className="text-blue-400 text-[10px] font-mono">{u.referralCode}</span>
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
