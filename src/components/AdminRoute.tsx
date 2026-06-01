import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  // تم إلغاء التحقق وكلمات المرور بالكامل للسماح بالدخول المباشر للشريك في سوريا
  return <>{children}</>;
}
