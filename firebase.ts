import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user: any) => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const ownerEmails = ["wsh020264@gmail.com", "mohammadali1997mo@gmail.com"];
      if (user.email && ownerEmails.includes(user.email)) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        if (adminDoc.exists()) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Error verifying admin status:", err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0c] text-white p-4">
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-4"></div>
        <p className="text-zinc-400 text-sm font-medium tracking-wide font-sans">جاري التحقق من صلاحيات المشرف...</p>
      </div>
    );
  }

  if (!auth.currentUser) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  if (!isAdmin) {
    // Redirect to home with a clear instruction to display an unauthorized error
    return <Navigate to="/?error=unauthorized" replace />;
  }

  return <>{children}</>;
}
