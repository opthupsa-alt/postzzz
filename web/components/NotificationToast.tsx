
import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X, Zap } from 'lucide-react';

export type ToastType = 'SUCCESS' | 'ERROR' | 'INFO' | 'JOB';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
}

const NotificationToast: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Expose a way to trigger toasts globally (simplified for this demo using window event)
  useEffect(() => {
    const handleNewToast = (e: any) => {
      const newToast = { ...e.detail, id: Math.random().toString(36).substr(2, 9) };
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    };

    window.addEventListener('app-toast', handleNewToast);
    return () => window.removeEventListener('app-toast', handleNewToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-6 left-6 z-[200] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div 
          key={toast.id}
          className="pointer-events-auto bg-white border border-gray-100 rounded-[1.5rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.1)] p-5 flex items-start gap-4 min-w-[320px] max-w-md animate-in slide-in-from-left duration-500"
        >
          <div className={`p-2.5 rounded-xl ${
            toast.type === 'SUCCESS' ? 'bg-green-50 text-green-600' :
            toast.type === 'ERROR' ? 'bg-red-50 text-red-600' :
            toast.type === 'JOB' ? 'bg-blue-600 text-white' :
            'bg-blue-50 text-blue-600'
          }`}>
            {toast.type === 'SUCCESS' && <CheckCircle2 size={20} />}
            {toast.type === 'ERROR' && <XCircle size={20} />}
            {toast.type === 'INFO' && <Info size={20} />}
            {toast.type === 'JOB' && <Zap size={20} fill="currentColor" />}
          </div>
          <div className="flex-1">
            <h4 className="font-black text-gray-900 text-sm">{toast.title}</h4>
            <p className="text-xs text-gray-500 font-bold mt-1 leading-relaxed">{toast.message}</p>
          </div>
          <button onClick={() => removeToast(toast.id)} className="text-gray-300 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};

export const showToast = (type: ToastType, title: string, message: string) => {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { type, title, message } }));
};

export default NotificationToast;
