
import React, { useState } from 'react';
import { Zap, Mail, ArrowRight, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate sending reset link
    setTimeout(() => {
      setIsLoading(false);
      setIsSent(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      {/* Visual Side */}
      <div className="hidden md:flex md:w-1/2 bg-gray-900 p-12 flex-col justify-between text-white relative">
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-xl">
            <Zap size={32} fill="white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">ليدززز</h1>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-5xl font-black leading-tight mb-6">الأمان والخصوصية في قلب ليدززز</h2>
          <p className="text-xl text-gray-400 max-w-lg font-medium leading-relaxed">نظامنا يتبع أعلى معايير الأمان العالمية لضمان حماية بيانات عملائك وسرية تقارير مبيعاتك.</p>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/5 w-fit">
           <div className="p-3 bg-white/10 rounded-2xl"><ShieldCheck size={28} className="text-blue-400" /></div>
           <div>
             <p className="text-sm font-black uppercase tracking-widest">Recovery Vault</p>
             <p className="text-xs opacity-70">نظام استعادة كلمات المرور مشفر ومؤمن</p>
           </div>
        </div>

        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[150px] opacity-50 -mr-[400px] -mt-[400px]"></div>
      </div>

      {/* Form Side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-20">
        <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-left-4 duration-700">
          {!isSent ? (
            <>
              <div>
                <Link to="/login" className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2 hover:text-blue-600 transition-colors group">
                    <ArrowRight size={14} className="rtl-flip transition-transform group-hover:translate-x-1" /> عودة لتسجيل الدخول
                </Link>
                <h3 className="text-4xl font-black text-gray-900 tracking-tight">استعادة المرور</h3>
                <p className="text-gray-500 mt-2 font-medium">أدخل بريدك الإلكتروني وسنرسل لك رابطاً مشفراً لإعادة تعيين كلمة مرورك.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">البريد الإلكتروني المسجل</label>
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

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl text-lg font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>إرسال رابط الاستعادة <ArrowRight size={24} className="rtl-flip" /></>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-8 animate-in zoom-in duration-500">
                <div className="bg-green-50 w-24 h-24 rounded-[2rem] flex items-center justify-center text-green-600 mx-auto shadow-xl shadow-green-100 border border-green-100">
                    <CheckCircle2 size={48} />
                </div>
                <div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">تفقد بريدك الآن</h3>
                    <p className="text-gray-500 mt-4 font-bold leading-relaxed">لقد أرسلنا رابط الاستعادة إلى <b>{email}</b>. يرجى تفقد صندوق الوارد والرسائل الترويجية.</p>
                </div>
                <div className="pt-8 flex flex-col gap-4">
                    <Link to="/login" className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl">العودة لتسجيل الدخول</Link>
                    <button onClick={() => setIsSent(false)} className="text-sm font-black text-gray-400 hover:text-blue-600 transition-colors">لم يصلك الرابط؟ إعادة المحاولة</button>
                </div>
            </div>
          )}

          <div className="pt-10 border-t border-gray-50 flex flex-col items-center gap-4">
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

export default ForgotPasswordPage;
