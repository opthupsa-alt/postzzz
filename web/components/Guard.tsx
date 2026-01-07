
import React from 'react';
import { Lock, ShieldAlert } from 'lucide-react';

interface GuardProps {
  children: React.ReactNode;
  role?: 'ADMIN' | 'SALES' | 'MANAGER';
  fallback?: React.ReactNode;
}

const Guard: React.FC<GuardProps> = ({ children, role = 'SALES', fallback }) => {
  // Simple mock: assume current user is ADMIN for now, but logic is ready
  const userRole = 'ADMIN'; 
  
  const hasAccess = userRole === 'ADMIN' || userRole === role;

  if (!hasAccess) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2.5rem] text-gray-400">
        <Lock size={48} className="mb-4" />
        <p className="font-black text-lg">هذا الجزء يتطلب صلاحيات {role === 'ADMIN' ? 'مدير' : 'متقدمة'}</p>
        <p className="text-xs font-bold mt-2 uppercase tracking-widest">يرجى التواصل مع مسؤول النظام</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default Guard;
