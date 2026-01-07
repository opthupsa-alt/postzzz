
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Save, 
  MessageSquare, 
  Layers, 
  History, 
  Globe, 
  ExternalLink,
  ChevronLeft,
  ShieldCheck,
  Smartphone,
  Phone,
  CheckCircle2,
  FileSearch,
  Zap,
  Target,
  Mail,
  UserPlus,
  Clock,
  Sparkles,
  Link2,
  Activity,
  // Fix: add missing Lock and Loader2 icons
  Lock,
  Loader2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { JobStatus } from '../types';

const ExtensionSidePanel: React.FC = () => {
  const { addJob, updateJob, saveLead } = useStore();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONTACTS' | 'EVIDENCE' | 'ACTIVITY'>('OVERVIEW');
  const [isResolving, setIsResolving] = useState(true);
  const [revealStatus, setRevealStatus] = useState<'IDLE' | 'LOADING' | 'REVEALED'>('IDLE');
  const [detectedType, setDetectedType] = useState<'LinkedIn Profile' | 'Company Website'>('LinkedIn Profile');

  useEffect(() => {
    // Simulate initial page resolution and detection
    const timer = setTimeout(() => {
      setIsResolving(false);
      // Randomly pick context for simulation
      setDetectedType(Math.random() > 0.5 ? 'LinkedIn Profile' : 'Company Website');
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const mockEntity = {
    id: 'EXT-1',
    name: detectedType === 'LinkedIn Profile' ? 'أ/ عبد الله الحربي' : 'مؤسسة الابتكار الرقمي',
    domain: 'innotech.sa',
    industry: 'تقنية المعلومات',
    location: 'الرياض، السعودية',
    phone: '+966 50 123 4567',
    email: 'info@innotech.sa',
    status: 'DETECTION_ACTIVE',
    insight: 'هذا العميل مهتم حالياً بحلول الحوسبة السحابية بناءً على نشاطه الرقمي الأخير.'
  };

  const handleReveal = () => {
    setRevealStatus('LOADING');
    const jobId = Math.random().toString(36).substr(2, 9);
    addJob({
      id: jobId,
      type: 'SURVEY',
      status: JobStatus.RUNNING,
      progress: 0,
      message: 'جاري فحص قواعد البيانات لبيانات الاتصال...',
      createdAt: new Date().toISOString()
    });

    let p = 0;
    const interval = setInterval(() => {
      p += 25;
      updateJob(jobId, { progress: p });
      if (p >= 100) {
        clearInterval(interval);
        updateJob(jobId, { status: JobStatus.SUCCESS, message: 'تم كشف بيانات الاتصال بنجاح' });
        setRevealStatus('REVEALED');
      }
    }, 500);
  };

  const handleSaveToCRM = () => {
    saveLead({
      id: mockEntity.id,
      companyName: mockEntity.name,
      industry: mockEntity.industry,
      city: 'الرياض',
      status: 'PROSPECTED',
      evidenceCount: 3,
      hasReport: false,
      website: mockEntity.domain
    });
    alert('تم الحفظ في CRM بنجاح');
  };

  if (isResolving) {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center p-10 text-center space-y-6">
        <div className="relative">
          <div className="h-24 w-24 border-[6px] border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
          <Target className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600" size={32} />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">جاري الكشف...</h2>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-2">Resolving Digital Context</p>
        </div>
        <div className="w-full bg-gray-50 h-1.5 rounded-full overflow-hidden max-w-[200px]">
           <div className="h-full bg-blue-600 w-1/2 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white text-right border-r border-gray-100 font-sans overflow-hidden w-full max-w-[400px]">
      {/* Extension Header */}
      <div className="p-4 bg-gray-900 text-white flex items-center justify-between shadow-lg relative overflow-hidden shrink-0">
        <div className="flex items-center gap-3 relative z-10">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-900/50">
            <Zap size={18} fill="currentColor" />
          </div>
          <h1 className="font-black text-xs tracking-tight uppercase">ليدززز EXTENSION</h1>
        </div>
        <div className="flex items-center gap-2 z-10">
           <div className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded-md text-[9px] font-black border border-green-500/30 animate-pulse">
             LIVE SYNC
           </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
      </div>

      {/* Detection Banner */}
      <div className="p-3 bg-blue-600 text-white flex items-center gap-3 shrink-0">
        <div className="p-1.5 bg-white/20 rounded-lg">
          {detectedType === 'LinkedIn Profile' ? <Link2 size={16} /> : <Globe size={16} />}
        </div>
        <div className="flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest opacity-70">المصدر المكتشف</p>
          <p className="text-[11px] font-bold truncate">{detectedType} • {mockEntity.name}</p>
        </div>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
          <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-75"></div>
          <div className="w-1.5 h-1.5 bg-white/20 rounded-full animate-bounce delay-150"></div>
        </div>
      </div>

      {/* Entity Profile Card */}
      <div className="p-6 flex flex-col items-center text-center border-b border-gray-50 bg-gray-50/30 shrink-0">
        <div className="relative mb-4 group">
          <div className="h-20 w-20 bg-white border border-gray-100 text-blue-600 rounded-[1.75rem] flex items-center justify-center font-black text-3xl shadow-xl transition-transform group-hover:scale-110 duration-500 group-hover:rotate-3">
            {mockEntity.name[0]}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-green-500 border-4 border-white w-7 h-7 rounded-xl shadow-lg flex items-center justify-center">
             <ShieldCheck size={14} className="text-white" />
          </div>
        </div>
        
        <h2 className="text-xl font-black text-gray-900 leading-tight">{mockEntity.name}</h2>
        <div className="flex items-center gap-2 mt-2">
          <Globe size={12} className="text-blue-500" />
          <span className="text-xs text-blue-600 font-bold underline cursor-pointer">{mockEntity.domain}</span>
          <span className="text-gray-300">•</span>
          <span className="text-xs text-gray-400 font-bold">{mockEntity.industry}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3 w-full mt-6">
          <button 
            onClick={handleSaveToCRM}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-xl text-[11px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <UserPlus size={14} /> حفظ للـ CRM
          </button>
          <button className="flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl text-[11px] font-black hover:bg-green-700 transition-all shadow-lg shadow-green-100 active:scale-95">
            <MessageSquare size={14} /> واتساب
          </button>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex px-2 border-b border-gray-50 bg-white sticky top-0 z-20 shrink-0 shadow-sm">
        {[
          { id: 'OVERVIEW', label: 'نظرة عامة', icon: Target },
          { id: 'CONTACTS', label: 'تواصل', icon: Smartphone },
          { id: 'EVIDENCE', label: 'أدلة', icon: Layers },
          { id: 'ACTIVITY', label: 'سجل', icon: History }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-4 flex flex-col items-center gap-1.5 transition-all relative ${
              activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon size={16} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full mx-2"></div>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-5 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 relative overflow-hidden group">
               <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-blue-600" />
                  <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">رؤية ليدززز الذكية</p>
                </div>
                <p className="text-sm font-bold text-blue-900 leading-relaxed italic">"{mockEntity.insight}"</p>
               </div>
               <Zap className="absolute -bottom-6 -left-6 text-blue-600/5 rotate-12 transition-transform group-hover:scale-125" size={100} />
            </div>

            <div className="space-y-3">
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">تفاصيل السياق</h4>
               <div className="grid gap-3">
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-blue-200 transition-colors">
                    <span className="text-xs text-gray-500 font-bold">الموقع</span>
                    <span className="text-xs text-gray-900 font-black">{mockEntity.location}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white shadow-sm hover:border-blue-200 transition-colors">
                    <span className="text-xs text-gray-500 font-bold">الحالة الرقمية</span>
                    <span className="flex items-center gap-1.5 text-xs text-green-600 font-black">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> نشط الآن
                    </span>
                  </div>
               </div>
            </div>

            <button className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-gray-200 group active:scale-95">
              <FileSearch size={16} className="group-hover:rotate-12 transition-transform" />
              فحص AI عميق للملف
            </button>
          </div>
        )}

        {activeTab === 'CONTACTS' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {revealStatus === 'REVEALED' ? (
              <>
                <div className="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm space-y-4 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-600 group-hover:text-white transition-all"><Phone size={18} /></div>
                      <div>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">رقم الجوال الشخصي</p>
                        <p className="text-sm font-black text-gray-900 font-mono tracking-wider">{mockEntity.phone}</p>
                      </div>
                    </div>
                    <button className="p-2 text-gray-300 hover:text-blue-600 transition-colors"><ExternalLink size={16} /></button>
                  </div>
                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Mail size={18} /></div>
                      <div>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">البريد المباشر</p>
                        <p className="text-sm font-black text-gray-900 font-mono">{mockEntity.email}</p>
                      </div>
                    </div>
                    <button className="p-2 text-gray-300 hover:text-blue-600 transition-colors"><ExternalLink size={16} /></button>
                  </div>
                </div>
                <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100/50 flex gap-3 items-center">
                  <ShieldCheck size={18} className="text-green-600" />
                  <p className="text-[10px] text-green-800 font-bold leading-relaxed">تم التحقق من هذه البيانات من قواعد بياناتنا الحصرية.</p>
                </div>
              </>
            ) : (
              <div className="p-10 border-2 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-5 bg-gray-50/20">
                <div className="relative">
                  <div className="bg-gray-100 p-6 rounded-full text-gray-300">
                    <Smartphone size={48} />
                  </div>
                  {/* Fix: use correctly imported Lock icon */}
                  <Lock size={16} className="absolute bottom-0 right-0 bg-white p-0.5 rounded text-gray-400 border border-gray-100" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 mb-1">بيانات التواصل مخفية</h4>
                  <p className="text-[10px] text-gray-400 font-bold leading-relaxed px-4">استخدم ميزة الـ Reveal للكشف عن أرقام الجوال والبريد الإلكتروني المباشر.</p>
                </div>
                <button 
                  onClick={handleReveal}
                  disabled={revealStatus === 'LOADING'}
                  className="bg-gray-900 text-white px-10 py-3 rounded-xl text-xs font-black hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {/* Fix: use correctly imported Loader2 icon */}
                  {revealStatus === 'LOADING' ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="currentColor" />}
                  Reveal Data
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'EVIDENCE' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm flex items-start gap-4 group hover:border-blue-200 transition-all cursor-pointer">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-sm"><Globe size={18} /></div>
              <div className="flex-1">
                <h5 className="text-[11px] font-black text-gray-900 group-hover:text-blue-600 transition-colors">الموقع الرسمي للشركة</h5>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-1 line-clamp-2 italic">"نحن شركة متخصصة في الحلول التقنية المبتكرة وخدمات المبيعات..."</p>
              </div>
              <ExternalLink size={14} className="text-gray-300 mt-1" />
            </div>
            
            <div className="p-5 border border-gray-100 rounded-2xl bg-white shadow-sm flex items-start gap-4 group hover:border-blue-200 transition-all cursor-pointer">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 shadow-sm"><History size={18} /></div>
              <div className="flex-1">
                <h5 className="text-[11px] font-black text-gray-900 group-hover:text-purple-600 transition-colors">نشاط أخير على LinkedIn</h5>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-1 line-clamp-2">تفاعل العميل مع 3 منشورات تخص "الذكاء الاصطناعي".</p>
              </div>
              <ExternalLink size={14} className="text-gray-300 mt-1" />
            </div>

            <div className="flex flex-col items-center justify-center py-6 text-center opacity-40">
              <Activity size={24} className="text-gray-300 mb-2" />
              <p className="text-[10px] font-bold">اكتشفنا دليلين إضافيين متاحين</p>
            </div>
          </div>
        )}

        {activeTab === 'ACTIVITY' && (
          <div className="space-y-6 animate-in fade-in duration-300 py-2">
            <div className="relative before:absolute before:inset-y-0 before:right-2 before:w-px before:bg-gray-100">
              {[
                { date: 'الآن', text: 'تم فتح الصفحة عبر الـ Extension', icon: Smartphone, color: 'bg-blue-600' },
                { date: 'أمس، 04:20 م', text: 'تمت زيارة الملف الشخصي مسبقاً', icon: History, color: 'bg-gray-400' },
                { date: '12 أكتوبر 2024', text: 'تم حفظ العميل في "قائمة الرياض"', icon: Save, color: 'bg-green-500' }
              ].map((act, i) => (
                <div key={i} className="relative pr-8 pb-8 last:pb-0">
                  <div className={`absolute right-0 top-1 w-4 h-4 bg-white border-2 rounded-full z-10`} style={{ borderColor: act.color === 'bg-blue-600' ? '#2563eb' : act.color === 'bg-green-500' ? '#22c55e' : '#9ca3af' }}></div>
                  <div className="hover:translate-x-[-4px] transition-transform cursor-default">
                    <p className="text-xs font-black text-gray-800">{act.text}</p>
                    <p className="text-[9px] text-gray-400 font-black mt-1 uppercase tracking-widest">{act.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between shrink-0">
        <button className="text-[9px] font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest flex items-center gap-1.5">
           <Smartphone size={10} /> إعدادات الربط
        </button>
        <button className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 hover:underline group">
          لوحة التحكم الكاملة <ExternalLink size={12} className="group-hover:translate-x-[-2px] transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default ExtensionSidePanel;
