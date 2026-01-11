import React, { useState, useEffect } from 'react';
import { Zap, Lock, ArrowRight, Loader2, ShieldCheck, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setIsTokenValid(false);
        return;
      }

      try {
        const result = await apiRequest<{ valid: boolean; message?: string }>(
          `/auth/validate-reset-token?token=${token}`
        );
        setIsTokenValid(result.valid);
      } catch (err) {
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    setIsLoading(true);

    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-500 font-bold">جاري التحقق من الرابط...</p>
        </div>
      </div>
    );
  }

  if (!token || !isTokenValid) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-6">
          <div className="bg-red-50 w-24 h-24 rounded-[2rem] flex items-center justify-center text-red-600 mx-auto shadow-xl shadow-red-100 border border-red-100">
            <XCircle size={48} />
          </div>
          <h2 className="text-3xl font-black text-gray-900">رابط غير صالح</h2>
          <p className="text-gray-500 font-bold">
            هذا الرابط غير صالح أو منتهي الصلاحية. يرجى طلب رابط جديد لإعادة تعيين كلمة المرور.
          </p>
          <Link
            to="/forgot-password"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all"
          >
            طلب رابط جديد
          </Link>
        </div>
      </div>
    );
  }

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
          <h2 className="text-5xl font-black leading-tight mb-6">إعادة تعيين كلمة المرور</h2>
          <p className="text-xl text-gray-400 max-w-lg font-medium leading-relaxed">
            اختر كلمة مرور قوية وآمنة لحماية حسابك.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/5 w-fit">
          <div className="p-3 bg-white/10 rounded-2xl"><ShieldCheck size={28} className="text-green-400" /></div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest">تشفير متقدم</p>
            <p className="text-xs opacity-70">كلمات المرور مشفرة بأعلى معايير الأمان</p>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-green-900/20 rounded-full blur-[150px] opacity-50 -mr-[400px] -mt-[400px]"></div>
      </div>

      {/* Form Side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-20">
        <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-left-4 duration-700">
          {!isSuccess ? (
            <>
              <div>
                <Link to="/login" className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2 hover:text-blue-600 transition-colors group">
                  <ArrowRight size={14} className="rtl-flip transition-transform group-hover:translate-x-1" /> عودة لتسجيل الدخول
                </Link>
                <h3 className="text-4xl font-black text-gray-900 tracking-tight">كلمة مرور جديدة</h3>
                <p className="text-gray-500 mt-2 font-medium">أدخل كلمة المرور الجديدة لحسابك.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <Lock className="absolute left-12 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="••••••••" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-4 pl-20 text-lg font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="••••••••" 
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pr-4 pl-12 text-lg font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                      dir="ltr"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700">
                    💡 كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، وتتضمن حروف كبيرة وصغيرة وأرقام ورموز.
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl text-lg font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>تعيين كلمة المرور الجديدة <ArrowRight size={24} className="rtl-flip" /></>
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
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">تم بنجاح!</h3>
                <p className="text-gray-500 mt-4 font-bold leading-relaxed">
                  تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.
                </p>
              </div>
              <Link 
                to="/login" 
                className="inline-block w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl text-center"
              >
                تسجيل الدخول
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
