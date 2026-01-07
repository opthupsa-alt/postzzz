
import React, { useState } from 'react';
import { 
  Zap, Globe, Smartphone, LayoutDashboard, Database, MessageSquare, 
  ExternalLink, ShieldCheck, CheckCircle2, Grid, Loader2, Server, 
  Cloud, Lock, Code, Copy, Key, ChevronLeft, X, RefreshCw, Trash2, 
  Settings, Terminal, Webhook, Activity, LayoutGrid
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Guard from '../components/Guard';
import { showToast } from '../components/NotificationToast';

const IntegrationsPage: React.FC = () => {
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [integrationStates, setIntegrationStates] = useState<Record<string, string>>({
    whatsapp: 'CONNECTED',
    maps: 'CONNECTED',
    salesforce: 'DISCONNECTED',
    hubspot: 'DISCONNECTED',
    slack: 'DISCONNECTED',
    notion: 'CONNECTED'
  });

  const integrationCategories = [
    {
      title: 'التواصل الفعال',
      items: [
        { id: 'whatsapp', name: 'Meta WhatsApp Business', desc: 'إرسال الرسائل عبر API الرسمي لضمان عدم الحظر والوصول لقوالب احترافية موثقة.', icon: Smartphone, color: 'text-green-600 bg-green-50 border-green-100' },
        { id: 'slack', name: 'Slack Notifications', desc: 'تلقي تنبيهات المبيعات والتقارير الجديدة مباشرة في قنوات فريقك.', icon: MessageSquare, color: 'text-purple-600 bg-purple-50 border-purple-100' }
      ]
    },
    {
      title: 'إدارة علاقات العملاء (CRM)',
      items: [
        { id: 'salesforce', name: 'Salesforce CRM', desc: 'مزامنة العملاء المحتملين تلقائياً مع نظام Salesforce CRM العملاق لتتبع رحلة البيع.', icon: Database, color: 'text-blue-500 bg-blue-50 border-blue-100' },
        { id: 'hubspot', name: 'HubSpot CRM', desc: 'تحديث حالة الصفقات والأنشطة والمهام في HubSpot لحظة بلحظة وبدون تدخل بشري.', icon: LayoutDashboard, color: 'text-orange-600 bg-orange-50 border-orange-100' }
      ]
    },
    {
      title: 'البيانات والأتمتة',
      items: [
        { id: 'maps', name: 'Google Maps Enterprise', desc: 'استخراج البيانات مباشرة من خرائط جوجل بدقة عالية مع تحليل الموقع الجغرافي والنشاط.', icon: Globe, color: 'text-blue-600 bg-blue-50 border-blue-100' },
        { id: 'notion', name: 'Notion Workspace', desc: 'تصدير التقارير والأدلة المكتشفة إلى صفحات Notion المنظمة.', icon: Cloud, color: 'text-gray-600 bg-gray-50 border-gray-100' }
      ]
    }
  ];

  const handleToggleConnection = (id: string) => {
    setConnectingId(id);
    setTimeout(() => {
      setIntegrationStates({ ...integrationStates, [id]: 'CONNECTED' });
      setConnectingId(null);
      showToast('SUCCESS', 'تم الربط', `تم ربط ${id} بنجاح عبر نظام ليدززز.`);
    }, 2000);
  };

  const handleDisconnect = (id: string) => {
    if (confirm('هل أنت متأكد من قطع الاتصال؟ سيؤدي ذلك لتعطيل المزامنة التلقائية.')) {
      setIntegrationStates({ ...integrationStates, [id]: 'DISCONNECTED' });
      setShowConfigModal(false);
      showToast('INFO', 'تم قطع الاتصال', `تم فصل ${id} عن النظام بنجاح.`);
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      showToast('SUCCESS', 'اكتملت المزامنة', 'تم تحديث كافة البيانات وتزامنها مع المزود الخارجي.');
    }, 1500);
  };

  const openConfig = (int: any) => {
    setSelectedIntegration(int);
    setShowConfigModal(true);
  };

  return (
    <Guard role="ADMIN">
      <div className="space-y-12 animate-in fade-in duration-500 pb-20">
        <PageHeader 
          title="التكاملات والربط الذكي" 
          subtitle="حوّل ليدززز إلى مركز مبيعات متكامل عبر ربطه بأدواتك المفضلة وأنظمة شركتك"
        />

        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
             <div className="p-6 bg-white/20 rounded-[2.5rem] border border-white/20 shadow-xl group-hover:rotate-12 transition-transform duration-500">
               <Zap size={64} fill="white" />
             </div>
             <div>
               <h2 className="text-3xl font-black mb-3">متجر التطبيقات والربط (Integrations)</h2>
               <p className="text-blue-100 text-lg font-bold max-w-2xl leading-relaxed">اكتشف الأدوات التي تساعد فريقك على أتمتة العمليات الروتينية، بدءاً من استخراج البيانات وصولاً إلى المزامنة مع أنظمة الشركة.</p>
             </div>
           </div>
           <Grid className="absolute -bottom-10 -left-10 text-white/5 rotate-12" size={300} />
        </div>

        {integrationCategories.map((category, idx) => (
          <div key={idx} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
            <h3 className="text-xl font-black text-gray-900 px-2 flex items-center gap-3">
              <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
              {category.title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {category.items.map((int) => {
                const status = integrationStates[int.id];
                const isConnecting = connectingId === int.id;

                return (
                  <div key={int.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 hover:shadow-2xl hover:border-blue-100 transition-all group flex flex-col justify-between h-full relative overflow-hidden">
                     {status === 'CONNECTED' && (
                       <div className="absolute top-6 left-6 bg-green-50 text-green-600 p-2 rounded-xl border border-green-100 shadow-sm animate-in zoom-in">
                         <CheckCircle2 size={18} />
                       </div>
                     )}
                     
                     <div>
                       <div className={`p-5 rounded-[1.75rem] w-fit mb-8 ${int.color} border group-hover:scale-110 transition-transform duration-500 shadow-sm`}>
                         <int.icon size={36} />
                       </div>
                       <h3 className="text-2xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">{int.name}</h3>
                       <p className="text-gray-500 font-bold leading-loose mt-4 mb-10 text-sm">{int.desc}</p>
                     </div>

                     <div className="flex items-center justify-between pt-8 border-t border-gray-50">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${status === 'CONNECTED' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${status === 'CONNECTED' ? 'text-green-600' : 'text-gray-400'}`}>
                            {status === 'CONNECTED' ? 'متصل الآن' : 'غير متصل'}
                          </span>
                        </div>
                        <button 
                          onClick={() => status === 'CONNECTED' ? openConfig(int) : handleToggleConnection(int.id)}
                          disabled={isConnecting}
                          className={`px-8 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center gap-2 ${
                            status === 'CONNECTED' 
                              ? 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100 shadow-sm' 
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-100'
                          } disabled:opacity-50`}
                        >
                          {isConnecting ? (
                            <><Loader2 size={14} className="animate-spin" /> جاري الربط...</>
                          ) : (
                            status === 'CONNECTED' ? 'إعدادات الربط' : 'بدء التوصيل'
                          )}
                        </button>
                     </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* API Docs Section */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-10 hover:shadow-xl transition-shadow group relative overflow-hidden">
          <div className="flex-1 space-y-5 relative z-10 text-right">
            <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest w-fit ml-auto border border-blue-100">For Developers</div>
            <h3 className="text-3xl font-black text-gray-900">توثيق المطورين (API Docs)</h3>
            <p className="text-gray-500 font-bold text-lg leading-relaxed max-w-2xl">
              هل لديك نظام مبيعات خاص؟ يمكنك بناء تكاملك المخصص مع ليدززز عبر واجهة برمجية (API) قوية وموثقة بالكامل لربط البيانات والتقارير تلقائياً.
            </p>
            <div className="flex flex-wrap justify-end gap-4 pt-4">
              <button 
                onClick={() => setShowKeyModal(true)}
                className="bg-white text-gray-900 px-10 py-4 rounded-2xl font-black border border-gray-200 hover:bg-gray-50 transition-all hover:border-gray-300 active:scale-95 flex items-center gap-2"
              >
                <Key size={18} className="text-blue-600" /> طلب مفتاح API
              </button>
              <button className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95">
                <Code size={18} className="text-blue-400" /> عرض التوثيق الفني <ExternalLink size={16} />
              </button>
            </div>
          </div>
          <div className="flex-shrink-0 bg-gray-50 p-12 rounded-[3.5rem] border border-gray-100 relative group overflow-hidden">
             <div className="relative z-10 p-6 bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 group-hover:scale-110 group-hover:rotate-2 transition-all duration-700">
               <Server size={100} className="text-blue-600 opacity-90" />
               <div className="absolute -top-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg animate-bounce">
                 <Code size={20} />
               </div>
             </div>
             <Zap size={200} className="absolute -bottom-16 -right-16 text-blue-100 opacity-20 rotate-12" />
          </div>
        </div>

        {/* Modal إعدادات الربط المتقدمة */}
        {showConfigModal && selectedIntegration && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-gray-100">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                 <div className="flex items-center gap-4">
                   <div className={`p-4 rounded-2xl ${selectedIntegration.color} shadow-sm`}>
                     <selectedIntegration.icon size={28} />
                   </div>
                   <div>
                     <h3 className="font-black text-2xl text-gray-900">{selectedIntegration.name}</h3>
                     <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                       <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">متصل ونشط (Active)</span>
                     </div>
                   </div>
                 </div>
                 <button onClick={() => setShowConfigModal(false)} className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all"><X size={28} /></button>
              </div>
              
              <div className="p-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">معرف الربط (Integration ID)</label>
                     <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 font-mono text-sm text-gray-600 flex items-center justify-between">
                       <span>{selectedIntegration.id === 'whatsapp' ? 'waba_92jsh29k' : 'ext_88sh2jk'}</span>
                       <Copy size={14} className="cursor-pointer hover:text-blue-600 transition-colors" onClick={() => showToast('INFO', 'تم النسخ', 'تم نسخ المعرف للحافظة.')} />
                     </div>
                   </div>
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">آخر مزامنة ناجحة</label>
                     <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-2 text-sm font-bold text-gray-700">
                       <RefreshCw size={14} className="text-blue-500" />
                       منذ 15 دقيقة
                     </div>
                   </div>
                </div>

                {selectedIntegration.id === 'whatsapp' ? (
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-gray-900 flex items-center gap-2 border-r-4 border-green-500 pr-3">إعدادات الواتساب الخاصة</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">رقم الإرسال</p>
                          <p className="text-sm font-black text-gray-800">+966 50 123 4567</p>
                        </div>
                        <Smartphone size={20} className="text-green-600" />
                      </div>
                      <div className="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase">القوالب المعتمدة</p>
                          <p className="text-sm font-black text-gray-800">12 قالب مفعل</p>
                        </div>
                        <Settings size={20} className="text-blue-600" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-gray-900 flex items-center gap-2 border-r-4 border-blue-500 pr-3">حالة مزامنة البيانات</h4>
                    <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                       <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                         <span className="text-gray-400">تزامن السجلات</span>
                         <span className="text-blue-600">88%</span>
                       </div>
                       <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                         <div className="h-full bg-blue-600 w-[88%]"></div>
                       </div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 flex gap-4 items-start">
                   <ShieldCheck size={24} className="text-blue-500 flex-shrink-0 mt-1" />
                   <p className="text-sm text-blue-800 leading-relaxed font-bold">
                      يتم تشفير جميع البيانات المتبادلة بين ليدززز و {selectedIntegration.name} عبر بروتوكولات آمنة (TLS 1.3). لا نقوم بتخزين أي كلمات سر في سيرفراتنا.
                   </p>
                </div>
              </div>

              <div className="p-8 bg-gray-50 flex flex-col md:flex-row items-center justify-between gap-4">
                 <button 
                  onClick={() => handleDisconnect(selectedIntegration.id)}
                  className="flex items-center gap-2 text-red-600 font-black text-sm hover:bg-red-50 px-6 py-3 rounded-2xl transition-all"
                 >
                   <Trash2 size={18} /> قطع الاتصال نهائياً
                 </button>
                 <div className="flex gap-4">
                    <button 
                      onClick={() => setShowConfigModal(false)}
                      className="px-8 py-3 rounded-2xl font-black text-gray-500 hover:bg-white transition-all border border-transparent hover:border-gray-200"
                    >
                      إغلاق
                    </button>
                    <button 
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                      مزامنة البيانات الآن
                    </button>
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal طلب مفتاح API */}
        {showKeyModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Key size={24} /></div>
                   <h3 className="font-black text-2xl text-gray-900">طلب مفتاح برمجي</h3>
                 </div>
                 <button onClick={() => setShowKeyModal(false)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"><X /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); setIsRequesting(true); setTimeout(() => { setIsRequesting(false); setShowKeyModal(false); showToast('SUCCESS', 'تم الإرسال', 'سيصلك المفتاح عبر البريد.'); }, 1500); }} className="p-10 space-y-6">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">اسم التطبيق / المشروع</label>
                   <input required type="text" placeholder="مثلاً: CRM الداخلي للشركة" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">سبب الاستخدام</label>
                   <textarea required rows={3} placeholder="اشرح باختصار كيف سيتم استخدام الـ API..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-bold focus:ring-4 focus:ring-blue-500/10 outline-none resize-none transition-all" />
                 </div>
                 <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setShowKeyModal(false)} className="flex-1 py-4 font-black text-gray-500 hover:bg-gray-50 rounded-2xl transition-all">إلغاء</button>
                    <button type="submit" disabled={isRequesting} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                      {isRequesting ? <Loader2 className="animate-spin" size={20} /> : <>إرسال الطلب <ChevronLeft size={20} className="rtl-flip" /></>}
                    </button>
                 </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Guard>
  );
};

export default IntegrationsPage;
