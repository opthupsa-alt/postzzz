import React, { useState } from 'react';
import { Zap, Mail, Lock, ArrowLeft, Loader2, ShieldCheck, AlertCircle, User } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { signup, ApiError } from '../lib/api';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      setIsLoading(false);
      return;
    }

    try {
      await signup(name, email, password);
      navigate('/app/dashboard');
    } catch (err) {
      const apiError = err as ApiError;
      if (apiError.statusCode === 409) {
        setError('هذا البريد الإلكتروني مسجل مسبقاً');
      } else if (apiError.statusCode === 400) {
        setError(apiError.message || 'بيانات غير صالحة');
      } else {
        setError(apiError.message || 'حدث خطأ أثناء إنشاء الحساب');
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
          <h2 className="text-5xl font-black leading-tight mb-6">ابدأ رحلتك نحو مبيعات أذكى</h2>
          <p className="text-xl text-blue-100 max-w-lg font-medium leading-relaxed">انضم لآلاف الشركات التي تستخدم ليدززز لتحويل البيانات إلى فرص مبيعات حقيقية.</p>
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
            <h3 className="text-4xl font-black text-gray-900 tracking-tight">إنشاء حساب جديد</h3>
            <p className="text-gray-500 mt-2 font-medium">ابدأ تجربتك المجانية الآن</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text" 
                  required
                  placeholder="أحمد محمد" 
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-4 pl-12 text-lg font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

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
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="password" 
                  required
                  minLength={8}
                  placeholder="8 أحرف على الأقل" 
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
                <>إنشاء الحساب <ArrowLeft size={24} /></>
              )}
            </button>
          </form>

          <div className="pt-10 border-t border-gray-50 flex flex-col items-center gap-4">
             <p className="text-gray-400 text-sm font-medium">لديك حساب؟ <Link to="/login" className="text-blue-600 font-bold hover:underline">تسجيل الدخول</Link></p>
             <div className="flex gap-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest">
               <button className="hover:text-gray-500">سياسة الخصوصية</button>
               <button className="hover:text-gray-500">شروط الاستخدام</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
