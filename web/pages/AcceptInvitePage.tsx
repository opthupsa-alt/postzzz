import React, { useState, useEffect } from 'react';
import { Zap, Users, ArrowRight, Loader2, CheckCircle2, XCircle, Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { apiRequest, setToken, setStoredUser, setStoredTenant } from '../lib/api';

interface InviteDetails {
  email: string;
  role: string;
  tenantName: string;
  inviterName: string;
  expiresAt: string;
}

const AcceptInvitePage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // For new user registration
  const [isNewUser, setIsNewUser] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const validateInvite = async () => {
      if (!token) {
        setIsValid(false);
        setIsLoading(false);
        return;
      }

      try {
        const result = await apiRequest<{ valid: boolean; invite?: InviteDetails; isNewUser?: boolean }>(
          `/invites/${token}/validate`
        );
        
        if (result.valid && result.invite) {
          setIsValid(true);
          setInviteDetails(result.invite);
          setIsNewUser(result.isNewUser || false);
        } else {
          setIsValid(false);
        }
      } catch (err: any) {
        setIsValid(false);
        setError(err.message || 'الدعوة غير صالحة');
      } finally {
        setIsLoading(false);
      }
    };

    validateInvite();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAccepting(true);
    setError('');

    try {
      const body: any = {};
      
      if (isNewUser) {
        if (!name || !password) {
          setError('يرجى ملء جميع الحقول');
          setIsAccepting(false);
          return;
        }
        body.name = name;
        body.password = password;
      }

      const result = await apiRequest<{
        token: string;
        user: any;
        tenantId: string;
        role: string;
      }>(`/invites/${token}/accept`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      // Auto-login
      setToken(result.token);
      setStoredUser(result.user);
      setStoredTenant(result.tenantId, result.role);
      
      setIsSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء قبول الدعوة');
    } finally {
      setIsAccepting(false);
    }
  };

  const roleAr: Record<string, string> = {
    OWNER: 'مالك',
    ADMIN: 'مدير',
    MANAGER: 'مدير فريق',
    SALES: 'مندوب مبيعات',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
          <p className="text-gray-500 font-bold">جاري التحقق من الدعوة...</p>
        </div>
      </div>
    );
  }

  if (!token || !isValid) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-6">
          <div className="bg-red-50 w-24 h-24 rounded-[2rem] flex items-center justify-center text-red-600 mx-auto shadow-xl shadow-red-100 border border-red-100">
            <XCircle size={48} />
          </div>
          <h2 className="text-3xl font-black text-gray-900">دعوة غير صالحة</h2>
          <p className="text-gray-500 font-bold">
            {error || 'هذه الدعوة غير صالحة أو منتهية الصلاحية. يرجى التواصل مع مدير الفريق للحصول على دعوة جديدة.'}
          </p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all"
          >
            تسجيل الدخول
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
          <h2 className="text-5xl font-black leading-tight mb-6">انضم إلى الفريق! 🎉</h2>
          <p className="text-xl text-gray-400 max-w-lg font-medium leading-relaxed">
            لقد تمت دعوتك للانضمام إلى فريق {inviteDetails?.tenantName}. اقبل الدعوة للبدء في العمل معهم.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/5 w-fit">
          <div className="p-3 bg-white/10 rounded-2xl"><Users size={28} className="text-blue-400" /></div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest">دعوة من</p>
            <p className="text-xs opacity-70">{inviteDetails?.inviterName}</p>
          </div>
        </div>

        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-900/20 rounded-full blur-[150px] opacity-50 -mr-[400px] -mt-[400px]"></div>
      </div>

      {/* Form Side */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 md:p-20">
        <div className="w-full max-w-md space-y-10 animate-in fade-in slide-in-from-left-4 duration-700">
          {!isSuccess ? (
            <>
              <div>
                <h3 className="text-4xl font-black text-gray-900 tracking-tight">قبول الدعوة</h3>
                <p className="text-gray-500 mt-2 font-medium">
                  تمت دعوتك للانضمام إلى <strong>{inviteDetails?.tenantName}</strong> بصفة <strong>{roleAr[inviteDetails?.role || ''] || inviteDetails?.role}</strong>.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">البريد الإلكتروني</span>
                  <span className="font-bold text-gray-900">{inviteDetails?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">الدور</span>
                  <span className="font-bold text-blue-600">{roleAr[inviteDetails?.role || ''] || inviteDetails?.role}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">المنظمة</span>
                  <span className="font-bold text-gray-900">{inviteDetails?.tenantName}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-bold">
                  {error}
                </div>
              )}

              <form onSubmit={handleAccept} className="space-y-6">
                {isNewUser && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">الاسم الكامل</label>
                      <input 
                        type="text"
                        required
                        placeholder="أحمد محمد" 
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-4 text-lg font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">كلمة المرور</label>
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
                  </>
                )}

                <button 
                  type="submit" 
                  disabled={isAccepting}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl text-lg font-black shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isAccepting ? (
                    <Loader2 className="animate-spin" size={24} />
                  ) : (
                    <>قبول الدعوة والانضمام <ArrowRight size={24} className="rtl-flip" /></>
                  )}
                </button>

                <p className="text-center text-sm text-gray-400">
                  لديك حساب بالفعل؟{' '}
                  <Link to="/login" className="text-blue-600 font-bold hover:underline">
                    تسجيل الدخول
                  </Link>
                </p>
              </form>
            </>
          ) : (
            <div className="text-center space-y-8 animate-in zoom-in duration-500">
              <div className="bg-green-50 w-24 h-24 rounded-[2rem] flex items-center justify-center text-green-600 mx-auto shadow-xl shadow-green-100 border border-green-100">
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight">مرحباً بك في الفريق! 🎉</h3>
                <p className="text-gray-500 mt-4 font-bold leading-relaxed">
                  تم قبول الدعوة بنجاح. جاري تحويلك إلى لوحة التحكم...
                </p>
              </div>
              <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
