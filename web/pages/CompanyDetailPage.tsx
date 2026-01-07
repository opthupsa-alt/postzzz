
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  Globe, 
  Users, 
  Briefcase, 
  Calendar, 
  ExternalLink, 
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
  History,
  CheckCircle2,
  Mail,
  Zap,
  ArrowLeft,
  ChevronLeft,
  Smartphone,
  Star,
  LineChart,
  Target,
  ArrowUpRight
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { JobStatus } from '../types';

const CompanyDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addJob, updateJob } = useStore();
  const [activeTab, setActiveTab] = useState('insights');
  const [isPlanGenerating, setIsPlanGenerating] = useState(false);

  const company = {
    id: 'C1',
    name: 'أرامكو السعودية',
    industry: 'طاقة ونفط',
    city: 'الظهران',
    founded: '1933',
    size: '10,000+ موظف',
    website: 'https://aramco.com',
    description: 'أرامكو السعودية هي الشركة المتكاملة الرائدة عالمياً في مجال الطاقة والكيميائيات، وتنتج واحداً من كل ثمانية براميل من إمدادات النفط الخام في العالم.',
    technologies: [
      { name: 'Python', icon: Cpu },
      { name: 'AWS', icon: Cpu },
      { name: 'SAP', icon: Cpu },
      { name: 'React', icon: Cpu },
      { name: 'Salesforce', icon: Cpu }
    ],
    marketPosition: 'رائد عالمي (Global Leader)',
    mission: 'توفير الطاقة للعالم بشكل موثوق ومستدام.',
    employees: [
      { id: 'E1', name: 'م. خالد الفالح', role: 'رئيس مجلس الإدارة', phone: '+966 50 XXX XXXX', email: 'khaled@aramco.sa' },
      { id: 'E2', name: 'أمين الناصر', role: 'الرئيس التنفيذي', phone: '+966 51 XXX XXXX', email: 'amin@aramco.sa' },
    ],
    competitors: [
      { name: 'ExxonMobil', status: 'منافس مباشر' },
      { name: 'Shell', status: 'منافس مباشر' },
      { name: 'BP', status: 'منافس غير مباشر' }
    ]
  };

  const handleStartSalesPlan = () => {
    setIsPlanGenerating(true);
    const jobId = Math.random().toString(36).substr(2, 9);
    
    addJob({
      id: jobId,
      type: 'SURVEY',
      status: JobStatus.RUNNING,
      progress: 0,
      message: 'بدء تحليل الفرص التجارية...',
      createdAt: new Date().toISOString()
    });

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      if (progress >= 100) {
        clearInterval(interval);
        updateJob(jobId, { 
          status: JobStatus.SUCCESS, 
          progress: 100, 
          message: `اكتملت خطة المبيعات لشركة ${company.name}` 
        });
        setIsPlanGenerating(false);
      } else {
        const msgs = ['تحليل القوائم المالية...', 'دراسة السوق المنافس...', 'بناء سيناريوهات العرض...'];
        updateJob(jobId, { progress, message: msgs[Math.floor(progress / 34)] });
      }
    }, 800);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-700 pb-20">
      <div className="relative bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-48 bg-gradient-to-r from-blue-600 to-blue-800 relative">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        </div>
        <div className="px-10 pb-10 -mt-16 relative z-10 flex flex-col md:flex-row items-end gap-8">
          <div className="h-40 w-40 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center border-[6px] border-white ring-1 ring-gray-100 overflow-hidden">
             <div className="bg-blue-600 w-full h-full flex items-center justify-center text-white">
                <Building2 size={64} fill="currentColor" className="opacity-90" />
             </div>
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">{company.name}</h1>
              <span className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-[9px] font-black border border-green-100 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                موثق (VERIFIED)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-gray-500 font-bold">
                <Briefcase size={18} className="text-blue-500" /> {company.industry}
              </div>
              <div className="flex items-center gap-2 text-gray-500 font-bold">
                <MapPin size={18} className="text-blue-500" /> {company.city}
              </div>
              <a href={company.website} target="_blank" className="flex items-center gap-2 text-blue-600 font-black hover:underline transition-all">
                <Globe size={18} /> {company.website.replace('https://', '')} <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="flex gap-3 pb-2">
            <button 
              onClick={handleStartSalesPlan}
              disabled={isPlanGenerating}
              className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
            >
              {isPlanGenerating ? <Zap className="animate-spin" size={20} /> : <TrendingUp size={20} />}
              <span>بدء خطة مبيعات</span>
            </button>
            <button onClick={() => navigate(-1)} className="p-4 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-900 rounded-2xl transition-all border border-gray-100 shadow-sm">
              <ArrowRight size={24} className="rtl-flip" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[650px]">
            <div className="flex bg-gray-50/50 p-1.5 m-6 rounded-2xl border border-gray-100">
              {[
                { id: 'insights', label: 'رؤى الشركة', icon: TrendingUp },
                { id: 'employees', label: 'الموظفين (Leads)', icon: Users },
                { id: 'activity', label: 'النشاط الأخير', icon: History },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 text-xs font-black transition-all rounded-xl ${
                    activeTab === tab.id 
                      ? 'bg-white text-blue-600 shadow-lg border border-gray-50' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="px-10 pb-10 flex-1">
              {activeTab === 'insights' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">نبذة عن الشركة</h3>
                    <p className="text-gray-600 leading-relaxed font-bold text-lg">{company.description}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><CheckCircle2 size={20} /></div>
                         <h4 className="font-black text-blue-900 text-lg">المهمة والقيم</h4>
                      </div>
                      <p className="text-blue-800 leading-relaxed font-bold">{company.mission}</p>
                    </div>
                    <div className="p-8 bg-gray-900 rounded-[2rem] text-white space-y-3 group hover:bg-black transition-all">
                      <div className="flex items-center gap-2 mb-2">
                         <div className="p-2 bg-white/10 rounded-lg text-blue-400"><TrendingUp size={20} /></div>
                         <h4 className="font-black text-white text-lg">المركز في السوق</h4>
                      </div>
                      <p className="text-gray-400 leading-relaxed font-bold">{company.marketPosition}</p>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-50 space-y-6">
                    <h3 className="text-xl font-black text-gray-900">أدلة رقمية مكتشفة</h3>
                    <div className="space-y-3">
                      <div className="p-6 border border-gray-100 rounded-2xl flex items-center gap-5 hover:border-blue-200 hover:bg-blue-50/10 transition-all cursor-pointer group">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <Globe size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-gray-900">الموقع الإلكتروني والتقنيات</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest">تم تحديثه آخر مرة منذ 3 أيام</p>
                        </div>
                        <ExternalLink size={18} className="text-gray-300 group-hover:text-blue-500" />
                      </div>
                      <div className="p-6 border border-gray-100 rounded-2xl flex items-center gap-5 hover:border-blue-200 hover:bg-blue-50/10 transition-all cursor-pointer group">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <MessageSquare size={20} />
                        </div>
                        <div className="flex-1">
                          <p className="font-black text-gray-900">حضور التواصل الاجتماعي</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-widest">مستوى تفاعل عالٍ على LinkedIn</p>
                        </div>
                        <ExternalLink size={18} className="text-gray-300 group-hover:text-blue-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'employees' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                   <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-black text-gray-900">صناع القرار (Decision Makers)</h3>
                      <button className="text-xs font-black text-blue-600 hover:underline">عرض جميع الموظفين</button>
                   </div>
                   <div className="grid gap-4">
                     {company.employees.map(emp => (
                       <div key={emp.id} className="p-6 bg-gray-50/50 border border-gray-100 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-lg transition-all">
                          <div className="flex items-center gap-4">
                             <div className="h-14 w-14 bg-white border border-gray-100 rounded-xl flex items-center justify-center font-black text-xl text-blue-600 shadow-sm group-hover:scale-105 transition-transform">
                               {emp.name[0]}
                             </div>
                             <div>
                               <h4 className="font-black text-gray-900">{emp.name}</h4>
                               <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{emp.role}</p>
                             </div>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-green-600 hover:bg-green-50 transition-colors shadow-sm"><Smartphone size={18} /></button>
                             <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"><Mail size={18} /></button>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-8 animate-in fade-in duration-500 py-4">
                  <div className="relative before:absolute before:inset-y-0 before:right-3 before:w-px before:bg-gray-100">
                    {[
                      { date: 'اليوم، 10:30 ص', content: 'تم تحديث التقرير الذكي عبر AI Agent', user: 'System', icon: Zap },
                      { date: 'أمس، 04:15 م', content: 'تم اكتشاف 3 موظفين جدد في LinkedIn', user: 'أحمد محمد', icon: Users },
                    ].map((act, i) => (
                      <div key={i} className="relative pr-10 pb-8 last:pb-0 group">
                        <div className="absolute right-0 top-1 w-6 h-6 bg-white border-2 border-blue-600 rounded-lg flex items-center justify-center z-10 shadow-sm group-hover:scale-125 transition-transform">
                          <act.icon size={14} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{act.content}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">{act.date} • {act.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-left-2 duration-700">
            <h3 className="text-xl font-black text-gray-900 border-b border-gray-50 pb-4">بطاقة المعلومات</h3>
            
            <div className="space-y-6">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">تاريخ التأسيس</p>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Calendar size={18} /></div>
                  <span className="font-black text-gray-800">{company.founded} مـ</span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">حجم الشركة</p>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={18} /></div>
                  <span className="font-black text-gray-800">{company.size}</span>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">التقنيات المكتشفة</p>
                <div className="flex flex-wrap gap-2">
                  {company.technologies.map(tech => (
                    <span key={tech.name} className="bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-black border border-gray-100 flex items-center gap-2 hover:bg-white hover:border-blue-200 transition-all cursor-default">
                      <tech.icon size={12} className="text-blue-500" />
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xl font-black text-gray-900">المنافسون المكتشفون</h3>
            <div className="space-y-4">
              {company.competitors.map(comp => (
                <div key={comp.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-colors cursor-pointer">
                  <div>
                    <p className="font-black text-gray-900 text-sm">{comp.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{comp.status}</p>
                  </div>
                  <ArrowUpRight size={16} className="text-gray-300 group-hover:text-blue-600" />
                </div>
              ))}
            </div>
            <button className="w-full text-xs font-black text-blue-600 hover:underline">عرض خريطة السوق كاملة</button>
          </div>

          <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20"><ShieldCheck size={24} /></div>
                <h3 className="text-lg font-black tracking-tight">تقرير الذكاء التنافسي</h3>
              </div>
              <p className="text-sm text-gray-400 font-bold leading-relaxed">بناءً على الأدلة الرقمية، هذه الشركة تمر بمرحلة تحول رقمي شاملة. الفرص الأكبر هي في قطاع "الأمن السيبراني" و "أتمتة المكاتب".</p>
              <button className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-sm shadow-xl shadow-blue-900/40 hover:bg-blue-700 transition-all active:scale-95">
                عرض التقرير الكامل
              </button>
            </div>
            <Layers className="absolute -bottom-16 -left-16 text-white/5 rotate-12 transition-transform group-hover:scale-125 duration-1000" size={240} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;
