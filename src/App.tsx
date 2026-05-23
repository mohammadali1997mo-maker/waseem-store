/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WifiOff } from "lucide-react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Games from "./pages/Games";
import SoulShell from "./pages/SoulShell";
import SocialServices from "./pages/SocialServices";
import Payment from "./pages/Payment";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";

function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] lg:left-auto lg:w-80">
      <div className="bg-red-500/90 backdrop-blur-md text-white p-4 rounded-2xl border border-red-400/30 flex items-center gap-3 shadow-2xl animate-bounce">
        <WifiOff size={24} />
        <div>
          <p className="font-bold text-sm">أنت تعمل في وضع عدم الاتصال</p>
          <p className="text-[10px] opacity-80">ستتم مزامنة البيانات عند العودة للاتصال.</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div dir="rtl" className="font-sans">
        <OfflineBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/games" element={<Games />} />
          <Route path="/soul-shell" element={<SoulShell />} />
          <Route path="/social-services" element={<SocialServices />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
        </Routes>
      </div>
    </Router>
  );
}
