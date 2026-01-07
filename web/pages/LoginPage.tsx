
import React, { useState } from 'react';
import { Zap, Mail, Lock, ArrowLeft, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { login, ApiError } from '../lib/api';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/app/dashboard');
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.statusCode === 401) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setError(apiError.message || 'حدث خطأ أثناء تسجيل الدخول');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Visual Side */}
      <div className="hidden md:flex md:w-1/2 bg-blue-600 p-12 flex-col justify-between text-white relative">
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white/20 backdrop-blur-md p-2 rounded-2xl border border-white/30 shadow-xl">
            <Zap size={32} fill="white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">ليدززز</h1>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-5xl font-black leading-tight mb-6">حوّل مجهودك إلى صفقات رابحة بذكاء</h2>
          <p className="text-xl text-blue-100 max-w-lg font-medium leading-relaxed">المنصة الأولى في الشرق الأوسط التي تجمع بين دقة بيانات الخرائط وقوة التحليل الذكي وتكامل واتساب الرسمي.</p>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 w-fit">
           <div className="p-3 bg-white/20 rounded-2xl"><ShieldCheck size={28} /></div>
           <div>
             <p className="text-sm font-black uppercase tracking-widest">Enterprise Ready</p>
             <p className="text-xs opacity-70">نظام مشفر وسيرفرات محلية آمنة 100%</p>
           </div>
        </div>

        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500 rounded-full blur-[150px] opacity-50 -mr-[400px] -mt-[400px]"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-700 rounded-full blur-[120px] opacity-40 -ml-[250px] -mb-[250px]"></div>
      </div>

      {/* Form Side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-20">
        <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-left-4 duration-700">
          <div>
            <h3 className="text-4xl font-black text-gray-900 tracking-tight">تسجيل الدخول</h3>
            <p className="text-gray-500 mt-2 font-medium">مرحباً بك مجدداً في نظام مبيعاتك المفضل</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="email" 
                  required
                  placeholder="name@company.com" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-4 pl-12 text-lg font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">كلمة المرور</label>
                <button type="button" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">نسيت كلمة المرور؟</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-4 pl-12 text-lg font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                  dir="ltr"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl text-lg font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>ابدأ العمل الآن <ArrowLeft size={24} /></>
              )}
            </button>
          </form>

          <div className="pt-10 border-t border-gray-50 flex flex-col items-center gap-4">
             <p className="text-gray-400 text-sm font-medium">لا تملك حساباً؟ <button className="text-blue-600 font-bold hover:underline">تواصل مع إدارة الشركة</button></p>
             <div className="flex gap-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
               <button className="hover:text-gray-500">سياسة الخصوصية</button>
               <button className="hover:text-gray-500">شروط الاستخدام</button>
               <button className="hover:text-gray-500">الدعم الفني</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
