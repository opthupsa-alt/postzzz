
import React, { useState } from 'react';
import { 
  User, Shield, Bell, CreditCard, Smartphone, Mail, Save, Lock, 
  ShieldCheck, Zap, History, Globe, CheckCircle2, ChevronLeft,
  Key, Database, LayoutGrid, Code, ExternalLink, Activity,
  ArrowLeft, Copy, Trash2, Plus, X, Loader2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { NotificationPreferences } from '../types';
import PageHeader from '../components/PageHeader';
import { showToast } from '../components/NotificationToast';

const SettingsPage: React.FC = () => {
  const { 
    notificationPreferences, 
    toggleNotificationPreference, 
    connectedPhone, 
    apiKeys, 
    addApiKey, 
    deleteApiKey 
  } = useStore();
  
  const [activeSection, setActiveSection] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  
  // Key Modal State
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast('SUCCESS', 'تم الحفظ', 'تم تحديث إعدادات حسابك بنجاح.');
    }, 1000);
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim()) return;
    
    setIsGenerating(true);
    setTimeout(() => {
      addApiKey(newKeyLabel);
      setIsGenerating(false);
      setShowKeyModal(false);
      setNewKeyLabel('');
      showToast('SUCCESS', 'تم إنشاء المفتاح', 'يمكنك الآن استخدامه للربط البرمجي.');
    }, 1200);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('INFO', 'تم النسخ', 'تم نسخ المفتاح إلى الحافظة.');
  };

  const sections = [
    { id: 'profile', label: 'الملف الشخصي', icon: User },
    { id: 'notifications', label: 'التنبيهات', icon: Bell },
    { id: 'security', label: 'الأمان والخصوصية', icon: Shield },
    { id: 'integrations', label: 'التكاملات والـ API', icon: Code },
    { id: 'billing', label: 'الاشتراك والفواتير', icon: CreditCard },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <PageHeader 
        title="الإعدادات" 
        subtitle="إدارة حسابك، تفضيلات التنبيهات، والأمان"
        actions={
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={18} />
                <span>حفظ التغييرات</span>
              </>
            )}
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-3">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.25rem] transition-all text-sm font-black ${
                activeSection === section.id
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 border border-blue-500'
                  : 'text-gray-500 hover:bg-white hover:shadow-sm border border-transparent'
              }`}
            >
              <section.icon size={22} className={activeSection === section.id ? 'text-white' : 'text-gray-400'} />
              <span>{section.label}</span>
            </button>
          ))}

          <div className="mt-8 p-6 bg-gradient-to-br from-gray-900 to-black rounded-[2rem] text-white space-y-4">
             <div className="flex items-center gap-2">
               <Zap size={16} className="text-blue-400" />
               <p className="text-[10px] font-black uppercase tracking-widest">تحديثات النظام</p>
             </div>
             <p className="text-xs font-bold text-gray-400 leading-relaxed">أنت تستخدم النسخة Enterprise v2.4.0. جميع الخواص مفعلة.</p>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-10 min-h-[650px]">
            {activeSection === 'profile' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="flex items-center gap-8 pb-10 border-b border-gray-50">
                  <div className="relative group">
                    <div className="h-32 w-32 bg-gradient-to-br from-blue-500 to-blue-700 rounded-[2rem] flex items-center justify-center text-white text-5xl font-black border-4 border-white shadow-2xl transition-transform group-hover:scale-105 duration-500">
                      أ
                    </div>
                    <button className="absolute -bottom-2 -right-2 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 text-blue-600 hover:bg-blue-50 transition-colors">
                      <Smartphone size={20} />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-gray-900">أحمد محمد</h3>
                    <p className="text-gray-500 font-bold mt-1">مدير مبيعات • Enterprise Team</p>
                    <div className="flex items-center gap-3 mt-4">
                      <span className="bg-green-50 text-green-600 text-[10px] font-black px-3 py-1 rounded-full border border-green-100 uppercase tracking-widest shadow-sm">Active</span>
                      <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest shadow-sm">Admin</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">الاسم الكامل</label>
                    <input type="text" defaultValue="أحمد محمد" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">البريد الإلكتروني</label>
                    <input type="email" defaultValue="ahmed@leadz.sa" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm font-bold text-left focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner" dir="ltr" />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'integrations' && (
               <div className="space-y-12 animate-in fade-in duration-500">
                  {/* API Keys Banner - Circled in Screen 1 */}
                  <div className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row items-center justify-between group hover:border-blue-100 transition-all relative overflow-hidden">
                     <div className="flex items-center gap-6 relative z-10">
                        <div className="p-5 bg-white rounded-3xl shadow-xl border border-gray-100 group-hover:scale-110 transition-transform duration-500">
                          <Key size={36} className="text-blue-600" />
                        </div>
                        <div className="text-right">
                           <h3 className="text-2xl font-black text-gray-900">مفاتيح الـ API الخاصة بك</h3>
                           <p className="text-gray-400 font-bold text-sm mt-1">استخدم هذه المفاتيح للربط مع أنظمتك الخارجية (CRMs, Apps)</p>
                        </div>
                     </div>
                     <button 
                        onClick={() => setShowKeyModal(true)}
                        className="mt-6 md:mt-0 bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-gray-200 relative z-10 active:scale-95"
                     >
                        إنشاء مفتاح جديد
                     </button>
                     <Zap size={160} className="absolute -bottom-10 -left-10 text-blue-500/5 rotate-12" />
                  </div>

                  {/* List of active keys */}
                  {apiKeys.length > 0 && (
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">المفاتيح النشطة</p>
                      <div className="grid gap-4">
                        {apiKeys.map(key => (
                          <div key={key.id} className="p-6 bg-white border border-gray-100 rounded-3xl flex items-center justify-between group hover:border-blue-200 transition-all shadow-sm">
                            <div className="flex items-center gap-5">
                               <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                                 <ShieldCheck size={24} />
                               </div>
                               <div>
                                 <p className="font-black text-gray-900">{key.label}</p>
                                 <p className="font-mono text-xs text-gray-400 mt-1">{key.key.substring(0, 10)}•••••••••••••</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button 
                                 onClick={() => copyToClipboard(key.key)}
                                 className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                                 title="نسخ المفتاح"
                               >
                                 <Copy size={18} />
                               </button>
                               <button 
                                 onClick={() => deleteApiKey(key.id)}
                                 className="p-3 bg-gray-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                 title="حذف المفتاح"
                               >
                                 <Trash2 size={18} />
                               </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-8">
                     <h4 className="text-xl font-black text-gray-900 flex items-center gap-3">
                        <Database size={24} className="text-blue-600" /> المزامنة السحابية
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="p-8 border border-gray-100 rounded-[2.5rem] space-y-6 hover:border-blue-200 transition-all bg-white shadow-sm group">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
                                  <LayoutGrid size={28} />
                                </div>
                                <h5 className="font-black text-xl text-gray-800">Salesforce CRM</h5>
                              </div>
                           </div>
                           <p className="text-sm text-gray-400 font-bold leading-relaxed">مزامنة العملاء المحتملين تلقائياً مع حساب Salesforce الخاص بالشركة.</p>
                           <button className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100 hover:bg-white transition-all">غير متصل</button>
                        </div>
                        <div className="p-8 border border-blue-100 rounded-[2.5rem] space-y-6 bg-blue-50/20 shadow-sm group relative overflow-hidden">
                           <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl border border-blue-100 shadow-md group-hover:scale-110 transition-transform">
                                  <Globe size={28} className="text-blue-600" />
                                </div>
                                <h5 className="font-black text-xl text-gray-800">Google Maps Enterprise</h5>
                              </div>
                           </div>
                           <p className="text-sm text-blue-800 font-bold leading-relaxed relative z-10">الوصول المباشر لقواعد بيانات Google Maps الرسمية لاستخراج البيانات.</p>
                           <div className="flex items-center gap-2 text-green-600 text-[10px] font-black uppercase tracking-widest bg-white w-fit px-4 py-2 rounded-xl border border-green-100 relative z-10 shadow-sm">
                              <CheckCircle2 size={16} /> متصل ونشط
                           </div>
                           <Zap size={100} className="absolute -bottom-4 -left-4 text-blue-600/5 rotate-12" />
                        </div>
                     </div>
                  </div>
               </div>
            )}

            {activeSection === 'notifications' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between p-10 bg-blue-50/30 border border-blue-100 rounded-[2rem] mb-10 relative overflow-hidden">
                   <div>
                     <h3 className="text-2xl font-black text-blue-900">مركز التحكم في التنبيهات</h3>
                     <p className="text-blue-700 font-bold mt-1 leading-relaxed">تحكم في كيفية وصول الأخبار إليك لتبقى دائماً في قلب الحدث.</p>
                   </div>
                   <Bell size={64} className="text-blue-200 opacity-50 -mr-4" />
                </div>
                {[
                  { id: 'searchCompletions', title: 'اكتمال عمليات البحث', desc: 'تلقي إشعار فور انتهاء الروبوت من استخراج العملاء الجدد' },
                  { id: 'salesReports', title: 'صدور تقارير ذكية', desc: 'تنبيه عند جاهزية تقرير مبيعات لعميل مستهدف' },
                  { id: 'whatsappStatus', title: 'حالة إرسال واتساب', desc: 'تنبيه في حال فشل إرسال رسالة مجدولة' },
                  { id: 'teamActivity', title: 'نشاط الفريق', desc: 'إشعارات عند قيام زملائك بإجراءات مهمة على العملاء' },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-8 border border-gray-50 rounded-[2rem] hover:bg-gray-50 transition-all group">
                    <div className="flex-1 ml-4">
                      <h4 className="font-black text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{item.title}</h4>
                      <p className="text-sm text-gray-400 font-bold mt-0.5">{item.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={notificationPreferences[item.id as keyof NotificationPreferences]} 
                        onChange={() => toggleNotificationPreference(item.id as any)}
                      />
                      <div className="w-16 h-9 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:right-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-10 animate-in fade-in duration-500">
                <div className="bg-orange-50 border border-orange-100 p-8 rounded-[2.5rem] flex gap-6 items-start shadow-sm animate-in zoom-in-95 duration-700">
                  <div className="bg-white p-5 rounded-2xl text-orange-600 shadow-xl border border-orange-100"><Lock size={32} /></div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-black text-orange-900 mb-2">تأمين الحساب (2FA)</h4>
                    <p className="text-lg text-orange-800 leading-relaxed font-bold">لم تقم بتفعيل التحقق بخطوتين حتى الآن. ننصح بشدة بتفعيله لحماية بيانات عملائك وسرية تقاريرك المبيعات الحساسة.</p>
                    <button className="mt-8 bg-orange-600 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-orange-700 transition-all shadow-xl shadow-orange-900/30 active:scale-95 flex items-center gap-2">تفعيل الحماية المتقدمة <ArrowLeft size={18} className="rtl-flip" /></button>
                  </div>
                </div>

                <div className="space-y-8 pt-10 border-t border-gray-50">
                  <h4 className="text-2xl font-black text-gray-900 flex items-center gap-3"><ShieldCheck size={28} className="text-blue-600" /> تغيير كلمة المرور</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">كلمة المرور الحالية</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">كلمة المرور الجديدة</label>
                      <input type="password" placeholder="••••••••" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeSection === 'billing' && (
              <div className="space-y-10 animate-in fade-in duration-500 text-center py-20">
                 <div className="bg-gray-50 p-10 rounded-full w-fit mx-auto mb-6">
                   <CreditCard size={64} className="text-gray-200" />
                 </div>
                 <h3 className="text-2xl font-black text-gray-900">تفاصيل الباقة والفواتير</h3>
                 <p className="text-gray-400 font-bold max-w-sm mx-auto">سيتم تفعيل هذا القسم فور اكتمال دورة الدفع الحالية. حسابك الآن مفعل كعضو Enterprise.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal لإنشاء مفتاح جديد - بكامل تفاصيله */}
      {showKeyModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-gray-100">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm">
                  <Plus size={24} />
                </div>
                <h3 className="font-black text-gray-900 text-2xl">إنشاء مفتاح جديد</h3>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all">
                <X size={28} />
              </button>
            </div>
            
            <form onSubmit={handleCreateKey} className="p-10 space-y-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-2">اسم التطبيق أو الاستخدام</label>
                  <input 
                    type="text" 
                    required
                    autoFocus
                    className="w-full bg-gray-50 border border-gray-100 rounded-[1.5rem] py-5 px-6 text-lg font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="مثلاً: تطبيق مبيعات الميدان"
                  />
                </div>
              </div>

              <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 flex gap-4 items-start">
                <ShieldCheck size={24} className="text-blue-500 flex-shrink-0 mt-1" />
                <p className="text-sm text-blue-800 leading-relaxed font-bold">
                   تأكد من الاحتفاظ بالمفتاح في مكان آمن، حيث لن تتمكن من رؤيته مرة أخرى بعد إغلاق هذه النافذة لدواعي أمنية.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="flex-1 px-4 py-4 rounded-2xl font-black text-gray-500 hover:bg-gray-50 transition-all"
                >
                  إلغاء
                </button>
                <button 
                  type="submit"
                  disabled={isGenerating || !newKeyLabel.trim()}
                  className="flex-[2] bg-blue-600 text-white px-4 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>توليد المفتاح <Zap size={20} fill="currentColor" /></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
